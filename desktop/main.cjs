"use strict";
const { app, BrowserWindow, ipcMain, nativeImage }=require("electron");
const path=require("node:path");
const fs=require("node:fs");
const diagnostics=require("./diagnostics.cjs");

const APP_TITLE="Case Closed AI";
const SPLASH_MINIMUM_MS=3600;
let scanning=false;
let securityScan=false;
let mainWindow=null;
let splashWindow=null;
function asset(name){return path.join(__dirname,"..","assets",name);}
function iconPath(){
  const ico=asset("case-closed.ico");
  return fs.existsSync(ico)?ico:undefined;
}
ipcMain.handle("caseclosed:capabilities",()=>diagnostics.getCapabilities());
ipcMain.handle("caseclosed:scan",async(_event,options)=>{
  if(scanning)throw new Error("A diagnostic scan is already running.");
  scanning=true;
  try{return await diagnostics.runHealthScan({internet:options?.internet===true});}
  finally{scanning=false;}
});
ipcMain.handle("caseclosed:defender",async()=>{
  if(securityScan)throw new Error("A Microsoft Defender scan request is already running.");
  securityScan=true;
  try{return await diagnostics.requestDefenderQuickScan();}
  finally{securityScan=false;}
});

function createMainWindow(){
  const options={
    show:false,width:1240,height:840,minWidth:800,minHeight:600,
    backgroundColor:"#111419",title:APP_TITLE,
    webPreferences:{
      nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
      preload:path.join(__dirname,"preload.cjs")
    }
  };
  if(iconPath())options.icon=iconPath();
  mainWindow=new BrowserWindow(options);
  mainWindow.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  mainWindow.webContents.on("will-navigate",event=>event.preventDefault());
  mainWindow.on("closed",()=>{mainWindow=null;});
  return mainWindow;
}

function createSplash(){
  const options={
    width:690,height:445,frame:false,show:false,
    resizable:false,maximizable:false,minimizable:false,
    skipTaskbar:true,alwaysOnTop:false,center:true,
    backgroundColor:"#101318",title:APP_TITLE+" — Starting",
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
  };
  if(iconPath())options.icon=iconPath();
  splashWindow=new BrowserWindow(options);
  splashWindow.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  splashWindow.webContents.on("will-navigate",event=>event.preventDefault());
  splashWindow.on("closed",()=>{splashWindow=null;});
  splashWindow.once("ready-to-show",()=>splashWindow?.show());
  splashWindow.loadFile(path.join(__dirname,"splash.html"));
  return splashWindow;
}
async function launchWithIntro(){
  const splash=createSplash();
  const main=createMainWindow();
  const minimum=new Promise(resolve=>setTimeout(resolve,SPLASH_MINIMUM_MS));
  const ready=new Promise(resolve=>{
    main.webContents.once("did-finish-load",()=>resolve(true));
    main.webContents.once("did-fail-load",()=>resolve(false));
  });
  main.loadFile(path.join(__dirname,"..","index.html"));
  // Don't leave an uncloseable splash window if loading fails.
  const [loaded]=await Promise.all([ready,minimum]);
  if(splash&&!splash.isDestroyed())splash.close();
  if(main&&!main.isDestroyed()){
    main.show();
    main.focus();
    if(!loaded)main.webContents.reload();
  }
}
app.whenReady().then(()=>{
  if(iconPath())app.setAppUserModelId("ai.caseclosed.desktop");
  launchWithIntro();
  app.on("activate",()=>{
    if(BrowserWindow.getAllWindows().length===0)launchWithIntro();
  });
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});

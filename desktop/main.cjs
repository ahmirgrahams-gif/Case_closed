"use strict";
const {app,BrowserWindow,ipcMain}=require("electron");
const path=require("node:path");
const diagnostics=require("./diagnostics.cjs");
let scanning=false,securityScan=false;
ipcMain.handle("caseclosed:capabilities",()=>diagnostics.getCapabilities());
ipcMain.handle("caseclosed:scan",async (_event,options)=>{
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
function createWindow(){
  const win=new BrowserWindow({
    width:1240,height:840,minWidth:800,minHeight:600,backgroundColor:"#111419",
    title:"Case Closed AI",
    webPreferences:{
      nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
      preload:path.join(__dirname,"preload.cjs")
    }
  });
  win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  win.webContents.on("will-navigate",event=>event.preventDefault());
  win.loadFile(path.join(__dirname,"..","index.html"));
}
app.whenReady().then(()=>{
  createWindow();
  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});

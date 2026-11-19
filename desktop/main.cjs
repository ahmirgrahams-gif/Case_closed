"use strict";
const {app,BrowserWindow,ipcMain,Tray,Menu,screen,Notification}=require("electron");
const path=require("node:path");
const fs=require("node:fs");
const fsAsync=require("node:fs/promises");
const diagnostics=require("./diagnostics.cjs");
const investigator=require("./investigator.cjs");
const {defenderHistory}=require("./defender-history.cjs");
const fileReview=require("./file-review.cjs");
const {createMonitor}=require("./monitor.cjs");

const APP_TITLE="Case Closed AI";
const SPLASH_MINIMUM_MS=3600;
const BACKGROUND_FLAG="--background";
const single=app.requestSingleInstanceLock();
if(!single){app.quit();}
let scanning=false,securityScan=false,quitting=false,mainWindow=null,splashWindow=null,alertWindow=null,tray=null,monitor=null;
let settings={background:true,notifications:true,autoStart:false};
let alertFinding=null;
const iconPath=()=>path.join(__dirname,"..","assets","case-closed.ico");
const validIcon=()=>fs.existsSync(iconPath())?iconPath():undefined;
const settingsPath=()=>path.join(app.getPath("userData"),"preferences.json");
function sanitisePrefs(p){return {
  background:p?.background===true,
  notifications:p?.notifications!==false,
  autoStart:p?.autoStart===true
};}
async function loadSettings(){
  try{settings=sanitisePrefs(JSON.parse(await fsAsync.readFile(settingsPath(),"utf8")));}
  catch{settings={background:true,notifications:true,autoStart:false};}
}
async function saveSettings(){
  const filename=settingsPath();
  await fsAsync.mkdir(path.dirname(filename),{recursive:true});
  const tmp=filename+".tmp";
  await fsAsync.writeFile(tmp,JSON.stringify(settings,null,2),{encoding:"utf8",mode:0o600});
  await fsAsync.rename(tmp,filename);
}
function setStartup(enable){
  if(!app.isPackaged)return {supported:false,enabled:false};
  app.setLoginItemSettings({
    openAtLogin:enable,
    path:process.execPath,
    args:enable?[BACKGROUND_FLAG]:[]
  });
  const state=app.getLoginItemSettings({path:process.execPath,args:enable?[BACKGROUND_FLAG]:[]});
  return {supported:true,enabled:state.openAtLogin};
}
function getSettings(){
  return {...settings,monitor:monitor?.status(),startupSupported:app.isPackaged};
}
function openMain(page="home"){
  if(!mainWindow||mainWindow.isDestroyed())createMainWindow();
  if(mainWindow.isMinimized())mainWindow.restore();
  mainWindow.show();mainWindow.focus();
  if(page!=="home")mainWindow.webContents.send("caseclosed:show-page",page);
}
function closeMascot(){
  if(alertWindow&&!alertWindow.isDestroyed())alertWindow.destroy();
  alertWindow=null;
}
function notifyFinding(items){
  if(!settings.notifications||!items?.length)return;
  const security=items.find(x=>x.severity==="security");
  const issue=security||items[0];
  alertFinding=issue;
  const title=security?"A security clue needs review":"Device issue needs your attention";
  const detail=security?"Windows Security recorded a detection. Review the history before removing files.":issue.title+": "+issue.summary;
  try{
    if(Notification.isSupported()){
      const n=new Notification({title:"Case Closed AI — "+title,body:detail.slice(0,220),silent:false});
      n.on("click",()=>openMain("alerts"));
      n.show();
    }
  }catch(e){console.warn("Native notification unavailable",e.message);}
  showMascot({title,detail});
}
function showMascot(finding){
  if(!settings.notifications)return;
  closeMascot();
  const work=screen.getPrimaryDisplay().workArea;
  const w=390,h=178;
  alertWindow=new BrowserWindow({
    width:w,height:h,x:work.x+work.width-w-20,y:work.y+work.height-h-16,
    show:false,frame:false,resizable:false,movable:false,skipTaskbar:true,
    alwaysOnTop:true,focusable:false,transparent:true,hasShadow:false,
    backgroundColor:"#00000000",
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,
      preload:path.join(__dirname,"mascot-preload.cjs")}
  });
  alertWindow.setMenuBarVisibility(false);
  alertWindow.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  alertWindow.webContents.on("will-navigate",event=>event.preventDefault());
  alertWindow.webContents.once("did-finish-load",()=>{
    if(alertWindow&&!alertWindow.isDestroyed()){
      alertWindow.showInactive();
      alertWindow.webContents.send("caseclosed:mascot-finding",finding);
    }
  });
  alertWindow.loadFile(path.join(__dirname,"mascot.html"));
  // The alert is transient. Existing findings remain available in the Alerts panel.
  const win=alertWindow;
  const dismissal=setTimeout(()=>{if(win&&!win.isDestroyed())win.destroy();},14000);
  dismissal.unref?.();
}
function createTray(){
  if(tray)return;
  if(!validIcon()){console.warn("No icon; tray unavailable");return;}
  tray=new Tray(validIcon());
  tray.setToolTip("Case Closed AI — background device monitoring");
  tray.on("double-click",()=>openMain("alerts"));
  refreshTray();
}
function refreshTray(){
  if(!tray)return;
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:"Open Case Closed AI",click:()=>openMain()},
    {label:"Review device alerts",click:()=>openMain("alerts")},
    {type:"separator"},
    {label:"Background monitoring",type:"checkbox",checked:settings.background,click:async item=>{
      settings.background=item.checked;monitor?.setEnabled(settings.background);await saveSettings();refreshTray();
    }},
    {type:"separator"},
    {label:"Quit Case Closed AI",click:()=>{quitting=true;monitor?.stop();app.quit();}}
  ]));
}
ipcMain.handle("caseclosed:capabilities",()=>diagnostics.getCapabilities());
ipcMain.handle("caseclosed:ai-status",()=>investigator.status());
ipcMain.handle("caseclosed:ai-configure",(_event,key)=>investigator.configureApiKey(key));
ipcMain.handle("caseclosed:ai-investigate",(_event,payload)=>investigator.investigate(payload));
ipcMain.handle("caseclosed:scan",async(_event,options)=>{
  if(scanning)throw new Error("A diagnostic scan is already running.");
  scanning=true;try{return await diagnostics.runHealthScan({internet:options?.internet===true});}
  finally{scanning=false;}
});
ipcMain.handle("caseclosed:defender",async()=>{
  if(securityScan)throw new Error("A Defender scan request is already running.");
  securityScan=true;try{return await diagnostics.requestDefenderQuickScan();}
  finally{securityScan=false;}
});
ipcMain.handle("caseclosed:history",()=>defenderHistory());
ipcMain.handle("caseclosed:file-inspect",async event=>{
  let resources=[];
  try{const history=await defenderHistory();resources=history.detections.flatMap(d=>d.resources);}catch{}
  return fileReview.inspectSelected(BrowserWindow.fromWebContents(event.sender),resources);
});
ipcMain.handle("caseclosed:file-recycle",event=>fileReview.recycleSelected(BrowserWindow.fromWebContents(event.sender)));
ipcMain.handle("caseclosed:monitor-status",()=>getSettings());
ipcMain.handle("caseclosed:monitor-now",async()=>{await monitor?.checkNow();return getSettings();});
ipcMain.handle("caseclosed:monitor-settings",async(_event,values)=>{
  const v=values||{};
  if(typeof v.background==="boolean")settings.background=v.background;
  if(typeof v.notifications==="boolean")settings.notifications=v.notifications;
  if(typeof v.autoStart==="boolean"){
    settings.autoStart=v.autoStart;
    setStartup(v.autoStart);
  }
  await saveSettings();monitor?.setEnabled(settings.background);refreshTray();
  return getSettings();
});
ipcMain.on("caseclosed:mascot-review",()=>{closeMascot();openMain("alerts");});
ipcMain.on("caseclosed:mascot-dismiss",()=>closeMascot());

function createMainWindow(){
  if(mainWindow&&!mainWindow.isDestroyed())return mainWindow;
  const options={show:false,width:1240,height:840,minWidth:800,minHeight:600,
    backgroundColor:"#111419",title:APP_TITLE,webPreferences:{
      nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
      preload:path.join(__dirname,"preload.cjs")
    }};
  if(validIcon())options.icon=validIcon();
  mainWindow=new BrowserWindow(options);
  mainWindow.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  mainWindow.webContents.on("will-navigate",event=>event.preventDefault());
  mainWindow.on("close",event=>{
    if(!quitting&&tray){
      event.preventDefault();mainWindow.hide();
    }
  });
  mainWindow.on("closed",()=>{mainWindow=null;});
  mainWindow.loadFile(path.join(__dirname,"..","index.html"));
  return mainWindow;
}
function createSplash(){
  const options={width:690,height:445,frame:false,show:false,resizable:false,maximizable:false,
    minimizable:false,skipTaskbar:true,center:true,backgroundColor:"#101318",
    title:APP_TITLE+" — Starting",webPreferences:{
      nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true
    }};
  if(validIcon())options.icon=validIcon();
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
  const minimum=new Promise(resolve=>setTimeout(resolve,SPLASH_MINIMUM_MS));
  const main=createMainWindow();
  const ready=new Promise(resolve=>{
    if(main.webContents.isLoading()===false){resolve(true);return;}
    main.webContents.once("did-finish-load",()=>resolve(true));
    main.webContents.once("did-fail-load",()=>resolve(false));
  });
  const [loaded]=await Promise.all([ready,minimum]);
  if(splash&&!splash.isDestroyed())splash.close();
  if(main&&!main.isDestroyed()){
    openMain();
    if(!loaded)main.webContents.reload();
  }
}
if(single)app.on("second-instance",()=>openMain());
app.on("before-quit",()=>{quitting=true;monitor?.stop();});
app.whenReady().then(async()=>{
  if(!single)return;
  app.setAppUserModelId("ai.caseclosed.desktop");
  await loadSettings();
  monitor=createMonitor({
    onFindings:async findings=>{notifyFinding(findings);},
    onError:err=>console.warn("Background scan error:",err.message)
  });
  createTray();
  monitor.setEnabled(settings.background);
  if(process.argv.includes(BACKGROUND_FLAG)){
    createMainWindow(); // Hidden resident window and active tray service.
  }else{
    launchWithIntro();
  }
  app.on("activate",()=>openMain());
});

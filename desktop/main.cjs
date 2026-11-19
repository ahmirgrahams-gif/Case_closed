"use strict";
const {app,BrowserWindow}=require("electron");
const path=require("node:path");
function createWindow(){const win=new BrowserWindow({width:1240,height:840,minWidth:800,minHeight:600,backgroundColor:"#111419",title:"Case Closed AI",webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});win.webContents.setWindowOpenHandler(()=>({action:"deny"}));win.loadFile(path.join(__dirname,"..","index.html"));}
app.whenReady().then(()=>{createWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});

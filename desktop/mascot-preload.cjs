"use strict";const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("caseClosedMascot",Object.freeze({
  review:()=>ipcRenderer.send("caseclosed:mascot-review"),
  dismiss:()=>ipcRenderer.send("caseclosed:mascot-dismiss"),
  onFinding:fn=>ipcRenderer.on("caseclosed:mascot-finding",(_event,data)=>fn(data))
}));

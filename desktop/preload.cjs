"use strict";
const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("caseClosedDevice",Object.freeze({
  capabilities:()=>ipcRenderer.invoke("caseclosed:capabilities"),
  scan:options=>ipcRenderer.invoke("caseclosed:scan",{internet:options?.internet===true}),
  requestDefenderQuickScan:()=>ipcRenderer.invoke("caseclosed:defender")
}));

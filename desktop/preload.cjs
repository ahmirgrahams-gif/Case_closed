"use strict";
const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("caseClosedDevice",Object.freeze({
  capabilities:()=>ipcRenderer.invoke("caseclosed:capabilities"),
  scan:options=>ipcRenderer.invoke("caseclosed:scan",{internet:options?.internet===true}),
  requestDefenderQuickScan:()=>ipcRenderer.invoke("caseclosed:defender"),
  aiStatus:()=>ipcRenderer.invoke("caseclosed:ai-status"),
  aiConfigure:key=>ipcRenderer.invoke("caseclosed:ai-configure",key),
  aiInvestigate:payload=>ipcRenderer.invoke("caseclosed:ai-investigate",payload)
}));

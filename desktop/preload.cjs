"use strict";
const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("caseClosedDevice",Object.freeze({
  capabilities:()=>ipcRenderer.invoke("caseclosed:capabilities"),
  scan:options=>ipcRenderer.invoke("caseclosed:scan",{internet:options?.internet===true}),
  requestDefenderQuickScan:()=>ipcRenderer.invoke("caseclosed:defender"),
  aiStatus:()=>ipcRenderer.invoke("caseclosed:ai-status"),
  aiConfigure:key=>ipcRenderer.invoke("caseclosed:ai-configure",key),
  aiInvestigate:payload=>ipcRenderer.invoke("caseclosed:ai-investigate",payload),
  monitorStatus:()=>ipcRenderer.invoke("caseclosed:monitor-status"),
  monitorNow:()=>ipcRenderer.invoke("caseclosed:monitor-now"),
  monitorSettings:options=>ipcRenderer.invoke("caseclosed:monitor-settings",options),
  defenderHistory:()=>ipcRenderer.invoke("caseclosed:history"),
  inspectFile:()=>ipcRenderer.invoke("caseclosed:file-inspect"),
  recycleFile:()=>ipcRenderer.invoke("caseclosed:file-recycle"),
  onShowPage:callback=>ipcRenderer.on("caseclosed:show-page",(_event,page)=>callback(page))
}));

"use strict";
/**
 * File review is explicitly user initiated. There is no filename-based
 * "malware detection": provenance is reported and removal requires consent.
 */
const fs=require("node:fs/promises");
const path=require("node:path");
const os=require("node:os");
const crypto=require("node:crypto");
const {createReadStream}=require("node:fs");
const {dialog,shell}=require("electron");
const MAX_HASH_BYTES=256*1024*1024;
let selected=null;
const protectedRoots=[
  process.env.WINDIR,process.env.SystemRoot,process.env.ProgramFiles,
  process.env["ProgramFiles(x86)"],process.env.ProgramData
].filter(Boolean).map(v=>path.resolve(v).toLowerCase());
function isProtected(target){
  const p=path.resolve(target).toLowerCase();
  return protectedRoots.some(root=>p===root||p.startsWith(root+path.sep));
}
function normalizeDefenderResources(resources){
  const items=Array.isArray(resources)?resources:(typeof resources==="string"?[resources]:[]);
  return items.map(x=>String(x).slice(0,700));
}
async function inspectSelected(win,reportedResources=[]){
  const pick=await dialog.showOpenDialog(win,{title:"Choose a file to inspect",properties:["openFile"],buttonLabel:"Inspect file"});
  if(pick.canceled||!pick.filePaths?.length)return null;
  selected=null;
  const filename=await fs.realpath(pick.filePaths[0]);
  const stat=await fs.lstat(filename);
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error("Only ordinary files can be inspected.");
  const reason=[];
  if(isProtected(filename))reason.push("Protected OS or application location. Removal is blocked.");
  const ext=path.extname(filename).toLowerCase();
  if([".exe",".dll",".bat",".cmd",".ps1",".scr",".js",".vbs",".msi"].includes(ext)){
    reason.push("This is an executable or script type, which is capable of running code. That alone is not proof of malware.");
  }else{
    reason.push("File type alone is not evidence that this file is malicious.");
  }
  const resources=normalizeDefenderResources(reportedResources);
  const match=resources.some(v=>v.toLowerCase().includes(filename.toLowerCase()));
  if(match)reason.unshift("One or more recorded Defender detections referenced this path. Review details in Windows Security before acting.");
  else reason.push("No exact file-path link to the provided Defender detections was established.");
  let sha256=null;
  if(stat.size<=MAX_HASH_BYTES){
    sha256=await new Promise((resolve,reject)=>{
      const h=crypto.createHash("sha256");const stream=createReadStream(filename);
      stream.on("data",x=>h.update(x));stream.on("end",()=>resolve(h.digest("hex")));stream.on("error",reject);
    });
  }
  const result={name:path.basename(filename),path:filename,bytes:stat.size,sha256,
    modifiedAt:stat.mtime.toISOString(),extension:ext,
    reasons:reason,reportedByDefender:match,
    classification:match?"Referenced by Defender history":"Not classified as malicious",
    canRecycle:!isProtected(filename),canExplain:true};
  selected={path:filename,modifiedMs:stat.mtimeMs,size:stat.size,canRecycle:result.canRecycle};
  return result;
}
async function recycleSelected(win){
  const item=selected;
  if(!item)throw new Error("Select and inspect a file first.");
  if(!item.canRecycle||isProtected(item.path))throw new Error("This file is inside a protected system or application location.");
  const current=await fs.lstat(item.path);
  if(!current.isFile()||current.isSymbolicLink()||current.size!==item.size||Math.abs(current.mtimeMs-item.modifiedMs)>10)
    throw new Error("The file changed since inspection. Inspect it again before making a decision.");
  const response=await dialog.showMessageBox(win,{
    type:"warning",title:"Move selected file to Recycle Bin?",
    message:"You are about to remove this file from its current location.",
    detail:item.path+"\n\nCase Closed AI has NOT proven this file is malware. Choose Move only if you recognize and approve the action. Moving to Recycle Bin may disrupt applications. Review Windows Security first.",
    buttons:["Cancel","Move to Recycle Bin"],defaultId:0,cancelId:0,noLink:true
  });
  if(response.response!==1)return {moved:false};
  await shell.trashItem(item.path);
  selected=null;
  return {moved:true,message:"File moved to Recycle Bin. It was not permanently deleted."};
}
module.exports={inspectSelected,recycleSelected,isProtected,normalizeDefenderResources};

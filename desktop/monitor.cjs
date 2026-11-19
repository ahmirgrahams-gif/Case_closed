"use strict";
/**
 * Background checks run only while the installed desktop process is running.
 * They do not automatically remove files or scan external websites.
 */
const {runHealthScan}=require("./diagnostics.cjs");
const {defenderHistory}=require("./defender-history.cjs");
const INTERVAL=15*60*1000;
function issueKey(issue){return issue.source+"|"+issue.id+"|"+issue.summary;}
function pickAttention(scan,history){
  const health=scan.checks.filter(c=>c.status==="attention" && c.id!=="cpu" && c.id!=="memory")
    .map(c=>({id:c.id,title:c.title,summary:c.summary,source:c.source,detail:c.evidence||"",filePath:null,severity:"review"}));
  // Defender detections are history, not active malware classification.
  const detections=(history?.detections||[]).filter(x=>x.actionSuccess!==true)
    .map(x=>({id:"defender-"+x.threatId+"-"+x.detectedAt,title:"Microsoft Defender detection",
      summary:"Windows Security recorded a detection without a confirmed successful action. Review it.",
      detail:x.resources.join(" | ").slice(0,1000),source:"Get-MpThreatDetection",filePath:null,severity:"security"}));
  return [...health,...detections];
}
function createMonitor({onFindings,onError,intervalMs=INTERVAL}){
  let timer=null,running=false,enabled=false,previous=new Set(),initialized=false,latest=null,lastScan=null;
  async function checkNow(force=false){
    if(running||(!enabled&&!force))return latest;
    running=true;
    try{
      const [scan,history]=await Promise.all([
        runHealthScan({internet:false}),
        defenderHistory().catch(()=>({available:false,detections:[]}))
      ]);
      const issues=pickAttention(scan,history);
      const keys=new Set(issues.map(issueKey));
      const fresh=initialized?issues.filter(i=>!previous.has(issueKey(i))):issues.filter(i=>i.severity==="security");
      previous=keys;initialized=true;lastScan=new Date().toISOString();
      latest={scan,history,issues,checkedAt:lastScan};
      if(fresh.length)await onFindings(fresh,latest);
      return latest;
    }catch(e){onError?.(e);return latest;}
    finally{running=false;}
  }
  function setEnabled(value){
    enabled=value===true;
    if(timer){clearInterval(timer);timer=null;}
    if(enabled){checkNow();timer=setInterval(checkNow,intervalMs);timer.unref?.();}
    return {enabled,intervalMinutes:intervalMs/60000,checkedAt:lastScan};
  }
  function status(){return {enabled,intervalMinutes:intervalMs/60000,checkedAt:lastScan,issues:latest?.issues||[],history:latest?.history||null};}
  function stop(){enabled=false;if(timer)clearInterval(timer);timer=null;}
  return {setEnabled,checkNow,status,stop};
}
module.exports={createMonitor,pickAttention,issueKey};

"use strict";
const {execFile}=require("node:child_process");
const {promisify}=require("node:util");
const run=promisify(execFile);
const SCRIPT=[
  "$ErrorActionPreference='Stop'",
  "$detections=@()",
  "try {",
  "  $detections=@(Get-MpThreatDetection -ErrorAction Stop | Select-Object -First 30 | ForEach-Object {",
  "    $resources=@($_.Resources | ForEach-Object { [string]$_ })",
  "    $first=$null",
  "    $last=$null",
  "    if($_.InitialDetectionTime){$first=$_.InitialDetectionTime.ToString('o')}",
  "    if($_.LastThreatStatusChangeTime){$last=$_.LastThreatStatusChangeTime.ToString('o')}",
  "    @{ ThreatID=[string]$_.ThreatID; InitialDetectionTime=$first;",
  "       LastThreatStatusChangeTime=$last;"
  "       ActionSuccess=[bool]$_.ActionSuccess; Resources=$resources; ThreatStatusID=[string]$_.ThreatStatusID }",
  "  })",
  "} catch {",
  "  @{Available=$false;Reason='Defender history unavailable (another provider or restricted access).';Detections=@()} | ConvertTo-Json -Depth 6 -Compress",
  "  exit 0",
  "}",
  "@{Available=$true;Detections=$detections} | ConvertTo-Json -Depth 6 -Compress"
].join("\n");
async function defenderHistory(){
  if(process.platform!=="win32")return {available:false,reason:"Windows only",detections:[]};
  const {stdout}=await run("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",SCRIPT],
    {windowsHide:true,timeout:16000,maxBuffer:524288});
  const data=JSON.parse(stdout.trim());
  return {
    available:data.Available===true,
    reason:data.Reason||null,
    // A detection history entry is not proof the file is currently infected.
    detections:[data.Detections].flat().filter(Boolean).slice(0,30).map(x=>({
      threatId:String(x.ThreatID||"").slice(0,80),
      detectedAt:x.InitialDetectionTime||null,
      changedAt:x.LastThreatStatusChangeTime||null,
      actionSuccess:x.ActionSuccess===true,
      statusId:String(x.ThreatStatusID||"").slice(0,40),
      resources:[x.Resources].flat().filter(Boolean).slice(0,12).map(v=>String(v).slice(0,550))
    }))
  };
}
module.exports={defenderHistory};

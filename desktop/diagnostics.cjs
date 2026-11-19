"use strict";
// Read-only OS diagnostics. No file modification or hidden telemetry.
// Static PowerShell commands: no user input is interpolated into commands.
const os = require("node:os");
const fs = require("node:fs/promises");
const dns = require("node:dns/promises");
const https = require("node:https");
const {execFile} = require("node:child_process");
const {promisify} = require("node:util");
const execFileAsync = promisify(execFile);

function check(id,title,status,summary,evidence,nextStep,source){
  return {id,title,status,summary,evidence,nextStep,source};
}
function percent(part,whole){
  return Number(whole)>0 ? Math.max(0,Math.min(100,Math.round(100*Number(part)/Number(whole)))) : null;
}
function memoryCheck(free,total){
  const pct=percent(free,total);
  if(pct===null)return check("memory","Memory","unknown","Memory information unavailable.",null,"Retry the scan.","OS memory");
  return check("memory","Memory",pct<10?"attention":"ok",pct<10?"Available memory is low.":"Available memory is above the basic threshold.",String(pct)+"% available ("+(free/1073741824).toFixed(1)+" of "+(total/1073741824).toFixed(1)+" GiB)","Close unnecessary programs, then scan again. This is a snapshot, not proof of a memory leak.","OS memory");
}
function cpuCheck(busy){
  if(!Number.isFinite(busy))return check("cpu","Processor","unknown","CPU activity unavailable.",null,"Retry the scan.","OS CPU counters");
  const pct=Math.round(busy);
  return check("cpu","Processor",pct>=90?"attention":"ok",pct>=90?"CPU activity was high in this short sample.":"No high CPU activity in this short sample.",String(pct)+"% busy in a brief sample","Look for sustained high activity in Task Manager. A brief peak does not prove a fault.","OS CPU counters");
}
function diskChecks(disks){
  if(!Array.isArray(disks)||!disks.length)return [check("disk","Storage","unknown","Disk information unavailable.",null,"Check storage in OS settings.","OS storage")];
  return disks.filter(x=>Number(x.size)>0).map((d,i)=>{
    const pct=percent(d.free,d.size);
    return check("disk-"+i,"Storage ("+String(d.label||"Volume").slice(0,16)+")",pct<10?"attention":"ok",pct<10?"Free space is running low.":"Free space is above the basic threshold.",pct+"% free · "+(Number(d.free)/1073741824).toFixed(1)+" GiB available","Review storage recommendations before deleting files. This app makes no changes.","OS storage");
  });
}
function defenderCheck(d){
  if(!d||d.available!==true)return check("defender","Windows antivirus","unknown","Could not read Microsoft Defender status.",null,"Open Windows Security to check the active antivirus provider.","Get-MpComputerStatus");
  const good=d.antivirusEnabled===true&&d.realtimeEnabled===true;
  return check("defender","Windows antivirus",good?"ok":"attention",good?"Defender reports real-time protection enabled.":"Defender real-time protection is not enabled or another product manages it.","Antivirus: "+(d.antivirusEnabled?"on":"off")+" · Real-time: "+(d.realtimeEnabled?"on":"off")+(d.signatureUpdated?" · Signatures: "+String(d.signatureUpdated).slice(0,10):""),"Check the active provider in Windows Security. Do not disable other antivirus software.","Get-MpComputerStatus");
}
function firewallCheck(profiles){
  if(!Array.isArray(profiles)||!profiles.length)return check("firewall","Windows Firewall","unknown","Firewall status unavailable.",null,"Review Firewall & network protection in Windows Security.","Get-NetFirewallProfile");
  const disabled=profiles.filter(p=>!p.enabled);
  return check("firewall","Windows Firewall",disabled.length?"attention":"ok",disabled.length?"One or more firewall profiles are disabled.":"Windows Firewall profiles report enabled.",profiles.map(p=>p.name+": "+(p.enabled?"on":"off")).join(" · "),"Review device or organization security policies before changing firewall settings.","Get-NetFirewallProfile");
}
function networkCheck(n){
  if(!n)return check("network","Internet connectivity","unknown","Internet test skipped.",null,"Enable external connectivity checks if you want to test DNS and HTTPS.","Not tested");
  const good=n.dns===true&&n.https===true;
  return check("network","Internet connectivity",good?"ok":"attention",good?"Both selected internet endpoints were reachable.":"DNS or HTTPS connectivity to selected test endpoints failed.","DNS example.com: "+(n.dns?"resolved":"failed")+" · HTTPS microsoft.com: "+(n.https?"connected":"failed"),"Test another network or provider. A blocked test site does not by itself prove an outage.","DNS lookup and HTTPS request");
}
function measureCpu(){
  function sample(){return os.cpus().map(c=>{const t=c.times;return {idle:t.idle,total:t.user+t.nice+t.sys+t.idle+t.irq};});}
  const a=sample();
  return new Promise(resolve=>setTimeout(()=>{
    const b=sample();let total=0,idle=0;
    for(let i=0;i<Math.min(a.length,b.length);i++){total+=b[i].total-a[i].total;idle+=b[i].idle-a[i].idle;}
    resolve(total>0?100*(1-idle/total):null);
  },400));
}
async function powershell(script,ms=18000){
  const r=await execFileAsync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",script],{windowsHide:true,encoding:"utf8",timeout:ms,maxBuffer:524288});
  return r.stdout.trim();
}
const WINDOWS_SCRIPT=[
  "$ErrorActionPreference = 'Stop'",
  "$d = @()",
  "try { $d = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,Size,FreeSpace) } catch {}",
  "$av = $null",
  "try {",
  "  $m = Get-MpComputerStatus -ErrorAction Stop",
  "  $stamp = $null",
  "  if($m.AntivirusSignatureLastUpdated) { $stamp = $m.AntivirusSignatureLastUpdated.ToString('o') }",
  "  $av = @{ Available=$true; AntivirusEnabled=[bool]$m.AntivirusEnabled; RealtimeEnabled=[bool]$m.RealTimeProtectionEnabled; SignatureUpdated=$stamp }",
  "} catch { $av = @{Available=$false} }",
  "$f = @()",
  "try { $f = @(Get-NetFirewallProfile -ErrorAction Stop | Select-Object Name,Enabled) } catch {}",
  "@{Disks=$d; Defender=$av; Firewall=$f} | ConvertTo-Json -Depth 5 -Compress"
].join("; ");
async function windowsInfo(){
  // PowerShell statements and blocks need newlines: use a newline delimiter.
  const obj=JSON.parse(await powershell(WINDOWS_SCRIPT.replace(/; /g,"\n")));
  return {
    disks:[obj.Disks].flat().filter(Boolean).map(d=>({label:d.DeviceID,size:d.Size,free:d.FreeSpace})),
    defender:obj.Defender?{available:obj.Defender.Available===true,antivirusEnabled:obj.Defender.AntivirusEnabled===true,realtimeEnabled:obj.Defender.RealtimeEnabled===true,signatureUpdated:obj.Defender.SignatureUpdated||null}:null,
    firewall:[obj.Firewall].flat().filter(Boolean).map(f=>({name:f.Name,enabled:f.Enabled===true}))
  };
}
async function portableDisks(){
  try{const d=await fs.statfs(os.homedir());return [{label:"Home volume",size:Number(d.blocks)*Number(d.bsize),free:Number(d.bavail)*Number(d.bsize)}];}catch{return [];}
}
async function probeInternet(){
  let dnsOK=false,httpsOK=false;
  const wait=(p,ms)=>new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(new Error("timeout")),ms);
    p.then(x=>{clearTimeout(t);resolve(x);},e=>{clearTimeout(t);reject(e);});
  });
  try{await wait(dns.lookup("example.com"),6500);dnsOK=true;}catch{}
  try{
    await wait(new Promise((resolve,reject)=>{
      const r=https.get("https://www.microsoft.com/",{timeout:6500,agent:false,headers:{"User-Agent":"CaseClosedAI-ConnectivityCheck/0.2"}},res=>{res.resume();resolve(res.statusCode);});
      r.on("timeout",()=>r.destroy(new Error("Timeout")));r.on("error",reject);
    }),7500);httpsOK=true;
  }catch{}
  return {dns:dnsOK,https:httpsOK};
}
function getCapabilities(){
  return {native:true,platform:process.platform,defenderQuickScan:process.platform==="win32",readOnlyHealthChecks:true};
}
async function runHealthScan(options={}){
  const platform=process.platform;
  const [cpu,w,net]=await Promise.all([
    measureCpu(),
    platform==="win32"?windowsInfo().catch(()=>null):portableDisks().then(disks=>({disks,defender:null,firewall:[]})),
    options.internet===true?probeInternet():Promise.resolve(null)
  ]);
  const checks=[memoryCheck(os.freemem(),os.totalmem()),cpuCheck(cpu),...diskChecks(w&&w.disks)];
  if(platform==="win32")checks.push(defenderCheck(w&&w.defender),firewallCheck(w&&w.firewall));
  checks.push(networkCheck(net));
  return {scannedAt:new Date().toISOString(),platform,platformRelease:os.release(),evidenceType:"Native OS observations",checks};
}
async function requestDefenderQuickScan(){
  if(process.platform!=="win32")throw new Error("Microsoft Defender Quick Scan requires Windows.");
  const script=[
    "$ErrorActionPreference = 'Stop'",
    "$s = Get-MpComputerStatus -ErrorAction Stop",
    "if(-not $s.AntivirusEnabled) { throw 'Microsoft Defender Antivirus is not enabled.' }",
    "Start-MpScan -ScanType QuickScan -ErrorAction Stop",
    "@{Requested=$true;At=(Get-Date).ToString('o')} | ConvertTo-Json -Compress"
  ].join("\n");
  const result=JSON.parse(await powershell(script,600000));
  if(result.Requested!==true)throw new Error("Defender did not confirm scan request.");
  return {requested:true,at:result.At,message:"Windows Defender accepted the Quick Scan request. Check Windows Security for progress, completion and detections. This app does not certify that the device is clean."};
}
module.exports={getCapabilities,runHealthScan,requestDefenderQuickScan,memoryCheck,cpuCheck,diskChecks,defenderCheck,firewallCheck,networkCheck};

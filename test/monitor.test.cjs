"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const {pickAttention,issueKey}=require("../desktop/monitor.cjs");
test("monitor reports actionable OS findings, not momentary CPU spikes",()=>{
  const scan={checks:[
    {id:"cpu",status:"attention",source:"CPU",title:"CPU",summary:"Brief CPU spike"},
    {id:"disk-0",status:"attention",source:"Storage",title:"Storage low",summary:"Drive low on space",evidence:"5% free"},
    {id:"memory",status:"attention",source:"Memory",title:"Memory",summary:"Low now"},
    {id:"firewall",status:"ok",source:"Firewall",title:"Firewall",summary:"enabled"}
  ]};
  const issues=pickAttention(scan,{detections:[]});
  assert.equal(issues.length,1);
  assert.equal(issues[0].id,"disk-0");
});
test("Defender history is separated from proven active malware",()=>{
  const issues=pickAttention({checks:[]},{detections:[
    {threatId:"123",detectedAt:"2026-11-19",actionSuccess:false,resources:["file:_C:\\test.exe"]},
    {threatId:"456",detectedAt:"2026-11-18",actionSuccess:true,resources:[]}
  ]});
  assert.equal(issues.length,1);
  assert.equal(issues[0].severity,"security");
  assert.match(issues[0].summary,/not.*confirmed|without.*confirmed/i);
  assert.ok(issueKey(issues[0]).includes("defender"));
});

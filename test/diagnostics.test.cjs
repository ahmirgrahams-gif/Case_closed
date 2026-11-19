"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const {memoryCheck,cpuCheck,diskChecks,defenderCheck,firewallCheck,networkCheck}=require("../desktop/diagnostics.cjs");
test("memory check flags low free memory",()=>{
  assert.equal(memoryCheck(1,100).status,"attention");
  assert.equal(memoryCheck(80,100).status,"ok");
});
test("CPU check reports high utilization as attention",()=>{
  assert.equal(cpuCheck(94).status,"attention");
  assert.equal(cpuCheck(19).status,"ok");
});
test("disk checks keep local observations per volume",()=>{
  const d=diskChecks([{label:"C:",size:100,free:4},{label:"D:",size:100,free:50}]);
  assert.equal(d.length,2);
  assert.equal(d[0].status,"attention");assert.equal(d[1].status,"ok");
});
test("Defender inactive is not reported healthy",()=>{
  assert.equal(defenderCheck({available:true,antivirusEnabled:false,realtimeEnabled:false}).status,"attention");
  assert.equal(defenderCheck(null).status,"unknown");
  assert.equal(defenderCheck({available:true,antivirusEnabled:true,realtimeEnabled:true}).status,"ok");
});
test("firewall status respects individual profiles",()=>{
  assert.equal(firewallCheck([{name:"Public",enabled:true},{name:"Private",enabled:false}]).status,"attention");
});
test("remote connectivity check not performed is explicitly unknown",()=>{
  assert.equal(networkCheck(null).status,"unknown");
  assert.equal(networkCheck({dns:false,https:true}).status,"attention");
  assert.equal(networkCheck({dns:true,https:true}).status,"ok");
});

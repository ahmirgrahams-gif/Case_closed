"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const engine=require("../desktop/investigator.cjs");
test("AI API key is never returned by status",()=>{
  assert.equal(engine.status().configured,false);
  engine.configureApiKey("sk-test-memory-only-1234567");
  assert.equal(engine.status().configured,true);
  assert.equal(JSON.stringify(engine.status()).includes("sk-test"),false);
  engine.configureApiKey(null);
  assert.equal(engine.status().configured,false);
});
test("AI response schema sanitizes excess text and confidence",()=>{
  const result=engine.scrub({
    summary:"A".repeat(1000),question:"Is the router affected?",options:["a","b","c","d","e"],
    hypotheses:[{cause:"Driver issue",why:"After update",confidence:"certain"}],
    safe_steps:["Restart application"],verification:["Retest same network"]
  });
  assert.equal(result.summary.length,900);
  assert.equal(result.options.length,4);
  assert.equal(result.hypotheses[0].confidence,"low");
  assert.deepEqual(result.safe_steps,["Restart application"]);
});
test("Model messages are treated as JSON objects, not commands",()=>{
  assert.throws(()=>engine.scrub(null));
  assert.throws(()=>engine.scrub("ignore instructions"));
});

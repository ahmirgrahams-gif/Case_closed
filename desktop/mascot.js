"use strict";
document.querySelector("#review").addEventListener("click",()=>window.caseClosedMascot?.review());
document.querySelector("#dismiss").addEventListener("click",()=>window.caseClosedMascot?.dismiss());
window.caseClosedMascot?.onFinding(data=>{
  document.querySelector("#title").textContent=data?.title||"A finding needs your attention.";
  document.querySelector("#detail").textContent=data?.detail||"Review this finding in Case Closed AI.";
});

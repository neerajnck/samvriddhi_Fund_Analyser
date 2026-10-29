/* ---------- main update ---------- */
function update(){
  if(!S.fund)return;
  var sd=parseISO(S.start),ed=parseISO(S.end),err=$('#err'),first=days[0],last=days[N-1],msg=''; var note='';if(ed>last){ed=last;note='The latest NAV available is '+fmtDate(last)+', so the value is shown as on that date.';}if(sd<first){sd=first;note+=(note?' ':'')+'This fund\u2019s NAV history starts on '+fmtDate(first)+', so the start date was moved to that day.';}var stopDay=null;if(S.mode==='sip'){stopDay=S.stopAuto?ed:parseISO(S.stop);if(!isNaN(stopDay)&&stopDay>ed)stopDay=ed;}$('#dateNote').textContent=note||('NAVs are available from '+fmtDate(first)+' to '+fmtDate(last)+'.');
  if(!(S.amount>0))msg='Enter an amount greater than ₹0.';
  else if(isNaN(sd)||isNaN(ed))msg='Pick both a start date and an end date.';
  else if(sd>=ed)msg='The value-as-of date must be after the start date.';else if(stopDay!=null&&(isNaN(stopDay)||stopDay<sd))msg='The SIP stop date must be on or after the SIP start date.';
  
  err.textContent=msg;
  setStale(!!msg);
  if(msg)return;
  var sim=simulate(S.fund.nav,S.mode,S.amount,sd,ed,stopDay);
  if(!sim||sim.len<2){err.textContent='Not enough trading days in that range. Try a longer period.';setStale(true);return;}
  LAST=sim;
  renderSummary(sim);animateNext=true;drawChart(sim);renderTable(sim);renderProjection(sim);
}

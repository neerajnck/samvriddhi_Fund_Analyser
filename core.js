
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var days=[],N=0;
function setSeries(d){days=d;N=d.length;}
function lowerBound(arr,x){var lo=0,hi=arr.length;while(lo<hi){var m=(lo+hi)>>1;if(arr[m]<x)lo=m+1;else hi=m;}return lo;}
function nextIdx(day){return lowerBound(days,day);}
function dayToYMD(d){var t=new Date(d*864e5);return[t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()];}
function fmtDate(d){var a=dayToYMD(d);return a[2]+' '+MON[a[1]]+' '+a[0];}
function iso(d){var a=dayToYMD(d);return a[0]+'-'+String(a[1]+1).padStart(2,'0')+'-'+String(a[2]).padStart(2,'0');}
function parseISO(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?Date.UTC(+m[1],+m[2]-1,+m[3])/864e5:NaN;}
function parseDMY(s){var m=/^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(s||'').trim());return m?Date.UTC(+m[3],+m[2]-1,+m[1])/864e5:NaN;}
function addMonths(day,k){var a=dayToYMD(day),t=a[1]+k,yy=a[0]+Math.floor(t/12),mm=((t%12)+12)%12,dim=new Date(Date.UTC(yy,mm+1,0)).getUTCDate();return Date.UTC(yy,mm,Math.min(a[2],dim))/864e5;}

function parseHistory(json){
  var raw=(json&&json.data)||[],rows=[];
  for(var i=0;i<raw.length;i++){var d=parseDMY(raw[i].date),n=parseFloat(raw[i].nav);if(isFinite(d)&&n>0)rows.push({d:d,n:n});}
  rows.sort(function(a,b){return a.d-b.d;});
  var dd=[],nn=[];
  rows.forEach(function(r){if(dd.length&&dd[dd.length-1]===r.d){nn[nn.length-1]=r.n;}else{dd.push(r.d);nn.push(r.n);}});
  return{days:dd,nav:nn};
}
function simulate(nav,mode,amount,startDay,endDay,stopDay){
  var si=nextIdx(startDay),ei=nextIdx(endDay+1)-1;
  if(si>=N||ei<si)return null;
  var inst=new Map(),sched=[];
  for(var k=0;k<2000;k++){
    var dd=addMonths(startDay,k);
    if(dd>days[ei])break;
    var idx=nextIdx(dd);
    if(idx>ei)break;
    sched.push(idx);
    if((mode==='sip'&&(stopDay==null||dd<=stopDay))||k===0)inst.set(idx,(inst.get(idx)||0)+amount);
  }
  var len=ei-si+1,dayA=new Array(len),navA=new Array(len),invA=new Array(len),unitsA=new Array(len),valA=new Array(len),u=0,iv=0;
  for(var i=si;i<=ei;i++){
    var a=inst.get(i)||0;
    if(a){u+=a/nav[i];iv+=a;}
    var j=i-si;dayA[j]=days[i];navA[j]=nav[i];invA[j]=iv;unitsA[j]=u;valA[j]=u*nav[i];
  }
  return{si:si,ei:ei,len:len,sched:sched,inst:inst,dayA:dayA,navA:navA,invA:invA,unitsA:unitsA,valA:valA};
}
function xirr(flows){
  var d0=flows[0].d,f=function(r){return flows.reduce(function(s,c){return s+c.a/Math.pow(1+r,(c.d-d0)/365);},0);};
  var lo=-.95,hi=10,flo=f(lo),fhi=f(hi);
  if(!isFinite(flo)||!isFinite(fhi)||flo*fhi>0)return null;
  for(var i=0;i<200;i++){var mid=(lo+hi)/2,fm=f(mid);if(flo*fm<=0){hi=mid;fhi=fm;}else{lo=mid;flo=fm;}}
  return(lo+hi)/2;
}
function simXirr(sim){
  var span=sim.dayA[sim.len-1]-sim.dayA[0];
  if(span<365)return null;
  var flows=[];
  sim.inst.forEach(function(a,idx){flows.push({d:days[idx],a:-a});});
  flows.push({d:sim.dayA[sim.len-1],a:sim.valA[sim.len-1]});
  return xirr(flows);
}
function pickRows(sim,view){
  var n=sim.len,r=[],j;
  if(view==='daily'){for(j=0;j<n;j++)r.push(j);return r;}
  if(view==='weekly'){for(j=0;j<n;j+=5)r.push(j);if(r[r.length-1]!==n-1)r.push(n-1);return r;}
  var s=new Set([0]);sim.sched.forEach(function(i){s.add(i-sim.si);});s.add(n-1);
  return Array.from(s).sort(function(a,b){return a-b;});
}
function cagrBetween(d,nav,i0,i1){return Math.pow(nav[i1]/nav[i0],365/(d[i1]-d[i0]))-1;}
function fundStats(d,nav){
  var last=d.length-1,lastDay=d[last],first=d[0],out={r1:null,r3:null,r5:null,since:null,years:(lastDay-first)/365,vol:0,mdd:0,dayChg:null};
  [[1,'r1'],[3,'r3'],[5,'r5']].forEach(function(p){
    var target=lastDay-p[0]*365;
    if(first<=target+7){var i=lowerBound(d,target);if(i<last)out[p[1]]=cagrBetween(d,nav,i,last);}
  });
  if(out.years>=1)out.since=cagrBetween(d,nav,0,last);
  var peak=nav[0],s=0,s2=0,cnt=0;
  for(var i=1;i<=last;i++){
    if(nav[i]>peak)peak=nav[i];
    var dd=nav[i]/peak-1;if(dd<out.mdd)out.mdd=dd;
    var r=Math.log(nav[i]/nav[i-1]);s+=r;s2+=r*r;cnt++;
  }
  if(cnt>1){var m=s/cnt;out.vol=Math.sqrt(Math.max(0,s2/cnt-m*m))*Math.sqrt(250);}
  if(last>=1)out.dayChg=nav[last]/nav[last-1]-1;
  return out;
}
function project(v0,r,years,monthly){
  var n=Math.round(years*12),rm=Math.pow(1+r,1/12)-1,fv=v0*Math.pow(1+r,years),added=0;
  if(monthly>0){fv+=monthly*(rm===0?n:((Math.pow(1+rm,n)-1)/rm)*(1+rm));added=monthly*n;}
  return{fv:fv,added:added};
}
function baseReturn(st){
  if(st.r5!=null)return{r:st.r5,label:'5-year'};
  if(st.r3!=null)return{r:st.r3,label:'3-year'};
  if(st.since!=null)return{r:st.since,label:'since-start'};
  return null;
}
function scenarioRates(r){
  var base=Math.min(Math.max(r,.04),.16);
  return[Math.max(base-.04,.02),base,base+.03];
}

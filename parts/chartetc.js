/* ---------- chart ---------- */
function niceTicks(max){
  if(max<=0)return[0,1];
  var raw=max/4,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p,step=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p,t=[0];
  for(var k=1;k<50;k++){t.push(k*step);if(k*step>=max)break;}
  return t;
}
function drawChart(sim){sim=chartWindow(sim);var anim=animateNext&&!REDUCE;animateNext=false;var AC=anim?' anim':'';
  var host=$('#chart'),W=Math.max(280,Math.floor(host.clientWidth||600)),small=W<520,H=small?250:320;
  var m={l:small?46:58,r:small?64:80,t:14,b:28},iw=W-m.l-m.r,ih=H-m.t-m.b;
  var n=sim.len,dA=sim.dayA,x0=dA[0],x1=dA[n-1],span=Math.max(1,x1-x0),ymax=0,j;
  for(j=0;j<n;j++){if(sim.valA[j]>ymax)ymax=sim.valA[j];if(sim.invA[j]>ymax)ymax=sim.invA[j];}
  var ticks=niceTicks(ymax),top=ticks[ticks.length-1];
  var X=function(d){return m.l+(d-x0)/span*iw;},Y=function(v){return m.t+ih-(v/top)*ih;};
  var g='';
  ticks.forEach(function(t){var y=Y(t);g+='<line class="gridl" x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'"/><text class="axl" x="'+(m.l-8)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+axisMoney(t)+'</text>';});
  var months=span/30.44,maxT=Math.max(2,Math.floor(iw/64)),step=1;
  [1,2,3,6,12,24,60].some(function(s){step=s;return months/s<=maxT;});
  var a0=dayToYMD(x0),t=a0[0]*12+a0[1];
  for(;;t++){
    var yy=Math.floor(t/12),mm=t%12,d=Date.UTC(yy,mm,1)/864e5;
    if(d>x1)break;
    if(d<x0||t%step!==0)continue;
    if(step>=12&&mm!==0)continue;
    var lab=step>=12?String(yy):MON[mm]+' ’'+String(yy).slice(2);
    g+='<text class="axl" x="'+X(d).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+lab+'</text>';
  }
  var pv='',pi='';
  for(j=0;j<n;j++){
    var x=X(dA[j]).toFixed(1),yv=Y(sim.valA[j]).toFixed(1),yi=Y(sim.invA[j]).toFixed(1);
    pv+=(j?'L':'M')+x+' '+yv;
    if(j&&sim.invA[j]!==sim.invA[j-1])pi+='L'+x+' '+Y(sim.invA[j-1]).toFixed(1);
    pi+=(j?'L':'M')+x+' '+yi;
  }
  var base=Y(0).toFixed(1),area=pv+'L'+X(x1).toFixed(1)+' '+base+'L'+X(x0).toFixed(1)+' '+base+'Z';
  var ev=Y(sim.valA[n-1]),ei=Y(sim.invA[n-1]),lv=ev,li=ei;
  if(Math.abs(ev-ei)<14){if(ev<=ei){lv=ev-7;li=ei+7;}else{lv=ev+7;li=ei-7;}}
  var ex=X(x1);
  g+='<path class="area'+AC+'" d="'+area+'"/><path class="l-inv'+AC+'" pathLength="1" d="'+pi+'"/><path class="l-val'+AC+'" pathLength="1" d="'+pv+'"/>'+
     '<circle class="dot-inv'+AC+'" cx="'+ex.toFixed(1)+'" cy="'+ei.toFixed(1)+'" r="4"/><circle class="dot-val'+AC+'" cx="'+ex.toFixed(1)+'" cy="'+ev.toFixed(1)+'" r="4"/>'+
     '<text class="endl'+AC+'" x="'+(ex+9).toFixed(1)+'" y="'+(lv+4).toFixed(1)+'">'+short(sim.valA[n-1])+'</text>'+
     '<text class="endl'+AC+'" x="'+(ex+9).toFixed(1)+'" y="'+(li+4).toFixed(1)+'">'+short(sim.invA[n-1])+'</text>'+
     '<g class="xh" id="xh"><line id="xhl" y1="'+m.t+'" y2="'+(m.t+ih)+'"/><circle class="dot-inv" id="xhi" r="4"/><circle class="dot-val" id="xhv" r="4"/></g>'+
     '<rect id="hit" x="'+m.l+'" y="'+m.t+'" width="'+iw+'" height="'+ih+'" fill="transparent"/>';
  host.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Line chart of amount invested and current value from '+fmtDate(x0)+' to '+fmtDate(x1)+'. The table below has the same numbers.">'+g+'</svg>';
  host.dataset.w=W;
  var svg=host.querySelector('svg'),hit=$('#hit'),xh=$('#xh'),tip=$('#tip');
  function show(e){
    var rect=svg.getBoundingClientRect(),sc=W/rect.width,px=(e.clientX-rect.left)*sc,d=x0+(px-m.l)/iw*span;
    var k=lowerBound(dA,d);if(k>=n)k=n-1;if(k>0&&Math.abs(dA[k-1]-d)<Math.abs(dA[k]-d))k=k-1;
    var xx=X(dA[k]),inv=sim.invA[k],val=sim.valA[k],pr=val-inv;
    $('#xhl').setAttribute('x1',xx);$('#xhl').setAttribute('x2',xx);
    $('#xhi').setAttribute('cx',xx);$('#xhi').setAttribute('cy',Y(inv));
    $('#xhv').setAttribute('cx',xx);$('#xhv').setAttribute('cy',Y(val));
    xh.classList.add('on');
    tip.innerHTML='<b>'+fmtDate(dA[k])+'</b><div><span>NAV</span><span>₹'+IN2.format(sim.navA[k])+'</span></div><div><span>Invested</span><span>'+money(inv)+'</span></div><div><span>Value</span><span>'+money(val)+'</span></div><div><span>Profit</span><span class="'+pcls(pr)+'">'+smoney(pr)+(inv>0?' ('+pct(pr/inv,1)+')':'')+'</span></div>';
    tip.classList.add('on');
    var tw=tip.offsetWidth,xp=xx/sc;
    tip.style.left=Math.max(0,Math.min(rect.width-tw,xp+14>rect.width-tw?xp-tw-14:xp+14))+'px';
  }
  function hide(){xh.classList.remove('on');tip.classList.remove('on');}
  hit.addEventListener('pointermove',show);hit.addEventListener('pointerdown',show);
  hit.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')hide();});
}

/* ---------- table ---------- */
function renderTable(sim){
  var idx=pickRows(sim,S.view),prev=null,h='';
  idx.forEach(function(j,k){
    var nav=sim.navA[j],chg=prev===null?null:nav/sim.navA[prev]-1;
    var added=sim.invA[j]-(prev===null?0:sim.invA[prev]),ua=sim.unitsA[j]-(prev===null?0:sim.unitsA[prev]);
    var inv=sim.invA[j],val=sim.valA[j],pr=val-inv,ret=inv>0?pr/inv:0,edge=k===0||k===idx.length-1;
    h+='<tr'+(edge?' class="edge"':'')+'><td>'+fmtDate(sim.dayA[j])+(k===0?'<span class="pill">Start</span>':k===idx.length-1?'<span class="pill">End</span>':'')+'</td>'+
      '<td>'+IN2.format(nav)+'</td>'+
      '<td class="'+(chg==null?'':pcls(chg))+'">'+(chg==null?'—':pct(chg))+'</td>'+
      '<td>'+(added>0?money(added):'—')+'</td>'+
      '<td>'+(ua>0?IN3.format(ua):'—')+'</td>'+
      '<td>'+IN3.format(sim.unitsA[j])+'</td>'+
      '<td>'+money(inv)+'</td><td>'+money(val)+'</td>'+
      '<td class="'+pcls(pr)+'">'+smoney(pr)+'</td><td class="'+pcls(ret)+'">'+pct(ret)+'</td></tr>';
    prev=j;
  });
  $('#tbody').innerHTML=h;
}

/* ---------- projection ---------- */
function renderProjection(sim){
  var n=sim.len-1,v0=sim.valA[n],inv0=sim.invA[n],sip=S.mode==='sip';
  var ended=sip&&!S.stopAuto&&!!S.stop&&parseISO(S.stop)<sim.dayA[n]-31;$('#contWrap').style.display=(sip&&!ended)?'flex':'none';
  $('#hd').min=iso(sim.dayA[n]+1);var br=baseReturn(S.fund.st);
  if(!br){
    $('#projSub').textContent='';
    $('#scen').innerHTML='<div class="sc"><div class="n">Not available</div><div class="r">This fund has less than one year of NAV history, so a projection would not mean much.</div></div>';
    return;
  }
  var monthly=sip&&S.cont&&!ended?S.amount:0,rates=scenarioRates(br.r),names=['Cautious','Expected','Optimistic'];
  $('#projSub').textContent='Starting from '+money(v0)+' on '+fmtDate(sim.dayA[n])+', looking ahead '+S.hlabel+(monthly?' with '+money(monthly)+' invested every month':'')+'. Based on this fund’s '+br.label+' return of '+pct(br.r,1)+' a year.';
  $('#scen').innerHTML=rates.map(function(r,i){
    var p=project(v0,r,S.horizon,monthly),tot=inv0+p.added,gain=p.fv-tot;
    return'<div class="sc'+(i===1?' mid':'')+'"><div class="n">'+names[i]+'</div><div class="r">assumes '+(r*100).toFixed(1)+'% a year</div><div class="big">'+money(p.fv)+'</div><div class="g">on '+money(tot)+' invested</div><div class="g '+pcls(gain)+'">'+smoney(gain)+' gain</div></div>';
  }).join('');
}


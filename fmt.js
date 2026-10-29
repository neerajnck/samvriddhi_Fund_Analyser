/* ---------- formatting ---------- */
var IN=new Intl.NumberFormat('en-IN',{maximumFractionDigits:0});
var IN2=new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
var IN3=new Intl.NumberFormat('en-IN',{minimumFractionDigits:3,maximumFractionDigits:3});
function money(n){return'₹'+IN.format(Math.round(Math.abs(n)));}
function smoney(n){return(Math.round(n)>=0?'+':'−')+money(n);}
function pct(x,d){var s=Math.abs(x*100).toFixed(d==null?2:d);return(+s===0?'':(x>=0?'+':'−'))+s+'%';}
function pcls(x){return x>=0?'pos':'neg';}
function short(v){if(v>=1e7)return'₹'+(v/1e7).toFixed(2)+' Cr';if(v>=1e5)return'₹'+(v/1e5).toFixed(2)+' L';return money(v);}
function trimN(x){return String(+x.toFixed(2));}
function axisMoney(v){if(v===0)return'₹0';if(v>=1e7)return'₹'+trimN(v/1e7)+'Cr';if(v>=1e5)return'₹'+trimN(v/1e5)+'L';if(v>=1e3)return'₹'+trimN(v/1e3)+'K';return'₹'+trimN(v);}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function retCell(v,label){return v==null?'<dd title="Not enough history">—</dd>':'<dd class="'+pcls(v)+'">'+pct(v,1)+'</dd>';}


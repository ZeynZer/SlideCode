'use strict';
const $=s=>document.querySelector(s),ed=$('#ed'),gut=$('#gut'),pad=$('#pad'),ctx=pad.getContext('2d');
const IND='    ';
// --- Modèle de structures : « » marque la sélection après insertion (extensible : nouveaux gestes = nouvelle entrée)
const TPL={for:'for (int i = 0; i < «10»; i++) {',if:'if («condition») {',while:'while («condition») {',else:'else {',fn:'static void «maFonction»() {'};
const LINE={println:'System.out.println(«"texte"»);',ret:'return «0»;',comment:'// «commentaire»'};
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
let files=LS.get('gc.files',{}),cur=LS.get('gc.cur','main.java');
ed.value=files[cur]??'int x = 10;\n\n';
// --- Toast / UI
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1200)}
function refresh(){const n=ed.value.split('\n').length;gut.textContent=Array.from({length:n},(_,i)=>i+1).join('\n');gut.scrollTop=ed.scrollTop}
function save(){files[cur]=ed.value;LS.set('gc.files',files);LS.set('gc.cur',cur)}
// --- Historique
let H=[],hi=-1,pending=false,tmr;
const snap=l=>({t:ed.value,s:ed.selectionStart,e:ed.selectionEnd,l});
function commit(l){clearTimeout(tmr);pending=false;if(H[hi]&&H[hi].t===ed.value)return;H=H.slice(0,hi+1);H.push(snap(l));if(H.length>200)H.shift();hi=H.length-1;refresh();save()}
function restore(x){ed.value=x.t;ed.setSelectionRange(x.s,x.e);refresh();save()}
function undo(){if(pending)commit('Modification');if(hi<=0)return toast('Rien à annuler');const l=H[hi].l;restore(H[--hi]);toast('Annulé : '+l)}
function redo(){if(hi>=H.length-1)return toast('Rien à rétablir');restore(H[++hi]);toast('Rétabli : '+H[hi].l)}
H=[snap('Début')];hi=0;refresh();
ed.addEventListener('input',()=>{pending=true;refresh();clearTimeout(tmr);tmr=setTimeout(()=>commit('Modification'),700)});
ed.addEventListener('scroll',()=>gut.scrollTop=ed.scrollTop);
ed.addEventListener('beforeinput',e=>{if(e.inputType!=='insertLineBreak')return;e.preventDefault();
 const v=ed.value,p=ed.selectionStart,ls=v.lastIndexOf('\n',p-1)+1,line=v.slice(ls,p);
 const ind=line.match(/^\s*/)[0]+(line.trimEnd().endsWith('{')?IND:'');ed.setRangeText('\n'+ind,p,ed.selectionEnd,'end');ed.dispatchEvent(new Event('input'))});
// --- Insertion structurée (put = bloc ou ligne simple)
function put(text,block,kind){
 const v=ed.value,p=ed.selectionStart,ls=v.lastIndexOf('\n',p-1)+1;let le=v.indexOf('\n',p);if(le<0)le=v.length;
 const line=v.slice(ls,le),ws=line.match(/^\s*/)[0];let before,after,ind,head=text;
 if(!line.trim()){before=v.slice(0,ls);after=v.slice(le);ind=ws;
  if(kind==='else'&&ls>0){const ps=v.lastIndexOf('\n',ls-2)+1,pl=v.slice(ps,ls-1);if(pl.trim()==='}'){before=v.slice(0,ps);ind=pl.match(/^\s*/)[0];head='} else {'}}}
 else if(kind==='else'&&line.trim()==='}'){before=v.slice(0,ls);after=v.slice(le);ind=ws;head='} else {'}
 else{before=v.slice(0,le)+'\n';after=v.slice(le);ind=ws+(line.trimEnd().endsWith('{')?IND:'')}
 head=ind+head;let a=head.indexOf('«'),b=a;
 if(a>=0){head=head.replace('«','');b=head.indexOf('»');head=head.replace('»','')}
 const body=ind+IND,txt=block?head+'\n'+body+'\n'+ind+'}':head;
 if(a<0)a=b=block?head.length+1+body.length:head.length;
 ed.value=before+txt+after;ed.focus({preventScroll:true});ed.setSelectionRange(before.length+a,before.length+b);
}
function insert(kind){const t=TPL[kind];put(t??LINE[kind],!!t,kind);commit('Ajout de '+kind.toUpperCase())}
function delBlock(){
 const L=ed.value.split('\n'),n=(s,c)=>s.split(c).length-1,ls=ed.value.slice(0,ed.selectionStart).split('\n').length-1;
 let s=-1,o=n(L[ls],'{'),c=n(L[ls],'}');
 if(o>c)s=ls;else{let bal=c>o?c-o:0;for(let i=ls-(c>o?1:0);i>=0;i--){if(i<ls||c<=o)bal+=n(L[i],'}')-n(L[i],'{');if(c>o?bal<=0:bal<0){s=i;break}}}
 if(c>o&&s>=0&&s===ls)s=-1;
 if(s<0){L.splice(ls,1);}else{let bal=0,e=s;for(let i=s;i<L.length;i++){bal+=n(L[i],'{')-n(L[i],'}');e=i;if(bal<=0)break}L.splice(s,e-s+1)}
 ed.value=L.join('\n');const pos=L.slice(0,Math.max(0,s<0?ls:s)).join('\n').length+1;ed.setSelectionRange(Math.min(pos,ed.value.length),Math.min(pos,ed.value.length));commit('Suppression de bloc');
}
const act=k=>k==='delete'?delBlock():insert(k);
// --- Reconnaissance géométrique locale
function classify(raw){
 const p=[raw[0]];for(const q of raw){const l=p[p.length-1];if(Math.hypot(q.x-l.x,q.y-l.y)>=10)p.push(q)}
 if(p.length<4)return null;let len=0;const seg=[];
 for(let i=1;i<p.length;i++){const dx=p[i].x-p[i-1].x,dy=p[i].y-p[i-1].y;len+=Math.hypot(dx,dy);seg.push(Math.atan2(dy,dx))}
 if(len<80)return null;let turn=0;
 for(let i=1;i<seg.length;i++){let d=seg[i]-seg[i-1];while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;turn+=d}
 const f=p[0],l=p[p.length-1],dx=l.x-f.x,dy=l.y-f.y,ys=p.map(q=>q.y),xs=p.map(q=>q.x);
 const w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
 const revs=a=>{let r=0,d=0,ref=a[0];for(const x of a){const e=x-ref;if(d<=0&&e>24){if(d<0)r++;d=1;ref=x}else if(d>=0&&e<-24){if(d>0)r++;d=-1;ref=x}else if((d>0&&x>ref)||(d<0&&x<ref))ref=x}return r};
 const o=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),X=(a,b,c,d)=>o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;
 let cr=0;for(let i=0;i<p.length-1;i++)for(let j=i+3;j<p.length-1;j++)if(X(p[i],p[i+1],p[j],p[j+1]))cr++;
 const rx=revs(xs),ry=revs(ys);
 if(cr>=2&&h>=1.2*w&&rx<=2)return'fn';            // f cursif : 2 boucles (haut et bas)
 if(Math.abs(turn)>3.8)return'for';
 if(ry>=3&&rx<3&&w>h)return'println';              // zigzag horizontal
 if(rx>=3)return'delete';                           // zigzag vertical / gribouillis
 if(Math.hypot(dx,dy)/len>0.85){
  if(Math.abs(dx)>2*Math.abs(dy))return dx>0?'while':'ret';
  if(Math.abs(dy)>2*Math.abs(dx))return dy>0?'else':'comment';return null}
 const k=ys.indexOf(Math.max(...ys)),yk=ys[k];
 if(h>50&&w>40&&k>=p.length*.25&&k<=p.length*.75&&yk-f.y>.4*h&&yk-l.y>.4*h)return'if';
 return null;
}
// --- Gestes tactiles (pointer events + capture : le doigt peut sortir de la zone)
let pts=null,t0=0;
function fit(){const d=devicePixelRatio||1,r=pad.getBoundingClientRect();pad.width=r.width*d;pad.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);ctx.lineWidth=5;ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle='#58a6ff'}
addEventListener('resize',fit);fit();
const xy=e=>{const r=pad.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
pad.addEventListener('pointerdown',e=>{pts=[xy(e)];t0=Date.now();pad.setPointerCapture(e.pointerId);ctx.clearRect(0,0,9999,9999);ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y)});
pad.addEventListener('pointermove',e=>{if(!pts)return;const q=xy(e);pts.push(q);ctx.lineTo(q.x,q.y);ctx.stroke()});
pad.addEventListener('pointercancel',()=>{pts=null;ctx.clearRect(0,0,9999,9999)});
pad.addEventListener('pointerup',()=>{if(!pts)return;const p=pts;pts=null;
 setTimeout(()=>ctx.clearRect(0,0,9999,9999),200);
 const dt=Date.now()-t0,far=Math.max(...p.map(q=>Math.hypot(q.x-p[0].x,q.y-p[0].y)));
 if(far<14){if(dt<400){navigator.vibrate?.(15);varSheet()}return}   // point = variable
 if(dt<80)return;const k=classify(p);if(!k)return toast('Geste non reconnu');navigator.vibrate?.(15);act(k)});
// --- Shake = Undo
let last=0,prev=null;
function onMotion(e){const a=e.accelerationIncludingGravity;if(!a)return;const m=Math.hypot(a.x||0,a.y||0,a.z||0),d=prev==null?0:Math.abs(m-prev);prev=m;const n=Date.now();
 if(d>14&&n-last>1200){last=n;undo();navigator.vibrate?.(30)}}
async function setShake(on){
 if(!on){removeEventListener('devicemotion',onMotion);LS.set('gc.shake',false);return true}
 if(typeof DeviceMotionEvent==='undefined'){toast('Secousse non supportée : utilise ↶');return false}
 try{if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted'){toast('Permission refusée');return false}}catch{toast('Permission indisponible');return false}
 addEventListener('devicemotion',onMotion);LS.set('gc.shake',true);return true}
// --- Exécution (sous-ensemble Java → JS dans un Worker, timeout 3 s). Point d'extension : RUNNERS
const RUNNERS={java(src){let s=src.replace(/System\.out\.print(ln)?\s*\(/g,(m,l)=>l?'println(':'print(')
 .replace(/\b(?:public\s+|private\s+)?static\s+[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)/g,(m,n,a)=>'function '+n+'('+a.split(',').map(x=>x.trim().split(/\s+/).pop()).filter(Boolean).join(',')+')')
 .replace(/\b(?:int|long|double|float|boolean|String|char)\s+(?=[A-Za-z_]\w*\s*(?:=|;|,))/g,'let ');
 if(/function main\(/.test(s))s+='\nmain();';return s}};
$('#run').onclick=()=>{const o=$('#out');o.hidden=false;o.textContent='…';let js;
 try{js=RUNNERS.java(ed.value)}catch(e){o.textContent=e;return}
 const code=`let o='';const print=s=>{o+=s},println=s=>{o+=s+'\\n'};try{${js}}catch(e){o+='\\nErreur: '+e.message}postMessage(o)`;
 const w=new Worker(URL.createObjectURL(new Blob([code])));
 const to=setTimeout(()=>{w.terminate();o.textContent='Timeout (boucle infinie ?)'},3000);
 w.onmessage=e=>{clearTimeout(to);o.textContent=e.data||'(aucune sortie)';w.terminate()};
 w.onerror=e=>{clearTimeout(to);o.textContent='Erreur: '+e.message;w.terminate()};
 o.onclick=()=>o.hidden=true};
// --- Feuilles (Gestes / Réglages)
function sheet(title,html){$('#sT').textContent=title;$('#sB').innerHTML=html;$('#sheet').hidden=false}
$('#close').onclick=()=>$('#sheet').hidden=true;
$('#bGest').onclick=()=>sheet('Gestes',`<p>Tape pour insérer sans dessiner.</p>
 <button data-a="for">◯ for</button><button data-a="if">V if</button><button data-a="while">→ while</button><button data-a="else">↓ else</button>
 <button data-a="println">~~ println</button><button data-a="var">• variable</button><button data-a="fn">ƒ fonction</button><button data-a="ret">← return</button>
 <button data-a="comment">↑ commentaire</button><button data-a="delete">✕ suppr. bloc</button>`);
$('#bSet').onclick=()=>{const fl=Object.keys(files);if(!fl.includes(cur))fl.push(cur);
 sheet('Réglages',`<button data-a="new">Nouveau fichier</button><button data-a="save">Sauvegarder</button><button data-a="clear">Effacer</button><button data-a="export">Exporter .java</button>
 <button data-a="shake" style="grid-column:1/-1">Secousse = Undo : ${LS.get('gc.shake',false)?'ON':'OFF'}</button><h4>Fichiers</h4>`+fl.map(f=>`<button data-o="${f}" style="grid-column:1/-1">${f===cur?'● ':''}${f}</button>`).join(''))};
$('#sB').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a,o=b.dataset.o;
 if((a in TPL||a in LINE||a==='delete')){$('#sheet').hidden=true;act(a)}
 else if(a==='new'){const n=prompt('Nom du fichier','prog'+Object.keys(files).length+'.java');if(n){save();cur=n;ed.value='';files[cur]='';H=[snap('Début')];hi=0;refresh();save();$('#sheet').hidden=true}}
 else if(a==='save'){save();toast('Sauvegardé')}
 else if(a==='clear'){if(confirm('Tout effacer ?')){ed.value='';commit('Effacer');$('#sheet').hidden=true}}
 else if(a==='export'){const u=URL.createObjectURL(new Blob([ed.value],{type:'text/plain'})),l=document.createElement('a');l.href=u;l.download=cur;l.click();setTimeout(()=>URL.revokeObjectURL(u),1e3)}
 else if(a==='shake'){const on=!LS.get('gc.shake',false);if(await setShake(on))b.textContent='Secousse = Undo : '+(on?'ON':'OFF')}
 else if(o){save();cur=o;ed.value=files[o]??'';H=[snap('Début')];hi=0;refresh();save();$('#sheet').hidden=true}};
// --- Variable (point) : type, nom libre, valeur prédéfinie ou libre
const VALS={int:['0','1','10','-1'],double:['0.0','1.5'],String:['""','"texte"'],boolean:['true','false'],long:['0L','1L'],char:["'a'"]};
let vs=null;
function freeName(){const c=ed.value;for(const l of 'abcdefghijklmnopqrstuvwxyz')if(!new RegExp('\\b'+l+'\\b').test(c))return l;let i=1;while(new RegExp('\\ba'+i+'\\b').test(c))i++;return'a'+i}
function varSheet(keep){if(!keep)vs={t:'int',n:freeName(),v:'0'};
 sheet('Nouvelle variable','<h4>Type</h4>'+Object.keys(VALS).map(t=>`<button data-t="${t}" class="${vs.t===t?'on':''}">${t}</button>`).join('')
 +`<h4>Nom</h4><input id="vn" value="${vs.n}" autocapitalize="off" autocomplete="off"><h4>Valeur</h4>`
 +VALS[vs.t].map(v=>`<button data-v="${encodeURIComponent(v)}" class="${vs.v===v?'on':''}">${v.replace(/</g,'&lt;')}</button>`).join('')
 +`<input id="vv" placeholder="autre valeur…" value="${VALS[vs.t].includes(vs.v)?'':vs.v.replace(/"/g,'&quot;')}">`
 +`<button data-a="varok" style="grid-column:1/-1;background:#238636">Insérer : ${vs.t} ${vs.n} = ${vs.v.replace(/</g,'&lt;')}</button>`)}
$('#sB').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.a==='var')return varSheet();if(!vs)return;
 const n=$('#vn'),c=$('#vv');if(n&&n.value.trim())vs.n=n.value.trim();if(c&&c.value.trim())vs.v=c.value.trim();
 if(b.dataset.t){vs.t=b.dataset.t;vs.v=VALS[vs.t][0];varSheet(1)}
 else if(b.dataset.v){vs.v=decodeURIComponent(b.dataset.v);varSheet(1)}
 else if(b.dataset.a==='varok'){$('#sheet').hidden=true;put(`${vs.t} ${vs.n} = ${vs.v};`,false);commit('Variable '+vs.n);vs=null}});
// --- Barre de symboles (ne vole pas le focus du clavier)
const KEYS=['()','{}','[]','""',';','=','.',',','+','-','*','/','<','>','!','&&','||','=='],PAIR=['()','{}','[]','""'];
for(const k of KEYS){const b=document.createElement('button');b.textContent=k;$('#keys').append(b)}
$('#keys').addEventListener('pointerdown',e=>e.preventDefault());
$('#keys').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.textContent,p=ed.selectionStart;
 ed.setRangeText(k,p,ed.selectionEnd,'end');if(PAIR.includes(k))ed.setSelectionRange(p+1,p+1);ed.dispatchEvent(new Event('input'))});
$('#undo').onclick=undo;$('#redo').onclick=redo;
if(LS.get('gc.shake',false)&&typeof DeviceMotionEvent?.requestPermission!=='function')setShake(true); // iOS : permission = geste utilisateur requis
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));

'use strict';
const $=s=>document.querySelector(s),ed=$('#ed'),gut=$('#gut'),pad=$('#pad'),ctx=pad.getContext('2d');
const IND='    ';
// --- Modèle de structures : « » marque la sélection après insertion (extensible : nouveaux gestes = nouvelle entrée)
const TPL={for:'for (int i = 0; i < «10»; i++) {',if:'if («condition») {',while:'while («condition») {',else:'else {',elseif:'else if («condition») {',dowhile:'do {',switch:'switch («x») {',try:'try {',catch:'catch (Exception «e») {',fn:'static void «maFonction»() {'};
const TAIL={dowhile:'} while («condition»);'},FUSE=['else','elseif','catch'];
const LINE={println:'System.out.println(«"texte"»);',ret:'return «0»;',comment:'// «commentaire»',break:'break;',continue:'continue;',case:'case «1»:'};
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
// --- Coloration, haptique, calibrage (paramètres des seuils)
const RE=/(\/\/.*)|("(?:[^"\\\n]|\\.)*"?)|\b(if|else|for|while|do|switch|case|break|continue|return|static|void|new|try|catch|class|public|private|final|import)\b|\b(int|long|double|float|boolean|char|String|Scanner|Exception)\b|\b(\d+(?:\.\d+)?L?)\b/g;
function hl(t){let o='',i=0,m;const e=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;');RE.lastIndex=0;
 while(m=RE.exec(t)){o+=e(t.slice(i,m.index));o+=`<span class="${m[1]?'c':m[2]?'s':m[3]?'k':m[4]?'t':'n'}">${e(m[0])}</span>`;i=RE.lastIndex}return o+e(t.slice(i))+'\n'}
const OK=20,FAIL=[20,70,20];
function haptic(p=15){if(navigator.vibrate){navigator.vibrate(p);return}
 const c=()=>{try{$('#hapl').click()}catch{}};c();if(Array.isArray(p))setTimeout(c,p[0]+p[1])}   // iOS 17.4+ : interrupteur natif
document.addEventListener('pointerdown',e=>{if(e.target.closest('button'))haptic(8)});
const DP={turn:3.8,amp:24,st:.85,v:.4},HINT=$('#hint').textContent,CALK=['for','if','while','else','println','fn','delete'];
let P=LS.get('gc.P',DP),cal=null,psel=null;
let LK=LS.get('gc.look',{c:'#C6F135',by:false,h:1,red:matchMedia('(prefers-reduced-motion:reduce)').matches});const saveLK=()=>LS.set('gc.look',LK);
function calHint(){$('#hint').textContent=cal?`Calibrage : dessine « ${CALK[cal.i]} » (${cal.n+1}/3)`:HINT}
function startCal(){cal={i:0,n:0,s:[]};$('#sheet').hidden=true;calHint()}
function finishCal(){const S=cal.s,ok=Q=>S.filter(x=>classify(x.p,Q)===x.k).length,base=ok(P);let best=P,bs=base;
 for(const turn of[3,3.4,3.8,4.4])for(const amp of[16,24,32])for(const st of[.75,.85,.92])for(const v of[.3,.4,.5]){const Q={turn,amp,st,v},n=ok(Q);if(n>bs){bs=n;best=Q}}
 P=best;LS.set('gc.P',P);cal=null;calHint();toast(`Calibré : ${base}→${bs}/${S.length} reconnus`)}
let files=LS.get('gc.files',{}),cur=LS.get('gc.cur','main.java');
ed.value=files[cur]??'int x = 10;\n\n';
// --- Toast / UI
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1200)}
function refresh(){$('#hl').innerHTML=hl(ed.value);const n=ed.value.split('\n').length;gut.textContent=Array.from({length:n},(_,i)=>i+1).join('\n');gut.scrollTop=ed.scrollTop}
function save(){files[cur]=ed.value;LS.set('gc.files',files);LS.set('gc.cur',cur)}
// --- Historique
let H=[],hi=-1,pending=false,tmr;
const snap=l=>({t:ed.value,s:ed.selectionStart,e:ed.selectionEnd,l});
function commit(l){clearTimeout(tmr);pending=false;if(H[hi]&&H[hi].t===ed.value)return;H=H.slice(0,hi+1);H.push(snap(l));if(H.length>200)H.shift();hi=H.length-1;refresh();save()}
function restore(x){psel=null;showSel();ed.value=x.t;ed.setSelectionRange(x.s,x.e);refresh();save()}
function undo(){if(pending)commit('Modification');if(hi<=0)return toast('Rien à annuler');const l=H[hi].l;restore(H[--hi]);toast('Annulé : '+l)}
function redo(){if(hi>=H.length-1)return toast('Rien à rétablir');restore(H[++hi]);toast('Rétabli : '+H[hi].l)}
H=[snap('Début')];hi=0;refresh();
ed.addEventListener('input',()=>{pending=true;psel=null;showSel();refresh();clearTimeout(tmr);tmr=setTimeout(()=>commit('Modification'),700)});
ed.addEventListener('scroll',()=>{$('#selv').scrollTop=ed.scrollTop;$('#selv').scrollLeft=ed.scrollLeft;gut.scrollTop=ed.scrollTop;$('#hl').scrollTop=ed.scrollTop;$('#hl').scrollLeft=ed.scrollLeft});
ed.addEventListener('beforeinput',e=>{if(e.inputType!=='insertLineBreak')return;e.preventDefault();
 const v=ed.value,p=ed.selectionStart,ls=v.lastIndexOf('\n',p-1)+1,line=v.slice(ls,p);
 const ind=line.match(/^\s*/)[0]+(line.trimEnd().endsWith('{')?IND:'');ed.setRangeText('\n'+ind,p,ed.selectionEnd,'end');ed.dispatchEvent(new Event('input'))});
// --- Insertion structurée (put = bloc ou ligne simple)
function put(text,block,kind){
 const v=ed.value,p=ed.selectionStart,ls=v.lastIndexOf('\n',p-1)+1;let le=v.indexOf('\n',p);if(le<0)le=v.length;
 const line=v.slice(ls,le),ws=line.match(/^\s*/)[0];let before,after,ind,head=text;
 if(!line.trim()){before=v.slice(0,ls);after=v.slice(le);ind=ws;
  if(FUSE.includes(kind)&&ls>0){const ps=v.lastIndexOf('\n',ls-2)+1,pl=v.slice(ps,ls-1);if(pl.trim()==='}'){before=v.slice(0,ps);ind=pl.match(/^\s*/)[0];head='} '+text}}}
 else if(FUSE.includes(kind)&&line.trim()==='}'){before=v.slice(0,ls);after=v.slice(le);ind=ws;head='} '+text}
 else{before=v.slice(0,le)+'\n';after=v.slice(le);ind=ws+(line.trimEnd().endsWith('{')?IND:'')}
 head=ind+head.replace(/\n/g,'\n'+ind);const body=ind+IND;
 let txt=block?head+'\n'+body+'\n'+ind+(TAIL[kind]||'}'):head;
 let a=txt.indexOf('«');txt=txt.replace('«','');let b=a>=0?txt.indexOf('»'):-1;txt=txt.replace('»','');
 if(a<0)a=b=block?head.length+1+body.length:head.length;
 ed.value=before+txt+after;const sa=before.length+a,sb=before.length+b;ed.setSelectionRange(sa,sb);
 psel=document.activeElement===ed?null:[sa,sb];showSel();
 const top=(ed.value.slice(0,sa).split('\n').length-1)*21.7;if(top<ed.scrollTop||top>ed.scrollTop+ed.clientHeight-60)ed.scrollTop=Math.max(0,top-ed.clientHeight/3);
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
function classify(raw,Q=P){
 const p=[raw[0]];for(const q of raw){const l=p[p.length-1];if(Math.hypot(q.x-l.x,q.y-l.y)>=10)p.push(q)}
 if(p.length<4)return null;let len=0;const seg=[];
 for(let i=1;i<p.length;i++){const dx=p[i].x-p[i-1].x,dy=p[i].y-p[i-1].y;len+=Math.hypot(dx,dy);seg.push(Math.atan2(dy,dx))}
 if(len<80)return null;let turn=0;
 for(let i=1;i<seg.length;i++){let d=seg[i]-seg[i-1];while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;turn+=d}
 const f=p[0],l=p[p.length-1],dx=l.x-f.x,dy=l.y-f.y,ys=p.map(q=>q.y),xs=p.map(q=>q.x);
 const w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
 const revs=a=>{let r=0,d=0,ref=a[0];for(const x of a){const e=x-ref;if(d<=0&&e>Q.amp){if(d<0)r++;d=1;ref=x}else if(d>=0&&e<-Q.amp){if(d>0)r++;d=-1;ref=x}else if((d>0&&x>ref)||(d<0&&x<ref))ref=x}return r};
 const o=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),X=(a,b,c,d)=>o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;
 let cr=0;for(let i=0;i<p.length-1;i++)for(let j=i+3;j<p.length-1;j++)if(X(p[i],p[i+1],p[j],p[j+1]))cr++;
 const rx=revs(xs),ry=revs(ys);
 if(cr>=2&&h>=1.2*w&&rx<=2)return'fn';            // f cursif : 2 boucles (haut et bas)
 if(Math.abs(turn)>Q.turn)return'for';
 if(ry>=3&&rx<3&&w>h)return'println';              // zigzag horizontal
 if(rx>=3)return'delete';                           // zigzag vertical / gribouillis
 if(Math.hypot(dx,dy)/len>Q.st){
  if(Math.abs(dx)>2*Math.abs(dy))return dx>0?'while':'ret';
  if(Math.abs(dy)>2*Math.abs(dx))return dy>0?'else':'comment';return null}
 const k=ys.indexOf(Math.max(...ys)),yk=ys[k];
 if(h>50&&w>40&&k>=p.length*.25&&k<=p.length*.75&&yk-f.y>Q.v*h&&yk-l.y>Q.v*h)return'if';
 return null;
}
// --- Gestes tactiles + trait néon (canvas, actif seulement pendant le tracé et le fondu)
const GC={for:'#C6F135',if:'#22E4FF',while:'#FF9F43',else:'#B48CFF',println:'#FF3DA5',fn:'#5EEAD4',delete:'#FF5A5A'};
const GN={for:'for',if:'if',while:'while',else:'else',println:'println',fn:'fonction',delete:'supprimer'};
let pts=null,t0=0,trail=[],fade=0,col=LK.c,raf=0,lastCl=0;
function fit(){const d=devicePixelRatio||1,r=pad.getBoundingClientRect();pad.width=Math.round(r.width*d);pad.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.lineCap=ctx.lineJoin='round'}
addEventListener('resize',fit);new ResizeObserver(fit).observe(pad);fit();
const xy=e=>{const r=pad.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
function chip(k,raw){const c=$('#chip');if(!k){c.classList.remove('on');return}c.textContent=raw?k:GN[k];c.style.color=c.style.borderColor=col;c.style.background=col+'22';c.classList.add('on')}
function paint(){
 ctx.clearRect(0,0,pad.clientWidth,pad.clientHeight);let k=1;
 if(!pts){k=1-(performance.now()-fade)/450;if(k<=0){trail=[];raf=0;return}}
 const n=trail.length,d=devicePixelRatio||1,g=LK.red?0:[10,22,36][LK.h]*d;
 if(n){ctx.beginPath();ctx.moveTo(trail[0].x,trail[0].y);if(n===1)ctx.lineTo(trail[0].x+.1,trail[0].y);
  for(let i=1;i<n-1;i++)ctx.quadraticCurveTo(trail[i].x,trail[i].y,(trail[i].x+trail[i+1].x)/2,(trail[i].y+trail[i+1].y)/2);
  if(n>1)ctx.lineTo(trail[n-1].x,trail[n-1].y);
  ctx.globalAlpha=k;ctx.shadowColor=col;
  for(const[w,c,b]of LK.red?[[4,col,0]]:[[12,col,g],[6,'rgba(255,255,255,.4)',0],[2.6,'#fff',0]]){ctx.lineWidth=w;ctx.strokeStyle=c;ctx.shadowBlur=b;ctx.stroke()}
  if(pts&&!LK.red){const h=trail[n-1];ctx.shadowBlur=g;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h.x,h.y,6,0,7);ctx.fill()}
  ctx.shadowBlur=0}
 ctx.globalAlpha=1;raf=requestAnimationFrame(paint)}
pad.addEventListener('pointerdown',e=>{pts=[xy(e)];trail=[pts[0]];col=LK.c;t0=Date.now();chip(null);pad.setPointerCapture(e.pointerId);cancelAnimationFrame(raf);raf=requestAnimationFrame(paint)});
pad.addEventListener('pointermove',e=>{if(!pts)return;
 for(const ev of(e.getCoalescedEvents?.()||[e])){const q=xy(ev),l=trail[trail.length-1];pts.push(q);if(Math.hypot(q.x-l.x,q.y-l.y)>3)trail.push(q)}
 const now=performance.now();
 if(now-lastCl>120&&pts.length>8){lastCl=now;const k=classify(pts);col=LK.by&&k?GC[k]:LK.c;chip(k)}});
pad.addEventListener('pointercancel',()=>{pts=null;trail=[];chip(null)});
pad.addEventListener('pointerup',()=>{if(!pts)return;const p=pts;pts=null;fade=performance.now();
 const dt=Date.now()-t0,far=Math.max(...p.map(q=>Math.hypot(q.x-p[0].x,q.y-p[0].y)));
 if(cal){if(far<14||dt<80)return;cal.s.push({k:CALK[cal.i],p});haptic(10);if(++cal.n==3){cal.i++;cal.n=0}cal.i>=CALK.length?finishCal():calHint();return}
 if(far<14){trail=[];if(dt<400){haptic(OK);varSheet()}return}   // point = variable
 if(dt<80){trail=[];return}
 const k=classify(p);
 if(!k){col='#FF5A5A';chip('non reconnu',1);haptic(FAIL);setTimeout(()=>chip(null),700);return}   // double vibration
 col=LK.by?GC[k]:LK.c;chip(k);haptic(OK);setTimeout(()=>chip(null),450);act(k)});           // vibration simple
// --- Shake = Undo
let last=0,prev=null;
function onMotion(e){const a=e.accelerationIncludingGravity;if(!a)return;const m=Math.hypot(a.x||0,a.y||0,a.z||0),d=prev==null?0:Math.abs(m-prev);prev=m;const n=Date.now();
 if(d>14&&n-last>1200){last=n;undo();haptic(30)}}
async function setShake(on){
 if(!on){removeEventListener('devicemotion',onMotion);LS.set('gc.shake',false);return true}
 if(typeof DeviceMotionEvent==='undefined'){toast('Secousse non supportée : utilise ↶');return false}
 try{if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted'){toast('Permission refusée');return false}}catch{toast('Permission indisponible');return false}
 addEventListener('devicemotion',onMotion);LS.set('gc.shake',true);return true}
// --- Exécution (sous-ensemble Java → JS dans un Worker, timeout 3 s). Point d'extension : RUNNERS
// --- Java (sous-ensemble) → JS async : classes, static, Scanner, division entière simple (a / b)
function toJS(src){
 let s=src.replace(/^\s*import\s[^;]+;/gm,'');
 const m=/(?:public\s+)?(?:final\s+)?class\s+\w+\s*\{/.exec(s);
 if(m){let d=1,i=m.index+m[0].length;for(;i<s.length&&d;i++){if(s[i]==='{')d++;else if(s[i]==='}')d--}s=s.slice(0,m.index)+s.slice(m.index+m[0].length,i-1)+s.slice(i)}
 const ints=new Set(),fns=[];
 s=s.replace(/\b(?:public\s+|private\s+)?static\s+[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)/g,(x,n,a)=>{fns.push(n);return'async function '+n+'('+a.split(',').map(z=>{z=z.trim().split(/\s+/);if(/^(int|long)$/.test(z[0])&&z[1])ints.add(z[1]);return z.pop()}).filter(Boolean).join(',')+')'});
 for(const r of s.matchAll(/\b(?:int|long)\s+(\w+)/g))ints.add(r[1]);
 s=s.replace(/System\.out\.print(ln)?\s*\(/g,(x,l)=>l?'println(':'print(')
  .replace(/\bScanner\s+(\w+)\s*=\s*new\s+Scanner\s*\(\s*System\.in\s*\)/g,'let $1=new Sc()')
  .replace(/\b(\w+)\.(nextInt|nextLong|nextDouble|nextBoolean|nextLine|next)\(\)/g,'(await $1.$2())')
  .replace(/\b(?:static|final)\s+/g,'')
  .replace(/\b(?:int|long|double|float|boolean|String|char)\s+(?=[A-Za-z_]\w*\s*(?:=|;|,))/g,'let ')
  .replace(/(?<![\w.])([A-Za-z_]\w*|\d+)\s*\/\s*([A-Za-z_]\w*|\d+)(?![\w.(])/g,(x,a,b)=>{const I=t=>/^\d+$/.test(t)||ints.has(t);return I(a)&&I(b)?`Math.trunc(${a}/${b})`:x});
 for(const n of fns)s=s.replace(new RegExp('(?<!function )\\b'+n+'\\s*\\(','g'),'await '+n+'(');
 if(fns.includes('main'))s+='\nawait main();';return s
}
const RUNNERS={java:toJS};
let send=null;
$('#run').onclick=()=>{const o=$('#out'),ot=$('#ot'),ir=$('#inrow');o.hidden=false;ot.textContent='';ir.hidden=true;let js;
 try{js=RUNNERS.java(ed.value)}catch(e){ot.textContent=e;return}
 const code=`let res;onmessage=e=>res&&res(e.data);const read=()=>new Promise(r=>{res=r;postMessage({ask:1})});
const print=s=>postMessage({o:String(s)}),println=(s='')=>postMessage({o:s+'\\n'});
class Sc{constructor(){this.t=[]}async nextLine(){if(this.t.length){const r=this.t.join(' ');this.t=[];return r}return await read()}
async next(){while(!this.t.length)this.t=(await read()).split(/\\s+/).filter(Boolean);return this.t.shift()}
async nextInt(){return parseInt(await this.next())}async nextLong(){return parseInt(await this.next())}async nextDouble(){return parseFloat(await this.next())}async nextBoolean(){return (await this.next())==='true'}}
(async()=>{try{${js}}catch(e){postMessage({o:'\\nErreur: '+e.message})}postMessage({done:1})})()`;
 const w=new Worker(URL.createObjectURL(new Blob([code]))),add=t=>ot.textContent+=t;let to;
 const arm=()=>{clearTimeout(to);to=setTimeout(()=>{w.terminate();add('\nTimeout (boucle infinie ?)');ir.hidden=true},5000)};arm();
 w.onmessage=e=>{const d=e.data;if(d.o!=null)add(d.o);if(d.ask){clearTimeout(to);ir.hidden=false;$('#cin').value='';$('#cin').focus()}if(d.done){clearTimeout(to);add('\n— fin —');w.terminate()}};
 w.onerror=e=>{clearTimeout(to);add('\nErreur: '+e.message);w.terminate()};
 send=()=>{const v=$('#cin').value;add(v+'\n');ir.hidden=true;w.postMessage(v);arm()};
 $('#oc').onclick=()=>{w.terminate();clearTimeout(to);o.hidden=true}};
$('#cgo').onclick=()=>send&&send();$('#cin').addEventListener('keydown',e=>{if(e.key==='Enter')send&&send()});
// --- Feuilles (Gestes / Réglages)
function sheet(title,html){$('#sT').textContent=title;$('#sB').innerHTML=html;$('#sheet').hidden=false}
$('#close').onclick=()=>$('#sheet').hidden=true;
$('#bGest').onclick=()=>sheet('Gestes',`<p>Tape pour insérer sans dessiner.</p>
 <button data-a="for">◯ for</button><button data-a="if">V if</button><button data-a="while">→ while</button><button data-a="else">↓ else</button>
 <button data-a="println">~~ println</button><button data-a="var">• variable</button><button data-a="fn">ƒ fonction</button><button data-a="ret">← return</button>
 <button data-a="comment">↑ commentaire</button><button data-a="delete">✕ suppr. bloc</button>
 <h4>Structures (boutons)</h4><button data-a="elseif">else if</button><button data-a="dowhile">do … while</button><button data-a="switch">switch</button><button data-a="case">case</button>
 <button data-a="try">try</button><button data-a="catch">catch</button><button data-a="break">break</button><button data-a="continue">continue</button>`);
const openSet=()=>{const fl=Object.keys(files);if(!fl.includes(cur))fl.push(cur);
 sheet('Réglages',`<button data-a="new">Nouveau fichier</button><button data-a="save">Sauvegarder</button><button data-a="clear">Effacer</button><button data-a="export">Exporter .java</button><button data-a="cal">Calibrer les gestes</button><button data-a="calreset">Reset calibrage</button>
 <button data-a="shake" style="grid-column:1/-1">Secousse = Undo : ${LS.get('gc.shake',false)?'ON':'OFF'}</button>${lookHTML()}<h4>Fichiers</h4>`+fl.map(f=>`<button data-o="${f}" style="grid-column:1/-1">${f===cur?'● ':''}${f}</button>`).join(''))};
$('#sB').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a,o=b.dataset.o;
 if((a in TPL||a in LINE||a==='delete')){$('#sheet').hidden=true;act(a)}
 else if(a==='new'){const n=prompt('Nom du fichier','prog'+Object.keys(files).length+'.java');if(n){save();cur=n;ed.value='';files[cur]='';H=[snap('Début')];hi=0;refresh();save();$('#sheet').hidden=true}}
 else if(a==='save'){save();toast('Sauvegardé')}
 else if(a==='clear'){if(confirm('Tout effacer ?')){ed.value='';commit('Effacer');$('#sheet').hidden=true}}
 else if(a==='export'){const u=URL.createObjectURL(new Blob([ed.value],{type:'text/plain'})),l=document.createElement('a');l.href=u;l.download=cur;l.click();setTimeout(()=>URL.revokeObjectURL(u),1e3)}
 else if(a==='shake'){const on=!LS.get('gc.shake',false);if(await setShake(on))b.textContent='Secousse = Undo : '+(on?'ON':'OFF')}
 else if(o){save();cur=o;ed.value=files[o]??'';H=[snap('Début')];hi=0;refresh();save();$('#sheet').hidden=true}};
// --- Variable (point) : type, nom libre, valeur ou Scanner ; ou modification d'une variable existante
const VALS={int:['0','1','10','-1'],double:['0.0','1.5'],String:['""','"texte"'],boolean:['true','false'],long:['0L','1L'],char:["'a'"]};
const SCAN={int:'sc.nextInt()',long:'sc.nextLong()',double:'sc.nextDouble()',boolean:'sc.nextBoolean()',String:'sc.nextLine()',char:'sc.next().charAt(0)'};
const OPS=['++','--','+=','-=','*=','/=','='];let vs=null;
const esc=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function declared(){const r=new Set();for(const m of ed.value.matchAll(/\b(?:int|long|double|boolean|String|char)\s+([A-Za-z_]\w*)\s*[=;,]/g))r.add(m[1]);return[...r]}
function freeName(){const c=ed.value;for(const l of 'abcdefghijklmnopqrstuvwxyz')if(!new RegExp('\\b'+l+'\\b').test(c))return l;let i=1;while(new RegExp('\\ba'+i+'\\b').test(c))i++;return'a'+i}
function varSheet(keep){if(!keep)vs={t:'int',n:freeName(),v:'0',sc:false,m:null};
 const val=vs.sc?SCAN[vs.t]:vs.v,dv=declared();
 sheet('Variable','<h4>Type</h4>'+Object.keys(VALS).map(t=>`<button data-t="${t}" class="${vs.t===t?'on':''}">${t}</button>`).join('')
 +`<h4>Nom</h4><input id="vn" value="${esc(vs.n)}" autocapitalize="off" autocomplete="off">`
 +(vs.sc?'':'<h4>Valeur</h4>'+VALS[vs.t].map(v=>`<button data-v="${encodeURIComponent(v)}" class="${vs.v===v?'on':''}">${esc(v)}</button>`).join('')
  +`<input id="vv" placeholder="autre valeur…" value="${VALS[vs.t].includes(vs.v)?'':esc(vs.v)}">`)
 +`<button data-a="sc" class="${vs.sc?'on':''}" style="grid-column:1/-1">⌨ Saisie clavier (Scanner) : ${vs.sc?'ON':'OFF'}</button>`
 +`<button data-a="varok" style="grid-column:1/-1;background:#238636">Insérer : ${esc(vs.t+' '+vs.n+' = '+val)}</button>`
 +(dv.length?'<h4>Ou modifier une variable existante</h4>'+dv.map(n=>`<button data-m="${n}" class="${vs.m===n?'on':''}">${n}</button>`).join('')
  +(vs.m?OPS.map(o=>`<button data-op="${o}">${vs.m} ${o}</button>`).join(''):''):''))}
$('#sB').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.c){LK.c=d.c;LK.by=false;saveLK();return openSet()}
 if(d.a==='by'){LK.by=!LK.by;saveLK();return openSet()}
 if(d.a==='halo'){LK.h=(LK.h+1)%3;saveLK();return openSet()}
 if(d.a==='red'){LK.red=!LK.red;saveLK();return openSet()}
 if(d.a==='var')return varSheet();
 if(d.a==='cal')return startCal();
 if(d.a==='calreset'){P=DP;LS.set('gc.P',P);return toast('Calibrage réinitialisé')}
 if(!vs)return;
 const n=$('#vn'),c=$('#vv');if(n&&n.value.trim())vs.n=n.value.trim();if(c&&c.value.trim())vs.v=c.value.trim();
 if(d.t){vs.t=d.t;vs.v=VALS[vs.t][0];varSheet(1)}
 else if(d.v){vs.v=decodeURIComponent(d.v);varSheet(1)}
 else if(d.a==='sc'){vs.sc=!vs.sc;varSheet(1)}
 else if(d.m){vs.m=d.m;varSheet(1)}
 else if(d.op){$('#sheet').hidden=true;put(d.op==='++'||d.op==='--'?`${vs.m}${d.op};`:`${vs.m} ${d.op} «1»;`,false);commit('Modification de '+vs.m);vs=null}
 else if(d.a==='varok'){$('#sheet').hidden=true;const need=vs.sc&&!/\bScanner\s+sc\b/.test(ed.value);
  put((need?'Scanner sc = new Scanner(System.in);\n':'')+`${vs.t} ${vs.n} = ${vs.sc?SCAN[vs.t]:vs.v};`,false);commit('Variable '+vs.n);vs=null}});
// --- Barre de symboles (ne vole pas le focus du clavier)
const KEYS=['⌄','()','{}','[]','""',';','=','.',',','+','-','*','/','<','>','!','&&','||','=='],PAIR=['()','{}','[]','""'];
for(const k of KEYS){const b=document.createElement('button');b.textContent=k;$('#keys').append(b)}
$('#keys').addEventListener('pointerdown',e=>e.preventDefault());
$('#keys').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.textContent,p=ed.selectionStart;if(k==='⌄'){ed.blur();return}
 ed.setRangeText(k,p,ed.selectionEnd,'end');if(PAIR.includes(k))ed.setSelectionRange(p+1,p+1);ed.dispatchEvent(new Event('input'))});
$('#bSet').onclick=openSet;
function lookHTML(){return'<h4>Apparence du trait</h4>'+[['#C6F135','lime'],['#22E4FF','cyan'],['#FF3DA5','magenta']].map(([c,n])=>`<button data-c="${c}" style="color:${c}" class="${!LK.by&&LK.c===c?'on':''}">${n}</button>`).join('')
 +`<label style="grid-column:1/-1;display:flex;align-items:center;gap:10px;color:var(--m)">Couleur libre<input type="color" id="ccol" value="${LK.c}" style="flex:1;min-height:44px;padding:2px"></label>`
 +`<button data-a="by" class="${LK.by?'on':''}">Couleur par geste : ${LK.by?'ON':'OFF'}</button><button data-a="halo">Halo : ${['sobre','normal','néon'][LK.h]}</button>`
 +`<button data-a="red" class="${LK.red?'on':''}" style="grid-column:1/-1">Effets réduits : ${LK.red?'ON':'OFF'}</button>`}
$('#sB').addEventListener('input',e=>{if(e.target.id==='ccol'){LK.c=e.target.value;LK.by=false;saveLK()}});
function showSel(){const e=$('#selv');if(!psel){e.innerHTML='';return}const v=ed.value,[a,b]=psel,x=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
 e.innerHTML=x(v.slice(0,a))+(a===b?'<i class="cr"></i>':'<mark>'+x(v.slice(a,b))+'</mark>')+x(v.slice(b))+'\n';e.scrollTop=ed.scrollTop}
ed.addEventListener('focus',()=>{if(!psel)return;const[a,b]=psel;psel=null;showSel();const f=()=>ed.setSelectionRange(a,b);setTimeout(f,0);setTimeout(f,60);setTimeout(f,200)});   // 1er tap = reprend la sélection laissée par le geste
$('#undo').onclick=undo;$('#redo').onclick=redo;
if(LS.get('gc.shake',false)&&typeof DeviceMotionEvent?.requestPermission!=='function')setShake(true); // iOS : permission = geste utilisateur requis
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));

const $=s=>document.querySelector(s),cv=$('#c'),ed=$('#ed');
let cx=cv.getContext('2d'),items=[],sel=new Set,V={x:0,y:0,z:1},tool='select',color='#fde68a',picked=false,snap=false,undo=[],redo=[],clip='',uid=1,css={},dpr=1,W=0,H=0,drag=null,space=false,edIt=null,hov=null,calOn=false,CAL={ax:1,bx:0,ay:1,by:0},name='Untitled board',grid='dots',gs=20;
const INK='#1b2130',PAL=['#fde68a','#fca5a5','#fdba74','#86efac','#93c5fd','#c4b5fd','#f9a8d4','#e5e7eb',INK];
const TOOLS=[['select','↖','Select (V)'],['hand','✋','Pan (H / hold Space)'],['sticky','🗒','Sticky note (N)'],['rect','▭','Rectangle (R)'],['ellipse','◯','Ellipse (O)'],['diamond','◇','Diamond (D)'],['text','T','Text (T)'],['pen','✎','Pen (P)'],['arrow','➚','Connector (A)'],['eraser','⌫','Precise eraser (E) – cuts pen strokes, removes what it touches'],['aoe','◎','Area eraser (Shift+E) – removes everything inside the circle']];
const ER={eraser:7,aoe:38};
const KEY={v:'select',h:'hand',n:'sticky',r:'rect',o:'ellipse',d:'diamond',t:'text',p:'pen',a:'arrow',e:'eraser'};
const dk=i=>i.c===INK, col=i=>i.c===INK?css.ink:i.c, ctr=s=>[s.x+s.w/2,s.y+s.h/2], byId=id=>id?items.find(i=>i.id===id):0;
const pos=e=>{const r=cv.getBoundingClientRect();return[CAL.ax*e.clientX+CAL.bx-r.left,CAL.ay*e.clientY+CAL.by-r.top]},s2w=(x,y)=>[(x-V.x)/V.z,(y-V.y)/V.z], isShape=i=>i.type!=='pen'&&i.type!=='arrow';
function toast(t){const e=$('#toast');e.textContent=t;e.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity=0,1800)}
function refreshCss(){const s=getComputedStyle(document.documentElement),g=n=>s.getPropertyValue(n).trim();css={bg:g('--bg'),grid:g('--grid'),ink:g('--ink'),acc:g('--acc'),ln:g('--ln')}}
function save(){try{localStorage.setItem('boardly',JSON.stringify({items,V,uid,name,grid,gs}))}catch(e){}}
function commit(){undo.push(JSON.stringify(items));if(undo.length>100)undo.shift();redo=[];save();draw()}
function doUndo(){if(undo.length>1){redo.push(undo.pop());items=JSON.parse(undo[undo.length-1]);sel=new Set;save();draw()}}
function doRedo(){if(redo.length){const s=redo.pop();undo.push(s);items=JSON.parse(s);sel=new Set;save();draw()}}
function mk(type,x=0,y=0,w=0,h=0){const it={id:uid++,type,x,y,w,h,c:(['pen','arrow','text'].includes(type)&&!picked)?INK:color,t:''};return it}
function add(type,x,y,w,h,t,c){const it=mk(type,x,y,w,h);it.t=t||'';if(c)it.c=c;items.push(it);return it}
function ends(it){let a=it.a.slice(),b=it.b.slice();const f=byId(it.f),t=byId(it.t);if(f)a=edge(f,t?ctr(t):b);if(t)b=edge(t,f?ctr(f):a);it.a=a;it.b=b;return[a,b]}
function edge(s,p){const c=ctr(s),dx=p[0]-c[0],dy=p[1]-c[1];if(!dx&&!dy)return c;const k=Math.min(s.w/2/Math.abs(dx||1e-9),s.h/2/Math.abs(dy||1e-9));return[c[0]+dx*k,c[1]+dy*k]}
function bounds(it){if(it.type==='pen'){const xs=it.p.map(q=>q[0]),ys=it.p.map(q=>q[1]),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}}
 if(it.type==='arrow'){const[a,b]=ends(it);return{x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),w:Math.abs(a[0]-b[0]),h:Math.abs(a[1]-b[1])}}return{x:it.x,y:it.y,w:it.w,h:it.h}}
function dseg(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;let t=l?((x-a[0])*dx+(y-a[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
function hit(x,y){const t=8/V.z;for(let i=items.length-1;i>=0;i--){const it=items[i];if(it.type==='pen'){if(it.p.some((q,j)=>j&&dseg(x,y,it.p[j-1],q)<t))return it}else if(it.type==='arrow'){const[a,b]=ends(it);if(dseg(x,y,a,b)<t)return it}else if(x>=it.x&&x<=it.x+it.w&&y>=it.y&&y<=it.y+it.h)return it}}
function shapeAt(p){for(let i=items.length-1;i>=0;i--){const it=items[i];if(isShape(it)&&p[0]>=it.x&&p[0]<=it.x+it.w&&p[1]>=it.y&&p[1]<=it.y+it.h)return it}}
function wrap(t,w){const out=[];t.split('\n').forEach(par=>{let l='';par.split(' ').forEach(wd=>{const n=l?l+' '+wd:wd;if(cx.measureText(n).width>w&&l){out.push(l);l=wd}else l=n});out.push(l)});return out}
const fsOf=it=>it.fs||(it.type==='sticky'?18:it.type==='text'?22:16);
function fit(it){cx.font=fsOf(it)+'px Inter,system-ui,sans-serif';it.h=Math.max(30,wrap(it.t,it.w).length*fsOf(it)*1.35+4)}
function drawItem(it){const T=it.type,k=col(it);cx.save();
 if(T==='pen'){cx.strokeStyle=k;cx.lineWidth=it.lw||3;cx.lineCap=cx.lineJoin='round';cx.beginPath();it.p.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1]));cx.stroke()}
 else if(T==='arrow'){const[a,b]=ends(it),an=Math.atan2(b[1]-a[1],b[0]-a[0]),P=Math.PI;cx.strokeStyle=cx.fillStyle=k;cx.lineWidth=2.5;cx.lineCap='round';cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.stroke();cx.beginPath();cx.moveTo(b[0],b[1]);cx.lineTo(b[0]+14*Math.cos(an+P-.4),b[1]+14*Math.sin(an+P-.4));cx.lineTo(b[0]+14*Math.cos(an+P+.4),b[1]+14*Math.sin(an+P+.4));cx.fill()}
 else{const{x,y,w,h}=it;
  if(T==='sticky'){cx.shadowColor='rgba(0,0,0,.25)';cx.shadowBlur=14;cx.shadowOffsetY=5}
  if(T!=='text'){cx.fillStyle=it.c;cx.strokeStyle=css.ln;cx.lineWidth=1.5;cx.beginPath();
   if(T==='ellipse')cx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,7);
   else if(T==='diamond'){cx.moveTo(x+w/2,y);cx.lineTo(x+w,y+h/2);cx.lineTo(x+w/2,y+h);cx.lineTo(x,y+h/2);cx.closePath()}
   else cx.roundRect(x,y,w,h,T==='sticky'?4:8);
   cx.fill();cx.shadowColor='transparent';if(T!=='sticky')cx.stroke()}
  if(it!==edIt&&it.t){const fs=fsOf(it),left=T==='sticky'||T==='text',pad=T==='text'?0:T==='sticky'?12:T==='rect'?10:w*.18,lh=fs*1.35;
   cx.font=fs+'px Inter,system-ui,sans-serif';cx.fillStyle=T==='text'?k:dk(it)?'#fff':INK;cx.textBaseline='top';cx.textAlign=left?'left':'center';
   const L=wrap(it.t,w-2*pad),y0=left?y+pad:y+(h-L.length*lh)/2;L.forEach((s,i)=>cx.fillText(s,left?x+pad:x+w/2,y0+i*lh))}
  if(it.v){cx.fillStyle=css.acc;cx.beginPath();cx.arc(x+w-6,y+6,13,0,7);cx.fill();cx.fillStyle='#fff';cx.font='bold 13px Inter,system-ui,sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('+'+it.v,x+w-6,y+7)}}
 cx.restore()}
function draw(){cx.setTransform(dpr,0,0,dpr,0,0);cx.fillStyle=css.bg;cx.fillRect(0,0,W,H);
 if(grid!=='off'){let g=gs*V.z;while(g<14)g*=2;cx.fillStyle=cx.strokeStyle=css.grid;cx.lineWidth=1;const ox=((V.x%g)+g)%g,oy=((V.y%g)+g)%g;
 if(grid==='dots'){for(let x=ox;x<W;x+=g)for(let y=oy;y<H;y+=g)cx.fillRect(x-1,y-1,2,2)}
 else{cx.beginPath();for(let x=ox;x<W;x+=g){cx.moveTo(x+.5,0);cx.lineTo(x+.5,H)}for(let y=oy;y<H;y+=g){cx.moveTo(0,y+.5);cx.lineTo(W,y+.5)}cx.stroke()}}
 cx.setTransform(dpr*V.z,0,0,dpr*V.z,dpr*V.x,dpr*V.y);items.forEach(drawItem);
 cx.strokeStyle=css.acc;cx.fillStyle=css.acc;cx.lineWidth=1.5/V.z;cx.setLineDash([6/V.z,4/V.z]);
 sel.forEach(i=>{const b=bounds(i);cx.strokeRect(b.x-4,b.y-4,b.w+8,b.h+8)});cx.setLineDash([]);
 if(sel.size===1){const i=[...sel][0];if(isShape(i)){const s=9/V.z;cx.fillRect(i.x+i.w-s/2,i.y+i.h-s/2,s,s)}}
 if(drag&&drag.k==='box'){cx.globalAlpha=.12;cx.fillRect(Math.min(drag.sx,drag.x),Math.min(drag.sy,drag.y),Math.abs(drag.x-drag.sx),Math.abs(drag.y-drag.sy));cx.globalAlpha=1}
 if(hov&&ER[tool]){cx.beginPath();cx.arc(hov[0],hov[1],ER[tool]/V.z,0,7);if(tool==='aoe'){cx.globalAlpha=.1;cx.fill();cx.globalAlpha=1}cx.lineWidth=1.5/V.z;cx.setLineDash([]);cx.stroke()}
 $('#zl').textContent=Math.round(V.z*100)+'%'}
function zoomAt(f,sx,sy){const w=s2w(sx,sy);V.z=Math.max(.1,Math.min(5,V.z*f));V.x=sx-w[0]*V.z;V.y=sy-w[1]*V.z;draw();save()}
function fitAll(){if(!items.length){V={x:0,y:0,z:1};return draw()}const bs=items.map(bounds),x0=Math.min(...bs.map(b=>b.x)),y0=Math.min(...bs.map(b=>b.y)),x1=Math.max(...bs.map(b=>b.x+b.w)),y1=Math.max(...bs.map(b=>b.y+b.h));
 V.z=Math.max(.1,Math.min(1.5,(W-200)/Math.max(1,x1-x0),(H-220)/Math.max(1,y1-y0)));V.x=W/2-(x0+x1)/2*V.z;V.y=H/2-(y0+y1)/2*V.z;draw();save()}
function mv(i,dx,dy){if(i.type==='pen')i.p=i.p.map(q=>[q[0]+dx,q[1]+dy]);else if(i.type==='arrow'){i.a=[i.a[0]+dx,i.a[1]+dy];i.b=[i.b[0]+dx,i.b[1]+dy];if(i.f&&!sel.has(byId(i.f)))i.f=0;if(i.t&&!sel.has(byId(i.t)))i.t=0}else{i.x+=dx;i.y+=dy}}
function snapSel(){if(!snap)return;sel.forEach(i=>{if(isShape(i)){i.x=Math.round(i.x/gs)*gs;i.y=Math.round(i.y/gs)*gs;i.w=Math.max(20,Math.round(i.w/gs)*gs);i.h=Math.max(20,Math.round(i.h/gs)*gs)}})}
function dup(list){const m={},n=list.map(o=>{const c=JSON.parse(JSON.stringify(o));m[o.id]=c.id=uid++;return c});n.forEach(c=>{if(c.p)c.p=c.p.map(q=>[q[0]+30,q[1]+30]);else if(c.a){c.a=[c.a[0]+30,c.a[1]+30];c.b=[c.b[0]+30,c.b[1]+30];c.f=m[c.f]||0;c.t=m[c.t]||0}else{c.x+=30;c.y+=30}});items.push(...n);sel=new Set(n);commit()}
function del(){if(!sel.size)return;items=items.filter(i=>!sel.has(i));const ids=new Set(items.map(i=>i.id));items.forEach(i=>{if(i.type==='arrow'){if(!ids.has(i.f))i.f=0;if(!ids.has(i.t))i.t=0}});sel=new Set;commit()}
function order(front){const s=items.filter(i=>sel.has(i)),r=items.filter(i=>!sel.has(i));items=front?r.concat(s):s.concat(r);commit()}
function vote(){sel.forEach(i=>{if(isShape(i))i.v=(i.v||0)+1});if(sel.size)commit()}
function setTool(t){tool=t;hov=null;document.querySelectorAll('#tools .b').forEach(b=>b.classList.toggle('on',b.dataset.t===t));cv.style.cursor=t==='select'?'default':t==='hand'?'grab':'crosshair'}
function openEd(it){if(!isShape(it))return;edIt=it;const fs=fsOf(it)*V.z,s=ed.style,inset=it.type==='ellipse'||it.type==='diamond'?it.w*.15*V.z:0;
 s.display='block';s.left=(it.x*V.z+V.x+inset)+'px';s.top=(it.y*V.z+V.y+inset)+'px';s.width=(it.w*V.z-2*inset)+'px';s.height=Math.max(it.h*V.z-2*inset,fs*2)+'px';s.fontSize=fs+'px';s.padding=Math.max(4,10*V.z)+'px';
 s.background=it.type==='text'?css.bg:it.c;s.color=dk(it)?'#fff':INK;s.textAlign=it.type==='sticky'||it.type==='text'?'left':'center';ed.value=it.t;draw();setTimeout(()=>ed.focus(),0)}
function closeEd(){if(!edIt)return;const it=edIt;edIt=null;it.t=ed.value;ed.style.display='none';if(it.type==='text'){if(!it.t.trim())items=items.filter(i=>i!==it);else fit(it)}commit()}
ed.onblur=closeEd;ed.onkeydown=e=>{if(e.key==='Escape')ed.blur();e.stopPropagation()};
const near=(q,it,r)=>it.p.some((s,j)=>j?dseg(q[0],q[1],it.p[j-1],s)<r:Math.hypot(q[0]-s[0],q[1]-s[1])<r);
function cutPens(q,r){let ch=0;const out=[];
 items.forEach(it=>{if(it.type!=='pen'||!near(q,it,r)){out.push(it);return}
  ch=1;sel.delete(it);const pcs=[];let cur=[];
  const pt=s=>{if(Math.hypot(q[0]-s[0],q[1]-s[1])<r){if(cur.length>1)pcs.push(cur);cur=[]}else cur.push(s)};
  it.p.forEach((s,j)=>{if(j){const a=it.p[j-1],m=Math.max(1,Math.ceil(Math.hypot(s[0]-a[0],s[1]-a[1])/(r/2)));for(let k=1;k<=m;k++)pt([a[0]+(s[0]-a[0])*k/m,a[1]+(s[1]-a[1])*k/m])}else pt(s)});
  if(cur.length>1)pcs.push(cur);
  pcs.forEach(p=>out.push({...it,id:uid++,p}))});
 if(ch)items=out;return ch}
function precise(q,r){if(cutPens(q,r))return 1;
 for(let i=items.length-1;i>=0;i--){const it=items[i];if(it.type==='pen')continue;
  const h=it.type==='arrow'?dseg(q[0],q[1],...ends(it))<r:q[0]>=it.x&&q[0]<=it.x+it.w&&q[1]>=it.y&&q[1]<=it.y+it.h;
  if(h){items.splice(i,1);sel.delete(it);return 1}}return 0}
function area(q,r){const k=items.filter(it=>it.type==='pen'?near(q,it,r):it.type==='arrow'?dseg(q[0],q[1],...ends(it))<r:Math.hypot(Math.max(it.x-q[0],0,q[0]-it.x-it.w),Math.max(it.y-q[1],0,q[1]-it.y-it.h))<r);
 if(k.length){const s=new Set(k);items=items.filter(i=>!s.has(i));k.forEach(i=>sel.delete(i))}return k.length}
function erase(a,b,m){const r=ER[m]/V.z,n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(r/2)));let ch=0;
 for(let k=1;k<=n;k++){const q=[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n];if(m==='aoe'?area(q,r):precise(q,r))ch=1}
 if(ch)drag.n=1}
function unlink(){const ids=new Set(items.map(i=>i.id));items.forEach(i=>{if(i.type==='arrow'){if(!ids.has(i.f))i.f=0;if(!ids.has(i.t))i.t=0}})}
cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);const p=s2w(...pos(e));closeEd();
 if(e.button===1||e.button===2||tool==='hand'||space){drag={k:'pan',sx:e.clientX,sy:e.clientY,vx:V.x,vy:V.y};return}
 if(tool==='select'){
  if(sel.size===1){const it=[...sel][0],hs=10/V.z;if(isShape(it)&&Math.abs(p[0]-it.x-it.w)<hs&&Math.abs(p[1]-it.y-it.h)<hs){drag={k:'rs',it};return}}
  const h=hit(p[0],p[1]);
  if(h){if(e.shiftKey)sel.has(h)?sel.delete(h):sel.add(h);else if(!sel.has(h)){sel=new Set([h])}drag={k:'mv',lx:p[0],ly:p[1],moved:0}}
  else{if(!e.shiftKey)sel=new Set;drag={k:'box',sx:p[0],sy:p[1],x:p[0],y:p[1]}}}
 else if(ER[tool]){drag={k:'er',n:0,m:tool,lx:p[0],ly:p[1]};erase(p,p,tool)}
 else if(tool==='pen'){const it=mk('pen');it.lw=Math.round(300/V.z)/100;it.p=[p,p.slice()];items.push(it);drag={k:'pen',it}}
 else if(tool==='arrow'){const it=mk('arrow'),s=shapeAt(p);it.a=p;it.b=p.slice();it.f=s?s.id:0;it.t=0;items.push(it);drag={k:'ar',it}}
 else{const it=mk(tool,p[0],p[1]);items.push(it);drag={k:'new',it,sx:p[0],sy:p[1]}}
 draw()};
cv.onpointermove=e=>{const p=s2w(...pos(e));hov=ER[tool]?p:null;if(!drag){if(hov)draw();return}const d=drag;
 if(d.k==='pan'){V.x=d.vx+e.clientX-d.sx;V.y=d.vy+e.clientY-d.sy}
 else if(d.k==='mv'){const dx=p[0]-d.lx,dy=p[1]-d.ly;sel.forEach(i=>mv(i,dx,dy));d.lx=p[0];d.ly=p[1];d.moved=1}
 else if(d.k==='rs'){d.it.w=Math.max(30,p[0]-d.it.x);d.it.h=Math.max(30,p[1]-d.it.y)}
 else if(d.k==='box'){d.x=p[0];d.y=p[1]}
 else if(d.k==='er'){erase([d.lx,d.ly],p,d.m);d.lx=p[0];d.ly=p[1]}
 else if(d.k==='pen')d.it.p.push(p)
 else if(d.k==='ar'){d.it.b=p;const s=shapeAt(p);d.it.t=s?s.id:0}
 else if(d.k==='new'){const it=d.it;it.x=Math.min(d.sx,p[0]);it.y=Math.min(d.sy,p[1]);it.w=Math.abs(p[0]-d.sx);it.h=Math.abs(p[1]-d.sy)}
 draw()};
cv.onpointerup=cv.onpointercancel=e=>{if(!drag)return;const d=drag;drag=null;
 if(d.k==='pan')save();
 else if(d.k==='mv'){if(d.moved){snapSel();commit()}}
 else if(d.k==='rs'){snapSel();commit()}
 else if(d.k==='box'){const x0=Math.min(d.sx,d.x),x1=Math.max(d.sx,d.x),y0=Math.min(d.sy,d.y),y1=Math.max(d.sy,d.y);items.forEach(i=>{const b=bounds(i);if(b.x<=x1&&b.x+b.w>=x0&&b.y<=y1&&b.y+b.h>=y0)sel.add(i)})}
 else if(d.k==='er'){if(d.n){unlink();commit()}}
 else if(d.k==='pen')commit();
 else if(d.k==='ar'){const[a,b]=ends(d.it);if(Math.hypot(b[0]-a[0],b[1]-a[1])<10)items.pop();else commit()}
 else if(d.k==='new'){const it=d.it;if(it.w<8&&it.h<8){const D={sticky:[180,180],rect:[160,100],ellipse:[160,100],diamond:[160,120],text:[220,30]}[it.type];it.w=D[0];it.h=D[1];it.x-=it.w/2;it.y-=it.h/2}
  snapSel.call(0);if(snap){it.x=Math.round(it.x/gs)*gs;it.y=Math.round(it.y/gs)*gs}sel=new Set([it]);setTool('select');commit();openEd(it)}
 draw()};
cv.onpointerleave=()=>{if(hov){hov=null;draw()}};
cv.oncontextmenu=e=>e.preventDefault();
cv.ondblclick=e=>{const p=s2w(...pos(e)),h=hit(p[0],p[1]);if(h&&isShape(h)){sel=new Set([h]);openEd(h)}else if(!h&&tool==='select'){const it=add('sticky',p[0]-90,p[1]-90,180,180);sel=new Set([it]);commit();openEd(it)}};
cv.onwheel=e=>{e.preventDefault();if(e.ctrlKey||e.metaKey||(!e.deltaX&&Math.abs(e.deltaY)>=50))zoomAt(Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),...pos(e));else{V.x-=e.deltaX;V.y-=e.deltaY;draw();save()}};
addEventListener('keydown',e=>{if(calOn||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;
 if(m){if(k==='z'){e.preventDefault();e.shiftKey?doRedo():doUndo()}else if(k==='y'){e.preventDefault();doRedo()}else if(k==='d'){e.preventDefault();dup([...sel])}else if(k==='a'){e.preventDefault();sel=new Set(items);draw()}else if(k==='c'){clip=JSON.stringify([...sel]);toast('Copied')}else if(k==='v'&&clip){e.preventDefault();dup(JSON.parse(clip))}else if(k==='0'){e.preventDefault();fitAll()}return}
 if(k===' '){space=true;e.preventDefault();return}
 if(k==='delete'||k==='backspace'){e.preventDefault();del()}
 else if(k==='escape'){sel=new Set;setTool('select');draw()}
 else if(k==='+'||k==='='){if(sel.size)vote();else zoomAt(1.2,W/2,H/2)}
 else if(k==='-')zoomAt(1/1.2,W/2,H/2)
 else if(k===']')order(1);else if(k==='[')order(0);
 else if(k.startsWith('arrow')){e.preventDefault();const s=e.shiftKey?50:10,dx=k==='arrowleft'?-s:k==='arrowright'?s:0,dy=k==='arrowup'?-s:k==='arrowdown'?s:0;sel.forEach(i=>mv(i,dx,dy));if(sel.size)commit()}
 else if(k==='enter'&&sel.size===1){e.preventDefault();openEd([...sel][0])}
 else if(k==='g'){grid=grid==='dots'?'lines':grid==='lines'?'off':'dots';$('#gm').value=grid;draw();save()}
 else if(k==='e'&&e.shiftKey)setTool('aoe')
 else if(KEY[k])setTool(KEY[k])});
addEventListener('keyup',e=>{if(e.key===' ')space=false});
function cen(){return s2w(W/2,H/2)}
const TPL={
 kanban(){const[x,y]=cen();['To do','Doing','Done'].forEach((n,i)=>{const X=x-420+i*290;add('rect',X,y-260,270,520,'','#e5e7eb');add('text',X+16,y-244,200,30,n);add('sticky',X+45,y-190,180,180,i?'':'First task',['#fde68a','#93c5fd','#86efac'][i])})},
 brain(){const[x,y]=cen(),c=add('ellipse',x-100,y-60,200,120,'Big idea','#c4b5fd');[[-330,-230],[190,-230],[-330,100],[190,100]].forEach((o,i)=>{const s=add('sticky',x+o[0],y+o[1],150,150,'Idea '+(i+1),PAL[i%5]);const a=mk('arrow');a.a=ctr(s);a.b=ctr(c);a.f=s.id;a.t=c.id;a.c=INK;items.push(a)})},
 swot(){const[x,y]=cen();[['Strengths','#bbf7d0'],['Weaknesses','#fecaca'],['Opportunities','#bfdbfe'],['Threats','#fed7aa']].forEach((q,i)=>{const X=x-310+(i%2)*310,Y=y-230+Math.floor(i/2)*240;add('rect',X,Y,300,230,'',q[1]);add('text',X+14,Y+10,260,30,q[0])})}};
$('#tpl').onchange=e=>{const t=e.target.value;if(t){TPL[t]();commit();e.target.value=''}};
TOOLS.forEach(t=>{const b=document.createElement('button');b.className='b';b.dataset.t=t[0];b.textContent=t[1];b.title=t[2];b.onclick=()=>setTool(t[0]);$('#tools').append(b)});
PAL.forEach(c=>{const b=document.createElement('button');b.className='sw'+(c===color?' on':'');b.style.background=c;b.title='Color';b.onclick=()=>{color=c;picked=true;document.querySelectorAll('.sw').forEach(s=>s.classList.toggle('on',s===b));let ch=0;sel.forEach(i=>{i.c=c;ch=1});if(ch)commit()};$('#pal').append(b)});
$('#pal').insertAdjacentHTML('beforeend','<span class="sep"></span><button class="b" id="a1" title="Duplicate (Ctrl+D)">⧉</button><button class="b" id="a2" title="Bring to front (])">⇧</button><button class="b" id="a3" title="Send to back ([)">⇩</button><button class="b" id="a4" title="Add a vote (+)">👍</button><button class="b" id="a5" title="Delete (Del)">✕</button>');
$('#a1').onclick=()=>sel.size&&dup([...sel]);$('#a2').onclick=()=>order(1);$('#a3').onclick=()=>order(0);$('#a4').onclick=vote;$('#a5').onclick=del;
$('#un').onclick=doUndo;$('#re').onclick=doRedo;$('#zi').onclick=()=>zoomAt(1.2,W/2,H/2);$('#zo').onclick=()=>zoomAt(1/1.2,W/2,H/2);$('#fit').onclick=fitAll;
$('#sn').onclick=e=>{snap=!snap;e.currentTarget.classList.toggle('on',snap);toast(snap?'Snap to grid on':'Snap to grid off')};
$('#gm').onchange=e=>{grid=e.target.value;draw();save()};$('#gs').onchange=e=>{gs=+e.target.value;draw();save()};
$('#nm').oninput=e=>{name=e.target.value;save()};
$('#cl').onclick=()=>{if(items.length&&confirm('Clear the whole board? You can undo this.')){items=[];sel=new Set;commit()}};
$('#th').onclick=()=>{const r=document.documentElement,d=getComputedStyle(r).getPropertyValue('--ui').trim()==='#fff';r.dataset.theme=d?'dark':'light';try{localStorage.setItem('boardly-theme',r.dataset.theme)}catch(e){}refreshCss();draw()};
$('#js').onclick=()=>{$('#jt').value=JSON.stringify({name,items});$('#dlg').showModal()};
$('#jx').onclick=()=>$('#dlg').close();
$('#jc').onclick=async()=>{try{await navigator.clipboard.writeText($('#jt').value);toast('JSON copied')}catch(e){$('#jt').select();toast('Press Ctrl+C to copy')}};
$('#jl').onclick=()=>{try{const d=JSON.parse($('#jt').value);items=d.items;uid=Math.max(0,...items.map(i=>i.id))+1;name=d.name||name;$('#nm').value=name;sel=new Set;$('#dlg').close();commit();fitAll()}catch(e){toast('That is not valid board JSON')}};
$('#pn').onclick=()=>{if(!items.length)return toast('Nothing to export yet');const bs=items.map(bounds),x0=Math.min(...bs.map(b=>b.x))-40,y0=Math.min(...bs.map(b=>b.y))-40,x1=Math.max(...bs.map(b=>b.x+b.w))+40,y1=Math.max(...bs.map(b=>b.y+b.h))+40,s=2,o=document.createElement('canvas');
 o.width=(x1-x0)*s;o.height=(y1-y0)*s;const old=cx;cx=o.getContext('2d');cx.fillStyle=css.bg;cx.fillRect(0,0,o.width,o.height);cx.setTransform(s,0,0,s,-x0*s,-y0*s);items.forEach(drawItem);cx=old;
 o.toBlob(async b=>{try{await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);toast('PNG copied to clipboard')}catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='board.png';a.click();toast('Saving PNG…')}})};
const CPTS=[[.15,.3],[.85,.3],[.5,.5],[.15,.7],[.85,.7]];
(function(){const o=document.createElement('div');o.id='cal';o.innerHTML='<div class="m"><span id="cmsg"></span><button class="b" id="crs">Reset</button><button class="b" id="ccx">Cancel</button></div><div class="t" id="ctg"></div>';document.body.append(o);
 let i=0,data=[];
 const show=()=>{const t=$('#ctg');t.style.left=CPTS[i][0]*innerWidth+'px';t.style.top=CPTS[i][1]*innerHeight+'px';$('#cmsg').textContent='Click the center of the target ('+(i+1)+'/'+CPTS.length+')'};
 const close=()=>{calOn=false;o.style.display='none'};
 const fitAx=(r,t)=>{const n=r.length,mr=r.reduce((a,b)=>a+b)/n,mt=t.reduce((a,b)=>a+b)/n;let c=0,v=0;r.forEach((x,k)=>{c+=(x-mr)*(t[k]-mt);v+=(x-mr)**2});const a=v?c/v:1;return[a,mt-a*mr]};
 const saveCal=()=>{try{localStorage.setItem('boardly-cal',JSON.stringify(CAL))}catch(e){}};
 $('#ca').onclick=()=>{i=0;data=[];calOn=true;if(drag)drag=null;o.style.display='block';show()};
 $('#ccx').onclick=close;
 $('#crs').onclick=()=>{CAL={ax:1,bx:0,ay:1,by:0};saveCal();close();draw();toast('Calibration reset')};
 o.querySelector('.m').onpointerdown=e=>e.stopPropagation();
 o.onpointerdown=e=>{e.preventDefault();data.push([CPTS[i][0]*innerWidth,CPTS[i][1]*innerHeight,e.clientX,e.clientY]);i++;
  if(i<CPTS.length)return show();
  const[ax,bx]=fitAx(data.map(d=>d[2]),data.map(d=>d[0])),[ay,by]=fitAx(data.map(d=>d[3]),data.map(d=>d[1]));close();
  if(ax<.25||ax>4||ay<.25||ay>4)return toast('Calibration looked wrong, nothing changed');
  CAL={ax,bx,ay,by};saveCal();draw();toast('Calibrated')};
 addEventListener('keydown',e=>{if(calOn&&e.key==='Escape')close()})})();
function resize(){dpr=devicePixelRatio||1;W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;draw()}
addEventListener('resize',resize);
try{const t=localStorage.getItem('boardly-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
try{const c=JSON.parse(localStorage.getItem('boardly-cal')||'null');if(c&&isFinite(c.ax+c.bx+c.ay+c.by))CAL=c}catch(e){}
refreshCss();
try{const d=JSON.parse(localStorage.getItem('boardly')||'null');if(d&&d.items){items=d.items;V=d.V;uid=d.uid;name=d.name||name;grid=d.grid||'dots';gs=d.gs||20;$('#nm').value=name}}catch(e){}
resize();$('#gm').value=grid;$('#gs').value=gs;
if(!items.length){V={x:W/2-300,y:H/2-200,z:1};add('sticky',0,0,200,200,'Welcome to Boardly! Double-click anywhere to add a sticky note.','#fde68a');add('sticky',230,30,200,200,'Drag to move. Drag the corner handle to resize. Shift-click to multi-select.','#93c5fd');add('sticky',460,0,200,200,'Press A, then drag between shapes to draw connectors that follow them.','#86efac');add('text',0,240,420,30,'Shortcuts: V N R O D T P A E H, G for grid, + to vote, Ctrl+Z undo');commit()}
else{undo=[JSON.stringify(items)];draw()}
if(!undo.length)undo=[JSON.stringify(items)];
setTool('select');
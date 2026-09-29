/* Atlas math — no rendering dependency. +X east, +Z south, +Y up. */
(function(G){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const length=v=>Math.hypot(...v);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,k)=>a.map(x=>x*k);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=v=>mul(v,1/(length(v)||1));
function rng(seed=73129){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function hash(x,z){let n=Math.imul(x,374761393)+Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
function noise(x,z){const i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j);return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);}
const srgb=x=>x<=0.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
const rgb=hex=>{let h=parseInt(hex.replace('#',''),16);return[srgb((h>>16)/255),srgb(((h>>8)&255)/255),srgb((h&255)/255)];};
const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov*Math.PI/360),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,target,up=[0,1,0]){const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function matmul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function transform(m,p){return[0,1,2,3].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);}
function instanceMatrix(x,y,z,sx,sy,sz,angle=0){const c=Math.cos(angle),s=Math.sin(angle);return[c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1];}
function planeFrustum(m){return[[3,0,1],[3,0,-1],[3,1,1],[3,1,-1],[3,2,1],[3,2,-1]].map(([a,b,s])=>{const v=[m[a]+s*m[b],m[4+a]+s*m[4+b],m[8+a]+s*m[8+b],m[12+a]+s*m[12+b]];const n=Math.hypot(v[0],v[1],v[2]);return v.map(x=>x/n);});}
const visibleSphere=(planes,c,r)=>planes.every(p=>p[0]*c[0]+p[1]*c[1]+p[2]*c[2]+p[3]>-r);
function spline(points,spacing=8){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)],steps=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/spacing));for(let j=0;j<steps;j++){const t=j/steps,t2=t*t,t3=t2*t;out.push([0,1].map(k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)));}}out.push(points.at(-1));return out;}
Object.assign(G,{clamp,mix,smooth,length,sub,add,mul,cross,dot,norm,rng,noise,rgb,blend,perspective,lookAt,matmul,transform,instanceMatrix,planeFrustum,visibleSphere,spline});
})(globalThis.GA=globalThis.GA||{});

/* Explicit, reusable 3D geometry. All positions and building back faces are project designs. */
(function(G){'use strict';
class Geometry {
 constructor(){this.a=[];this.origin=[0,0,0];this.angle=0;}
 place(x=0,y=0,z=0,angle=0){this.origin=[x,y,z];this.angle=angle;return this;}
 point(p){const c=Math.cos(this.angle),s=Math.sin(this.angle),o=this.origin;return[o[0]+c*p[0]+s*p[2],o[1]+p[1],o[2]-s*p[0]+c*p[2]];}
 vertex(p,n,col){const c=Math.cos(this.angle),s=Math.sin(this.angle);this.a.push(...this.point(p),c*n[0]+s*n[2],n[1],-s*n[0]+c*n[2],...col);}
 tri(a,b,c,col,n){n=n||G.norm(G.cross(G.sub(b,a),G.sub(c,a)));this.vertex(a,n,col);this.vertex(b,n,col);this.vertex(c,n,col);}
 quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);}
 box(x,y,z,w,h,d,col){const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,f=y+h;this.quad([a,y,e],[b,y,e],[b,f,e],[a,f,e],col);this.quad([b,y,c],[a,y,c],[a,f,c],[b,f,c],col);this.quad([b,y,e],[b,y,c],[b,f,c],[b,f,e],col);this.quad([a,y,c],[a,y,e],[a,f,e],[a,f,c],col);this.quad([a,f,e],[b,f,e],[b,f,c],[a,f,c],col);this.quad([a,y,c],[b,y,c],[b,y,e],[a,y,e],col);}
 tube(a,b,r,col,n=6,r2=r){const dir=G.norm(G.sub(b,a)),right=G.norm(G.cross(dir,Math.abs(dir[1])>.9?[1,0,0]:[0,1,0])),up=G.cross(dir,right);const pt=(o,t,R)=>G.add(o,G.add(G.mul(right,Math.cos(t)*R),G.mul(up,Math.sin(t)*R)));for(let i=0;i<n;i++){let t=i/n*Math.PI*2,u=(i+1)/n*Math.PI*2;this.quad(pt(a,u,r),pt(a,t,r),pt(b,t,r2),pt(b,u,r2),col);this.tri(b,pt(b,u,r2),pt(b,t,r2),col);}}
 cone(x,y,z,r0,r1,h,col,n=8){this.tube([x,y,z],[x,y+h,z],r0,col,n,r1);}
 ellipsoid(x,y,z,rx,ry,rz,col,slices=8,rings=4){const p=(a,b)=>[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];for(let j=0;j<rings;j++)for(let i=0;i<slices;i++){let a=i*2*Math.PI/slices,b=(i+1)*2*Math.PI/slices,c=j*Math.PI/rings,d=(j+1)*Math.PI/rings;this.quad(p(a,c),p(b,c),p(b,d),p(a,d),col);}}
 mesh(id,group='architecture',extra={}){const a=new Float32Array(this.a);this.a=[];let mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],a[i+k]);mx[k]=Math.max(mx[k],a[i+k]);}const center=mn.map((v,i)=>(v+mx[i])/2);return{id,group,vertices:a,center,radius:G.length(G.sub(mx,mn))/2,...extra};}
}
class BatchBank{
 constructor(){this.groups=new Map();}
 get(x,z,material='matte',lod='base'){const key=`${material}:${lod}:${Math.floor(x/96)}:${Math.floor(z/96)}`;if(!this.groups.has(key))this.groups.set(key,{g:new Geometry(),material,lod});const item=this.groups.get(key);item.g.place();return item.g;}
 meshes(){return[...this.groups].filter(([k,v])=>v.g.a.length).map(([key,item])=>item.g.mesh(key,'town',{material:item.material,lod:item.lod}));}
}
Object.assign(G,{Geometry,BatchBank});
})(globalThis.GA);

(function(G){
'use strict';
const {smooth,mix,noise,rgb,blend}=G;
const lakes=[{id:'mist_lake',x:450,z:-730,rx:300,rz:210,y:100,phase:0},{id:'wind_lake',x:-200,z:-1370,rx:230,rz:150,y:680,phase:1.2}];
function lakeRadius(l,a){a=Math.atan2(Math.sin(a),Math.cos(a));return 1+.055*Math.sin(a*3+l.phase)+.035*Math.cos(a*5+.5)-.085*Math.exp(-((a/.6)**2));}
function lakeDistance(l,x,z){let a=Math.atan2((z-l.z)/l.rz,(x-l.x)/l.rx),r=lakeRadius(l,a);return Math.hypot((x-l.x)/l.rx,(z-l.z)/l.rz)/r;}
const routes=[
 {id:'route-shrine',from:'village',to:'hakurei',basis:['E001','E002'],type:'path',width:5,points:[[220,32],[280,32],[510,70],[800,160],[1060,260],[1330,280],[1500,240],[1590,190],[1620,160]]},
 {id:'route-forest',from:'village',to:'kourindou',basis:['E003','E004'],type:'path',width:6,points:[[-220,32],[-280,32],[-360,30],[-560,0],[-700,-10],[-850,-65]]},
 {id:'route-alice',from:'kourindou',to:'alice',basis:[],type:'path',width:2.8,points:[[-850,-65],[-1020,-90],[-1180,-170],[-1140,-260]]},
 {id:'route-marisa',from:'kourindou',to:'marisa',basis:[],type:'path',width:2.8,points:[[-850,-65],[-840,80],[-890,150],[-1000,140]]},
 {id:'route-temple',from:'village',to:'myouren',basis:['E082'],type:'path',width:5,points:[[110,196],[110,245],[110,280],[100,300],[240,420],[300,380]]},
 {id:'route-station',from:'village',to:'ropeway_lower',basis:['E078'],type:'path',width:5,points:[[110,-198],[110,-255],[50,-280],[70,-390]]},
 {id:'route-bamboo',from:'village',to:'bamboo',basis:['E079'],type:'path',width:4,points:[[100,300],[240,580],[440,770],[400,960],[560,1110],[500,1220]]},
 {id:'route-eientei',from:'bamboo',to:'eientei',basis:[],type:'path',width:2.5,points:[[500,1220],[420,1300],[510,1440],[640,1490],[690,1440]]},
 {id:'route-flower',from:'village',to:'sunflower',basis:['E080'],type:'path',width:4,points:[[-60,230],[-80,430],[-330,630],[-390,920],[-580,1190]]},
 {id:'route-lake',from:'kourindou',to:'mist_lake',basis:['E081'],type:'path',width:4,points:[[-560,0],[-370,-170],[-220,-290],[-150,-480],[80,-490],[70,-390],[240,-410],[450,-485]]},
 {id:'route-scarlet',from:'mist_lake',to:'scarlet',basis:[],type:'path',width:4,points:[[450,-485],[630,-470],[780,-490],[900,-550],[900,-640],[820,-680]]},
 {id:'route-muenzuka',from:'forest',to:'muenzuka',basis:['E008','E009'],type:'path',width:2.5,points:[[-1000,140],[-1240,170],[-1380,360],[-1580,470],[-1730,570]]}
].map(r=>({...r,evidence:'P',note:'本作路线曲线；不代表官方道路的精确位置。',samples:G.spline(r.points,7)}));
class Terrain{
 constructor(catalog){this.catalog=catalog;this.min=-2176;this.size=4352;this.step=16;this.n=this.size/this.step;this.heights=new Float32Array((this.n+1)**2);for(let iz=0;iz<=this.n;iz++)for(let ix=0;ix<=this.n;ix++){const x=this.min+ix*this.step,z=this.min+iz*this.step;this.heights[iz*(this.n+1)+ix]=this.raw(x,z);}this.routes=routes;this.lakes=lakes;}
 raw(x,z){const peak=(a,b,h,rx,rz)=>h*Math.exp(-(((x-a)/rx)**2+((z-b)/rz)**2)*1.7);let h=24+24*noise(x/420,z/420)+8*noise(x/110,z/110);h+=peak(-720,-1540,900,440,440)+peak(-1140,-1390,410,470,550)+peak(-130,-1750,670,420,350)+peak(420,-1620,650,440,420)+peak(-330,-960,290,540,500);h+=peak(1730,100,205,430,720)+peak(-1470,920,180,590,620)+peak(-600,1170,55,550,380)+peak(430,1290,32,800,900);h+=18*(noise(x/130,z/130)-.5)*smooth(180,600,h);h=mix(h,683,1-smooth(270,420,Math.hypot((x+100)*1.05,z+1370)));for(const p of this.catalog.data.placements){if(['mountain','forest','bamboo','mist_lake','wind_lake','sunflower','nameless','genbu','sanctuary'].includes(p.id))continue;let rx=p.width_x*.58,rz=p.depth_z*.58;if(p.id==='village'){rx=275;rz=245;}const d=Math.max(Math.abs((x-p.x)/rx),Math.abs((z-p.z)/rz)),w=1-smooth(.74,1.9,d);h=mix(h,p.y_base,w);}for(const l of lakes){const d=lakeDistance(l,x,z),floor=l.y-12+12*smooth(.7,1,d);if(d<1)h=floor;else if(d<1.45)h=mix(l.y+1.5,h,smooth(1,1.45,d));}return h;}
 height(x,z){const fx=G.clamp((x-this.min)/this.step,0,this.n-.00001),fz=G.clamp((z-this.min)/this.step,0,this.n-.00001),ix=Math.floor(fx),iz=Math.floor(fz),u=fx-ix,v=fz-iz,n=this.n+1,a=this.heights[iz*n+ix],b=this.heights[iz*n+ix+1],c=this.heights[(iz+1)*n+ix],d=this.heights[(iz+1)*n+ix+1];return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
 normal(x,z){return G.norm([this.height(x-8,z)-this.height(x+8,z),16,this.height(x,z-8)-this.height(x,z+8)]);}
 water(x,z,margin=0){return lakes.find(l=>lakeDistance(l,x,z)<1+margin);}
 color(x,z,h,n=null){let c=rgb('#a7bb80');const shade=noise(x/330,z/330),f=1-smooth(.6,1.2,Math.hypot((x+1080)/580,(z+60)/470)),b=1-smooth(.65,1.1,Math.hypot((x-500)/585,(z-1220)/510));c=blend(c,rgb('#72966e'),shade*.28);c=blend(c,rgb('#547861'),f*.9);c=blend(c,rgb('#a6b565'),b*.68);const sun=1-smooth(.72,1.12,Math.hypot((x+580)/350,(z-1190)/255));c=blend(c,rgb('#cabc69'),sun*.88);const lily=1-smooth(.65,1.15,Math.hypot((x+1330)/225,(z-1050)/180));c=blend(c,rgb('#b7bf96'),lily*.7);c=blend(c,rgb('#72907b'),smooth(180,570,h)*.6);c=blend(c,rgb('#a5ad9e'),smooth(440,900,h)*.92);c=blend(c,rgb('#d3d2be'),smooth(870,1160,h));for(const l of lakes){const d=lakeDistance(l,x,z);c=blend(c,rgb('#c5c8a1'),(1-smooth(.99,1.09,d))*.45);}const fade=Math.max(smooth(1870,2420,Math.hypot(x,z)),smooth(1850,2176,Math.max(Math.abs(x),Math.abs(z))));return blend(c,rgb('#e5e8dc'),fade*.88);}
 meshes(){const out=[],tileN=34;for(let tz=0;tz<8;tz++)for(let tx=0;tx<8;tx++){const g=new G.Geometry(),x0=this.min+tx*tileN*this.step,z0=this.min+tz*tileN*this.step;for(let iz=0;iz<tileN;iz++)for(let ix=0;ix<tileN;ix++){const x=x0+ix*this.step,z=z0+iz*this.step;for(const [dx,dz] of [[0,0],[0,1],[1,0],[1,0],[0,1],[1,1]]){const X=x+dx*this.step,Z=z+dz*this.step,h=this.height(X,Z);g.vertex([X,h,Z],this.normal(X,Z),this.color(X,Z,h));}}out.push(g.mesh('terrain-'+tx+'-'+tz,'terrain',{...G.bounds(x0+272,this.height(x0+272,z0+272),z0+272,750)}));}return out;}
 waterMeshes(){return lakes.map(l=>{const g=new G.Geometry(),N=100;const point=a=>{const r=lakeRadius(l,a);return[l.x+Math.cos(a)*l.rx*r,l.y+.6,l.z+Math.sin(a)*l.rz*r];};for(let i=0;i<N;i++){const a=point(i/N*Math.PI*2),b=point((i+1)/N*Math.PI*2),c=[l.x,l.y+.6,l.z];g.vertex(c,[0,1,0],rgb('#55999c'));g.vertex(b,[0,1,0],rgb('#87bdb3'));g.vertex(a,[0,1,0],rgb('#87bdb3'));}return g.mesh(l.id+'-water','water',{...G.bounds(l.x,l.y,l.z,l.rx+60),unlit:false});});}
 pathMeshes(){const out=[];for(const r of routes){const g=new G.Geometry();for(let i=0;i<r.samples.length-1;i++){const a=r.samples[i],b=r.samples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,nx=-dz/len*r.width/2,nz=dx/len*r.width/2,p=(v,s)=>[v[0]+s*nx,this.height(v[0]+s*nx,v[1]+s*nz)+.55,v[1]+s*nz];g.quad(p(a,1),p(b,1),p(b,-1),p(a,-1),rgb('#d0c3a0'));}out.push(g.mesh(r.id,'roads',{route:r}));}return out;}
}
Object.assign(G,{LegacyTerrain:Terrain,lakes,lakeDistance,routes});
})(globalThis.GA);
/* v0.3: village channel is an explicit local P proposal; the 22 research anchors are unchanged. */
(function(G){'use strict';const{mix,smooth,noise,rgb,blend}=G;
const canalCenter=z=>18+22*Math.sin((z+60)/135)+7*Math.sin(z/64), canalWidth=z=>15.8+1.1*Math.sin(z/72), WATER_Y=26.2, VILLAGE_Y=30;
function channelMask(x,z){return 1-smooth(canalWidth(z)-1,canalWidth(z)+1.2,Math.abs(x-canalCenter(z)));}
class Terrain {
 constructor(manifest){this.manifest=manifest;this.lakes=G.lakes;this.routes=G.routes;this.size=5632;this.min=-2816;}
 height(x,z){const pk=(a,b,h,rx,rz)=>h*Math.exp(-1.9*(((x-a)/rx)**2+((z-b)/rz)**2));
 let h=21+25*noise(x/480,z/480)+8*noise(x/120,z/120);
 let m=pk(-720,-1590,940,440,380)+pk(-1080,-1350,540,350,420)+pk(-220,-1820,860,370,350)+pk(330,-1680,830,380,440)+pk(-320,-1060,190,660,500)+pk(-1560,-1780,760,350,450)+pk(910,-1910,620,430,400);
 let ridge=(Math.abs(2*noise((x+38*Math.sin(z/120))/98,z/96)-1)*.65+Math.abs(2*noise(x/39,z/41)-1)*.35);
 h+=m*(.78+ridge*.35);h+=pk(1800,140,230,470,900)+pk(-1500,1020,215,530,580)+pk(-610,1240,70,500,350)+pk(530,1270,37,700,900);
 h+=pk(-2100,-600,410,330,530)+pk(2190,-1240,360,420,700);
 // A high-level lake basin, not an oversized flat mountain cap.
 h=mix(h,688,1-smooth(.93,1.62,Math.hypot((x+125)/390,(z+1370)/245)));
 for(const p of this.manifest.placements){if(['mountain','forest','bamboo','mist_lake','wind_lake','sunflower','nameless','genbu','sanctuary'].includes(p.id))continue;
 const rx=p.id==='village'?305:p.width_x*.54,rz=p.id==='village'?270:p.depth_z*.54;
 let d=Math.max(Math.abs((x-p.x)/rx),Math.abs((z-p.z)/rz));h=mix(h,p.y_base,1-smooth(.68,p.id==='village'?1.55:3.5,d));}
 for(const l of this.lakes){let d=G.lakeDistance(l,x,z);if(d<1)h=l.y-13+11*smooth(.7,1,d);else if(d<1.25)h=mix(l.y+1.2,h,smooth(1,1.25,d));}
 h=mix(h,30,1-smooth(.92,1.35,Math.max(Math.abs(x)/282,Math.abs(z)/252)));
 const longitudinal=1-smooth(310,440,Math.abs(z));if(longitudinal>0){const dist=Math.abs(x-canalCenter(z)),w=canalWidth(z);h=mix(h,24.4,channelMask(x,z)*longitudinal);if(dist>w+1&&dist<w+13&&Math.abs(z)<290)h=30;}
 return h;}
 normal(x,z){return G.norm([this.height(x-1,z)-this.height(x+1,z),2,this.height(x,z-1)-this.height(x,z+1)]);}
 water(x,z,margin=0){return this.lakes.find(l=>G.lakeDistance(l,x,z)<1+margin)||(Math.abs(z)<350&&Math.abs(x-canalCenter(z))<canalWidth(z)+margin*30);}
 color(x,z,h,n=null){let c=rgb('#718654');c=blend(c,rgb('#8b9b61'),noise(x/250,z/250)*.28);const forest=1-smooth(.7,1.24,Math.hypot((x+1080)/520,(z+60)/435));c=blend(c,rgb('#526f4d'),forest*.78);
 c=blend(c,rgb('#788f54'),(1-smooth(.8,1.2,Math.hypot((x-500)/550,(z-1220)/485)))*.7);
 c=blend(c,rgb('#b0a367'),(1-smooth(.7,1.12,Math.hypot((x+580)/350,(z-1190)/250)))*.8);
 const slope=1-(n||this.normal(x,z))[1];c=blend(c,rgb('#92968a'),smooth(.16,.55,slope)*.94);c=blend(c,rgb('#bbc0b2'),smooth(430,1050,h)*.54);c=blend(c,rgb('#d3d3c2'),smooth(920,1420,h)*.6);
 const town=1-smooth(.87,1.08,Math.max(Math.abs(x)/239,Math.abs(z)/223));c=blend(c,rgb('#a7a28b'),town*.82);return c;}
 meshes(){const out=[],size=512;
 const grid=(x0,z0,size,step,id,skip)=>{const N=size/step,g=new G.Geometry(),grid=[];for(let iz=0;iz<=N;iz++){const row=[];for(let ix=0;ix<=N;ix++){let x=x0+ix*step,z=z0+iz*step,h=this.height(x,z),n=this.normal(x,z);row.push({p:[x,h,z],n,c:this.color(x,z,h,n)});}grid.push(row);}
 for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){let x=x0+ix*step,z=z0+iz*step;if(id==='myouren-mountain-ground'&&x>=-288&&x+step<=288&&z>=-288&&z+step<=288)continue;if(skip&&((x>=-1664&&x+step<=512&&z>=-2176&&z+step<=-512)||(x>=-1792&&x+step<=-128&&z>=768&&z+step<=1536)||(x>=-64&&x+step<=1088&&z>=768&&z+step<=1792)||(x>=128&&x+step<=640&&z>=256&&z+step<=768)||(x>=-288&&x+step<=288&&z>=-288&&z+step<=288)||(x>=1312&&x+step<=1824&&z>=-96&&z+step<=416)||(x>=736&&x+step<=992&&z>=64&&z+step<=320)||(x>=672&&x+step<=1024&&z>=-832&&z+step<=-480)||(x>=1024&&x+step<=1152&&z>=224&&z+step<=352)))continue;for(const[dx,dz]of[[0,0],[0,1],[1,0],[1,0],[0,1],[1,1]]){let v=grid[iz+dz][ix+dx];g.vertex(v.p,v.n,v.c);}}
 if(g.a.length)out.push(g.mesh(id,'terrain',{material:id.startsWith('mountain-ground')?'mountainTerrain':'ground'}));};
 for(let tz=0;tz<11;tz++)for(let tx=0;tx<11;tx++){let x0=this.min+tx*size,z0=this.min+tz*size,local=Math.abs(x0+size/2)<700&&Math.abs(z0+size/2)<700;grid(x0,z0,size,local?8:16,'terrain-'+tx+'-'+tz,true);}
 grid(-288,-288,576,2,'village-ground',false);grid(128,256,512,2,'myouren-mountain-ground',false);
 grid(672,-832,352,2,'scarlet-ground',false);grid(1024,224,128,2,'mystia-ground',false);grid(1312,-96,512,4,'hakurei-ground',false);grid(736,64,256,2,'trail-stream-ground',false);
 for(let bz=768;bz<1792;bz+=128)for(let bx=-64;bx<1088;bx+=128)grid(bx,bz,128,4,'bamboo-ground-'+bx+'-'+bz,false);
 for(let mz=-2176;mz<-512;mz+=128)for(let mx=-1664;mx<512;mx+=128){const precise=(mx>=-512&&mx<256&&mz>=-1536&&mz<-896);grid(mx,mz,128,precise?4:8,'mountain-ground-'+mx+'-'+mz,false);}
 for(let bz=768;bz<1536;bz+=128)for(let bx=-1792;bx<-128;bx+=128)grid(bx,bz,128,4,'flowerlands-ground-'+bx+'-'+bz,false);
 // A coarse peripheral landscape hides the rectangular editing window; it is not an official boundary.
 const outer=new G.Geometry(),S=256;
 for(let z=-8192;z<8192;z+=S)for(let x=-8192;x<8192;x+=S){if(x>=-2816&&x+S<=2816&&z>=-2816&&z+S<=2816)continue;
 for(const[dx,dz]of[[0,0],[0,1],[1,0],[1,0],[0,1],[1,1]]){let X=x+dx*S,Z=z+dz*S,h=this.height(X,Z),n=this.normal(X,Z);outer.vertex([X,h,Z],n,this.color(X,Z,h,n));}}
 out.push(outer.mesh('peripheral-landscape-P','terrain',{material:'ground'}));return out;}
 waterMeshes(){const out=this.lakes.map(l=>{let g=new G.Geometry(),N=120,pt=a=>{let r=1+.055*Math.sin(a*3+l.phase)+.035*Math.cos(a*5+.5)-.085*Math.exp(-((Math.atan2(Math.sin(a),Math.cos(a))/.6)**2));return[l.x+Math.cos(a)*l.rx*r,l.y+.25,l.z+Math.sin(a)*l.rz*r];};for(let i=0;i<N;i++)g.tri([l.x,l.y+.25,l.z],pt((i+1)*Math.PI*2/N),pt(i*Math.PI*2/N),rgb('#4b9295'));return g.mesh(l.id+'-water','water',{material:'water'});});let g=new G.Geometry();
 for(let z=-430;z<430;z+=3){let p=(Z,sgn)=>[canalCenter(Z)+canalWidth(Z)*sgn,WATER_Y,Z];g.quad(p(z,-1),p(z+3,-1),p(z+3,1),p(z,1),rgb('#4e8689'));}out.push(g.mesh('village-canal-water','water',{material:'water'}));return out;}
 pathMeshes(){return G.routes.map(r=>{let g=new G.Geometry();for(let i=0;i<r.samples.length-1;i++){let a=r.samples[i],b=r.samples[i+1];let dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,nx=-dz/len*r.width/2,nz=dx/len*r.width/2;let p=(v,s)=>[v[0]+s*nx,this.height(v[0]+s*nx,v[1]+s*nz)+.22,v[1]+s*nz];g.quad(p(a,1),p(b,1),p(b,-1),p(a,-1),rgb('#bcad8d'));}return g.mesh(r.id,'roads',{material:'ground',route:r});}).filter(m=>m.vertices.length);}
}
Object.assign(G,{Terrain,canalCenter,canalWidth,WATER_Y,VILLAGE_Y,channelMask});
})(globalThis.GA);

/* v0.4 architectural kit: ordinary village buildings, not canon reconstructions of named residences. */
(function(G){'use strict';
const C=Object.fromEntries(Object.entries({wood:'#614731',woodDark:'#3b3028',timber:'#806342',plaster:'#ded9c5',paper:'#ddcda8',shadow:'#28342f',slate:'#3c4b4b',slate2:'#51605b',stone:'#8f9384',stoneLight:'#b2b19d',base:'#737c70',indigo:'#405466',red:'#925c47',gold:'#bea369',leaf:'#648047',cream:'#f0e5bf'}).map(([k,v])=>[k,G.rgb(v)]));
function roof(g,x,y,z,w,d,rise,col=C.slate,detail=null,hip=false){
 const py=t=>y+rise*(1-t)+.23*Math.pow(t,5);const xlen=t=>hip?w*(.60+.40*t):w;
 for(let side of [-1,1])for(let j=0;j<8;j++){let t=j/8,u=(j+1)/8,za=z+side*d*.5*t,zb=z+side*d*.5*u,a=[x-xlen(t)/2,py(t),za],b=[x+xlen(t)/2,py(t),za],c=[x+xlen(u)/2,py(u),zb],e=[x-xlen(u)/2,py(u),zb];if(side===1)g.quad(b,a,e,c,col);else g.quad(a,b,c,e,col);}
 if(hip){for(let sx of[-1,1])g.tri([x+sx*w*.3,y+rise,z],[x+sx*w*.5,y+.23,z+d*.5],[x+sx*w*.5,y+.23,z-d*.5],col);}
 else for(let sx of[-1,1]){g.tri([x+sx*(w/2-.3),y-.25,z-d/2],[x+sx*(w/2-.3),y+rise-.25,z],[x+sx*(w/2-.3),y-.25,z+d/2],C.woodDark);g.tube([x+sx*w/2,y+.17,z-d/2],[x+sx*w/2,y+rise+.06,z],.13,C.timber,4);g.tube([x+sx*w/2,y+rise+.06,z],[x+sx*w/2,y+.17,z+d/2],.13,C.timber,4);}
 g.box(x,y+rise+.02,z,w*(hip?.65:1.025),.21,.46,C.slate2);g.box(x,y+rise+.24,z,w*(hip?.65:1.035),.12,.32,col);
 for(let side of[-1,1])g.box(x,y-.05,z+side*d*.5,w,.24,.23,C.woodDark);
 if(detail){
 for(let side of[-1,1]){
  for(let xx=x-w/2+.23;xx<x+w/2-.1;xx+=.58){if(hip&&Math.abs(xx-x)>w*.29)continue;
   for(let j=0;j<3;j++){let t=j/3,u=(j+1)/3;detail.tube([xx,py(t)+.105,z+side*d/2*t],[xx,py(u)+.105,z+side*d/2*u],.060,G.blend(col,C.slate2,.24),3);}}
  for(let t=.14;t<1;t+=.14){let zz=z+side*d/2*t;detail.box(x,py(t)+.05,zz,xlen(t),.045,.085,G.blend(col,C.slate2,.14));}
  for(let xx=x-w/2+.6;xx<x+w/2;xx+=.68)detail.box(xx,y-.27,z+side*(d/2-.5),.11,.12,1.15,C.timber);
 }
 }
}
function windowPanel(g,x,y,z,w,h,angle=0,col=C.paper){ // wall-parallel, local front is +Z
 let old=g.origin.slice(),a=g.angle;const pt=g.point([x,y,z]);g.place(...pt,a+angle);g.box(0,0,0,w,h,.12,C.woodDark);g.box(0,.13,.035,w-.25,h-.26,.14,col);
 for(let xx=-w/2;xx<=w/2+.01;xx+=.32)g.box(xx,0,.14,.048,h,.072,C.timber);for(let yy=.1;yy<h;yy+=.54)g.box(0,yy,.15,w,.047,.067,C.wood);
 g.place(...old,a);
}
function lantern(g,x,y,z,size=1){g.cone(x,y,z,.30*size,.28*size,.6*size,C.cream,10);g.box(x,y-.05*size,z,.38*size,.08*size,.36*size,C.woodDark);g.box(x,y+.59*size,z,.38*size,.08*size,.36*size,C.woodDark);g.tube([x,y+.63*size,z],[x,y+.96*size,z],.028*size,C.woodDark,4);}
function house(bank,opts){
  let {x,y=30,z,w=12,d=9,floors=2,yaw=0,seed=1,type='shop'}=opts;
  const isCorner=seed===424; if(isCorner){type='shop';floors=2;}
  const R=G.rng(seed), variant=isCorner?0:seed%6, isShop=type==='shop', isKura=type==='kura';
  const H=(floors===2?(isCorner?6.65:6.15):3.8)+(isKura?.30:(seed%5-2)*.13);
  const g=bank.get(x,z),det=bank.get(x,z,'roof','near');
  const fine=bank.get(x,z,'matte','near');
  g.place(x,y,z,yaw);det.place(x,y,z,yaw);fine.place(x,y,z,yaw);
  const wallColors=['#ded7bd','#cfcab4','#b9ab90','#d8d0b7','#847258','#dad7c7'];
  let plaster=G.rgb(isKura?'#e2ddc9':wallColors[seed%6]);
  let roofColor=G.blend(G.rgb('#333e40'),G.rgb(seed%3===0?'#625e52':'#566467'),R()*.40+.08);
  const front=d/2,doorX=variant%2?-w*.12:0,doorW=Math.max(1.5,w*.15),recess=1.08;
  const props=bank.props;
  const prop=(name,px,py,pz,scale=1,angle=0)=>{if(!props)return;const p=g.point([px,py,pz]);props.add(name,...p,scale,yaw+angle,[1,1,1],'frontage');};
  g.box(0,-.40,0,w+.40,.55,d+.40,C.base);
  // The storefront is physically recessed. Upper structure does not seal the openings.
  if(isShop){
    g.box(0,.14,-recess*.5,w,H,d-recess,plaster);
    g.box(0,.16,front-.52,w,.38,1.12,C.woodDark);
    g.box(0,3.01,front-.47,w,H-2.94,1.10,plaster);
    for(const xx of[-w/2+.16,w/2-.16])g.box(xx,.28,front-.51,.32,2.74,1.1,plaster);
    g.box(0,.55,front-1.095,w-.46,2.46,.035,C.shadow);
    g.box(0,3.0,front+.02,w+.20,.22,.21,C.woodDark);
  }else{
    g.box(0,.10,0,w,H,d,plaster);
  }
  // A cedar dado, structural posts and a restrained colour palette provide scale.
  for(const side of[-1,1]){
    const zz=side*(front+.04);
    if(!(isShop&&side===1))g.box(0,.19,zz,w+.06,.75,.075,C.woodDark);
    for(let xx=-w/2;xx<=w/2+.01;xx+=w/(isKura?2:4))g.box(xx,.35,zz,.16,H-.23,.14,C.wood);
    for(const hh of[3.12,H-.02])if(hh<H+.01)g.box(0,hh,zz,w+.16,.16,.13,C.wood);
  }
  for(const xx of[-w/2-.035,w/2+.035]){
    g.box(xx,.20,0,.11,.72,d,C.woodDark);
    g.box(xx,3.13,0,.14,.15,d,C.wood);
    for(const zz of[-front,0,front])g.box(xx,.3,zz,.17,H-.2,.16,C.wood);
    windowPanel(g,xx+(xx<0?-.055:.055),1.20,0,d*.27,1.26,Math.sign(xx)*Math.PI/2,C.paper);
    if(floors===2)windowPanel(g,xx+(xx<0?-.055:.055),4.22,0,d*.34,1.35,Math.sign(xx)*Math.PI/2);
  }
  if(isKura){
    g.box(0,.28,front+.10,w*.24,2.9,.18,C.woodDark);
    g.box(0,.43,front+.22,w*.23,2.58,.12,C.wood);
    for(const xx of[-w*.10,w*.10])g.box(xx,.50,front+.31,.12,2.5,.07,C.woodDark);
    for(const side of[-1,1])windowPanel(g,0,floors===2?4.6:2.28,side*(front+.06),1.22,.94,side<0?Math.PI:0,C.shadow);
  }else{
    // Solid rear, with different window proportions from the street facade.
    for(const xx of[-w*.27,w*.26])windowPanel(g,xx,1.25,-front-.07,w*.24,1.26,Math.PI);
    if(floors===2)for(const xx of[-w*.26,w*.26])windowPanel(g,xx,4.20,-front-.07,w*.27,1.27,Math.PI);
    if(!isShop){
      for(const xx of[-w*.28,w*.29])windowPanel(g,xx,1.17,front+.07,w*.28,1.46);
      g.box(doorX,.35,front+.1,doorW,2.7,.14,C.shadow);
      for(let xx=doorX-doorW/2;xx<doorX+doorW/2;xx+=.23)g.box(xx,.35,front+.2,.045,2.68,.07,C.timber);
    }
    if(floors===2){
      for(const xx of[-w*.28,w*.27]){
        const ww=w*(variant===2?.27:.31);
        windowPanel(g,xx,4.16,front+.10,ww,1.38,0,variant===4?C.shadow:C.paper);
        if(seed%3===0){g.box(xx-ww*.5-.24,4.12,front+.21,.40,1.53,.13,C.wood);g.box(xx+ww*.5+.24,4.12,front+.21,.40,1.53,.13,C.wood);}
      }
      if(variant===1||variant===4){
        g.box(0,3.80,front+.42,w-.7,.12,.90,C.woodDark);
        for(let xx=-w/2+.6;xx<w/2-.5;xx+=.58)g.box(xx,3.89,front+.78,.072,.72,.082,C.timber);
        g.box(0,4.59,front+.78,w-.8,.10,.14,C.wood);
      }
    }
  }
  g.box(0,.06,front+.59,w+.12,.25,1.34,C.wood);
  for(let xx=-w/2+.3;xx<w/2;xx+=.44)fine.box(xx,.313,front+.60,.020,.012,1.24,C.woodDark);
  g.box(doorX,-.05,front+1.48,doorW+1.0,.20,.63,C.stone);
  if(isShop){
    const cloth=G.rgb(['#435c68','#927054','#757948','#a76c50','#566c69','#8d8059'][variant]);
    const bays=[[-w*.30,w*.28],[w*.28,w*.28]];
    for(const [bx,bw]of bays){
      g.box(bx,.55,front-.24,bw,.20,1.55,C.wood);
      for(const xx of[bx-bw/2,bx+bw/2])g.box(xx,.53,front+.12,.12,2.49,.15,C.timber);
      g.box(bx,2.87,front+.12,bw,.10,.16,C.timber);
      // A shallow display room: shelving, goods and side reveals are real geometry.
      for(const hh of[.82,1.66]){
        g.box(bx,hh,front-.72,bw-.16,.10,.54,C.timber);
        for(let j=0;j<4;j++){
          const px=bx-bw*.34+j*bw*.22;
          prop(['teapot','roll','basket','jar','stackBooks','jar'][variant],px,hh+.10,front-.72,variant===2?.66:.65,0);
        }
      }
      if(variant===1||variant===4)for(let xx=bx-bw/2+.1;xx<bx+bw/2;xx+=.23)g.box(xx,.71,front+.16,.045,1.72,.08,C.wood);
      if(variant===0||variant===3){g.box(bx+bw*.33,.70,front+.19,bw*.31,2.08,.11,C.wood);for(let yy=.88;yy<2.72;yy+=.21)fine.box(bx+bw*.33,yy,front+.252,bw*.28,.018,.025,C.timber);}
    }
    g.box(doorX,.42,front-1.045,doorW,2.49,.045,C.woodDark);
    g.box(doorX+doorW*.56,.42,front+.20,.22,2.59,.18,C.timber);
    // Short, split noren: no unreadable fake text.
    for(let i=0;i<4;i++){let xx=doorX-doorW*.52+(i+.5)*doorW*.26;g.box(xx,2.28+(i%2)*.025,front+.42,doorW*.245,.63,.035,cloth);}
    g.tube([doorX-doorW*.62,2.96,front+.42],[doorX+doorW*.62,2.96,front+.42],.055,C.timber,6);
    if(variant%3===0){
      // Fabric awning with a real sloped canopy and scalloped lower edge.
      for(let i=0;i<10;i++){let a=-w/2+i*w/10,b=a+w/10;const col=i%2?G.blend(cloth,C.paper,.12):cloth;
        g.quad([a,3.28,front+.12],[b,3.28,front+.12],[b,2.82,front+1.84],[a,2.82,front+1.84],col);
        g.quad([a,2.83,front+1.84],[b,2.83,front+1.84],[b,2.60,front+1.84],[a,2.60,front+1.84],col);
      }
    }else roof(g,0,3.11,front+.63,w+1.1,2.94,.50,roofColor,det);
    for(const xx of[-w/2+.30,w/2-.30])g.box(xx,.20,front+1.69,.13,2.73,.13,C.woodDark);
    lantern(g,w/2-.53,2.03,front+1.48,.85);
    if(variant===5)for(let i=0;i<3;i++)lantern(g,-w*.31+i*.7,2.22,front+1.56,.70);
    prop('planter',-w*.45,.32,front+.6,.9);
    prop(variant===2?'basket':variant===1?'roll':'crate',-w*.32,.32,front+.65,variant===1?1.1:.75);
  }else if(seed%3!==1&&!isKura){
    roof(g,0,3.13,front+.5,w+.85,2.60,.47,roofColor,det);
    for(const xx of[-w*.4,w*.4])g.box(xx,.28,front+1.53,.14,2.85,.14,C.woodDark);
  }
  const hip=type==='hip'||(isShop&&seed%8===0),rise=(isKura?2.35:2.35+(seed%4)*.15);
  roof(g,0,H+.15,0,w+1.64,d+1.82,rise,roofColor,det,hip);
  // Selected entry gables change silhouettes without extending the building footprint.
  if(isShop&&seed%7===0){
    g.box(doorX,2.94,front+.60,doorW+1.1,.6,1.9,plaster);
    const old=g.origin.slice(),a=g.angle,pt=g.point([doorX,3.38,front+.58]);g.place(...pt,a+Math.PI/2);roof(g,0,0,0,2.2,doorW+1.55,1.0,roofColor);g.place(...old,a);
  }
  if(isCorner){
    // A corner tea-wares frontage with a wrap-around engawa. This is not Suzunaan or Geidontei.
    g.box(-w/2-.54,.08,.35,1.4,.27,d+1.3,C.wood);
    for(let zz=-d/2+.1;zz<d/2;zz+=.25)g.box(-w/2-.062,.37,zz,.07,.94,.205,C.timber);
    for(let zz=-d/2+.3;zz<d/2;zz+=.28)fine.box(-w/2-.068,5.68,zz,.08,.42,.13,C.wood);
    for(const zz of[-d/2+.8,d/2+.6])g.box(-w/2-1.01,.35,zz,.18,2.80,.18,C.woodDark);
    const old=g.origin.slice(),a=g.angle,pt=g.point([-w/2-.47,3.15,.35]);
    g.place(...pt,a+Math.PI/2);roof(g,0,0,0,d+2.0,2.7,.50,roofColor);g.place(...old,a);
    for(let i=0;i<3;i++){g.box(-w/2-.88,2.20,-d*.20+i*.95,.035,.60,.78,G.rgb('#85604d'));}
    for(const zz of[-d*.21,d*.21]){
      g.box(-w/2-.52,.91,zz,.77,.12,1.05,C.timber);
      prop('teapot',-w/2-.52,1.03,zz,.75,Math.PI/2);
      prop('stool',-w/2-.63,.35,zz+.95,.8);
    }
    for(const xx of[-w*.33,w*.31])g.box(xx,4.04,front+.30,1.65,.40,.39,C.woodDark);
    prop('planter',w*.32,4.44,front+.30,.68);
  }

  // Gable vent, gutter and rain chain are intentionally local detail, not full-wall noise.
  for(const s of[-1,1])if(!hip){
    const px=s*(w/2+.045);for(let j=-2;j<=2;j++)fine.box(px,H+.39, j*.27,.05,.49-Math.abs(j)*.065,.10,C.shadow);
  }
  if(seed%3===0){
    fine.tube([-w*.47,3.02,front+1.77],[w*.47,3.02,front+1.77],.06,C.woodDark,6);
    fine.tube([w*.47,3.04,front+1.74],[w*.47,.24,front+1.74],.034,C.stone,5);
  }
  g.place();det.place();fine.place();
  return{x,z,w,d,rx:(Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*d)/2,rz:(Math.abs(Math.sin(yaw))*w+Math.abs(Math.cos(yaw))*d)/2,y,yaw,seed,type,floors,top:y+H+rise+.40,proposal:true,frontageVariant:isShop?['tea-wares','textiles','produce','provisions','paper-goods','lanterns'][variant]:isKura?'storehouse':'residence',roofVariant:hip?'hip':'gable',recessDepth:isShop?recess:0,hero:isCorner?'corner-tea-wares':null};
}
function fence(g,x1,z1,x2,z2,y=30,h=1.7){let len=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(len/1.15));for(let i=0;i<=n;i++){let t=i/n;g.box(G.mix(x1,x2,t),y,G.mix(z1,z2,t),.13,h,.13,C.wood);}for(let yy of[.45,h-.20])g.tube([x1,y+yy,z1],[x2,y+yy,z2],.07,C.wood,4);}
function torii(g,x,y,z,w=9,yaw=0){g.place(x,y,z,yaw);for(let sx of[-1,1]){g.cone(sx*w*.35,0,0,.30,.25,w*.62,C.red,8);g.cone(sx*w*.35,-.1,0,.43,.39,.65,C.stone,8);}g.box(0,w*.45,0,w*.9,.27,.34,C.red);g.box(0,w*.60,0,w*1.06,.44,.68,C.red);g.box(0,w*.65,0,w*1.15,.17,.8,C.woodDark);g.box(0,w*.46,0,.38,w*.14,.16,C.gold);g.place();}
Object.assign(G,{C,roof,windowPanel,lantern,house,fence,torii});
})(globalThis.GA);
GA.bounds=(x,y,z,r)=>({center:[x,y,z],radius:r});
GA.Geometry.prototype.roof=function(x,y,z,w,d,h,c){GA.roof(this,x,y,z,w,d,h,c);};

/* v0.4: shared, instanced street objects. No images or third-party models.
   Each record is an ordinary P prop, not an assertion about a named canon shop. */
(function (G) {
  'use strict';
  const { C, rgb, blend } = G;
  const definitions = new Map();
  function propGeometry(type) {
    if (definitions.has(type)) return definitions.get(type);
    const g = new G.Geometry();
    const ceramic = rgb('#b4b6a5'), terracotta = rgb('#98694f');
    if (type === 'jar' || type === 'teapot') {
      g.cone(0, 0, 0, .20, .33, .27, ceramic, 10);
      g.cone(0, .27, 0, .33, .23, .27, ceramic, 10);
      g.cone(0, .54, 0, .23, .18, .12, C.woodDark, 10);
      if (type === 'teapot') {
        g.cone(0, .59, 0, .22, .13, .10, ceramic, 10);
        g.ellipsoid(0,.72,0,.08,.08,.08,C.wood,6,3);
        g.tube([.21,.20,0],[.48,.45,0],.10,ceramic,7,.06);
        for(let i=0;i<7;i++){let a=-1.1+i*.37,b=a+.37;g.tube([-.22-.22*Math.cos(a),.32+.24*Math.sin(a),0],[-.22-.22*Math.cos(b),.32+.24*Math.sin(b),0],.035,C.wood,5);}
      }
    } else if (type === 'crate') {
      const w=1.15,d=.85;
      g.box(0,0,0,w,.08,d,C.woodDark);
      for(const z of[-d/2,d/2])for(let y=.1;y<.65;y+=.16)g.box(0,y,z,w,.12,.07,C.timber);
      for(const x of[-w/2,w/2])for(let y=.1;y<.65;y+=.16)g.box(x,y,0,.07,.12,d,C.timber);
      for(const x of[-.51,.51])for(const z of[-.38,.38])g.box(x,0,z,.10,.70,.10,C.wood);
    } else if(type==='barrel') {
      g.cone(0,0,0,.39,.46,.43,C.timber,12);
      g.cone(0,.43,0,.46,.39,.43,C.timber,12);
      for(const y of[.08,.31,.62,.80])g.cone(0,y,0,y<.2||y>.75?.411:.462,y<.2||y>.75?.411:.462,.05,C.woodDark,12);
      g.cone(0,.85,0,.37,.37,.03,C.wood,12);
      for(let i=-2;i<=2;i++)g.box(i*.12,.882,0,.017,.014,.61,C.woodDark);
    } else if(type==='basket') {
      g.cone(0,0,0,.30,.48,.40,C.timber,12);
      g.cone(0,.36,0,.49,.49,.08,C.paper,12);
      g.cone(0,.39,0,.39,.39,.012,C.woodDark,12);
      for(let i=0;i<7;i++){const a=i*2.4,r=i?.27:0;g.ellipsoid(Math.cos(a)*r,.45,Math.sin(a)*r,.13,.12,.13,i%3?C.leaf:rgb('#ad7950'),6,3);}
    } else if(type==='planter') {
      g.cone(0,0,0,.21,.32,.35,terracotta,8);g.cone(0,.33,0,.33,.33,.07,terracotta,8);
      g.cone(0,.38,0,.28,.28,.015,C.woodDark,8);
      for(let i=0;i<7;i++){let a=i*2.4;const p=[.12*Math.cos(a),.5+(i%3)*.13,.12*Math.sin(a)];g.tube([0,.38,0],p,.015,C.leaf,3);g.ellipsoid(p[0],p[1],p[2],.18,.10,.13,G.blend(C.leaf,rgb('#98a75c'),(i%3)*.2),5,2);}
    } else if(type==='shrub') {
      for(let i=0;i<11;i++){const a=i*2.4,r=(i%3)*.29;g.ellipsoid(Math.cos(a)*r,.35+(i%3)*.12,Math.sin(a)*r,.48,.33,.43,blend(rgb('#496548'),rgb('#809152'),(i%4)*.20),6,3);}
    } else if(type==='stone') {
      g.ellipsoid(0,.28,0,.6,.37,.45,rgb('#92988a'),7,3);
      g.ellipsoid(.24,.39,-.04,.29,.25,.24,rgb('#a7aa95'),5,2);
    } else if(type==='sack') {
      g.ellipsoid(0,.40,0,.40,.43,.30,C.paper,8,4);
      g.cone(0,.78,0,.11,.08,.13,C.paper,7);g.cone(0,.79,0,.12,.12,.045,C.woodDark,7);
    } else if(type==='stool') {
      g.box(0,.46,0,.78,.12,.46,C.timber);for(const x of[-.26,.26])for(const z of[-.15,.15])g.box(x,0,z,.08,.47,.08,C.woodDark);
    } else if(type==='roll') {
      g.tube([-.40,.15,0],[.40,.15,0],.16,rgb('#b6a781'),9);
      g.cone(-.43,0,0,.03,.03,.34,C.wood,5);
    } else if(type==='stackBooks') {
      for(let i=0;i<4;i++){
        let y=.11*i,w=.78-(i%2)*.11;g.box(0,y,0,w,.095,.52,C.paper);
        for(const dy of[0,.09])g.box(0,y+dy,0,w+.025,.018,.55,i%2?C.indigo:C.red);
        for(const x of[-.23,.23])g.box(x,y+.108,-.21,.06,.01,.07,C.cream);
      }
    }
    const vertices=g.mesh('prop-'+type,'town').vertices;
    if (!vertices.length) throw new Error('Unknown prop: '+type);
    definitions.set(type, vertices);return vertices;
  }
  class PropInstances {
    constructor(){this.groups=new Map();this.counts={};this.records=[];}
    add(type,x,y,z,scale=1,yaw=0,colour=[1,1,1],tag='street') {
      const key=type+':'+Math.floor(x/128)+':'+Math.floor(z/128);
      if(!this.groups.has(key))this.groups.set(key,{type,matrices:[],colors:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
      const item=this.groups.get(key);item.matrices.push(...G.instanceMatrix(x,y,z,scale,scale,scale,yaw));item.colors.push(...colour);
      for(let k=0;k<3;k++){const v=[x,y,z][k];item.min[k]=Math.min(item.min[k],v-scale*2);item.max[k]=Math.max(item.max[k],v+scale*2);}
      this.counts[type]=(this.counts[type]||0)+1;this.records.push({type,x,y,z,scale,tag});
    }
    meshes(){return [...this.groups].map(([key,b])=>({id:'props:'+key,group:'town',material:'matte',lod:'props',vertices:propGeometry(b.type),instances:new Float32Array(b.matrices),instanceColors:new Float32Array(b.colors),center:b.min.map((x,i)=>(x+b.max[i])/2),radius:G.length(G.sub(b.max,b.min))/2}));}
  }
  Object.assign(G,{PropInstances,propGeometry});
})(globalThis.GA);

/* Human Village iteration 02. Parcel boundaries, service lanes and ordinary shop
   trades are P proposals. Stable house/region coordinates are deliberately retained. */
(function(G){
'use strict';
const {C,rgb,blend}=G;
function refineVillage(bank,houses,plantSites,gardens,terrain,roadsX,roadsZ){
 const props=bank.props,R=G.rng(402611),features=[],lanes=[];
 const grass=rgb('#73815a'),gravel=rgb('#bcb6a1'),soil=rgb('#685945');
 const obstructs=(x,z,w,d,margin=.65)=>houses.some(h=>Math.abs(x-h.x)<w/2+h.rx+margin&&Math.abs(z-h.z)<d/2+h.rz+margin);
 const touchesWater=(x,z,w,d)=>[-d/2,0,d/2].some(dz=>Math.abs(x-G.canalCenter(z+dz))-w/2<G.canalWidth(z+dz)+3.2);
 const free=(x,z,w,d)=>Math.abs(x)+w/2<227&&Math.abs(z)+d/2<225&&!obstructs(x,z,w,d)&&!touchesWater(x,z,w,d)&&
  !roadsZ.some(v=>Math.abs(z-v)<d/2+4.5)&&!roadsX.some(v=>Math.abs(x-v)<w/2+4.1)&&
  !(x+w/2>-57&&x-w/2<0&&z+d/2>-9&&z-d/2<59)&&
  !gardens.some(g=>Math.abs(x-g.x)<(w+g.w)/2+.9&&Math.abs(z-g.z)<(d+g.d)/2+.9)&&!(Math.abs(x+151)<w/2+4&&Math.abs(z-54)<d/2+4);
 function wall(g,x1,z1,x2,z2,height=1.25,style=0){
  const len=Math.hypot(x2-x1,z2-z1);if(len<.08)return;
  if(style===1){G.fence(g,x1,z1,x2,z2,30,height);return;}
  const yaw=Math.atan2(x2-x1,z2-z1),mx=(x1+x2)/2,mz=(z1+z2)/2;
  g.place(mx,30,mz,yaw);g.box(0,.04,0,.44,.28,len+.15,C.base);g.box(0,.32,0,.28,height-.32,len,style===2?C.timber:rgb('#c5c2ae'));
  g.box(0,height,0,.54,.10,len+.32,C.slate);g.box(0,height+.10,0,.35,.065,len+.20,C.slate2);
  for(let zz=-len/2;zz<len/2+.1;zz+=2.5)g.box(0,.29,zz,.33,height-.24,.12,C.wood);
  g.place();
 }
 // Replace bare turf directly in front of every building by a usable apron.
 for(const h of houses){
  let g=bank.get(h.x,h.z,'paving');g.place(h.x,30,h.z,h.yaw);
  g.box(0,.025,h.d/2+2.62,h.w+.9,.052,3.5,gravel);
  g.box(0,.085,h.d/2+4.25,h.w+.6,.07,.20,C.base);
  for(let j=-h.w/2;j<h.w/2;j+=1.5)g.box(j,.16,h.d/2+4.25,.82,.035,.25,C.stoneLight);
  g.place();
 }
 // Stable parcel planning: try different rear-yard depths, never cover a street.
 for(const h of houses){
  const rot=new G.Geometry().place(h.x,30,h.z,h.yaw);let chosen;
  for(const depth of[9.2,7.0,5.2]){
   const width=h.w*.93,p=rot.point([0,0,-h.d/2-1.0-depth/2]);
   const w=Math.abs(Math.cos(h.yaw))*width+Math.abs(Math.sin(h.yaw))*depth,d=Math.abs(Math.sin(h.yaw))*width+Math.abs(Math.cos(h.yaw))*depth;
   if(free(p[0],p[2],w,d)){chosen={x:p[0],z:p[2],w,d,depth,width};break;}
  }
  if(!chosen)continue;
  const a=chosen,kind=['tsubo','kitchen','dye','storage','tea'][h.seed%5];
  gardens.push({...a,owner:h.seed,style:kind,basis:'P'});
  features.push({id:'yard-'+h.seed,type:'courtyard',style:kind,x:a.x,z:a.z,basis:'P'});
  // Separate soil, gravel and stone, instead of green rectangles under everything.
  const g=bank.get(a.x,a.z),pave=bank.get(a.x,a.z,'paving');
  g.box(a.x,30.035,a.z,a.w,.10,a.d,kind==='kitchen'?grass:gravel);
  wall(g,a.x-a.w/2,a.z-a.d/2,a.x+a.w/2,a.z-a.d/2,1.15,h.seed%3);
  wall(g,a.x-a.w/2,a.z-a.d/2,a.x-a.w/2,a.z+a.d/2,1.20,h.seed%3);
  wall(g,a.x+a.w/2,a.z-a.d/2,a.x+a.w/2,a.z+a.d/2,1.20,h.seed%3);
  // Gate cut-out remains 1.6m wide rather than a solid wall around the lot.
  wall(g,a.x-a.w/2,a.z+a.d/2,a.x-.90,a.z+a.d/2,1.05,h.seed%3);
  wall(g,a.x+.90,a.z+a.d/2,a.x+a.w/2,a.z+a.d/2,1.05,h.seed%3);
  for(let i=0;i<Math.floor(a.d/1.3);i++)props.add('stone',a.x,30.14,a.z-a.d/2+.75+i*1.3,.57,.18*(i%3),[1,1,1],'path');
  const left=a.x-a.w*.26,right=a.x+a.w*.26;
  for(const zz of[-.30,.30])props.add('shrub',right,30.12,a.z+a.d*zz,.82,0,[1,1,1],'garden');
  if(kind==='kitchen'){
   for(let j=0;j<3;j++){const zz=a.z-a.d*.32+j*a.d*.28;g.box(left,30.14,zz,a.w*.30,.12,.75,soil);
    for(let k=0;k<5;k++)g.ellipsoid(left-a.w*.11+k*a.w*.055,30.42,zz,.20,.24,.24,C.leaf,5,2);}
   props.add('barrel',right,30.14,a.z,1,0,[1,1,1],'garden');
  }else if(kind==='dye'){
   for(const zz of[-a.d*.28,a.d*.28])g.box(left,30.1,a.z+zz,.13,2.3,.13,C.wood);
   g.tube([left,32.42,a.z-a.d*.30],[left,32.42,a.z+a.d*.30],.075,C.wood,6);
   for(let j=0;j<3;j++){const zz=a.z-a.d*.22+j*a.d*.22;g.box(left,30.94,a.z-a.d*.22+j*a.d*.22,.035,1.47,a.d*.18,j%2?C.paper:C.indigo);}
   props.add('barrel',right,30.14,a.z,1,0,[1,1,1],'garden');
  }else if(kind==='storage'){
   for(let j=0;j<3;j++)props.add('crate',left,30.15,a.z-1.1+j*.99,1,.03*j,[1,1,1],'garden');
   props.add('sack',right,30.15,a.z,1.1,0,[1,1,1],'garden');
   props.add('barrel',right,30.15,a.z-.95,1.0,0,[1,1,1],'garden');
  }else{
   // Tsubo-niwa: a low water basin, stone grouping and a planted corner.
   g.cone(left,30.18,a.z,.55,.65,.6,C.stone,8);g.cone(left,30.76,a.z,.48,.48,.035,C.shadow,10);
   for(let j=0;j<3;j++)props.add('stone',left+(j-1)*.75,30.18,a.z-1.40,(j===1?.8:.5),j*.8,[1,1,1],'garden');
   if(kind==='tea'){g.box(left,30.59,a.z+1.56,2.25,.13,.60,C.wood);for(const dx of[-.8,.8])g.box(left+dx,30.1,a.z+1.56,.14,.49,.43,C.woodDark);}
  }
  const tree={x:right,z:a.z,type:kind==='tsubo'?'cherry':'broadleaf',scale:.46+R()*.16};
  if(a.w>8&&a.d>6&&!plantSites.some(p=>Math.hypot(p.x-tree.x,p.z-tree.z)<5.5))plantSites.push(tree);
 }
 // Service lanes between rear yards: a continuous slim surface links back doors.
 for(const z of[-126,-64,0,65,127,190])for(let x=-195;x<190;x+=3){
  if(obstructs(x,z,2.92,1.45,.3)||touchesWater(x,z,3,2)||gardens.some(g=>Math.abs(x-g.x)<g.w/2+1.5&&Math.abs(z-g.z)<g.d/2+.7)||G.inPlaza(x,z))continue;
  const g=bank.get(x,z,'paving');g.box(x,30.045,z,2.98,.05,1.6,G.blend(gravel,soil,.12));lanes.push([x,z]);
 }
 // Market square: shade canopy, purposeful tables and stock at the four stalls.
 for(let i=0;i<4;i++){
  const x=-49,z=4+i*11,g=bank.get(x,z),cloth=i%2?C.indigo:C.red;
  // Pitched cloth, valance and diagonal corner braces replace a flat-box roof.
  g.quad([x-2.6,32.70,z-1.65],[x+2.6,32.70,z-1.65],[x+2.6,33.17,z],[x-2.6,33.17,z],cloth);
  g.quad([x-2.6,33.17,z],[x+2.6,33.17,z],[x+2.6,32.7,z+1.65],[x-2.6,32.7,z+1.65],cloth);
  for(const sx of[-1,1])g.tube([x+sx*2.05,32.15,z+1.19],[x+sx*1.40,32.70,z+1.19],.055,C.wood,5);
  for(let j=0;j<4;j++)props.add(['basket','teapot','roll','stackBooks'][i],x-1.52+j*.95,31.73,z, i===0?.75:.95,0,[1,1,1],'market');
  props.add('crate',x-1.0,30.1,z-2.35,1,0,[1,1,1],'market');
 }
 // Tea platform at the edge of the market; the cross-street at z=32 stays clear.
 {const x=-29,z=44,g=bank.get(x,z),w=9,d=5;
  g.box(x,30.08,z,w,.22,d,C.wood);for(let xx=x-w/2+.15;xx<x+w/2;xx+=.36)g.box(xx,30.31,z,.020,.013,d-.1,C.woodDark);
  for(const sx of[-1,1])for(const sz of[-1,1])g.box(x+sx*(w/2-.25),30.3,z+sz*(d/2-.20),.15,2.9,.15,C.woodDark);
  for(let j=0;j<14;j++)g.box(x-w/2+j*w/13,33.18,z,.13,.14,d+.50,C.timber);
  for(const sz of[-1,1])g.box(x,33.02,z+sz*(d/2-.22),w+.5,.22,.18,C.wood);
  for(const dx of[-2.4,2.3]){g.box(x+dx,30.36,z,1.65,.75,1.15,C.woodDark);g.box(x+dx,31.11,z,1.86,.12,1.32,C.timber);props.add('teapot',x+dx,31.23,z,.66,0,[1,1,1],'tea-court');for(const sz of[-1.3,1.3])props.add('stool',x+dx,30.32,z+sz,1.05,0,[1,1,1],'tea-court');}
  features.push({id:'market-tea-pergola',type:'pergola',x,z,w,d,basis:'P'});
 }
 // A second, smaller market structure creates a legible shop-to-square transition.
 {const x=-35,z=10,g=bank.get(x,z),w=6.7,d=4.2;
  g.box(x,30.12,z,w+.8,.30,d+.8,C.wood);
  for(const sx of[-1,1])for(const sz of[-1,1])g.box(x+sx*(w/2-.16),30.42,z+sz*(d/2-.10),.18,2.8,.18,C.woodDark);
  g.box(x,31.10,z+.7,w-.5,.60,1.1,C.wood);g.box(x,31.70,z+.7,w-.20,.12,1.26,C.timber);
  G.roof(g,x,33.15,z,w+1.25,d+1.50,1.08,C.slate,bank.get(x,z,'roof','near'));
  for(let j=0;j<6;j++){props.add(j%2?'teapot':'jar',x-2.6+j*1.03,31.83,z+.70,.9,0,[1,1,1],'pottery-pavilion');}
  for(const xx of[-2.6,2.6]){props.add('crate',x+xx,30.43,z-.75,1,0,[1,1,1],'pottery-pavilion');G.lantern(g,x+xx,32.11,z+2.5,.85);}
  features.push({id:'market-pottery-pavilion',type:'pavilion',x,z,w,d,basis:'P'});
 }
 // The cherry tree has a planted bed and low seating, rather than a trunk in paving.
 {const x=-18,z=13,g=bank.get(x,z);g.box(x,30.18,z,8.2,.16,7.4,grass);
  for(const sz of[-1,1]){g.box(x,30.20,z+sz*3.8,8.6,.30,.38,C.stone);g.box(x,30.55,z+sz*3.8,7.2,.10,.70,C.wood);}
  for(const sx of[-1,1])g.box(x+sx*4.2,30.20,z,.38,.30,7.5,C.stone);
  for(let i=0;i<10;i++){const a=i*2.4;props.add('shrub',x+Math.cos(a)*2.6,30.38,z+Math.sin(a)*2.2,.57,0,[1,1,1],'market-tree-bed');}
  for(const dx of[-2.2,2.2])props.add('stone',x+dx,30.38,z+.9,.75,dx,[1,1,1],'market-tree-bed');
 }
 // One simple hand-cart is parked behind the stalls, outside the bridge approach.
 {const x=-44,z=52,g=bank.get(x,z);
  g.box(x,30.52,z,2.4,.14,1.5,C.wood);for(const sz of[-1,1])g.tube([x-1.2,30.55,z+sz*.55],[x+2.0,30.70,z+sz*.55],.055,C.timber,5);
  for(const sz of[-1,1]){let centre=[x-.2,30.46,z+sz*.9];for(let j=0;j<12;j++){let a=j/12*6.283,b=(j+1)/12*6.283;
   g.tube([centre[0]+Math.cos(a)*.42,centre[1]+Math.sin(a)*.42,centre[2]],[centre[0]+Math.cos(b)*.42,centre[1]+Math.sin(b)*.42,centre[2]],.04,C.woodDark,4);
   if(j%2===0)g.tube(centre,[centre[0]+Math.cos(a)*.40,centre[1]+Math.sin(a)*.40,centre[2]],.021,C.timber,4);}}
  for(const dx of[-.67,.40])props.add('sack',x+dx,30.67,z,1.0,0,[1,1,1],'market-cart');
  features.push({id:'market-cart',type:'cart',x,z,basis:'P'});
 }

 // Planned tree beds: grounded rings and underplanting, not trees planted in road slabs.
 for(const p of plantSites){
  if(Math.abs(p.x)>255||Math.abs(p.z)>237)continue;
  if(gardens.some(a=>Math.abs(p.x-a.x)<a.w/2&&Math.abs(p.z-a.z)<a.d/2))continue;
  if(obstructs(p.x,p.z,2.3,2.3,1)||touchesWater(p.x,p.z,2.8,2.8)||G.roadDistance(p.x,p.z)<5)continue;
  const g=bank.get(p.x,p.z);g.cone(p.x,30.03,p.z,1.15,1.15,.12,soil,10);
  for(let i=0;i<7;i++){let a=i/7*6.283;props.add('shrub',p.x+Math.cos(a)*1.0,30.10,p.z+Math.sin(a)*1.0,.40,0,[1,1,1],'tree-bed');}
 }
 // Riverbank handrails break into accessible gaps at the landing steps and bridges.
 for(const side of[-1,1])for(let z=-226;z<226;z+=3.1){
  if([-158,32,164,-81,94].some(p=>Math.abs(z-p)<8))continue;
  const x=G.canalCenter(z)+side*(G.canalWidth(z)+1.7),x2=G.canalCenter(z+3.1)+side*(G.canalWidth(z+3.1)+1.7),g=bank.get(x,z);
  g.box(x,30.16,z,.16,1.02,.16,C.woodDark);for(const yy of[30.58,31.13])g.tube([x,yy,z],[x2,yy,z+3.1],.057,C.wood,5);
 }
 // Jetty goods sit on the existing landing deck, not in the canal or on its stairs.
 for(const z of[-81,94]){let x=G.canalCenter(z)-G.canalWidth(z)+3.4;
  props.add('crate',x,27.04,z-.8,.72,0,[1,1,1],'landing');props.add('barrel',x,27.04,z+.55,.65,0,[1,1,1],'landing');}
 return{iteration:2,parcelCount:gardens.length,features,serviceLaneSegments:lanes.length,propCounts:{...props.counts},propRecords:props.records,basis:'P: local town-planning and ordinary architecture, no new canon locations'};
}
Object.assign(G,{refineVillage});
})(globalThis.GA);

/* All geometry here is disposable M1 silhouette massing, not architectural reconstruction. */
(function(G){
'use strict';
const {rgb}=G,C={wood:rgb('#665c4d'),wall:rgb('#e1d8bc'),roof:rgb('#4c686b'),stone:rgb('#aaad9e'),red:rgb('#a75c50'),white:rgb('#f0e6ca')};
function house(g,x,y,z,w=16,d=13,h=7,roof=C.roof,wall=C.wall){g.box(x,y,z,w,h,d,wall);g.roof(x,y+h,z,w+3,d+3,h*.62,roof);}
function torii(g,x,y,z,w=11,h=9){g.box(x-w*.36,y,z,.72,h,1,C.red);g.box(x+w*.36,y,z,.72,h,1,C.red);g.box(x,y+h-2.2,z,w,.7,.8,C.red);g.box(x,y+h-.4,z,w+1.5,.9,1.2,C.wood);}
function shrine(g,x,y,z,big=false){const w=big?28:18,d=big?22:14;g.box(x,y,z,w+5,1.8,d+7,C.stone);house(g,x,y+1.8,z,w,d,big?8:6,C.roof);g.box(x,y+1.8,z+d/2+2,w,3.3,3.5,C.wood);g.roof(x,y+5.1,z+d/2+2,w+3,6,1.6,C.roof);for(let i=0;i<4;i++)g.box(x,y+i*.45,z+d/2+10-i*1.1,6,.45,2.3,C.stone);torii(g,x,y,z+d/2+27,big?15:11,big?12:9);if(big){for(const dx of [-31,31])for(const dz of [-28,30])g.cone(x+dx,y,z+dz,1.6,1.1,22,C.wood,8);}}
function buildLandmarks(terrain,catalog){const out=[],footprints=[],add=(id,fn,r=130)=>{const p=catalog.placements.get(id),g=new G.Geometry(),y=terrain.height(p.x,p.z);fn(g,p.x,y,p.z);out.push(g.mesh('building-'+id,'buildings',{...G.bounds(p.x,y+12,p.z,r),locationId:id,massing:true}));};
add('moriya',(g,x,y,z)=>{g.box(x,y-.6,z+10,110,.8,104,rgb('#c7c9b3'));shrine(g,x,y+.3,z,true);});footprints.push({id:'moriya',x:100,z:-1350,rx:62,rz:62});
add('kourindou',(g,x,y,z)=>{house(g,x-6,y,z,18,15,7);house(g,x+11,y,z-5,10,13,10,C.roof,rgb('#d8d5c7'));g.box(x+3,y,z+5,7,4,4,C.wood);});footprints.push({id:'kourindou',x:-560,z:0,rx:29,rz:23});
add('alice',(g,x,y,z)=>{house(g,x,y,z,20,16,8,C.roof,rgb('#dacdc1'));g.box(x+11,y,z-3,7,13,8,C.wall);g.roof(x+11,y+13,z-3,10,11,5,C.roof);});footprints.push({id:'alice',x:-1140,z:-260,rx:30,rz:30});
add('marisa',(g,x,y,z)=>{house(g,x,y,z,18,16,7,rgb('#6c5d62'));g.box(x-4,y+9,z-3,2.6,6,2.6,C.stone);});footprints.push({id:'marisa',x:-1000,z:140,rx:28,rz:28});
add('eientei',(g,x,y,z)=>{g.box(x,y-1,z,130,1,90,rgb('#acb083'));house(g,x,y,z-17,77,18,7,rgb('#78715d'));house(g,x-37,y,z+7,16,42,6,rgb('#78715d'));house(g,x+37,y,z+7,16,42,6,rgb('#78715d'));g.box(x,y,z+25,69,3,4,C.wood);g.roof(x,y+3,z+25,72,7,1.5,C.roof);},130);footprints.push({id:'eientei',x:690,z:1440,rx:74,rz:51});
add('ropeway_lower',(g,x,y,z)=>{house(g,x,y,z,14,12,6);g.box(x,y+5,z,3,4,3,C.wood);});footprints.push({id:'ropeway_lower',x:70,z:-390,rx:19,rz:19});
add('wind_cave',(g,x,y,z)=>{g.box(x,y-1,z,24,12,14,rgb('#767d73'));g.box(x,y,z+7.15,11,8,1,rgb('#343f38'));});footprints.push({id:'wind_cave',x:-440,z:-520,rx:20,rz:16});
add('muenzuka',(g,x,y,z)=>{for(let i=0;i<6;i++){const dx=(i%3-1)*7,dz=Math.floor(i/3)*10;g.box(x+dx,y,z+dz,2.3,3.8,1.3,C.stone);}g.cone(x-15,y,z-9,1.7,1,12,C.wood);g.cone(x-15,y+7,z-9,11,7,9,rgb('#c4a9af'),9);});footprints.push({id:'muenzuka',x:-1730,z:575,rx:32,rz:30});
return{meshes:out,footprints};}
Object.assign(G,{buildRegionalLandmarks:buildLandmarks});
})(globalThis.GA);
/* Human Village, iteration 02. The town plan, canal course, bridge forms and ordinary houses are P. */
(function(G){'use strict';const {C,rgb,blend,canalCenter:cx,canalWidth:cw}=G;
const ROAD_Z=[-158,-96,-34,32,98,164], ROAD_X=[-207,-134,-60,110,188];
function inPlaza(x,z){return x>-57&&x<0&&z>-9&&z<59;}
function roadDistance(x,z){let d=Math.min(...ROAD_Z.map(v=>Math.abs(z-v)),...ROAD_X.map(v=>Math.abs(x-v)));d=Math.min(d,Math.abs(Math.abs(x-cx(z))-cw(z)-6));return d;}
function buildVillage(terrain){const bank=new G.BatchBank(),houses=[],R=G.rng(30261);let seed=321; bank.props=new G.PropInstances();
 function add(o){houses.push(G.house(bank,{...o,seed:seed++}));}
 function available(x,z,w,d){if(inPlaza(x,z))return false;if(Math.abs(x-cx(z))<cw(z)+d*.55+17)return false;return !houses.some(h=>Math.abs(x-h.x)<(w+h.w)*.48+1.2&&Math.abs(z-h.z)<(d+h.d)*.48+1.2);}
 // Paired frontages face real streets; block interiors remain alleys and gardens.
 for(let ri=0;ri<ROAD_Z.length-1;ri++){
  let road=ROAD_Z[ri];for(let side of[-1,1]){
   for(let x=-191;x<193;x+=16.7+(R()-.5)*2.5){let d=9+R()*2,w=12.2+R()*2.8,z=road+side*(8+d/2);if(z<-192||z>188)continue;if(ROAD_X.some(rx=>Math.abs(x-rx)<w*.5+4))continue;if(!available(x,z,w,d))continue;
    add({x,y:30,z,w,d,floors:R()>.25?2:1,yaw:side>0?Math.PI:0,type:R()>.18?'shop':'kura'});
   }
  }
 }
 // Gentle irregularity in residential blocks, not a grid of identical boxes.
 for(let z of[-189,-124,-62,0,65,128,190])for(let x=-190;x<195;x+=23){let xx=x+(R()-.5)*3,zz=z+(R()-.5)*3,w=10.5+R()*3,d=8.5+R()*2;
 if(ROAD_X.some(rx=>Math.abs(xx-rx)<w*.5+5)||!available(xx,zz,w,d))continue;add({x:xx,z:zz,w,d,yaw:R()>.5?0:Math.PI,floors:R()>.62?2:1,type:R()>.3?'house':'hip'});}
 // The last southern frontage makes the town continue behind the camera.
 for(let x=-190;x<190;x+=20){let z=183;if(available(x,z,13,10)&&!ROAD_X.some(rx=>Math.abs(x-rx)<11))add({x,z,w:13,d:10,yaw:Math.PI,type:'house',floors:2});}
 // Narrow riverfront shop parcels face the promenade, rather than leaving an empty strip.
 let riverfrontCount=0;
 for(let side of[-1,1])for(let z=-186;z<192;z+=26){let w=10.5,d=7.3,x=cx(z)+side*(cw(z)+14.3),rx=d/2,rz=w/2;
 if(ROAD_Z.some(r=>Math.abs(z-r)<rz+6)||inPlaza(x,z)||houses.some(h=>Math.abs(x-h.x)<rx+h.rx+2.7&&Math.abs(z-h.z)<rz+h.rz+2.7))continue;
 add({x,z,w,d,yaw:side<0?Math.PI/2:-Math.PI/2,floors:riverfrontCount%4===0?1:2,type:'shop'});riverfrontCount++;}
 // Street slabs, kerbs and drainage strips follow their actual block footprint.
 const street=bank.get(0,0,'paving');
 for(let z of ROAD_Z){for(let x=-223;x<221;x+=4){if(Math.abs(x-cx(z))<cw(z)+.9)continue;street.box(x,30.03,z,3.98,.06,7.0,rgb('#b9b099'));}for(let sign of[-1,1])for(let x=-219;x<216;x+=2.8){if(Math.abs(x-cx(z))<cw(z)+1)continue;street.box(x,30.08,z+sign*3.85,2.65,.14,.45,C.stone);}}
 for(let x of ROAD_X)for(let z=-198;z<199;z+=4){if(Math.abs(x-cx(z))<cw(z)+.9)continue;street.box(x,30.015,z,6.2,.06,3.98,rgb('#b4aa92'));}
 for(let z=-232;z<232;z+=2){for(let side of[-1,1]){let xx=cx(z)+side*(cw(z)+5.5),next=cx(z+2)+side*(cw(z+2)+5.5);street.quad([xx-3,30.14,z],[xx-3+(next-xx),30.14,z+2],[next+3,30.14,z+2],[xx+3,30.14,z],rgb('#b8b6a1'));}}
 // The market plaza opens the dense facades and provides a believable focal point.
 street.box(-29,30.09,25,44,.16,49,rgb('#bcb7a2'));for(let zz=2;zz<50;zz+=4)street.box(-29,30.175,zz,42,.012,.075,C.stone);
 function stall(x,z,cloth){let g=bank.get(x,z);for(let xx of[-2.1,2.1])for(let zz of[-1.2,1.2])g.box(x+xx,30,z+zz,.13,2.65,.13,C.wood);g.box(x,30.7,z,4.5,.9,1.8,C.wood);g.box(x,32.66,z,5.0,.10,3.4,cloth);for(let j=0;j<7;j++)g.box(x-2.1+j*.65,31.65,z,.49,.11+(j%3)*.10,.8,j%2?C.paper:C.leaf);G.lantern(g,x+2,32,z+1.1,.8);}
 for(let i=0;i<4;i++)stall(-49,4+i*11,i%2?C.indigo:C.red);
 // Covered well, benches and stone planter — individual modelled structures.
 {let g=bank.get(-22,28);g.cone(-22,30,28,1.5,1.5,.9,C.stone,12);g.cone(-22,30.9,28,1.1,1.1,.10,C.shadow,12);for(let x of[-23.4,-20.6])g.box(x,30,28,.19,3.3,.19,C.wood);G.roof(g,-22,33.2,28,4.5,3.8,.95,C.slate);for(let zz of[3,49]){g.box(-17,30.48,zz,6,.17,1,C.wood);for(let xx of[-19,-15])g.box(xx,30.05,zz,.25,.5,.7,C.woodDark);}}
 // Continuous masonry embankments, stepped coping, promenades and mooring stairs.
 for(let side of[-1,1])for(let z=-254;z<253;z+=2.75){let x=cx(z)+side*(cw(z)+.3),g=bank.get(x,z);let yaw=-Math.atan((cx(z+1)-cx(z-1))/2);g.place(x,0,z,yaw);
 for(let row=0;row<5;row++){let col=blend(C.stone,C.base,(row%2)*.14);g.box(0,26.8+row*.58,0,1.08,.55,2.69,col);}
 g.box(0,29.82,0,1.46,.35,2.69,C.stoneLight);g.place();}
 function woodBridge(z){let x=cx(z),half=cw(z)+5,g=bank.get(x,z);for(let xx=-half;xx<half;xx+=.50){let y=30.22+1.0*(1-(xx/half)**2);g.box(x+xx,y,z,.47,.19,6.2,C.timber);}
 for(let side of[-1,1]){let last=null;for(let xx=-half;xx<=half;xx+=2.4){let y=30.40+1.0*(1-(xx/half)**2);g.box(x+xx,y,z+side*2.72,.18,1.12,.18,C.woodDark);if(last)for(let off of[.46,1.07])g.tube([last[0],last[1]+off,z+side*2.72],[x+xx,y+off,z+side*2.72],.075,C.wood,4);last=[x+xx,y];}}
 for(let side of[-1,1])for(let dx of[-half*.47,half*.47])g.box(x+dx,24.4,z+side*2.0,.55,6.3,.62,C.woodDark);for(let zz of[-1.9,1.9])g.box(x,29.9,z+zz,half*2,.52,.35,C.woodDark);}
 woodBridge(-158);woodBridge(164);
 function stoneBridge(z){let x=cx(z),half=cw(z)+4.4,g=bank.get(x,z);const top=u=>30.16+2.35*(1-(u/half)**2),under=u=>27.0+3.63*(1-(u/(half-.7))**2);
 for(let i=0;i<52;i++){let a=-half+2*half*i/52,b=-half+2*half*(i+1)/52;let ya=top(a),yb=top(b),ua=Math.min(ya-.6,under(a)),ub=Math.min(yb-.6,under(b));for(let s of[-1,1])g.quad([x+a,ua,z+s*4.6],[x+b,ub,z+s*4.6],[x+b,yb,z+s*4.6],[x+a,ya,z+s*4.6],blend(C.stone,C.stoneLight,i%3*.08));g.quad([x+a,ya,z+4.6],[x+b,yb,z+4.6],[x+b,yb,z-4.6],[x+a,ya,z-4.6],C.stoneLight);g.quad([x+a,ua,z-4.6],[x+b,ub,z-4.6],[x+b,ub,z+4.6],[x+a,ua,z+4.6],C.base);}
 for(let side of[-1,1]){let last=null;for(let xx=-half;xx<=half+.1;xx+=2.4){let y=top(xx)+.12;g.box(x+xx,y,z+side*4.14,.28,1.18,.28,C.stone);g.box(x+xx,y+1.17,z+side*4.14,.42,.13,.42,C.stoneLight);if(last)for(let off of[.41,1.0])g.tube([last[0],last[1]+off,z+side*4.14],[x+xx,y+off,z+side*4.14],.085,C.woodDark,4);last=[x+xx,y];}}
 for(let s of[-1,1])g.box(x+s*(half-.3),25.2,z,2.7,4.94,9.3,C.base);}
 stoneBridge(32);
 // Small wooden landing and descending river steps, placed outside the bridge footprint.
 for(let z of[-81,94]){let x=cx(z)-cw(z)-2,g=bank.get(x,z);for(let i=0;i<8;i++)g.box(x+1+i*.53,29.6-i*.39,z,.57,.42,4.8,C.stone);for(let i=0;i<10;i++)g.box(x+4.8,26.9,z-2.2+i*.48,5.5,.13,.42,C.timber);for(let zz of[-2,2])g.box(x+6.5,24.3,z+zz,.2,3.1,.2,C.woodDark);}
 // Fire lookout is a P local placement of the catalogued village feature, not a pagoda.
 {let x=-151,z=54,g=bank.get(x,z);for(let xx of[-2.3,2.3])for(let zz of[-2.3,2.3])g.box(x+xx,30,z+zz,.32,17.3,.32,C.woodDark);for(let h=33;h<47;h+=3.8){g.box(x,h,z,5,.17,5,C.wood);for(let s of[-1,1]){g.tube([x-2.3,h,z+s*2.3],[x+2.3,h+3.5,z+s*2.3],.08,C.timber,4);g.tube([x+s*2.3,h,z-2.3],[x+s*2.3,h+3.5,z+2.3],.08,C.timber,4);}}g.box(x,47,z,6,.3,6,C.wood);G.roof(g,x,49.2,z,7.3,7.3,1.65,C.slate,null,true);for(let xx of[-2.6,2.6])for(let zz of[-2.6,2.6])g.box(x+xx,47.2,z+zz,.16,2,.16,C.wood);for(let i=0;i<16;i++)g.box(x-2.0,30+i,z+2.5,1.3,.08,.2,C.timber);}
 // Planting and props use reserved gaps and do not cover the road network.
 let plantSites=[];for(let side of[-1,1])for(let z=-214;z<230;z+=28){if(ROAD_Z.some(r=>Math.abs(z-r)<10))continue;let x=cx(z)+side*(cw(z)+12.2);if(!houses.some(h=>Math.abs(x-h.x)<h.rx*1.10+2&&Math.abs(z-h.z)<h.rz*1.2+2))plantSites.push({x,z,type:'willow',scale:.9+R()*.25});}
 plantSites.push({x:-18,z:13,type:'cherry',scale:1.25},{x:-39,z:47,type:'broadleaf',scale:.85});
 for(let i=0;i<620;i++){let x=-240+R()*475,z=-228+R()*445;if(plantSites.some(p=>Math.hypot(p.x-x,p.z-z)<9)||roadDistance(x,z)<5.5||Math.abs(x-cx(z))<cw(z)+13||inPlaza(x,z)||houses.some(h=>Math.abs(x-h.x)<h.rx*1.2+3&&Math.abs(z-h.z)<h.rz*1.3+3))continue;plantSites.push({x,z,type:R()>.85?'cherry':'broadleaf',scale:.7+R()*.5});}
 for(let x of[-224,224])for(let z=-193;z<187;z+=19){let g=bank.get(x,z);if(ROAD_Z.some(r=>Math.abs(z-r)<6))continue;G.fence(g,x,z,x,z+14,30,1.5);}

 let gardens=[];
 // Public tea seating and two parasols on the riverside square. No named canon shop is assigned here.
 for(let [x,z,col]of[[-4,17,C.red],[-10,43,C.indigo]]){let g=bank.get(x,z);g.cone(x,30,z,.065,.065,3.2,C.wood,6);g.cone(x,32.75,z,2.85,0,.72,col,14);g.cone(x,33.4,z,.10,.06,.28,C.gold,6);g.box(x-2,30.5,z+2.7,3.6,.16,.85,C.wood);for(let xx of[-3.2,-.8])g.box(x+xx,30,z+2.7,.20,.5,.60,C.woodDark);}
 // Lanterns, barrels, baskets and small kitchen plots appear at purposeful intervals.
 for(let i=0;i<houses.length;i+=4){let h=houses[i],g=bank.get(h.x,h.z);g.place(h.x,h.y,h.z,h.yaw);for(let k=0;k<2;k++){g.cone(-h.w*.44+k*.65,.0,h.d/2+.6,.27,.31,.57,C.timber,10);g.cone(-h.w*.44+k*.65,.12,h.d/2+.6,.281,.29,.04,C.woodDark,10);}g.place();}
 for(let z=-203;z<204;z+=24){if(ROAD_Z.some(r=>Math.abs(z-r)<9))continue;let x=cx(z)-cw(z)-3.5,g=bank.get(x,z);g.box(x,30,z,.13,2.35,.13,C.woodDark);g.box(x,32.2,z,.8,.13,.16,C.woodDark);G.lantern(g,x+.31,31.60,z,.77);}
 // Rice paddies and small irrigation channels at the southern/eastern edge of the village.
 let paddies=[];for(let iz=0;iz<3;iz++)for(let ix=0;ix<4;ix++){let x=-173+ix*49,z=247+iz*36;if(Math.abs(x-cx(z))<cw(z)+30)continue;let y=terrain.height(x,z),g=bank.get(x,z,'ground');let w=42,d=28;paddies.push({x,y,z,w,d});g.box(x,y+.05,z,w,.13,d,rgb('#647c50'));for(let side of[-1,1]){g.box(x,y+.16,z+side*(d/2+.45),w+2,.3,.9,rgb('#a5a074'));g.box(x+side*(w/2+.45),y+.16,z,.9,.3,d+2,rgb('#a5a074'));}
 for(let row=0;row<12;row++){let zz=z-d/2+1.5+row*2.1;g.box(x,y+.22,zz,w-2,.34,.32,blend(C.leaf,rgb('#adb569'),(row%3)*.1));}}
 const refinement=G.refineVillage(bank,houses,plantSites,gardens,terrain,ROAD_X,ROAD_Z);
 return{meshes:[...bank.meshes(),...bank.props.meshes()],refinement,houses,plantSites,paddies,gardens,riverfrontCount,roadZ:ROAD_Z,roadX:ROAD_X,bank,info:{name:'人里·河岸街区',basis:'P：普通建筑、街区布局、桥梁、渠线为本作设计',iteration:2}};
}
Object.assign(G,{buildVillage,roadDistance,inPlaza});
})(globalThis.GA);

(function(G){'use strict';const{C,rgb,blend}=G;
function template(type,far=false){let g=new G.Geometry(),white=[1,1,1],bark=[.62,.34,.21],r=G.rng(517);let crown=(x,y,z,rx,ry,rz,c=white)=>g.ellipsoid(x,y,z,rx,ry,rz,c,far?5:9,far?2:4);
 if(type==='cedar'){
 g.cone(0,0,0,.3,.1,11,bark,6);for(let i=0;i<(far?2:4);i++){let y=3+i*(far?3:1.9),rr=(far?3.4:3.3)-i*(far?.9:.55);g.cone(0,y,0,rr,.13,4.1,blend(white,[.60,.73,.64],i*.12),far?6:9);} }
 else if(type==='bamboo'){
 for(let i=0;i<(far?3:7);i++){let x=(r()-.5)*5,z=(r()-.5)*4,h=8+r()*4;g.cone(x,0,z,.10,.07,h,rgb('#a5b671'),5);if(!far)for(let y=1;y<h;y+=1.3)g.cone(x,y,z,.115,.115,.095,rgb('#748a49'),5);for(let j=0;j<(far?2:3);j++)crown(x+(r()-.5)*1.2,h-1-j*1.1,z,1.35,.48,1.0,white);}}
 else if(type==='willow'){
 g.tube([0,0,0],[.45,7.2,-.2],.36,bark,7,.14);crown(0,7.6,0,2.7,1.35,2.5);
 if(!far)for(let i=0;i<23;i++){let a=i/23*6.283,R=2.4+r()*1.35,x=Math.cos(a)*R,z=Math.sin(a)*R,top=7.3+r()*.85,bottom=2.8+r()*2.0;
 g.tube([.3,5.5,0],[x,top,z],.09,bark,5,.026);
 for(let j=0;j<6;j++){let t=j/5,Y=top+(bottom-top)*t,X=x+Math.cos(a)*.48*Math.sin(t*3.1),Z=z+Math.sin(a)*.48*Math.sin(t*3.1),rr=.48*(1-t*.68);
 g.ellipsoid(X,Y,Z,rr,.48+(.2*(1-t)),rr*.72,blend(white,[.73,.85,.54],t*.55),6,3);}
 }else for(let i=0;i<5;i++){let a=i/5*6.283;crown(Math.cos(a)*2.3,5.5,Math.sin(a)*2.3,.8,2.2,.65);}}

 else {
 g.tube([0,0,0],[.26,6.6,0],.39,bark,7,.15);const clumps=far?[[0,6.5,0,3.2,2.5,3.0]]:[[0,7.8,0,2.7,2.1,2.6],[-2,5.9,-.8,2.45,1.7,2.1],[2,6.4,0,2.4,1.8,2.2],[-.2,5.6,2.1,2.7,1.9,2.0],[.6,6.2,-2.2,2.6,1.8,2.0]];
 if(!far){for(let j=0;j<6;j++){let a=j*6.283/6;clumps.push([Math.cos(a)*3.0,6.2+r()*1.3,Math.sin(a)*3.0,1.35,1.2,1.3]);}}
 for(let i=0;i<clumps.length;i++){let[x,y,z,rx,ry,rz]=clumps[i];if(!far)g.tube([.2,3.5,0],[x,y,z],.15,bark,6,.045);crown(x,y,z,rx,ry,rz,blend(white,[.72,.8,.67],i*.04));}}
 return g.mesh(type+(far?'-far':''),'vegetation').vertices;}
function gardenTemplate(type,far=false){
 const g=new G.Geometry(),r=G.rng(type==='cherry'?381:718),white=[1,1,1],bark=G.rgb('#736452');
 const crown=(x,y,z,rx,ry,rz,t=.1)=>g.ellipsoid(x,y,z,rx,ry,rz,G.blend(white,[.62,.76,.59],t),far?5:7,far?2:3);
 // Off-axis trunk segments and visible forks; foliage has small lobed silhouettes.
 g.tube([0,0,0],[.18,2.6,-.09],.27,bark,7,.19);
 g.tube([.18,2.6,-.09],[-.15,4.5,.22],.19,bark,7,.10);
 if(type==='willow'){
   g.tube([-.15,4.5,.22],[.20,6.8,0],.12,bark,6,.065);
   for(let i=0;i<9;i++){let a=i*2.4,rr=1.4+r()*.8;crown(Math.cos(a)*rr,6.6+r()*.5,Math.sin(a)*rr,1.25,.73,1.15,.08+(i%4)*.07);}
   for(let i=0;i<(far?9:24);i++){
     const a=i*2.4,rr=2.2+r()*1.4,x=Math.cos(a)*rr,z=Math.sin(a)*rr,y=6.6+r()*.45,bottom=2.1+r()*1.8;
     g.tube([.08,5,0],[x,y,z],.06,bark,5,.018);
     if(far){crown(x,4.95,z,.28,1.3,.27,.15);continue;}
     let last=[x,y,z];
     for(let j=0;j<11;j++){
       const t=(j+1)/11,xx=x+Math.cos(a)*Math.sin(t*3)*.45,zz=z+Math.sin(a)*Math.sin(t*3)*.45,yy=G.mix(y,bottom,t),p=[xx,yy,zz];
       g.tube(last,p,.012,bark,3,.007);last=p;
       const w=.22*(1-t*.4),col=G.blend(white,[.78,.85,.56],t*.5);
       for(const side of[-1,1]){
         const dx=Math.cos(a+1.1)*w*side,dz=Math.sin(a+1.1)*w*side;
         g.quad([xx,yy+.07,zz],[xx+dx*.8,yy-.13,zz+dz*.8],[xx+dx,yy-.35,zz+dz],[xx-dz*.28,yy-.18,zz+dx*.28],col);
       }
     }
   }
 }else{
   for(let i=0;i<(far?6:9);i++){
     const a=i*2.4+.3,rr=1.25+r()*1.5,yy=4.65+r()*1.9,x=Math.cos(a)*rr,z=Math.sin(a)*rr;
     g.tube([0,2.7+(i%3)*.45,0],[x,yy,z],.115,bark,5,.045);
     const n=far?2:5;
     for(let j=0;j<n;j++){
       const a2=j*2.4+i,ex=x+Math.cos(a2)*(.4+r()*.8),ez=z+Math.sin(a2)*(.4+r()*.8),ey=yy+(j%3)*.37;
       if(!far)g.tube([x,yy-.22,z],[ex,ey,ez],.031,bark,4,.012);
       const rad=type==='cherry'?.74:.78;
       crown(ex,ey,ez,rad+ r()*.22,.48+r()*.24,rad*.86+r()*.20,.04+(i%4)*.07);
       if(!far){for(let k=0;k<2;k++){let ang=a2+k*2.4,dx=Math.cos(ang)*.95,dz=Math.sin(ang)*.95;
         g.quad([ex+dx*.7,ey+.05,ez+dz*.7],[ex+dx,ey+.14,ez+dz],[ex+dx*1.20,ey-.03,ez+dz*1.20],[ex+dx*.9-dz*.13,ey-.06,ez+dz*.9+dx*.13],white);}}
     }
   }
   crown(0,7,0,1.4,.80,1.28,.05);
 }
 return g.mesh('garden-'+type+(far?'-far':''),'vegetation').vertices;
}
// Sculpted local conifers for the new shrine / trail; original village prototypes remain intact.
function hinokiTemplate(far=false){
 const g=new G.Geometry(),R=G.rng(45567),wood=[1.2,.63,.35];g.cone(0,0,0,.30,.06,12.1,wood,7);
 const count=far?5:9;
 for(let level=0;level<count;level++){
  const t=level/(count-1),y=3.9+t*7.8,rad=(2.65*(1-t)+.44),branches=far?4:5;
  for(let b=0;b<branches;b++){
   const a=b*6.283/branches+level*1.11,rr=rad*(.78+R()*.28),x=Math.cos(a)*rr,z=Math.sin(a)*rr;
   if(!far)g.tube([0,y-.28,0],[x,y+.12,z],.07*(1-t*.5),wood,5,.014);
   const tint=G.blend([1,1,1],[.61,.77,.63],(level%3)*.11);
   g.ellipsoid(x,y+.35,z,.95*(1-t*.65),.58*(1-t*.5),1.06*(1-t*.60),tint,far?5:7,far?2:3);
   if(!far)for(let j=0;j<2;j++){const aa=a+(j-.5)*1.5;g.ellipsoid(x+Math.cos(aa)*.63,y+.39+(j-.5)*.28,z+Math.sin(aa)*.63,.70*(1-t*.55),.34,.65*(1-t*.55),tint,6,3);}
  }
 }
 g.ellipsoid(.06,12.13,0,.55,.93,.50,[1,1,1],6,3);
 return g.mesh('hinoki','vegetation').vertices;
}
function buildVegetation(terrain,village,footprints){const defs={},tiles=new Map(),R=G.rng(32042);let count=0;for(let t of['cedar','broadleaf','willow','cherry','bamboo'])defs[t]={near:template(t),far:template(t,true)};for(let t of ['broadleaf','cherry','willow'])defs['garden-'+t]={near:gardenTemplate(t),far:gardenTemplate(t,true)};
 defs.hinoki={near:hinokiTemplate(),far:hinokiTemplate(true)};
 function add(x,z,type,scale=1,local=false){if(type==='cedar'&&x>510&&x<1810&&z>-85&&z<450)type='hinoki';let y=terrain.height(x,z);if(terrain.water(x,z,.07))return;let drawType=local&&defs['garden-'+type]?'garden-'+type:type;let tileSize=local?96:480;let key=drawType+':'+Math.floor(x/tileSize)+':'+Math.floor(z/tileSize);if(!tiles.has(key))tiles.set(key,{type:drawType,matrices:[],colors:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],local});let b=tiles.get(key);let tint=type==='cherry'?rgb(local?'#d9a8b5':'#dcc1b9'):type==='willow'?rgb('#8fa766'):type==='bamboo'?rgb('#869e50'):(type==='cedar'||type==='hinoki')?rgb('#486b4d'):rgb(local?'#698654':'#75904e');tint=blend(tint,[tint[0]*.85,tint[1]*.88,tint[2]*.9],R()*.42);
 b.matrices.push(...G.instanceMatrix(x,y-.10,z,scale,scale*(.88+R()*.24),scale,R()*6.28));b.colors.push(...tint);for(let k=0;k<3;k++){let p=[x,y,z][k];b.min[k]=Math.min(b.min[k],p-8*scale);b.max[k]=Math.max(b.max[k],p+16*scale);}count++;}
 for(let p of village.plantSites)add(p.x,p.z,p.type,p.scale,true);
 function nearRoute(x,z){return terrain.routes.some(rt=>rt.samples.some((p,i)=>i%4===0&&Math.hypot(x-p[0],z-p[1])<rt.width+5));}
 for(let z=-2350;z<2300;z+=31)for(let x=-2390;x<2350;x+=31){let X=x+(R()-.5)*25,Z=z+(R()-.5)*25;if(Math.abs(X)<265&&Math.abs(Z)<370)continue;let h=terrain.height(X,Z);let f=Math.hypot((X+1080)/535,(Z+60)/420),b=Math.hypot((X-500)/550,(Z-1220)/475),density=f<1?.84:b<1?.86:(h>145&&h<700)?.55:.14;
 if(Math.hypot((X+580)/370,(Z-1190)/280)<1||Math.hypot((X+1330)/250,(Z-1050)/190)<1)density=.025;
 if(R()>density||h>1150||terrain.normal(X,Z)[1]<.48||terrain.water(X,Z,.055)||footprints.some(p=>Math.abs(X-p.x)<p.rx+7&&Math.abs(Z-p.z)<p.rz+7)||nearRoute(X,Z))continue;
 add(X,Z,b<1?'bamboo':(f<1&&R()>.55)?'broadleaf':'cedar',b<1?1.5+R()*.75:1.35+R()*.8);}
 const meshes=[...tiles].map(([key,t])=>({id:'plants:'+key,group:'vegetation',local:t.local,material:'foliage',vertices:defs[t.type].near,farVertices:defs[t.type].far,instances:new Float32Array(t.matrices),instanceColors:new Float32Array(t.colors),center:t.min.map((v,i)=>(v+t.max[i])/2),radius:G.length(G.sub(t.max,t.min))/2}));
 return{meshes,count};}
Object.assign(G,{buildVegetation});})(globalThis.GA);

/* v0.5 — Hakurei / Youkai Trail. Ground plans, orientation, dimensions and exact
   placement of objects are project proposals (P). See docs/兽道与神社_出处.md. */
(function(G){'use strict';
const C=G.C, {rgb,blend,mix,smooth}=G;
const S={x:1620,z:160,y:180,yaw:-Math.PI/2,courtFront:56,stairStart:1458,stairEnd:1564,stairY:154.8,top:180.22};
const route=G.routes.find(r=>r.id==='route-shrine');
route.points=[[220,32],[280,32],[420,48],[575,91],[710,113],[820,170],[912,208],[1040,245],[1170,255],[1300,284],[1380,252],[1428,194],[1458,160]];
route.samples=G.spline(route.points,3);
route.note='P：村外田埂—杂木兽道—水渠木桥—登山折返—神社石阶。路径不是官方测绘。';
const baseHeight=G.Terrain.prototype.height;
function streamX(z){return 866+3*Math.sin((z-180)/30);}
function streamY(terrain,z){return baseHeight.call(terrain,streamX(z),z)-.62;}
function shrineHeight(terrain,x,z){let h=baseHeight.call(terrain,x,z);
 if(x>1550&&x<1705&&z>102&&z<224){const d=Math.max(Math.abs((x-1625)/71),Math.abs((z-162)/55));h=mix(h,179.93,1-smooth(.88,1.13,d));}
 if(x>1420&&x<1580&&Math.abs(z-160)<24){const t=G.clamp((x-S.stairStart)/(S.stairEnd-S.stairStart),0,1),ramp=mix(S.stairY,S.y,t);const w=(1-smooth(9,24,Math.abs(z-160)))*smooth(1420,1458,x)*(1-smooth(1564,1580,x));h=mix(h,ramp-.20,w);}
 const pd=Math.hypot((x-1693)/12,(z-201)/8.0);if(pd<1.35)h=mix(h,178.65,1-smooth(.85,1.35,pd));
 if(x>850&&x<882&&z>110&&z<278){const w=(1-smooth(2.0,4.1,Math.abs(x-streamX(z))))*smooth(110,133,z)*(1-smooth(252,278,z));h-=1.7*w;}
 const cd=Math.hypot((x-1072)/8,(z-261)/8);if(cd<1.45)h=mix(h,baseHeight.call(terrain,1072,261),1-smooth(.85,1.45,cd));
 return h;}
G.Terrain.prototype.height=function(x,z){return shrineHeight(this,x,z);};
// Extension terrain only changes the two new areas; village geometry remains unchanged.
const originalColor=G.Terrain.prototype.color;
G.Terrain.prototype.color=function(x,z,h,n){let c=originalColor.call(this,x,z,h,n);if(x>540&&x<1490&&z>-10&&z<480){const d=Math.min(...route.samples.filter((_,i)=>i%7===0).map(p=>Math.hypot(x-p[0],z-p[1])));c=blend(c,rgb('#607653'),(1-smooth(25,96,d))*.65);}return c;};
function roofHip(g,detail,w,d,y,h,wood){
 // Preserve the irimoya silhouette. Each course has a shallow curved face
 // and a real overlapping nose; the transverse seams are short tile edges,
 // not rods laid over a corrugated sheet.
 const slate=rgb('#586364'),edge=rgb('#697371'),sides=[-1,1];
 const surface=(length,rows,point)=>{const n=Math.ceil(length/.52),step=length/n,rising=point(0,1)[1]>point(0,0)[1];
  const v=(x,q,lift)=>{const p=point(x,q);p[1]+=.018*(1-Math.cos((x+length/2)/step*Math.PI*2))+.018+lift;return p;};
  for(let i=0;i<n;i++)for(let j=0;j<rows;j++){
   const t=j/rows,u=(j+1)/rows,low=rising?t:u,col=blend(slate,edge,.06+.10*G.noise(i*.71,j*.63)),lip=col.map(c=>c*.77);
   for(let k=0;k<2;k++){
    const a=-length/2+i*step+k*step/2,b=a+step/2;
    g.quad(v(a,t,rising?.06:0),v(a,u,rising?0:.06),v(b,u,rising?0:.06),v(b,t,rising?.06:0),col);
    g.quad(v(a,low,0),v(a,low,.06),v(b,low,.06),v(b,low,0),lip);
   }
  }
 };
 for(const s of sides){
  surface(w,7,(x,t)=>[x*(1-.25*t),y+h*.44*t+.13*(1-t)**4,-10+s*d/2*(1-.58*t)]);
  surface(d,5,(z,t)=>[s*w/2*(1-.25*t),y+h*.44*t+.13*(1-t)**4,-10+z*(1-.58*t)]);
  wood.box(0,y-.34,-10+s*(d/2-.11),w,.33,.40,C.woodDark);
  wood.box(s*(w/2-.11),y-.34,-10,.40,.33,d,C.woodDark);
  g.box(0,y-.04,-10+s*d/2,w+.08,.16,.31,edge);
  g.box(s*w/2,y-.04,-10,.31,.16,d,edge);
  for(let x=-w/2+.26;x<w/2;x+=.52){
   detail.cone(x,y+.01,-10+s*d/2,.075,.075,.07,edge,8);
   wood.box(x,y-.52,-10+s*(d/2-.7),.095,.18,1.55,C.timber);
  }
 }
 const upperW=w*.79,upperD=d*.47,base=y+h*.42,rise=h*.6;
 for(const s of sides){
  surface(upperW,7,(x,t)=>[x,base+rise*(1-t)+.14*t**4,-10+s*upperD/2*t]);
  wood.box(0,base-.23,-10+s*upperD/2,upperW,.27,.35,C.woodDark);
  for(let x=-upperW/2+.26;x<upperW/2;x+=.52)detail.box(x,base+.03,-10+s*upperD/2,.44,.11,.32,edge);
  wood.tri([s*(upperW/2-.12),base-.16,-10-upperD/2],[s*(upperW/2-.12),base+rise-.1,-10],[s*(upperW/2-.12),base-.16,-10+upperD/2],C.woodDark);
 }
 g.box(0,base+rise+.06,-10,upperW+.48,.24,.48,edge);
 g.box(0,base+rise+.27,-10,upperW+.60,.12,.32,slate);
 for(const sx of sides)for(const sz of sides)wood.tube([sx*upperW/2,base+.06,-10+sz*upperD/2],[sx*upperW/2,base+rise+.03,-10],.10,C.timber,6);
}
function curvedPortico(g,detail,wood=g){
 // Karahafu-inspired front canopy, not a generic pyramidal roof.
 const curve=x=>7.65+1.65*Math.exp(-((x/2.1)**2))+.32*Math.pow(Math.abs(x)/3.9,3);
 for(let i=0;i<48;i++){const x=-4+i/6,u=x+1/6;g.quad([x,curve(x),1.2],[u,curve(u),1.2],[u,curve(u)+.27,-4.2],[x,curve(x)+.27,-4.2],C.slate);
 wood.quad([x,curve(x)-.34,1.27],[u,curve(u)-.34,1.27],[u,curve(u)+.05,1.27],[x,curve(x)+.05,1.27],C.timber);
 wood.quad([x,curve(x)-.34,1.27],[x,curve(x)-.08,-4.2],[u,curve(u)-.08,-4.2],[u,curve(u)-.34,1.27],C.woodDark);}
 for(let x=-3.9;x<4;x+=.48)detail.tube([x,curve(x)+.09,1.28],[x,curve(x)+.36,-4.1],.064,C.slate2,4);
 for(let x of[-3.1,3.1]){wood.box(x,.65,.4,.40,7.12,.40,C.wood);wood.box(x,6.5,.4,.72,.42,.65,C.timber);wood.tube([x,5.6,.4],[x+Math.sign(x)*1.0,7.05,.4],.12,C.timber,4);}
 wood.box(0,6.95,.4,7.8,.30,.32,C.wood);wood.box(0,7.33,.40,6.1,.19,.35,C.timber);
 // Front triangular gable behind the curved canopy.
 wood.tri([-3.0,8.5,-4.05],[3.0,8.5,-4.05],[0,11.3,-4.05],C.woodDark);
 for(let s of[-1,1])wood.tube([s*3.3,8.5,-4],[0,11.6,-4],.15,C.timber,4);
 for(let x=-2.6;x<2.7;x+=.37)wood.box(x,8.5,-3.94,.075,Math.max(.12,2.6-Math.abs(x)*.88),.08,C.timber);
}
function rope(g,a,b,r=.11){const N=28;let last=null;for(let i=0;i<=N;i++){const t=i/N,p=[mix(a[0],b[0],t),mix(a[1],b[1],t)-.5*Math.sin(t*Math.PI),mix(a[2],b[2],t)];if(last)g.tube(last,p,r,C.gold,7);last=p;}}
function shide(g,x,y,z){let width=.21;for(let i=0;i<4;i++){g.box(x+(i%2?-.12:.07),y-i*.18,z,width,.26,.04,C.cream);}}
function stoneLantern(g,x,y,z,scale=1){
 const old=g.origin.slice(),ang=g.angle,p=g.point([x,y,z]);g.place(...p,ang);
 g.box(0,0,0,1.1*scale,.25*scale,1.1*scale,C.stone);g.box(0,.25*scale,0,.72*scale,.24*scale,.72*scale,C.stoneLight);
 g.cone(0,.49*scale,0,.24*scale,.19*scale,1.1*scale,C.stone,6);g.box(0,1.52*scale,0,.84*scale,.22*scale,.84*scale,C.stoneLight);
 g.box(0,1.74*scale,0,.68*scale,.67*scale,.68*scale,C.stone);g.box(0,1.89*scale,.351*scale,.28*scale,.32*scale,.035*scale,C.shadow);
 g.cone(0,2.41*scale,0,.80*scale,.23*scale,.40*scale,C.stone,4);g.ellipsoid(0,2.93*scale,0,.17*scale,.22*scale,.17*scale,C.stone,6,4);g.place(...old,ang);
}
function torii(g,z,w=14,h=10.5){for(const sx of[-1,1]){g.box(sx*w*.34,0,z,1.35,.4,1.5,C.stone);g.cone(sx*w*.34,.30,z,.44,.38,h-.30,rgb('#a34332'),10);g.cone(sx*w*.34,.35,z,.47,.45,.92,C.woodDark,10);}
 g.box(0,h-2.15,z,w,.42,.50,rgb('#a94b35'));g.box(0,h-.76,z,w+1.15,.48,.65,rgb('#a94b35'));
 for(let i=0;i<24;i++){let x=-(w+2)/2+i*(w+2)/24,u=x+(w+2)/24,py=v=>h+.35*Math.pow(Math.abs(v)/(w*.5),3);g.quad([x,py(x),z+.52],[u,py(u),z+.52],[u,py(u),z-.52],[x,py(x),z-.52],C.woodDark);g.quad([x,py(x)-.35,z+.52],[u,py(u)-.35,z+.52],[u,py(u),z+.52],[x,py(x),z+.52],C.wood);}
 g.box(0,h-2,z,.58,1.35,.24,C.woodDark);rope(g,[-4.5,h-2.45,z],[4.5,h-2.45,z],.09);for(const x of[-2.8,-.9,.9,2.8])shide(g,x,h-2.8-Math.cos(x*.3)*.35,z);
}
function hakureiFacade(wall,wood,paper,dark,x,z,width,angle,front=false){
 // A wall assembled around openings. Pane, reveals and dark bay have separate
 // depths; no solid wall remains behind the entrance or the paper panels.
 const parts=[wall,wood,paper,dark],saved=parts.map(g=>[g.origin.slice(),g.angle]);
 for(let i=0;i<parts.length;i++){const g=parts[i],p=g.point([x,0,z]);g.place(...p,g.angle+angle);}
 const cols=width>20?7:5,spacing=(width-3.2)/(cols-1),holes=[];
 for(let i=0;i<cols;i++){const X=-(width-3.2)/2+i*spacing,isDoor=front&&i===(cols-1)/2;
  holes.push({x:X,w:isDoor?3.6:spacing-.43,y:isDoor?1.64:2.43,h:isDoor?3.92:2.73,door:isDoor});
 }
 const cuts=[-width/2,width/2,...holes.flatMap(p=>[p.x-p.w/2,p.x+p.w/2])].sort((a,b)=>a-b);
 for(let i=0;i<cuts.length-1;i++){const a=cuts[i],b=cuts[i+1],mid=(a+b)/2,hole=holes.find(p=>mid>p.x-p.w/2&&mid<p.x+p.w/2);
  for(const [lo,hi]of hole?[[1.64,hole.y],[hole.y+hole.h,6.24]]:[[1.64,6.24]])if(hi>lo+.001)wall.box(mid,lo,-.18,b-a,hi-lo,.36,C.plaster);
 }
 for(const p of holes){
  const {x:X,w,y,h,door}=p;
  for(const s of[-1,1])wood.box(X+s*(w/2+.045),y,-.10,.11,h+.10,.36,C.wood);
  for(const Y of[y,y+h])wood.box(X,Y-.05,-.10,w+.22,.10,.36,C.wood);
  if(door){
   dark.box(X,y,-1.10,w,h,.12,rgb('#252b26'));
   for(const s of[-1,1])wood.box(X+s*(w/2-.18),y,-.40,.30,h,.52,C.woodDark);
   wood.box(X,y,-.55,w,.12,1.10,C.timber);
   for(const s of[-1,1]){wood.box(X+s*.95,y+.18,-.87,1.52,h-.3,.10,C.woodDark);for(let j=0;j<5;j++)wood.box(X+s*.95-.62+j*.31,y+.24,-.79,.055,h-.45,.11,C.timber);}
  }else{
   dark.box(X,y+.04,-.48,w-.07,h-.08,.06,rgb('#393d32'));
   paper.box(X,y+.09,-.29,w-.14,h-.18,.035,rgb('#d1c3a2'));
   const n=Math.max(5,Math.round(w/.39));for(let j=0;j<=n;j++)wood.box(X-w/2+.09+j*(w-.18)/n,y+.07,-.20,.045,h-.14,.08,C.timber);
   for(let Y=y+.55;Y<y+h-.15;Y+=.56)wood.box(X,Y,-.20,w-.10,.048,.08,C.wood);
  }
 }
 parts.forEach((g,i)=>g.place(...saved[i][0],saved[i][1]));
}
function buildHakurei(terrain){
 const bank=new G.BatchBank(),plants=[],newFootprints=[{id:'hakurei',x:1614,z:161,rx:101,rz:66},{id:'hakurei-stairs',x:1511,z:160,rx:60,rz:9}];
 const get=(lod='base',mat='matte')=>bank.get(S.x,S.z,mat,lod).place(S.x,S.y,S.z,S.yaw),g=get(),detail=get('near');
 const gravel=get('base','hakureiGravel'),moss=get('base','hakureiMoss'),stone=get('base','hakureiStone'),wall=get('base','hakureiPlaster'),wood=get('wood-z','hakureiWood'),posts=get('wood-y','hakureiWood'),boards=get('wood-x','hakureiWood'),tiles=get('base','hakureiRoof'),tileDetail=get('near','hakureiRoof'),paper=get('base','hakureiPaper'),recess=get('base','hakureiRecess');
 // The inherited terrace and axis stay in place. Gravel has broad tonal
 // patches and a gently uneven surface; scale comes from paving and edges,
 // while the material supplies close grain without thousands of loose cubes.
 stone.box(0,-.28,1,103,.47,112,rgb('#777e6e'));
 const groundY=(x,z)=>.236+.014*G.noise(x*.19,z*.21),groundCol=(x,z)=>blend(rgb('#939585'),rgb('#aaab95'),G.noise(x/19,z/23)*.64);
 for(let z=-53;z<55;z+=3)for(let x=-49.5;x<49.5;x+=3){const v=(X,Z)=>[X,groundY(X,Z),Z],a=v(x,z),b=v(x,z+3),c=v(x+3,z+3),d=v(x+3,z);for(const p of[a,b,c,a,c,d])gravel.vertex(p,[0,1,0],groundCol(p[0],p[2]));}
 const R=G.rng(51697);
 for(const sx of[-1,1])for(let z=-51;z<56;z+=2.1){stone.box(sx*50,-1.6,z,1.10,1.84,2.0,blend(C.base,C.stone,R()*.5));stone.box(sx*50,.24,z,1.36,.20,2.12,blend(C.stoneLight,C.base,.35));}
 for(let x=-49;x<49;x+=2.1){if(Math.abs(x)<6)continue;stone.box(x,-1.0,56,2.0,1.24,1.10,C.stone);stone.box(x,.24,56,2.12,.20,1.35,blend(C.stoneLight,C.base,.35));}
 // The lateral grounds are planted groves, not an oversized featureless paved square.
 for(const [cx,cz,rx,rz]of[[-34,31,12,20],[32,9,13,16],[30,-39,14,9],[-31,-41,13,9]]){
  // Keep the full fan above the gravel, including its soft outer ring.
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,b=(i+1)/48*Math.PI*2,pt=(t,s=1)=>{const X=cx+Math.cos(t)*rx*(1+.11*Math.sin(t*3)+.055*Math.cos(t*7))*s,Z=cz+Math.sin(t)*rz*s;return[X,.30+.015*(1-s/1.10),Z];};
   moss.tri([cx,.315,cz],pt(b,.88),pt(a,.88),rgb('#5f7052'));
   const A=pt(a,.88),B=pt(b,.88),D=pt(a,1.10),E=pt(b,1.10);for(const q of[[A,B,E],[A,E,D]])for(const p of q)moss.vertex(p,[0,1,0],p===D||p===E?groundCol(p[0],p[2]):rgb('#697858'));
  }
  for(let i=0;i<9;i++){const a=i*2.399+cx*.1,s=.72+R()*.33;stone.ellipsoid(cx+Math.cos(a)*rx*s,.27,cz+Math.sin(a)*rz*s,.40+R()*.54,.14+R()*.17,.30+R()*.39,blend(C.stone,C.base,R()*.6),7,4);}
 }
 // Large squared approach stones and finer edging, in a coherent axis.
 for(let z=6;z<54;z+=1.45)for(let x=-3.1;x<3.1;x+=1.58)G.bevelBox(stone,x+.77,.25,z,1.52,.115,1.39,.026,blend(C.stoneLight,C.stone,.22+R()*.16));
 for(let z=5;z<54;z+=.96)for(let s of[-1,1])G.bevelBox(stone,s*3.62,.23,z,.35,.16,.90,.025,C.stone);
 // Floor structure, stone piers, veranda and a single integrated hall.
 for(let x=-11;x<=11;x+=2.75)for(let z=-18;z<=-2;z+=4){G.bevelBox(stone,x,.19,z,.76,.44,.76,.055,blend(C.stone,C.base,.24));posts.box(x,.56,z,.31,1.00,.31,C.woodDark);}
 boards.box(0,1.3,-10,26,.25,21,C.woodDark);
 for(let x=-12.8;x<12.9;x+=.38)boards.box(x,1.56,-10,.35,.075,20.7,blend(C.timber,C.wood,.12+R()*.16));
 for(const z of[-18,-10,-2])wood.box(0,1.08,z,24,.30,.35,C.woodDark);
 // Hall walls set back from a wrap-around engawa.
 hakureiFacade(wall,wood,paper,recess,0,-2,22,0,true);
 hakureiFacade(wall,wood,paper,recess,0,-18,22,Math.PI);
 for(const side of[-1,1])hakureiFacade(wall,wood,paper,recess,side*11,-10,16,side*Math.PI/2);
 for(const x of[-6.4,6.4])wood.box(x,1.67,-1.94,9.1,.70,.17,C.woodDark);
 for(const x of[-1.82,1.82])posts.box(x,1.61,-1.6,.18,4.58,.22,C.wood);
 for(let x=-11;x<=11.1;x+=2.75){posts.box(x,1.52,-1.72,.27,4.97,.28,C.wood);posts.box(x,1.52,-18.2,.27,4.97,.28,C.wood);}
 for(let z=-18;z<=-2;z+=2.7)for(const sx of[-1,1])posts.box(sx*11.2,1.52,z,.27,4.97,.28,C.wood);
 for(const z of[-1.72,-18.20]){wood.box(0,5.65,z,23,.25,.35,C.wood);wood.box(0,6.27,z,24.0,.24,.40,C.timber);}
 roofHip(tiles,tileDetail,29.0,24.0,6.8,5.1,wood);curvedPortico(tiles,tileDetail,wood);
 // Back/veranda rail, corner joints and stepping stones.
 for(const sx of[-1,1]){for(let z=-20;z<1;z+=2.6){posts.box(sx*12.75,1.61,z,.14,1.03,.14,C.wood);boards.box(sx*12.75,2.52,z+1.22,.17,.15,2.66,C.timber);}}
 for(let i=0;i<7;i++)G.bevelBox(stone,0,.25+i*.198,4.8-i*.58,5.8,.198,.65,.035,blend(C.stone,C.stoneLight,.25));
 // Saisenbako, suzu cord, rice-straw rope and paper zigzags.
 g.box(0,1.64,-.15,2.5,1.00,1.12,C.wood);g.box(0,2.64,-.15,2.75,.12,1.34,C.timber);
 for(let x=-1.12;x<1.2;x+=.23)detail.box(x,2.77,-.15,.10,.06,1.05,C.woodDark);
 for(let y=1.8;y<2.5;y+=.18)detail.box(0,y,.423,2.35,.06,.04,C.timber);
 rope(g,[-3.07,5.8,.61],[3.07,5.8,.61],.17);for(const x of[-2,-.7,.7,2])shide(g,x,5.30,.64);
 g.cone(0,5.24,.88,.24,.14,.36,C.gold,10);g.tube([0,5.3,.88],[0,2.25,1.25],.058,C.gold,7);g.ellipsoid(0,2.24,1.25,.15,.21,.15,C.red,8,5);
 torii(g,49.0);
 for(const z of[12,30,45])for(const sx of[-1,1])stoneLantern(g,sx*8.7,.27,z,z===12?1.15:.95);
 // Chozuya: real posts and a basin with a hollow centre, not a solid cube.
 const tx=23,tz=28;
 g.box(tx,.2,tz,7.8,.2,5.8,C.stone);for(const sx of[-1,1])for(const sz of[-1,1])g.box(tx+sx*3.0,.4,tz+sz*2,.21,3.8,.23,C.wood);
 G.roof(g,tx,4.12,tz,8.1,6.4,1.4,C.slate,detail,true);
 for(const sx of[-1,1])g.box(tx+sx*1.9,.43,tz,.36,1.12,2.6,C.stone);for(const sz of[-1,1])g.box(tx,.43,tz+sz*1.1,3.8,1.12,.40,C.stone);
 g.box(tx,1.09,tz,3.36,.03,1.76,rgb('#6c9893'));g.tube([tx-2.25,1.66,tz],[tx+2.25,1.66,tz],.05,C.timber,6);
 for(let i=0;i<3;i++){g.tube([tx-.7+i*.6,1.73,tz-.55],[tx-.7+i*.6,1.75,tz+.56],.029,C.timber,5);g.cone(tx-.7+i*.6,1.71,tz+.63,.14,.16,.17,C.timber,8);}
 // Plain side warehouse, maintained as a different mass from the main hall.
 const wx=-32,wz=-20;stone.box(wx,.20,wz,11.0,.48,8.5,C.stone);wall.box(wx,.68,wz,10,4.20,7.5,C.plaster);
 for(const sx of[-1,1])g.box(wx+sx*4.8,.65,wz+3.8,.18,4.1,.18,C.wood);
 g.box(wx,.69,wz+3.83,2.2,2.88,.16,C.woodDark);for(let x=wx-.9;x<wx+1;x+=.24)detail.box(x,.78,wz+3.94,.10,2.68,.07,C.timber);
 G.roof(g,wx,4.89,wz,12.4,10.0,2.5,C.slate,detail,false);
 // Small ema rack and resting edge are P detail additions, not named facilities.
 for(const x of[-20.2,-14.5])g.box(x,.24,10,.17,2.25,.19,C.wood);
 g.box(-17.35,2.33,10,6.10,.17,.27,C.wood);G.roof(g,-17.35,2.62,10,6.6,1.5,.5,C.slate,detail);
 for(let i=0;i<10;i++){let x=-19.8+i*.54;g.tube([x,2.26,10],[x,1.95,10],.015,C.gold,4);g.box(x,1.55,10,.40,.36,.07,C.timber);g.tri([x-.20,1.91,10.04],[x+.20,1.91,10.04],[x,2.07,10.04],C.timber);}
 // Side/back stones, tool rack, drying pole, bench and tea tray are P additions.
 for(let i=0;i<16;i++){const x=18+Math.sin(i*.16)*8,z=2-i*2.2;g.box(x,.23,z,1.38,.13,.98,blend(C.stoneLight,C.base,.17));}
 g.box(15.2,.23,-12,3.5,.46,1.5,C.woodDark);for(let i=0;i<8;i++)detail.box(13.7+i*.4,.72,-12,.34,.08,1.50,C.timber);
 for(const x of[-23,-18])g.box(x,.20,-39,.14,2.60,.14,C.wood);g.tube([-23,2.8,-39],[-18,2.8,-39],.075,C.timber,6);
 g.box(-24.4,.2,-11,2.2,.75,1.3,C.wood);g.tube([-23.8,.2,-9.6],[-23.1,2.7,-10],.07,C.timber,6);g.cone(-23.8,.2,-9.6,.35,.12,.6,C.gold,6);
 // Garden pond bank: water is a separately rendered mesh.
 const pg=new G.Geometry(),py=179.25;for(let i=0;i<70;i++){const a=i/70*Math.PI*2,b=(i+1)/70*Math.PI*2,pt=t=>[1693+Math.cos(t)*11.25,py,201+Math.sin(t)*7.25];pg.tri([1693,py,201],pt(b),pt(a),rgb('#648f8b'));}
 const ring=bank.get(1693,201);for(let i=0;i<27;i++){let a=i/27*Math.PI*2;ring.ellipsoid(1693+Math.cos(a)*12,179.34,201+Math.sin(a)*8,.72,.55,.62,blend(C.stone,C.base,R()*.7),7,4);}
 // Cedar grove and old cherry trees frame the building without blocking the axis.
 for(const [lx,lz,type,scale] of [[-31,34,'cherry',1.15],[30,8,'cherry',1.22],[-37,7,'cherry',1.4],[35,-36,'broadleaf',1.8],[-36,-37,'broadleaf',2.25],[32,42,'cherry',1.22],[-31,49,'cherry',1.0],[41,-20,'cedar',1.8],[-44,-1,'cedar',1.7]]){let p=g.point([lx,0,lz]);plants.push({x:p[0],z:p[2],type,scale});}
 for(let i=0;i<115;i++){const a=R()*Math.PI*2,rx=63+R()*53,rz=67+R()*57;let x=1623+Math.cos(a)*rx,z=161+Math.sin(a)*rz;if(x<1550&&Math.abs(z-160)<19)continue;if(Math.hypot((x-1693)/18,(z-201)/14)<1)continue;plants.push({x,z,type:i%9===0?'cherry':i%3===0?'broadleaf':'cedar',scale:i%3?1.45+R()*.72:1.15+R()*.7});}
 // Approach stair flights: no ramp floating through the steps.
 const sg=bank.get(1500,160),N=140,dx=(S.stairEnd-S.stairStart)/N,step=(S.top-S.stairY)/N;
 for(let i=0;i<N;i++){const x=S.stairStart+(i+.5)*dx,y=S.stairY+(i+1)*step;sg.box(x,y-.22,160,dx+.025,.24,7.4,blend(C.stone,C.stoneLight,.21+(i%4)*.055));
 if(i%3===0)for(const sz of[-1,1]){sg.box(x,y-.75,160+sz*4.5,dx*3-.04,.93,1.25,C.base);sg.box(x,y+.18,160+sz*4.5,dx*3,.20,1.42,C.stoneLight);}}
 for(let i=0;i<=12;i++){const t=i/12,x=mix(S.stairStart+2,S.stairEnd-2,t),y=mix(S.stairY+.7,S.top+.3,t);for(let sz of[-1,1]){sg.box(x,y,160+sz*5.05,.26,1.15,.27,C.wood);if(i<12){const u=(i+1)/12;sg.tube([x,y+1.0,160+sz*5.05],[mix(S.stairStart+2,S.stairEnd-2,u),mix(S.stairY+.7,S.top+.3,u)+1.0,160+sz*5.05],.080,C.timber,6);}}}
 for(const x of[1470,1505,1540])for(const sz of[-1,1]){const y=terrain.height(x,160+sz*8);stoneLantern(sg,x,y,160+sz*8,.90);plants.push({x:x+4,z:160+sz*17,type:'cedar',scale:1.7});}
 let meshes=bank.meshes();meshes.forEach((m,i)=>{if(m.lod.startsWith('wood-')){m.woodAxis=m.lod.slice(-1);m.lod='base';}m.id='hakurei:'+m.id;m.locationId='hakurei';m.evidence='P';});meshes.push(pg.mesh('hakurei-garden-pond','water',{material:'water'}));
 return{meshes,plantSites:plants,footprints:newFootprints,meta:{basis:'P',reference:'博丽神社（萃绯非场景）/ 心绮楼场景；背面与庭院排布本作补完',stairSteps:N,mainHall:[22,16],facing:'west / P',refined:true}};
}
function buildTrail(terrain){const bank=new G.BatchBank(),plants=[],R=G.rng(53062),p=route.samples;
 // Detailed shoulders and low irregular stones follow the path rather than a straight highway.
 for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;const g=bank.get(a[0],a[1],'ground');
 const point=(v,s,w)=>[v[0]+nx*s*w,terrain.height(v[0]+nx*s*w,v[1]+nz*s*w)+.14,v[1]+nz*s*w];
 for(let s of[-1,1])g.quad(point(a,s,2.7),point(b,s,2.7),point(b,s,4.5),point(a,s,4.5),rgb('#8c8a64'));
 if(i%3===0&&a[0]>530){for(const s of[-1,1]){let x=a[0]+nx*s*(5+R()*1.6),z=a[1]+nz*s*(5+R()*1.6),y=terrain.height(x,z);g.ellipsoid(x,y-.18,z,.55+R()*.7,.35+R()*.7,.42+R()*.5,blend(C.base,rgb('#647257'),.4),6,3);}}
 if(i%3===0&&a[0]>500&&a[0]<1400)for(const s of[-1,1]){for(let j=0;j<3;j++){const off=11+j*12+R()*9,x=a[0]+nx*s*off+(R()-.5)*8,z=a[1]+nz*s*off+(R()-.5)*8;if(Math.abs(x-streamX(z))<6&&z>110&&z<278)continue;plants.push({x,z,type:i%15===0?'cherry':j%2?'cedar':'broadleaf',scale:(j===0?1.03:1.50)+R()*.5});}}
 // Low split rails on steep segments, not a continuous urban fence.
 if(a[0]>1210&&i%8===0){const x=a[0]+nx*5.8,z=a[1]+nz*5.8,y=terrain.height(x,z),u=[x+dx/len*6,z+dz/len*6],yy=terrain.height(...u);for(let k of[0,1]){let xx=k?u[0]:x,zz=k?u[1]:z,Y=k?yy:y;g.box(xx,Y,zz,.22,1.15,.24,C.wood);}g.tube([x,y+.95,z],[u[0],yy+.95,u[1]],.095,C.timber,6);}
 }
 // A small watercourse near the path, not a new connection between canonical major rivers.
 const water=new G.Geometry();for(let z=127;z<261;z+=1.8){let pt=(Z,s)=>[streamX(Z)+s*2.15,streamY(terrain,Z),Z];water.quad(pt(z,-1),pt(z+1.8,-1),pt(z+1.8,1),pt(z,1),rgb('#668b84'));}
 const cross=p.reduce((a,b)=>Math.abs(a[0]-streamX(a[1]))<Math.abs(b[0]-streamX(b[1]))?a:b),cx=cross[0],cz=cross[1],by=baseHeight.call(terrain,cx,cz)+.52;
 let bg=bank.get(cx,cz);for(let x=cx-7.5;x<cx+7.5;x+=.62)bg.box(x,by,cz,.59,.22,6.4,C.timber);
 for(const side of[-1,1]){bg.box(cx,by-.42,cz+side*2.4,17,.38,.32,C.woodDark);for(let x=cx-7.0;x<=cx+7.1;x+=2.8)bg.box(x,by+.22,cz+side*3.0,.18,1.12,.18,C.wood);bg.tube([cx-7.7,by+1.29,cz+side*3],[cx+7.7,by+1.29,cz+side*3],.09,C.timber,6);}
 // Bridge-to-trail tapered ramp, continuous at both ends.
 for(let side of[-1,1]){let x=cx+side*7.6,ex=cx+side*10.5;for(let i=0;i<5;i++){let t=i/5,u=(i+1)/5,X=mix(x,ex,t),XX=mix(x,ex,u),y=mix(by+.23,terrain.height(ex,cz)+.22,t),yy=mix(by+.23,terrain.height(ex,cz)+.22,u);bg.quad([X,y,cz-3.2],[XX,yy,cz-3.2],[XX,yy,cz+3.2],[X,y,cz+3.2],C.timber);}}
 for(const [x,z] of[[cx-15,cz+15],[cx+14,cz-15],[streamX(144)+7,144],[streamX(242)-8,242]])plants.push({x,z,type:'willow',scale:1.13});
 // A movable yatai in a small clearing. Demonstration position only, not a fixed residence.
 const cart={x:1092,z:291,y:terrain.height(1092,291),yaw:.18};let cg=bank.get(cart.x,cart.z).place(cart.x,cart.y,cart.z,cart.yaw),det=bank.get(cart.x,cart.z,'matte','near').place(cart.x,cart.y,cart.z,cart.yaw);
 cg.box(0,.65,0,4.4,1.10,2.1,C.wood);for(let x of[-1.6,1.6])for(let z of[-.96,.96]){cg.tube([x,.55,z-.10],[x,.55,z+.10],.46,C.woodDark,12);for(let a=0;a<6;a++)cg.tube([x,.55,z+.11],[x+Math.cos(a*Math.PI/3)*.43,.55+Math.sin(a*Math.PI/3)*.43,z+.11],.035,C.timber,4);}
 cg.box(0,1.72,.75,5.0,.16,1.55,C.timber);for(const x of[-2.2,2.2])for(const z of[-1.08,1.08])cg.box(x,.90,z,.14,2.95,.14,C.wood);
 G.roof(cg,0,3.7,0,5.65,3.8,.80,C.slate,det,false);
 for(let x=-1.9;x<2;x+=.75)cg.box(x,2.76,1.37,.67,.73,.045,rgb('#476773'));
 for(let i=0;i<3;i++)cg.box(-1.5+i*1.5,0,2.5,.8,.58,.76,C.wood);
 cg.box(.8,1.89,.3,1.40,.22,.76,C.woodDark);for(let x=.2;x<1.5;x+=.2)det.tube([x,2.16,-.02],[x,2.16,.68],.025,C.gold,5);
 for(let i=0;i<2;i++)G.lantern(cg,-2.6+i*5.2,2.72,.90,1.10);
 cg.box(-1.25,1.89,.43,.90,.6,.75,C.wood);for(let x=-1.6;x<-.8;x+=.22)cg.cone(x,1.98,.88,.12,.10,.2,C.cream,8);
 // The clearing is minimal and remains linked to the path, not a second village.
 let clear=bank.get(cart.x,cart.z,'ground');clear.box(cart.x,cart.y-.08,cart.z,8,.15,8,rgb('#aaa187'));
 // A road-side rest bench at the last bend.
 let rest=bank.get(1340,274),ry=terrain.height(1340,274);rest.box(1340,ry+.54,274,4.2,.17,1.12,C.timber);for(let x of[1338.5,1341.5])rest.box(x,ry,274,.30,.55,.75,C.woodDark);
 const keep=plants.filter(q=>Math.hypot(q.x-cart.x,q.z-cart.z)>9 && !(Math.abs(q.x-1075)<37&&Math.abs(q.z-274)<31) && Math.hypot(q.x-cx,q.z-cz)>23);
 const meshes=bank.meshes();meshes.forEach(m=>{m.id='trail:'+m.id;m.evidence='P';});meshes.push(water.mesh('trail-stream-water','water',{material:'water'}));
 return{meshes,plantSites:keep,meta:{basis:'P',routeId:'route-shrine',bridge:{x:cx,z:cz,y:by},cart:{...cart,kind:'移动屋台的本作展示位置'},forestSites:keep.length},footprints:[{id:'trail-cart',x:1092,z:291,rx:9,rz:9},{id:'trail-bridge',x:cx,z:cz,rx:24,rz:23}]};
}
Object.assign(G,{buildHakurei,buildTrail,HAKUREI:S,baseHeight,streamX});
})(globalThis.GA);

/* v0.6 | Scarlet estate. Original procedural geometry, not an imported fan model.
   Official anchors retained. Plan, dimensions, missing elevations and all ornamental
   placements are project proposals (P). Primary visual: SWR clock-tower stage.
   Text references: PMiSS p144 (JP original: red exterior, few windows), BAiJR mansion. */
(function(G){'use strict';
const {rgb,blend,mix}=G;
const K={brick:rgb('#914e48'),brick2:rgb('#a75a50'),dark:rgb('#392d35'),roof:rgb('#50444a'),slate:rgb('#5c4d51'),trim:rgb('#bba798'),base:rgb('#8c8b83'),cream:rgb('#e6d8b9'),iron:rgb('#263333'),gold:rgb('#bd9a61'),grass:rgb('#748357'),hedge:rgb('#3e6048'),rose:rgb('#ab555e'),water:rgb('#5b9294'),glass:rgb('#514049'),wood:rgb('#514031')};
const S={x:820,z:-680,y:110.0,mainX:830,mainZ:-729,gateZ:-552,left:724,right:930,back:-792};
// Sculpt only this estate and the night-sparrow clearing; frozen research is not edited.
const prev=G.Terrain.prototype.height;
G.Terrain.prototype.height=function(x,z){let h=prev.call(this,x,z);
 if(x>687&&x<978&&z>-840&&z<-496){const dx=Math.max(724-x,0,x-938),dz=Math.max(-804-z,0,z+532);const w=1-G.smooth(0,36,Math.max(dx,dz));if(!this.water(x,z,.025))h=mix(h,S.y-.11,w);}
 // Cut a real recess beneath the lakeside stair and terrace, not a floating slab.
 if(x>700&&x<730&&Math.abs(z+636)<12.2){const floor=x<722?102.05:102.05+(x-722)*.92;h=Math.min(h,floor);}
 if(x>1033&&x<1114&&z>247&&z<310){const d=Math.max(Math.abs((x-1073)/29),Math.abs((z-276)/25));h=mix(h,prev.call(this,1072,261),1-G.smooth(.78,1.36,d));}
 return h;
};
const scarletRoute=G.routes.find(r=>r.id==='route-scarlet');
if(scarletRoute){scarletRoute.points=[[450,-485],[530,-478],[655,-479],[776,-501],[820,-525],[820,-552]];scarletRoute.samples=G.spline(scarletRoute.points,3);scarletRoute.note='P：入馆道路绕过雾之湖南岸，在铁门前结束。';}
function ring(g,x,y,z,r,thick,h,col,N=36){for(let i=0;i<N;i++){const a=i*2*Math.PI/N,b=(i+1)*2*Math.PI/N;const p=(t,R,Y)=>[x+Math.cos(t)*R,Y,z+Math.sin(t)*R];g.quad(p(a,r,y),p(b,r,y),p(b,r,y+h),p(a,r,y+h),col);g.quad(p(b,r-thick,y),p(a,r-thick,y),p(a,r-thick,y+h),p(b,r-thick,y+h),col);g.quad(p(a,r,y+h),p(b,r,y+h),p(b,r-thick,y+h),p(a,r-thick,y+h),col);}}
function roof(g,det,x,y,z,w,d,h){const p=(sx,sz,Y,W,D)=>[x+sx*W/2,Y,z+sz*D/2];
 // European hipped roof, no Japanese curved eaves.
 const ridge=w*.58;for(const sz of[-1,1])g.quad(p(-1,sz,y,w,d),p(1,sz,y,w,d),[x+ridge/2,y+h,z],[x-ridge/2,y+h,z],K.roof);
 for(const sx of[-1,1])g.tri(p(sx,-1,y,w,d),p(sx,1,y,w,d),[x+sx*ridge/2,y+h,z],K.roof);
 g.box(x,y-.25,z,w+.30,.4,d+.3,K.dark); // thin soffit below surfaces
 // Fix the soffit: it is a shallow horizontal slab, not a volume in the roof.
 for(const sz of[-1,1]){g.box(x,y-.10,z+sz*d/2,w+.7,.26,.4,K.trim);for(let t=.10;t<.99;t+=.105){const W=mix(ridge,w,t),zz=z+sz*d*.5*t;det.tube([x-W/2,y+h*(1-t)+.06,zz],[x+W/2,y+h*(1-t)+.06,zz],.03,K.slate,4);}}
 g.box(x,y+h,z,ridge+.5,.23,.30,K.dark);
 for(const sx of[-1,1])for(const sz of[-1,1])det.tube(p(sx,sz,y+.05,w,d),[x+sx*ridge/2,y+h+.05,z],.085,K.dark,6);
}
function arch(g,x,y,z,w,h,col,depth=.30){const r=w/2,cy=y+h-r;for(let i=0;i<20;i++){const a=i*Math.PI/20,b=(i+1)*Math.PI/20;const p=(t,R,Z)=>[x+Math.cos(t)*R,cy+Math.sin(t)*R,Z];g.quad(p(a,r+.19,z),p(b,r+.19,z),p(b,r,z+.06),p(a,r,z+.06),col);g.quad(p(a,r+.19,z-depth),p(a,r+.19,z),p(b,r+.19,z),p(b,r+.19,z-depth),col);}
 for(const s of[-1,1])g.box(x+s*(r+.095),y,z-.1,.19,h-r,.4,col);g.box(x,y-.14,z,w+.7,.22,.48,col);}
function window(g,x,y,z,w=1.55,h=3.35){const r=w/2,cy=y+h-r;
 g.box(x,y,z,w,h-r,.10,K.dark);for(let i=0;i<16;i++)g.tri([x,cy,z+.055],[x+Math.cos(i*Math.PI/16)*r,cy+Math.sin(i*Math.PI/16)*r,z+.055],[x+Math.cos((i+1)*Math.PI/16)*r,cy+Math.sin((i+1)*Math.PI/16)*r,z+.055],K.glass);
 g.box(x,y+.10,z+.065,w-.14,h-r-.10,.06,K.glass);arch(g,x,y,z+.06,w,h,K.trim);
 for(const yy of[y+1.12,y+2.10])g.box(x,yy,z+.12,w,.065,.08,K.iron);g.box(x,y,z+.13,.07,h-.11,.07,K.iron);
 for(const s of[-1,1])g.tube([x,y+1.1,z+.14],[x+s*w*.43,y+1.98,z+.14],.026,K.gold,4);
}
function ironFence(g,a,b,y,h=2.6,spacing=.72){const len=G.length(G.sub(b,a)),n=Math.ceil(len/spacing),vec=G.sub(b,a);for(let i=0;i<=n;i++){const p=G.add(a,G.mul(vec,i/n));g.tube([p[0],y,p[2]],[p[0],y+h,p[2]],.035,K.iron,5);g.cone(p[0],y+h,p[2],.085,0,.24,K.iron,5);}
 for(let yy of[.27,h-.36])g.tube([a[0],y+yy,a[2]],[b[0],y+yy,b[2]],.058,K.iron,6);
}
function lamp(g,x,y,z,s=1){g.cone(x,y,z,.28*s,.16*s,.55*s,K.base,8);g.cone(x,y+.55*s,z,.083*s,.055*s,2.2*s,K.iron,8);g.box(x,y+2.65*s,z,.53*s,.62*s,.53*s,K.gold);for(const dx of[-.27,.27])for(const dz of[-.27,.27])g.box(x+dx*s,y+2.60*s,z+dz*s,.035*s,.77*s,.035*s,K.iron);g.cone(x,y+3.32*s,z,.43*s,0,.44*s,K.iron,4);g.cone(x,y+2.57*s,z,.42*s,.42*s,.09*s,K.iron,4);}
function balustrade(g,x,y,z,w,yaw=0){const o=g.origin.slice(),A=g.angle;g.place(x,y,z,yaw);g.box(0,0,0,w,.19,.55,K.trim);g.box(0,1.18,0,w,.18,.56,K.trim);for(let t=-w/2+.45;t<w/2;t+=.84){g.cone(t,.17,0,.12,.08,.26,K.trim,7);g.cone(t,.43,0,.08,.14,.27,K.trim,7);g.cone(t,.70,0,.14,.065,.28,K.trim,7);g.box(t,.98,0,.17,.2,.17,K.trim);}g.place(...o,A);}
function clockFace(g,x,y,z,r,yaw=0){const o=g.origin.slice(),A=g.angle;g.place(x,y,z,yaw);for(let i=0;i<80;i++){let a=i*Math.PI*2/80,b=(i+1)*Math.PI*2/80;g.tri([0,0,0],[r*Math.cos(a),r*Math.sin(a),0],[r*Math.cos(b),r*Math.sin(b),0],K.cream);g.quad([r*Math.cos(a),r*Math.sin(a),.02],[r*Math.cos(b),r*Math.sin(b),.02],[(r+.19)*Math.cos(b),(r+.19)*Math.sin(b),.03],[(r+.19)*Math.cos(a),(r+.19)*Math.sin(a),.03],K.gold);}
 const nums=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];for(let i=0;i<12;i++){const a=i*Math.PI/6,X=Math.sin(a)*r*.79,Y=Math.cos(a)*r*.79;const str=nums[i],hh=.53,ww=.20;for(let j=0;j<str.length;j++){const bx=X+(j-(str.length-1)/2)*.27,by=Y-hh/2;const ln=(u,v)=>g.tube([bx+u[0],by+u[1],.07],[bx+v[0],by+v[1],.07],.035,K.iron,4);if(str[j]==='I')ln([0,0],[0,hh]);else if(str[j]==='V'){ln([-ww/2,hh],[0,0]);ln([0,0],[ww/2,hh]);}else{ln([-ww/2,hh],[ww/2,0]);ln([ww/2,hh],[-ww/2,0]);}}}
 // Decorative fixed time 10:10, not the device clock or a claimed canonical time.
 g.tube([0,0,.12],[-r*.37,r*.31,.12],.10,K.iron,6);g.tube([0,0,.13],[r*.63,r*.36,.13],.065,K.iron,6);g.ellipsoid(0,0,.14,.18,.18,.05,K.gold,10,4);g.place(...o,A);
}
function buildScarlet(terrain){const bank=new G.BatchBank(),props=new G.PropInstances(),plantSites=[],R=G.rng(60626),meshes=[];const get=(x,z,mat='matte',lod='base')=>bank.get(x,z,mat,lod);const floor=terrain.height(820,-680)+.12,Y=floor;
 // Three-storey central block, two unequal wings, two octagonal front turrets.
 const volumes=[{id:'hall',x:830,z:-729,w:77,d:29,h:19.8},{id:'west-wing',x:783,z:-708,w:21,d:44,h:14.9},{id:'east-wing',x:877,z:-719,w:21,d:55,h:16.2}];
 for(const v of volumes){let g=get(v.x,v.z,'brick'),d=get(v.x,v.z,'roof','near');g.box(v.x,Y-.55,v.z,v.w+1.3,.74,v.d+1.3,K.base);g.box(v.x,Y+.15,v.z,v.w,v.h,v.d,v.id==='hall'?K.brick:K.brick2);
 for(const h of[.6,6.3,12.5,v.h-.23]){let t=get(v.x,v.z);t.box(v.x,Y+h,v.z,v.w+.6,.20,v.d+.6,K.trim);}
 roof(get(v.x,v.z,'roof'),d,v.x,Y+v.h+.2,v.z,v.w+2.3,v.d+2.6,v.id==='hall'?9.8:7.1);
 for(const side of[-1,1]){const zz=v.z+side*(v.d/2+.055),gg=get(v.x,zz);for(let ix=-1;ix<=1;ix++){let xx=v.x+ix*v.w*.30;for(let lev=0;lev<(v.id==='hall'?3:2);lev++){const old=gg.origin.slice();gg.place(xx,Y+1.7+lev*6.25,zz,side===1?0:Math.PI);window(gg,0,0,.04,1.6,3.4);gg.place(...old,0);}}}
 // Real stone quoins form the corners instead of a uniform red block.
 const det=get(v.x,v.z,'matte','near');for(const sx of[-1,1])for(const sz of[-1,1])for(let h=.9;h<v.h;h+=.78){det.box(v.x+sx*v.w/2,Y+h,v.z+sz*(v.d/2+.05),.70,.52,.32,blend(K.trim,K.brick,.25));det.box(v.x+sx*(v.w/2+.05),Y+h,v.z+sz*v.d/2,.32,.52,.70,blend(K.trim,K.brick,.25));}
 // Sparse side windows, inset coloured panes.
 for(const sx of[-1,1])for(const zz of[-.28,.23])for(let lev=0;lev<2;lev++){const gg=get(v.x,v.z);gg.place(v.x+sx*(v.w/2+.07),Y+1.8+lev*6.3,v.z+zz*v.d,sx*Math.PI/2);window(gg,0,0,0,1.45,3.15);gg.place();}
 }
 for(const [x,z,h]of[[791,-710,26],[869,-710,27.5]]){const g=get(x,z,'brick'),d=get(x,z);g.cone(x,Y,z,6.2,6.2,h,K.brick,8);for(let y of[.1,6.3,12.5,h-.4])d.cone(x,Y+y,z,6.55,6.55,.33,K.trim,8);d.cone(x,Y+h,z,7.1,0,13.4,K.roof,8);d.cone(x,Y+h+13.4,z,.15,0,2.2,K.iron,7);for(let y of[2.0,8.5,15])window(d,x,Y+y,z+6.24,1.45,3.3);}
 const g=get(830,-731,'brick'),d=get(830,-731);g.box(830,Y+14,-731,12,29.8,12,K.brick);for(const yy of[31.5,42.8])d.box(830,Y+yy,-731,12.9,.50,12.9,K.trim);
 clockFace(d,830,Y+36.1,-724.88,4.4);clockFace(d,836.12,Y+36.1,-731,4.4,Math.PI/2);clockFace(d,823.88,Y+36.1,-731,4.4,-Math.PI/2);clockFace(d,830,Y+36.1,-737.12,4.4,Math.PI);
 d.cone(830,Y+44,-731,10.1,0,11.8,K.roof,4);d.cone(830,Y+55.8,-731,.13,0,2.8,K.gold,7);
 // Front portico: open column bays and an accessible balcony silhouette.
 let por=get(830,-707);por.box(830,Y+.12,-707,20,1.1,10.8,K.base);por.box(830,Y+6.45,-707,20.8,.50,11.1,K.trim);
 for(let x of[821.6,838.4])for(let z of[-702.6,-710.5]){por.cone(x,Y+1.25,z,.46,.40,5.0,K.trim,12);por.box(x,Y+1.13,z,.95,.20,.95,K.trim);por.box(x,Y+6.18,z,1.08,.28,1.08,K.trim);}
 for(let i=0;i<8;i++)por.box(830,Y+.15*i,-699.7-i*.35,14,.16,.45,K.trim);
 // Geometric door reveal, double leaves and arch voussoirs.
 por.box(830,Y+1.2,-714.37,4.8,5.4,.11,K.dark);arch(por,830,Y+1.2,-714.24,4.8,6.2,K.trim,.35);for(const x of[828.8,831.2]){por.box(x,Y+1.25,-714.17,2.17,4.75,.10,K.wood);for(const yy of[2.0,3.7])por.box(x,Y+yy,-714.08,1.64,1.05,.03,K.brick);por.cone(x+(x<830?.66:-.66),Y+3.4,-713.98,.065,.065,.15,K.gold,8);}
 balustrade(por,830,Y+6.98,-701.6,20.8);balustrade(por,819.6,Y+6.98,-707,10.8,Math.PI/2);balustrade(por,840.4,Y+6.98,-707,10.8,Math.PI/2);
 por.cone(829,Y+7,-705,1.4,1.4,.12,K.wood,24);por.cone(829,Y+7.1,-705,.11,.10,.65,K.iron,8);por.cone(829,Y+7.75,-705,1.3,1.3,.12,K.wood,24);
 for(const x of[826,832]){props.add('stool',x,Y+7,-705,1.3);}
 // Court ground uses large quiet material fields; ornamental beds are not random scatter.
 let court=get(824,-633,'ground');court.box(827,Y-.08,-660,192,.12,203,K.grass);
 let paving=get(821,-630,'paving');paving.box(830,Y+.065,-665,12,.10,65,K.trim);paving.box(820,Y+.07,-584,12,.10,60,K.trim);paving.box(827,Y+.06,-633,180,.09,8,K.trim);paving.box(819,Y+.06,-691,151,.09,6,K.trim);
 // Fan out around the central basin; do not pave through the fountain.
 for(let side of[-1,1]){paving.box(820+side*11,Y+.07,-624,7,.09,48,K.trim);paving.box(820+side*5.5,Y+.07,-602,18,.09,6,K.trim);}
 const fountain={x:820,y:Y,z:-635,r:7.6};let fg=get(820,-635);ring(fg,820,Y+.08,-635,7.8,.55,.55,K.trim,64);ring(fg,820,Y+.12,-635,8.65,.80,.21,K.base,64);fg.cone(820,Y+.2,-635,1.4,1.0,1.9,K.trim,24);ring(fg,820,Y+2.0,-635,2.6,.30,.38,K.trim,40);fg.cone(820,Y+2.15,-635,.68,.28,2.5,K.trim,16);ring(fg,820,Y+4.35,-635,1.25,.19,.25,K.trim,32);fg.cone(820,Y+4.3,-635,.29,.08,.65,K.gold,14);
 const water=new G.Geometry();for(let i=0;i<96;i++){let a=i*Math.PI*2/96,b=(i+1)*Math.PI*2/96;water.tri([820,Y+.32,-635],[820+Math.cos(b)*7.20,Y+.32,-635+Math.sin(b)*7.20],[820+Math.cos(a)*7.20,Y+.32,-635+Math.sin(a)*7.20],K.water);}meshes.push(water.mesh('scarlet:fountain-water','water',{material:'water',evidence:'P'}));
 const jet=new G.Geometry();for(let i=0;i<12;i++){let a=i*Math.PI/6;for(let j=0;j<9;j++){let t=j/9,u=(j+1)/9,p=t=>[820+Math.cos(a)*(1.0+t*3.0),Y+.38+4.1*(1-t*t),-635+Math.sin(a)*(1+t*3)];jet.tube(p(t),p(u),.045,blend(K.water,K.cream,.65),6);}}
 meshes.push(jet.mesh('scarlet:fountain-jets','effects',{material:'jet',evidence:'P'}));
 const beds=[];for(const side of[-1,1])for(let i=0;i<3;i++){let bx=820+side*(i===0?38:47),bz=[-672,-610,-578][i],w=[33,42,42][i],dep=[23,23,17][i];beds.push({x:bx,z:bz,w,d:dep});const b=get(bx,bz);b.box(bx,Y+.13,bz,w,.18,dep,rgb('#5b674c'));for(const z of[bz-dep/2,bz+dep/2]){b.box(bx,Y+.28,z,w+.8,.68,1.2,K.hedge);b.box(bx,Y+.9,z,w+.8,.12,1.12,blend(K.hedge,K.grass,.28));}for(const x of[bx-w/2,bx+w/2])b.box(x,Y+.28,bz,1.2,.76,dep,K.hedge);
 // Interlaced formal parterres: gravel, two rose ribbons, a low clipped knot.
 b.box(bx,Y+.32,bz,w-2.1,.07,dep-2.1,blend(K.trim,K.grass,.34));
 const rx=w*.35,rz=dep*.33;
 for(let j=0;j<62;j++){const a=j*2*Math.PI/62;const xx=bx+Math.cos(a)*rx,zz=bz+Math.sin(a)*rz;
 b.ellipsoid(xx,Y+.69,zz,.72,.40,.65,K.hedge,7,3);
 for(const off of[-1.15,1.15]){const X=bx+Math.cos(a)*(rx+off),Z=bz+Math.sin(a)*(rz+off*.6);b.cone(X,Y+.38,Z,.23,.14,.42,K.hedge,5);const fine=get(bx,bz,'matte','near');for(let k=0;k<2;k++){fine.ellipsoid(X+(k?-.14:.13),Y+.88+k*.10,Z,.15,.13,.16,k?K.rose:rgb('#cc8e93'),7,3);}}
 }
 for(let j=0;j<28;j++){const a=j*2*Math.PI/28,rr=2.2+.65*Math.cos(a*4);b.ellipsoid(bx+Math.cos(a)*rr,Y+.83,bz+Math.sin(a)*rr,.70,.55,.70,blend(K.hedge,K.grass,.18),8,3);}
 b.cone(bx,Y+.38,bz,.56,.37,.6,K.trim,10);b.cone(bx,Y+.98,bz,.37,.64,.6,K.trim,10);b.ellipsoid(bx,Y+1.72,bz,1.16,.91,1.16,K.hedge,10,4);

 }
 // Low walls and iron fencing. South gate is physically open with two swung leaves.
 const fence=get(820,-552),fY=Y+.5;for(const [a,b]of[[[724,0,-792],[930,0,-792]],[[930,0,-792],[930,0,-552]],[[724,0,-792],[724,0,-648]],[[724,0,-625],[724,0,-552]],[[724,0,-552],[813,0,-552]],[[827,0,-552],[930,0,-552]]]){const mx=(a[0]+b[0])/2,mz=(a[2]+b[2])/2,len=Math.hypot(b[0]-a[0],b[2]-a[2]),f=get(mx,mz);f.box(mx,Y-.1,mz,Math.abs(a[0]-b[0])+1.05,.66,Math.abs(a[2]-b[2])+1.05,K.base);ironFence(f,a,b,Y+.57,2.6);for(let j=0;j<=len;j+=12){const t=j/len,x=mix(a[0],b[0],t),z=mix(a[2],b[2],t);f.box(x,Y+.5,z,.72,2.85,.72,K.brick);f.cone(x,Y+3.35,z,.57,0,.52,K.trim,4);}}
 for(const x of[811.4,828.6]){fence.box(x,Y-.1,-552,2.8,.4,2.8,K.base);fence.box(x,Y+.3,-552,1.9,4.9,1.9,K.brick);for(const yy of[.75,4.8])fence.box(x,Y+yy,-552,2.22,.27,2.22,K.trim);lamp(fence,x,Y+5.02,-552,.72);}
 for(const side of[-1,1]){const leaf=get(820,-552);leaf.place(820+side*7.6,Y+.6,-552,side*-.78);ironFence(leaf,[0,0,0],[-side*6.7,0,0],0,3.4,.38);for(let k=0;k<8;k++){const cx=-side*(.6+k*.82);for(let j=0;j<16;j++){let a=j*2*Math.PI/16,b=(j+1)*2*Math.PI/16;leaf.tube([cx+.28*Math.cos(a),1.9+.48*Math.sin(a),0],[cx+.28*Math.cos(b),1.9+.48*Math.sin(b),0],.026,K.iron,4);}}leaf.place();}
 let entry=get(820,-540,'paving');entry.box(820,Y+.01,-544,21,.10,18,K.trim);
 // Tea pergola off the eastern crosswalk. No assertion of a canonical named building.
 let tea=get(907,-645);tea.box(907,Y+.04,-645,14,.22,13,K.base);for(const x of[901,913])for(const z of[-650,-640])tea.box(x,Y+.25,z,.23,3.4,.23,K.iron);for(let x=900;x<=914;x+=1.05)tea.box(x,Y+3.68,-645,.19,.19,13,K.trim);for(const z of[-650,-640])tea.box(907,Y+3.48,z,14,.24,.25,K.trim);
 for(const x of[903,910]){tea.cone(x,Y+.24,-645,.1,.1,.64,K.iron,7);tea.cone(x,Y+.88,-645,1.0,1.0,.12,K.trim,20);props.add('teapot',x,Y+1.02,-645,.8);for(const z of[-647,-643])props.add('stool',x,Y+.28,z,1.0);}

 // A secondary scale between whole masses and brick joints: pilasters, consoles,
 // classical pediment and discreet roof chimneys. Unseen elevations are P.
 const trimG=get(830,-718),trimD=get(830,-718,'matte','near');
 for(const x of[796,818,842,864]){trimG.box(x,Y+.4,-714.22,.56,19.0,.26,K.trim);trimG.box(x,Y+18.9,-714.02,1.06,.42,.59,K.trim);}
 for(let x=793;x<868;x+=1.5)trimD.box(x,Y+19.10,-713.70,.42,.52,.58,K.trim);
 // Front crown above the recessed entrance, not an added fourth-storey room.
 trimG.tri([821,Y+20,-713.65],[839,Y+20,-713.65],[830,Y+25.3,-716.0],K.brick);
 trimG.tube([820.6,Y+20,-713.57],[830,Y+25.55,-715.95],.15,K.trim,6);trimG.tube([839.4,Y+20,-713.57],[830,Y+25.55,-715.95],.15,K.trim,6);
 for(const x of[802,856]){const cg=get(x,-736,'brick');cg.box(x,Y+25.1,-736,2.3,6.2,1.95,K.brick);const cc=get(x,-736);cc.box(x,Y+30.7,-736,2.65,.4,2.27,K.trim);for(const xx of[-.53,.53])cc.cone(x+xx,Y+31.1,-736,.25,.24,.79,K.dark,8);}
 for(const z of[-757,-770]){balustrade(trimG,830,Y+.13,z,36);}
 // Paths and benches are spaced independently of the box parterres.
 const gardenDetail=get(820,-641);for(const xx of[798,842])for(const zz of[-648,-621]){
 gardenDetail.cone(xx,Y+.12,zz,.82,.48,.95,K.trim,12);gardenDetail.ellipsoid(xx,Y+1.85,zz,1.06,1.10,1.06,K.hedge,10,5);
 }
 for(const [x,z]of[[745,-647],[745,-629],[896,-649],[896,-620]]){for(let k=0;k<4;k++)gardenDetail.box(x,Y+.49,z-.30+k*.2,4.5,.09,.17,K.wood);for(const q of[-1.6,1.6])gardenDetail.box(x+q,Y+.1,z,.11,.43,.46,K.iron);gardenDetail.box(x,Y+.75,z+.27,4.5,.62,.12,K.wood);}
 // Laurel trellis around the quiet tea terrace, leaving both ends open.
 const vine=get(907,-645);for(const X of[900.1,913.9])for(let i=0;i<8;i++){const zz=-650.5+i*1.55;vine.ellipsoid(X,Y+3.70,zz,.75,.36,.92,blend(K.hedge,K.grass,.12),8,3);if(i%2===0)vine.ellipsoid(X,Y+2.35,zz,.43,1.03,.50,K.hedge,7,3);}
 // Lakeside terrace and footpath remain outside the lake basin. P pier, no fabricated island.
 const terrace=get(715,-636);terrace.box(715,102.2,-636,19,1.1,21,K.base);terrace.box(715,103.3,-636,19.3,.18,21.3,K.trim);for(let i=0;i<12;i++){const top=110.01-i*.55;terrace.box(727-i*.95,102.05,-636,1.00,top-102.05,6.4,K.base);terrace.box(727-i*.95,top-.16,-636,1.05,.16,6.48,K.trim);}
 for(const z of[-646.2,-625.8])balustrade(terrace,715,103.48,z,19.2);balustrade(terrace,705.6,103.48,-642,9,Math.PI/2);balustrade(terrace,705.6,103.48,-627.8,4.5,Math.PI/2);lamp(terrace,708,103.5,-629,.9);lamp(terrace,708,103.5,-643,.9);
 const pier=get(680,-627);for(let i=0;i<6;i++)pier.box(704.5-i*.48,103.1-i*.36,-632,.55,.37,4.1,K.trim);for(let i=0;i<22;i++)pier.box(680+i*1.13,101.0,-632,1.08,.16,4.0,K.wood);for(const x of[681,689,697])for(const z of[-633.5,-630.5])pier.cone(x,98,z,.18,.18,4,K.wood,7);
 // Shore perimeter: reeds and stones follow the real procedural lake outline.
 const lake=terrain.lakes.find(l=>l.id==='mist_lake')||terrain.lakes[0],shore=[];
 for(let i=0;i<66;i++){let a=-1.0+i*.037,rr=1+.055*Math.sin(a*3+lake.phase)+.035*Math.cos(a*5+.5)-.085*Math.exp(-((Math.atan2(Math.sin(a),Math.cos(a))/.6)**2)),x=lake.x+Math.cos(a)*lake.rx*rr*1.023,z=lake.z+Math.sin(a)*lake.rz*rr*1.023,y=terrain.height(x,z);shore.push([x,y,z]);const gg=get(x,z);gg.ellipsoid(x,y-.15,z,1.2+R()*1.6,.6+R()*.8,1.1+R()*1.1,blend(K.base,K.cream,.15+R()*.2),7,4);if(i%3===0)for(let j=0;j<6;j++){let X=x+(R()-.5)*3,Z=z+(R()-.5)*3,Y0=terrain.height(X,Z);gg.tube([X,Y0,Z],[X+.2,Y0+1+R()*1.4,Z+.3],.027,K.hedge,4);}}
 for(const[x,z]of[[747,-744],[742,-705],[750,-674],[748,-582],[912,-580],[911,-682],[926,-762],[748,-768]])plantSites.push({x,z,type:'cedar',scale:1.10});
 for(const[x,z]of[[751,-548],[902,-534],[934,-698],[927,-802],[948,-626],[729,-799],[954,-766]])plantSites.push({x,z,type:'broadleaf',scale:1.50});
 for(let z=-580;z>=-698;z-=20)for(let s of[-1,1])lamp(get(820+s*12,z),820+s*12,Y+.10,z,.91);
 for(const [x,z] of[[738,-619],[739,-654],[899,-606],[899,-673]]){props.add('stool',x,Y+.15,z,1.8);props.add('planter',x+2.2,Y+.15,z,1.9);}
 for(let i=0;i<24;i++){const X=741+(i%2)*180,Z=-776+Math.floor(i/2)*18;plantSites.push({x:X+(R()-.5)*5,z:Z,type:i%3===0?'broadleaf':'cedar',scale:.86+R()*.42});}
 for(let i=0;i<17;i++){const a=.16+i*.071,rr=1+.055*Math.sin(a*3+lake.phase)+.035*Math.cos(a*5+.5)-.085*Math.exp(-((a/.6)**2));const X=lake.x+Math.cos(a)*lake.rx*rr*1.10,Z=lake.z+Math.sin(a)*lake.rz*rr*1.10;if(Z>-652&&Z<-616)continue;plantSites.push({x:X,z:Z,type:i%3===0?'willow':'broadleaf',scale:1.05+R()*.36});}
 for(let i=0;i<64;i++){const X=730+R()*223,Z=-819-R()*87;if(!terrain.water(X,Z,.10))plantSites.push({x:X,z:Z,type:i%3?'cedar':'broadleaf',scale:1.1+R()*.78});}
 const geo=bank.meshes();geo.forEach(m=>{m.id='scarlet:'+m.id;m.locationId='scarlet';m.evidence='P';});const ps=props.meshes();ps.forEach(m=>{m.id='scarlet:'+m.id;m.evidence='P';});meshes.push(...geo,...ps);
 return{meshes,plantSites,footprints:[{id:'scarlet-estate',x:827,z:-672,rx:113,rz:128}],meta:{basis:'P',refined:true,version:'0.6.0',mainFloorY:Y,volumes,clockFaces:4,gardenBeds:beds.length,gate:{x:820,y:Y,z:-552},fountain,shoreSamples:shore.length,interiors:false,reference:'绯想天钟楼视觉；求闻史纪p144日文原文；背立面、园路和码头是本作补完'},signs:[]};
}
Object.assign(G,{buildScarlet,SCARLET:S});
})(globalThis.GA);

/* Night-sparrow eatery v0.6: user-requested F/P interpretation of the yatai.
   Original mobile grill remains parked behind. The roofed dining house is a
   project addition inspired by Mystia's Izakaya, not a claimed canon dwelling. */
(function(G){'use strict';
function buildMystia(terrain){const {C,rgb,blend}=G,bank=new G.BatchBank(),props=new G.PropInstances(),plantSites=[],x=1072,z=274,y=terrain.height(x,z),yaw=Math.PI;
 const g=bank.get(x,z).place(x,y,z,yaw),d=bank.get(x,z,'roof','near').place(x,y,z,yaw),near=bank.get(x,z,'matte','near').place(x,y,z,yaw);
 const blue=rgb('#455f69'),plum=rgb('#865765'),gold=rgb('#c7ab70');
 const at=(a,b,c)=>g.point([a,b,c]);const prop=(type,a,b,c,scale=1)=>props.add(type,...at(a,b,c),scale,yaw,[1,1,1],'night-sparrow');
 // Raised planked dining terrace, narrow stair access and open street frontage.
 g.box(0,-.20,2.0,23,.45,19.4,C.base);g.box(0,.24,2.0,22.6,.20,19.0,C.woodDark);
 for(let q=-11.15;q<11.2;q+=.40)g.box(q,.44,2.0,.37,.08,18.8,C.timber);
 for(let i=0;i<3;i++)g.box(0,-.14+i*.19,12.55-i*.48,6.8,.19,.54,C.stoneLight);
 // Enclosed back kitchen, open front counter, side windows with actual frame depth.
 g.box(0,.52,-2.8,13.4,4.40,5.2,C.plaster);g.box(0,.60,-.14,13.4,.92,.18,C.wood);g.box(0,3.10,-.14,13.4,1.40,.18,C.wood);
 g.box(0,1.28,-.22,12.6,1.78,.055,C.shadow);
 for(const xx of[-6.5,-3.2,0,3.2,6.5])g.box(xx,.50,.02,.20,4.70,.24,C.woodDark);
 for(const xx of[-6.75,6.75]){g.box(xx,.55,-2.7,.24,4.37,5.25,C.wood);G.windowPanel(g,xx,1.5,-2.7,2.4,1.65,Math.sign(xx)*Math.PI/2);}
 g.box(0,1.31,1.04,14.8,.25,2.42,C.timber);g.box(0,.5,1.08,13.6,.75,1.12,C.woodDark);
 for(const xx of[-6.75,6.75])g.box(xx,.50,2.05,.22,4.20,.23,C.wood);
 G.roof(g,0,4.80,-2.4,16.2,10.0,3.0,blue,d,false);
 // Deep front awning joins the main roof, with diagonal struts and a readable trade sign.
 for(const xx of[-10.6,10.6,-5.0,5.0]){g.box(xx,.51,6.0,.19,3.20,.19,C.wood);g.tube([xx,2.55,6],[xx,3.9,4.5],.085,C.timber,4);}
 g.quad([-11.0,3.72,6.9],[11.0,3.72,6.9],[11.0,4.48,2.6],[-11.0,4.48,2.6],blue);g.box(0,3.58,6.8,22.2,.19,.24,C.timber);
 for(let q=-9.9;q<10;q+=.68)near.tube([q,3.78,6.85],[q,4.55,2.6],.053,blend(blue,C.slate2,.25),4);
 for(let q=-5.9;q<=5.9;q+=1.5)g.box(q,2.68,2.45,1.37,.93,.07,plum);
 // Serving and preparation: grill grate, skewers, fish, bottles, stacked bowls.
 g.box(3.7,1.59,1.05,2.75,.32,1.35,C.woodDark);g.box(3.7,1.9,1.05,2.5,.06,1.16,rgb('#6c534a'));
 for(let q=2.55;q<4.9;q+=.18)near.tube([q,1.99,.51],[q,1.99,1.59],.024,C.stone,4);
 for(let i=0;i<6;i++){const xx=2.68+i*.36;near.tube([xx,2.07,.30],[xx,2.07,1.57],.016,C.timber,4);for(let j=0;j<3;j++)near.ellipsoid(xx,2.09,.6+j*.28,.095,.055,.115,rgb('#a77a4d'),7,3);}
 for(let shelf of[1.56,2.34]){g.box(-3.15,shelf,-.08,4.0,.13,.90,C.timber);for(let i=0;i<5;i++)prop('jar',-4.75+i*.68,shelf+.13,.05,.52);}
 for(let i=0;i<6;i++){prop('teapot',-5.6+i*1.1,1.59,1.70,.55);g.cone(-5.6+i*1.1,1.59,2.00,.18,.22,.16,C.cream,10);}
 for(let q=-5.8;q<=5.8;q+=1.65)prop('stool',q,.54,3.22,1.12);
 // Outdoor tables, not an empty booth. Tableware is real geometry.
 for(const[a,c]of[[-7.9,8.85],[0,8.85],[7.9,8.85],[-9.05,3.0],[9.05,3.0]]){g.box(a,1.20,c,3.55,.16,1.76,C.timber);for(const xx of[-1.28,1.28])for(const zz of[-.51,.51])g.box(a+xx,.54,c+zz,.12,.66,.12,C.woodDark);for(const side of[-1,1]){g.box(a,.84,c+side*1.47,3.2,.15,.57,C.wood);for(const xx of[-1.10,1.10])g.box(a+xx,.54,c+side*1.47,.13,.30,.24,C.woodDark);}prop('teapot',a,1.37,c,.66);for(const xx of[-1,1]){g.cone(a+xx,1.37,c,.29,.29,.04,C.cream,14);g.cone(a+xx,1.41,c,.11,.17,.10,C.cream,10);near.tube([a+xx-.25,1.41,c+.3],[a+xx+.25,1.41,c+.3],.014,C.timber,4);}}
 // Lantern strings, a feather emblem and inventory along the service side.
 for(const xx of[-10.5,-6,6,10.5]){G.lantern(g,xx,2.73,6.65,1.16);g.tube([xx,3.75,6.65],[xx,3.36,6.65],.025,C.wood,4);}
 g.box(0,4.84,2.7,5.1,.95,.17,C.woodDark);g.box(0,4.93,2.81,4.86,.73,.05,plum);
 // A small wing/feather silhouette on the sign cap; no copyrighted redraw.
 g.tube([-.4,5.94,2.6],[.52,6.40,2.6],.045,gold,6);for(let i=0;i<7;i++){const t=i/6;g.tube([-.35+t*.8,5.95+t*.4,2.6],[-.35+t*.8+.08,6.13+t*.45,2.6],.043,gold,5);}
 for(const[a,c]of[[8,-5.3],[9.2,-5.3],[-8,-5.0]])prop('barrel',a,.54,c,1.18);for(const[a,c]of[[8,-3.4],[9.2,-3.5],[8,-2.4]])prop('crate',a,.54,c,.94);
 for(const a of[-10.4,10.4]){prop('planter',a,.53,10.5,1.8);g.box(a,.6,-.9,.18,1.12,8.9,C.wood);}
 // Small birds-and-beasts music corner: a removable stage, not a new permanent canon hall.
 const sg=bank.get(1092,266).place(1092,y,269,.15);sg.box(0,0,0,6.3,.48,4.5,C.woodDark);for(let xx=-2.9;xx<3;xx+=.34)sg.box(xx,.48,0,.30,.06,4.34,C.timber);
 for(const xx of[-1.0,1.0]){sg.cone(xx,.54,0,.30,.28,.07,C.woodDark,10);sg.tube([xx,.6,0],[xx,2.0,0],.033,C.woodDark,6);sg.tube([xx,2,0],[xx-.35,2.06,-.1],.07,C.woodDark,7);}
 sg.box(-2.2,.56,1.1,.85,.85,.60,blue);sg.box(-2.2,.65,1.43,.68,.65,.05,C.woodDark);
 const stage={x:1092,y,z:269};
 // Flat rest area directly meets the original route, without covering the entire woods.
 const clear=bank.get(x,z,'ground');for(let i=0;i<48;i++){const a=i*Math.PI*2/48,b=(i+1)*Math.PI*2/48,pt=t=>[1074+Math.cos(t)*(30+1.5*Math.sin(t*5)),y-.045,272+Math.sin(t)*(23+1.2*Math.cos(t*3))];clear.tri([1074,y-.045,272],pt(b),pt(a),rgb('#999077'));}
 const path=bank.get(x,z,'paving');for(let Z=247;Z<261;Z+=.65){const Y0=terrain.height(1072,Z)+.055;path.box(1072,Y0,Z,6.8,.075,.68,C.stone);}
 for(const[X,Z,type,s]of[[1041,277,'cherry',1.15],[1106,285,'cherry',1.1],[1087,301,'broadleaf',1.38],[1054,302,'cedar',1.3],[1038,252,'broadleaf',1.05]])plantSites.push({x:X,z:Z,type,scale:s});
 // Low boulders frame Wriggle's nearby clearing and Rumia's trail nook.
 for(let i=0;i<10;i++){let a=i*2.4,X=1113+Math.cos(a)*7,Z=274+Math.sin(a)*8,Y=terrain.height(X,Z);clear.ellipsoid(X,Y,Z,.6,.45,.65,blend(C.stone,C.leaf,.30),7,3);}
 // A planted woodland edge frames the eatery instead of an empty rectangular lot.
 const edgeR=G.rng(66102);for(let i=0;i<27;i++){const a=.06+i*Math.PI/26,X=1074+Math.cos(a)*32,Z=274+Math.sin(a)*27,Y0=terrain.height(X,Z);props.add('shrub',X,Y0,Z,1.4+edgeR()*.8,0,[.48,.61,.39],'woodland-edge');if(i%3===0)plantSites.push({x:X+Math.cos(a)*3,z:Z+Math.sin(a)*3,type:i%2?'cedar':'broadleaf',scale:1.0+edgeR()*.35});}
 for(const X of[1046,1102])for(let Z=269;Z<290;Z+=3.3){const Y0=terrain.height(X,Z);clear.tube([X,Y0,Z],[X,Y0+1.05,Z],.065,C.timber,6);clear.tube([X,Y0+.7,Z],[X,Y0+.7,Z+3.3],.055,C.timber,6);}
 const meshes=bank.meshes();meshes.forEach(m=>{m.id='mystia-house:'+m.id;m.evidence='P';m.locationId='beast_path';});for(const m of props.meshes()){m.id='mystia-house:'+m.id;m.evidence='P';meshes.push(m);}
 const signPos=[x,y+5.30,z-2.865];
 return{meshes,plantSites,footprints:[{id:'mystia-dining-clearing',x:1075,z:273,rx:33,rz:28}],signs:[{text:'夜雀屋',position:signPos,width:4.45,height:.70,yaw:Math.PI,color:'#f1dfb3',background:'#865765'}],meta:{basis:'F/P',name:'夜雀屋',kind:'同人氛围参考下的本作屋台式食堂；非原作固定住宅',position:[x,y,z],tables:5,counterSeats:8,stage,mobileCartRetained:true,source:'东方文花帖米斯蒂娅报道；东方夜雀食堂；鸟兽伎乐报道'}};
}
G.buildMystia=buildMystia;
})(globalThis.GA);

/* REGION 05 — Myouren Temple. Source constraints and all numerical geometry kept separate.
   +Z is the rear of this project layout. Historic mausoleum is BELOW the rear cemetery,
   not a modern house on the temple's lawn. Roof/back elevations and paths are P designs. */
(function(G){'use strict';
const C=G.C, col=G.rgb, PI=Math.PI;
const MC={wood:col('#654731'),dark:col('#382c28'),beam:col('#925f3b'),wall:col('#d7cdb4'),roof:col('#35494a'),edge:col('#65716a'),red:col('#a63836'),stone:col('#929a8c'),moss:col('#61744c'),gold:col('#b39b59')};
const smooth=(a,b,x)=>{const t=G.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const oldHeight=G.Terrain.prototype.height,oldColor=G.Terrain.prototype.color;
G.Terrain.prototype.height=function(x,z){let h=oldHeight.call(this,x,z);const d=Math.max(Math.abs((x-306)/112),Math.abs((z-415)/141));if(d<1.17){let pad=40+3.8*smooth(340,380,z)+1.6*smooth(455,480,z);h=G.mix(h,pad,1-smooth(.94,1.17,d));}return h;};
G.Terrain.prototype.color=function(x,z,h){if(x>212&&x<402&&z>294&&z<453)return col('#929981');return oldColor.call(this,x,z,h);};
const rt=G.routes.find(r=>r.id==='route-temple');if(rt){rt.points=[[110,196],[110,245],[164,259],[240,264],[284,275],[300,287]];rt.samples=G.spline(rt.points,7);rt.note='P：村外路至山门；墓地在寺后，旧大祀庙在墓地下（历史状态）。';}

function steps(g,x,y,z,w,n,run,rise,forward=1,colour=C.stoneLight){for(let i=0;i<n;i++)g.box(x,y+i*rise,z+forward*i*run,w,rise,run+.012,colour);}
function rail(g,x,y,z,len,axis='x',colour=MC.beam){const X=t=>x+(axis==='x'?t:0),Z=t=>z+(axis==='z'?t:0);for(let t=-len/2;t<=len/2+.01;t+=Math.min(2,len)){g.box(X(t),y,Z(t),.22,1.13,.22,colour);g.box(X(t),y+1.13,Z(t),.38,.12,.38,colour);}for(let h of[.47,.94]){if(axis==='x')g.box(x,y+h,z,len,.12,.13,colour);else g.box(x,y+h,z,.13,.12,len,colour);}}
function lamp(g,x,y,z,s=1){g.box(x,y,z,1.2*s,.25*s,1.2*s,C.stone);g.box(x,y+.25*s,z,.68*s,.25*s,.68*s,C.stoneLight);g.cone(x,y+.5*s,z,.23*s,.19*s,1.4*s,C.stone,8);g.box(x,y+1.9*s,z,.83*s,.2*s,.83*s,C.stone);g.box(x,y+2.1*s,z,.55*s,.65*s,.55*s,col('#c3b890'));for(let dx of[-.29,.29])for(let dz of[-.29,.29])g.box(x+dx*s,y+2.1*s,z+dz*s,.09*s,.65*s,.09*s,C.stone);g.cone(x,y+2.76*s,z,.82*s,.16*s,.38*s,C.stone,4);g.ellipsoid(x,y+3.24*s,z,.16*s,.2*s,.16*s,C.stone,8,4);}
function jizo(g,x,y,z,s=1){g.box(x,y,z,.95*s,.20*s,.9*s,C.stone);g.cone(x,y+.2*s,z,.32*s,.23*s,.7*s,MC.stone,9);g.ellipsoid(x,y+1.12*s,z,.26*s,.31*s,.26*s,MC.stone,10,6);g.box(x,y+.69*s,z+.227*s,.39*s,.33*s,.075*s,MC.red);g.tube([x-.24*s,y+.63*s,z],[x,y+.75*s,z+.22*s],.075*s,MC.stone,6);g.tube([x+.24*s,y+.63*s,z],[x,y+.75*s,z+.22*s],.075*s,MC.stone,6);}
/* Layered hipped lower eave and a raised gable, with thickness, ribs, ridge end caps,
   and exposed brackets. Slopes are modeled; no billboard facades. */
function templeRoof(g,detail,x,y,z,w,d,rise,roof=MC.roof){
 const p=(side,u,t)=>{const xx=u*(w/2-(w-d*.62)/2*(1-t));return[x+xx,y+rise*(1-t)+.52*t*t*t*t,z+side*d/2*t];};
 for(let side of[-1,1])for(let k=0;k<12;k++){let t=k/12,v=(k+1)/12;g.quad(p(side,-1,t),p(side,1,t),p(side,1,v),p(side,-1,v),roof);}
 for(let side of[-1,1]){let a=[x+side*w/2,y+.52,z-d/2],b=[x+side*w/2,y+.52,z+d/2],r=[x+side*d*.31,y+rise,z];g.tri(a,b,r,roof);g.box(x,y+.28,z+side*d/2,w,.3,.26,MC.edge);}
 for(let side of[-1,1])g.box(x+side*w/2,y+.24,z,.26,.34,d,MC.edge);
 if(detail){for(let u=-.98;u<1;u+=.52/(w/2))for(let side of[-1,1]){let prev=p(side,u,0);for(let k=1;k<=10;k++){let next=p(side,u,k/10);detail.tube([prev[0],prev[1]+.08,prev[2]],[next[0],next[1]+.08,next[2]],.065,MC.edge,5);prev=next;}}
 for(let side of[-1,1])for(let t=-w/2+.3;t<w/2;t+=.65){g.box(x+t,y-.16,z+side*(d/2-.8),.13,.18,1.7,MC.beam);}}
 // Upper gable forms the irimoya silhouette.
 G.roof(g,x,y+rise*.55,z,w*.61,d*.52,rise*.7,roof,detail,false);
 for(let side of[-1,1]){g.box(x+side*w*.31,y+rise*1.25,z,.3,.42,1.0,MC.edge);g.ellipsoid(x+side*w*.31,y+rise*1.25+.4,z,.29,.3,.26,MC.edge,8,4);}
}
function brackets(g,x,y,z,span){for(let s=-span/2;s<=span/2+.1;s+=2.9){g.box(x+s,y,z,.45,.28,1.35,MC.beam);g.box(x+s,y+.28,z,.9,.24,.74,MC.beam);g.box(x+s,y+.52,z,1.34,.22,.48,MC.beam);}}
function hall(bank,x,z,w,d,base,main=false,yaw=PI){const g=bank.get(x,z),r=bank.get(x,z,'roof'),de=bank.get(x,z,'roof','near');g.place(x,base,z,yaw);r.place(x,base,z,yaw);de.place(x,base,z,yaw);const h=main?7.9:5.0;
 g.box(0,-.12,0,w+5,1.0,d+5,MC.stone);g.box(0,.88,0,w+3.7,.22,d+3.7,C.stoneLight);g.box(0,1.1,0,w+3.4,.3,d+3.4,MC.dark);
 for(let i=0;i<Math.ceil((d+3.4)/.44);i++)de.box(0,1.4,-(d+3.4)/2+i*.44,w+3.4,.07,.41,MC.wood);
 // Sunken dark interior instead of a wall where the central bays open.
 g.box(0,1.48,-1,w-.8,h-1,d-.8,MC.dark);g.box(0,1.48,-d/2+.1,w-.7,h-.2,.24,MC.wall);
 const bays=main?7:4;for(let i=0;i<=bays;i++){let xx=-w/2+w*i/bays;g.cone(xx,1.47,d/2,.3,.28,h,MC.wood,10);g.box(xx,h+1.1,d/2,.68,.48,.7,MC.beam);if(i<bays){let cx=xx+w/bays/2;if(!main||i<2||i>4){g.box(cx,1.5,d/2-.03,w/bays-.45,h-.6,.18,MC.wall);G.windowPanel(g,cx,2.3,d/2+.09,w/bays-.9,h-2.1,0,C.paper);}else{g.box(cx,1.55,d/2-2.9,w/bays-.6,4.0,.18,C.paper);for(let dx=-1.6;dx<=1.6;dx+=.4)de.box(cx+dx,1.57,d/2-2.76,.075,3.8,.08,MC.beam);}}}
 for(let side of[-1,1]){for(let i=0;i<5;i++){let zz=-d/2+d*i/4;g.cone(side*w/2,1.47,zz,.26,.24,h,MC.wood,9);}g.box(side*w/2,1.55,0,.2,h-.7,d-.6,MC.wall);for(let i=0;i<4;i++){g.place(x,base,z,yaw);let pp=g.point([side*(w/2+.14),2.8,-d*.36+i*d*.24]);g.place(...pp,yaw+side*PI/2);G.windowPanel(g,0,0,0,d*.19,2.8,0,C.paper);}g.place(x,base,z,yaw);}
 for(let yy of[2.15,h, h+.8]){g.box(0,yy,d/2,w+.65,.22,.35,MC.beam);g.box(0,yy,-d/2,w+.65,.22,.35,MC.beam);}
 for(let side of[-1,1]){brackets(g,0,h+1.25,side*d/2,w);rail(g,side*(w/2+1.25),1.48,0,d+1.7,'z');rail(g,0,1.48,-d/2-1.22,w+2.5);}
 templeRoof(r,de,0,h+2.04,0,w+7.8,d+7.0,main?6.2:4.0);
 // Deep front porch, opening and broad approach steps.
 if(main){for(let xx of[-6.8,6.8])g.cone(xx,1.48,d/2+5.1,.3,.28,6.4,MC.wood,10);templeRoof(r,de,0,7.2,d/2+3.9,17,9,3.2);g.box(0,1.4,d/2+3.7,15,.32,7.8,MC.wood);steps(g,0,.02,d/2+8.7,13,7,.54,.2,-1);for(let side of[-1,1])rail(g,side*6.65,1.5,d/2+3.9,6.8,'z');g.box(0,1.73,d/2+1.4,4,1.0,1.3,MC.wood);for(let k=-1.8;k<2;k+=.24)de.box(k,2.74,d/2+1.4,.08,.055,1.32,MC.dark);g.box(0,7.4,d/2+.35,2.1,.75,.15,MC.gold);
 }else steps(g,0,0,d/2+3.0,4.8,6,.36,.24,-1);
 return {x,z,y:base,width:w+8,depth:d+main*12+7};}
function belfry(bank,x,z,y){const g=bank.get(x,z),r=bank.get(x,z,'roof'),de=bank.get(x,z,'roof','near');g.place(x,y,z);r.place(x,y,z);de.place(x,y,z);g.box(0,0,0,11,.55,10,C.stone);steps(g,0,0,6.2,5,4,.5,.16,-1);for(let xx of[-3.9,3.9])for(let zz of[-3.4,3.4]){g.tube([xx*1.12,.55,zz*1.12],[xx,7.9,zz],.33,MC.wood,10,.27);g.box(xx,7.4,zz,.7,.55,1.2,MC.beam);}for(let z0 of[-3.4,3.4])g.box(0,7.8,z0,8.8,.4,.5,MC.wood);g.box(0,7.8,0,.5,.44,7.6,MC.wood);templeRoof(r,de,0,8.4,0,13,12,3.5);
 // Hollow-looking cast-bronze hanging bell, rim, bosses and striking beam.
 let bronze=col('#6d7051');g.cone(0,3.8,0,1.9,1.48,3.25,bronze,24);g.cone(0,3.65,0,2.04,1.9,.27,bronze,24);g.ellipsoid(0,7.0,0,1.49,.5,1.49,bronze,20,6);g.tube([0,7,0],[0,7.9,0],.12,MC.dark,7);for(let row=0;row<3;row++)for(let j=0;j<20;j++){let a=j/20*PI*2;de.ellipsoid(Math.cos(a)*1.63,5.5+row*.38,Math.sin(a)*1.63,.10,.10,.10,MC.gold,5,3);}g.cone(0,3.55,0,1.76,1.76,.08,MC.dark,24);g.tube([2.3,4.9,-2.2],[2.3,4.9,3.1],.30,MC.wood,10);for(let zz of[-1.3,2.2])g.tube([2.3,5,zz],[2.3,7.8,zz],.04,MC.dark,5);
}
function gate(bank,x,z,y){const g=bank.get(x,z),r=bank.get(x,z,'roof'),de=bank.get(x,z,'roof','near');g.place(x,y,z);r.place(x,y,z);de.place(x,y,z);g.box(0,0,0,22,.32,10,C.stoneLight);for(let xx of[-8.4,-3.6,3.6,8.4])for(let zz of[-2.5,2.5]){g.box(xx,.3,zz,1.15,.38,1.15,C.stone);g.cone(xx,.68,zz,.34,.32,7.1,MC.wood,10);}for(let xx of[-6,6]){g.box(xx,1.0,0,3.4,4.4,.22,MC.dark);for(let i=0;i<8;i++)de.box(xx-1.55+i*.45,1.05,-.15,.08,4.35,.09,MC.beam);}for(let yy of[5.8,7.3])for(let zz of[-2.5,2.5])g.box(0,yy,zz,20,.46,.43,MC.beam);g.box(0,6.25,-2.76,3.4,1.35,.2,MC.dark);templeRoof(r,de,0,8.0,0,26,13,3.8);}
function cemetery(bank,terrain){let graves=[];const g=bank.get(300,512),de=bank.get(300,512,'matte','near'),pav=bank.get(300,512,'paving');
 pav.box(307,45.44,515,88,.13,76,C.stone);for(let side of[-1,1])pav.box(307+side*47,45.43,515,3,.15,80,C.stoneLight);pav.box(307,45.48,515,4,.13,77,C.stoneLight);
 for(let row=0;row<7;row++)for(let column=0;column<9;column++){if(column===4)continue;let x=272+column*8.8,z=486+row*9.4,y=45.61,s=.84+((row*7+column*3)%6)*.055;graves.push({x,y,z});g.box(x,y,z,3.1,.24,2.75,MC.stone);g.box(x,y+.24,z,1.85,.23,1.6,C.stoneLight);g.box(x,y+.47,z,1.2,.55,1.05,MC.stone);if((row+column)%5===0){g.cone(x,y+1,z,.7,.6,1.6,MC.stone,4);g.ellipsoid(x,y+2.65,z,.65,.43,.6,MC.stone,10,5);}else{g.box(x,y+1.02,z,.88,1.8*s,.74,C.stoneLight);g.box(x,y+2.82*s,z,1.0,.16,.84,MC.stone);}for(let j=0;j<4;j++)de.box(x+.1,y+1.28+j*.27,z-.383,.22,.065,.018,MC.dark);for(let side of[-1,1])g.cone(x+side*.88,y+.3,z-1,.10,.15,.36,MC.gold,8);g.box(x,y+.28,z-1.02,.7,.11,.34,MC.dark);}
 // Low wall and back grove distinguish the cemetery from the public temple court.
 g.box(261,45.5,515,.9,1.7,80,MC.stone);g.box(355,45.5,525,.9,1.7,60,MC.stone);g.box(308,45.5,555,96,1.7,.9,MC.stone);for(let xx of[262,276,290,306,322,338,354])g.box(xx,47.15,555,1.8,.19,1.4,C.stoneLight);
 for(let xx of[280,287,294,301,308,315])jizo(g,xx,45.6,474,.9);
 return graves;}
function buildMyouren(terrain){const bank=new G.BatchBank(),signs=[],plants=[],footprints=[],hallData=[];
 // Entire parcel, approach, gravel forecourt, retaining stones and drains.
 let g=bank.get(300,380),pav=bank.get(300,380,'paving');g.box(303,39.15,376,190,.7,173,MC.stone);g.box(303,39.85,376,187,.22,170,col('#c1bba6'));
 pav.box(300,40.10,323,9,.14,78,C.stoneLight);pav.box(300,43.92,401.3,9,.14,51.4,C.stoneLight);for(let i=0;i<24;i++){let top=40.16+(i+1)*3.76/24;pav.box(300,40.03,359+i*.70,21,top-40.03,.714,C.stoneLight);}pav.box(302,43.93,459,168,.14,4.8,C.stoneLight);pav.box(370,43.9,410,4.7,.2,100,C.stoneLight);pav.box(237,43.9,410,4.7,.2,100,C.stoneLight);
 for(let s of[-1,1]){pav.box(300+s*16,40.11,326,3,.13,52,C.stone);for(let zz=303;zz<354;zz+=10){g.place();lamp(g,300+s*9,40.13,zz,.83);}for(let xx=220;xx<390;xx+=3.8){g.box(xx,39.3,s<0?294:461,3.72,1.0,1.35,MC.stone);g.box(xx,40.3,s<0?294:461,3.8,.17,1.48,C.stoneLight);}}
 // Slots either side of the entrance stay open, not a wall through the gate.
 g.box(248,40.0,295,64,1.4,.85,MC.wall);g.box(352,40,295,64,1.4,.85,MC.wall);G.roof(bank.get(248,295,'roof'),248,41.4,295,65,1.3,.35,MC.roof,null,false);G.roof(bank.get(352,295,'roof'),352,41.4,295,65,1.3,.35,MC.roof,null,false);
 gate(bank,300,287,39.9);signs.push({text:'命 蓮 寺',width:2.9,height:1.0,position:[300,46.7,284.12],yaw:PI,background:'#322c28',color:'#d9c89e',space:'surface',region:'myouren'});
 hallData.push(hall(bank,300,419,39,26,43.85,true));hallData.push(hall(bank,241,414,20,18,43.85,false));hallData.push(hall(bank,369,437,23,17,43.85,false));belfry(bank,355,386,43.85);
 // Side cloister has real repeated bays and open sightlines.
 for(let side of[-1,1]){let x=300+side*65,gg=bank.get(x,359),rr=bank.get(x,359,'roof');gg.box(x,40.1,349,6,.65,31,MC.wood);for(let z=335;z<365;z+=4){gg.cone(x-2.35,40.7,z,.17,.17,3.5,MC.wood,8);gg.cone(x+2.35,40.7,z,.17,.17,3.5,MC.wood,8);}gg.place(x,0,349,PI/2);rr.place(x,0,349,PI/2);G.roof(rr,0,44.4,0,34,8,2,MC.roof,null,false);}
 // Red banner line flanks the main stair and leads the eye to the great hall.
 for(let side of[-1,1])for(let i=0;i<5;i++){let x=300+side*(13+i*.48),z=365+i*8.6,y=terrain.height(x,z)+.14;let gg=bank.get(x,z);gg.tube([x,y,z],[x,y+6.2,z],.075,MC.wood,6);gg.tube([x,y+5.9,z],[x+side*1.62,y+5.9,z],.055,MC.wood,6);signs.push({text:'毘沙門天王',vertical:true,width:1.2,height:4.6,position:[x+side*.86,y+3.5,z-.08],yaw:PI,background:'#a12e37',color:'#f2e8d0',space:'surface',region:'myouren'});}
 let gg=bank.get(280,289);for(let side of[-1,1])for(let i=0;i<4;i++)jizo(gg,300+side*(15+i*2),40,280,.83);
 // Service area and quiet garden, avoiding fake floating clutter.
 const garden=bank.get(258,378);garden.box(252,43.85,383,23,.12,19,col('#d6ccb3'));for(let k=0;k<10;k++)garden.box(252,44.0,375+k*1.6,21,.027,.06,col('#a9a391'));for(let p of[[244,383,2.4],[256,387,1.6],[258,378,1]]){garden.ellipsoid(p[0],44.3,p[1],p[2],p[2]*.8,p[2]*.68,MC.stone,9,5);}
 // Four planted islands, cut stone borders, subpaths and low continuous garden walls.
 for(const [xx,zz,ww,dd] of [[264,337,22,20],[337,331,23,23],[266,398,12,15],[337,432,18,16]]){let b=bank.get(xx,zz),y=terrain.height(xx,zz);b.box(xx,y+.08,zz,ww,.28,dd,MC.stone);b.box(xx,y+.36,zz,ww-.7,.05,dd-.7,col('#687b53'));for(let side of[-1,1]){b.box(xx+side*(ww/2-.17),y+.34,zz,.34,.21,dd,MC.stone);b.box(xx,y+.34,zz+side*(dd/2-.17),ww,.21,.34,MC.stone);}for(let i=0;i<6;i++){let a=i*2.4,r=(i%2+1)*2.4;b.ellipsoid(xx+Math.cos(a)*r,y+.7,zz+Math.sin(a)*r,1.3,.64,1.25,col('#60794f'),8,4);}plants.push({x:xx,z:zz,type:zz<350?'cherry':'broadleaf',scale:1.2});}
 for(let zz=318;zz<450;zz+=18){let b=bank.get(220,zz),y=terrain.height(219,zz);b.box(217,y,zz,1.0,1.55,17.8,MC.wall);b.box(217,y+1.55,zz,1.55,.16,17.9,MC.roof);}for(let p of[[345,351],[256,355],[377,418]]){let b=bank.get(...p),y=terrain.height(...p);b.box(p[0],y+.52,p[1],3.9,.17,.9,MC.wood);for(let side of[-1,1])b.box(p[0]+side*1.4,y,p[1],.25,.52,.65,MC.wood);}
 const graves=cemetery(bank,terrain);const lp=bank.get(378,470,'paving');lp.box(366,45.45,470,28,.16,5,C.stone);lp.box(307,44,468,5,.17,15,C.stoneLight);steps(lp,307,44.13,468,5,6,.5,.25,1);
 // The opening is an illustrated historic route point, not a modern fixed portal.
 const cave=bank.get(382,471);const darkStone=col('#69766d');
 for(let side of[-1,1]){for(let j=0;j<5;j++){let yy=45.45+j*1.02;let x=382+side*(3.95+j*.04);cave.box(x,yy,475,1.9,1.0,6.8,G.blend(MC.stone,darkStone,(j%3)*.17));}for(let j=0;j<4;j++){let x=382+side*(5.1+j*1.6),h=6.0-j*1.1;cave.cone(x,45.3,478.5,.9+j*.7,.35,h,darkStone,7);}}
 const point=(r,a,z)=>[382+Math.cos(a)*r,50.5+Math.sin(a)*r,z];
 for(let i=0;i<15;i++){let a=i/15*Math.PI+.012,b=(i+1)/15*Math.PI-.012,c=G.blend(MC.stone,darkStone,(i%4)*.1);cave.quad(point(3,a,472.0),point(3,b,472.0),point(4.75,b,472.0),point(4.75,a,472.0),c);cave.quad(point(4.75,a,478.5),point(4.75,b,478.5),point(3,b,478.5),point(3,a,478.5),c);cave.quad(point(3,a,472),point(3,a,478.5),point(3,b,478.5),point(3,b,472),darkStone);cave.quad(point(4.75,a,472),point(4.75,b,472),point(4.75,b,478.5),point(4.75,a,478.5),c);}
 // Recess the dark doorway into a solid-backed stone vault; never leave a thin black panel exposed from the sides.
 cave.box(382,45.30,481.6,10.5,9.4,4.0,darkStone);cave.box(382,45.48,479.45,6.04,8.1,.10,col('#172420'));cave.box(382,45.48,475.6,5.85,.13,8.2,col('#36423b'));for(let k=0;k<6;k++)cave.box(382,45.56,471.3+k*.75,5.82,.025,.07,col('#7b8071'));for(let side of[-1,1])for(let j=0;j<5;j++){let xx=382+side*(5.5+j*1.05);cave.ellipsoid(xx,45.4,483.6,.9+j*.15,4.1-j*.48,3.1,darkStone,9,5);}steps(cave,382,45.45,469,5.5,6,.64,-.17,1);for(let side of[-1,1]){lamp(cave,382+side*6.4,45.5,468,.75);for(let j=0;j<4;j++)cave.ellipsoid(382+side*(6+j*.5),45.8,481+j*.8,1.0,.5,1.2,MC.moss,8,4);}
 // Locally assigned plantings use the same shared tree prototypes as earlier regions.
 for(let i=0;i<96;i++){let a=i*2.399,rx=102+(i%3)*8,rz=134+(i%4)*5,x=306+Math.cos(a)*rx,z=414+Math.sin(a)*rz;if(z<280&&Math.abs(x-300)<28)continue;plants.push({x,z,type:i%6===0?'cherry':'cedar',scale:1.0+(i%5)*.13});}
 for(let p of[[252,319,'cherry'],[350,331,'cherry'],[230,454,'broadleaf'],[340,454,'cherry'],[365,515,'cedar'],[251,514,'cedar']])plants.push({x:p[0],z:p[1],type:p[2],scale:1.05});
 footprints.push({x:306,z:416,rx:104,rz:140});
 const meshes=bank.meshes().map(m=>({...m,id:'myouren:'+m.id,space:'surface',region:'myouren',locationId:'myouren',basis:'P'}));
 return{meshes,plantSites:plants,footprints,signs,meta:{basis:'P',mainHall:[300,43.85,419],gate:[300,39.9,287],bell:[355,43.85,386],cemetery:[307,45.6,516],historicEntrance:[382,45.5,472],graveCount:graves.length,graves,halls:hallData,regionBounds:[194,274,419,562],note:'寺后墓地；地下大祀庙只在TH13历史状态展示。不是现代相邻的两座地面寺庙。'}};
}
Object.assign(G,{buildMyouren,templeRoof,templeRail:rail,templeLamp:lamp,templeSteps:steps,templeJizo:jizo,templeHall:hall,templeGate:gate,templeBelfry:belfry,templeCemetery:cemetery,myourenBaseHeight:oldHeight,myourenBaseColor:oldColor,MC});
})(globalThis.GA);

/* Time-aware spaces: TH13 buried Great Mausoleum vs relocated Divine Spirit Mausoleum.
   Both mausoleum and inner sanctuary later moved. They are NOT simultaneous modern
   duplicates or a physical lower floor of the present Senkai. All dimensions are P. */
(function(G){'use strict';const C=G.C,K=G.MC,PI=Math.PI,rgb=G.rgb;
const S={wood:rgb('#826248'),dark:rgb('#45383b'),gold:rgb('#bd9244'),goldEdge:rgb('#f0cb79'),red:rgb('#984648'),teal:rgb('#487c77'),stone:rgb('#a3aaa3'),cave:rgb('#586773'),caveDark:rgb('#303c4b'),water:rgb('#4b808e'),leaf:rgb('#4f9077'),lotus:rgb('#dcb3c8')};
function octPoint(x,y,z,r,a){return[x+Math.sin(a)*r,y,z+Math.cos(a)*r];}
function ring(g,x,y,z,r,w,col,n=8){for(let i=0;i<n;i++){let a=i/n*2*PI+PI/8,b=(i+1)/n*2*PI+PI/8;g.quad(octPoint(x,y,z,r,a),octPoint(x,y,z,r,b),octPoint(x,y,z,r-w,b),octPoint(x,y,z,r-w,a),col);}}
/* Every side is a real open bay. Octagonal balcony/roof is full 360-degree geometry. */
function octRoof(g,de,x,y,z,R,h,colour=S.gold){const baseAngle=PI/8,N=8;for(let i=0;i<N;i++){let a=i*2*PI/N+baseAngle,b=(i+1)*2*PI/N+baseAngle;for(let j=0;j<12;j++){let t=j/12,u=(j+1)/12,py=v=>y+h*(1-v)+.8*Math.pow(v,5);g.quad(octPoint(x,py(t),z,R*t,a),octPoint(x,py(t),z,R*t,b),octPoint(x,py(u),z,R*u,b),octPoint(x,py(u),z,R*u,a),colour);}let A=octPoint(x,y+.6,z,R,a),B=octPoint(x,y+.6,z,R,b);g.tube(A,B,.17,S.goldEdge,6);if(de){for(let k=0;k<12;k++){let f=k/12,dir=[G.mix(Math.sin(a),Math.sin(b),f),G.mix(Math.cos(a),Math.cos(b),f)];let last=[x,y+h+.06,z];for(let j=1;j<=10;j++){let t=j/10,p=[x+dir[0]*R*t,y+h*(1-t)+.8*t**5+.06,z+dir[1]*R*t];de.tube(last,p,.055,S.goldEdge,4);last=p;}}}}
 g.cone(x,y+h,z,.3,.12,.8,S.goldEdge,10);g.ellipsoid(x,y+h+1.0,z,.28,.36,.28,S.goldEdge,10,5);}
function octTower(bank,x,y,z,{levels=3,radius=12,storey=7.7,colour=S.gold,stoneBase=true}={}){const g=bank.get(x,z),r=bank.get(x,z,'roof'),de=bank.get(x,z,'roof','near');let R=radius;
 if(stoneBase){for(let i=0;i<4;i++)g.cone(x,y+i*.4,z,R+3-i*.45,R+3-i*.45,.4,S.stone,8);y+=1.6;}
 for(let lv=0;lv<levels;lv++){let h=y+lv*storey,rr=R-lv*.7;g.cone(x,h,z,rr,rr,.25,S.dark,8);ring(g,x,h+.26,z,rr+.85,2,S.wood);for(let i=0;i<8;i++){let a=i*PI/4+PI/8,b=(i+1)*PI/4+PI/8,A=octPoint(x,h+.27,z,rr-.7,a),B=octPoint(x,h+.27,z,rr-.7,b);g.tube(A,[A[0],h+storey-1.45,A[2]],.23,lv===0?S.wood:S.red,9);let mid=G.mul(G.add(A,B),.5);let inward=G.norm([x-mid[0],0,z-mid[2]]);const y0=h+.45,y1=h+storey-2.15;
 // Dark recessed doors separated from projecting columns, lattices and tie beams.
 let ta=G.add(A,G.mul(inward,.55)),tb=G.add(B,G.mul(inward,.55));g.quad([ta[0],y0,ta[2]],[tb[0],y0,tb[2]],[tb[0],y1,tb[2]],[ta[0],y1,ta[2]],S.dark);
 for(let k=1;k<7;k++){let t=k/7,p=G.add(G.mul(ta,1-t),G.mul(tb,t));de.tube([p[0],y0,p[2]],[p[0],y1,p[2]],.055,S.wood,4);}for(let hh of[y0+1.1,y1-.55])g.tube([ta[0],hh,ta[2]],[tb[0],hh,tb[2]],.055,S.wood,4);
 g.tube([A[0],h+storey-1.9,A[2]],[B[0],h+storey-1.9,B[2]],.23,S.wood,6);
 const ra=octPoint(x,h+.6,z,rr+.4,a),rb=octPoint(x,h+.6,z,rr+.4,b);for(let k=0;k<4;k++){let p=G.add(G.mul(ra,1-k/4),G.mul(rb,k/4));g.tube(p,[p[0],h+1.65,p[2]],.07,S.wood,5);}g.tube([ra[0],h+1.5,ra[2]],[rb[0],h+1.5,rb[2]],.10,S.wood,5);
 }octRoof(r,de,x,h+storey-1.2,z,rr+3.2,3.25,colour);}
 return{position:[x,y-1.6,z],radius:R,levels,top:y+(levels-1)*storey+storey+2.85};}
function lotus(g,x,y,z,s=1){g.cone(x,y-.02,z,s*.64,s*.64,.035,S.leaf,10);for(let ring=0;ring<2;ring++)for(let i=0;i<7;i++){let a=i/7*2*PI+ring*.43,rr=s*(ring?.18:.36),p=[x+Math.sin(a)*rr,y+.12+ring*.17,z+Math.cos(a)*rr];g.ellipsoid(...p,s*.14,s*(ring?.23:.2),s*.25,G.blend(S.lotus,[1,.86,.81],ring*.3),7,4);}g.ellipsoid(x,y+.41,z,s*.12,s*.12,s*.12,S.goldEdge,8,4);}
function rock(g,x,y,z,rx,ry,rz,seed,colour=S.cave){let R=G.rng(seed),N=10,rings=7,ps=[];for(let j=0;j<=rings;j++){let row=[],t=j/rings,rr=(.08+.94*Math.sin(t*PI*.60))*(.88+R()*.20);for(let i=0;i<N;i++){let a=i/N*2*PI,noise=.84+R()*.33;row.push([x+Math.sin(a)*rx*rr*noise,y+ry*(1-t),z+Math.cos(a)*rz*rr*noise]);}ps.push(row);}for(let j=0;j<rings;j++)for(let i=0;i<N;i++){let a=ps[j][i],b=ps[j][(i+1)%N],c=ps[j+1][(i+1)%N],d=ps[j+1][i];g.quad(a,b,c,d,G.blend(colour,S.caveDark,((j+i)%4)*.03));}}
function localTree(g,x,y,z,s=1,kind='pine'){g.tube([x,y,z],[x+.4*s,y+7*s,z],.32*s,S.wood,7,.12*s);for(let i=0;i<6;i++){let a=i*2.4,xx=x+Math.sin(a)*2.4*s,zz=z+Math.cos(a)*2.4*s,yy=y+(4+i*.45)*s;g.tube([x,y+3.5*s,z],[xx,yy,zz],.12*s,S.wood,6,.04*s);for(let k=0;k<3;k++){let t=a+k*1.9;g.ellipsoid(xx+Math.cos(t)*.75*s,yy+k*.26*s,zz+Math.sin(t)*.75*s,1.6*s,.68*s,1.5*s,kind==='flower'?rgb('#c499ad'):rgb('#638d78'),7,4);}}}
function tunnel(bank){const points=[[382,45.45,472],[389,29,447],[380,11,426],[355,-8,412],[326,-27,410],[300,-44,430]],steps=[];for(let j=0;j<points.length-1;j++){let A=points[j],B=points[j+1],dx=B[0]-A[0],dz=B[2]-A[2],d=Math.hypot(dx,dz),n=Math.ceil((A[1]-B[1])/.26),yaw=Math.atan2(dx,dz),g=bank.get(A[0],A[2]);for(let i=0;i<n;i++){let t=(i+1)/n,x=G.mix(A[0],B[0],t),y=G.mix(A[1],B[1],t),z=G.mix(A[2],B[2],t);g.place(x,0,z,yaw);g.box(0,y-.32,0,4.9,.32,d/n+.12,S.stone);steps.push([x,y,z]);}
 // Segmented tunnel shell is independently hidden for cutaway.
 }
 return{points,steps};}
function buildMausoleum(){const bank=new G.BatchBank(),floor=new G.Geometry(),shell=new G.Geometry(),ceiling=new G.Geometry(),fx=new G.Geometry(),water=new G.Geometry(),signs=[];const X=307,Z=516,Y=-44;
 // Same X/Z as cemetery, with a project-designed depth; no flattening to ground.
 floor.cone(X,Y-2,Z,86,86,2.0,S.caveDark,48);floor.cone(X,Y,Z,57,57,.13,S.stone,40);
 // Lotus moat left and right of the axial causeway.
 for(let side of[-1,1]){water.box(X+side*22,Y+.22,Z-6,29,.015,53,S.water);floor.box(X+side*22,Y+.08,Z-6,30,.13,54,S.caveDark);for(let k=0;k<4;k++){let zz=Z-31+k*17;G.templeLamp(bank.get(X,Z),X+side*40,Y+.18,zz,.82);}let l=bank.get(X+side*22,Z,'matte');for(let i=0;i<19;i++){let a=i*2.4,xx=X+side*22+Math.sin(a)*11,zz=Z-6+Math.cos(a)*22;lotus(l,xx,Y+.28,zz,.72+(i%3)*.16);}}
 floor.box(X,Y+.33,Z-44,12,.42,57,C.stone);for(let side of[-1,1]){G.templeRail(bank.get(X,Z),X+side*6.1,Y+.76,Z-44,56,'z',S.wood);}
 // Main long stacked octagonal tower, not a conventional western crypt.
 const tower=octTower(bank,X,Y+.12,Z+8,{levels:4,radius:11.0,storey:8.0,colour:rgb('#676b69')});
 // Portal seen at the end of the tight cave before the wide hall.
 const g=bank.get(X,Z-75),r=bank.get(X,Z-75,'roof'),de=bank.get(X,Z-75,'roof','near');g.place(X,Y,Z-74);r.place(X,Y,Z-74);de.place(X,Y,Z-74);
 for(let side of[-1,1]){g.box(side*7.7,0,0,7,9.4,3.0,S.dark);g.cone(side*4.8,.1,-1.7,.37,.32,10,S.red,10);g.box(side*7.9,1.0,-1.55,4.5,6.6,.16,S.wood);for(let k=0;k<6;k++)de.box(side*7.9+(k-2.5)*.5,1.1,-1.68,.08,6.2,.09,S.gold);}g.box(0,8.8,0,23,1,3.4,S.red);G.templeRoof(r,de,0,10,0,29,8,3.6,rgb('#52686d'));signs.push({text:'夢 殿 大 祀 廟',position:[X,Y+9.35,Z-75.80],width:6.8,height:.9,yaw:PI,background:'#333c45',color:'#e9d3a4',space:'mausoleum'});
 const tun=tunnel(bank);
 // Cave sidewalls preserve entrance gap and open interior view; ceiling separate layer.
 for(let i=0;i<31;i++){let a=i/31*PI*2,xx=X+Math.cos(a)*83,zz=Z+Math.sin(a)*92;if(zz<Z-70&&Math.abs(xx-X)<22)continue;rock(shell,xx,Y-4,zz,14+(i%4),45+(i%5)*5,16,i+920);for(let k=0;k<3;k++){let yy=Y+8+k*11;rock(shell,xx+Math.sin(i)*3,yy,zz,7,13,8,i*20+k);}}
 // Vault is a genuine overhead surface. Hide it explicitly for wide/cutaway inspection.
 for(let i=0;i<32;i++){let a=i/32*PI*2,b=(i+1)/32*PI*2;ceiling.tri([X,22,Z],[X+Math.cos(a)*91,10,Z+Math.sin(a)*98],[X+Math.cos(b)*91,10,Z+Math.sin(b)*98],S.caveDark);}
 // Supports along a sloping suggested tunnel, not a fake straight elevator shaft.
 for(let j=0;j<tun.points.length-1;j++){let A=tun.points[j],B=tun.points[j+1];for(let k=0;k<3;k++){let t=k/3,x=G.mix(A[0],B[0],t),y=G.mix(A[1],B[1],t),z=G.mix(A[2],B[2],t),yaw=Math.atan2(B[0]-A[0],B[2]-A[2]);shell.place(x,y,z,yaw);for(let s of[-1,1])shell.box(s*3.1,0,0,1.2,6.6,1.9,S.cave);shell.box(0,6.5,0,7.3,1.5,1.9,S.caveDark);} }shell.place();
 // Unnamed visual spirits are light particles, not invented official residents.
 for(let i=0;i<65;i++){let a=i*2.399,rr=15+(i%9)*5,xx=X+Math.cos(a)*rr,zz=Z+Math.sin(a)*rr,yy=Y+2+(i%13)*1.1;fx.ellipsoid(xx,yy,zz,.13,.23,.13,i%3?rgb('#8be0cd'):rgb('#d4b7f1'),6,3);}
 const meshes=bank.meshes().map(m=>({...m,id:'mausoleum:'+m.id,space:'mausoleum',era:'th13',basis:'P',region:'mausoleum'}));
 meshes.push(floor.mesh('mausoleum:floor','architecture',{space:'mausoleum',material:'paving',region:'mausoleum'}),shell.mesh('mausoleum:cave-walls','architecture',{space:'mausoleum',material:'cave',hideInSection:true,region:'mausoleum'}),ceiling.mesh('mausoleum:ceiling','architecture',{space:'mausoleum',material:'cave',ceiling:true,hideInSection:true,region:'mausoleum'}),water.mesh('mausoleum:lotus-water','water',{space:'mausoleum',region:'mausoleum'}),fx.mesh('mausoleum:spirit-lights','effects',{space:'mausoleum',material:'glow',region:'mausoleum'}));
 return{meshes,signs,meta:{basis:'P',era:'th13',space:'mausoleum',tower,center:[X,Y,Z],cemeteryAbove:[307,45.6,516],tunnel:tun,locationId:'mausoleum',currentLocation:'senkai',note:'TH13时期地下旧址；大祀庙与神灵庙后来迁入仙界，此层不是当前固定地下住居。'}};
}
function dragon(g,x,y,z,sgn=1,scale=1){let last=[x,y,z];for(let i=1;i<=15;i++){let t=i/15,p=[x+sgn*t*5*scale,y+Math.sin(t*PI*.95)*1.7*scale,z+Math.sin(t*PI*2)*.3*scale];g.tube(last,p,.19*scale,S.goldEdge,6,.16*scale);last=p;}g.ellipsoid(last[0],last[1]+.15*scale,last[2],.48*scale,.35*scale,.31*scale,S.goldEdge,8,4);for(let s of[-1,1])g.tube([last[0],last[1]+.3*scale,last[2]+s*.17*scale],[last[0]-sgn*.6*scale,last[1]+.9*scale,last[2]+s*.35*scale],.075*scale,S.goldEdge,5);}
function senkaiHall(bank){const g=bank.get(0,0),roof=bank.get(0,0,'gold'),de=bank.get(0,0,'gold','near');
 g.box(0,0,0,68,1.5,34,S.stone);g.box(0,1.5,0,66,.24,33,C.stoneLight);for(let side of[-1,1])G.templeRail(g,side*32.4,1.76,0,32,'z',S.stone);G.templeSteps(g,0,.05,27,17,9,.78,.19,-1,S.stone);
 // Three openings within one front composition, with genuinely recessed front doors.
 for(let xx of[-26,-17,-8,8,17,26]){g.box(xx,1.74,0,5.2,10.2,24,S.red);for(let z0 of[-11,11])g.cone(xx,1.75,z0,.48,.43,10.4,S.red,12);}
 for(let xx of[-28,-19,-10,0,10,19,28]){g.box(xx,2.1,12.04,4.4,7.6,.3,S.dark);for(let a=-1.9;a<=1.9;a+=.42)de.box(xx+a,2.2,12.24,.065,7.3,.075,S.gold);for(let yy of[4,7.8])g.box(xx,yy,12.28,4.4,.11,.13,S.wood);}
 // Painted relief panels and gilded mouldings are surface geometry, not flat facades.
 for(let xx of[-26,-17,-8,8,17,26]){g.box(xx,2.3,12.19,4.1,.24,.18,S.goldEdge);g.box(xx,8.7,12.19,4.1,.24,.18,S.goldEdge);for(let side of[-1,1])g.box(xx+side*1.92,2.4,12.20,.13,6.3,.14,S.goldEdge);for(let j=0;j<4;j++){g.ellipsoid(xx,3.3+j*1.3,12.28,.83,.46,.09,S.teal,10,5);g.tube([xx-.68,3.3+j*1.3,12.38],[xx+.68,3.3+j*1.3,12.38],.055,S.goldEdge,5);}}
 for(let xx of[-8,0,8]){g.box(xx,1.78,12.24,5.7,.13,2.4,S.stone);}
 for(let yy of[9.2,11.3])for(let z0 of[-11.6,11.6])g.box(0,yy,z0,65,.54,.48,S.red);
 for(let xx=-28;xx<29;xx+=4){g.box(xx,11.7,11.7,1.7,.24,1.1,S.goldEdge);g.box(xx,11.3,11.6,1.1,.27,1.7,S.teal);for(let j=0;j<2;j++)de.ellipsoid(xx,10.3+j*.42,12.1,.55,.15,.10,S.goldEdge,7,3);}
 // Strong triple-eave silhouette; upper volumes remain deliberately open pavilion-like.
 for(let lv=0;lv<3;lv++){let yy=12.1+lv*5.1,w=72-lv*13,d=37-lv*6;G.templeRoof(roof,de,0,yy,0,w,d,4.3-lv*.5,S.gold);if(lv<2){g.box(0,yy+3.2,0,w-16,2.0,d-10,S.red);for(let xx=-(w-17)/2;xx<(w-17)/2;xx+=3.1)G.windowPanel(g,xx,yy+3.6,(d-10)/2+.12,2.4,1.2,0,S.dark);}for(let side of[-1,1])dragon(de,side*4,yy+5.2,0,side,.80-lv*.08);}
 for(let xx of[-23,-12,12,23])G.lantern(g,xx,9.7,12.8,1.35);
 const towers=[];for(let side of[-1,1]){towers.push(octTower(bank,side*47,0,0,{levels:3,radius:8.7,storey:7.6}));const c=bank.get(side*35,0),r=bank.get(side*35,0,'gold');c.box(side*35,1.5,0,14,.25,8,S.stone);for(let z0 of[-3,3])for(let xx of[side*30,side*36,side*42])c.cone(xx,1.75,z0,.2,.2,4.5,S.red,8);G.roof(r,side*35,6.2,0,17,12,2.4,S.gold,null,false);}
 return towers;}
function buildSenkai(){const bank=new G.BatchBank(),terrain=new G.Geometry(),water=new G.Geometry(),plants=new G.Geometry(),signs=[];
 // An independent coordinate chart, NOT arbitrary kilometres above/below the surface.
 for(let z=-220;z<190;z+=8)for(let x=-230;x<230;x+=8){const p=(X,Z)=>[X,-.16+Math.max(0,Math.hypot(X/190,Z/170)-.65)*2,Z];terrain.quad(p(x,z),p(x+8,z),p(x+8,z+8),p(x,z+8),rgb('#899c89'));}
 const pav=bank.get(0,50,'paving'),g=bank.get(0,40);pav.box(0,.02,64,146,.17,95,S.stone);pav.box(0,.19,68,11,.09,102,C.stoneLight);for(let side of[-1,1]){for(let i=0;i<6;i++)G.templeLamp(g,side*66,.2,28+i*15,.93);pav.box(side*57,.17,63,1.3,.13,94,S.dark);g.box(side*83,-.1,51,18,.4,79,rgb('#536b65'));water.box(side*83,.34,51,16,.015,77,S.water);for(let i=0;i<23;i++)lotus(bank.get(side*83,51),side*83+Math.sin(i*2.4)*6,.40,20+(i*13%60),.85);}
 const towers=senkaiHall(bank);
 signs.push({text:'神 靈 廟',position:[0,10.35,12.1],width:5.6,height:1.65,yaw:0,background:'#23585a',color:'#f4d17b',space:'senkai'});
 // Lower cloisters enclose the forecourt without hiding its axial perspective.
 for(let side of[-1,1]){let b=bank.get(side*67,70),r=bank.get(side*67,70,'gold');for(let z=34;z<107;z+=5){b.cone(side*73,.5,z,.19,.17,4.1,S.red,8);b.cone(side*61,.5,z,.19,.17,4.1,S.red,8);}b.box(side*67,.2,71,15,.35,80,S.stone);r.place(side*67,0,71,PI/2);G.roof(r,0,4.9,0,84,17,2.7,S.gold,null,false);}
 // Rear path leads to the relocated same Great Mausoleum, left-rear of the dojo.
 pav.box(-44,.15,-51,88,.16,6,S.stone);pav.box(-84,.15,-72,6,.16,45,S.stone);const moved=octTower(bank,-87,.15,-93,{levels:4,radius:11,storey:8,colour:rgb('#747770')});
 signs.push({text:'夢殿大祀廟',position:[-87,7.1,-80.7],width:4.4,height:.85,yaw:0,background:'#493e36',color:'#d9c7a6',space:'senkai'});
 // Rock gardens form a horizon, not imported fantasy-mountain background art.
 const rocks=bank.get(-40,-125,'cave');for(let i=0;i<28;i++){let a=.2+i/28*PI*2,x=Math.cos(a)*185,z=-20+Math.sin(a)*163;if(z>108&&Math.abs(x)<80)continue;rock(rocks,x,-3,z,22+i%5*3,22+i%6*6,25+i%4*3,361+i,rgb('#8d9f99'));for(let j=0;j<4;j++)localTree(plants,x+Math.sin(j*2.4)*13,-.2,z+Math.cos(j*2.4)*16,1.15+j*.13);}
 for(let p of[[-56,80],[54,43],[-108,40],[-115,100],[104,72],[109,-30],[-131,-79],[37,-67],[55,108],[-44,108]])localTree(plants,p[0],.3,p[1],1.15,p[0]<0?'flower':'pine');
 for(let side of[-1,1])for(let z0 of[38,87]){let b=bank.get(side*44,z0),x=side*44;b.box(x,.3,z0,12,.35,15,S.stone);b.box(x,.66,z0,11.4,.04,14.4,rgb('#688878'));for(let i=0;i<8;i++){let a=i*2.4;b.ellipsoid(x+Math.cos(a)*3.6,1.0,z0+Math.sin(a)*4.3,1.35,.63,1.4,rgb('#52775f'),8,4);}localTree(plants,x,.7,z0,1.07,z0===87?'flower':'pine');}
 const mesh=bank.meshes().map(m=>({...m,id:'senkai:'+m.id,space:'senkai',region:'senkai',era:'relocated',basis:'P'}));mesh.push(terrain.mesh('senkai:ground','terrain',{material:'ground',space:'senkai'}),plants.mesh('senkai:trees','vegetation',{material:'foliage',space:'senkai'}),water.mesh('senkai:ponds','water',{space:'senkai'}));
 return{meshes:mesh,signs,meta:{basis:'P',space:'senkai',era:'relocated',origin:[0,0,0],dojo:[0,0,0],towers,movedMausoleum:moved,locationId:'miko_dojo',note:'独立仙界坐标；大祀庙置于神灵庙左后方，两个时代的同一地标不同时加载显示。导览切换不是永久地下通路。'}};
}
function buildSection(){const g=new G.Geometry(); // back and lateral geological walls; front/east faces intentionally cut away.
 for(let lv=0;lv<5;lv++){let y=-53+lv*19,cc=rgb(['#485864','#637071','#7c8072','#8c8b76','#99917e'][lv]);g.box(208,y,418,8,19,279,cc);g.box(309,y,561,210,19,8,cc);}
 g.box(309,-55,423,211,2,283,rgb('#46555c'));
 // The temple front ground remains; the rear soil is omitted so the underground void is visible.
 g.box(303,37.8,376,190,1.6,173,rgb('#989782'));
 return[g.mesh('section:geology-P','architecture',{space:'section',region:'section',material:'matte',basis:'P'})];}
const SPACE_INFO={surface:{label:'地表 · 命莲寺',era:'常态选集',floor:null},mausoleum:{label:'地下旧址 · TH13时期',era:'th13',floor:-44},senkai:{label:'神子的仙界 · 迁址后',era:'relocated',floor:0},section:{label:'历史上下层剖面',era:'th13-diagram',floor:-56}};
const IMPLEMENTED={myouren:'myouren',myouren_gate:'templeGate',myouren_bell:'templeBell',myouren_cemetery:'cemetery',mausoleum:'mausoleum',mausoleum_pool:'mausoleumPool',miko_senkai:'senkai',miko_dojo:'senkai'};
Object.assign(G,{buildMausoleum,buildSenkai,buildSection,SPACE_INFO,IMPLEMENTED,spiritOctTower:octTower,spiritLotus:lotus,spiritRock:rock,spiritTree:localTree});
})(globalThis.GA);

/* v0.8 — local mountain temple + a walk-through architectural water gallery.
 * Mystia's Izakaya DLC3 informs the sequence of stairs, pond, cemetery and water bridges.
 * Numerical terrain, structural bays, lighting and floor plans are original P designs.
 * No geometry or pixels have been extracted from the reference game.
 */
(function(G){'use strict';
const PI=Math.PI, C=G.C, K=G.MC, rgb=G.rgb;
const P={soil:rgb('#777c59'),grass:rgb('#5f764f'),stone:rgb('#979f95'),light:rgb('#b8bfb3'),darkStone:rgb('#5b6966'),gravel:rgb('#b5b09a'),wood:rgb('#695042'),dark:rgb('#333c3e'),red:rgb('#795052'),jade:rgb('#527989'),trim:rgb('#beae79'),water:rgb('#467d89'),cave:rgb('#56636c')};
const sm=G.smooth, mix=G.mix;
const PLAN={basis:'P',iteration:2,foot:[300,34,250],gate:[300,56,292],middle:[300,82,348],mainHall:[300,112,419],bell:[362,112,397],cemetery:[307,130,516],historicEntrance:[382,130,472],lotus:[375,89.6,349]};
const stairPlans=[{z0:251,z1:279,y0:34,y1:56,width:11},{z0:307,z1:337,y0:56,y1:82,width:12},{z0:363,z1:391,y0:82,y1:112,width:14}];
const pads=[{x:300,z:292,w:68,d:31,y:56},{x:300,z:349,w:108,d:28,y:82},{x:305,z:421,w:188,d:68,y:112},{x:307,z:516,w:98,d:84,y:130},{x:376,z:475,w:31,d:16,y:130},{x:355,z:477,w:32,d:9,y:130},{x:375,z:348,w:48,d:58,y:90},{x:399,z:346,w:14,d:17,y:90}];
function rectWeight(x,z,r,falloff=10){const d=Math.max(Math.abs(x-r.x)-r.w/2,Math.abs(z-r.z)-r.d/2);return 1-sm(0,falloff,d);}
function mountainWeight(x,z){return sm(244,276,z)*(1-sm(1.0,1.36,Math.hypot((x-313)/204,(z-466)/246)));}
const baseHeight=G.myourenBaseHeight,baseColor=G.myourenBaseColor;
G.Terrain.prototype.height=function(x,z){
 let raw=baseHeight.call(this,x,z),w=mountainWeight(x,z);if(w===0)return raw;
 // The hillslope follows the terrace profile; it is not a dome excavated into vertical trenches.
 const profile=[[244,raw],[251,34],[279,56],[307,56],[337,82],[363,82],[391,112],[454,112],[479,130],[561,130],[601,116],[661,76],[732,raw]];
 let target=raw;for(let i=0;i<profile.length-1;i++){const a=profile[i],b=profile[i+1];if(z>=a[0]&&z<=b[0]){target=mix(a[1],b[1],sm(a[0],b[0],z));break;}}
 const across=1-sm(.67,1.45,Math.abs((x-309)/145));
 let h=mix(raw,target,across);
 h+=w*(1-across*.9)*(1.3*Math.sin(x*.044+z*.019)+.8*Math.sin(z*.059));
 for(const p of pads)h=mix(h,p.y,rectWeight(x,z,p,8));
 h+=9.5*Math.exp(-(((x-383)/15)**2+((z-494)/18)**2))*sm(479,488,z);
 // The public ascent is explicitly cut through the slope; landings remain level.
 for(const a of stairPlans){const f=rectWeight(x,z,{x:300,z:(a.z0+a.z1)/2,w:a.width+2,d:a.z1-a.z0+1},7);h=mix(h,mix(a.y0,a.y1,G.clamp((z-a.z0)/(a.z1-a.z0),0,1))-.11,f);}
 const side=rectWeight(x,z,{x:376,z:456.5,w:7,d:19},4);h=mix(h,112+18*G.clamp((z-447)/19,0,1)-.12,side);
 // A smaller rear rise protects the silhouette from a flat platform boundary.
 const pond=Math.hypot((x-375)/16.5,(z-349)/22.5);if(pond<1.12)h=mix(87.4,h,sm(.9,1.12,pond));
 const pondStairs=rectWeight(x,z,{x:350,z:356,w:14,d:4.4},2);h=mix(h,82+8*G.clamp((x-343)/14,0,1)-.12,pondStairs);
 return h;
};
G.Terrain.prototype.color=function(x,z,h,n){const w=mountainWeight(x,z);if(!w)return baseColor.call(this,x,z,h,n);const N=n||this.normal(x,z),slope=1-N[1];let c=G.blend(P.grass,rgb('#738360'),G.noise(x/28,z/28)*.36);c=G.blend(c,rgb('#82887b'),sm(.12,.42,slope)*.90);for(const p of pads)c=G.blend(c,P.gravel,rectWeight(x,z,p,3)*.9);return G.blend(baseColor.call(this,x,z,h,N),c,w);};
const route=G.routes.find(r=>r.id==='route-temple');route.points=[[110,196],[110,243],[165,246],[228,244],[278,246],[300,250]];route.samples=G.spline(route.points,7);route.note='F/P：村外道路抵达独立丘陵山脚，再接分段登山石阶。并未迁到妖怪之山。';

function ashlar(g,a,b,y,height,thickness=1.35){
 const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
 g.place(cx,0,cz,yaw);g.box(0,y,0,thickness,height,L,P.darkStone);
 const rows=Math.max(1,Math.ceil(height/.78));for(let row=0;row<rows;row++){let yy=y+row*height/rows,hh=height/rows-.035;for(let at=-L/2;at<L/2;at+=2.35){const end=Math.min(L/2,at+2.35),shade=.04*((row+Math.floor(at))%4);g.box(0,yy,(at+end)/2,thickness+.09,hh,end-at-.045,G.blend(P.stone,P.darkStone,Math.abs(shade)));}}
 g.box(0,y+height,0,thickness+.4,.22,L+.3,P.light);g.place();
}
function pad(bank,x,z,w,d,y,backwall=true){const g=bank.get(x,z,'templeStone'),p=bank.get(x,z,'templePaving');p.box(x,y-.04,z,w,.20,d,P.gravel);
 const gapX=z>480?307:300,gap=z>480?3.3:8.3;ashlar(g,[x-w/2,z-d/2],[gapX-gap,z-d/2],y-3.4,3.4);ashlar(g,[gapX+gap,z-d/2],[x+w/2,z-d/2],y-3.4,3.4);if(backwall)ashlar(g,[x-w/2,z-d/2],[x-w/2,z+d/2],y-2.1,2.1);
 // Low drainage bands and a restrained dressed-stone border.
 for(let s of[-1,1])p.box(x+s*(w/2-.45),y+.17,z,.55,.055,d-.4,P.light);
}
function terraceStair(bank,a){const g=bank.get(300,(a.z0+a.z1)/2,'templeStone'),steps=[],n=Math.ceil((a.y1-a.y0)/.24),run=(a.z1-a.z0)/n;
 for(let i=0;i<n;i++){const z=a.z0+i*run,y=mix(a.y0,a.y1,(i+1)/n);g.box(300,y-.55,z+run/2,a.width,.55,run+.018,G.blend(P.light,P.stone,(i%6)*.04));steps.push([300,y,z+run/2]);if(i%3===0)g.box(300,y+.006,z+run*.91,a.width,.022,.045,P.stone);}
 for(const side of[-1,1]){let last=null;for(let i=0;i<=n;i+=Math.max(1,Math.round(n/12))){const t=Math.min(1,i/n),z=mix(a.z0,a.z1,t),y=mix(a.y0,a.y1,t),x=300+side*(a.width/2+.4);g.box(x,y-.3,z,.5,1.5,.5,P.stone);g.box(x,y+1.2,z,.72,.12,.72,P.light);const p=[x,y+1.2,z];if(last){g.tube(last,p,.10,P.light,6);g.tube([last[0],last[1]-.48,last[2]],[p[0],p[1]-.48,p[2]],.065,P.stone,5);}last=p;}
 const edgeX=300+side*(a.width/2+.55);g.tube([edgeX,a.y0+.12,a.z0],[edgeX,a.y1+.12,a.z1],.29,P.stone,6);}
 return{...a,steps,count:n,run};
}
function path(bank,terrain,points,width=3.5,material='templePaving'){const g=bank.get(points[0][0],points[0][1],material);for(let j=0;j<points.length-1;j++){const A=points[j],B=points[j+1],len=Math.hypot(B[0]-A[0],B[1]-A[1]),n=Math.ceil(len/1.5),nx=-(B[1]-A[1])/len*width/2,nz=(B[0]-A[0])/len*width/2;for(let i=0;i<n;i++){const a=[mix(A[0],B[0],i/n),mix(A[1],B[1],i/n)],b=[mix(A[0],B[0],(i+1)/n),mix(A[1],B[1],(i+1)/n)],p=(v,s)=>[v[0]+s*nx,terrain.height(v[0]+s*nx,v[1]+s*nz)+.22,v[1]+s*nz];g.quad(p(a,1),p(b,1),p(b,-1),p(a,-1),P.light);}}}
function shrinePortal(bank,x,y,z){const g=bank.get(x,z,'templeStone');for(let s of[-1,1])ashlar(g,[x+s*4.8,z-1],[x+s*4.8,z+6],y,6.0,2.2);
 const p=(r,a,Z)=>[x+Math.cos(a)*r,y+5+Math.sin(a)*r,Z];for(let i=0;i<18;i++){let a=i/18*PI+.006,b=(i+1)/18*PI-.006;g.quad(p(3.7,a,z-1),p(3.7,b,z-1),p(5.7,b,z-1),p(5.7,a,z-1),P.stone);g.quad(p(3.7,a,z-1),p(3.7,a,z+6),p(3.7,b,z+6),p(3.7,b,z-1),P.darkStone);}
 g.box(x,y,z+7,11,10,3,P.darkStone);g.box(x,y+.02,z+5.4,7.4,8.7,.1,rgb('#172324'));g.box(x,y+.02,z+1,7.3,.1,10,P.darkStone);
 for(let side of[-1,1])G.templeLamp(g,x+side*8,y,z-3,.86);
}
function buildMountainTemple(terrain){const bank=new G.BatchBank(),plants=[],signs=[],halls=[],ascents=[];
 pad(bank,300,292,66,28,56);pad(bank,300,350,104,25,82);pad(bank,305,422,182,65,112);pad(bank,307,516,98,81,130);
 for(const a of stairPlans)ascents.push(terraceStair(bank,a));
 G.templeGate(bank,300,292,56);halls.push(G.templeHall(bank,300,419,39,26,112,true));halls.push(G.templeHall(bank,237,420,20,18,112));halls.push(G.templeHall(bank,372,435,23,17,112));G.templeBelfry(bank,362,397,112);
 signs.push({text:'命 蓮 寺',width:2.9,height:1,position:[300,62.8,289.12],yaw:PI,background:'#322c28',color:'#d9c89e',space:'surface',region:'myouren'});
 // The gates lead into stairs, not roads painted over them.
 const pav=bank.get(300,350,'templePaving');for(const[z,d,y]of[[291,24,56.2],[350,26,82.2],[402,22,112.2]])pav.box(300,y,z,14,.12,d,P.light);
 path(bank,terrain,[[337,403],[345,406],[349,444],[349,449],[376,449],[376,476],[350,477],[307,477],[307,484]],4.8);
 const backStairs=bank.get(376,460,'templeStone');for(let i=0;i<76;i++){let z=447+i*19/76,y=112+(i+1)*18/76;backStairs.box(376,y-.5,z,6,.5,19/76+.01,P.light);}
 // The old grave markers are retained, elevated as a coherent parcel.
 const graveBank=new G.BatchBank(),graves=G.templeCemetery(graveBank,terrain).map(p=>({...p,y:p.y+84.4}));const graveMeshes=graveBank.meshes();for(const m of graveMeshes){for(let i=1;i<m.vertices.length;i+=9)m.vertices[i]+=84.4;m.center[1]+=84.4;}
 shrinePortal(bank,382,130,472);
 // Temple walls are low boundaries atop slopes, not an enclosing stadium slab.
 for(const side of[-1,1]){const x=300+side*31;G.templeJizo(bank.get(x,279),x,56,280,.95);for(let z of[289,345,397]){const y=terrain.height(300+side*19,z);G.templeLamp(bank.get(300+side*19,z),300+side*19,y+.15,z,.93);}for(let i=0;i<6;i++){let z=370+i*7.5,x=300+side*(10.7+i*.30),y=terrain.height(x,z)+.1,g=bank.get(x,z);g.tube([x,y,z],[x,y+5.5,z],.075,P.wood,6);signs.push({text:'毘沙門天王',vertical:true,width:1,height:3.9,position:[x+side*.6,y+3.2,z],yaw:PI,background:'#963b39',color:'#f1e4c5',space:'surface',region:'myouren'});}}
 // East lotus garden: water, stepping edge, small bridge and a shelter at a different level.
 const pond=new G.Geometry(),pw=new G.Geometry(),pl=bank.get(375,349),rail=bank.get(375,349,'templeStone');
 for(let i=0;i<72;i++){let a=i/72*2*PI,b=(i+1)/72*2*PI,pt=t=>[375+Math.cos(t)*16.4,89.6,349+Math.sin(t)*22.3];pw.tri([375,89.6,349],pt(b),pt(a),P.water);}
 for(let i=0;i<32;i++){let a=i/32*2*PI,x=375+Math.cos(a)*17.2,z=349+Math.sin(a)*23.2;rail.box(x,89.5,z,1.8,.65,1.5,P.stone);if(i%3===0)G.spiritLotus(pl,375+Math.cos(a)*13.4,89.66,349+Math.sin(a)*19.4,.7+(i%4)*.15);}
 // Curved timber footbridge across the south edge, open water visible beneath.
 for(let i=0;i<26;i++){let x=362+i,yy=90.1+1.45*Math.sin(i/25*PI);pl.box(x,yy,364.5,1.01,.25,3.4,P.wood);for(let side of[-1,1])if(i%3===0){pl.box(x,yy,364.5+side*1.6,.13,1.1,.13,P.wood);if(i<24)pl.tube([x,yy+1.1,364.5+side*1.6],[x+3,90.1+1.45*Math.sin(Math.min(25,i+3)/25*PI)+1.1,364.5+side*1.6],.065,P.wood,5);}}
 // Pond-side open pavilion, no invented canon name.
 const shelter=bank.get(399,346),roof=bank.get(399,346,'roof');shelter.box(399,90.0,346,9,.5,11,P.stone);for(let dx of[-3.4,3.4])for(let dz of[-4.2,4.2])shelter.cone(399+dx,90.5,346+dz,.20,.19,4.6,P.wood,9);G.templeRoof(roof,null,399,95.3,346,12,14,3.1,K.roof);G.templeRail(shelter,402.4,90.6,346,8,'z');
 path(bank,terrain,[[329,350],[343,354],[354,360]],4);
 // Garden rooms beside the main hall replace the vacant paved apron.
 for(const [x,z,w,d] of [[262,421,12,15],[338,427,15,15],[262,398,14,9],[386,413,10,11]]){
  const b=bank.get(x,z,'templeStone'),de=bank.get(x,z,'matte','near');b.box(x,112.18,z,w,.27,d,P.stone);b.box(x,112.46,z,w-.65,.055,d-.65,rgb('#6e7b53'));
  for(let side of[-1,1]){b.box(x+side*(w/2-.12),112.43,z,.24,.20,d,P.light);b.box(x,112.43,z+side*(d/2-.12),w,.20,.24,P.light);}
  for(let j=0;j<9;j++){const a=j*2.399,xx=x+Math.cos(a)*(w/2-1.8),zz=z+Math.sin(a)*(d/2-1.7);b.ellipsoid(xx,112.85,zz,1.0,.49,.95,rgb('#567351'),8,4);}
  G.spiritRock(b,x-1.1,112.4,z+.5,1.7,1.75,1.25,1821+Math.round(x),P.stone);
  for(let j=0;j<7;j++)de.box(x-.9,112.56,z-d/2+1+j*(d-2)/7,1.9,.03,.045,rgb('#b0b395'));
 }
 // Open resting cloisters occupy the middle terrace, without blocking its central ascent.
 for(const side of[-1,1]){const x=300+side*37,z=350,b=bank.get(x,z),ro=bank.get(x,z,'roof');b.box(x,82.19,z,23,.36,7,P.wood);for(let xx=-9;xx<=9;xx+=6)for(let ss of[-1,1])b.cone(x+xx,82.55,z+ss*2.6,.16,.15,4.6,P.wood,8);G.templeRoof(ro,null,x,87.3,z,27,10,2.45,K.roof);for(let ss of[-1,1]){b.box(x,83.04,z+ss*2.45,20,.20,.75,P.wood);for(let xx of[-8,0,8])b.box(x+xx,82.55,z+ss*2.45,.22,.49,.62,P.dark);}}
 // Small stair connection to the raised pond garden (not a painted road over a steep bank).
 const ps=bank.get(350,356,'templeStone');for(let i=0;i<32;i++){const x=343+i*14/32,y=82+(i+1)*8/32;ps.box(x,y-.40,356,14/32+.03,.4,4.4,P.light);}
 // Strong, laid-stone faces at the upper rim of the three major terrace cuts.
 const embank=new G.Geometry(),shrubs=new G.Geometry();
 for(const [za,zb,low,high,x0,x1] of [[363,391,82,112,218,394],[307,337,56,82,249,349],[454,479,112,130,256,355]]){
  for(let x=x0;x<x1;x+=2.7){if(Math.abs(x-300)<10||Math.abs(x-376)<6&&za>450)continue;
   for(let row=0;row<7;row++){const yy=high-6+row*.80;let left=za,right=zb;for(let it=0;it<15;it++){let mid=(left+right)/2;if(terrain.height(x,mid)>yy)right=mid;else left=mid;}
    const zz=(left+right)/2-.45;embank.box(x,yy,zz,2.65,.765,1.1,G.blend(P.stone,P.darkStone,(row%3)*.06));}
   if(Math.round(x)%3===0){let z=za+4+((x*2.3)%9),y=terrain.height(x,z);for(let k=0;k<4;k++){const a=k*2.399;shrubs.ellipsoid(x+Math.cos(a),y+.55+k*.15,z+Math.sin(a),1.35,.75,1.0,rgb('#587047'),7,4);}}
  }
 }
 // Green slope bands and retained rock outcrops make the plateaus belong to the hill.
 const rocks=new G.Geometry(),r=G.rng(18023);for(let i=0;i<82;i++){const a=i*2.399,rad=1.0+(i%3)*.08,x=313+Math.cos(a)*150*rad,z=458+Math.sin(a)*202*rad;if(z<267||Math.abs(x-300)<22&&z<395)continue;const y=terrain.height(x,z);G.spiritRock(rocks,x,y-2,z,3+r()*5,3+r()*5,3+r()*4,8000+i,rgb('#7b8475'));}
 for(let i=0;i<115;i++){let x=163+r()*287,z=270+r()*380;if(pads.some(p=>rectWeight(x,z,{...p,w:p.w+7,d:p.d+7},2)>.1)||Math.abs(x-300)<15&&z<394||Math.abs(x-376)<7&&z>443&&z<484)continue;let y=terrain.height(x,z);for(let k=0;k<4;k++)shrubs.ellipsoid(x+(r()-.5)*3,y+.6+k*.22,z+(r()-.5)*3,1.45,.72,1.2,G.blend(rgb('#567042'),rgb('#7c8b50'),r()*.4),7,3);}
 for(let z=265;z<675;z+=13)for(let x=142;x<487;x+=13){const X=x+(r()-.5)*7,Z=z+(r()-.5)*7,d=Math.hypot((X-313)/176,(Z-459)/216);if(d>1.06||d<.95&&pads.some(p=>rectWeight(X,Z,{...p,w:p.w+13,d:p.d+13},1)>.1)||Math.abs(X-300)<20&&Z<407||Math.abs(X-376)<10&&Z>444&&Z<489||Math.hypot((X-375)/24,(Z-349)/31)<1.1||r()>.73)continue;plants.push({x:X,z:Z,type:r()>.4?'hinoki':'broadleaf',scale:1.05+r()*.85});}
 for(const[x,z,t,s]of[[247,350,'cherry',1.2],[341,343,'broadleaf',1.8],[256,400,'cherry',1.4],[340,440,'cherry',1.3],[351,484,'broadleaf',1.8],[247,517,'hinoki',1.4],[365,530,'hinoki',1.4],[281,274,'hinoki',1.6],[327,274,'hinoki',1.6],[397,324,'broadleaf',1.6]])plants.push({x,z,type:t,scale:s});
 const meshes=[...bank.meshes(),...graveMeshes].map((m,i)=>({...m,id:'myouren:v08:'+i+':'+m.id,space:'surface',region:'myouren',locationId:'myouren',basis:'P'}));
 meshes.push(embank.mesh('myouren:laid-stone-terrace-faces','architecture',{space:'surface',region:'myouren',material:'templeStone',basis:'P'}),shrubs.mesh('myouren:slope-shrubs','vegetation',{space:'surface',region:'myouren',material:'foliage',basis:'P'}),pw.mesh('myouren:lotus-pond-v08','water',{space:'surface',region:'myouren',basis:'P'}),rocks.mesh('myouren:outcrop-v08','architecture',{space:'surface',region:'myouren',material:'cave',basis:'P'}));
 return{meshes,plantSites:plants,footprints:[{x:313,z:466,rx:180,rz:216}],signs,meta:{...PLAN,graveCount:graves.length,graves,halls,ascents,regionBounds:[128,245,512,690],levels:[34,56,82,112,130],note:'F/P：独立丘陵中的山寺；莲池、登山与墓地顺序参考夜雀食堂DLC3。未迁入妖怪之山，未把局部海拔当作正作测量。'}};
}

function blueRail(g,x,y,z,length,axis='z'){
 const point=t=>[x+(axis==='x'?t:0),y,z+(axis==='z'?t:0)],n=Math.ceil(length/3),step=length/n;
 for(let i=0;i<=n;i++){let p=point(-length/2+i*step);g.box(p[0],y,p[2],.35,1.18,.35,P.light);g.box(p[0],y+1.18,p[2],.53,.14,.53,P.light);if(i<n){let q=point(-length/2+(i+.5)*step);g.box(q[0],y+.24,q[2],axis==='x'?step-.4:.12,.63,axis==='z'?step-.4:.12,P.jade);for(let k=0;k<3;k++){let pp=point(-length/2+(i+(k+1)/4)*step);g.box(pp[0],y+.23,pp[2],.065,.63,.065,P.light);}}}
 if(axis==='z'){g.box(x,y+1.08,z,.3,.16,length+.2,P.light);g.box(x,y+.12,z,.28,.16,length,P.light);}else{g.box(x,y+1.08,z,length+.2,.16,.3,P.light);g.box(x,y+.12,z,length,.16,.28,P.light);}
}
function lantern(g,fx,x,y,z){g.tube([x,y+1.2,z],[x,y+2,z],.028,P.trim,5);g.box(x,y,z,.78,.14,.78,P.dark);g.box(x,y+.99,z,.78,.12,.78,P.dark);fx.box(x,y+.15,z,.65,.80,.65,rgb('#e9c893'));for(let a of[-1,1])for(let b of[-1,1])g.box(x+a*.36,y+.1,z+b*.36,.07,.9,.07,P.trim);g.cone(x,y+1.06,z,.64,.30,.30,P.dark,4);g.cone(x,y-.15,z,.5,.3,.18,P.trim,4);}
function galleryBay(g,de,roof,fx,x,y,z,span=12,step=6){
 for(let side of[-1,1]){const X=x+side*(span/2-.6);g.box(X,y,z,.95,.28,.95,P.light);g.cone(X,y+.28,z,.28,.23,7.3,P.red,12);g.box(X,y+7.4,z,.92,.24,1.0,P.trim);g.box(X,y+7.65,z,1.45,.24,1.1,P.jade);g.box(X,y+7.9,z,1.80,.22,.8,P.jade);
 // Knee braces, carved lattice heads, continuous longitudinal beams.
 g.tube([X,y+5.9,z],[X-side*1.45,y+7.8,z],.13,P.red,7);g.box(X,y+7.6,z+step/2,.33,.38,step+.25,P.dark);
 for(let j=0;j<5;j++)de.box(X,y+6.20,z+(j+.5)*step/5,.13,1.05,.09,P.jade);
 g.box(X,y+6.15,z+step/2,.17,.16,step-.4,P.jade);g.box(X,y+7.14,z+step/2,.17,.13,step-.4,P.jade);
 }
 g.box(x,y+8.18,z,span-.8,.34,.36,P.dark);g.box(x,y+8.54,z,span,.22,.30,P.trim);
 // Real coffered ceiling above the walking surface, removable with roof inspection.
 roof.box(x,y+8.72,z+step/2,span+1.8,.17,step+.12,P.dark);
 for(let xx=-span/2;xx<=span/2;xx+=2){roof.box(x+xx,y+8.5,z+step/2,.10,.18,step,P.jade);for(let zz=1;zz<=step;zz+=2)roof.box(x+xx+.98,y+8.48,z+zz,1.97,.16,.11,P.jade);}
 for(let s of[-1,1])lantern(g,fx,x+s*4.2,y+5.6,z+step/2);
}
function buildDescent(bank,shell){
 const points=[[382,130,472],[382,127,480],[382,122,490],[409,101,529],[365,80,529],[409,59,510],[365,38,510],[409,17,491],[365,-4,491],[409,-25,472],[386,-41.5,452],[386,-41.5,423],[307,-41.5,423]],steps=[];
 for(let j=0;j<points.length-1;j++){const A=points[j],B=points[j+1],dx=B[0]-A[0],dz=B[2]-A[2],L=Math.hypot(dx,dz),n=Math.max(1,Math.ceil(Math.max(Math.abs(A[1]-B[1])/.23,L/.50))),yaw=Math.atan2(dx,dz),g=bank.get(A[0],A[2],'templeStone');
 for(let i=0;i<n;i++){let t=(i+.5)/n,x=mix(A[0],B[0],t),y=mix(A[1],B[1],(i+1)/n),z=mix(A[2],B[2],t);g.place(x,y,z,yaw);g.box(0,-.35,0,4.8,.35,L/n+.025,P.stone);steps.push([x,y,z]);}
 // Solid sidewalls and roof strips, not disconnected floating frames.
 if(j<points.length-2)for(let k=0;k<Math.ceil(L/5);k++){const t=k/Math.ceil(L/5),u=(k+1)/Math.ceil(L/5);const a=[mix(A[0],B[0],t),mix(A[1],B[1],t),mix(A[2],B[2],t)],b=[mix(A[0],B[0],u),mix(A[1],B[1],u),mix(A[2],B[2],u)],nx=dz/L,nz=-dx/L;
 for(let side of[-1,1]){let p=v=>[v[0]+side*nx*2.9,v[1],v[2]+side*nz*2.9];let p0=p(a),p1=p(b);shell.quad(p0,p1,[p1[0],p1[1]+5,p1[2]],[p0[0],p0[1]+5,p0[2]],P.cave);}
 shell.quad([a[0]-nx*3,a[1]+5,a[2]-nz*3],[b[0]-nx*3,b[1]+5,b[2]-nz*3],[b[0]+nx*3,b[1]+5,b[2]+nz*3],[a[0]+nx*3,a[1]+5,a[2]+nz*3],P.darkStone);
 }
 g.place();g.box(B[0],B[1]-.35,B[2],5.8,.35,5.8,P.light);
 }
 return{points,steps};
}
function buildWaterGallery(){const bank=new G.BatchBank(),floor=new G.Geometry(),cave=new G.Geometry(),ceil=new G.Geometry(),roof=new G.Geometry(),fx=new G.Geometry(),water=new G.Geometry(),shell=new G.Geometry();const X=307,Y=-41.5,z0=425,z1=533,step=6,bays=18,signs=[];
 // A long, narrow gallery opens into a wider lotus cavern. No featureless white disk.
 floor.box(X,-48,510,182,2,213,P.darkStone);
 for(let z=406;z<602;z+=4)for(let x=218;x<396;x+=4){const edge=Math.max(Math.abs((x-X)/88),Math.abs((z-509)/103));if(edge>1)continue;water.quad([x,-43.55,z],[x,-43.55,z+4],[x+4,-43.55,z+4],[x+4,-43.55,z],P.water);}
 const g=bank.get(X,470,'templeStone'),de=bank.get(X,470,'matte','near');
 g.box(X,Y-.65,(z0+z1)/2,13,.65,z1-z0+11,P.stone);g.box(X,Y,(z0+z1)/2,12,.16,z1-z0+11,P.light);
 for(let z=z0-4;z<z1+5;z+=1.5){for(let side of[-1,1])g.box(X+side*5.6,Y+.16,z,.28,.09,1.48,P.jade);de.box(X,Y+.166,z,10.7,.013,.025,P.stone);}
 const timber=bank.get(X,470,'timber');for(let i=0;i<=bays;i++)galleryBay(timber,de,roof,fx,X,Y+.17,z0+i*step,12,i===bays?0:step);
 // The beams keep a common datum; roof is a continuous barrel-like gable, not individual hats.
 const shellRoof=new G.Geometry();shellRoof.place(X,Y,(z0+z1)/2,PI/2);G.roof(shellRoof,0,9.05,0,z1-z0+15,17,2.65,rgb('#384957'),null,false);
 const roofMesh=shellRoof.mesh('mausoleum:gallery-roof-shell','architecture',{space:'mausoleum',region:'mausoleum',material:'roof',ceiling:true,hideInSection:true,basis:'P'});
 for(let side of[-1,1]){blueRail(g,X+side*6.12,Y+.17,452,48);blueRail(g,X+side*6.12,Y+.17,506,42);}
 // Lateral crossing bridge and open pavilion break the repeated tunnel rhythm.
 const bx=X+24,bz=478;
 for(let i=0;i<44;i++){let x=X+i*.85,y=Y+.16+1.25*Math.sin(i/43*PI);g.box(x,y-.30,bz,.87,.30,7.3,P.light);if(i%4===0)for(let side of[-1,1]){g.box(x,y,bz+side*3.35,.30,1.1,.3,P.light);if(i<40)g.tube([x,y+1.06,bz+side*3.35],[x+3.4,Y+.16+1.25*Math.sin((i+4)/43*PI)+1.06,bz+side*3.35],.11,P.light,6);}}
 for(let x of[315,329,344])g.box(x,-46.4,bz,1.6,3.8,6.8,P.stone);
 const sideRoof=new G.Geometry();sideRoof.place(bx,Y,bz);G.roof(sideRoof,0,8.3,0,49,11,2.7,rgb('#465760'),null,false);for(let x=315;x<353;x+=6)for(let s of[-1,1]){timber.cone(x,Y+.3,bz+s*3.6,.21,.19,7.6,P.red,10);lantern(timber,fx,x,Y+5.4,bz+s*3.7);}
 const sideRoofMesh=sideRoof.mesh('mausoleum:cross-gallery-roof','architecture',{space:'mausoleum',region:'mausoleum',material:'roof',ceiling:true,hideInSection:true,basis:'P'});
 // Terminal stepped island with the historical octagonal shrine.
 const altar=bank.get(X,556,'templeStone');altar.cone(X,-44,552,29,29,2.6,P.stone,12);altar.cone(X,-41.4,552,27.8,27.8,.24,P.light,12);
 const tower=G.spiritOctTower(bank,X,-41.1,556,{levels:4,radius:11.0,storey:8.0,colour:rgb('#626b6d')});
 for(let side of[-1,1])blueRail(altar,X+side*24,-41.1,554,23);for(let x of[285,329])G.templeLamp(altar,x,-41.15,540,.83);
 // Entrance gate frames the entire vanishing point; an actual open aperture.
 const entry=bank.get(X,418,'timber'),er=bank.get(X,418,'roof');for(let side of[-1,1]){entry.box(X+side*8,Y,418,4.3,9.3,3.1,P.darkStone);entry.cone(X+side*5.85,Y,416.5,.4,.36,10,P.red,12);entry.box(X+side*8,Y+1.5,416.4,3.2,5.8,.16,P.jade);for(let j=0;j<7;j++)de.box(X+side*8+(j-3)*.38,Y+1.6,416.25,.06,5.6,.08,P.trim);}
 entry.box(X,Y+9.2,418,21,.6,3.5,P.dark);G.templeRoof(er,null,X,Y+9.8,418,27,10,3.25,rgb('#465762'));
 signs.push({text:'夢 殿 大 祀 廟',position:[X,Y+9.55,416.15],width:6.8,height:.85,yaw:PI,background:'#2e3f48',color:'#d9c299',space:'mausoleum'});
 const rr=G.rng(81478),lotusGeo=bank.get(280,515),stones=bank.get(355,534,'cave');for(let i=0;i<96;i++){const x=226+rr()*162,z=421+rr()*170;if(Math.abs(x-X)<10&&z<537||Math.hypot(x-X,z-556)<29||Math.abs(z-478)<6&&x>300&&x<354)continue;G.spiritLotus(lotusGeo,x,-43.43,z,.7+rr()*1.15);if(i%9===0){G.spiritRock(stones,x,-45,z,2.7,2.5,3.2,912+i,P.cave);}}
 // Stratified grotto: continuous faceted bands + attached rock buttresses.
 const N=74,levels=9;for(let i=0;i<N;i++){let a=i/N*2*PI,b=(i+1)/N*2*PI;const mid=(a+b)/2;if(Math.sin(mid)<-.88&&Math.abs(Math.cos(mid))<.38)continue;const pt=(t,l)=>{let R=1+.035*Math.sin(i*.72+l*.7);return[X+Math.cos(t)*(88-l*2.1)*R,-47+l*7.7,507+Math.sin(t)*(104-l*1.8)*R];};for(let j=0;j<levels;j++)cave.quad(pt(a,j),pt(b,j),pt(b,j+1),pt(a,j+1),G.blend(P.cave,P.dark,(j%3)*.1));}
 for(let i=0;i<25;i++){const a=i*2.399,x=X+Math.cos(a)*82,z=512+Math.sin(a)*91;if(z<426&&Math.abs(x-X)<21)continue;G.spiritRock(cave,x,-47,z,9+rr()*6,13+rr()*19,10+rr()*6,500+i,P.cave);}
 for(let i=0;i<60;i++){let a=i/60*2*PI,b=(i+1)/60*2*PI;ceil.tri([X,28,510],[X+Math.cos(a)*76,15,510+Math.sin(a)*93],[X+Math.cos(b)*76,15,510+Math.sin(b)*93],P.dark);}
 const tunnel=buildDescent(bank,shell);
 const meshes=bank.meshes().map(m=>({...m,id:'mausoleum:v08:'+m.id,space:'mausoleum',era:'th13',basis:'P',region:'mausoleum'}));
 meshes.push(floor.mesh('mausoleum:floor','architecture',{material:'cave',space:'mausoleum',region:'mausoleum',basis:'P'}),water.mesh('mausoleum:lotus-water','water',{space:'mausoleum',region:'mausoleum',basis:'P'}),cave.mesh('mausoleum:cave-walls','architecture',{space:'mausoleum',region:'mausoleum',material:'cave',hideInSection:true,basis:'P'}),ceil.mesh('mausoleum:ceiling','architecture',{space:'mausoleum',region:'mausoleum',material:'cave',ceiling:true,hideInSection:true,basis:'P'}),roof.mesh('mausoleum:gallery-coffers','architecture',{space:'mausoleum',region:'mausoleum',material:'timber',ceiling:true,hideInSection:true,basis:'P'}),roofMesh,sideRoofMesh,shell.mesh('mausoleum:descent-shell','architecture',{space:'mausoleum',region:'mausoleum',material:'cave',ceiling:true,hideInSection:true,basis:'P'}),fx.mesh('mausoleum:lanterns','effects',{space:'mausoleum',region:'mausoleum',material:'warmGlow',basis:'P'}));
 const lights=[[307,-34,432,0xffd7a0,170,25],[307,-34,462,0xffd7a0,150,24],[307,-34,492,0xffd7a0,150,24],[307,-34,522,0xffd7a0,175,27],[347,-32,478,0x8fcbd6,310,49],[279,-23,551,0x8ac1d0,520,73],[331,-18,559,0xbbc3e3,470,75]];
 return{meshes,signs,meta:{basis:'P',iteration:2,space:'mausoleum',era:'th13',center:[307,-44,516],cemeteryAbove:PLAN.cemetery.slice(),tower,tunnel,locationId:'mausoleum',currentLocation:'senkai',gallery:{start:[X,Y,425],end:[X,Y,533],length:108,width:12,bays,step,roofHeight:8.72,walkY:Y+.16,waterY:-43.55,bridge:[331,Y+.16,478]},lights,note:'F/P：夜雀食堂DLC3的临水桥路、栏杆与洞窟氛围参考；108米连续柱廊和尺度为P补完。历史层与迁址仙界互斥。'}};
}
function mountainSection(terrain){
 const g=new G.Geometry();
 // Cut a west face through the true local mountain. Open front and east preserve sightlines.
 for(let z=254;z<568;z+=4){const h0=terrain.height(213,z),h1=terrain.height(213,z+4);g.quad([213,-49,z],[213,-49,z+4],[213,h1,z+4],[213,h0,z],P.darkStone);}
 for(let lv=0;lv<8;lv++){const yy=-48+lv*22;g.box(213,yy,452,1.4,.60,307,G.blend(P.stone,P.dark,lv*.06));}
 g.box(307,-49,515,184,1.3,214,P.darkStone);
 // A narrow surface strip retains the real elevation, but never roofs over the cutaway.
 for(let z=256;z<580;z+=4)for(let x=208;x<236;x+=4){const p=(X,Z)=>[X,terrain.height(X,Z),Z];g.quad(p(x,z),p(x,z+4),p(x+4,z+4),p(x+4,z),P.grass);}
 return[g.mesh('section:geology-P','architecture',{space:'section',region:'section',material:'cave',basis:'P'})];
}
Object.assign(G,{TEMPLE_PLAN:PLAN,buildMyouren:buildMountainTemple,buildMausoleum:buildWaterGallery,buildSection:mountainSection});
})(globalThis.GA);

/* v0.9 | Bamboo Forest of the Lost. Every path, height and exterior back face is P.
 * Source constraints: PMiSS bamboo entry / Eientei / Mokou / Tewi.
 * No game textures, reference screenshots or generated pictures are used as scenery.
 * This module touches one local region; previous regional builders are preserved.
 */
(function(G){'use strict';
const {rgb,blend,mix,smooth:sm}=G,PI=Math.PI;
const C={earth:rgb('#697156'),path:rgb('#a49b80'),edge:rgb('#86846a'),moss:rgb('#556d4d'),stone:rgb('#858e83'),lightStone:rgb('#b5b8a2'),wood:rgb('#746046'),dark:rgb('#3d4036'),paper:rgb('#ddd8be'),plaster:rgb('#d5d2bf'),roof:rgb('#4a5651'),rim:rgb('#839868'),leaf:rgb('#526e4b')};
const inForest=(x,z,pad=0)=>Math.hypot((x-500)/(540+pad),(z-1230)/(470+pad))<1;
const weight=(x,z)=>1-sm(.77,1.04,Math.hypot((x-500)/570,(z-1230)/495));
const NODES={entry:[440,770],fork:[424,941],bend:[538,1099],cross:[527,1237],south:[568,1371],gate:[690,1494]};
const paths=[
 {id:'bamboo-main',kind:'main',width:3.3,points:[[440,770],[389,835],[396,893],[424,941],[478,985],[520,1034],[538,1099],[506,1159],[483,1192],[527,1237],[598,1293],[568,1371],[581,1440],[618,1507],[674,1522],[690,1494]]},
 {id:'bamboo-west-loop',kind:'loop',width:2.7,points:[[424,941],[364,977],[350,1034],[395,1095],[457,1118],[506,1159]]},
 {id:'bamboo-south-loop',kind:'loop',width:2.4,points:[[527,1237],[459,1263],[430,1302],[451,1364],[505,1388],[568,1371]]},
 {id:'bamboo-rabbit-turn',kind:'branch',width:2.2,points:[[598,1293],[663,1275],[704,1301],[715,1358],[756,1408],[760,1454],[723,1500],[690,1494]]},
 {id:'bamboo-rest-spur',kind:'branch',width:2.6,points:[[395,1095],[365,1129],[364,1150]]},
 {id:'bamboo-dead-end',kind:'dead-end',width:1.7,points:[[459,1263],[416,1225],[406,1188]]}
].map(p=>({...p,basis:'P',samples:G.spline(p.points,2.5)}));
// Spatial cells avoid scanning every spline point for each ground/plant query.
const bins=new Map(),CELL=24;
for(const p of paths)for(let i=0;i<p.samples.length-1;i++){const a=p.samples[i],b=p.samples[i+1],r=14;for(let x=Math.floor((Math.min(a[0],b[0])-r)/CELL);x<=Math.floor((Math.max(a[0],b[0])+r)/CELL);x++)for(let z=Math.floor((Math.min(a[1],b[1])-r)/CELL);z<=Math.floor((Math.max(a[1],b[1])+r)/CELL);z++){const k=x+':'+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push({a,b,width:p.width,id:p.id});}}
function nearest(x,z){let best={d:Infinity,width:0,id:null};for(const e of bins.get(Math.floor(x/CELL)+':'+Math.floor(z/CELL))||[]){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],t=G.clamp(((x-e.a[0])*dx+(z-e.a[1])*dz)/(dx*dx+dz*dz||1),0,1),d=Math.hypot(x-e.a[0]-dx*t,z-e.a[1]-dz*t);if(d<best.d)best={d,width:e.width,id:e.id};}return best;}
const originalHeight=G.Terrain.prototype.height,originalColor=G.Terrain.prototype.color,originalWater=G.Terrain.prototype.water;
const clearing=[{id:'eientei',x:690,z:1440,w:130,d:112,y:70},{id:'rest',x:357,z:1153,w:17,d:13},{id:'rabbit',x:713,z:1347,w:15,d:14}];
function rectWeight(x,z,p,fade=8){return 1-sm(0,fade,Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2));}
function forestHeight(t,x,z){let h=originalHeight.call(t,x,z),w=weight(x,z);if(!w)return h;
 const relief=(2.1*Math.sin(x*.029+z*.018)+1.8*Math.sin(z*.032-x*.014))
 +11*Math.exp(-(((x-451)/62)**2+((z-1062)/72)**2))
 +8*Math.exp(-(((x-567)/77)**2+((z-1214)/53)**2))
 +6*Math.exp(-(((x-647)/66)**2+((z-1370)/43)**2));h+=relief*w;
 const terrace=rectWeight(x,z,clearing[0],20);h=mix(h,70,terrace);
 for(const p of clearing.slice(1)){const hh=originalHeight.call(t,p.x,p.z)+2.1*Math.sin(p.x*.029+p.z*.018)+1.8*Math.sin(p.z*.032-p.x*.014);h=mix(h,hh,rectWeight(x,z,p,7));}
 return h;
}
const creek={x0:490,x1:622,center:x=>1118+5*Math.sin((x-541)/31),halfWidth:2.0};
function creekDistance(x,z){if(x<creek.x0||x>creek.x1)return Infinity;return Math.abs(z-creek.center(x));}
G.Terrain.prototype.height=function(x,z){let h=forestHeight(this,x,z);const d=creekDistance(x,z);if(d<5){const fade=sm(creek.x0,creek.x0+13,x)*(1-sm(creek.x1-13,creek.x1,x));h-=2.1*(1-sm(1.6,4.7,d))*fade;}return h;};
G.Terrain.prototype.color=function(x,z,h,n){const w=weight(x,z);if(!w)return originalColor.call(this,x,z,h,n);let c=blend(C.earth,C.moss,G.noise(x/36,z/36)*.57);c=blend(c,rgb('#626f51'),sm(.15,.48,1-(n||this.normal(x,z))[1])*.4);return blend(originalColor.call(this,x,z,h,n),c,w);};
G.Terrain.prototype.water=function(x,z,m=0){const d=creekDistance(x,z);return originalWater.call(this,x,z,m)||(x>creek.x0+8&&x<creek.x1-8&&d<creek.halfWidth+m*5);};
const ext=G.routes.find(r=>r.id==='route-bamboo');ext.points=[[100,300],[240,580],[440,770]];ext.samples=G.spline(ext.points,5);ext.note='P：保留人里出口，接入新竹林入口，林内道路另建。';
const inner=G.routes.find(r=>r.id==='route-eientei');inner.points=paths[0].points;inner.samples=paths[0].samples;inner.width=4.1;inner.note='P：曲折穿过竹林、木桥与岔路，抵达永远亭外门；不代表官方路线。';
const oldPathMeshes=G.Terrain.prototype.pathMeshes;
G.Terrain.prototype.pathMeshes=function(){return oldPathMeshes.call(this).filter(m=>m.id!=='route-eientei');};
// Remove only the old Eientei blockout; other named landmark builders are unchanged.
const oldRegions=G.buildRegionalLandmarks;
G.buildRegionalLandmarks=function(t,c){const r=oldRegions(t,c);return{meshes:r.meshes.filter(m=>m.id!=='building-eientei'),footprints:r.footprints.filter(f=>f.id!=='eientei')};};
// Preserve every non-regional background instance and its existing random seed result.
const oldVegetation=G.buildVegetation;
G.buildVegetation=function(t,v,f){const r=oldVegetation(t,v,f),out=[];let removed=0;for(const m of r.meshes){if(!m.instances){out.push(m);continue;}const mats=[],colors=[];let hasRemoved=false;for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14];if(inForest(x,z,5)){removed++;hasRemoved=true;}else{mats.push(...m.instances.subarray(i,i+16));colors.push(...m.instanceColors.subarray(i/16*3,i/16*3+3));}}
 if(!hasRemoved)out.push(m);else if(mats.length)out.push({...m,instances:new Float32Array(mats),instanceColors:new Float32Array(colors)});}
 return{meshes:out,count:r.count-removed};};

function blade(g,p,angle,length,width,col,drop=.08){const d=[Math.cos(angle)*length,-drop,Math.sin(angle)*length],q=[-Math.sin(angle)*width,0,Math.cos(angle)*width],m=G.add(p,G.mul(d,.48)),tip=G.add(p,d);g.tri(p,G.add(m,q),tip,col);g.tri(p,tip,G.sub(m,q),col);}
function bambooTemplate(variant,far=false){const stem=new G.Geometry(),leaf=new G.Geometry(),R=G.rng(6281+variant*111),H=13.6+variant*2.1,r=.125+variant*.014,bx=(R()-.5)*3.6,bz=(R()-.5)*2.8;
 const at=y=>[bx*(y/H)**1.6,y,bz*(y/H)**1.6];
 const sleeve=(a,b,ra,rb,col,n=7)=>{const delta=G.norm(G.sub(b,a)),right=G.norm(G.cross(delta,[0,0,1])),up=G.cross(delta,right),pt=(o,rad,j)=>G.add(o,G.add(G.mul(right,Math.cos(j/n*2*PI)*rad),G.mul(up,Math.sin(j/n*2*PI)*rad)));for(let i=0;i<n;i++)stem.quad(pt(a,ra,i+1),pt(a,ra,i),pt(b,rb,i),pt(b,rb,i+1),col);};
 if(far)stem.tube(at(0),at(H),r,[.69,.90,.63],5,r*.5);else{
  const segs=12;for(let i=0;i<segs;i++){let a=i/segs*H,b=(i+1)/segs*H,rr=r*(1-.4*i/segs),shade=.70+.25*i/segs;
   sleeve(at(a),at(b),rr,rr*.97,[shade*.79,shade,shade*.70]);
   sleeve(at(a+.012),at(a+.066),rr*1.15,rr*1.11,[.43,.65,.36]);
   sleeve(at(a+.068),at(a+.083),rr*1.09,rr*1.04,[.84,.96,.63]);}}
 for(let j=0;j<(far?6:11);j++){
  const yy=H*(.40+j/(far?6:11)*.54),ang=j*2.4+variant,origin=at(yy),L=(3.6-.10*j)*(.8+R()*.38),end=G.add(origin,[Math.cos(ang)*L,.3+R()*.35,Math.sin(ang)*L]);
  if(!far)stem.tube(origin,end,.023,[.50,.65,.37],4,.006);
  const count=far?8:14;for(let k=0;k<count;k++){
   const t=(k+1)/(count+1),p=G.add(G.mul(origin,1-t),G.mul(end,t)),side=k%2?1:-1,a=ang+side*(.64+R()*.5),len=(far?1.25:.92)+R()*.50,ww=far?.15:.10;
   p[1]+=.14*Math.sin(t*3);const col=[.57+R()*.18,.72+R()*.18,.45+R()*.18];blade(leaf,p,a,len,ww,col,.23+R()*.35);
   if(!far&&k%2===0){const fork=G.add(p,[Math.cos(a)*.44,.06,Math.sin(a)*.44]);stem.tube(p,fork,.007,[.5,.62,.37],3,.003);blade(leaf,fork,a+.42,.8,.083,col,.30);blade(leaf,fork,a-.32,.96,.08,col,.20);}
  }
 }
 return{stem:stem.mesh('bamboo-prototype-stem').vertices,leaf:leaf.mesh('bamboo-prototype-leaf').vertices,height:H};}
function understoryTemplate(type){const g=new G.Geometry(),R=G.rng(91);if(type==='shoot'){
 for(let i=0;i<5;i++){const y=i*.15,r=.23*(1-i*.15);g.cone(0,y,0,r,r*.77,.18,blend(rgb('#6c6950'),rgb('#a1a573'),i/5),7);}g.cone(0,.75,0,.058,0,.27,rgb('#52654a'),5);
 }else if(type==='fern'){
 for(let j=0;j<8;j++){const ang=j*2.4,tip=[Math.cos(ang)*.85,.35+R()*.25,Math.sin(ang)*.85];g.tube([0,0,0],tip,.012,rgb('#596544'),3,.005);for(let k=1;k<7;k++){let t=k/7,p=G.mul(tip,t),len=.34*Math.sin(t*2.7);for(const s of[-1,1])blade(g,p,ang+s*.95,len,.077,blend(rgb('#608453'),rgb('#85976a'),R()*.45),.015);}}
 }else if(type==='rock'){
 g.ellipsoid(0,.10,0,.72,.18,.53,rgb('#798273'),7,3);for(let i=0;i<4;i++)g.ellipsoid((R()-.5)*.8,.18+R()*.06,(R()-.5)*.6,.28,.075,.22,rgb('#536948'),5,2);
 }else if(type==='litter'){
 for(let i=0;i<16;i++)blade(g,[(R()-.5)*2.8,.018+R()*.025,(R()-.5)*2.8],R()*PI*2,.22+R()*.2,.025,blend(rgb('#9a9270'),rgb('#766f52'),R()),0);
 }else if(type==='rabbit'){
 const c=rgb('#e4dfca');g.ellipsoid(0,.30,0,.25,.31,.38,c,8,4);g.ellipsoid(0,.53,.25,.20,.22,.2,c,8,4);for(let s of[-1,1]){g.ellipsoid(s*.115,.86,.25,.065,.27,.055,c,6,3);g.ellipsoid(s*.19,.19,.12,.09,.1,.2,c,6,3);g.ellipsoid(s*.15,.57,.36,.022,.025,.025,rgb('#57433e'),5,3);}g.ellipsoid(0,.33,-.39,.12,.12,.12,c,6,3);
 }return g.mesh('bamboo-prop-'+type).vertices;}
function buildBamboo(t){
 const bank=new G.BatchBank(),meshList=[],signs=[],R=G.rng(90871),plantRecords=[],groups=new Map(),propGroups=new Map(),features=[];
 const geom=(x,z,mat='matte',lod='base')=>bank.get(x,z,mat,lod);
 const pushGeom=(g,id,group,extra={})=>{if(g.a.length)meshList.push(g.mesh(id,group,{region:'bamboo',evidence:'P',...extra}));};
 const fp=clearing.map(p=>({id:p.id,x:p.x,z:p.z,rx:p.w/2+2,rz:p.d/2+2}));
 function blocked(x,z,margin=0){const n=nearest(x,z);return n.d<n.width/2+1.1+margin||creekDistance(x,z)<4.2+margin||fp.some(p=>Math.abs(x-p.x)<p.rx+margin&&Math.abs(z-p.z)<p.rz+margin);}
 const templates=[0,1,2].map(v=>({near:bambooTemplate(v),far:bambooTemplate(v,true)}));
 function addBamboo(x,z,scale=1,seed=0){if(!inForest(x,z)||blocked(x,z))return false;
 if([[428,944],[538,1084],[689,1511],[370,1165],[708,1353]].some(p=>Math.hypot(x-p[0],z-p[1])<2.7))return false;
 const y=t.height(x,z)-.07,variant=seed%3,angle=R()*PI*2,key=variant+':'+Math.floor(x/96)+':'+Math.floor(z/96);if(!groups.has(key))groups.set(key,{variant,mats:[],colors:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});const b=groups.get(key),tint=blend(rgb('#91a779'),rgb('#668b66'),R()*.48);b.mats.push(...G.instanceMatrix(x,y,z,scale,scale*(.92+R()*.17),scale,angle));b.colors.push(...tint.map(v=>Math.min(1.3,v*1.27))); // templates multiply a moderated linear colour, not sRGB
 const H=templates[variant].near.height*scale*1.12;for(let k=0;k<3;k++){b.min[k]=Math.min(b.min[k],[x-4*scale,y,z-4*scale][k]);b.max[k]=Math.max(b.max[k],[x+4*scale,y+H,z+4*scale][k]);}
 plantRecords.push({x,y,z,scale,variant});return true;}
 let clusters=0;for(let z=764;z<=1690;z+=13)for(let x=-38;x<1040;x+=13){const X=x+(R()-.5)*11,Z=z+(R()-.5)*11;if(!inForest(X,Z)||R()>.81)continue;clusters++;const num=2+Math.floor(R()*3);for(let j=0;j<num;j++){const a=R()*PI*2,r=Math.sqrt(R())*2.6;addBamboo(X+Math.cos(a)*r,Z+Math.sin(a)*r,.70+R()*.57,j+clusters);}}
 // Denser foreground rows follow paths organically, keeping the walkable corridor clear.
 for(const path of paths)for(let i=2;i<path.samples.length-2;i+=2){const p=path.samples[i],a=path.samples[i-1],b=path.samples[i+1],d=G.norm([b[0]-a[0],0,b[1]-a[1]]),n=[-d[2],d[0]];for(const s of[-1,1])for(let j=0;j<3;j++){const offset=path.width/2+1.8+j*2.1+R()*1.4,x=p[0]+s*n[0]*offset+(R()-.5)*1.2,z=p[1]+s*n[1]*offset+(R()-.5)*1.2;addBamboo(x,z,.73+R()*.48,i+j);}}
 function addProp(type,x,z,scale=1,yaw=0,y=null){if(type!=='rabbit'&&Math.abs(x-690)<3.25&&z>1488&&z<1509)return;const key=type+':'+Math.floor(x/96)+':'+Math.floor(z/96);if(!propGroups.has(key))propGroups.set(key,{type,mats:[],center:[x,t.height(x,z),z]});propGroups.get(key).mats.push(...G.instanceMatrix(x,y===null?t.height(x,z)+.03:y,z,scale,scale,scale,yaw));}
 for(const path of paths)for(let i=0;i<path.samples.length-1;i+=3){const p=path.samples[i],a=path.samples[Math.max(0,i-1)],b=path.samples[Math.min(path.samples.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1;for(const s of[-1,1]){const off=path.width*.5+.65+R()*2.0,x=p[0]-dz/L*s*off,z=p[1]+dx/L*s*off;if(creekDistance(x,z)<4)continue;addProp('fern',x,z,.6+R()*.85,R()*6.28);if(i%9===0)addProp('shoot',x+R(),z+R(),.8+R()*.7);addProp('litter',x,z,1.1+R()*1.6,R()*6.28);}}

 for(let z=802;z<1660;z+=6.2)for(let x=105;x<981;x+=6.2){const X=x+(R()-.5)*5,Z=z+(R()-.5)*5,n=nearest(X,Z);if(!inForest(X,Z)||n.d<n.width/2+.18||creekDistance(X,Z)<3.8||fp.some(p=>Math.abs(X-p.x)<p.rx&&Math.abs(Z-p.z)<p.rz))continue;
   if(n.d<11||G.noise(X/27,Z/27)>.61){if(R()<.49)addProp('fern',X,Z,.6+R()*1.1,R()*6.28);if(R()<.21)addProp('rock',X+.6,Z,.65+R()*.9,R()*6.28);if(R()<.56)addProp('litter',X,Z,1.2+R()*1.9,R()*6.28);}}
 // Sparse fallen culms lie off the path. Their open cut ends and alternating nodes are modeled.
 for(const [x,z,a]of [[393,1002,.6],[471,1230,-.6],[599,1379,.4]]){const y=t.height(x,z),g=geom(x,z);for(let k=0;k<5;k++){const p=[x+Math.cos(a)*k*1.05,y+.16+k*.055,z+Math.sin(a)*k*1.05],q=[x+Math.cos(a)*(k+1)*1.05,y+.16+(k+1)*.055,z+Math.sin(a)*(k+1)*1.05];g.tube(p,q,.11,rgb('#828967'),6,.105);g.ellipsoid(p[0],p[1],p[2],.13,.13,.13,C.rim,5,2);}}
 const bridgeRecords=[];
 for(const path of paths){for(let i=0;i<path.samples.length-1;i++){const a=path.samples[i],b=path.samples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1,nx=-dz/L,nz=dx/L;let w=path.width*(.94+.13*Math.sin(i*.19));
  const middle=[(a[0]+b[0])/2,(a[1]+b[1])/2],onBridge=path.id==='bamboo-main'&&middle[0]>490&&middle[0]<590&&Math.abs(middle[1]-creek.center(middle[0]))<10;
  if(onBridge){const yaw=Math.atan2(dx,dz),y0=forestHeight(t,...a)+.52,y1=forestHeight(t,...b)+.52,g=geom(...middle,'timber');const boards=Math.max(1,Math.ceil(L/.28));for(let k=0;k<boards;k++){const u=(k+.5)/boards,x=mix(a[0],b[0],u),z=mix(a[1],b[1],u),y=mix(y0,y1,u);g.place(x,y,z,yaw);g.box(0,-.24,0,3.4,.24,L/boards-.023,blend(C.wood,C.dark,(i%5)*.03));}g.place();
    for(const s of[-1,1]){const X=middle[0]+nx*s*1.72,Z=middle[1]+nz*s*1.72,Y=(y0+y1)/2;g.cone(X,t.height(X,Z)-.3,Z,.105,.095,Y-t.height(X,Z)+1.4,C.dark,6);g.tube([a[0]+nx*s*1.72,y0+1,a[1]+nz*s*1.72],[b[0]+nx*s*1.72,y1+1,b[1]+nz*s*1.72],.06,C.wood,6);g.tube([a[0]+nx*s*1.72,y0+.53,a[1]+nz*s*1.72],[b[0]+nx*s*1.72,y1+.53,b[1]+nz*s*1.72],.045,C.wood,5);}
    bridgeRecords.push({a:[a[0],y0,a[1]],b:[b[0],y1,b[1]],width:3.4});continue;}
  const g=geom(...middle,'bambooGround'),p=(v,side,wide=1)=>[v[0]+nx*side*w*.5*wide,t.height(v[0]+nx*side*w*.5*wide,v[1]+nz*side*w*.5*wide)+.075,v[1]+nz*side*w*.5*wide];
  g.quad(p(a,1,1.14),p(b,1,1.14),p(b,-1,1.14),p(a,-1,1.14),C.edge);const q=(v,s)=>{const p0=p(v,s);p0[1]+=.025;return p0;};g.quad(q(a,1),q(b,1),q(b,-1),q(a,-1),C.path);
 }}
 // Stream is a local drainage feature, not a newly claimed canon river.
 const water=new G.Geometry();for(let x=creek.x0+9;x<creek.x1-9;x+=2){let X=Math.min(creek.x1-9,x+2),p=(xx,s)=>[xx,forestHeight(t,xx,creek.center(xx))-1.18,creek.center(xx)+s*creek.halfWidth*.8];water.quad(p(x,-1),p(X,-1),p(X,1),p(x,1),rgb('#698c85'));for(const s of[-1,1]){if(R()<.27)continue;const z=creek.center(x)+s*(2.7+R()*1.7),h=t.height(x,z);geom(x,z).ellipsoid(x,h-.2,z,.8+R(),.48+R()*.5,.62+R()*.4,blend(C.stone,C.moss,R()*.45),7,3);}}
 pushGeom(water,'bamboo-stream','water',{material:'water'});
 // Sparse, understated clues rather than a labelled forest theme park.
 for(const pos of[[410,950],[486,1199],[579,1380]]){const[x,z]=pos,y=t.height(x,z),g=geom(x,z);g.ellipsoid(x,y-.25,z,1.6,.95,1.05,C.stone,7,3);for(let i=0;i<5;i++)g.ellipsoid(x+(R()-.5)*1.8,y+.25+R()*.3,z+(R()-.5),.35,.10,.25,C.moss,5,2);}
 for(const pos of[[363,1151],[713,1345]]){const [x,z]=pos,y=t.height(x,z),g=geom(x,z);g.box(x,y-.15,z,9,.23,7.5,C.earth);for(const s of[-1,1]){g.box(x+s*2.2,y,z,.22,2.45,.22,C.dark);g.box(x+s*2.2,y,z-2.3,.22,2.45,.22,C.dark);}G.roof(g,x,y+2.45,z-1.0,6.5,4.7,1.25,C.roof);g.box(x,y+.55,z-1.5,4.5,.16,.7,C.wood);g.box(x,y,z-1.5,3.7,.6,.3,C.dark);features.push({id:x<400?'rest-shelter':'rabbit-clearing',position:[x,y,z],basis:'P',note:'普通采笋歇脚点，不是妹红的已确认住宅。'});}
 // Bamboo cutting work area: open cut ends, bindings and baskets, not random clutter.
 {const x=354,z=1154,y=t.height(x,z),g=geom(x,z,'matte');for(let i=0;i<9;i++){const a=[x+(i%3)*.24,y+.14+Math.floor(i/3)*.21,z],b=[a[0]+.35,a[1],z+3.8];g.tube(a,b,.105,rgb('#a4ab7a'),7);g.ellipsoid(b[0],b[1],b[2]+.01,.066,.066,.015,C.dark,6,2);}g.box(x+1,y,z+1.1,2,.08,.16,C.dark);g.box(x+1,y,z+2.8,2,.08,.16,C.dark);addProp('shoot',359,1155,1.6);}
 for(let i=0;i<7;i++)addProp('rabbit',712+(R()-.5)*9,1347+(R()-.5)*7,.8+R()*.35,R()*6.28);
 // Eientei exterior: low horizontal wings, restrained enclosure, actual raised engawa.
 // The numbers/plan are a project proposal; no claim of reconstructed interiors.
 function wall(x,z,w,d,h=2.8){const g=geom(x,z);g.box(x,69.75,z,w,.55,d,C.stone);g.box(x,70.30,z,w,h,d,C.plaster);g.box(x,70.24+h,z,w+.32,.17,d+.25,C.dark);if(w>d)G.roof(g,x,70.40+h,z,w+.6,d+.7,.38,C.roof);else{g.place(x,0,z,PI/2);G.roof(g,0,70.40+h,0,d+.6,w+.7,.38,C.roof);g.place();}}
 wall(648.5,1492,59,1.0);wall(731.5,1492,59,1.0);wall(626,1439,1.0,106);wall(754,1439,1.0,106);wall(690,1386,128,1.0);
 const architecture=[];
 function pavilion(id,x,z,w,d,h,yaw=0,frontPorch=true){const g=geom(x,z,'matte'),det=geom(x,z,'roof','near'),wood=geom(x,z,'timber');g.place(x,70,z,yaw);det.place(x,70,z,yaw);wood.place(x,70,z,yaw);
  g.box(0,-.4,0,w+.8,.9,d+.8,C.stone);g.box(0,.5,0,w+1.4,.25,d+2.8,C.dark);g.box(0,.75,0,w,h,d,C.plaster);
  // Thin shadowed wall frames and paper screens are physical depth, not a painted window texture.
  for(let xx=-w/2+1.4;xx<w/2;xx+=2.8){G.windowPanel(g,xx,1.15,d/2+.09,2.25,h-1.15,0,C.paper);G.windowPanel(g,xx,1.15,-d/2-.09,2.25,h-1.15,PI,C.paper);wood.box(xx,.75,d/2+.15,.16,h,.22,C.dark);}
  for(const s of[-1,1])for(let zz=-d/2+1.5;zz<d/2;zz+=3)G.windowPanel(g,s*(w/2+.07),1.25,zz,2.25,h-1.3,s*PI/2,C.paper);
  G.roof(g,0,h+.80,0,w+3.8,d+4.0,h*.50,C.roof,det,true);
  if(frontPorch){wood.box(0,.74,d/2+1.85,w+1,.16,3.6,C.wood);for(let xx=-w/2;xx<=w/2;xx+=3){wood.box(xx,-.1,d/2+3,.18,h+1,.18,C.dark);wood.box(xx,.85,d/2+1.8,2.96,.016,.035,C.dark);}G.roof(g,0,h*.72,d/2+1.45,w+2,4.5,1.0,C.roof,det);for(let i=0;i<4;i++)g.box(0,.18*i,d/2+5-i*.5,4.4,.20,.65,C.stone);}
  g.place();det.place();wood.place();architecture.push({id,x,z,w,d,h,y:70,yaw,basis:'P'});
 }
 pavilion('eientei-main',690,1407,76,19,4.6);pavilion('eientei-west',644,1438,48,12,3.8,PI/2);pavilion('eientei-east',736,1438,48,12,3.8,-PI/2);
 {const x=690,z=1492,g=geom(x,z),det=geom(x,z,'roof','near');for(const s of[-1,1]){g.box(x+s*4.8,69.8,z,1.0,.55,1.0,C.stone);g.box(x+s*4.8,70.3,z,.52,4.5,.52,C.dark);g.box(x+s*6.7,70.3,z,3.3,3.5,.26,C.wood);for(let yy=70.5;yy<73.7;yy+=.30)g.box(x+s*6.7,yy,z+.16,3.1,.12,.08,C.dark);}g.box(x,74.1,z,14,.60,.55,C.dark);G.roof(g,x,74.7,z,17.5,7.0,2.2,C.roof,det);for(const s of[-1,1])G.lantern(g,x+s*5.4,73,z+.85,.8);architecture.push({id:'eientei-gate',x,z,w:17.5,d:7,h:7,y:70,basis:'P'});}
 // Covered return corridors and courtyard walks preserve the horizontal estate silhouette.
 for(const side of[-1,1]){const x=690+side*48,z=1475,g=geom(x,z,'timber'),det=geom(x,z,'roof','near');g.box(x,70.6,z,36,.3,4,C.wood);for(let xx=x-17;xx<=x+17;xx+=3.4)for(const s of[-1,1])g.box(xx,70.85,z+s*1.65,.16,3.2,.16,C.dark);G.roof(g,x,74.08,z,39,6,1.4,C.roof,det);}
 {const g=geom(690,1457,'bambooGround');g.box(690,69.99,1454,111,.07,67,C.earth);g.box(690,70.08,1460,4.8,.13,64,C.lightStone);g.box(690,70.08,1430,92,.13,3.6,C.lightStone);for(const side of[-1,1]){g.box(690+side*25,70.08,1467,37,.12,2,C.lightStone);for(let i=0;i<5;i++)geom(690+side*22,1449).ellipsoid(690+side*22+(R()-.5)*10,70.25,1449+(R()-.5)*11,.9+R()*1.5,.45+R(),.8+R()*1.3,blend(C.stone,C.moss,R()*.2),7,4);}}
 // Small garden planting, low enough not to replace the bamboo silhouette with spheres.
 const props=new G.PropInstances();for(const s of[-1,1])for(let i=0;i<14;i++)props.add('shrub',690+s*(15+R()*27),70.12,1440+R()*27,.9+R()*.35,0,[.8,.9,.7],'eientei-garden');for(const pos of[[702,1420],[714,1420]])props.add('barrel',pos[0],70.86,pos[1],.82);for(const m of props.meshes())meshList.push({...m,id:'bamboo-'+m.id,region:'bamboo',evidence:'P'});

 {const g=geom(670,1448),gravel=geom(670,1448,'bambooGround');for(const side of[-1,1]){
   const x=690+side*26,z=1446;for(let i=0;i<13;i++){const a=i/13*PI*2,X=x+Math.cos(a)*11.0,Z=z+Math.sin(a)*9.0;g.ellipsoid(X,70.2,Z,1.3,.21,.65,C.stone,7,3);}gravel.ellipsoid(x,70.11,z,11.0,.09,9.0,rgb('#a9ab95'),24,3);
   for(let i=0;i<9;i++){const X=x+(R()-.5)*15,Z=z+(R()-.5)*13;addProp('fern',X,Z,.70+R()*.5,R()*6.28,70.3);if(i%2===0)addProp('rock',X+1,Z,1+R(),R()*6.28,70.22);}}
 }
 // Make the entrance leg and threshold on the same level, not a floating slab.
 {const g=geom(690,1500,'templePaving');for(let z=1493;z<1507;z+=1){const y=t.height(690,z);g.box(690,y+.05,z,5.4,.14,1.04,C.lightStone);}}
 for(const [key,b] of groups){const def=templates[b.variant],center=b.min.map((v,i)=>(v+b.max[i])/2),radius=G.length(G.sub(b.max,b.min))/2;const instances=new Float32Array(b.mats),colors=new Float32Array(b.colors);for(const part of['stem','leaf'])meshList.push({id:'bamboo:'+part+':'+key,group:'vegetation',material:part==='stem'?'bambooStem':'bambooLeaf',local:true,lodDistance:150,vertices:def.near[part],farVertices:def.far[part],instances,instanceColors:colors,center,radius,region:'bamboo',evidence:'P'});}
 let propCount=0;for(const[key,b]of propGroups){const count=b.mats.length/16;propCount+=count;meshList.push({id:'bamboo:understory:'+key,group:'vegetation',material:b.type==='fern'?'bambooLeaf':'matte',lod:'props',vertices:understoryTemplate(b.type),instances:new Float32Array(b.mats),instanceColors:new Float32Array(count*3).fill(1),center:b.center,radius:143,region:'bamboo',evidence:'P'});}
 const batched=bank.meshes().map(m=>({...m,id:'bamboo:'+m.id,group:m.material==='bambooGround'?'roads':'architecture',region:'bamboo',evidence:'P'}));
 return{meshes:[...batched,...meshList],signs,meta:{basis:'P',refined:true,iteration:1,paths:paths.map(p=>({id:p.id,width:p.width,kind:p.kind,points:p.points,samples:p.samples})),bambooCulms:plantRecords.length,backgroundClusters:clusters,plantRecords,understoryInstances:propCount,bridgeSegments:bridgeRecords,features,architecture,creek:{x0:creek.x0,x1:creek.x1,width:4,basis:'P'},notes:'竹林细化与永远亭外部首轮；普通歇脚棚不是妹红住宅；未实现NPC、动态迷宫、无限回廊或室内。'}};
}
G.IMPLEMENTED.bamboo='bamboo';G.IMPLEMENTED.eientei='eientei';
Object.assign(G,{BAMBOO:{paths,nodes:NODES,inForest,weight,nearest,clearing,creekDistance,forestHeight,originalHeight},buildBamboo});
})(globalThis.GA);

/* v0.11 — Garden of the Sun & Nameless Hill.
 * PMiSS pp.143–144 are the spatial constraints; all geometry/coordinates are P.
 * Separate plant prototypes, topographies and atmosphere. No image scenery.
 * This module extends the verified v0.9 source; unavailable v0.10 is not claimed.
 */
(function (G) {
'use strict';
const {rgb,blend,mix,smooth:sm}=G, PI=Math.PI, TAU=PI*2;
const C={grass:rgb('#657d48'),sunlit:rgb('#8a9454'),earth:rgb('#b2a17d'),edge:rgb('#8d8765'),
 stone:rgb('#899183'),moss:rgb('#566d4d'),wood:rgb('#79614a'),dark:rgb('#453c31'),
 lily:rgb('#e9ebd7'),leaf:rgb('#44674d'),shade:rgb('#6d8275'),paper:rgb('#e9dfc7')};
const areas={
 sunflower:{x:-580,z:1190,rx:337,rz:232},
 nameless:{x:-1330,z:1050,rx:243,rz:178}
};
const radius=(id,x,z)=>{const a=areas[id];return Math.hypot((x-a.x)/a.rx,(z-a.z)/a.rz);};
const influence=(id,x,z)=>1-sm(.89,1.27,radius(id,x,z));
const fieldBoundary=(id,x,z)=>{const a=areas[id],ang=Math.atan2((z-a.z)/a.rz,(x-a.x)/a.rx);return radius(id,x,z)/(1+.035*Math.sin(ang*5)+.022*Math.cos(ang*9))<1;};
const paths=[
 {id:'sun-main',region:'sunflower',kind:'main',width:3.6,points:[[-390,920],[-434,972],[-511,1037],[-581,1114],[-653,1205],[-606,1291],[-525,1359],[-477,1420]]},
 {id:'sun-rim',region:'sunflower',kind:'loop',width:2.7,points:[[-511,1037],[-633,998],[-748,1023],[-837,1122],[-816,1210],[-746,1296],[-606,1291]]},
 {id:'sun-east',region:'sunflower',kind:'loop',width:2.5,points:[[-581,1114],[-483,1100],[-405,1149],[-357,1225],[-389,1294],[-496,1319],[-606,1291]]},
 {id:'sun-stage-path',region:'sunflower',kind:'spur',width:3.2,points:[[-389,1294],[-369,1279],[-365,1259]]},
 {id:'flower-hill-link',region:'nameless',kind:'connection',width:2.5,points:[[-816,1210],[-937,1226],[-1039,1194],[-1125,1165],[-1169,1137]]},
 {id:'lily-main',region:'nameless',kind:'main',width:1.7,points:[[-1169,1137],[-1217,1130],[-1279,1102],[-1341,1054],[-1381,1010],[-1411,941]]},
 {id:'lily-contour',region:'nameless',kind:'loop',width:1.3,points:[[-1279,1102],[-1304,1155],[-1400,1142],[-1471,1084],[-1439,1001],[-1381,1010]]},
 {id:'lily-shelter',region:'nameless',kind:'spur',width:1.25,points:[[-1341,1054],[-1284,1026],[-1249,987]]}
].map(p=>({...p,basis:'P',samples:G.spline(p.points,2.5)}));
const bins=new Map(),CELL=24;
for(const p of paths)for(let i=0;i<p.samples.length-1;i++){
 const a=p.samples[i],b=p.samples[i+1];
 for(let x=Math.floor((Math.min(a[0],b[0])-15)/CELL);x<=Math.floor((Math.max(a[0],b[0])+15)/CELL);x++)
 for(let z=Math.floor((Math.min(a[1],b[1])-15)/CELL);z<=Math.floor((Math.max(a[1],b[1])+15)/CELL);z++){
  const k=x+':'+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push({a,b,width:p.width,id:p.id});
 }
}
function nearest(x,z){let best={d:Infinity,width:0,id:null};
 for(const e of bins.get(Math.floor(x/CELL)+':'+Math.floor(z/CELL))||[]){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],t=G.clamp(((x-e.a[0])*dx+(z-e.a[1])*dz)/(dx*dx+dz*dz||1),0,1),d=Math.hypot(x-e.a[0]-dx*t,z-e.a[1]-dz*t);if(d<best.d)best={d,width:e.width,id:e.id};}return best;}
const clearings=[
 {id:'seasonal-stage',region:'sunflower',x:-365,z:1251,w:35,d:37},
 {id:'sun-ridge-rest',region:'sunflower',x:-748,z:1024,w:15,d:13},
 {id:'sun-parasol',region:'sunflower',x:-590,z:1126,w:8,d:8},
 {id:'lily-stone-clearing',region:'nameless',x:-1251,z:987,w:9,d:10}
];
const rectW=(x,z,p)=>1-sm(0,8,Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2));
function sunShape(x,z){
 const X=x+580,Z=z-1190;
 // A south-tilted bowl, with a lower southern opening rather than a conical hill.
 let h=83+.00049*X*X+.00085*Z*Z-.024*Z;
 h-=17*sm(65,235,Z)*Math.exp(-((X/142)**2));
 h+=3.3*Math.sin(x/106+z/71)+1.9*Math.sin(x/41-z/96);
 return h;
}
function lilyShape(x,z){
 const X=x+1330,Z=z-1050;
 return 197-X*.18-Z*.055+7.0*Math.sin(X/67)+4.6*Math.sin(Z/51+X/135)
 +16*Math.exp(-(((x+1490)/87)**2+((z-969)/121)**2));
}
function shapedHeight(x,z,id){let h=id==='sunflower'?sunShape(x,z):lilyShape(x,z);for(const c of clearings)if(c.region===id)h=mix(h,id==='sunflower'?sunShape(c.x,c.z):lilyShape(c.x,c.z),rectW(x,z,c));return h;}
const oldHeight=G.Terrain.prototype.height,oldColor=G.Terrain.prototype.color;
G.Terrain.prototype.height=function(x,z){let h=oldHeight.call(this,x,z);for(const id of ['sunflower','nameless']){const w=influence(id,x,z);if(w>0)h=mix(h,shapedHeight(x,z,id),w);}return h;};
G.Terrain.prototype.color=function(x,z,h,n){let c=oldColor.call(this,x,z,h,n);const s=influence('sunflower',x,z),l=influence('nameless',x,z);
 if(s){let q=blend(C.grass,C.sunlit,G.noise(x/62,z/74)*.67);const p=nearest(x,z);if(p.d<p.width/2+2.3)q=blend(q,C.edge,(1-sm(p.width/2,p.width/2+2.3,p.d))*.7);c=blend(c,q,s);}
 if(l){let q=blend(rgb('#58755d'),rgb('#839482'),G.noise(x/43,z/57)*.65);q=blend(q,rgb('#78887b'),sm(.12,.35,1-(n||this.normal(x,z))[1])*.6);c=blend(c,q,l);}return c;};
const arrival=G.routes.find(r=>r.id==='route-flower'),oldArrival={...arrival,points:arrival.points.map(p=>p.slice()),samples:arrival.samples.map(p=>p.slice())};arrival.points=[[-60,230],[-80,430],[-330,630],[-390,920]];arrival.samples=G.spline(arrival.points,5);arrival.note='P：村外道路止于新花田入口；内部与丘陵连接另见flowerlands路径。';
// Keep old deterministic sampling outside the two regions; remove only trees in new flower clearings.
const oldPlants=G.buildVegetation;
G.buildVegetation=function(t,v,f){const original=Object.create(t);original.height=(x,z)=>oldHeight.call(t,x,z);original.routes=G.routes.map(p=>p.id==='route-flower'?oldArrival:p);const r=oldPlants(original,v,f),out=[];let removed=0;
 for(const m of r.meshes){if(!m.instances){out.push(m);continue;}const ma=[],co=[];let changed=false;
 for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14];if(influence('sunflower',x,z)>.06||influence('nameless',x,z)>.06){removed++;changed=true;}else{ma.push(...m.instances.subarray(i,i+16));co.push(...m.instanceColors.subarray(i/16*3,i/16*3+3));}}
 if(!changed)out.push(m);else if(ma.length)out.push({...m,instances:new Float32Array(ma),instanceColors:new Float32Array(co)});}
 return {meshes:out,count:r.count-removed};};

// A curved leaf with a real midrib and a tapered outline. It is not a flat image plane.
function leaf(g,base,angle,L,W,rise,col,segments=5){
 const d=[Math.cos(angle),0,Math.sin(angle)],side=[-d[2],0,d[0]],at=t=>[base[0]+d[0]*L*t,base[1]+rise*Math.sin(t*PI*.76)-.12*L*t*t,base[2]+d[2]*L*t];
 for(let j=0;j<segments;j++){let t=j/segments,u=(j+1)/segments,a=at(t),b=at(u),w=W*Math.sin(t*PI)**.8,v=W*Math.sin(u*PI)**.8;
  g.quad(G.add(a,G.mul(side,-w)),a,b,G.add(b,G.mul(side,-v)),blend(col,[.12,.24,.075],.16));
  g.quad(a,G.add(a,G.mul(side,w)),G.add(b,G.mul(side,v)),b,col);
 }
}
function sunflower(v,far=false){
 const g=new G.Geometry(),R=G.rng(730+v*37),H=1.98+v*.18,lean=.09*(v-1),stem=rgb('#5d8038'),petal=rgb(['#efbc38','#e9ae27','#f3c345'][v]);
 const at=y=>[lean*(y/H)**2,y,.04*Math.sin(y/H*2)];
 for(let j=0;j<(far?1:4);j++){let a=j/(far?1:4)*H,b=(j+1)/(far?1:4)*H;g.tube(at(a),at(b),.027*(1-j*.08),stem,far?3:6,.022);}
 for(let j=0;j<(far?2:6);j++){const y=.36+j*(far?.6:.24),p=at(y),ang=j*2.4+v*.33;leaf(g,p,ang,far?.73:.62+R()*.19,far?.23:.21+R()*.045,.18,blend(stem,rgb('#3c622f'),j*.06),far?1:4);}
 const ctr=[lean,H,.04],tilt=.13+v*.075,up=[0,Math.cos(tilt),-Math.sin(tilt)],normal=[0,Math.sin(tilt),Math.cos(tilt)];
 const P=(r,a,depth=0)=>G.add(ctr,[r*Math.cos(a),up[1]*r*Math.sin(a)+normal[1]*depth,up[2]*r*Math.sin(a)+normal[2]*depth]);
 for(let j=0;j<10;j++){const a=j/10*TAU,b=(j+1)/10*TAU;g.tri(P(0,0,-.040),P(.211,b,-.026),P(.211,a,-.026),rgb('#4f7338'));}
 // Pointed, slightly cupped ray florets, two offset rings at near distance.
 if(far){
  // One ten-lobed silhouette plus a small dark disk, not the close petal mesh.
  for(let j=0;j<10;j++){const a=j/10*TAU,b=(j+1)/10*TAU,mid=(a+b)/2;
   g.tri(P(.14,a,.026),P(.46,mid,0),P(.14,b,.026),petal);
   g.tri(P(0,0,.06),P(.202,a,.06),P(.202,b,.06),rgb('#654827'));
  }return g.mesh('sunflower-far-'+v).vertices;
 }
 const rows=2,N=18;
 for(let row=0;row<rows;row++)for(let j=0;j<N;j++){
  const a=j/N*TAU+row*.17,inner=.18,outer=.46+(v-1)*.02-row*.042,spread=far?.22:.125;
  const root=P(inner,a,-row*.016),mid=P(outer*.77,a,.025-row*.016),tip=P(outer,a,-.025-row*.015);
  const left=P(outer*.70,a-spread,.005-row*.016),right=P(outer*.70,a+spread,.005-row*.016);
  const col=blend(petal,rgb('#d78e20'),row*.10+(j%4)*.012);
  g.tri(root,left,mid,col);g.tri(root,mid,right,col);g.tri(mid,left,tip,col);g.tri(mid,tip,right,col);
 }
 const NN=far?10:20,rings=far?1:3;
 for(let r=0;r<rings;r++)for(let j=0;j<NN;j++){
  const a=j/NN*TAU,b=(j+1)/NN*TAU,ra=.208*r/rings,rb=.208*(r+1)/rings;
  const depth=rr=>.037+.073*Math.sqrt(Math.max(0,1-(rr/.21)**2));
  g.quad(P(ra,a,depth(ra)),P(rb,a,depth(rb)),P(rb,b,depth(rb)),P(ra,b,depth(ra)),blend(rgb('#694927'),rgb('#423526'),r/rings));
 }
 if(!far)for(let j=0;j<38;j++){
  let rr=.185*Math.sqrt((j+.6)/38),a=j*2.399963,p=P(rr,a,.051+.074*Math.sqrt(1-(rr/.21)**2));
  const left=G.add(p,[-.014,0,0]),right=G.add(p,[.014,0,0]);g.tri(left,G.add(p,G.mul(up,.024)),right,rgb('#9b733e'));g.tri(left,right,G.add(p,G.mul(up,-.018)),rgb('#73532d'));
 }
 return g.mesh('sunflower-template-'+v).vertices;
}
function bell(g,center,size,far=false){
 // Closed round crown, narrowed throat, flared six-lobed mouth; blooms hang downward.
 const slices=far?5:10,rings=far?2:5,at=(i,j)=>{const t=i/rings,a=j/slices*TAU,r=size*(.30+.64*Math.sin(Math.min(1,t*1.06)*PI*.68)+.22*t*t*t),y=center[1]-size*t*1.6;return[center[0]+r*Math.cos(a),y-(i===rings?.09*size*Math.cos(a*6):0),center[2]+r*Math.sin(a)];};
 for(let i=0;i<rings;i++)for(let j=0;j<slices;j++)g.quad(at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1),i===rings-1?C.lily:rgb('#dbe4d4'));
 if(!far)for(let j=0;j<slices;j++)g.tri([center[0],center[1]-size*1.35,center[2]],at(rings,j+1),at(rings,j),rgb('#98afa0'));
}
function lily(v,far=false){
 const g=new G.Geometry(),stemCol=rgb('#688862'),h=.50+v*.055;
 leaf(g,[0,.025,0],-.5+v*.5,.65,.16,.34,C.leaf,far?1:6);
 leaf(g,[.018,.03,.01],2.4+v*.2,.60,.16,.38,blend(C.leaf,rgb('#6e9365'),.25),far?1:6);
 const at=t=>[.16*t*t,h*t-.044*t*t*t,.052*t];
 if(far){g.tube(at(0),at(1),.009,stemCol,3,.005);}else for(let j=0;j<5;j++)g.tube(at(j/5),at((j+1)/5),.009-j*.0008,stemCol,5,.005);
 const count=far?3:6;
 for(let j=0;j<count;j++){
  const t=.31+j/(count-1)*.69,p=at(t),end=[p[0]+.13*(1-t*.25),p[1]+.007,p[2]+.025];
  if(!far){g.tube(p,G.add(end,[-.015,.017,0]),.0035,stemCol,4,.002);g.tube(G.add(end,[-.015,.017,0]),end,.002,stemCol,4,.002);bell(g,end,.031*(1-.14*t),false);}
  else{const z=end[2],x=end[0],y=end[1];for(let i=0;i<4;i++){const a=i/4*TAU,b=(i+1)/4*TAU;g.tri([x,y,z],[x+Math.cos(a)*.035,y-.057,z+Math.sin(a)*.035],[x+Math.cos(b)*.035,y-.057,z+Math.sin(b)*.035],C.lily);}}
 }
 return g.mesh('lily-template-'+v).vertices;
}
function grassTemplate(far=false){const g=new G.Geometry(),R=G.rng(19);for(let j=0;j<(far?4:10);j++){let a=j*2.4,p=[(R()-.5)*.45,.02,(R()-.5)*.45];leaf(g,p,a,.34+R()*.42,.018,.23+R()*.20,blend(C.grass,rgb('#9b9b69'),R()*.25),far?1:2);}return g.mesh('flower-grass').vertices;}
function perimeterTree(far=false){
 const g=new G.Geometry(),wood=rgb('#766651'),R=G.rng(36);g.tube([0,-.3,0],[.1,3.9,-.1],.32,wood,far?5:7,.12);
 for(let j=0;j<(far?5:9);j++){let a=j*2.4,r=1.4+R()*.75,p=[Math.cos(a)*r,4.0+R()*2.1,Math.sin(a)*r];g.tube([0,2.2,0],p,.10,wood,far?4:6,.025);g.ellipsoid(...p,1.45,.9,1.30,blend(rgb('#5e7954'),rgb('#8b9c63'),R()*.43),far?5:7,far?2:3);}
 return g.mesh('meadow-tree').vertices;
}
function buildFlowerlands(t){
 const bank=new G.BatchBank(),stageBank=new G.BatchBank(),meshList=[],R=G.rng(110927),groups=new Map(),plantRecords=[],rocks=[],features=[];
 const geom=(x,z,material='matte',lod='base')=>bank.get(x,z,material,lod);
 const defs={sunflower:[0,1,2].map(v=>({near:sunflower(v),far:sunflower(v,true)})),lily:[0,1].map(v=>({near:lily(v),far:lily(v,true)})),grass:[{near:grassTemplate(),far:grassTemplate(true)}],tree:[{near:perimeterTree(),far:perimeterTree(true)}]};
 function blocked(x,z,margin=0){const p=nearest(x,z);return p.d<p.width/2+margin||clearings.some(c=>Math.abs(x-c.x)<c.w/2+margin&&Math.abs(z-c.z)<c.d/2+margin);}
 function add(type,x,z,scale,angle,v=0,region='sunflower'){
  const cell=type==='lily'?32:type==='sunflower'?48:80,key=region+':'+type+':'+v+':'+Math.floor(x/cell)+':'+Math.floor(z/cell);
  if(!groups.has(key))groups.set(key,{type,v,region,m:[],c:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
  const g=groups.get(key),y=t.height(x,z)-.015,sy=scale*(.91+R()*.15);g.m.push(...G.instanceMatrix(x,y,z,scale,sy,scale,angle));
  const tint=type==='sunflower'?[1,.965+R()*.07,.93+R()*.07]:[.92+R()*.08,.96+R()*.06,.93+R()*.06];g.c.push(...tint);
  const h=(type==='sunflower'?2.8:type==='lily'?.72:type==='tree'?7:.8)*sy,rad=(type==='tree'?4:type==='sunflower'?.85:.70)*scale;
  for(let k=0;k<3;k++){g.min[k]=Math.min(g.min[k],[x-rad,y-.10,z-rad][k]);g.max[k]=Math.max(g.max[k],[x+rad,y+h,z+rad][k]);}
  if(type==='sunflower'||type==='lily')plantRecords.push({type,x,y,z,scale,region});
 }
 // Jittered stratification plus coherent gaps gives a field, not aligned farming rows.
 for(let z=947;z<=1425;z+=1.28)for(let x=-929;x<=-227;x+=1.28){
  const X=x+(R()-.5)*1.13,Z=z+(R()-.5)*1.13;
  if(!fieldBoundary('sunflower',X,Z)||blocked(X,Z,1.06))continue;
  const n=G.noise(X/30,Z/32);if(R()>(.77+.2*n))continue;
  const s=.83+R()*.34+(.1*G.noise(X/80,Z/90));add('sunflower',X,Z,s,.14+(R()-.5)*.75,(Math.floor(R()*3)), 'sunflower');
 }
 // Bell flowers occupy a cooler contour meadow, with narrow paths and irregular bare pockets.
 for(let z=867;z<=1235;z+=1.33)for(let x=-1590;x<=-1070;x+=1.33){
  const X=x+(R()-.5)*1.13,Z=z+(R()-.5)*1.13;
  if(!fieldBoundary('nameless',X,Z)||blocked(X,Z,.47))continue;
  if(R()>.72+.23*G.noise(X/22,Z/18))continue;
  const s=.92+R()*.47;add('lily',X,Z,s,R()*TAU,R()<.5?0:1,'nameless');
 }
 // Curated close planting along the path; stems never root in the walking strip.
 for(const p of paths){if(p.kind==='connection')continue;for(let j=1;j<p.samples.length-1;j+=2){const a=p.samples[j-1],b=p.samples[j+1],q=p.samples[j],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1;
  for(const side of[-1,1]){const off=p.width/2+.55+R()*.6,X=q[0]-dz/L*off*side,Z=q[1]+dx/L*off*side;if(clearings.some(c=>Math.abs(X-c.x)<c.w/2&&Math.abs(Z-c.z)<c.d/2))continue;
   if(p.region==='nameless'&&fieldBoundary('nameless',X,Z))for(let k=0;k<2;k++){let xx=X+(R()-.5)*.34,zz=Z+(R()-.5)*.34;if(!blocked(xx,zz,.13))add('lily',xx,zz,1.0+R()*.35,R()*TAU,k,'nameless');}
   if(R()<.85)add('grass',X,Z,.7+R()*.65,R()*TAU,0,p.region);
  }
 }}
 for(const id of ['sunflower','nameless']){
  const a=areas[id];for(let z=a.z-a.rz;z<a.z+a.rz;z+=5.2)for(let x=a.x-a.rx;x<a.x+a.rx;x+=5.2){const X=x+(R()-.5)*4.7,Z=z+(R()-.5)*4.7;if(!fieldBoundary(id,X,Z)||blocked(X,Z,.35)||R()<.15)continue;add('grass',X,Z,id==='sunflower'?1.4+R()*.6:.65+R()*.5,R()*TAU,0,id);}
 }
 // Continuous tangents and shared vertex positions eliminate cracks between road segments.
 // Shoulder colours meet the real ground at their outer edge; no stacked coplanar sheet.
 for(const p of paths){
  const edgeAt=(i,side,extra=0)=>{const a=p.samples[Math.max(0,i-1)],b=p.samples[Math.min(p.samples.length-1,i+1)],v=p.samples[i],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1,w=p.width*(.97+.035*Math.sin(i*.21));const X=v[0]-dz/L*(w/2+extra)*side,Z=v[1]+dx/L*(w/2+extra)*side;return [X,t.height(X,Z)+.24,Z];};
  for(let i=0;i<p.samples.length-1;i++){
   const a=p.samples[i],b=p.samples[i+1],g=geom((a[0]+b[0])/2,(a[1]+b[1])/2,'meadowGround');
   const soil=p.region==='sunflower'?C.earth:rgb('#9ca297');
   const color=(v,outer=false)=>outer?blend(t.color(v[0],v[2],v[1]),soil,.12):blend(soil,p.region==='sunflower'?C.edge:C.shade,G.noise(v[0]/8,v[2]/12)*.18);
   const quad=(vs,cs)=>{const up=G.cross(G.sub(vs[1],vs[0]),G.sub(vs[2],vs[0]))[1]>=0;const order=up?[0,1,2,0,2,3]:[0,2,1,0,3,2];for(const j of order)g.vertex(vs[j],t.normal(vs[j][0],vs[j][2]),cs[j]);};
   let a0=edgeAt(i,-1),b0=edgeAt(i+1,-1),a1=edgeAt(i,1),b1=edgeAt(i+1,1);
   quad([a0,b0,b1,a1],[a0,b0,b1,a1].map(v=>color(v)));
   for(const side of[-1,1]){let innerA=edgeAt(i,side),innerB=edgeAt(i+1,side),outerA=edgeAt(i,side,.60),outerB=edgeAt(i+1,side,.60);
    quad([outerA,outerB,innerB,innerA],[color(outerA,true),color(outerB,true),color(innerB),color(innerA)]);
   }
  }
 }
 // A low timber overlook on the rim; no invented Yuuka residence or palace.
 {
  const x=-748,z=1024,y=t.height(x,z),g=geom(x,z,'timber');
  for(let ix=0;ix<39;ix++)g.box(x-5.8+ix*.30,y+.16,z,.28,.16,7.4,C.wood);
  for(const dx of[-5.9,5.9])for(const dz of[-3.5,0,3.5]){g.box(x+dx,y-1.8,z+dz,.16,3.0,.16,C.dark);}
  for(const dx of[-5.9,5.9])for(const yy of[.56,1.02])g.box(x+dx,y+yy,z,.11,.12,7.2,C.wood);
  for(let j=0;j<4;j++)g.box(x,y-.05-j*.12,z-4-j*.29,3.5,.15,.32,C.wood);
  for(const dx of[-3.8,3.8]){g.box(x+dx,y+.18,z-.4,.24,.49,2.1,C.dark);g.box(x+dx,y+.67,z-.4,.77,.14,2.65,C.wood);}
  features.push({id:'sun-overlook',x,y,z,kind:'P rim overlook',w:12,d:7.4});
 }
 // Simple parasol and gardening objects; deliberately not a house.
 {
  const x=-590,z=1126,y=t.height(x,z),g=geom(x,z);g.cone(x,y,z,.037,.028,2.35,C.wood,7);
  const N=16;for(let j=0;j<N;j++){let a=j/N*TAU,b=(j+1)/N*TAU,p=[x+Math.cos(a)*1.4,y+1.97,z+Math.sin(a)*1.4],q=[x+Math.cos(b)*1.4,y+1.97,z+Math.sin(b)*1.4];g.tri([x,y+2.53,z],q,p,C.paper);g.tube([x,y+2.51,z],p,.011,C.wood,4,.009);}
  g.box(x+1.7,y+.40,z+1.1,2,.12,.8,C.wood);for(let dx of[1.0,2.35])g.box(x+dx,y,z+1.1,.16,.44,.5,C.dark);
  features.push({id:'sun-parasol',x,y,z,basis:'P',note:'花间歇脚陈设，不是幽香住所'});
 }
 // Sculpted, layered rocks along the cooler hill: no corpse props or literalised tragedy.
 for(let j=0;j<118;j++){
  const a=R()*TAU,rr=.62+R()*.54,X=areas.nameless.x+Math.cos(a)*areas.nameless.rx*rr,Z=areas.nameless.z+Math.sin(a)*areas.nameless.rz*rr;
  const r=.7+R()*2.6;if(blocked(X,Z,r+.5))continue;const y=t.height(X,Z),g=geom(X,Z);
  g.ellipsoid(X,y+r*.08,Z,r,r*.40,r*.67,C.stone,7,3);g.ellipsoid(X-r*.12,y+r*.37,Z+r*.05,r*.69,r*.09,r*.51,C.moss,7,2);rocks.push({x:X,y,z:Z,r});
 }
 for(const [X,Z,rad,H] of [[-1490,980,10,5],[-1510,1028,11,7],[-1469,954,8,4],[-1528,1098,9,5],[-1432,914,12,7],[-1488,1118,7,4]]){
  if(blocked(X,Z,rad))continue;const g=geom(X,Z),y=t.height(X,Z);g.ellipsoid(X,y+H*.20,Z,rad,H,rad*.72,C.stone,9,5);g.ellipsoid(X+rad*.29,y+H*.71,Z,rad*.63,H*.29,rad*.51,C.moss,8,3);features.push({id:'hill-outcrop-'+X,x:X,y,z:Z,w:rad*2,d:rad*1.44,basis:'P'});
 }
 for(const id of['sunflower','nameless']){
  const a=areas[id],num=id==='sunflower'?83:58;
  for(let j=0;j<num;j++){const ang=R()*TAU,rr=1.05+R()*.16,X=a.x+Math.cos(ang)*a.rx*rr,Z=a.z+Math.sin(ang)*a.rz*rr;
   if((id==='sunflower'&&Z>1300)||blocked(X,Z,5))continue;add('tree',X,Z,.95+R()*.72,R()*TAU,0,id);
  }
 }
 {
  const x=-1251,z=987,y=t.height(x,z),g=geom(x,z);g.ellipsoid(x,y+.04,z,2.0,.56,1.12,C.stone,8,4);g.ellipsoid(x-.4,y+.55,z,1.2,.085,.8,C.moss,8,2);
  features.push({id:'nameless-windrock',x,y,z,basis:'P',note:'林边石座；不新增梅蒂欣住宅或神社'});
 }
 // Seasonal wooden concert structure. It exists only with the event layer enabled.
 const st={x:-365,z:1251,y:t.height(-365,1251),w:25,d:15};
 {
  const g=stageBank.get(st.x,st.z,'timber'),roof=stageBank.get(st.x,st.z,'roof'),det=stageBank.get(st.x,st.z,'roof','near'),x=st.x,y=st.y,z=st.z;
  g.box(x,y-.4,z,25,1.15,15,C.dark);for(let j=0;j<63;j++)g.box(x-12.35+j*.395,y+.76,z,.373,.14,14.9,C.wood);
  for(const dx of[-11.4,11.4])for(const dz of[-6.2,5.9]){g.box(x+dx,y+.8,z+dz,.45,6.3,.45,C.dark);g.box(x+dx,y+1,z+dz,.65,.15,.65,C.wood);}
  g.box(x,y+6.67,z-6.2,24,.45,.48,C.wood);g.box(x,y+6.67,z+5.9,24,.45,.48,C.wood);
  G.roof(roof,x,y+7.13,z,28,18,4.0,rgb('#566357'),det,true);
  g.box(x,y+.9,z-6.25,22.5,5.85,.32,rgb('#b6aa84'));
  // A modeled pine motif, not a copied game backdrop texture.
  const trunk=geom;g.tube([x-4,y+1,z-5.98],[x-3,y+4.2,z-5.98],.15,C.dark,7,.08);
  for(let j=0;j<7;j++){let xx=x-3+Math.sin(j*2.4)*3.5,yy=y+3.1+(j%3)*.88;g.tube([x-3,y+3,z-5.98],[xx,yy,z-5.95],.08,C.dark,5,.025);g.ellipsoid(xx,yy+.20,z-5.82,1.65,.42,.12,rgb('#5f7552'),7,3);}
  for(const side of[-1,1])for(let j=0;j<3;j++)g.box(x+side*(10.3-j*.43),y+2.1,z-5.79,.39,3.1,.045,[rgb('#a25446'),rgb('#37483c'),rgb('#899c66')][j]);
  for(let i=0;i<5;i++)g.box(x,y+i*.16,z+9.3-i*.39,4.5,.18,.43,C.wood);
  for(const side of[-1,1]){g.box(x+side*10,y+.9,z+3.4,1.2,2,1.0,C.dark);for(let j=0;j<2;j++)g.cone(x+side*10,y+1.1+j*.7,z+3.96,.31,.31,.02,rgb('#2d3432'),10);}
  for(let row=0;row<3;row++)for(const side of[-1,1]){
   const zz=z+13+row*4,xx=x+side*7.5;g.box(xx,t.height(xx,zz)+.45,zz,8,.17,1,C.wood);for(const dx of[-3.2,3.2])g.box(xx+dx,t.height(xx+dx,zz),zz,.19,.6,.75,C.dark);
  }
  const lanterns=stageBank.get(x,z,'warmGlow');for(let j=0;j<9;j++){
   const xx=x-10+j*2.5,yy=y+5.7-.7*Math.sin(j/8*PI);g.tube([xx,yy+.65,z+5.85],[xx,yy+.1,z+5.85],.012,C.dark,4);lanterns.ellipsoid(xx,yy,z+5.85,.23,.30,.23,rgb('#f4daaa'),9,5);
  }
 }
 const plantInStone=(x,z)=>x<-1050&&(rocks.some(r=>Math.hypot((x-r.x)/(r.r+.10),(z-r.z)/(r.r*.67+.10))<1)||features.some(f=>f.id.startsWith('hill-outcrop-')&&Math.hypot((x-f.x)/(f.w/2+.2),(z-f.z)/(f.d/2+.2))<1));
 for(const [key,b]of groups){if(b.type==='tree'||b.region!=='nameless')continue;const ma=[],co=[];for(let i=0;i<b.m.length;i+=16){if(plantInStone(b.m[i+12],b.m[i+14]))continue;for(let k=0;k<16;k++)ma.push(b.m[i+k]);for(let k=0;k<3;k++)co.push(b.c[i/16*3+k]);}b.m=ma;b.c=co;if(!ma.length)groups.delete(key);}
 let write=0;for(let i=0;i<plantRecords.length;i++){const p=plantRecords[i];if(!plantInStone(p.x,p.z))plantRecords[write++]=p;}plantRecords.length=write;
 for(const [key,b] of groups){
  const d=defs[b.type][b.v],center=b.min.map((v,i)=>(v+b.max[i])/2),radius=G.length(G.sub(b.max,b.min))/2;
  meshList.push({id:'flowerlands:'+key,group:'vegetation',region:b.region,evidence:'P',material:b.type==='tree'?'foliage':b.type==='grass'?'meadowLeaf':b.type==='lily'?'lilyFlower':'sunflowerPetal',
   vertices:d.near,farVertices:d.far,instances:new Float32Array(b.m),instanceColors:new Float32Array(b.c),center,radius,local:true,
   lodDistance:b.type==='lily'?28:b.type==='sunflower'?45:b.type==='grass'?60:200,maxDetailDistance:b.type==='grass'?160:undefined,flowerKind:b.type});
 }
 const batched=bank.meshes().map(m=>({...m,id:'flowerlands:terrain-props:'+m.id,group:m.material==='meadowGround'?'roads':'architecture',region:m.center[0]<-1000?'nameless':'sunflower',evidence:'P'}));
 const eventMeshes=stageBank.meshes().map(m=>({...m,id:'flowerlands:event:'+m.id,group:'architecture',region:'sunflower',event:'summer-concert',evidence:'P'}));
 const counts={sunflowers:plantRecords.filter(p=>p.type==='sunflower').length,lilies:plantRecords.filter(p=>p.type==='lily').length};
 return {meshes:[...batched,...meshList,...eventMeshes],signs:[],meta:{basis:'P',version:'0.11.0',counts,areas,paths,plantRecords,rocks,features,stage:{...st,basis:'P',seasonal:true,defaultVisible:false},
  notes:'向南倾斜碗形花田与阴凉半山铃兰地分开制作；不新增幽香或梅蒂欣的固定住宅。季节会场是导览事件层，不模拟真实日期或演出。'}};
}
G.IMPLEMENTED.sunflower='sunflower';G.IMPLEMENTED.nameless='nameless';G.IMPLEMENTED.sun_stage='sunflowerStage';
Object.assign(G,{FLOWERLANDS:{areas,paths,clearings,nearest,fieldBoundary,influence,oldHeight,sunShape,lilyShape},buildFlowerlands});
})(globalThis.GA);

/* v0.12 | Youkai Mountain / Wind God's Lake / Moriya Shrine.
 * Places and connections have source records; every height, footprint, route,
 * bridge, ancillary structure and camera below is P (project design).
 * High lake is NOT Misty Lake. Mountain slope is not a radial cone.
 */
(function(G){'use strict';
const {rgb,blend,mix,smooth:sm,clamp}=G,PI=Math.PI,TAU=PI*2;
const C={rock:rgb('#8c9388'),lightRock:rgb('#adb2a3'),moss:rgb('#566c4e'),earth:rgb('#777c60'),path:rgb('#b0a58d'),
 wood:rgb('#78573a'),dark:rgb('#3c332b'),timber:rgb('#a38050'),wall:rgb('#d4cab0'),paper:rgb('#e0d8ba'),
 roof:rgb('#445951'),roofEdge:rgb('#8b956e'),red:rgb('#974a36'),stone:rgb('#9c9f8e'),rope:rgb('#b99a62'),water:rgb('#4d9d9c')};
const B={minX:-1664,maxX:512,minZ:-2176,maxZ:-512};
const S={x:124,z:-1360,y:700,yaw:-PI/2};
const lake=G.lakes.find(l=>l.id==='wind_lake');
const oldHeight=G.Terrain.prototype.height,oldColor=G.Terrain.prototype.color;
function weight(x,z){return sm(B.minX,B.minX+128,x)*(1-sm(B.maxX-128,B.maxX,x))*sm(B.minZ,B.minZ+128,z)*(1-sm(B.maxZ-128,B.maxZ,z));}
function mountainShape(x,z){
 const pk=(a,b,h,rx,rz)=>h*Math.exp(-1.95*(((x-a)/rx)**2+((z-b)/rz)**2));
 let h=62+pk(-760,-1710,1170,350,360)+pk(-1190,-1490,740,340,445)+pk(-385,-1930,940,280,305)
  +pk(245,-1830,1130,330,395)+pk(-860,-1140,455,445,460)+pk(-275,-1170,360,485,480)+pk(160,-1430,340,580,485)+pk(-1390,-1930,610,290,390);
 const ridge=Math.abs(G.noise((x+17*Math.sin(z/95))/96,z/88)*2-1);
 h+=(ridge-.40)*55*sm(240,700,h)+(G.noise(x/34,z/39)-.5)*16*sm(280,600,h);
 const shoulder=Math.hypot((x-115)/290,(z+1340)/260);h=Math.max(h,701-90*Math.pow(shoulder,3));
 const d=G.lakeDistance(lake,x,z);
 if(d<1)h=lake.y-13+11*sm(.7,1,d);else if(d<2.45)h=mix(lake.y+1.2+(d-1)*13,h,sm(1.10,2.45,d));
 // South-facing waterfall escarpment. The water surface lives independently.
 const wf=(1-sm(40,95,Math.abs(x+510)))*(1-sm(76,127,Math.abs(z+1040)));
 const esc=mix(425.0,243,sm(-1056,-1047,z));h=mix(h,esc,wf);
 // Main shrine terrace and lower lake approach; not a giant plateau covering the lake.
 const local=Math.max(Math.abs((x-128)/82),Math.abs((z+1360)/82));h=mix(h,699.92,1-sm(.86,1.28,local));
 if(x>18&&x<78&&Math.abs(z+1360)<25){const sy=684.4+15.52*clamp((x-31)/43,0,1);h=mix(h,sy,sm(18,27,x)*(1-sm(11,25,Math.abs(z+1360))));}
 const upper=Math.max(Math.abs(x-252)/53,Math.abs(z+1230)/48);h=mix(h,705,1-sm(.8,1.6,upper));
 const plunge=Math.hypot((x+499)/35,(z+972)/39);if(plunge<1.28)h=mix(h,245.0,1-sm(.93,1.28,plunge));
 // Small pond is on a mountain flank, not another name for either large lake.
 const pondShoulder=Math.hypot((x+989)/100,(z+1109)/88);h=mix(h,520.5,1-sm(.4,1.15,pondShoulder));const pd=Math.hypot((x+989)/34,(z+1109)/24);if(pd<1.35)h=mix(h,520-2.6*(1-sm(.55,1,pd)),1-sm(1,1.35,pd));
 return h;
}
// Spatially indexed line queries avoid scanning every route at every terrain vertex.
function indexSegments(paths,radius){const bins=new Map(),cell=48;
 for(const p of paths)for(let i=0;i<p.points.length-1;i++){const a=p.points[i],b=p.points[i+1];for(let ix=Math.floor((Math.min(a[0],b[0])-radius)/cell);ix<=Math.floor((Math.max(a[0],b[0])+radius)/cell);ix++)for(let iz=Math.floor((Math.min(a[2],b[2])-radius)/cell);iz<=Math.floor((Math.max(a[2],b[2])+radius)/cell);iz++){const k=ix+':'+iz;if(!bins.has(k))bins.set(k,[]);bins.get(k).push({a,b,path:p});}}
 return (x,z)=>{let best={d:Infinity};for(const e of bins.get(Math.floor(x/cell)+':'+Math.floor(z/cell))||[]){const dx=e.b[0]-e.a[0],dz=e.b[2]-e.a[2],t=clamp(((x-e.a[0])*dx+(z-e.a[2])*dz)/(dx*dx+dz*dz||1),0,1),d=Math.hypot(x-e.a[0]-dx*t,z-e.a[2]-dz*t);if(d<best.d)best={d,y:mix(e.a[1],e.b[1],t),t,path:e.path};}return best;};
}
const rivers=[
 {id:'mountain-feeder',width:12,points:[[-676,632,-1465],[-628,559,-1327],[-574,473,-1180],[-532,433,-1090],[-510,425.55,-1056]]},
 {id:'valley-stream',width:15,points:[[-507,247,-1017],[-495,247,-965],[-458,230,-914],[-388,203,-850],[-291,172,-780],[-157,129,-747],[-21,111,-738],[156,100.25,-737]]}
];
const riverNear=indexSegments(rivers,42);
const paths=[
 {id:'mountain-lower-path',width:4.6,label:'山麓至溪谷',points:[[70,65,-390],[-24,83,-510],[-105,116,-628],[-201,154,-712],[-295,183,-796],[-369,230,-873],[-430,251,-941],[-443,255,-1007]]},
 {id:'mountain-switchbacks',width:3.4,label:'瀑侧折返登山道',points:[[-443,255,-1007],[-510,295,-1092],[-610,336,-1118],[-491,379,-1165],[-639,426,-1184],[-506,474,-1221],[-671,524,-1239],[-562,567,-1296],[-658,608,-1327],[-528,646,-1414],[-517,678,-1497],[-433,686,-1500]]},
 {id:'wind-lake-rim',width:3.6,label:'山上湖岸环行',points:[[-433,686,-1500],[-442,686,-1460],[-449,687,-1370],[-418,686,-1265],[-336,685,-1206],[-201,685,-1200],[-79,685,-1206],[41,686,-1270],[51,688,-1320],[50,691.26,-1360],[37,686,-1412],[15,685,-1455],[-80,685,-1537],[-220,686,-1539],[-349,686,-1516],[-433,686,-1500]]},
 {id:'moriya-station-walk',width:4,label:'索道上站至神社',points:[[252,705,-1230],[222,704,-1244],[186,700,-1282],[143,700,-1306],[96,700,-1320]]},
 {id:'mountain-pond-path',width:2.4,label:'大蛤蟆之池支路',points:[[-610,336,-1118],[-724,430,-1180],[-850,500,-1155],[-956,521,-1109]]}
];
const pathNear=indexSegments(paths,36);
G.Terrain.prototype.height=function(x,z){let h=oldHeight.call(this,x,z),w=weight(x,z);if(w>0){h=mix(h,mountainShape(x,z),w);
 // Preserve old ambiguous anchors instead of moving their unnamed structures.
 for(const p of [{x:-1170,z:-1060,r:120},{x:-980,z:-610,r:90}]){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r)h=mix(h,oldHeight.call(this,x,z),1-sm(p.r*.48,p.r,d));}
 const ld=G.lakeDistance(G.lakes[0],x,z);if(ld<1.5)h=mix(oldHeight.call(this,x,z),h,sm(1.04,1.5,ld));
 }
 const rn=riverNear(x,z);if(rn.d<rn.path?.width+16 && !(rn.path.id==='mountain-feeder'&&z>-1055) && G.lakeDistance(G.lakes[0],x,z)>1.02){const ww=1-sm(rn.path.width*.46,rn.path.width*.55+15,rn.d);h=mix(h,rn.y-2.6,ww);}
 const pn=pathNear(x,z);if(pn.path&&pn.d<pn.path.width/2+22){h=mix(h,pn.y-.20,1-sm(pn.path.width/2,pn.path.width/2+22,pn.d));}
 // Keep the shrine's straight stone ascent authoritative over nearby lake-path grading.
 if(x>=29&&x<=76&&Math.abs(z+1360)<9){const y=684.4+15.52*clamp((x-31)/43,0,1);h=mix(h,Math.min(h,y),1-sm(5.8,9,Math.abs(z+1360)));}
 return h;};
G.Terrain.prototype.color=function(x,z,h,n){let c=oldColor.call(this,x,z,h,n),w=weight(x,z);if(w>0){let q=blend(rgb('#607659'),rgb('#7b8869'),G.noise(x/190,z/145)*.65),s=1-(n||this.normal(x,z))[1];q=blend(q,C.rock,sm(.17,.55,s)*.91);q=blend(q,C.lightRock,sm(560,1180,h)*.64);q=blend(q,rgb('#c4c7b3'),sm(1030,1490,h)*.58);const rn=riverNear(x,z);if(rn.path&&rn.d<rn.path.width+13)q=blend(q,C.moss,.55*(1-sm(rn.path.width,rn.path.width+13,rn.d)));c=blend(c,q,w);}return c;};
const oldLandmarks=G.buildRegionalLandmarks;
G.buildRegionalLandmarks=function(t,c){const r=oldLandmarks(t,c);return{meshes:r.meshes.filter(m=>!['building-moriya','building-ropeway_lower'].includes(m.id)),footprints:r.footprints.filter(m=>!['moriya','ropeway_lower'].includes(m.id))};};
const oldVegetation=G.buildVegetation;
G.buildVegetation=function(t,v,f){const tt=Object.create(t);tt.height=(x,z)=>oldHeight.call(t,x,z);const r=oldVegetation(tt,v,f);let removed=0;const out=[];for(const m of r.meshes){if(!m.instances){out.push(m);continue;}const mats=[],cols=[];let changed=false;for(let i=0;i<m.instances.length;i+=16){let x=m.instances[i+12],z=m.instances[i+14];if(weight(x,z)>.01||Math.hypot(x-70,z+390)<24){changed=true;removed++;}else{mats.push(...m.instances.subarray(i,i+16));cols.push(...m.instanceColors.subarray(i/16*3,i/16*3+3));}}if(!changed)out.push(m);else if(mats.length)out.push({...m,instances:new Float32Array(mats),instanceColors:new Float32Array(cols)});}return {meshes:out,count:r.count-removed};};
function upQuad(g,a,b,c,d,col){if(G.cross(G.sub(b,a),G.sub(c,a))[1]<0)g.quad(d,c,b,a,col);else g.quad(a,b,c,d,col);}
function strip(g,nodes,width,col,offset=0){for(let i=0;i<nodes.length-1;i++){let a=nodes[i],b=nodes[i+1],dir=G.norm([b[0]-a[0],0,b[2]-a[2]]),side=[-dir[2]*width/2,0,dir[0]*width/2];upQuad(g,G.add(a,G.add(side,[0,offset,0])),G.add(b,G.add(side,[0,offset,0])),G.add(b,G.add(G.mul(side,-1),[0,offset,0])),G.add(a,G.add(G.mul(side,-1),[0,offset,0])),col);}}
function disk(g,x,y,z,rx,rz,col,N=64){for(let i=0;i<N;i++)g.tri([x,y,z],[x+rx*Math.cos((i+1)/N*TAU),y,z+rz*Math.sin((i+1)/N*TAU)],[x+rx*Math.cos(i/N*TAU),y,z+rz*Math.sin(i/N*TAU)],col);}
function lineSamples(points,spacing=2){const a=[];for(let i=0;i<points.length-1;i++){let p=points[i],q=points[i+1],n=Math.max(1,Math.ceil(Math.hypot(q[0]-p[0],q[2]-p[2])/spacing));for(let j=0;j<n;j++)a.push(p.map((x,k)=>mix(x,q[k],j/n)));}a.push(points.at(-1).slice());return a;}
function lamp(g,x,y,z,s=1){g.box(x,y,z,1.15*s,.27*s,1.15*s,C.stone);g.cone(x,y+.27*s,z,.31*s,.25*s,1.6*s,C.stone,6);g.box(x,y+1.85*s,z,.95*s,.73*s,.95*s,C.stone);for(let side of[-1,1])g.box(x+side*.482*s,y+2.0*s,z,.018*s,.35*s,.41*s,C.dark);G.roof(g,x,y+2.58*s,z,1.5*s,1.5*s,.5*s,C.roof,null,true);g.cone(x,y+3.0*s,z,.11*s,0,.3*s,C.stone,8);}
function rope(g,a,b,r=.4,col=C.rope){const n=32;for(let strand=0;strand<3;strand++)for(let j=0;j<n;j++){const at=t=>{const p=a.map((x,k)=>mix(x,b[k],t));p[1]-=Math.sin(t*PI)*.58;p[1]+=Math.sin(t*TAU*10+strand*TAU/3)*r*.41;p[2]+=Math.cos(t*TAU*10+strand*TAU/3)*r*.41;return p;};g.tube(at(j/n),at((j+1)/n),r*.52,col,5);}}
function shide(g,x,y,z,s=1){for(let i=0;i<4;i++){const dx=(i%2?-.18:.18)*s;g.box(x+dx,y-i*.29*s,z,.45*s,.32*s,.028*s,G.rgb('#eee8cd'));}}
function pillar(g,det,x,y,z,h,r=1.25){g.cone(x,y,z,r,r*.75,h,C.wood,12);g.cone(x,y+h,z,r*.75,.25,.65,C.timber,12);}
function onbashira(g,det,x,y,z,h=19,r=1.18){pillar(g,det,x,y,z,h,r);for(let j=0;j<8;j++){let a=j/8*TAU;det.tube([x+Math.cos(a)*r*1.001,y+.2,z+Math.sin(a)*r*1.001],[x+Math.cos(a)*r*.755,y+h-.1,z+Math.sin(a)*r*.755],.031,blend(C.wood,C.timber,.38),3);}for(let k=0;k<3;k++){let yy=y+h*.48+k*.22;for(let j=0;j<18;j++){let a=j/18*TAU,b=(j+1)/18*TAU;det.tube([x+Math.cos(a)*r*.92,yy,z+Math.sin(a)*r*.92],[x+Math.cos(b)*r*.92,yy,z+Math.sin(b)*r*.92],.085,C.rope,5);}}}
function torii(g,det,x,y,z,w=14,h=12){for(const sg of[-1,1]){g.cone(x+sg*w*.33,y,z,.48,.37,h,C.red,12);g.box(x+sg*w*.33,y,z,1.35,.42,1.35,C.dark);}g.box(x,y+h-2.8,z,w+.1,.6,.56,C.red);g.box(x,y+h-.55,z,w+2,.7,1.2,C.dark);g.box(x,y+h-1,z,w+1.4,.48,.85,C.red);g.box(x,y+h-2.7,z,.55,2,.5,C.red);rope(det,[x-w*.36,y+h-3,z+.32],[x+w*.36,y+h-3,z+.32],.19);for(let j=-2;j<=2;j++)shide(det,x+j*1.45,y+h-3.5,z+.38,.67);}
function pavilion(g,det,x,y,z,w=11,d=9){g.box(x,y-.1,z,w+.8,.4,d+.8,C.stone);for(let sx of[-1,1])for(let sz of[-1,1]){g.box(x+sx*(w/2-.55),y+.35,z+sz*(d/2-.6),.32,4.0,.32,C.wood);}G.roof(g,x,y+4.4,z,w+2,d+2,2.7,C.roof,det,true);g.box(x,y+3.7,z,w,.25,d,C.dark);}
function buildMoriya(t){const out=[],signs=[],footprints=[],g=new G.Geometry().place(S.x,S.y,S.z,S.yaw),de=new G.Geometry().place(S.x,S.y,S.z,S.yaw),roof=new G.Geometry().place(S.x,S.y,S.z,S.yaw),det=new G.Geometry().place(S.x,S.y,S.z,S.yaw),stone=new G.Geometry().place(S.x,S.y,S.z,S.yaw);
 // Four complete elevations, raised engawa and underfloor structure.
 stone.box(0,-.05,0,41,1.05,31,C.stone);g.box(0,1.0,0,38,.42,29,C.wood);g.box(0,1.42,-1,33,7.6,21,C.wall);
 for(let xx=-17;xx<=17;xx+=4.25)for(let zz of[-13,13]){g.box(xx,.28,zz,.63,9.9,.63,C.wood);g.box(xx,8.7,zz,1.3,.48,1.2,C.timber);for(let k=0;k<3;k++)g.box(xx,9.2+k*.22,zz,1.2+k*.30,.20,1.2+k*.24,C.wood);}
 for(let z=-12;z<13;z+=1.1)de.box(0,1.425,z,38,.04,.045,C.dark);
 // Dark recess at the front, visible through framed shoji and an open central bay.
 g.box(0,1.75,9.58,31.4,6.7,.13,C.dark);
 for(let xx of[-13.5,-9.0,9.0,13.5])G.windowPanel(de,xx,2,9.72,3.7,5.7,0,C.paper);
 for(let xx of[-4.5,4.5]){g.box(xx,1.45,11.1,.55,7.5,.55,C.wood);}
 for(let sx of[-1,1])for(let z of[-7.5,-1,5.5])G.windowPanel(de,sx*16.6,2.1,z,4.8,5.6,sx*PI/2,C.paper);
 for(let xx of[-12,-6,0,6,12])G.windowPanel(de,xx,2.1,-11.6,4.8,5.7,PI,C.paper);
 for(let zz of[-13,13])for(let y of[7.9,8.7,9.6])g.box(0,y,zz,40,.25,.44,C.timber);
 // Hipped lower skirt, upper gable, raised copper-edged karahafu at the front.
 const levels=[{w:44,d:35,y:10.25},{w:35,d:16,y:15.5}];
 for(let sg of[-1,1]){roof.quad([-22,10.25,sg*17.5],[22,10.25,sg*17.5],[17.5,15.5,sg*8],[-17.5,15.5,sg*8],C.roof);roof.quad([sg*22,10.25,-17.5],[sg*22,10.25,17.5],[sg*17.5,15.5,8],[sg*17.5,15.5,-8],C.roof);roof.box(0,10.10,sg*17.5,44,.34,.50,C.roofEdge);}
 G.roof(roof,0,15.3,0,35.7,16.2,4.25,C.roof,det,false);
 for(let xx=-21.6;xx<22;xx+=.52)for(let sg of[-1,1]){let targetX=clamp(xx,-17.3,17.3);det.tube([xx,10.36,sg*17.5],[targetX,15.58,sg*8],.041,blend(C.roof,C.roofEdge,.3),4);}
 for(let xx=-20;xx<21;xx+=.68)for(let sg of[-1,1])det.box(xx,9.86,sg*16.8,.12,.22,2.0,C.wood);
 const curve=x=>12.1+3.15*Math.exp(-((x/4.1)**2))+.56*(Math.abs(x)/9)**3;
 for(let i=0;i<72;i++){let x=-9+i*.25,u=x+.25;roof.quad([x,curve(x),19],[u,curve(u),19],[u,curve(u)+.55,8.9],[x,curve(x)+.55,8.9],C.roof);roof.quad([x,curve(x)-.45,19.04],[u,curve(u)-.45,19.04],[u,curve(u)+.1,19.04],[x,curve(x)+.1,19.04],C.timber);det.tube([x,curve(x)+.10,19.1],[u,curve(u)+.10,19.1],.09,C.roofEdge,6);}
 for(let x=-8.5;x<=8.5;x+=.5)det.tube([x,curve(x)+.10,19.15],[x,curve(x)+.65,8.9],.046,C.roofEdge,4);
 for(let sx of[-1,1]){g.box(sx*7.3,1.4,17.5,.62,10.6,.62,C.wood);g.tube([sx*7.3,9.2,17.5],[sx*8.8,11.9,17.5],.20,C.timber,6);}
 g.box(0,11.15,17.5,17,.55,.75,C.wood);
 // Broad twisted rope is the main silhouette feature, not a painted stripe.
 rope(de,[-6.7,9.9,18.25],[6.7,9.9,18.25],.88);
 for(const x of[-4.2,0,4.2]){de.cone(x,7.55,18.28,.62,.23,1.70,C.rope,14);for(let j=0;j<14;j++){let a=j/14*TAU;det.tube([x+Math.cos(a)*.52,7.55,18.28+Math.sin(a)*.52],[x+Math.cos(a)*.20,9.25,18.28+Math.sin(a)*.2],.024,C.timber,3);}}
 for(const x of[-5.7,-2.4,2.4,5.7])shide(de,x,9.00,18.9,1.45);
 de.box(0,1.50,16.5,4.7,1.45,1.6,C.wood);de.box(0,2.98,16.5,5.0,.18,1.85,C.timber);for(let x=-2.2;x<2.3;x+=.24)det.box(x,3.17,16.5,.10,.03,1.7,C.dark);
 for(let i=0;i<6;i++)stone.box(0,-.02+i*.24,22.2-i*.63,8,.24,.9,C.stone);
 for(let sg of[-1,1])for(let z=-11;z<14;z+=2.8){g.box(sg*18,1.45,z,.18,1.1,.18,C.wood);g.box(sg*18,2.30,z,.18,.12,2.8,C.timber);}
 footprints.push({id:'moriya-main',x:S.x,z:S.z,y:S.y,rx:19,rz:24});
 out.push(stone.mesh('moriya:foundation','architecture',{region:'mountain',material:'templeStone'}),g.mesh('moriya:structure','architecture',{region:'mountain',material:'matte'}),de.mesh('moriya:rope-shoji','architecture',{region:'mountain',material:'matte'}),roof.mesh('moriya:roof','architecture',{region:'mountain',material:'roof'}),det.mesh('moriya:near','architecture',{region:'mountain',material:'matte',lod:'near'}));
 const grounds=new G.Geometry(),fg=new G.Geometry(),detail=new G.Geometry();
 // Temple court and the lake-facing axial stair.
 grounds.box(120,699.88,-1360,102,.15,124,rgb('#bdb9a0'));
 const courtPath=[[124,700.08,-1360],[93,700.08,-1360],[76,700.08,-1360]];strip(grounds,courtPath,8,C.stone);
 let treads=[];for(let i=0;i<80;i++){let x=31+i*43/80,y=684.6+i*(15.5/80);grounds.box(x,y,-1360,.72,.24,8.6,C.stone);treads.push([x,y+.24,-1360]);}
 for(let side of[-1,1]){grounds.box(52.5,683.8,-1360+side*5.3,47,1.2,1.2,C.stone);for(let i=0;i<12;i++){let x=31+i*43/11,y=684.6+i*15.5/11;fg.box(x,y,-1360+side*5.0,.28,1.15,.28,C.wood);if(i)fg.tube([x-43/11,y-15.5/11+1,-1360+side*5],[x,y+1,-1360+side*5],.13,C.timber,6);}}
 const gate=new G.Geometry().place(30.5,684.6,-1360,-PI/2),gateD=new G.Geometry().place(30.5,684.6,-1360,-PI/2);torii(gate,gateD,0,0,0,14,12);out.push(gate.mesh('moriya:lake-torii','architecture',{region:'mountain'}),gateD.mesh('moriya:gate-rope','architecture',{region:'mountain',lod:'near'}));
 for(let z of[-1413,-1307])for(let x of[80,166])onbashira(fg,detail,x,700,z,23,1.18);
 // Shoulder-height retaining walls, not a vertical monolithic block.
 for(let z of[-1421,-1299]){grounds.box(121,695.2,z,111,4.7,1.4,C.stone);grounds.box(121,699.95,z,112,.26,1.7,C.stone);}
 for(let x of[75,91,108])for(let side of[-1,1])lamp(fg,x,700,-1360+side*11,.86);
 // Subsidiary buildings are explicitly project additions to the exterior plan.
 for(const b of [{x:156,z:-1404,w:22,d:13},{x:163,z:-1315,w:23,d:14}]){let base=new G.Geometry().place(b.x,700,b.z,-PI/2);base.box(0,0,0,b.w+2,.8,b.d+2,C.stone);base.box(0,.8,0,b.w,5.4,b.d,C.wall);for(let x=-b.w/2+2;x<b.w/2;x+=3.5)G.windowPanel(base,x,1.3,b.d/2+.08,2.7,3.6);G.roof(base,0,6.3,0,b.w+4,b.d+4,3.1,C.roof,null,true);out.push(base.mesh('moriya:ancillary-'+b.z,'architecture',{region:'mountain'}));}
 pavilion(fg,detail,88,700,-1393,9,7);fg.box(88,700.55,-1393,5.3,1.1,2.4,C.stone);fg.box(88,701.66,-1393,4.7,.035,1.8,C.water);detail.tube([85.5,702.1,-1393],[90.5,702.1,-1393],.11,C.rope,8);
 for(let z=-1385;z<=-1334;z+=17){fg.box(180,700,z,7,.4,4,C.stone);fg.box(180,700.4,z,5.8,.45,1.6,C.wood);}
 
 const garden=new G.Geometry(),rg=G.rng(86731);
 for(const [x,z,rx,rz] of [[105,-1406,12,6],[102,-1314,13,5],[155,-1360,6,12],[86,-1379,5,4]]){
 garden.ellipsoid(x,699.95,z,rx,.48,rz,C.stone,16,3);
 garden.ellipsoid(x,700.24,z,rx-.5,.26,rz-.5,C.moss,16,3);
 for(let i=0;i<6;i++){const a=rg()*TAU;garden.ellipsoid(x+Math.cos(a)*rx*.64,700.7,z+Math.sin(a)*rz*.52,1+rg()*.9,.55+rg()*.5,1.1+rg(),blend(C.moss,rgb('#82946e'),rg()*.3),7,3);}
 for(let i=0;i<3;i++)garden.ellipsoid(x-4+i*2.5,700.45,z,1.3+rg(),.5+rg(),1+rg(),C.rock,7,3);
 }
 // Timber benches, small preparation tables and individual roofed notice-board, not an invented named shop.
 for(const z of[-1402,-1320]){fg.box(119,700.5,z,7,.20,1.1,C.wood);for(const dx of[-2.6,2.6])fg.box(119+dx,700,z,.24,.5,.7,C.dark);}
 fg.box(79,700,-1331,.2,3,.2,C.wood);fg.box(85,700,-1331,.2,3,.2,C.wood);fg.box(82,701.1,-1331,6,.95,.25,C.dark);G.roof(fg,82,703.2,-1331,7.3,2.1,.5,C.roof,null,true);
 out.push(garden.mesh('moriya:planted-courtyard','architecture',{region:'mountain'}));

 signs.push({text:'守矢神社',position:[29.8,693.85,-1360],yaw:-PI/2,width:1.05,height:2.2,vertical:true,background:'#62513b',color:'#e5d4a1',region:'mountain'});
 out.push(grounds.mesh('moriya:court-and-stairs','architecture',{region:'mountain',material:'templeStone'}),fg.mesh('moriya:grounds','architecture',{region:'mountain'}),detail.mesh('moriya:grounds-near','architecture',{region:'mountain',lod:'near'}));
 return {meshes:out,signs,footprints,treads};
}
function pinePrototype(kind,far=false){const g=new G.Geometry(),de=new G.Geometry(),R=G.rng(807+kind),H=kind===2?14:22;
 g.tube([0,0,0],[.3,H*.90,.2],.58,C.wood,far?5:9,.16);
 for(let j=0;j<(far?4:7);j++){let y=H*(.26+j*(far?.15:.095)),rr=(1-y/H)*5.4+1.1,phase=j*2.37;
  for(let k=0;k<(far?1:3);k++){let a=phase+k*TAU/3,x=Math.cos(a)*rr*.54,z=Math.sin(a)*rr*.54;if(!far)g.tube([.15,y-1,0],[x,y+.24,z],.14,C.wood,5,.055);let col=rgb(kind===2?['#95623e','#ae7545','#bd854a'][j%3]:kind===1?'#4d6756':'#506749');de.ellipsoid(x,y,z,rr*.83,kind===2?rr*.55:rr*.28,rr*.75,col,far?5:8,far?2:3);}
 }
 if(!far)for(let k=0;k<4;k++){let a=k/4*TAU;g.tube([0,.6,0],[Math.cos(a)*1.5,.10,Math.sin(a)*1.5],.22,C.wood,5,.06);}
 return {trunk:g.mesh('prototype','vegetation').vertices,crown:de.mesh('prototype','vegetation').vertices};
}
function buildVegetation(t){const mats=new Map(),R=G.rng(12967),records=[],protos=[0,1,2].map(k=>({near:pinePrototype(k),far:pinePrototype(k,true)}));
 function add(x,z,k,s=1){const y=t.height(x,z);if(G.lakes.some(l=>G.lakeDistance(l,x,z)<1.045)||riverNear(x,z).d<16||pathNear(x,z).d<7)return false;if(Math.max(Math.abs(x-128)/83,Math.abs(z+1360)/82)<1.02)return false;if(Math.hypot(x-252,z+1230)<32||Math.hypot((x+989)/44,(z+1109)/34)<1)return false;const r={x,y,z,kind:k,scale:s,yaw:R()*TAU};records.push(r);const key=k+':'+Math.floor(x/144)+':'+Math.floor(z/144);if(!mats.has(key))mats.set(key,{k,ms:[],cs:[],x:Math.floor(x/144)*144+72,z:Math.floor(z/144)*144+72});const b=mats.get(key);b.ms.push(...G.instanceMatrix(x,y,z,s,s,s,r.yaw));b.cs.push(1,1,1);return true;}
 for(let i=0;i<11200;i++){const x=-1480+R()*1950,z=-1950+R()*1310,y=t.height(x,z);if(weight(x,z)<.5||y>1020||t.normal(x,z)[1]<.54||R()<.35)continue;add(x,z,R()<.25?2:R()<.5?1:0,.72+R()*.65);}
 for(let i=0;i<130;i++){let a=R()*TAU,x=128+Math.cos(a)*(90+R()*35),z=-1360+Math.sin(a)*(87+R()*42);add(x,z,i%4===0?2:0,.8+R()*.3);}
 const meshes=[];for(const[key,b]of mats){const instances=new Float32Array(b.ms),colors=new Float32Array(b.cs);for(const part of['trunk','crown'])meshes.push({id:'mountain:trees-'+key+'-'+part,vertices:protos[b.k].near[part],farVertices:protos[b.k].far[part],instances,instanceColors:colors,group:'vegetation',material:part==='crown'?'foliage':'matte',region:'mountain',local:true,lodDistance:part==='crown'?290:330,center:[b.x,t.height(b.x,b.z)+15,b.z],radius:210});}
 return{meshes,records};
}
function buildRoutes(t){const out=[],stats=[];for(const p of paths){const nodes=lineSamples(p.points,1.6),g=new G.Geometry(),ed=new G.Geometry();strip(g,nodes,p.width,C.path,.065);
 for(let i=0;i<nodes.length-1;i++){const a=nodes[i],b=nodes[i+1],rise=b[1]-a[1],L=Math.hypot(b[0]-a[0],b[2]-a[2]);if(Math.abs(rise)/L>.24){const n=Math.max(1,Math.ceil(Math.abs(rise)/.26)),yaw=Math.atan2(b[0]-a[0],b[2]-a[2]);for(let j=0;j<n;j++){const v=a.map((x,k)=>mix(x,b[k],(j+.5)/n));ed.place(v[0],Math.max(a[1]+rise*j/n,a[1]+rise*(j+1)/n)-.10,v[2],yaw);ed.box(0,0,0,p.width,.20,L/n+.07,C.stone);}}}
 ed.place();for(let i=0;i<nodes.length-1;i+=5){const a=nodes[i],b=nodes[Math.min(i+5,nodes.length-1)],dir=G.norm([b[0]-a[0],0,b[2]-a[2]]);if(p.id==='wind-lake-rim'||p.id==='mountain-switchbacks'){const side=[-dir[2]*(p.width/2+.35),0,dir[0]*(p.width/2+.35)];const aa=G.add(a,side),bb=G.add(b,side);ed.box(aa[0],aa[1],aa[2],.20,1.15,.20,C.wood);ed.tube(G.add(aa,[0,1,0]),G.add(bb,[0,1,0]),.10,C.timber,5);}}
 out.push(g.mesh(p.id,'roads',{region:'mountain',material:'ground'}),ed.mesh(p.id+'-steps','architecture',{region:'mountain',material:'templeStone'}));stats.push({id:p.id,label:p.label,width:p.width,points:p.points,nodes:nodes.length,basis:'P'});}
 return {meshes:out,stats};}
function buildWater(t){const out=[],rocks=new G.Geometry(),detail=new G.Geometry(),R=G.rng(72738);
 for(const p of rivers){const g=new G.Geometry();strip(g,lineSamples(p.points,3),p.width,C.water);out.push(g.mesh(p.id+'-water','water',{region:'mountain',material:'water'}));for(let i=0;i<80;i++){let q=G.spline(p.points.map(v=>[v[0],v[2]]),8)[Math.floor(R()*G.spline(p.points.map(v=>[v[0],v[2]]),8).length)];const x=q[0]+(R()-.5)*52,z=q[1]+(R()-.5)*40;if(riverNear(x,z).d<p.width/2||pathNear(x,z).d<5)continue;rocks.ellipsoid(x,t.height(x,z)-.45,z,1+R()*2,1+R()*2,1+R()*2,C.rock,7,3);}}
 let water=new G.Geometry();strip(water,[[-510,425.55,-1056],[-510,425.55,-1044]],14,C.water);disk(water,-499,247.10,-972,35,39,C.water);disk(water,-989,520.0,-1109,34,24,C.water);out.push(water.mesh('mountain:pools','water',{region:'mountain'}));
 // Actual rippled waterfall sheets; no pasted image, billboards or whole-scene skybox.
 const sheet=new G.Geometry(),foam=new G.Geometry();for(let ix=0;ix<40;ix++)for(let j=0;j<48;j++){const P=(i,k)=>{const u=i/40,v=k/48;return[-510+(u-.5)*(34+v*6),425.55-v*178.65,-1044+27*v+3*Math.sin(v*PI)+.34*Math.sin(u*TAU*4+v*11)];};sheet.quad(P(ix,j),P(ix+1,j),P(ix+1,j+1),P(ix,j+1),blend(rgb('#b9d9d2'),rgb('#e8eee1'),.25+.2*Math.sin(ix)));}
 out.push(sheet.mesh('waterfall:falling-sheet','effects',{region:'mountain',material:'waterfall'}));
 for(let i=0;i<21;i++){let x=-529+i*1.85;foam.ellipsoid(x,247.6+R()*1.1,-1019+R()*8,1.5+R(),.35+R()*.5,3+R()*3,rgb('#d7e4d9'),7,3);}out.push(foam.mesh('waterfall:foam','effects',{region:'mountain',material:'spray'}));
 // Cliff buttresses flank rather than occlude the falling water.
 // Continuous fractured rock ribs, rather than stacks of pointed primitive stones.
 for(const sg of[-1,1])for(let k=0;k<5;k++){const x=-510+sg*(35+k*11),H=171+R()*12,zz=-1050-k*1.1,levels=9,sides=7,rings=[];for(let j=0;j<=levels;j++){let y=243+j/levels*H;const rr=7+R()*4;rings.push(Array.from({length:sides},(_,i)=>{const a=i/sides*TAU;return[x+Math.cos(a)*rr,y+Math.sin(a*2+j)*1.1,zz+Math.sin(a)*(10+R()*4)];}));}for(let j=0;j<levels;j++)for(let i=0;i<sides;i++)rocks.quad(rings[j][(i+1)%sides],rings[j][i],rings[j+1][i],rings[j+1][(i+1)%sides],blend(C.rock,C.lightRock,.08+R()*.15));for(let i=1;i<sides-1;i++)rocks.tri(rings[levels][0],rings[levels][i+1],rings[levels][i],C.rock);}
 // A narrow overlook with railings is P, not a tengu house.
 const py=t.height(-443,-1007);detail.box(-444,py+.15,-1007,15,.55,12,C.wood);for(let i=0;i<6;i++){let x=-451+i*2.8;detail.box(x,py+.7,-1012,.19,1.1,.19,C.wood);if(i)detail.tube([x-2.8,py+1.6,-1012],[x,py+1.6,-1012],.095,C.wood,5);}
 const shore=new G.Geometry();for(let i=0;i<210;i++){const a=i/210*TAU,r=1.07+.03*R(),x=lake.x+Math.cos(a)*lake.rx*r,z=lake.z+Math.sin(a)*lake.rz*r;if(pathNear(x,z).d<4.8)continue;shore.ellipsoid(x,t.height(x,z)-.5,z,1.5+R()*2.2,.6+R()*1.3,1.3+R()*2.0,i%3?C.rock:C.moss,7,3);}
 let posts=new G.Geometry(),postD=new G.Geometry(),pillars=[];for(let i=0;i<20;i++){const a=(i/20)*TAU+.1,rad=i%7===0?.77:1.03,x=lake.x+Math.cos(a)*lake.rx*rad,z=lake.z+Math.sin(a)*lake.rz*rad;if(x>5&&Math.abs(z+1360)<28)continue;let y=t.height(x,z),h=17+R()*10;onbashira(posts,postD,x,y,z,h,.83+R()*.35);pillars.push({x,y,z,height:h});}
 out.push(rocks.mesh('mountain:cliff-and-river-rock','architecture',{region:'mountain'}),detail.mesh('waterfall:overlook','architecture',{region:'mountain'}),shore.mesh('wind-lake:shore-rocks','architecture',{region:'mountain'}),posts.mesh('wind-lake:onbashira','architecture',{region:'mountain'}),postD.mesh('wind-lake:onbashira-near','architecture',{region:'mountain',lod:'near'}));
 return {meshes:out,pillars,waterfall:{top:[-510,425.55,-1056],bottom:[-510,246.9,-1017],basis:'P'},rivers};
}
function cablePoint(nodes,t,lane=0){const v=clamp(t,0,.999999)*(nodes.length-1),i=Math.floor(v),u=v-i,a=nodes[i],b=nodes[i+1];return[mix(a[0],b[0],u)+lane,mix(a[1],b[1],u)-4*Math.sin(PI*u),mix(a[2],b[2],u)];}
function buildRopeway(t){const out=[],g=new G.Geometry(),near=new G.Geometry(),nodes=[];
 for(let i=0;i<7;i++){const u=i/6,x=mix(70,252,u),z=mix(-390,-1230,u);nodes.push([x,i===0?71.6:i===6?711.6:Math.max(mix(71.6,711.6,u),t.height(x,z)+22),z]);}
 // Raise anchors until every sagging span is clear of the terrain.
 for(let pass=0;pass<7;pass++)for(let i=0;i<6;i++){for(let j=1;j<30;j++){const u=j/30,p=cablePoint([nodes[i],nodes[i+1]],u),tt=(i+u)/6,clearance=6.1+9*Math.min(1,tt*18,(1-tt)*18),deficit=t.height(p[0],p[2])+clearance-p[1];if(deficit>0){const w=(i>0?1-u:0)+(i<5?u:0),lift=Math.min(90,deficit/Math.max(.04,w)*1.03);if(i>0)nodes[i][1]+=lift;if(i<5)nodes[i+1][1]+=lift;}}}
 for(let i=0;i<nodes.length;i++){const [x,y,z]=nodes[i],base=t.height(x,z);g.box(x,base-.4,z,7,.85,7,C.stone);for(const sg of[-1,1]){g.tube([x+sg*2,base,z],[x+sg*1.2,y,z],.23,C.dark,7);g.tube([x-2,base,z],[x+1.2,y,z],.11,C.wood,5);}g.box(x,y,z,10,.5,1.5,C.dark);for(let s of[-1,1])near.cone(x+s*3,y+.25,z,.6,.6,.24,C.dark,12);}
 for(const lane of[-3,3])for(let i=0;i<6;i++)for(let j=0;j<24;j++)g.tube(cablePoint([nodes[i],nodes[i+1]],j/24,lane),cablePoint([nodes[i],nodes[i+1]],(j+1)/24,lane),.075,C.dark,5);
 for(const station of [{id:'lower',x:70,z:-390,y:65},{id:'upper',x:252,z:-1230,y:705}]){const st=new G.Geometry(),de=new G.Geometry();pavilion(st,de,station.x,station.y,station.z,18,15);st.box(station.x,station.y+.45,station.z,16,.55,13,C.wood);for(let i=0;i<5;i++)st.box(station.x,station.y-.1+i*.21,station.z+11-i*.63,8,.22,.90,C.stone);out.push(st.mesh('ropeway:station-'+station.id,'architecture',{region:'mountain'}),de.mesh('ropeway:station-detail-'+station.id,'architecture',{region:'mountain',lod:'near'}));}
 for(let k=0;k<2;k++){const phase=k===0?.27:.75,lane=k===0?-3:3,p=cablePoint(nodes,phase,lane),cab=new G.Geometry(),gl=new G.Geometry();cab.box(0,-5.7,0,3.8,.24,4.4,C.wood);cab.box(0,-5.5,0,3.7,1.0,4.3,C.red);for(let sx of[-1,1])for(let sz of[-1,1])cab.box(sx*1.7,-4.5,sz*1.99,.16,1.9,.16,C.wood);for(let sz of[-1,1]){cab.box(0,-2.8,sz*2.04,3.8,.18,.15,C.wood);gl.box(0,-4.45,sz*2,3.25,1.6,.05,rgb('#9bbfc0'));}for(let sx of[-1,1])gl.box(sx*1.7,-4.45,0,.04,1.6,3.8,rgb('#9bbfc0'));G.roof(cab,0,-2.66,0,4.6,5.0,.7,C.roof,null,true);cab.tube([0,-2.0,0],[0,0,0],.13,C.dark,6);
 for(const [part,geo]of [['frame',cab],['glass',gl]]){let m=geo.mesh('ropeway:cabin-'+k+'-'+part,'architecture',{region:'mountain',material:part==='glass'?'cableGlass':'matte',motion:{kind:'ropeway',phase,lane,track:nodes},center:p,radius:9});out.push(m);}}
 out.push(g.mesh('ropeway:cables-and-pylons','architecture',{region:'mountain'}),near.mesh('ropeway:hardware','architecture',{region:'mountain',lod:'near'}));return{meshes:out,nodes};}
// Exposed rock ribs break smooth distant slopes with real geometry, not noisy textures.
function buildCrags(t){const out=[],bins=new Map(),r=G.rng(910034);let count=0;
 for(let x=-1460;x<410;x+=24)for(let z=-2010;z<-1080;z+=25){let xx=x+(r()-.5)*16,zz=z+(r()-.5)*16,y=t.height(xx,zz),n=t.normal(xx,zz);if(weight(xx,zz)<.65||y<565||n[1]>.65||n[1]<.19||G.lakeDistance(lake,xx,zz)<1.2||pathNear(xx,zz).d<11||riverNear(xx,zz).d<24||r()<.70)continue;let key=Math.floor(xx/192)+':'+Math.floor(zz/192);if(!bins.has(key))bins.set(key,new G.Geometry());const g=bins.get(key),R=3+r()*4,h=16+r()*17;g.ellipsoid(xx-n[0]*1.5,y-h*.23,zz-n[2]*1.5,R,h,R*.80,blend(C.rock,C.lightRock,.05+r()*.11),8,6);count++;}
 for(const[k,g]of bins)out.push(g.mesh('mountain:crags-'+k,'architecture',{region:'mountain',material:'matte'}));return{meshes:out,count};}
function buildMountain(t){const shrine=buildMoriya(t),water=buildWater(t),routes=buildRoutes(t),trees=buildVegetation(t),cable=buildRopeway(t),crags=buildCrags(t);return{meshes:[...shrine.meshes,...water.meshes,...routes.meshes,...trees.meshes,...cable.meshes,...crags.meshes].filter(m=>m.vertices.length>0),signs:shrine.signs,meta:{basis:'P',version:'0.12.0',cragCount:crags.count,shrine:S,footprints:shrine.footprints,stairs:shrine.treads,paths:routes.stats,rivers:water.rivers,waterfall:water.waterfall,lake:{...lake},lakePillars:water.pillars,treeCount:trees.records.length,treeRecords:trees.records,ropeway:{nodes:cable.nodes,cabins:2,mode:'visual-motion, not passenger simulation'},unfinished:['tengu settlement','rainbow mine','full collision','building interiors']}};}
G.MOUNTAIN={bounds:B,shrine:S,weight,shape:mountainShape,oldHeight,paths,rivers,pathNear,riverNear,cablePoint};G.buildMountain=buildMountain;
Object.assign(G.IMPLEMENTED,{mountain:'mountain',moriya:'moriya',wind_lake:'windLake',waterfall:'mountainFalls',valley:'mountainValley',toad_pond:'mountainPond',ropeway:'ropeway',ropeway_lower:'ropewayLower',ropeway_upper:'ropewayUpper',sea_trees:'mountainTrail'});
})(globalThis.GA);

(function(G){'use strict';
function createWorld(data){const terrain=new G.Terrain(data),catalog={placements:new Map(data.placements.map(x=>[x.id,x]))},regional=G.buildRegionalLandmarks(terrain,catalog),village=G.buildVillage(terrain),hakurei=G.buildHakurei(terrain),trail=G.buildTrail(terrain),scarlet=G.buildScarlet(terrain),mystia=G.buildMystia(terrain),myouren=G.buildMyouren(terrain),mausoleum=G.buildMausoleum(),senkai=G.buildSenkai(),bamboo=G.buildBamboo(terrain),flowerlands=G.buildFlowerlands(terrain),mountain=G.buildMountain(terrain),plants=G.buildVegetation(terrain,{...village,plantSites:[...village.plantSites,...hakurei.plantSites,...trail.plantSites,...scarlet.plantSites,...mystia.plantSites,...myouren.plantSites]},[...regional.footprints,...hakurei.footprints,...trail.footprints,...scarlet.footprints,...mystia.footprints,...myouren.footprints]);
 const meshes=[...terrain.meshes(),...terrain.pathMeshes(),...village.meshes,...regional.meshes,...hakurei.meshes,...trail.meshes,...scarlet.meshes,...mystia.meshes,...plants.meshes,...bamboo.meshes,...flowerlands.meshes,...mountain.meshes,...myouren.meshes,...mausoleum.meshes,...senkai.meshes,...G.buildSection(terrain),...terrain.waterMeshes()];
 const placementMap=new Map(data.placements.map(x=>[x.id,x]));
 let triangles=0,bufferBytes=0;const seen=new Set();for(const m of meshes){triangles+=m.vertices.length/27*(m.instances?m.instances.length/16:1);for(const a of[m.vertices,m.farVertices,m.instances,m.instanceColors])if(a&&!seen.has(a)){seen.add(a);bufferBytes+=a.byteLength;}}
 return{terrain,meshes,village,signs:[...mystia.signs,...scarlet.signs,...myouren.signs,...mausoleum.signs,...senkai.signs,...bamboo.signs,...mountain.signs],expansion:{hakurei:hakurei.meta,trail:trail.meta,scarlet:scarlet.meta,mystia:mystia.meta,myouren:myouren.meta,mausoleum:mausoleum.meta,senkai:senkai.meta,bamboo:bamboo.meta,flowerlands:flowerlands.meta,mountain:mountain.meta},placementMap,treeCount:plants.count+bamboo.meta.bambooCulms+mountain.meta.treeCount,houseCount:village.houses.length,triangles,bufferBytes,seed:30261,version:'0.12.0',sourceBaseline:'0.11.0',data};
}
const fs=G.FLOWERLANDS.sunShape, fl=G.FLOWERLANDS.lilyShape;
const PRESETS={
 moriya:{"label": "守矢神社 · 湖岸与御柱", "region": "moriya", "eye": [-21, 746, -1260], "target": [122, 707, -1360]},
 moriyaFront:{"label": "巨型注连绳与拜殿", "region": "moriya", "eye": [82, 708, -1346], "target": [123, 709, -1360]},
 moriyaTorii:{"label": "鸟居与登殿参道", "region": "moriya", "eye": [20, 689, -1358], "target": [124, 712, -1360]},
 moriyaCourt:{"label": "神社庭院与侧廊", "region": "moriya", "eye": [157, 709, -1296], "target": [126, 706, -1360]},
 windLake:{"label": "风神之湖 · 御柱湖岸", "region": "moriya", "eye": [12, 690, -1308], "target": [-218, 691, -1410]},
 windLakeOverview:{"label": "山上独立湖盆", "region": "moriya", "eye": [-405, 896, -1110], "target": [-145, 695, -1370]},
 mountain:{"label": "妖怪之山 · 层峦与溪谷", "region": "mountain", "eye": [-85, 650, -550], "target": [-576, 609, -1388]},
 mountainFalls:{"label": "九天瀑布 · 飞瀑与枫林", "region": "mountain", "eye": [-292, 408, -727], "target": [-510, 334, -1039]},
 mountainValley:{"label": "阻绝人迹的溪谷", "region": "mountain", "eye": [-250, 216, -702], "target": [-457, 250, -930]},
 mountainTrail:{"label": "瀑侧折返登山道", "region": "mountain", "eye": [-444, 258, -1006], "target": [-510, 303, -1092]},
 mountainPond:{"label": "大蛤蟆之池 · 山腹支路", "region": "mountain", "eye": [-965, 533, -1077], "target": [-989, 521, -1109]},
 mountainRidge:{"label": "山脊上的眺望", "region": "mountain", "eye": [-543, 1440, -1760], "target": [-200, 720, -1370]},
 ropeway:{"label": "守矢索道 · 山间连接", "region": "mountain", "eye": [435, 658, -959], "target": [179, 475, -838]},
 ropewayLower:{"label": "索道下站", "region": "mountain", "eye": [109, 84, -354], "target": [70, 77, -390]},
 ropewayUpper:{"label": "索道上站与湖畔神社", "region": "moriya", "eye": [293, 722, -1183], "target": [252, 713, -1230]},

 sunflower:{label:'太阳花田 · 花海与回环',region:'sunflower',eye:[-522,fs(-522,1341)+15,1341],target:[-610,fs(-610,1179)+1.1,1179]},
 sunflowerPath:{label:'穿过向日葵的小径',region:'sunflower',eye:[-607,fs(-607,1290)+2.8,1290],target:[-651,fs(-651,1206)+2,1206]},
 sunflowerRim:{label:'碗状花田 · 北侧眺台',region:'sunflower',eye:[-750,fs(-748,1024)+4.8,1021],target:[-607,fs(-607,1210)+1.3,1210]},
 sunflowerParasol:{label:'花间歇脚 · 伞下',region:'sunflower',eye:[-575,fs(-575,1146)+3.2,1146],target:[-590,fs(-590,1126)+1.3,1126]},
 sunflowerStage:{label:'夏季演奏会场 · 本作示意',region:'sunflower',eye:[-340,fs(-340,1282)+6,1282],target:[-365,fs(-365,1251)+4,1251]},
 sunflowerOverview:{label:'向南倾斜的花田',region:'sunflower',eye:[-350,fs(-580,1190)+283,1630],target:[-580,fs(-580,1190)+3,1190]},
 nameless:{label:'无名之丘 · 铃兰半坡',region:'nameless',eye:[-1262,fl(-1262,1132)+8.5,1132],target:[-1382,fl(-1382,1032)+1.4,1032]},
 lilyPath:{label:'铃兰间的窄径',region:'nameless',eye:[-1279,fl(-1279,1102)+2.8,1102],target:[-1340,fl(-1340,1054)+.5,1054]},
 lilyClose:{label:'铃兰近看 · 细叶与垂铃',region:'nameless',eye:[-1323,fl(-1323,1070)+1.6,1070],target:[-1328,fl(-1328,1062)+.55,1062]},
 namelessRidge:{label:'风口与山腹花原',region:'nameless',eye:[-1445,fl(-1445,979)+7,979],target:[-1285,fl(-1285,1100)+1,1100]},
 namelessRock:{label:'林边覆苔石座',region:'nameless',eye:[-1238,fl(-1238,1007)+3.8,1007],target:[-1251,fl(-1251,987)+.4,987]},
 flowerLink:{label:'两片花原之间',region:'nameless',eye:[-971,205,1260],target:[-1195,183,1120]},

 bamboo:{label:'迷途竹林 · 竹影深径',region:'bamboo',eye:[428,76.7,944],target:[470,80.8,982]},
 bambooEntry:{label:'入林口 · 从田野到竹海',region:'bamboo',eye:[457,70.8,754],target:[411,73,845]},
 bambooFork:{label:'竹林回环与岔路',region:'bamboo',eye:[440,78.7,957],target:[383,80.0,993]},
 bambooBridge:{label:'浅溪上的木桥',region:'bamboo',eye:[536.9,84.8,1084],target:[526,79,1137]},
 bambooRest:{label:'采笋人的歇脚地',region:'bamboo',eye:[370,81.2,1165],target:[358,78.8,1151]},
 bambooRabbits:{label:'兔群与林间岔径',region:'bamboo',eye:[708,78,1353],target:[713,75,1346]},
 eientei:{label:'竹林深处 · 永远亭院门',region:'bamboo',eye:[688.6,74.6,1510],target:[690,74.4,1421]},
 eienteiGarden:{label:'永远亭 · 庭院与缘廊',region:'bamboo',eye:[710,78.0,1461],target:[664,75.6,1416]},
 bambooOverview:{label:'竹海与隐居的宅邸',region:'bamboo',eye:[1104,471,1890],target:[500,72,1250]},

 mausoleumBridge:{label:'水上横廊与石栏',region:'mausoleum',space:'mausoleum',eye:[338, -36, 463],target:[307, -36, 488]},
 mausoleumCorridor:{label:'临水长廊',region:'mausoleum',space:'mausoleum',eye:[308.6, -38.0, 434],target:[307, -37.9, 532]},
 templeLotus:{label:'山腰莲池',region:'myouren',eye:[417, 103, 313],target:[373, 91, 351]},
 templeAscent:{label:'层台与登山石阶',region:'myouren',eye:[308, 84.8, 339],target:[300, 111, 408]},
 myouren:{label:'命莲寺 · 山寺全景',region:'myouren',eye:[503, 226, 167],target:[305, 86, 419]},
 templeGate:{label:'山门与上山参道',region:'myouren',eye:[302, 49.0, 265],target:[300, 89, 379]},
 templeHall:{label:'正殿与红幡',region:'myouren',eye:[332, 116.7, 388],target:[300, 119, 419]},
 templeBell:{label:'钟楼与庭园',region:'myouren',eye:[391, 119, 377],target:[349, 116, 403]},
 cemetery:{label:'寺后高台墓地',region:'myouren',eye:[376, 150, 467],target:[307, 132, 522]},
 mausoleumEntry:{label:'山壁下的历史入口',region:'myouren',eye:[367, 134, 453],target:[382, 135, 476]},
 mausoleum:{label:'地下水廊与梦殿',region:'mausoleum',space:'mausoleum',eye:[351, -20, 445],target:[307, -30, 524]},
 mausoleumGate:{label:'洞门与百米柱廊',region:'mausoleum',space:'mausoleum',eye:[309, -36.8, 404],target:[307, -37.6, 533]},
 mausoleumPool:{label:'莲池与八角殿',region:'mausoleum',space:'mausoleum',eye:[347, -35, 519],target:[307, -23, 555]},
 senkai:{label:'神灵庙 · 神子的仙界',region:'senkai',space:'senkai',eye:[98,57,137],target:[0,12,-10]},
 senkaiGate:{label:'金瓦三檐与双塔',region:'senkai',space:'senkai',eye:[13,9,77],target:[0,15,0]},
 senkaiCourt:{label:'回廊与莲池',region:'senkai',space:'senkai',eye:[91,11,90],target:[47,9,25]},
 senkaiMausoleum:{label:'迁址后的大祀庙',region:'senkai',space:'senkai',eye:[-38,16,-42],target:[-87,19,-93]},
 templeSection:{label:'山寺—墓地—长廊 · 历史剖面',region:'section',space:'section',eye:[635, 204, 515],target:[308, 44, 468]},
 hakurei:{label:'博丽神社',region:'hakurei',eye:[1562,216,223],target:[1624,184,157]},
 shrineFront:{label:'拜殿与缘侧',region:'hakurei',eye:[1597,187.5,174],target:[1627,185.0,158]},
 shrineGate:{label:'鸟居与参道',region:'hakurei',eye:[1556,185.5,165],target:[1625,185.2,160]},
 shrineGarden:{label:'后庭与仓库',region:'hakurei',eye:[1702,199,221],target:[1650,184,159]},
 shrineSteps:{label:'登山石阶',region:'hakurei',eye:[1444,166,181],target:[1540,178,160]},
 trail:{label:'妖怪兽道',region:'trail',eye:[717,44.5,114],target:[766,37.9,137]},
 trailStream:{label:'柳荫水渠',region:'trail',eye:[852,43.2,203],target:[870,37.3,191]},
 trailCart:{label:'夜雀屋',region:'trail',eye:[1047,54.8,235],target:[1073,46,270]},
 mystiaCounter:{label:'屋台与席位',region:'trail',eye:[1079,46.8,258],target:[1072,45.8,272]},
 mystiaStage:{label:'鸟兽伎乐角',region:'trail',eye:[1102,48.5,255],target:[1088,45.0,270]},
 scarlet:{label:'红魔馆全景',region:'scarlet',eye:[974,224,-447],target:[823,123,-675]},
 scarletGate:{label:'红美铃与铁门',region:'scarlet',eye:[819,114.2,-529],target:[823,123,-684]},
 scarletGarden:{label:'喷泉与蔷薇园',region:'scarlet',eye:[859,125.8,-597],target:[822,118.2,-653]},
 scarletFront:{label:'正门与露台',region:'scarlet',eye:[814,120.8,-677],target:[831,124,-715]},
 scarletClock:{label:'钟楼与屋顶',region:'scarlet',eye:[863,155,-685],target:[829,149,-730]},
 scarletLake:{label:'雾之湖东岸',region:'scarlet',eye:[637,117.2,-552],target:[791,125,-705]},
 scarletTea:{label:'东侧茶庭',region:'scarlet',eye:[923,117,-623],target:[902,112.5,-646]},
 routeOverview:{label:'人里至神社',region:'trail',eye:[880,690,1120],target:[1040,78,195]},
 corner:{label:'茶铺转角',eye:[-47,36.6,31.5],target:[-73.4,33.9,42.3]},
 market:{label:'市集茶庭',eye:[-1,46.8,72.4],target:[-31.0,31.8,23.3]},
 riverside:{label:'河岸总览',eye:[148,88,182],target:[-6,32,10]},
 street:{label:'商店街',eye:[-115,38.1,31],target:[-65,34.5,31]},
 bridge:{label:'石桥与水岸',eye:[76,38.4,109],target:[22,31.5,-26]},
 roofs:{label:'屋顶与庭院',eye:[-116,54,-63],target:[-161,32,-102]},
 fields:{label:'村外田野',eye:[-285,132,440],target:[-64,30,182]},
 panorama:{label:'人里全景',eye:[455,315,574],target:[-5,32,0]},
 overview:{label:'幻想乡全域',eye:[2200,3450,3450],target:[0,110,-210]}
};
Object.assign(G,{createWorld,PRESETS});
})(globalThis.GA);

/* v0.13 — reversible display-only HLOD, roadside transition sample, and atlas cutaway.
 * Logical positions and every v0.12 near mesh remain untouched.
 * This runs in the existing world Worker. No Three.js dependency or network.
 */
(function(G){'use strict';
const CUT={cx:770,cz:546,rx:211,rz:167,round:24,floor:-61,offset:[460,0,0]};
function bounds(a){let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}return{lo,hi};}
function transformInto(out,a,m,col,scale=1){
 for(let i=0;i<a.length;i+=9){let x=a[i]*scale,y=a[i+1],z=a[i+2]*scale;
  const sx=Math.hypot(m[0],m[1],m[2])||1,sy=Math.hypot(m[4],m[5],m[6])||1,sz=Math.hypot(m[8],m[9],m[10])||1;
  let nx=a[i+3]/(sx*sx),ny=a[i+4]/(sy*sy),nz=a[i+5]/(sz*sz),n=G.norm([m[0]*nx+m[4]*ny+m[8]*nz,m[1]*nx+m[5]*ny+m[9]*nz,m[2]*nx+m[6]*ny+m[10]*nz]);
  out.push(m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],...n,a[i+6]*col[0],a[i+7]*col[1],a[i+8]*col[2]);
 }
}
// Vertex clustering is only used for distant architecture; original topology is not edited.
function reduced(a,q){const out=[];for(let i=0;i<a.length;i+=27){let p=[];for(let v=0;v<3;v++)p.push([0,1,2].map(k=>Math.round(a[i+v*9+k]/q)*q));let n=G.cross(G.sub(p[1],p[0]),G.sub(p[2],p[0]));if(G.dot(n,n)<.00001)continue;for(let v=0;v<3;v++)out.push(...p[v],...a.subarray(i+v*9+3,i+v*9+9));}return new Float32Array(out);}
function nearRange(m){if(m.group==='terrain')return 520;if(m.group==='vegetation')return m.flowerKind?215:m.region==='bamboo'?265:410;return 610;}
function family(m){if(m.group==='terrain')return 'terrain';if(m.group==='vegetation')return m.flowerKind==='sunflower'?'sunflower':m.flowerKind==='lily'?'lily':m.region==='bamboo'?'bamboo':'woodland';return 'architecture';}
function makeCoarseTerrain(m,terrain){
 const b=bounds(m.vertices),x0=b.lo[0],z0=b.lo[2],w=b.hi[0]-x0,d=b.hi[2]-z0;if(w<1||d<1)return m.vertices;
 const step=m.id==='peripheral-landscape-P'?256:Math.max(16,Math.min(32,Math.max(w,d)/16));
 const nx=Math.max(1,Math.ceil(w/step)),nz=Math.max(1,Math.ceil(d/step));
 // Irregular original mesh footprints (coarse tiles with cut-outs) must not be filled.
 const occupied=new Set(),S=8;
 for(let i=0;i<m.vertices.length;i+=27){const a=m.vertices;
  const ax=Math.min(a[i],a[i+9],a[i+18]),bx=Math.max(a[i],a[i+9],a[i+18]);
  const az=Math.min(a[i+2],a[i+11],a[i+20]),bz=Math.max(a[i+2],a[i+11],a[i+20]);
  for(let z=Math.floor(az/S);z<Math.ceil(bz/S);z++)for(let x=Math.floor(ax/S);x<Math.ceil(bx/S);x++)occupied.add(x+':'+z);
 }
 const g=new G.Geometry(),point=(x,z)=>{let y=terrain.height(x,z);return{p:[x,y,z],n:terrain.normal(x,z),c:terrain.color(x,z,y,terrain.normal(x,z))};};
 const emit=(vs)=>{for(let v of vs)g.vertex(v.p,v.n,v.c);};
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const X=x0+x*w/nx,Z=z0+z*d/nz,W=w/nx,D=d/nz;
  // Sample original occupancy in subcells: preserve the existing tile's holes exactly.
  let all=true,any=false;for(let zz=Z+S/2;zz<Z+D;zz+=S)for(let xx=X+S/2;xx<X+W;xx+=S){let yes=occupied.has(Math.floor(xx/S)+':'+Math.floor(zz/S));all&&=yes;any||=yes;}
  if(!any)continue;const div=all?1:Math.max(1,Math.ceil(Math.max(W,D)/S));
  for(let j=0;j<div;j++)for(let k=0;k<div;k++){let xa=X+k*W/div,za=Z+j*D/div,xb=xa+W/div,zb=za+D/div;if(!occupied.has(Math.floor((xa+xb)/2/S)+':'+Math.floor((za+zb)/2/S)))continue;
   const a=point(xa,za),b=point(xa,zb),c=point(xb,za),d1=point(xb,zb);emit([a,b,c,c,b,d1]);
  }
 }
 return new Float32Array(g.a);
}
function canopyProxy(m,bamboo=false){const a=m.farVertices||m.vertices,b=bounds(a),h=b.hi[1],rx=Math.max(.3,(b.hi[0]-b.lo[0])*.49),rz=Math.max(.3,(b.hi[2]-b.lo[2])*.49),g=new G.Geometry();let col=[0,0,0],n=0;
 for(let i=0;i<a.length;i+=9)if(a[i+1]>h*.5){for(let k=0;k<3;k++)col[k]+=a[i+6+k];n++;}col=col.map(v=>v/Math.max(1,n));
 if(bamboo){for(let j=0;j<2;j++)g.cone(0,h*(.63+j*.2),0,rx*(1-j*.27),rx*.09,h*.26,col,3);}
 else {g.cone(0,0,0,Math.max(.1,rx*.10),rx*.035,h*.73,[.10,.072,.043],3);if(/pine|cedar|spruce|conifer/.test(m.id)){for(let j=0;j<3;j++)g.cone(0,h*(.27+j*.2),0,rx*(1-j*.23),.02,h*.37,col,4);}else g.ellipsoid((b.lo[0]+b.hi[0])*.5,h*.70,(b.lo[2]+b.hi[2])*.5,rx,h*.31,rz,col,6,2);}
 return new Float32Array(g.a);}
function indexProxy(m){const a=m.vertices,table=new Map(),unique=[],idx=new Uint32Array(a.length/9);let at=0;
 for(let i=0;i<a.length;i+=9){let key='';for(let k=0;k<9;k++)key+=Math.round(a[i+k]*1000)+',';let j=table.get(key);if(j===undefined){j=unique.length/9;table.set(key,j);for(let k=0;k<9;k++)unique.push(a[i+k]);}idx[at++]=j;}
 m.vertices=new Float32Array(unique);m.index=unique.length/9<65536?new Uint16Array(idx):idx;return m;}
function buildHLOD(world){
 const source=world.meshes.slice(),groups=new Map(),out=[],prototypeCache=new Map();let omitted=0;
 for(const m of source){
  if((m.space||'surface')!=='surface'||m.group==='water'||m.group==='effects'||m.motion||m.event||m.id==='peripheral-landscape-P')continue;
  const f=family(m),S=f==='terrain'?512:f==='architecture'?256:192;
  const key=f+':'+(m.region||'world')+':'+Math.floor(m.center[0]/S)+':'+Math.floor(m.center[2]/S);
  let c=groups.get(key);if(!c){c={id:key,sourceIds:[],proxyIds:[],parts:new Map(),center:[0,0,0],radius:0,range:nearRange(m),family:f,lo:[Infinity,Infinity,Infinity],hi:[-Infinity,-Infinity,-Infinity],cells:new Map()};groups.set(key,c);}
  c.sourceIds.push(m.id);m.hlodGroup=key;
  for(let k=0;k<3;k++){c.lo[k]=Math.min(c.lo[k],m.center[k]-m.radius);c.hi[k]=Math.max(c.hi[k],m.center[k]+m.radius);}
  if(m.lod==='near'||m.lod==='props'||m.maxDetailDistance&&m.maxDetailDistance<250){omitted++;continue;}
  // Broad field carpets only at long range. Close flowers remain the real v0.12 plants.
  if(m.flowerKind==='sunflower'||m.flowerKind==='lily'){
   const size=m.flowerKind==='sunflower'?7:5;
   for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14],key=Math.floor(x/size)+':'+Math.floor(z/size);if(!c.cells.has(key))c.cells.set(key,[x,z,size,m.flowerKind]);}continue;
  }
  let material=m.material||'matte';if(m.group==='vegetation')material='foliage';
  let part=c.parts.get(material);if(!part){part={arrays:[],m};c.parts.set(material,part);}
  if(m.group==='terrain'){part.arrays.push(makeCoarseTerrain(m,world.terrain));continue;}
  if(m.instances){
   if(m.material==='bambooStem')continue;
   let a=m.farVertices||m.vertices;
   if(m.id.startsWith('bamboo:leaf:')){if(!prototypeCache.has(a))prototypeCache.set(a,canopyProxy(m,true));a=prototypeCache.get(a);}
   // Ground clutter not visible at this range does not become giant proxy objects.
   else if(m.material==='bambooLeaf'||m.material==='meadowLeaf'||m.material==='matte')continue;
   else if(m.material==='foliage'){if(!prototypeCache.has(a))prototypeCache.set(a,canopyProxy(m));a=prototypeCache.get(a);}
   const flat=[];
   for(let i=0;i<m.instances.length/16;i++)transformInto(flat,a,m.instances.subarray(i*16,i*16+16),m.instanceColors.subarray(i*3,i*3+3));
   if(flat.length)part.arrays.push(new Float32Array(flat));
  }else part.arrays.push(reduced(m.farVertices||m.vertices,m.group==='roads'?.05:m.radius<40?.28:.45));
 }
 for(const c of groups.values()){
  if(c.cells.size){const g=new G.Geometry();for(const[x,z,size,kind]of c.cells.values()){
   const h=world.terrain.height(x,z)+(kind==='sunflower'?1.65:.35),base=kind==='sunflower'?G.rgb('#999d32'):G.rgb('#879b69'),r=size*.65;
   for(let k=0;k<6;k++){let a=k*Math.PI/3,b=(k+1)*Math.PI/3,pa=[x+Math.cos(a)*r,0,z+Math.sin(a)*r],pb=[x+Math.cos(b)*r,0,z+Math.sin(b)*r];pa[1]=world.terrain.height(pa[0],pa[2])+(kind==='sunflower'?1.6:.3);pb[1]=world.terrain.height(pb[0],pb[2])+(kind==='sunflower'?1.6:.3);g.tri([x,h,z],pb,pa,base);}
  }c.parts.set(c.family==='sunflower'?'fieldSunProxy':'fieldLilyProxy',{arrays:[new Float32Array(g.a)],m:{group:'vegetation',region:c.family==='sunflower'?'sunflower':'nameless'}});}
  for(const[material,p]of c.parts){const n=p.arrays.reduce((s,a)=>s+a.length,0);if(!n)continue;const a=new Float32Array(n);let at=0;for(const b of p.arrays){a.set(b,at);at+=b.length;}
   const box=bounds(a),center=box.lo.map((v,k)=>(v+box.hi[k])/2),m={id:'hlod:'+c.id+':'+material,group:p.m.group==='terrain'?'terrain':p.m.group==='vegetation'?'vegetation':'architecture',region:p.m.region,space:'surface',vertices:a,center,radius:G.length(G.sub(box.hi,box.lo))/2,material,hlodProxy:true,hlodGroup:c.id,basis:'P: distant representation, not a new location'};
   indexProxy(m);c.proxyIds.push(m.id);out.push(m);
  }
  c.center=c.lo.map((v,k)=>(v+c.hi[k])/2);c.radius=G.length(G.sub(c.hi,c.lo))/2;
  delete c.parts;delete c.cells;
 }
 world.meshes.push(...out);world.hlod={clusters:[...groups.values()],proxyCount:out.length,proxyTriangles:out.reduce((s,m)=>s+m.index.length/3,0),sourceCount:source.length,omittedDetailRecords:omitted,hysteresis:.12};
}
function buildTransition(terrain){
 const meshes=[],g=new G.Geometry(),stones=new G.Geometry(),rr=G.rng(13013);let sections=0;
 const r=G.routes.find(r=>r.id==='route-shrine');
 for(let i=0;i<r.samples.length-1;i++){
  let a=r.samples[i],b=r.samples[i+1];if(a[0]<315||a[0]>704)continue;
  const dir=G.norm([b[0]-a[0],0,b[1]-a[1]]),normal=[-dir[2],dir[0]],outer=r.width/2+2.0+G.noise(a[0]/28,a[1]/28)*2.5;
  const pt=(p,side,w)=>{let x=p[0]+normal[0]*w*side,z=p[1]+normal[1]*w*side;return[x,terrain.height(x,z)+.08,z];};
  for(const side of[-1,1]){const p0=pt(a,side,r.width/2),p1=pt(b,side,r.width/2),p2=pt(b,side,outer),p3=pt(a,side,outer),col0=G.rgb('#aa9f7e'),col2=terrain.color(p2[0],p2[2],p2[1]);const points=side===1?[p0,p1,p2,p0,p2,p3]:[p0,p2,p1,p0,p3,p2];
   for(const p of points)g.vertex(p,terrain.normal(p[0],p[2]),p===p0||p===p1?col0:col2);
   if(rr()<.28){const p=pt(a,side,outer+.7);stones.ellipsoid(p[0],p[1]-.15,p[2],.35+rr()*.5,.2+rr()*.2,.35+rr()*.6,G.rgb('#838b72'),5,2);}
  }sections++;
 }
 if(g.a.length)meshes.push(g.mesh('transition:shrine-road-shoulders','roads',{material:'ground',region:'trail',basis:'P',lod:'base'}));
 if(stones.a.length)meshes.push(stones.mesh('transition:shrine-road-pebbles','architecture',{material:'matte',region:'trail',basis:'P',lod:'props'}));
 return{meshes,sections};
}
function cutBoundary(t){const N=80,pts=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);const x=CUT.cx+Math.sign(c)*Math.pow(Math.abs(c),.5)*CUT.rx,z=CUT.cz+Math.sign(s)*Math.pow(Math.abs(s),.5)*CUT.rz;pts.push([x,t.height(x,z),z]);}return pts;}
function buildCutaway(t){const g=new G.Geometry(),p=cutBoundary(t);for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];for(let k=0;k<4;k++){const ya=G.mix(CUT.floor,a[1],k/4),yb=G.mix(CUT.floor,b[1],k/4),za=G.mix(CUT.floor,a[1],(k+1)/4),zb=G.mix(CUT.floor,b[1],(k+1)/4);g.quad([a[0],ya,a[2]],[b[0],yb,b[2]],[b[0],zb,b[2]],[a[0],za,a[2]],G.rgb(['#66736b','#788478','#8d9782','#a0a98c'][k]));}g.tri([CUT.cx,CUT.floor,CUT.cz],[b[0],CUT.floor,b[2]],[a[0],CUT.floor,a[2]],G.rgb('#465d57'));}
 return g.mesh('atlas:cutaway-earth-shell','architecture',{material:'cave',space:'atlas',region:'atlas',basis:'P: diagram cut, geological bands are illustrative'});
}
const original=G.createWorld;
function optimizedWorld(data){const w=original(data),transition=buildTransition(w.terrain);w.meshes.push(...transition.meshes);buildHLOD(w);w.meshes.push(buildCutaway(w.terrain));
 w.version='0.13.0';w.sourceBaseline='0.12.0';w.optimization={version:'0.13',mode:'spatial-HLOD + lazy GPU residency',nearGeometryUnchanged:true,logicalPositionsUnchanged:true,transitionSections:transition.sections,cutaway:{...CUT,note:'TH13 historical underground moved sideways for display only; no heaven geometry is claimed.'}};
 const seen=new Set();w.bufferBytes=0;for(let m of w.meshes)for(let a of[m.vertices,m.farVertices,m.instances,m.instanceColors,m.index])if(a&&!seen.has(a)){seen.add(a);w.bufferBytes+=a.byteLength;}
 return w;
}
G.SPACE_INFO.atlas={label:'全域开窗 · 历史关系展陈',era:'th13-diagram-offset',floor:-65};
G.PRESETS.atlasCutaway={label:'地表与地下 · 开窗展陈',region:'atlas',space:'atlas',eye:[1215,610,1295],target:[595,38,429]};
G.PRESETS.atlasCave={label:'观察窗 · 地下长廊',region:'atlas',space:'atlas',eye:[932,255,783],target:[762,-20,521]};
G.PRESETS.transitionRoad={label:'村外路肩 · 林缘过渡样段',region:'trail',eye:[401,70,156],target:[506,55,119]};
Object.assign(G,{createWorld:optimizedWorld,ATLAS_CUT:CUT});
})(globalThis.GA);

/* v0.14: authored display boundaries. All coordinates are project coordinates,
 * not canonical geography. Independent/historical display transforms never
 * modify source geometry. No scene construction is performed by this module. */
(function(G){'use strict';
const blocks=[
 {id:'village',name:'人间之里',poly:[[-336,-277],[-138,-309],[-45,-292],[-27,-455],[46,-455],[48,-300],[235,-301],[334,-208],[315,213],[244,361],[45,444],[-199,426],[-335,278],[-352,1]],bottom:0,step:5,center:[0,35,0]},
 {id:'hakurei',name:'博丽神社',poly:[[1448,144],[1538,133],[1549,94],[1606,77],[1676,81],[1721,120],[1724,205],[1675,249],[1587,243],[1543,213],[1533,181],[1448,176]],bottom:126,step:2.5,center:[1610,184,160]},
 {id:'trail',name:'妖怪兽道 · 夜雀屋',poly:[[282,-2],[465,8],[663,64],[827,106],[935,159],[1035,210],[1125,217],[1268,236],[1374,203],[1418,145],[1438,137],[1438,181],[1412,251],[1336,329],[1190,331],[1090,322],[995,293],[874,252],[798,211],[670,164],[480,101],[281,69]],bottom:3,step:7,center:[912,53,190]},
 {id:'scarlet',name:'雾之湖 · 红魔馆',poly:[[115,-786],[166,-918],[353,-1009],[560,-985],[723,-900],[943,-872],[1012,-792],[1005,-612],[967,-481],[833,-423],[629,-449],[472,-457],[267,-504],[137,-622]],bottom:28,step:6,center:[615,116,-712]},
 {id:'myouren',name:'命莲寺 · 寺后墓地',poly:[[241,235],[337,228],[443,268],[504,348],[491,460],[474,582],[396,645],[230,636],[153,554],[140,428],[187,324]],bottom:7,step:3,center:[315,91,424]},
 {id:'bamboo',name:'迷途竹林 · 永远亭',poly:[[321,759],[547,725],[799,848],[964,1059],[1039,1295],[966,1553],[757,1746],[473,1770],[219,1638],[28,1436],[-37,1210],[36,1000],[171,845]],bottom:13,step:7,center:[500,75,1250]},
 {id:'forest',name:'魔法森林',poly:[[-527,55],[-603,147],[-716,171],[-830,365],[-1110,441],[-1441,310],[-1627,146],[-1666,-135],[-1480,-423],[-1202,-533],[-924,-449],[-798,-202],[-684,-78],[-540,-58]],bottom:8,step:6,center:[-1070,68,-54]},
 {id:'sunflower',name:'太阳花田',poly:[[-886,1003],[-729,855],[-483,869],[-252,1004],[-183,1189],[-276,1402],[-491,1515],[-716,1480],[-941,1290],[-957,1107]],bottom:35,step:6,center:[-580,80,1190]},
 {id:'nameless',name:'无名之丘',poly:[[-1592,883],[-1416,803],[-1220,857],[-1061,1012],[-1077,1199],[-1223,1320],[-1462,1284],[-1632,1092]],bottom:57,step:5,center:[-1330,184,1050]},
 {id:'mountain',name:'妖怪之山 · 守矢与风神之湖',poly:[[-1521,-1960],[-1218,-2180],[-713,-2290],[-205,-2242],[294,-2086],[608,-1762],[604,-1553],[525,-1328],[350,-1148],[225,-877],[207,-646],[207,-331],[53,-314],[-151,-442],[-341,-467],[-385,-431],[-543,-425],[-660,-553],[-702,-696],[-979,-846],[-1265,-1083],[-1617,-1457],[-1713,-1721]],bottom:12,step:12,center:[-505,525,-1360]},
 {id:'muenzuka',name:'无缘塚 · 区域预览',poly:[[-1847,506],[-1758,450],[-1638,490],[-1595,597],[-1695,677],[-1839,645]],bottom:24,step:8,center:[-1730,70,575]},
 {id:'genbu',name:'玄武涧 · 区域预览',poly:[[-1108,-666],[-1003,-727],[-896,-690],[-858,-568],[-964,-493],[-1087,-546]],bottom:21,step:8,center:[-980,150,-610]},
 {id:'mausoleum',name:'地下大祀庙 · TH13历史',poly:[[197,371],[276,341],[405,373],[432,494],[392,603],[245,634],[188,556]],bottom:-58,step:6,space:'mausoleum',center:[307,-34,498]},
 {id:'senkai',name:'神灵庙 · 独立仙界',poly:[[-249,-188],[-221,-239],[216,-239],[249,-181],[249,165],[211,221],[-211,221],[-249,165]],bottom:-13,step:5,space:'senkai',center:[0,6,-10]}
];
const map=new Map(blocks.map(b=>[b.id,b]));
function inside(poly,x,z){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function owner(x,z){for(const b of blocks)if(!b.space&&inside(b.poly,x,z))return b.id;return null;}
function regionOf(v){const p=G.PRESETS[v];const r=p?.region||(['overview','atlasCutaway','atlasCave'].includes(v)?'world':'village');return r==='moriya'?'mountain':r==='section'||r==='atlas'?'mausoleum':r;}
function transform(id,mode='focus',aligned=false){const b=map.get(id);if(mode!=='atlas'||!b?.space)return {scale:1,offset:[0,0,0]};
 if(id==='mausoleum'){if(aligned)return {scale:1,offset:[0,0,0]};return {scale:2.05,offset:[1495-307*2.05,-212+34*2.05,854-498*2.05]};}
 return {scale:2.2,offset:[1650,642,-740]};}
function point(p,id,mode,aligned){const t=transform(id,mode,aligned);return p.map((v,i)=>v*t.scale+t.offset[i]);}
function inverse(p,id,mode,aligned){const t=transform(id,mode,aligned);return p.map((v,i)=>(v-t.offset[i])/t.scale);}
G.DIORAMA={blocks,map,inside,owner,regionOf,transform,point,inverse};
G.senkaiDisplayGround=function(){const height=(x,z)=>-.16+Math.max(0,Math.hypot(x/190,z/170)-.65)*2;return{height,normal:(x,z)=>G.norm([height(x-.1,z)-height(x+.1,z),.2,height(x,z-.1)-height(x,z+.1)]),color:()=>G.rgb('#899c89')};};
G.PRESETS.shrineDiorama={label:'博丽神社 · 微缩展陈',region:'hakurei',eye:[1506,253,290],target:[1618,183,165]};
G.PRESETS.shrineSite={label:'完整地形块',region:'hakurei',eye:[1425,333,386],target:[1597,179,165]};
G.PRESETS.shrineDioramaBack={label:'后庭与切面',region:'hakurei',eye:[1788,249,289],target:[1631,177,162]};
G.PRESETS.shrineDioramaSide={label:'石阶与岩土底座',region:'hakurei',eye:[1462,158,363],target:[1603,174,165]};
G.PRESETS.diorama={label:'幻想乡 · 全域立体沙盘',region:'world',space:'surface',eye:[3180,2410,4160],target:[40,253,-366]};
G.PRESETS.dioramaLayers={label:'地表、历史地下与独立仙界',region:'world',space:'surface',eye:[2900,1280,2760],target:[930,129,54]};
G.PRESETS.continuous={label:'连续地表 · 位置校核',region:'world',eye:[2200,3450,3450],target:[0,110,-210]};
G.PRESETS.overview=G.PRESETS.diorama;
G.REGION_LABELS=Object.fromEntries(blocks.map(b=>[b.id,b.name]));
})(globalThis.GA);

/* Regular-cell terrain clipped to authored polygons, with matching closed sides.
 * CPU clips unused plain away. Not transparent full-world terrain. */
(function(G){'use strict';
function clip(poly,axis,value,greater){let o=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ina=greater?a[axis]>=value:a[axis]<=value,inb=greater?b[axis]>=value:b[axis]<=value;if(ina)o.push(a);if(ina!==inb){let t=(value-a[axis])/(b[axis]-a[axis]);o.push([G.mix(a[0],b[0],t),G.mix(a[1],b[1],t)]);}}return o;}
function cell(poly,x,z,step){let p=poly;for(const [ax,v,ge]of[[0,x,true],[0,x+step,false],[1,z,true],[1,z+step,false]]){p=clip(p,ax,v,ge);if(p.length<3)return [];}return p;}
function top(terrain,b,step,overview=false){const g=new G.Geometry(),xs=b.poly.map(p=>p[0]),zs=b.poly.map(p=>p[1]),minX=Math.floor(Math.min(...xs)/step)*step,maxX=Math.max(...xs),minZ=Math.floor(Math.min(...zs)/step)*step,maxZ=Math.max(...zs);let cache=new Map();
 const v=p=>{const key=p[0].toFixed(5)+':'+p[1].toFixed(5);if(cache.has(key))return cache.get(key);let h=terrain.height(...p),n=terrain.normal(...p),c=terrain.color(p[0],p[1],h,n);if(b.id==='forest')c=G.blend(c,G.rgb('#465b4c'),.40);const v={p:[p[0],h,p[1]],n,c};cache.set(key,v);return v;};
 for(let z=minZ;z<maxZ;z+=step)for(let x=minX;x<maxX;x+=step){let p=cell(b.poly,x,z,step);if(p.length<3)continue;for(let i=1;i<p.length-1;i++){let vs=[v(p[0]),v(p[i]),v(p[i+1])];if(G.cross(G.sub(vs[1].p,vs[0].p),G.sub(vs[2].p,vs[0].p))[1]<0)vs=[vs[0],vs[2],vs[1]];vs.forEach(v=>g.vertex(v.p,v.n,v.c));}}
 return g.mesh((overview?'overview:':'detail:')+b.id+':terrain','terrain',{owner:b.id,region:b.id,space:b.space||'surface',overview,material:b.id==='mountain'?'mountainTerrain':'ground',component:'terrain'});}
function shell(terrain,b,step){const g=new G.Geometry(),rim=new G.Geometry();const col=[G.rgb('#696858'),G.rgb('#555d5b'),G.rgb('#414952')],base=G.rgb('#27303b');
 // Edge breakpoints coincide with the clipped top grid, including cell crossings.
 let edges=[];for(let i=0;i<b.poly.length;i++){const a=b.poly[i],bb=b.poly[(i+1)%b.poly.length],ts=[0,1];for(let ax=0;ax<2;ax++){if(Math.abs(bb[ax]-a[ax])<1e-8)continue;for(let v=Math.ceil(Math.min(a[ax],bb[ax])/step)*step;v<Math.max(a[ax],bb[ax]);v+=step){let t=(v-a[ax])/(bb[ax]-a[ax]);if(t>1e-6&&t<1-1e-6)ts.push(t);}}ts.sort((a,b)=>a-b);for(let j=0;j<ts.length-1;j++)edges.push([ts[j],ts[j+1]].map(t=>[G.mix(a[0],bb[0],t),G.mix(a[1],bb[1],t)]));}
 for(const [a,c]of edges){const ha=terrain.height(...a),hc=terrain.height(...c),ya=[ha,Math.max(b.bottom+2,ha-2.7),Math.max(b.bottom+1,ha-10),b.bottom],yc=[hc,Math.max(b.bottom+2,hc-2.7),Math.max(b.bottom+1,hc-10),b.bottom];for(let k=0;k<3;k++)g.quad([a[0],ya[k],a[1]],[c[0],yc[k],c[1]],[c[0],yc[k+1],c[1]],[a[0],ya[k+1],a[1]],G.blend(col[k],G.rgb('#7a725d'),k===0?.10:.025));rim.quad([a[0],b.bottom,a[1]],[c[0],b.bottom,c[1]],[c[0],b.bottom-3.5,c[1]],[a[0],b.bottom-3.5,a[1]],base);}
 // Bottom triangulation clipped cell-by-cell handles concave outlines (no fan outside boundary).
 const xs=b.poly.map(p=>p[0]),zs=b.poly.map(p=>p[1]),ss=Math.max(step,24);for(let x=Math.floor(Math.min(...xs)/ss)*ss;x<Math.max(...xs);x+=ss)for(let z=Math.floor(Math.min(...zs)/ss)*ss;z<Math.max(...zs);z+=ss){const p=cell(b.poly,x,z,ss);for(let i=1;i<p.length-1;i++)rim.tri([p[0][0],b.bottom-3.5,p[0][1]],[p[i][0],b.bottom-3.5,p[i][1]],[p[i+1][0],b.bottom-3.5,p[i+1][1]],base);}
 return [g.mesh('display:'+b.id+':earth','architecture',{owner:b.id,region:b.id,space:b.space||'surface',displayOnly:true,material:'cutEarth'}),rim.mesh('display:'+b.id+':rim','architecture',{owner:b.id,region:b.id,space:b.space||'surface',displayOnly:true,material:'plinth'})];}
function sliceTriangles(m,ownerFn){const groups=new Map(),a=m.vertices,ix=m.index;let count=ix?ix.length:a.length/9;for(let i=0;i<count;i+=3){const ids=[0,1,2].map(k=>(ix?ix[i+k]:i+k)*9),x=ids.reduce((s,v)=>s+a[v],0)/3,z=ids.reduce((s,v)=>s+a[v+2],0)/3,id=ownerFn(x,z);if(!id)continue;if(!groups.has(id))groups.set(id,[]);let ar=groups.get(id);for(let k of ids)for(let c=0;c<9;c++)ar.push(a[k+c]);}return [...groups].map(([owner,a])=>{const g=new G.Geometry();g.a=a;return g.mesh('overview:'+owner+':'+m.id,m.group,{owner,overview:true,region:owner,space:m.space||'surface',material:m.material,event:m.event,component:'architecture'});});}
Object.assign(G,{dioramaTerrain:top,dioramaShell:shell,partitionTriangles:sliceTriangles});
})(globalThis.GA);

/* v0.14 reconstructed_from_agreed_scope — NOT recovered v0.10 code.
 * Forest, Kourindou, Alice's house and Marisa's house. Authored exterior
 * interpretations; paths, working corners and back elevations are P additions. */
(function(G){'use strict';const{rgb,blend,mix,smooth}=G,C=G.C,TAU=Math.PI*2;
const pads=[{id:'kourindou',x:-560,z:0,y:45,w:62,d:59},{id:'alice',x:-1140,z:-260,y:85,w:71,d:69},{id:'marisa',x:-1000,z:140,y:70,w:63,d:58}];
const paths=[
{id:'forest-entry',width:4.6,points:[[-527,55],[-549,33],[-589,28],[-657,17],[-736,-23],[-827,-65]]},
{id:'forest-alice',width:3.3,points:[[-827,-65],[-930,-103],[-1024,-132],[-1114,-184],[-1140,-221],[-1140,-241]]},
{id:'forest-marisa',width:3.2,points:[[-827,-65],[-842,19],[-887,87],[-944,141],[-972,157],[-1000,156]]},
{id:'forest-loop',width:2.3,points:[[-930,-103],[-1036,-39],[-1210,-8],[-1310,-96],[-1300,-191],[-1238,-230],[-1140,-221]]},
{id:'forest-mushroom',width:2.1,points:[[-1036,-39],[-1081,10],[-1093,56],[-1090,96],[-1025,130],[-1000,156]]},
{id:'forest-oak',width:2.3,points:[[-1210,-8],[-1262,54],[-1291,114],[-1265,142]]},
{id:'forest-boardwalk',width:2.0,points:[[-887,87],[-911,39],[-967,12],[-1005,-24],[-1036,-39]]}
].map(p=>({...p,samples:G.spline(p.points,4),basis:'P'}));
const baseHeight=G.Terrain.prototype.height,baseColor=G.Terrain.prototype.color;
function weight(x,z){return 1-smooth(.65,1.10,Math.hypot((x+1080)/520,(z+70)/415));}
function padWeight(x,z,p){return 1-smooth(0,16,Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2));}
G.Terrain.prototype.height=function(x,z){let h=baseHeight.call(this,x,z),w=weight(x,z);if(w)h+=w*(1.25*Math.sin(x*.021+z*.016)+1.10*Math.sin(z*.047));for(const p of pads){const q=padWeight(x,z,p);if(q)h=mix(h,p.y,q);}return h;};
G.Terrain.prototype.color=function(x,z,h,n){const c=baseColor.call(this,x,z,h,n),w=weight(x,z);return w?blend(c,rgb('#55634e'),w*.48):c;};
function routeDistance(x,z){let d=1e9;for(const p of paths)for(let i=0;i<p.samples.length-1;i++){let a=p.samples[i],b=p.samples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],t=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);d=Math.min(d,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)-p.width/2);}return d;}
function lathe(g,x,y,z,rad,h,col,rings=7){const pts=[];for(let j=0;j<=rings;j++){const t=j/rings,rr=rad*(.6+.38*Math.sin(Math.PI*t));pts.push([rr,y+h*t]);}for(let j=0;j<rings;j++)for(let i=0;i<12;i++){let a=i*TAU/12,b=(i+1)*TAU/12,p=(aa,k)=>[x+Math.cos(aa)*pts[k][0],pts[k][1],z+Math.sin(aa)*pts[k][0]];g.quad(p(a,j),p(b,j),p(b,j+1),p(a,j+1),col);}}
function mushroom(g,x,y,z,s=1,col=rgb('#ba8057')){g.cone(x,y,z,.055*s,.035*s,.45*s,C.cream,6);g.ellipsoid(x,y+.48*s,z,.35*s,.13*s,.32*s,col,10,4);g.ellipsoid(x,y+.431*s,z,.32*s,.025*s,.29*s,C.cream,8,2);}
function roundWindow(g,x,y,z,r,col){g.ellipsoid(x,y,z,r,r,.08,C.woodDark,20,6);g.ellipsoid(x,y,z+.07,r*.84,r*.84,.06,col,20,6);g.box(x,y-r,z+.15,.065,r*2,.09,C.timber);g.box(x,y-.035,z+.15,r*2,.07,.09,C.timber);}
function garden(g,x,y,z,w,d,R){g.box(x,y-.15,z,w,.35,d,rgb('#68784f'));for(let i=0;i<14;i++){const X=x+(R()-.5)*w*.88,Z=z+(R()-.5)*d*.88;g.ellipsoid(X,y+.28,Z,.38,.43,.34,rgb('#62884f'),7,3);if(i%3===0)g.ellipsoid(X,y+.58,Z,.23,.12,.20,rgb('#c7a4be'),8,3);}}
function buildingPack(id,terrain){const p=pads.find(p=>p.id===id),bank=new G.BatchBank(),get=(mat='matte',lod='base')=>bank.get(p.x,p.z,mat,lod).place(p.x,p.y,p.z),wall=get(),roof=get('roof'),fine=get('matte','near'),wood=get('timber'),paper=get('forestPaper'),R=G.rng(id==='alice'?51221:id==='marisa'?70124:81433),signs=[];
 if(id==='kourindou'){
  wall.box(-5,-.45,0,23,.95,18,C.base);wall.box(-5,.5,-1,22,5.65,16,C.plaster);wood.box(-5,.8,7.1,23,1.0,.22,C.woodDark);
  for(let x=-15;x<7;x+=2.8){wood.box(x,.48,7.22,.22,5.8,.27,C.wood);if(x<-7||x>1)G.windowPanel(wall,x+1.1,2.2,7.3,2.1,2.7,0,C.paper);}
  wall.box(-4,.61,7.48,5.6,4.3,.12,C.shadow);wood.box(-4,4.55,7.61,5.5,.2,.28,C.timber);
  // Deep open merchandise bay and work table, visible through the front.
  for(let j=0;j<3;j++){wood.box(-4,1.2+j*.95,7.76,4.7,.12,1.0,C.timber);for(let i=0;i<7;i++)fine.box(-6+i*.59,1.32+j*.95,7.88,.36,.38+(i%3)*.12,.40,rgb(['#8b785e','#5b746f','#a0987d'][i%3]));}
  G.roof(roof,-5,6.15,-1,26,22,4.2,C.slate,fine,true);
  wood.box(-5,.4,10.4,26,.34,5.7,C.woodDark);for(let x=-17.5;x<8;x+=.6)fine.box(x,.75,10.4,.54,.08,5.7,C.timber);
  for(let x of[-17.2,7.2])wood.box(x,.7,11.8,.3,3.75,.3,C.wood);G.roof(roof,-5,4.28,10,27,7.7,1.05,C.slate,fine,false);
  // White kura behind the shop; connecting covered passage remains physically separate.
  wall.box(15,-.5,-7,11,.9,14,C.base);wall.box(15,.4,-7,10.5,8.0,13.4,rgb('#dfdfd0'));
  for(let y of[2.1,4.45,7.2])wall.box(15,y,-.24,10.5,.08,.07,C.stone);
  G.roof(roof,15,8.4,-7,13.1,16.0,3.45,C.slate,fine,false);wood.box(15,.46,-.17,3.2,4.3,.15,C.woodDark);G.windowPanel(wall,15,5.65,-.04,2.1,1.6,0,C.shadow);
  wood.box(7.7,.5,1,8.3,.25,4.5,C.timber);for(let x of[4,11])wood.box(x,.75,2.85,.2,3.25,.2,C.wood);G.roof(roof,7.6,3.95,1,9.2,5.7,1.2,C.slate,null);
  // Selected everyday relics: barrels, wheel, parasols and stacks. Not uniform litter.
  for(let i=0;i<3;i++)lathe(wood,-17.3+i*1.5,.55,10.5,.47,.93,C.timber);
  fine.tube([6.5,1.2,10],[6.5,1.2,10.2],1.13,C.woodDark,24);for(let i=0;i<8;i++)fine.tube([6.5,1.2,10.3],[6.5+Math.cos(i*TAU/8),1.2+Math.sin(i*TAU/8),10.3],.048,C.timber,5);
  for(let i=0;i<3;i++){const x=2+i*.7;fine.tube([x,.8,10.8],[x-.2,3.2,10.7],.035,C.timber,5);fine.cone(x-.2,2.2,10.7,.36,.05,1.0,rgb('#898371'),9);}
  signs.push({text:'香霖堂',position:[p.x-5,p.y+3.58,p.z+13.25],width:4.3,height:1.0,background:'#473c31',color:'#e9deba',region:'forest'});
 }else if(id==='alice'){
  wall.box(0,-.5,0,21,.95,16.7,C.base);wall.box(0,.45,0,19.5,9.1,15.4,rgb('#dcd8c9'));
  for(let y of[.8,4.7,9.05])wood.box(0,y,7.78,20.2,.23,.18,rgb('#78858a'));
  // Quoin corners and inset windows on every visible facade.
  for(const sx of[-1,1])for(const sz of[-1,1])for(let y=.6;y<9.4;y+=.62)wall.box(sx*9.73,y,sz*7.7,.44,.32,.4,rgb('#b6b8ae'));
  for(let y of[1.7,6.0])for(const x of[-6.1,0,6.1]){if(y<2&&x===0)continue;G.windowPanel(paper,x,y,7.86,2.8,2.35,0,rgb('#e4cf9e'));for(let sx of[-1,1])wood.box(x+sx*1.80,y-.06,8.02,.65,2.54,.12,rgb('#536c7b'));wall.box(x,y-.30,8.10,3.2,.19,.70,C.stoneLight);}
  for(let sx of[-1,1])for(let zz of[-4,2])for(let y of[1.7,6])G.windowPanel(paper,sx*9.87,y,zz,2.3,2.4,sx*Math.PI/2,rgb('#dec798'));
  for(let x of[-5,5])G.windowPanel(paper,x,6.0,-7.82,2.8,2.4,Math.PI,rgb('#dec798'));
  G.roof(roof,0,9.65,0,23.5,19.0,5.1,rgb('#3b5368'),fine,true);
  // Small side tower, not a second large castle.
  wall.cone(12.2,.4,-3,3.9,3.9,12.7,rgb('#cdd0c5'),8);wall.cone(12.2,12.7,-3,4.25,4.25,.37,rgb('#869798'),8);roof.cone(12.2,13.05,-3,5.0,.20,6.2,rgb('#385069'),8);roof.cone(12.2,19.1,-3,.24,.01,1.1,rgb('#9c935f'),10);
  G.windowPanel(paper,12.2,8.8,1.01,1.8,2.3,0,rgb('#dfcb9d'));roundWindow(paper,12.2,5.1,1.07,.88,rgb('#daccaa'));
  wood.box(0,.5,9.7,7.6,.3,4.3,C.timber);wall.box(0,.8,7.85,2.25,3.75,.24,rgb('#466274'));
  for(const x of[-3.0,3.0]){wall.box(x,.73,11.4,.46,3.15,.46,C.plaster);wood.box(x,3.8,11.4,.72,.25,.72,rgb('#829799'));}G.roof(roof,0,4.05,10,8.8,6.3,2.0,rgb('#3b5368'),fine);
  for(let i=0;i<4;i++)wall.box(0,i*.20,13.3-i*.63,4.8,.21,.70,C.stoneLight);
  for(const x of[-13.6,13.6])garden(wall,x,.1,16,6.2,5.0,R);
  for(let x=-26;x<27;x+=2.5){if(Math.abs(x)<4)continue;wall.box(x,.02,27.6,2.4,.68,.55,rgb('#a4aa96'));wood.box(x,.68,27.6,.14,.80,.15,rgb('#788b7b'));wood.box(x,1.3,27.6,2.55,.14,.16,rgb('#788b7b'));}
  for(let z=-28;z<28;z+=2.5)for(let sx of[-1,1])wall.box(sx*29,.02,z,.55,.64,2.42,rgb('#a4aa96'));
  for(let z=14;z<28;z+=1.8)wall.box(0,.04,z,3.6,.12,1.45,C.stoneLight);
  // Clearly miniature workbench dolls, not canonical character portraits.
  wood.box(-21,.0,-9,4.5,1.3,2.1,C.wood);wood.box(-21,1.3,-9,5.0,.14,2.4,C.timber);
  for(let i=0;i<3;i++){const x=-22.3+i*1.3;fine.cone(x,1.46,-9,.22,.13,.38,rgb('#668296'),8);fine.ellipsoid(x,2.01,-9,.13,.15,.13,C.paper,8,4);fine.box(x,1.46,-9,.40,.02,.28,C.woodDark);}
  for(let sx of[-1,1])wood.box(-21+sx*3.2,0,-9,.21,3.6,.21,C.timber);G.roof(roof,-21,3.6,-9,8,5,1.25,rgb('#566871'),fine);
 }else{
  wall.box(0,-.4,0,18.7,.85,16,C.base);wall.box(0,.45,0,17.6,7.25,14.6,rgb('#aa9d81'));
  for(let sx of[-1,1])wood.box(sx*8.45,.43,7.40,.32,7.3,.32,C.woodDark);for(let y of[.7,3.9,7.38])wood.box(0,y,7.4,17.6,.28,.25,C.woodDark);
  for(let x of[-5.8,5.8]){G.windowPanel(paper,x,1.9,7.5,3.0,2.0,0,rgb('#bcb28b'));G.windowPanel(paper,x,4.8,7.5,2.4,1.9,0,rgb('#c0b592'));}
  for(let sx of[-1,1])for(let z of[-3.6,3.6])G.windowPanel(paper,sx*8.90,2.1,z,2.3,2.0,sx*Math.PI/2,rgb('#bcb28b'));
  wall.box(0,.65,7.52,2.4,3.0,.18,C.woodDark);G.roof(roof,0,7.76,0,21,18.5,7.0,rgb('#5d525b'),fine,false);
  // Offset dormer and chimney break the silhouette of the steep roof.
  wall.box(-3.3,9.0,4.0,5.2,2.8,4.0,C.plaster);G.roof(roof,-3.3,11.7,4.0,6.7,5.6,2.6,rgb('#635666'),fine);roundWindow(paper,-3.3,10.4,6.05,.87,rgb('#c6b98e'));
  wall.box(5.9,6.9,-3.9,2.1,11.1,2.2,rgb('#777b70'));wall.box(5.9,17.7,-3.9,2.65,.55,2.8,C.stoneLight);
  wood.box(0,.2,10.2,17,.42,4.4,C.timber);G.roof(roof,0,4.0,9.4,20,6.5,1.0,rgb('#5b5058'),fine);for(let x of[-7.3,7.3])wood.box(x,.60,11.8,.26,3.35,.26,C.wood);
  // Lean-to + sheltered clutter: layered shelves, cauldron, herb drying frames.
  for(const x of[12,21])for(const z of[-4,4])wood.box(x,0,z,.26,3.0,.26,C.wood);G.roof(roof,16.5,3.0,0,12,12,1.3,rgb('#5a6255'),fine,true);
  for(let j=0;j<3;j++){wood.box(18,.45+j*.75,-3.6,4.9,.14,1.4,C.timber);for(let i=0;i<5;i++)lathe(fine,16.2+i*.84,.60+j*.75,-3.6,.19,.45,rgb(['#7b8d79','#a2876a','#6f8891'][i%3]),4);}
  wall.ellipsoid(13.7,.68,2,1.1,.72,1.02,rgb('#364347'),16,6);wall.cone(13.7,1.23,2,1.0,1.06,.22,rgb('#5c6e62'),16);for(let s of[-1,1])wood.box(13.7+s*.85,.0,2,.21,.54,.24,C.woodDark);
  for(let i=0;i<5;i++){let x=-6+i*2;wood.tube([x,.5,12.8],[x-.7,2.4,13.3],.045,C.timber,5);fine.cone(x-.7,1.8,13.3,.20,.02,.58,rgb('#849261'),5);}
  for(let i=0;i<6;i++)fine.box(-13.6+(i%3)*1.1,.2+Math.floor(i/3)*.63,6.8,.98,.58,.90,rgb('#827057'));
  signs.push({text:'霧雨魔法店',position:[p.x,p.y+3.35,p.z+12.90],width:4.7,height:.92,background:'#433d42',color:'#e4dbbc',region:'forest'});
 }
 // Foundation apron with irregular stepping stones and enough clearance around walls.
 for(let i=0;i<10;i++){let z=(id==='alice'?16:14)+i*1.1;wall.box((i%2-.5)*.15,.01,z,2.65,.12,.87,blend(C.stone,C.stoneLight,R()*.4));}
 const meshes=bank.meshes().map(m=>({...m,id:'forest:'+id+':'+m.id,owner:'forest',region:'forest',locationId:id,refined:true,component:id,massing:false,basis:'P'}));
 return{meshes,signs,footprint:{...p},meta:{id,origin:'reconstructed_from_agreed_scope',exterior:true,interior:false}};
}
function treeProto(seed,far){const r=G.rng(seed),g=new G.Geometry(),leaf=new G.Geometry(),bark=rgb('#5c5745');
 const h=14+r()*5,lean=(r()-.5)*2;g.tube([0,0,0],[lean,h*.55,.5],.73,bark,far?5:9,.35);g.tube([lean,h*.55,.5],[lean+.5,h,.8],.35,bark,far?5:8,.10);
 for(let i=0;i<(far?4:7);i++){const a=i*2.4,root=[Math.cos(a)*2.7,.06,Math.sin(a)*2.4];g.tube(root,[0,1.55,0],.24,bark,far?4:6,.41);const X=Math.cos(a)*(3.6+r()*2),Z=Math.sin(a)*(3.2+r()*2),Y=h*.64+r()*4;g.tube([lean,h*.45,0],[X,Y,Z],.22,bark,far?4:7,.09);leaf.ellipsoid(X,Y+1,Z,3.5+r(),2.4+r()*.8,3.3+r(),[1,1,1],far?7:11,far?4:6);if(!far)for(let j=0;j<3;j++)leaf.ellipsoid(X+Math.cos(j*2.4)*2,Y+1+(j%2)*1.0,Z+Math.sin(j*2.4)*2,1.6,1.2,1.45,[.89,.97,.83],8,4);}
 leaf.ellipsoid(lean,h+.2,0,3.6,2.4,3.2,[1,1,1],far?7:11,far?4:6);return{wood:g.mesh('wood').vertices,leaf:leaf.mesh('leaf').vertices};}
function buildForest(t){const meshes=[],signs=[],meta={origin:'reconstructed_from_agreed_scope',version:'0.14.0',basis:'P',buildings:[],paths:paths.map(p=>({id:p.id,points:p.points,width:p.width})),treeCount:0};
 for(const id of ['kourindou','alice','marisa']){const pack=buildingPack(id,t);meshes.push(...pack.meshes);signs.push(...pack.signs);meta.buildings.push(pack.meta);}
 const ground=new G.Geometry(),root=new G.Geometry(),props=new G.Geometry(),herbs=new G.Geometry(),R=G.rng(104426);
 for(const path of paths){for(let i=0;i<path.samples.length-1;i++){let a=path.samples[i],b=path.samples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],n=G.norm([-dz,0,dx]),p=(v,s)=>[v[0]+n[0]*s,t.height(v[0]+n[0]*s,v[1]+n[2]*s)+.18,v[1]+n[2]*s];ground.quad(p(a,path.width*.5),p(b,path.width*.5),p(b,-path.width*.5),p(a,-path.width*.5),rgb('#9e927a'));}}
 // A damp low area crossed by a constructed, low timber walkway (not a named river).
 const walkway=paths.find(p=>p.id==='forest-boardwalk');for(let i=0;i<walkway.samples.length;i++){let p=walkway.samples[i],next=walkway.samples[Math.min(i+1,walkway.samples.length-1)],ang=Math.atan2(next[0]-p[0],next[1]-p[1]);props.place(p[0],t.height(...p)+.25,p[1],ang);props.box(0,0,0,2.4,.16,3.9,rgb('#867861'));if(i%3===0)for(let s of[-1,1])props.box(s*1.1,-.36,0,.16,.70,.18,C.woodDark);}props.place();
 for(let i=0;i<86;i++){const a=R()*TAU,d=Math.sqrt(R())*26,x=-1093+Math.cos(a)*d,z=56+Math.sin(a)*d;if(routeDistance(x,z)<1.2)continue;mushroom(props,x,t.height(x,z),z,.8+R()*2.2,rgb(i%5?'#b48560':'#7287a1'));}
 // One bespoke ancient oak with spreading roots and shelf fungi.
 const ox=-1276,oz=124,oy=t.height(ox,oz);root.tube([ox,oy,oz],[ox-2,oy+12,oz+.9],2.0,rgb('#655e49'),11,1.0);
 for(let i=0;i<9;i++){let a=i*2.4,X=ox+Math.cos(a)*12,Z=oz+Math.sin(a)*11,Y=oy+15+(i%3)*2.3;root.tube([ox-1,oy+6,oz],[X,Y,Z],.8,C.wood,8,.20);root.tube([ox,oy+1.5,oz],[ox+Math.cos(a)*8,t.height(ox+Math.cos(a)*8,oz+Math.sin(a)*7)+.12,oz+Math.sin(a)*7],.77,C.wood,8,.12);herbs.ellipsoid(X,Y+1.2,Z,5.1,3.2,4.1,rgb('#647852'),9,4);}
 for(let i=0;i<7;i++)root.ellipsoid(ox+1.65,oy+1.3+i*.6,oz+Math.sin(i)*.38,.7,.13,.43,rgb('#b09262'),10,3);
 // Fallen wood, moss, ferns and foliage-clump placement is deterministic and avoids paths/yards.
 for(let i=0;i<140;i++){let x=-1440+R()*650,z=-365+R()*660;if(routeDistance(x,z)<3.4||pads.some(p=>padWeight(x,z,{...p,w:p.w+8,d:p.d+8})>.01))continue;let y=t.height(x,z);props.ellipsoid(x,y-.15,z,1.0+R()*1.9,.6+R(),1.1+R(),rgb('#627264'),7,4);for(let j=0;j<5;j++){let a=j*TAU/5;herbs.quad([x,y,z],[x+Math.cos(a)*1.5,y+.5,z+Math.sin(a)*1.5],[x+Math.cos(a)*2,y+.9,z+Math.sin(a)*2],[x+Math.cos(a+.3)*1.2,y+.8,z+Math.sin(a+.3)*1.2],rgb('#708b53'));}}
 for(const [x,z,ang]of[[-1247,53,.6],[-958,-104,1.9],[-884,126,-.3]]){props.place(x,t.height(x,z)+.4,z,ang);props.tube([-4,0,0],[4,.5,0],.65,rgb('#6f6350'),10,.48);props.place();}
 meshes.push(ground.mesh('forest:paths','roads',{owner:'forest',region:'forest',material:'ground'}),root.mesh('forest:old-oak-roots','architecture',{owner:'forest',region:'forest',material:'timber',component:'ancient-oak'}),props.mesh('forest:understorey','architecture',{owner:'forest',region:'forest',material:'matte',component:'mushrooms-boardwalk'}),herbs.mesh('forest:ground-foliage','vegetation',{owner:'forest',region:'forest',material:'forestLeaf'}));
 const defs=[treeProto(134,false),treeProto(591,false),treeProto(833,false)],far=[treeProto(134,true),treeProto(591,true),treeProto(833,true)],bins=new Map();
 for(let x=-1550;x<-680;x+=24)for(let z=-419;z<345;z+=24){let X=x+(R()-.5)*13,Z=z+(R()-.5)*13;if(weight(X,Z)<.26||routeDistance(X,Z)<7.5||pads.some(p=>padWeight(X,Z,{...p,w:p.w+16,d:p.d+16})>.01)||Math.hypot(X-ox,Z-oz)<19||Math.hypot(X+1093,Z-56)<22||R()<.18)continue;let variant=Math.floor(R()*3),key=Math.floor(X/112)+':'+Math.floor(Z/112)+':'+variant;if(!bins.has(key))bins.set(key,{variant,m:[],c:[],ps:[]});let b=bins.get(key),s=.85+R()*.56,y=t.height(X,Z);b.m.push(...G.instanceMatrix(X,y,Z,s,s*(.90+R()*.22),s,R()*TAU));b.c.push(...rgb(['#60764c','#718151','#536d4e'][variant]));b.ps.push([X,y,Z]);meta.treeCount++;}
 for(const[k,b]of bins){let center=b.ps.reduce((s,p)=>s.map((v,i)=>v+p[i]/b.ps.length),[0,0,0]),rad=Math.max(...b.ps.map(p=>G.length(G.sub(p,center))))+33;for(const part of ['wood','leaf'])meshes.push({id:'forest:trees:'+k+':'+part,owner:'forest',region:'forest',group:'vegetation',material:part==='leaf'?'forestLeaf':'timber',vertices:defs[b.variant][part],farVertices:far[b.variant][part],instances:new Float32Array(b.m),instanceColors:new Float32Array(part==='leaf'?b.c:b.c.map(()=>1)),center,radius:rad,lodDistance:280,component:'forest-canopy'});}
 return{meshes,signs,meta};}
Object.assign(G.IMPLEMENTED,{forest:'forest',kourindou:'kourindou',alice:'alice',marisa:'marisa',doll_forest:'alice'});
const views={forest:{label:'魔法森林 · 林内小径',eye:[-781,40.3,-49],target:[-851,39.5,-76]},kourindou:{label:'香霖堂 · 店面与土藏',eye:[-594,67,49],target:[-555,49,1]},kourindouFront:{label:'香霖堂 · 旧物廊下',eye:[-570,48.1,25],target:[-561,48.3,7]},alice:{label:'爱丽丝 · 森林小洋馆',eye:[-1180,107,-207],target:[-1138,91,-260]},aliceGarden:{label:'人偶制作角与庭院',eye:[-1175,89,-235],target:[-1156,88,-269]},marisa:{label:'雾雨魔法店 · 旧屋与工作棚',eye:[-1035,91,183],target:[-997,76,140]},forestMushrooms:{label:'菌类洼地',eye:[-1081,64.5,75],target:[-1094,61.8,56]},forestOldTree:{label:'古木与根系',eye:[-1309,53.5,159],target:[-1276,55.5,124]},forestBoardwalk:{label:'林间木板径',eye:[-947,52.1,20],target:[-988,42.4,0]},forestOverview:{label:'森林与三处住居',eye:[-604,580,714],target:[-1080,74,-56]}};
for(const[k,v]of Object.entries(views))G.PRESETS[k]={...v,region:'forest'};
G.FOREST={pads,paths,weight,routeDistance,buildingPack};G.buildForest=buildForest;
})(globalThis.GA);

/* v0.14 approved Hakurei appearance changes. Legacy source builder remains intact.
 * Split mixed-color batches into real material groups; add feet, joints and
 * warm paper lamps, without swapping the shrine for an unrelated building. */
(function(G){'use strict';const C=G.C;
function nearColor(c,target){return Math.hypot(c[0]-target[0],c[1]-target[1],c[2]-target[2]);}
function classify(c){let pairs=[['hakureiRoof',C.slate],['hakureiRoof',C.slate2],...([.14,.24,.40].map(t=>['hakureiRoof',G.blend(C.slate,C.slate2,t)])),['hakureiPaper',C.paper],['hakureiPaper',C.cream],['hakureiRecess',C.shadow],['hakureiWood',C.wood],['hakureiWood',C.woodDark],['hakureiWood',C.timber],['shrineGold',C.gold],['hakureiPlaster',C.plaster]];let best=['hakureiStone',.018];for(let[k,v]of pairs){let d=nearColor(c,v);if(d<best[1])best=[k,d];}if(c[0]>c[1]*2&&c[0]>c[2]*2&&c[0]>.1)return'hakureiLacquer';return best[0];}
function bevelBox(g,x,y,z,w,h,d,e,col){const ring=(Y,inset)=>[[-w/2+e,-d/2], [w/2-e,-d/2],[w/2,-d/2+e],[w/2,d/2-e],[w/2-e,d/2],[-w/2+e,d/2],[-w/2,d/2-e],[-w/2,-d/2+e]].map(p=>[x+p[0]*(1-inset),Y,z+p[1]*(1-inset)]);const rings=[ring(y,.07),ring(y+e,0),ring(y+h-e,0),ring(y+h,.07)];for(let j=0;j<3;j++)for(let i=0;i<8;i++)g.quad(rings[j][i],rings[j][(i+1)%8],rings[j+1][(i+1)%8],rings[j+1][i],col);for(let i=1;i<7;i++)g.tri(rings[3][0],rings[3][i+1],rings[3][i],col);}
function style(pack){const result=[];for(const m of pack.meshes){if(m.group==='water'||m.material?.startsWith('hakurei')){result.push({...m,owner:'hakurei',region:'hakurei'});continue;}const groups=new Map(),a=m.vertices;for(let i=0;i<a.length;i+=27){let key=classify([a[i+6],a[i+7],a[i+8]]);if(!groups.has(key))groups.set(key,[]);const out=groups.get(key);for(let j=0;j<27;j++)out.push(a[i+j]);}for(const [material,ar]of groups){let g=new G.Geometry();g.a=ar;result.push(g.mesh(m.id+':style:'+material,m.group,{...m,vertices:undefined,id:m.id+':style:'+material,material,owner:'hakurei',region:'hakurei',sourceId:m.id,styleRevision:15}));result.at(-1).vertices=new Float32Array(ar);}}
 const stone=new G.Geometry(),wood=new G.Geometry(),paper=new G.Geometry(),soft=new G.Geometry();stone.place(1620,180,160,-Math.PI/2);wood.place(1620,180,160,-Math.PI/2);paper.place(1620,180,160,-Math.PI/2);soft.place(1620,180,160,-Math.PI/2);
 for(let x=-11;x<=11;x+=2.75)for(let z of[-18.3,-1.75]){bevelBox(stone,x,1.5,z,.40,.20,.44,.04,C.stoneLight);bevelBox(wood,x-.4,5.98,z,.85,.28,.58,.04,C.timber);wood.tube([x,5.22,z],[x+.65,6.2,z],.09,C.wood,6);wood.tube([x,5.22,z],[x-.65,6.2,z],.09,C.wood,6);}
 const lamps=[];
 // Six paper lanterns beneath the eave, plus two lower garden lights.
 for(const x of[-9.4,-6.2,-3.1,3.1,6.2,9.4]){const z=.2,Y=4.7;paper.ellipsoid(x,Y,z,.30,.47,.28,G.rgb('#f4daa3'),16,8);for(let yy of[Y-.46,Y+.42])wood.cone(x,yy,z,.22,.22,.06,C.woodDark,12);wood.tube([x,Y+.50,z],[x,Y+1.3,z],.016,C.woodDark,5);for(let j=0;j<9;j++){const a=j*Math.PI*2/9;wood.tube([x+Math.cos(a)*.29,Y-.27,z+Math.sin(a)*.27],[x+Math.cos(a)*.29,Y+.26,z+Math.sin(a)*.27],.009,C.timber,3);}lamps.push(paper.point([x,Y,z]));}
 for(const x of[-8.6,8.6]){const z=30;bevelBox(stone,x,.29,z,1.23,.23,1.23,.1,C.stone);paper.box(x,2.13,z+.37,.26,.37,.015,G.rgb('#efc78c'));}
 // Ornamented bronze foot and warm reflection-free dry paving. No rain/wetness.
 for(let i=0;i<4;i++){let z=8+i*3.2;for(let x of[-3.4,3.4])bevelBox(stone,x,.31,z,.22,.12,.94,.03,C.stoneLight);}
 result.push(stone.mesh('hakurei-style:beveled-stones','architecture',{material:'hakureiStone',owner:'hakurei',region:'hakurei'}),wood.mesh('hakurei-style:joinery-and-lamp-ribs','architecture',{material:'hakureiWood',owner:'hakurei',region:'hakurei'}),paper.mesh('hakurei-style:paper-lamps','architecture',{material:'shrineLight',owner:'hakurei',region:'hakurei'}));
 pack.meshes=result;pack.meta={...pack.meta,styleRevision:15,weather:'dry',materialSeparation:true,explicitSurfaceMaterials:true,beveledDetails:true,lightPositions:lamps,notNewCanon:true};return pack;
}
G.styleHakurei=style;G.bevelBox=bevelBox;
})(globalThis.GA);

/* Deliberate planting for the shrine pilot, not an untouched old-tree claim.
   Original plant sites are the starting layout; sparse prototype crowns are
   replaced with joined foliage masses. */
(function(G){'use strict';const C=G.C;
function model(kind,far){const g=new G.Geometry(),leaf=new G.Geometry(),bark=G.rgb('#655747');g.tube([0,0,0],[.18,kind==='cedar'?13:7,0],kind==='cedar'?.27:.42,bark,8,.11);for(let i=0;i<5;i++){let a=i*2.4;g.tube([0,.6,0],[Math.cos(a)*1.1,.07,Math.sin(a)*1.1],.18,bark,6,.06);}
 if(kind==='cedar'){for(let j=0;j<8;j++){let y=3.6+j*1.22,r=3.2-j*.34;leaf.cone(0,y,0,r,.15,3.2,[.71+j*.025,.84+j*.012,.72],far?8:12);for(let k=0;k<4&&!far;k++){let a=k*1.57+j*.7;leaf.ellipsoid(Math.cos(a)*r*.52,y+.75,Math.sin(a)*r*.52,r*.65,.85,r*.54,[.83,.95,.80],8,4);}}}
 else{for(let j=0;j<7;j++){let a=j*2.4,x=Math.cos(a)*(2.2+j%2),z=Math.sin(a)*(2.3+j%2),y=5.4+(j%3)*1.3;g.tube([0,2.3,0],[x,y,z],.16,bark,7,.04);leaf.ellipsoid(x,y+.6,z,2.5,1.85,2.35,[1,1,1],far?7:11,far?4:6);if(!far)for(let k=0;k<4;k++)leaf.ellipsoid(x+Math.cos(k*1.8)*1.7,y+.65+Math.sin(k)*.45,z+Math.sin(k*1.8)*1.5,.99,.81,.95,[.96,.92,.95],8,4);}}
 return{wood:g.mesh('a').vertices,leaf:leaf.mesh('b').vertices};}
G.hakureiPlanting=function(t,sites){const R=G.rng(197241),bins=new Map();for(let i=0;i<sites.length;i++){const p=sites[i];if(i>8&&i%3!==0)continue;if(!G.DIORAMA.inside(G.DIORAMA.map.get('hakurei').poly,p.x,p.z))continue;let kind=p.type==='cedar'?'cedar':p.type==='cherry'?'cherry':'broadleaf';if(!bins.has(kind))bins.set(kind,{ma:[],co:[]});const b=bins.get(kind),s=(p.scale||1)*.87;let y=t.height(p.x,p.z);if(p.x>1568&&p.x<1675&&p.z>109&&p.z<212)y=Math.max(y,180.30);b.ma.push(...G.instanceMatrix(p.x,y,p.z,s,s,s,R()*6.28));b.co.push(...G.rgb(kind==='cherry'?'#cc9eb4':kind==='cedar'?'#3e6657':'#668160'));}
 const out=[];for(const[k,b]of bins){let n=model(k,false),f=model(k,true);for(const part of['wood','leaf'])out.push({id:'hakurei-style:planting:'+k+':'+part,group:'vegetation',owner:'hakurei',region:'hakurei',material:part==='leaf'?'forestLeaf':'shrineWood',vertices:n[part],farVertices:f[part],instances:new Float32Array(b.ma),instanceColors:new Float32Array(part==='leaf'?b.co:b.co.map(()=>1)),center:[1620,196,165],radius:175,lodDistance:470});}
 const moss=new G.Geometry(),stone=new G.Geometry();for(const [x,z,rx,rz]of[[1597,194,8,5],[1617,128,9,4],[1658,178,5,11],[1664,128,6,5]]){let h=Math.max(t.height(x,z),180.32);for(let i=0;i<28;i++){const a=i/28*6.283,b=(i+1)/28*6.283,p=q=>[x+Math.cos(q)*rx*(1+.12*Math.sin(q*3)),h+.006,z+Math.sin(q)*rz];moss.tri([x,h+.006,z],p(b),p(a),G.rgb('#496a50'));}for(let i=0;i<8;i++){let a=R()*6.28,d=R()*.65,X=x+Math.cos(a)*rx*d,Z=z+Math.sin(a)*rz*d;stone.ellipsoid(X,h+.1,Z,.4+R()*.7,.25+R()*.4,.35+R()*.6,G.rgb('#707976'),9,5);}}
 out.push(moss.mesh('hakurei-style:moss-beds','architecture',{owner:'hakurei',material:'shrineMoss'}),stone.mesh('hakurei-style:garden-stones','architecture',{owner:'hakurei',material:'shrineStone'}));return out;};
})(globalThis.GA);

/* v0.16 — Muenzuka, Road of Reconsideration and Genbu Ravine.
 * Primary-source constraints and authored geometry are separated in meta.
 * The terrain mutation is confined to Genbu's existing footprint, below -638 Z;
 * other accepted regions retain their original generator and random sequences.
 * No new floating pedestal, no invented portal, no modern cemetery grid.
 */
(function(G){'use strict';
const {rgb,mix,blend,smooth,noise}=G,C=G.C,TAU=Math.PI*2;
const oldHeight=G.Terrain.prototype.height,oldColor=G.Terrain.prototype.color,oldWater=G.Terrain.prototype.water;
const GEN={cx:-980,cz:-610,z0:-680,z1:-520,cave:{x:-928,z:-604,floor:44.8},bridgeZ:-548};
const MUE={cx:-1730,cz:575,tree:[-1743,568],shed:[-1645,585]};
function waterX(z){return -975+7*Math.sin((z+624)/34)+3*Math.sin((z+590)/18);}
function waterY(z){return 45.0-(G.clamp(z,-672,-525)+672)*.038;}
function waterHalf(z){return 5.4+3.5*Math.exp(-(((z+590)/25)**2))+.55*Math.sin(z*.091);}
function geoWeight(x,z){return smooth(-638,-627,z)*(1-smooth(-535,-514,z))*(1-smooth(51,83,Math.abs(x-waterX(z))));}
function baseHeight(t,x,z){return oldHeight.call(t,x,z);}
G.Terrain.prototype.height=function(x,z){let h=oldHeight.call(this,x,z),w=geoWeight(x,z);if(!w)return h;
 const d=Math.abs(x-waterX(z)),half=waterHalf(z),floor=waterY(z)-1.1+.17*noise(x*.14,z*.13);
 const edge=waterY(z)+.38+Math.min(2.5,Math.max(0,d-half)*.34);
 const profile=mix(floor,edge,smooth(half-1.15,half+.65,d));
 h=mix(h,profile,w*(1-smooth(half+12,half+24,d)));
 // A shallow working recess with a separately modelled rock roof, not a terrain hole into another world.
 let q=(1-smooth(9.8,14.0,Math.abs(x+935)))*(1-smooth(7.8,13.,Math.abs(z+604)))*w;h=mix(h,43.8,q);
 return h;};
G.Terrain.prototype.color=function(x,z,h,n){let c=oldColor.call(this,x,z,h,n);const g=geoWeight(x,z);if(g>0)c=blend(c,rgb('#66796d'),g*.53);
 let m=1-smooth(75,139,Math.hypot((x-MUE.cx), (z-MUE.cz)*1.12));if(m)c=blend(c,rgb('#768574'),m*.47);return c;};
G.Terrain.prototype.water=function(x,z,margin=0){if(z>-632&&z<-526&&Math.abs(x-waterX(z))<waterHalf(z)+margin*4)return{id:'genbu-creek',y:waterY(z)};return oldWater.call(this,x,z,margin);};
const routeDefs=[{id:'route-genbu-link',from:'mist_lake',to:'genbu',width:3.1,points:[[-370,-170],[-482,-325],[-699,-433],[-836,-483],[-907,-505],[-947,-526]]}];
for(const r of routeDefs)G.routes.push({...r,type:'path',basis:[],evidence:'P',note:'本作林缘接路，不是官方精确路线',samples:G.spline(r.points,4)});
const mpaths=[
 {id:'muenzuka-common-path',w:2.4,points:[[-1580,470],[-1665,524],[-1712,553],[-1730,570]]},
 {id:'muenzuka-grove-loop',w:2.2,points:[[-1712,553],[-1732,532],[-1774,532],[-1793,565],[-1780,608],[-1742,620],[-1705,596],[-1712,553]]},
 {id:'nazrin-side-path',w:2.0,points:[[-1705,596],[-1674,607],[-1647,607],[-1645,596]]},
 {id:'muenzuka-memorial-path',w:1.8,points:[[-1730,570],[-1755,580],[-1771,591]]}
].map(r=>({...r,samples:G.spline(r.points,2.2)}));
const gpaths=[
 {id:'genbu-bank-path',w:2.5,points:[[-947,-526],[-951,-538],[-952,-552],[-951,-573],[-951,-591],[-951,-604]]},
 {id:'genbu-opposite-bank',w:2.2,points:[[-993,-548],[-995,-561],[-1003,-590],[-1000,-612],[-1002,-626]]}
].map(r=>({...r,samples:G.spline(r.points,2.2)}));
function pathDistance(paths,x,z){let d=1e6;for(const p of paths)for(let i=1;i<p.samples.length;i++){let a=p.samples[i-1],b=p.samples[i],dx=b[0]-a[0],dz=b[1]-a[1],u=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);d=Math.min(d,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)-p.w/2);}return d;}
function roadMesh(t,p,owner){const g=new G.Geometry();for(let i=0;i<p.samples.length-1;i++){let a=p.samples[i],b=p.samples[i+1],prev=p.samples[Math.max(0,i-1)],next=p.samples[Math.min(i+2,p.samples.length-1)];const n=(a,b)=>G.norm([-(b[1]-a[1]),0,b[0]-a[0]]),na=n(prev,b),nb=n(a,next),v=(q,n,s)=>{let x=q[0]+n[0]*s,z=q[1]+n[2]*s;return[x,t.height(x,z)+.22,z];};
 g.quad(v(a,na,-p.w*.5),v(a,na,p.w*.5),v(b,nb,p.w*.5),v(b,nb,-p.w*.5),rgb(owner==='muenzuka'?'#a2a28c':'#828d82'));}
 return g.mesh(owner+':'+p.id,'roads',{owner,region:owner,material:'ground',component:'local-path',refined:true,basis:'P'});}
function bank(owner){const b=new Map();return{get:(mat='matte',part='base')=>{let k=mat+':'+part;if(!b.has(k))b.set(k,new G.Geometry());return b.get(k);},meshes:()=>[...b].filter(([k,g])=>g.a.length).map(([k,g])=>g.mesh(owner+':'+k,'architecture',{owner,region:owner,material:k.split(':')[0],component:k.split(':')[1],refined:true,basis:'P',massing:false}))};}
function ring(g,c,r,t,col,axis=[0,1,0],N=16){let u=G.norm(G.cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=G.cross(axis,u),p=a=>G.add(c,G.add(G.mul(u,Math.cos(a)*r),G.mul(v,Math.sin(a)*r)));for(let i=0;i<N;i++)g.tube(p(i*TAU/N),p((i+1)*TAU/N),t,col,5);}
function bezier(a,b,c,d,t){let s=1-t;return a.map((v,i)=>v*s*s*s+3*b[i]*s*s*t+3*c[i]*s*t*t+d[i]*t*t*t);}
function curve(g,points,r,col,N=9){let a=points[0];for(let i=1;i<=N;i++){let b=bezier(...points,i/N);g.tube(a,b,r,col,4,r*.95);a=b;}}
function chamferBox(g,x,y,z,w,h,d,col){const e=Math.min(w,d,h)*.065;const pts=[[-w/2+e,-d/2],[w/2-e,-d/2],[w/2,-d/2+e],[w/2,d/2-e],[w/2-e,d/2],[-w/2+e,d/2],[-w/2,d/2-e],[-w/2,-d/2+e]];for(let i=0;i<8;i++){let a=pts[i],b=pts[(i+1)%8];g.quad([x+a[0],y,z+a[1]],[x+b[0],y,z+b[1]],[x+b[0]*.96,y+h,z+b[1]*.96],[x+a[0]*.96,y+h,z+a[1]*.96],col);g.tri([x,y+h,z],[x+b[0]*.96,y+h,z+b[1]*.96],[x+a[0]*.96,y+h,z+a[1]*.96],col);}}
function hexColumn(g,x,y,z,r,h,col,phase=0){const rr=[r*.96,r,r*.95,r*.83],yy=[y,y+h*.09,y+h-.26,y+h];for(let j=0;j<3;j++)for(let k=0;k<6;k++){let a=k*TAU/6+phase,b=(k+1)*TAU/6+phase,p=(t,level)=>[x+Math.cos(t)*rr[level],yy[level],z+Math.sin(t)*rr[level]];g.quad(p(b,j),p(a,j),p(a,j+1),p(b,j+1),blend(col,rgb('#34494d'),j===0?.16:0));}for(let i=0;i<6;i++){let a=i*TAU/6+phase,b=(i+1)*TAU/6+phase;g.tri([x,y+h,z],[x+Math.cos(b)*rr[3],y+h,z+Math.sin(b)*rr[3]],[x+Math.cos(a)*rr[3],y+h,z+Math.sin(a)*rr[3]],blend(col,rgb('#9aab9b'),.15));}}
function cherryProto(seed,far=false){const R=G.rng(seed),g=new G.Geometry(),l=new G.Geometry(),bark=rgb('#625967');
 const trunk=[[0,0,0],[-.27,2.4,.17],[.36,5.4,-.25],[.20,7.7,-.30]];
 for(let i=1;i<trunk.length;i++)g.tube(trunk[i-1],trunk[i],.91-(i-1)*.18,bark,far?6:10,.91-i*.18);
 for(let i=0;i<7;i++){let a=i*2.399;curve(g,[[0,1.15,0],[Math.cos(a)*.9,.34,Math.sin(a)*.9],[Math.cos(a)*2.5,.12,Math.sin(a)*2.5],[Math.cos(a)*3.6,.01,Math.sin(a)*3.6]],.21,bark,far?3:6);}
 for(let i=0;i<7;i++){let a=i*2.399,r=4.7+R()*1.9,y=10.0+R()*2.2,tip=[Math.cos(a)*r,y,Math.sin(a)*r];
 curve(g,[[.1,4.6+i*.28,0],[tip[0]*.40,6.8,tip[2]*.40],[tip[0]*.91,y-.6,tip[2]*.91],tip],.23,bark,far?3:6);
 for(let j=0;j<(far?2:4);j++){let aa=a+(j-1.5)*.42,rr=r+R()*1.4,pp=[Math.cos(aa)*rr,y+.4+Math.sin(j)*.7,Math.sin(aa)*rr];g.tube([tip[0]*.69,y-1.1,tip[2]*.69],pp,.083,bark,5,.015);
 const co=rgb(['#b6a4c3','#c6b1ce','#a993bc','#d1bbd4'][j%4]);l.ellipsoid(...pp,far?2.3:2.0,1.15,1.9,co,far?7:12,far?4:7);
 if(!far)for(let k=0;k<7;k++){let A=k*2.399,rrr=1.30;const X=pp[0]+Math.cos(A)*rrr,Z=pp[2]+Math.sin(A)*rrr,Y=pp[1]+.20+.65*Math.sin(k*.80);l.ellipsoid(X,Y,Z,.73,.58,.72,blend(co,rgb('#e0cde0'),.13),8,5);}}
 }
 l.ellipsoid(.15,12.4,-.3,2.8,1.45,2.55,rgb('#c6b3cf'),far?8:14,far?4:7);return{wood:g.mesh('w').vertices,leaf:l.mesh('l').vertices};}
function undergrowth(t,owner,coarse,R){let g=new G.Geometry(),far=new G.Geometry();for(let k=0;k<7;k++){let a=k*2.399,h=.35+(k%3)*.09;g.tri([Math.cos(a)*.11,0,Math.sin(a)*.11],[-Math.cos(a)*.11,0,-Math.sin(a)*.11],[Math.sin(a)*.27,h,Math.cos(a)*.27],[1,1,1]);}far.tri([-.22,0,0],[.22,0,0],[0,.4,.12],[1,1,1]);const ng=g.mesh('n').vertices,fg=far.mesh('f').vertices,ms=[],cs=[];
 for(let i=0;i<(coarse?180:2400);i++){let x=MUE.cx+(R()-.5)*173,z=MUE.cz+(R()-.5)*153;if(Math.hypot((x-MUE.cx)/90,(z-MUE.cz)/78)>.98||pathDistance(mpaths,x,z)<.55||Math.hypot(x-MUE.shed[0],z-MUE.shed[1])<10)continue;let q=.60+R()*.86;ms.push(...G.instanceMatrix(x,t.height(x,z)+.025,z,q,q,q,R()*TAU));cs.push(...rgb(R()<.5?'#737f50':'#909b67'));}
 return{id:owner+':understory-grasses',owner,region:owner,group:'vegetation',material:'foliage',component:'understory',vertices:ng,farVertices:fg,instances:new Float32Array(ms),instanceColors:new Float32Array(cs),center:[-1730,71,575],radius:120,lodDistance:130,maxDetailDistance:300};}
function treeProto(seed,far=false,cherry=false){if(cherry)return cherryProto(seed,far);const R=G.rng(seed),g=new G.Geometry(),l=new G.Geometry(),h=cherry?12.6:13.6+R()*4,bark=rgb(cherry?'#645760':'#596451');g.tube([0,0,0],[.25,h*.62,-.45],.74,bark,far?5:9,.28);for(let i=0;i<(far?5:8);i++){let a=i*2.399,r=4.4+R()*2.6,y=h*.64+R()*4.0,p=[Math.cos(a)*r,y,Math.sin(a)*r];g.tube([.12,h*.39,0],p,.27,bark,far?4:6,.045);if(!far){g.tube([0,.7,0],[Math.cos(a)*2.9,.08,Math.sin(a)*2.9],.31,bark,5,.045);g.tube(p,[p[0]*1.25,y+1.4,p[2]*1.2],.075,bark,5,.025);}
 const color=cherry?rgb(['#b09ac0','#c6afcf','#a993bc'][i%3]):[1,1,1];l.ellipsoid(p[0],y+.65,p[2],cherry?3.4:3.3,cherry?1.9:2.4,3.0,color,far?6:10,far?3:5);if(!far){for(let j=0;j<4;j++){let b=j*2.4;l.ellipsoid(p[0]+Math.cos(b)*2.1,y+.5+R(),p[2]+Math.sin(b)*2,1.35,.9,1.4,blend(color,cherry?rgb('#d4bed7'):[.91,1,.88],.23),7,3);}}}
 l.ellipsoid(0,h+1.1,0,3.8,2.3,3.4,cherry?rgb('#c4acca'):[1,1,1],far?6:9,far?3:5);return{wood:g.mesh('wood').vertices,leaf:l.mesh('leaf').vertices};}
function addTrees(t,owner,records,seed){const protos=[treeProto(seed,false),treeProto(seed+21,false)],far=[treeProto(seed,true),treeProto(seed+21,true)],groups=new Map(),meshes=[];
 for(let i=0;i<records.length;i++){let p=records[i],k=Math.floor(p[0]/80)+':'+Math.floor(p[1]/80)+':'+i%2;if(!groups.has(k))groups.set(k,{v:i%2,ms:[],cs:[],points:[]});let b=groups.get(k),s=p[2]||1,y=t.height(p[0],p[1]);b.ms.push(...G.instanceMatrix(p[0],y,p[1],s,s,s,i*2.4));b.cs.push(...rgb(i%3?'#647b55':'#7d8e63'));b.points.push([p[0],y+12,p[1]]);}
 for(const[k,b]of groups){let c=b.points.reduce((a,p)=>a.map((v,i)=>v+p[i]/b.points.length),[0,0,0]),rad=Math.max(...b.points.map(p=>G.length(G.sub(p,c))))+36;for(const part of['wood','leaf'])meshes.push({id:owner+':trees:'+k+':'+part,owner,region:owner,group:'vegetation',material:part==='leaf'?'forestLeaf':'timber',component:'woodland',vertices:protos[b.v][part],farVertices:far[b.v][part],instances:new Float32Array(b.ms),instanceColors:new Float32Array(part==='leaf'?b.cs:b.cs.map(()=>1)),center:c,radius:rad,lodDistance:180});}return meshes;}
// Curled, narrow tepals and protruding stamens — not a recolored sunflower.
function lilyProto(far=false){const g=new G.Geometry(),h=1.02;g.cone(0,0,0,.022,.014,h,rgb('#566d45'),far?4:6);for(let j=0;j<5;j++){let a=j*TAU/5,stem=[Math.cos(a)*.14,h+.08,Math.sin(a)*.14];g.tube([0,h-.03,0],stem,.013,rgb('#647947'),4);for(let k=0;k<5;k++){const A=a+k*TAU/5,v=[Math.cos(A),0,Math.sin(A)],p0=G.add(stem,G.mul(v,.03)),p1=G.add(stem,[v[0]*.17,.24,v[2]*.17]),p2=G.add(stem,[v[0]*.39,.08,v[2]*.39]),p3=G.add(stem,[v[0]*.27,-.13,v[2]*.27]),side=[-v[2],0,v[0]];let prev=p0;for(let s=1;s<=(far?3:5);s++){let f=s/(far?3:5),p=bezier(p0,p1,p2,p3,f),width=.027*Math.sin(Math.PI*f)+.006;g.quad(G.add(prev,G.mul(side,-width)),G.add(prev,G.mul(side,width)),G.add(p,G.mul(side,width)),G.add(p,G.mul(side,-width)),rgb(j%2?'#c53a45':'#d84848'));prev=p;}
 if(!far){let end=G.add(stem,[v[0]*.48,.23,v[2]*.48]);curve(g,[stem,G.add(stem,[v[0]*.2,.33,v[2]*.2]),end,end],.0045,rgb('#dd6263'),3);g.ellipsoid(...end,.022,.012,.013,rgb('#e4be79'),5,2);}}
 }return g.mesh('lily').vertices;}
function groundHerbs(g,x,y,z,s,R){for(let k=0;k<7;k++){let a=k*2.4,p=[Math.cos(a),0,Math.sin(a)],tip=[x+p[0]*s,y+.35*s,z+p[2]*s],mid=[x+p[0]*s*.45,y+.48*s,z+p[2]*s*.45];g.quad([x,y,z],[mid[0]-p[2]*s*.15,mid[1],mid[2]+p[0]*s*.15],tip,[mid[0]+p[2]*s*.15,mid[1],mid[2]-p[0]*s*.15],rgb(R()>.5?'#667d53':'#7b945a'));}}
function shed(bank,t){const [x,z]=MUE.shed,y=t.height(x,z),wood=bank.get('timber','nazrin-shed'),roof=bank.get('roof','nazrin-roof'),props=bank.get('relicMetal','nazrin-relics');wood.place(x,y,z);roof.place(x,y,z);props.place(x,y,z);wood.box(0,-.28,0,11,.5,8.5,C.woodDark);for(let xx=-5;xx<=5;xx+=.68){wood.box(xx,.24,-3.7,.62,4.15,.20,blend(C.timber,C.woodDark,(xx+5)/30));if(Math.abs(xx)>1.4)wood.box(xx,.24,3.6,.62,3.7,.20,C.timber);}
 for(const sx of[-1,1])for(let zz=-3.4;zz<3.6;zz+=.72)wood.box(sx*5.2,.24,zz,.20,3.86,.67,C.wood);for(const xx of[-5.2,5.2])for(const zz of[-3.7,3.6])wood.box(xx,.16,zz,.24,4.5,.28,C.woodDark);
 G.roof(roof,0,4.2,0,12,10,1.65,rgb('#606f67'),null,true);for(let xx=-5.3;xx<6;xx+=.84)roof.box(xx,4.50,4.5,.08,.06,1.55,C.woodDark);
 wood.box(0,.26,5.1,10.8,.23,3,C.woodDark);for(let xx=-5;xx<5;xx+=.52)wood.box(xx,.50,5.1,.48,.07,3.0,C.timber);
 // Open shallow doorway: actual shelf, board floor and sides.
 wood.box(0,.51,1.2,2.6,.1,5.1,C.woodDark);wood.box(1.5,.5,3.8,.35,3.3,.18,C.woodDark);wood.box(-1.75,.5,4.1,1.25,3.05,.13,C.timber);
 for(let level=0;level<3;level++){wood.box(-3.3,.8+level*.87,4.2,2.65,.12,.95,C.timber);for(let j=0;j<4;j++){const X=-4.2+j*.6;props.cone(X,.92+level*.87,4.2,.17,.12,.32+(.15*(j%2)),rgb(j%2?'#879ba0':'#9b8c6a'),8);}}
 wood.box(3.4,.60,5.3,2.2,.25,1.65,C.wood);wood.box(3.4,.5,5.3,2.5,.12,1.85,C.timber);props.tube([2.6,.8,5.3],[4.15,.8,5.3],.10,rgb('#84999c'),6);ring(props,[3.4,1.1,5.0],.51,.058,rgb('#899b9b'),[0,0,1]);
 for(const sx of[-1,1])props.tube([sx*.8,.8,6.2],[sx*.8,2.3,6.2],.025,C.gold,6);
 for(let k=0;k<5;k++)wood.box(6.6+(k%2)*.72,.1+Math.floor(k/2)*.42,1.2,.8,.39,1.35,C.timber);
 wood.place();roof.place();props.place();return {id:'nazrin-shed',position:[x,y,z],width:11,depth:8.5,type:'temporary-shed',basis:'existence: Symposium; geometry P',interior:'shallow-visible-bay-only'};}
function buildMuenzuka(t,{coarse=false}={}){const b=bank('muenzuka'),R=G.rng(160926),stone=b.get('memorialStone','memorial-stones'),moss=b.get('mossRock','moss'),trees=[],graves=[],rel=b.get('relicMetal','scattered-relics');
 const count=coarse?23:32;for(let i=0;i<count;i++){let a=i*2.399,d=27+(i%4)*8.4,x=MUE.cx+Math.cos(a)*d,z=MUE.cz+Math.sin(a)*d*.84;if(pathDistance(mpaths,x,z)<2.5||Math.hypot(x-MUE.tree[0],z-MUE.tree[1])<8)continue;let y=t.height(x,z),w=.72+R()*.62,h=1.6+R()*1.6;
 chamferBox(stone,x,y-.12,z,w+1.15,.38,.88+.54,C.base);chamferBox(stone,x,y+.26,z,w+.6,.34,.90,C.stone);if(i%4===1){stone.ellipsoid(x,y+1.32,z,w*.57,1.07,.29,rgb('#899586'),coarse?6:9,4);stone.box(x,y+.55,z,w,.55,.5,rgb('#899586'));}else{chamferBox(stone,x,y+.6,z,w,h,.52,rgb(i%3?'#8c968a':'#6d7e77'));chamferBox(stone,x,y+.6+h,z,w+.28,.16,.71,C.stoneLight);}
 if(!coarse){for(let j=0;j<3;j++)stone.box(x,y+1.0+j*.22,z+.27,.07,.12,.008,rgb('#596d66'));moss.ellipsoid(x-.4,y+.10,z+.42,.61,.08,.29,rgb('#647758'),7,3);stone.cone(x+.57,y+.4,z+.4,.11,.12,.35,rgb('#94a091'),8);}graves.push([x,y,z]);}
 // A quiet common offering stone, not an invented person's identified grave.
 let x=-1771,z=591,y=t.height(x,z);chamferBox(stone,x,y,z,5.7,.56,2.7,rgb('#778980'));chamferBox(stone,x,y+.56,z,4.9,.26,2.2,rgb('#9ba796'));stone.cone(x,y+.83,z,.55,.63,.32,rgb('#697a73'),12);for(let i=-2;i<=2;i++)stone.tube([x+i*.085,y+1.1,z],[x+i*.085,y+1.8,z],.012,C.woodDark,4);
 const cherryPoints=[[MUE.tree[0],MUE.tree[1],1.3],[-1769,541,.85],[-1707,609,.76]],cp=treeProto(671,false,true),cf=treeProto(671,true,true),ms=cherryPoints.flatMap((p,i)=>G.instanceMatrix(p[0],t.height(p[0],p[1]),p[1],p[2],p[2],p[2],i*1.8));const cherry=[];
 for(const part of['wood','leaf'])cherry.push({id:'muenzuka:purple-cherry:'+part,owner:'muenzuka',region:'muenzuka',group:'vegetation',material:part==='leaf'?'purpleCherry':'timber',component:'purple-cherry',vertices:(coarse?cf:cp)[part],farVertices:cf[part],instances:new Float32Array(ms),instanceColors:new Float32Array(cherryPoints.flatMap(()=>[1,1,1])),center:[-1740,82,574],radius:69,lodDistance:190});
 for(let i=0;i<(coarse?40:76);i++){let a=i*2.399,d=68+R()*38,x=MUE.cx+Math.cos(a)*d+(R()-.5)*9,z=MUE.cz+Math.sin(a)*d*.84+(R()-.5)*9;if(pathDistance(mpaths,x,z)<7||Math.hypot(x-MUE.shed[0],z-MUE.shed[1])<19)continue;trees.push([x,z,.65+R()*.62]);}
 const flowers=[],near=lilyProto(coarse),far=lilyProto(true),bins=new Map();let flowersN=0;
 for(let i=0;i<(coarse?500:1820);i++){let x=MUE.cx+(R()-.5)*179,z=MUE.cz+(R()-.5)*151,d=Math.hypot((x-MUE.cx)/94,(z-MUE.cz)/78);if(d>.95||pathDistance(mpaths,x,z)<.30||Math.hypot(x-MUE.shed[0],z-MUE.shed[1])<12||graves.some(p=>Math.hypot(x-p[0],z-p[2])<1.5)||Math.hypot(x+1771,z-591)<4.0||Math.hypot(x-MUE.tree[0],z-MUE.tree[1])<4.1)continue;if(noise(x*.03,z*.04)<.30)continue;let k=Math.floor(x/45)+':'+Math.floor(z/45);if(!bins.has(k))bins.set(k,{m:[],pos:[]});let q=bins.get(k),s=.69+R()*.38,Y=t.height(x,z);q.m.push(...G.instanceMatrix(x,Y+.035,z,s,s,s,R()*TAU));q.pos.push([x,Y,z]);flowersN++;}
 for(const[k,q]of bins){let c=q.pos.reduce((a,p)=>a.map((v,i)=>v+p[i]/q.pos.length),[0,0,0]);flowers.push({id:'muenzuka:lycoris:'+k,owner:'muenzuka',region:'muenzuka',group:'vegetation',material:'spiderLily',component:'spider-lily',vertices:near,farVertices:far,instances:new Float32Array(q.m),instanceColors:new Float32Array(q.pos.flatMap(()=>[1,1,1])),center:c,radius:39,lodDistance:64,flowerKind:'lycoris'});}
 // A short continuation of the shared reconsideration road into the grove.
 if(!coarse){for(let i=0;i<125;i++){let a=R()*TAU,d=20+R()*71,x=MUE.cx+Math.cos(a)*d,z=MUE.cz+Math.sin(a)*d*.86;if(pathDistance(mpaths,x,z)<1.2)continue;groundHerbs(moss,x,t.height(x,z),z,.6+R()*.55,R);}
 for(const[x,z]of[[-1657,584],[-1662,582],[-1641,600]]){let Y=t.height(x,z);rel.box(x,Y,z,1.1,.46,.75,rgb('#64858c'));ring(rel,[x+.7,Y+.6,z+.2],.55,.06,rgb('#8b8276'),[0,0,1]);}
 }
 const s=shed(b,t),meshes=[...b.meshes(),...cherry,...addTrees(t,'muenzuka',trees,730),undergrowth(t,'muenzuka',coarse,R),...flowers,...mpaths.filter(p=>p.id!=='muenzuka-common-path').map(p=>roadMesh(t,p,'muenzuka'))];
 if(!coarse){let petals=new G.Geometry();for(let i=0;i<130;i++){let a=R()*TAU,d=Math.sqrt(R())*17,x=Math.floor((MUE.tree[0]+Math.cos(a)*d)*2)/2+.25,z=Math.floor((MUE.tree[1]+Math.sin(a)*d)*2)/2+.25,y=Math.floor((73+R()*18)*2)/2+.25;petals.quad([x-.075,y,z],[x,y+.025,z+.045],[x+.075,y,z],[x,y-.025,z-.045],rgb(i%2?'#d7bedc':'#bfa9d0'));}meshes.push(petals.mesh('muenzuka:falling-petals','effects',{owner:'muenzuka',region:'muenzuka',material:'fallingPetal',component:'falling-petals',center:[-1743,82,568],radius:35,maxDetailDistance:230}));}
 return{meshes,signs:[],meta:{version:'0.17.0',basis:'P geometry / sourced place constraints',preview:false,graves:graves.length,gravePositions:graves,cherryTrees:cherryPoints.length,flowers:flowersN,trees:trees.length,shed:s,paths:mpaths.map(p=>({id:p.id,points:p.points,width:p.w})),season:'景观选集：紫之樱与彼岸花共展，不模拟真实物候',features:['purple-cherry','spider-lily','unclaimed-memorial-stones','nazrin-temporary-shed','reconsideration-path'],unfinished:['interior rooms','NPC behavior','portal to netherworld']}};}
function pipe(g,ps,r,col){for(let i=1;i<ps.length;i++)g.tube(ps[i-1],ps[i],r,col,10);for(let i=1;i<ps.length-1;i++)g.ellipsoid(...ps[i],r*1.06,r*1.06,r*1.06,col,10,5);}
function buildGenbu(t,{coarse=false}={}){const b=bank('genbu'),R=G.rng(160972),rock=b.get('basalt','columnar-cliffs'),moss=b.get('mossRock','wet-ledge-moss'),wood=b.get('timber','bank-boardwalk'),metal=b.get('relicMetal','kappa-pipework'),dark=b.get('basalt','cave-shell'),trees=[],columns=[];
 const spacing=coarse?6.7:4.45;
 for(const side of[-1,1])for(let layer=0;layer<(coarse?2:3);layer++)for(let z=-657;z<-541;z+=spacing){let Z=z+layer*1.8,x=waterX(Z)+side*(23.5+layer*3.7+2*Math.sin(Z*.059)),nearDoor=side===1&&Z>-617&&Z<-591;if(nearDoor)continue;let y=Math.min(t.height(x,Z)-1.6,waterY(Z)+.6),H=(side===-1?33:27)+6*Math.sin(Z*.086+layer)+4*R();H=Math.max(H,baseHeight(t,x,Z)-y+4);let radius=coarse?3.8:2.65;hexColumn(rock,x,y,Z,radius,H,blend(rgb('#4e6570'),rgb('#87978e'),.15+R()*.50),Math.PI/6);columns.push([x,y,Z,H,radius]);
 if(!coarse){for(let j=1;j<4;j++){let Y=y+H*j/4;for(let k=0;k<6;k++){let a=k*TAU/6+Math.PI/6,aa=(k+1)*TAU/6+Math.PI/6;rock.tube([x+Math.cos(a)*radius*1.005,Y,Z+Math.sin(a)*radius*1.005],[x+Math.cos(aa)*radius*1.005,Y,Z+Math.sin(aa)*radius*1.005],.028,rgb('#3c555a'),3);}}}
 if(R()<.34)moss.ellipsoid(x,y+H+.08,Z,radius*.79,.12,radius*.68,rgb('#728566'),7,3);
 }
 // Exposed hexagonal riverbed and ledges lie outside the normal flow ribbon.
 let bedCount=0;for(let z=-652;z<-530;z+=coarse?7:3.9)for(let s of[-1,1])for(let k=0;k<2;k++){let Z=z+k*1.8,x=waterX(Z)+s*(waterHalf(Z)+3+k*4.1),y=t.height(x,Z);if(x>-951&&x<-922&&Z>-619&&Z<-588)continue;hexColumn(rock,x,y-.35,Z,coarse?3.8:2.24,.45+R()*.9,rgb(R()>.5?'#74877f':'#687e7a'),Math.PI/6);bedCount++;}
 // Terraced working mouth set INTO the east bank; a short recess, not a complete underground factory.
 const floor=44.8,cx=-930,cz=-604;wood.box(-945,floor-.32,cz,23,.44,15.8,C.woodDark);for(let x=-956;x<-934;x+=.65)wood.box(x,floor+.13,cz,.60,.11,15.8,rgb('#8b8270'));
 dark.box(-929,floor-1.0,cz,14,1.2,13,rgb('#566d6b'));dark.box(-929,floor+9.8,cz,17,6.2,18,rgb('#60766c'));dark.box(-922,floor,cz,1.1,13,18,rgb('#364b4e'));for(const sz of[-1,1])dark.box(-930,floor,cz+sz*8.2,15,12,3.5,rgb('#576f6b'));
 // Voussoir arch framing a visibly open bay, facing the water (-X).
 for(let i=0;i<13;i++){let a=i*Math.PI/13,bb=(i+1)*Math.PI/13,p=(ang,r,x)=>[x,floor+5.7+Math.sin(ang)*r,cz+Math.cos(ang)*r];dark.quad(p(a,6.7,-938),p(bb,6.7,-938),p(bb,5.45,-938),p(a,5.45,-938),rgb('#869388'));dark.quad(p(a,5.45,-938),p(bb,5.45,-938),p(bb,5.45,-935),p(a,5.45,-935),rgb('#506964'));}
 for(const sz of[-1,1])for(let y=floor;y<floor+5.7;y+=1.0)chamferBox(dark,-938,y,cz+sz*6.08,2.0,.95,1.3,rgb('#809187'));
 for(let i=0;i<2;i++){let Z=cz-4.4+i*2.4;pipe(metal,[[-938,48,Z],[-938,62,Z],[-934,66,Z],[-922,66,Z]],.38,rgb('#648581'));for(let y=50;y<63;y+=3){ring(metal,[-938,y,Z],.50,.08,rgb('#a4a78a'),[0,1,0],12);metal.box(-937.3,y-.1,Z,.65,.20,.25,C.woodDark);}}
 for(let i=0;i<3;i++){let x=-930+i*1.9;pipe(metal,[[x,45.4,-610],[x,52.3,-610],[x+1.0,52.8,-610]],.18,rgb(i%2?'#9b9875':'#708e92'));}
 // Pipe discharging back into the creek, with a valve and couplings.
 pipe(metal,[[-936,47.7,-598],[-947,47.7,-598],[-953,45.7,-598],[-959,45.7,-598]],.47,rgb('#587c79'));
 for(let x=-947;x<-937;x+=2.5){ring(metal,[x,47.7,-598],.61,.08,rgb('#a8ad98'),[1,0,0]);}ring(metal,[-945,49.0,-598],.72,.065,rgb('#a45c48'),[0,1,0]);for(let a=0;a<TAU;a+=Math.PI/2)metal.tube([-945,49,-598],[-945+Math.cos(a)*.69,49,-598+Math.sin(a)*.69],.032,rgb('#b67753'),5);
 // Gear/repair counter, storage chests and hose reels, all outside the opaque backwall.
 for(let z of[-608,-600]){wood.box(-930,45.0,z,2.6,1.05,2.5,C.woodDark);wood.box(-930,46.05,z,3.4,.23,3.2,C.timber);for(let j=0;j<4;j++)metal.cone(-931+j*.55,46.3,z,.16,.10,.50,rgb('#a2b1a0'),8);}
 for(let k=0;k<3;k++){wood.box(-940+k*1.8,45.0,-610,1.55,1.12,1.40,C.timber);for(let x of[-.5,.5])metal.box(-940+k*1.8+x,45.2,-609.27,.06,.85,.04,rgb('#7d9791'));}
 ring(metal,[-945,46.2,-610],.90,.16,rgb('#405b67'),[1,0,0],18);ring(metal,[-945,46.2,-610],1.08,.075,rgb('#a0a48d'),[1,0,0],18);
 // A real boardwalk linking the forest road, bridge and works. No floating global road over water.
 for(const p of gpaths)for(let i=0;i<p.samples.length-1;i++){let a=p.samples[i],next=p.samples[i+1],len=Math.hypot(next[0]-a[0],next[1]-a[1]),ang=Math.atan2(next[0]-a[0],next[1]-a[1]),Y=Math.max(t.height(...a)+.42,waterY(a[1])+1.5);if(p.id==='genbu-bank-path'&&a[1]<-581)Y=mix(45.1,45.05,G.clamp((-a[1]-581)/23,0,1));wood.place(a[0],Y,a[1],ang);for(let d=0;d<len;d+=.52)wood.box(0,0,d,p.w,.18,.47,rgb('#8e8774'));if(i%3===0)for(const s of[-1,1]){wood.box(s*(p.w*.5+.1),-1.4,0,.16,2.6,.16,C.woodDark);wood.box(s*(p.w*.5+.1),1.0,len/2,.10,.13,len+1,C.timber);}wood.place();}
 // Cross-stream wooden bridge (one bridge, not one island-to-island connector).
 const bz=GEN.bridgeZ,bx=waterX(bz),by=43.5,bw=3.9,bl=46;for(let i=0;i<Math.ceil(bl/.62);i++){let x=bx-bl/2+i*.62,y=by+.65*Math.sin(Math.PI*i/(bl/.62));wood.box(x,y,bz,.57,.20,bw,rgb('#92896f'));}for(const s of[-1,1]){wood.tube([bx-bl/2,by-.20,bz+s*1.4],[bx+bl/2,by-.20,bz+s*1.4],.16,C.woodDark,7);for(let x=bx-bl/2;x<=bx+bl/2;x+=3.8){wood.box(x,by,bz+s*bw*.50,.16,1.50,.16,C.wood);wood.tube([x,by+1.4,bz+s*bw*.50],[Math.min(x+3.8,bx+bl/2),by+1.4,bz+s*bw*.50],.065,C.timber,6);}}
 // Stream and the separate tributary cascade: varying heights, no global planar mirror.
 const water=new G.Geometry(),foam=new G.Geometry();for(let z=-628;z<-522;z+=coarse?4:1.6){let dz=coarse?4:1.6;const v=(z,s)=>[waterX(z)+waterHalf(z)*s,waterY(z),z];water.quad(v(z,-1),v(z+dz,-1),v(z+dz,1),v(z,1),rgb('#5b9691'));if(!coarse&&Math.floor(z)%4===0){let x=waterX(z)+(R()-.5)*waterHalf(z)*1.8,Y=waterY(z)+.07;foam.quad([x,Y,z],[x+.11,Y,z],[x+.19,Y,z+1.5],[x+.03,Y,z+1.5],rgb('#9dbfba'));}}
 const fall=new G.Geometry();const fx=waterX(-626)-1.4,fz=-626,fy=waterY(fz);for(let x=fx-3.2;x<fx+3.2;x+=.32){fall.quad([x,fy,fz],[x+.30,fy,fz],[x+.30,fy+14.2,fz-1.7],[x,fy+14.2,fz-1.7],rgb('#86bcb5'));}
 // Backed by continuous basalt, with a feeder channel, rather than a white plane hanging in air.
 for(let s of[-1,1])for(let k=0;k<4;k++)hexColumn(rock,fx+s*(4+k*3.5),fy-1,fz-3-k*.8,2.7,18+R()*4,rgb('#647d79'),Math.PI/6);
 for(let j=0;j<4;j++)hexColumn(rock,fx+(j-1.5)*2.7,fy-1,fz-6,2.35,15.9,rgb('#5b7772'),Math.PI/6);
 water.quad([fx-3.5,fy+14.28,fz-1.65],[fx+3.5,fy+14.28,fz-1.65],[fx+2.4,fy+14.65,fz-7.6],[fx-2.4,fy+14.65,fz-7.6],rgb('#639a94'));
 for(let i=0;i<(coarse?5:25);i++){let x=fx+(R()-.5)*8,z=fz+R()*5,Y=waterY(z)+.10;foam.ellipsoid(x,Y,z,.30+R()*.50,.018,.12+R()*.20,rgb('#b6d1c7'),6,2);}
 // Local discharge from the working mouth, not the Nine Heavens waterfall.
 fall.quad([-959.1,waterY(-598),-598.5],[-959.1,waterY(-598),-597.5],[-959.1,45.6,-597.5],[-959.1,45.6,-598.5],rgb('#92c1b9'));
 if(!coarse){for(let i=0;i<65;i++){let z=-650+R()*112,x=waterX(z)+(R()>.5?1:-1)*(13.5+R()*8.0);if(pathDistance(gpaths,x,z)<2.2||Math.abs(z-bz)<3||Math.abs(x+943)<16&&Math.abs(z+604)<13)continue;groundHerbs(moss,x,t.height(x,z)+.08,z,.7+R()*.65,R);}}
 for(let i=0;i<(coarse?20:45);i++){let z=-676+R()*144,x=waterX(z)+(R()>.5?1:-1)*(46+R()*20);if(!G.DIORAMA.inside(G.DIORAMA.map.get('genbu').poly,x,z)||Math.abs(x+935)<24&&Math.abs(z+604)<21)continue;trees.push([x,z,.62+R()*.42]);}
 const meshes=[...b.meshes(),water.mesh('genbu:flowing-creek','water',{owner:'genbu',region:'genbu',material:'genbuFlow',component:'flowing-creek'}),foam.mesh('genbu:foam-ribbons','effects',{owner:'genbu',region:'genbu',material:'genbuFoam',component:'current-foam'}),fall.mesh('genbu:tributary-fall','effects',{owner:'genbu',region:'genbu',material:'genbuFall',component:'tributary-cascade'}),...addTrees(t,'genbu',trees,816)];
 return{meshes,signs:[],meta:{version:'0.17.0',preview:false,basis:'P geometry, CiLR basalt constraint / official fighting-game stage references',columns:columns.length,columnRecords:columns,bedHexagons:bedCount,bridge:{center:[bx,by,bz],length:bl,width:bw},cave:{center:[-930,44.8,-604],depth:14,interior:'short-work-recess, not full base'},water:{z0:-628,z1:-522,heightMin:waterY(-522),heightMax:waterY(-628),flow:'towards +Z, authored watercourse; not Sanzu'},trees:trees.length,features:['columnar-basalt','hexagonal-riverbed','flowing-creek','wooden-crossing','kappa-work-recess','pipe-valves','tributary-cascade'],unfinished:['full cave base','flood simulation','boat ride','NPC behavior']}};}
G.DIORAMA.map.get('muenzuka').name='无缘塚 · 再思之道';G.DIORAMA.map.get('genbu').name='玄武涧 · 河童据点';G.REGION_LABELS.muenzuka='无缘塚 · 再思之道';G.REGION_LABELS.genbu='玄武涧 · 河童据点';
G.DIORAMA.map.get('genbu').center=[-980,67,-606];G.DIORAMA.map.get('muenzuka').center=[-1730,82,575];
const views={muenzuka:{label:'无缘塚 · 紫樱花径',region:'muenzuka',eye:[-1685,98,646],target:[-1740,77,569]},muenzukaFlowers:{label:'彼岸花间的旧碑',region:'muenzuka',eye:[-1714,73.2,604],target:[-1743,76.3,568]},muenzukaSakura:{label:'紫之樱 · 根系与落英',region:'muenzuka',eye:[-1716,83,594],target:[-1742,84,568]},muenzukaNazrin:{label:'娜兹玲 · 临时棚屋',region:'muenzuka',eye:[-1639,74.4,599],target:[-1645,72.8,585]},muenzukaPath:{label:'再思之道 · 入塚小径',region:'muenzuka',eye:[-1640,80.5,512],target:[-1738,80,568]},muenzukaOverview:{label:'林中墓地与来路',region:'muenzuka',eye:[-1533,221,789],target:[-1710,79,565]},
 genbu:{label:'玄武涧 · 柱岩溪流',region:'genbu',eye:[-973,64,-506],target:[-978,53,-602]},genbuColumns:{label:'六角石柱 · 谷底近看',region:'genbu',eye:[-978,48.5,-555],target:[-1004,64,-612]},genbuBridge:{label:'溪涧木桥与石滩',region:'genbu',eye:[-965,51.5,-522],target:[-978,47,-562]},genbuWorkshop:{label:'河童据点 · 作业台',region:'genbu',eye:[-977,50.7,-597],target:[-932,49.0,-604]},genbuWaterfall:{label:'支流水瀑与六角岩',region:'genbu',eye:[-968,48,-594],target:[-977,50.5,-626]},genbuOverview:{label:'山脚、玄武涧与森林',region:'genbu',eye:[-758,240,-387],target:[-980,65,-604]}};
delete G.PRESETS.__genbu;delete G.PRESETS.__muenzuka;Object.assign(G.PRESETS,views);Object.assign(G.IMPLEMENTED,{muenzuka:'muenzuka',reconsider:'muenzukaPath',nazrin_home:'muenzukaNazrin',genbu:'genbu',kappa_base:'genbuWorkshop'});
G.WEST_INFO={
muenzuka:{fact:'再思之道尽头、众树包围的无缘者墓地，生有少量紫之樱。',design:'本轮制作紫樱、彼岸花、旧碑、供养石台与林边临时棚屋。坐标、墓位、花量和造型均P；紫樱与彼岸花共展属于景观选集，不模拟物候。没有永久冥界传送门。',sources:['https://thwiki.cc/东方求闻史纪/无缘塚/中日对照']},
reconsider:{fact:'通往无缘塚的小径，原作有秋日彼岸花的记述。',design:'保留森林来路并连接林中墓地。具体曲线、路肩和林缘由本作补完。',sources:['https://thwiki.cc/东方求闻史纪/再思之道/中日对照']},
nazrin_home:{fact:'《求闻口授》记载娜兹玲在无缘塚附近建了一间临时小屋。',design:'当前可浏览的是本作棚屋造型，不再沿用早期档案的待定位状态；研究基线原字节仍保存。仅外部和浅开口陈设，无完整室内。',sources:['https://thbwiki.cc/东方求闻口授/娜兹玲']},
genbu:{fact:'森林附近的涧谷，地面可见龟甲般的六角裂纹，岩壁有柱状节理。',design:'本作制作玄武岩柱列、溪流、木桥与河童管道作业口。具体水线、溪瀑、道路和设备是P，不等于九天瀑布，也不连接到三途河。',sources:['https://thbwiki.cc/东方儚月抄_～_Cage_in_Lunatic_Runagate./第四话/中日对照','https://thbwiki.cc/玄武涧']},
kappa_base:{fact:'玄武涧相关场景中的河童据点和洞窟设备。',design:'本轮只表现洞口短作业湾、木台、阀门与管路，没有完成整座地下基地。',sources:['https://thbwiki.cc/玄武涧']}
};
G.WEST={GEN,MUE,waterX,waterY,waterHalf,geoWeight,baseHeight,mpaths,gpaths,routeDefs,buildMuenzuka,buildGenbu};
})(globalThis.GA);

/* v0.15: ONE continuous floating landmass. Region polygons are ownership and
 * detail-streaming metadata only; they are no longer cuts in the ground.
 * Existing region constructors and their world coordinates are unchanged.
 * All new terrain outlines / paths / transitional vegetation are P proposals. */
(function(G){'use strict';
const {rgb,mix,smooth,blend,noise}=G;
const outline=[[-2130,-1610],[-1920,-2120],[-1450,-2390],[-860,-2490],[-210,-2460],[390,-2225],[930,-1990],[1325,-1540],[1450,-1090],[1660,-720],[1920,-395],[2040,15],[1950,440],[1685,735],[1495,1170],[1240,1605],[800,1905],[280,1985],[-230,1900],[-655,1775],[-1135,1590],[-1580,1430],[-1900,1120],[-2075,725],[-2100,275],[-2225,-130],[-2235,-640]];
const hole={x0:208,x1:440,z0:378,z1:628,floor:-44};
const surfaceBlocks=G.DIORAMA.blocks.filter(b=>!b.space);
function polygonDistance(poly,x,z){let d=Infinity;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let a=poly[j],b=poly[i],dx=b[0]-a[0],dz=b[1]-a[1],u=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);d=Math.min(d,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz));}return d;}
const inside=(x,z)=>G.DIORAMA.inside(outline,x,z);
function protectedDistance(x,z){let d=Infinity;for(const b of surfaceBlocks){if(G.DIORAMA.inside(b.poly,x,z))return 0;d=Math.min(d,polygonDistance(b.poly,x,z));}return d;}
function segDistance(a,b,x,z){const dx=b[0]-a[0],dz=b[1]-a[1],u=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz);}
// Spatial route index, not a scan of thousands of segments for every leaf.
const buckets=new Map(),allRoutes=G.routes.filter(r=>r.id!=='route-eientei').map(r=>({...r,points:r.points.map(p=>p.slice()),samples:r.samples.map(p=>p.slice())}));
// Join the actual forest-entry and the shop forecourt instead of running through the shop.
for(const r of allRoutes){if(r.id==='route-forest'){r.points=[[-220,32],[-280,32],[-370,39],[-468,48],[-527,55]];r.samples=G.spline(r.points,4);}if(r.id==='route-lake'){r.points=[[-527,55],[-505,17],[-494,-72],[-370,-170],...r.points.slice(2)];r.samples=G.spline(r.points,5);}if(r.id==='route-alice'){r.points=G.FOREST.paths?.find(p=>p.id==='forest-alice')?.points||r.points;r.samples=G.spline(r.points,4);}if(r.id==='route-marisa'){r.points=G.FOREST.paths?.find(p=>p.id==='forest-marisa')?.points||r.points;r.samples=G.spline(r.points,4);}}
// Include the forest entrance/loops in the shared network even before its detail pack arrives.
for(const p of G.FOREST.paths){if(['forest-alice','forest-marisa'].includes(p.id))continue;allRoutes.push({...p,id:'island-'+p.id,from:'forest',to:'forest',basis:'P'});}
const mz=allRoutes.find(r=>r.id==='route-muenzuka');mz.points=[[-1265,142],[-1333,248],[-1380,360],[-1580,470],[-1665,524],[-1712,553],[-1730,570]];mz.samples=G.spline(mz.points,5);

for(const r of allRoutes){for(let i=1;i<r.samples.length;i++){let a=r.samples[i-1],b=r.samples[i],pad=34;for(let x=Math.floor((Math.min(a[0],b[0])-pad)/96);x<=Math.floor((Math.max(a[0],b[0])+pad)/96);x++)for(let z=Math.floor((Math.min(a[1],b[1])-pad)/96);z<=Math.floor((Math.max(a[1],b[1])+pad)/96);z++){const k=x+':'+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push({a,b,w:r.width,id:r.id});}}}
function routeNear(x,z){let best={d:1e6,w:0,id:null};for(const r of buckets.get(Math.floor(x/96)+':'+Math.floor(z/96))||[]){let d=segDistance(r.a,r.b,x,z);if(d<best.d)best={...r,d};}return best;}
function transitionWeight(x,z){return smooth(0,70,protectedDistance(x,z));}
function surfaceColor(t,x,z,h,n){let c=t.color(x,z,h,n);const w=transitionWeight(x,z);if(w===0)return c;
 const forest=1-smooth(.95,1.70,Math.hypot((x+1080)/600,(z+60)/500));
 const bamboo=1-smooth(.8,1.4,Math.hypot((x-500)/650,(z-1200)/600));
 let meadow=blend(rgb('#82945b'),rgb('#9baa6e'),noise(x/220,z/200)*.7);meadow=blend(meadow,rgb('#5e7e59'),forest*.67);meadow=blend(meadow,rgb('#859657'),bamboo*.36);
 meadow=blend(meadow,rgb('#788375'),smooth(.12,.52,1-n[1])*.86);meadow=blend(meadow,rgb('#9fa794'),smooth(400,930,h)*.65);
 c=blend(c,meadow,w*.75);const r=routeNear(x,z);if(r.id&&r.d<r.w+24)c=blend(c,rgb('#a2a078'),(1-smooth(r.w*.55,r.w+24,r.d))*.26*w);return c;
}
// Sutherland-Hodgman clipping, used on a single outer polygon only.
function clip(poly,axis,k,keepGreater){let out=[];for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length],A=keepGreater?a[axis]>=k-1e-8:a[axis]<=k+1e-8,B=keepGreater?b[axis]>=k-1e-8:b[axis]<=k+1e-8;if(A)out.push(a);if(A!==B){let f=(k-a[axis])/(b[axis]-a[axis]);out.push([mix(a[0],b[0],f),mix(a[1],b[1],f)]);}}return out;}
function cell(poly,x,z,s){let p=poly;for(const [a,k,ge]of[[0,x,true],[0,x+s,false],[1,z,true],[1,z+s,false]]){p=clip(p,a,k,ge);if(p.length<3)return [];}return p;}
function indexed(m){const a=m.vertices,out=[],ix=[],ids=new Map();for(let i=0;i<a.length;i+=9){const key=[a[i],a[i+1],a[i+2],a[i+3],a[i+4],a[i+5],a[i+6],a[i+7],a[i+8]].map(v=>v.toFixed(5)).join(',');let id=ids.get(key);if(id===undefined){id=out.length/9;ids.set(key,id);for(let k=0;k<9;k++)out.push(a[i+k]);}ix.push(id);}return {...m,vertices:new Float32Array(out),index:new Uint32Array(ix)};}
const terrainCache=new Map();
function sampled(t,x,z){let key=x.toFixed(5)+','+z.toFixed(5),v=terrainCache.get(key);if(v)return v;let h=t.height(x,z),n=t.normal(x,z),c=surfaceColor(t,x,z,h,n);v={p:[x,h,z],n,c};terrainCache.set(key,v);return v;}
function needsFine(x,z){return x>=1408&&x<1792&&z>=0&&z<384||x>=128&&x<512&&z>=256&&z<640||x>=-1152&&x<=-896&&z>=-768&&z<=-512||x>=-1920&&x<=-1664&&z>=384&&z<=640;}
const TILE=256;
function resolution(x,z){return needsFine(x+128,z+128)?4:16;}
function makeTile(t,x0,z0,coarse=false,cut=false){const g=new G.Geometry(),s=coarse?(x0<=-896&&x0+256>=-1100&&z0<=-514&&z0+256>=-638?8:32):resolution(x0,z0),poly=cell(outline,x0,z0,TILE);if(poly.length<3)return null;
 const vertex=p=>sampled(t,p[0],p[1]);
 for(let z=z0;z<z0+TILE;z+=s)for(let x=x0;x<x0+TILE;x+=s){let ps=cell(poly,x,z,s);if(ps.length<3)continue;
  // Both near and far versions have the SAME 4m boundary samples. No cracks
  // when different resolutions meet, and no skirts hidden inside the island.
  let p=[];for(let k=0;k<ps.length;k++){let a=ps[k],b=ps[(k+1)%ps.length];p.push(a);if((Math.abs(a[0]-b[0])<1e-6&&(Math.abs(a[0]-x0)<1e-6||Math.abs(a[0]-x0-TILE)<1e-6))||(Math.abs(a[1]-b[1])<1e-6&&(Math.abs(a[1]-z0)<1e-6||Math.abs(a[1]-z0-TILE)<1e-6))){let axis=Math.abs(a[0]-b[0])<1e-6?1:0,ts=[];for(let q=Math.ceil(Math.min(a[axis],b[axis])/4)*4;q<Math.max(a[axis],b[axis]);q+=4){let u=(q-a[axis])/(b[axis]-a[axis]);if(u>1e-6&&u<1-1e-6)ts.push(u);}ts.sort((a,b)=>a-b);for(const u of ts)p.push([mix(a[0],b[0],u),mix(a[1],b[1],u)]);}}
  // For the inspection hole, split polygons exactly at all four cut planes,
  // then drop the inside fragments. Only this small patch changes.
  let fragments=[p];if(cut&&x<hole.x1&&x+s>hole.x0&&z<hole.z1&&z+s>hole.z0){for(const [axis,k]of[[0,hole.x0],[0,hole.x1],[1,hole.z0],[1,hole.z1]]){let next=[];for(const q of fragments){let a=clip(q,axis,k,true),b=clip(q,axis,k,false);if(a.length>=3)next.push(a);if(b.length>=3)next.push(b);}fragments=next;}fragments=fragments.filter(q=>{let X=q.reduce((a,v)=>a+v[0],0)/q.length,Z=q.reduce((a,v)=>a+v[1],0)/q.length;return X<hole.x0-1e-7||X>hole.x1+1e-7||Z<hole.z0-1e-7||Z>hole.z1+1e-7;});}
  for(let q of fragments){let center=[q.reduce((a,v)=>a+v[0],0)/q.length,q.reduce((a,v)=>a+v[1],0)/q.length];for(let k=0;k<q.length;k++){let vs=[vertex(center),vertex(q[k]),vertex(q[(k+1)%q.length])];if(G.cross(G.sub(vs[1].p,vs[0].p),G.sub(vs[2].p,vs[0].p))[1]<0)vs=[vs[0],vs[2],vs[1]];for(const v of vs)g.vertex(v.p,v.n,v.c);}}
 }
 if(!g.a.length)return null;return indexed(g.mesh(`island:terrain:${x0}:${z0}${cut?':cut':''}`,'terrain',{owner:'island',region:'island',space:'surface',overview:true,component:'island-terrain',material:'ground',lodDistance:620,globalSurface:true,tile:[x0,z0,TILE],cutOnly:cut,cutReplace:!cut&&x0<hole.x1&&x0+TILE>hole.x0&&z0<hole.z1&&z0+TILE>hole.z0}));
}
function terrainTiles(t){let out=[];terrainCache.clear();for(let z=-2560;z<2048;z+=TILE)for(let x=-2304;x<2304;x+=TILE){let near=makeTile(t,x,z),far=makeTile(t,x,z,true);if(!near)continue;
 // Far geometry retains the indexed compact version; renderer's farVertices
 // API is non-indexed, so use a second owner-identical record selected by range.
 near.terrainResolution='near';near.globalNear=true;far.id+=':far';far.terrainResolution='far';far.globalFar=true;out.push(near,far);
 if(near.cutReplace){let a=makeTile(t,x,z,false,true),b=makeTile(t,x,z,true,true);a.globalNear=true;b.globalFar=true;b.id+=':far';out.push(a,b);}}
 terrainCache.clear();return out;}
function shell(t){const g=new G.Geometry(),bottom=new G.Geometry(),rim=new G.Geometry(),edges=[];
 // Sample one connected outer rim. No copies of regional plinths remain.
 for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/20);for(let j=0;j<n;j++)edges.push([mix(a[0],b[0],j/n),mix(a[1],b[1],j/n)]);}
 const center=[-120,-230],C=[rgb('#716e55'),rgb('#777b6c'),rgb('#62736b'),rgb('#506675')];
 const layer=(p,k)=>{let h=t.height(...p),w=noise(p[0]/120,p[1]/100);if(k===0)return[p[0],h,p[1]];if(k===1)return[p[0],h-6.5,p[1]];if(k===2)return[p[0],-100-45*w,p[1]];if(k===3)return[mix(p[0],center[0],.018),-264-30*w,mix(p[1],center[1],.018)];return[mix(p[0],center[0],.095),-396-35*w,mix(p[1],center[1],.095)];};
 for(let i=0;i<edges.length;i++){let a=edges[i],b=edges[(i+1)%edges.length];for(let k=0;k<4;k++)g.quad(layer(a,k),layer(b,k),layer(b,k+1),layer(a,k+1),blend(C[k],rgb('#9a9278'),.06*noise(a[0]/70,a[1]/65)));const A=layer(a,4),B=layer(b,4);bottom.tri(A,[-120,-480,-230],B,rgb('#435a67'));}
 return [indexed(g.mesh('island:outer-cliff','terrain',{owner:'island',overview:true,globalSurface:true,component:'outer-shell',material:'cutEarth'})),indexed(bottom.mesh('island:closed-underside','terrain',{owner:'island',overview:true,globalSurface:true,component:'underside',material:'cutEarth'}))];
}
function cutWalls(t){const g=new G.Geometry(),ps=[[hole.x0,hole.z0],[hole.x1,hole.z0],[hole.x1,hole.z1],[hole.x0,hole.z1]],col=rgb('#776f60');for(let i=0;i<4;i++){let a=ps[i],b=ps[(i+1)%4],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/4);for(let j=0;j<n;j++){let A=[mix(a[0],b[0],j/n),mix(a[1],b[1],j/n)],B=[mix(a[0],b[0],(j+1)/n),mix(a[1],b[1],(j+1)/n)];g.quad([A[0],t.height(...A),A[1]],[B[0],t.height(...B),B[1]],[B[0],-47,B[1]],[A[0],-47,A[1]],col);}}
 return indexed(g.mesh('island:inspection-walls','terrain',{owner:'island',overview:true,globalSurface:true,cutOnly:true,component:'inspection-walls',material:'cutEarth'}));}
function roads(t){let batches=new Map();const add=(key,kind)=>{if(!batches.has(key))batches.set(key,{g:new G.Geometry(),kind});return batches.get(key).g;};const routeData=[];
 for(const r of allRoutes){let count=0;for(let i=0;i<r.samples.length-1;i++){const a=r.samples[i],b=r.samples[i+1],X=(a[0]+b[0])/2,Z=(a[1]+b[1])/2,owner=G.DIORAMA.owner(X,Z)||'connections';if(!inside(X,Z))continue;if(t.water(X,Z)&&r.id!=='route-shrine')continue; // Never lay a new road through existing lakes.
 let prev=r.samples[Math.max(0,i-1)],next=r.samples[Math.min(r.samples.length-1,i+2)];const normal=(p,q)=>{let dx=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dx,dz)||1;return[-dz/l,dx/l];},na=normal(prev,b),nb=normal(a,next);const point=(p,n,s)=>[p[0]+n[0]*s,t.height(p[0]+n[0]*s,p[1]+n[1]*s)+.13,p[1]+n[1]*s];let half=r.width*.5;
 const key=owner+':'+Math.floor(X/512)+':'+Math.floor(Z/512);let g=add(key,owner);g.quad(point(a,na,-half),point(a,na,half),point(b,nb,half),point(b,nb,-half),rgb('#9e946f'));
 for(const side of[-1,1]){let q=add(key+':shoulder',owner);const inner=half,outer=half+2.5;let ps=[point(a,na,side*inner),point(a,na,side*outer),point(b,nb,side*outer),point(b,nb,side*inner)];q.quad(...ps,rgb('#839063'));}count++;}
 routeData.push({id:r.id,from:r.from,to:r.to,samples:r.samples.length,renderedSegments:count,positionBasis:'P: retained v0.14 logical route; complete connecting ground'});}
 const meshes=[...batches].map(([key,b])=>indexed(b.g.mesh('island:routes:'+key,'roads',{owner:'island',overview:true,globalSurface:true,component:'connection-road',pathOwner:b.kind,material:'ground'})));
 return{meshes,routeData};}
function vegetation(t){const R=G.rng(150927),groups=new Map(),trees=[],rockSites=[],fields=[];const get=(kind,x,z)=>{let key=kind+':'+Math.floor(x/512)+':'+Math.floor(z/512);if(!groups.has(key))groups.set(key,{kind,ma:[],co:[],lo:[Infinity,Infinity,Infinity],hi:[-Infinity,-Infinity,-Infinity]});return groups.get(key);};
 function instance(kind,x,y,z,s,ang,color){let p=get(kind,x,z);p.ma.push(...G.instanceMatrix(x,y,z,s,s,s,ang));p.co.push(...color);for(let i=0;i<3;i++){let v=[x,y,z][i];p.lo[i]=Math.min(p.lo[i],v-18*s);p.hi[i]=Math.max(p.hi[i],v+28*s);}}
 // Broad transitional woodland clusters, open meadows and young woodland edge.
 // Keep old core planting and every old scene's geometry intact.
 for(let z=-2330;z<1840;z+=24)for(let x=-2110;x<1930;x+=24){let X=x+R()*18,Z=z+R()*18;if(!inside(X,Z)||polygonDistance(outline,X,Z)<22||G.DIORAMA.owner(X,Z))continue;let h=t.height(X,Z),n=t.normal(X,Z),d=routeNear(X,Z);if(t.water(X,Z,.16)||n[1]<.58||h>870||d.d<d.w*.6+5)continue;
 const grove=noise((X+130)/145,(Z-70)/130),soft=noise(X/450,Z/400),forest=1-smooth(0,185,polygonDistance(G.DIORAMA.map.get('forest').poly,X,Z)),bamboo=1-smooth(0,165,polygonDistance(G.DIORAMA.map.get('bamboo').poly,X,Z));
 const probability=G.clamp((grove-.37)*1.55+forest*.22+bamboo*.20,.035,.88);if(R()>probability)continue;let s=.75+R()*.8,color=blend(rgb('#456e48'),rgb('#82925b'),R()*.65);const kind=bamboo>.25&&R()<bamboo?'bamboo':h>230||soft<.37?'pine':'broad';instance(kind,X,h,Z,s,R()*6.283,color);trees.push([X,h,Z,kind]);
 if(R()<.22)instance('shrub',X+R()*8-4,h,Z+R()*8-4,.65+R()*.7,R()*6.283,rgb('#6f8852'));
 }
 // Small irregular farm patches between the settlement and incoming roads.
 const plotDefs=[[-394,143,108,59,.17],[-415,-88,86,63,-.13],[-205,417,88,54,-.29],[84,535,83,64,.3],[164,620,86,57,-.24],[-303,-416,85,46,.13],[-379,575,90,59,-.36],[-454,731,76,50,.16]];
 const patches=new G.Geometry(),furrows=new G.Geometry(),fences=new G.Geometry();
 for(let i=0;i<plotDefs.length;i++){let[X,Z,W,D,A]=plotDefs[i],cos=Math.cos(A),sin=Math.sin(A),pts=[[-W*.52,-D*.48],[W*.45,-D*.54],[W*.54,D*.41],[-W*.43,D*.52]].map(p=>[X+cos*p[0]+sin*p[1],Z-sin*p[0]+cos*p[1]]);if(pts.some(p=>G.DIORAMA.owner(...p)||t.water(...p)||routeNear(...p).d<12))continue;
 const xy=(x,z)=>[X+cos*x+sin*z,Z-sin*x+cos*z],v=(x,z)=>{let p=xy(x,z);return[p[0],t.height(...p)+.08,p[1]];};for(let x=-W*.43;x<W*.43;x+=4)for(let z=-D*.42;z<D*.38;z+=4){let p=[v(x,z),v(x,z+4),v(x+4,z+4),v(x+4,z)];patches.quad(...p,rgb(['#829453','#a0a35d','#77894c'][i%3]));}
 for(let x=-W*.4;x<W*.4;x+=3.1){let g=furrows;for(let z=-D*.39;z<D*.39;z+=6){let a=v(x,z),b=v(x,z+6);g.tube(a,b,.12,rgb('#636f43'),3);}}
 for(let x=-W*.46;x<W*.46;x+=9){let p=v(x,D*.45);fences.box(p[0],p[1],p[2],.28,1.0,.28,rgb('#877654'));}
 fields.push({center:[X,t.height(X,Z),Z],width:W,depth:D,basis:'P'});
 }
 // Fine grasses and hedgerow margins only beside the connecting routes.
 let grassCount=0;
 for(const r of allRoutes){for(let i=3;i<r.samples.length-3;i+=3){let a=r.samples[i],b=r.samples[i+1];if(G.DIORAMA.owner(...a))continue;const len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,n=[-(b[1]-a[1])/len,(b[0]-a[0])/len];for(const side of[-1,1])for(let j=0;j<4;j++){const spread=r.width*.5+1.5+R()*7,x=a[0]+n[0]*spread*side+R()*2,z=a[1]+n[1]*spread*side+R()*2;if(!inside(x,z)||t.water(x,z))continue;instance('grass',x,t.height(x,z)+.05,z,.8+R()*.9,R()*6.283,blend(rgb('#6f8b49'),rgb('#a1a360'),R()*.5));grassCount++;if(j===0&&R()<.32)instance('shrub',x,t.height(x,z),z,.50+R()*.5,R()*6.283,rgb('#71854f'));}}}
 // Rocks concentrated in hillside breaks, not uniform noise spread everywhere.
 for(let i=0;i<400;i++){let X=-2070+R()*3980,Z=-2200+R()*4010;if(!inside(X,Z)||G.DIORAMA.owner(X,Z)||t.water(X,Z,.1))continue;let n=t.normal(X,Z);if(n[1]>.90||n[1]<.35||routeNear(X,Z).d<8)continue;let h=t.height(X,Z),s=1.2+R()*2.4;instance('rock',X,h-.5,Z,s,R()*6.283,rgb('#88927c'));rockSites.push([X,h,Z]);}
 const prototypes={};let g=new G.Geometry(),far=new G.Geometry();g.tube([0,0,0],[.2,9.5,0],.45,rgb('#675c46'),6,.15);for(const s of[-1,1])g.tube([0,5,0],[s*3.7,10,.8],.19,rgb('#675c46'),5,.03);for(let i=0;i<5;i++){let a=i*2.4;g.ellipsoid(Math.cos(a)*2.6,10.2+Math.sin(i)*1.7,Math.sin(a)*2.6,3.5,3.1,3.2,[1,1,1],7,4);}far.cone(0,0,0,.5,.2,8,rgb('#675c46'),4);far.ellipsoid(0,10,0,5.1,4.5,4.7,[1,1,1],6,3);prototypes.broad={near:g.mesh('n').vertices,far:far.mesh('f').vertices};
 g=new G.Geometry();far=new G.Geometry();g.cone(0,0,0,.43,.15,15,rgb('#685c46'),5);for(let j=0;j<5;j++)g.cone(0,4+j*2.15,0,4.5-j*.65,.25,4.8,[1,1,1],7);far.cone(0,0,0,.4,.1,7,rgb('#685c46'),4);far.cone(0,3,0,4.3,.1,15,[1,1,1],6);prototypes.pine={near:g.mesh('n').vertices,far:far.mesh('f').vertices};
 g=new G.Geometry();for(let i=0;i<5;i++){let x=Math.cos(i*2.4)*1.4,z=Math.sin(i*2.4)*1.4;g.cone(x,0,z,.15,.09,12+i%3,[1,1,1],5);for(let k=7;k<13;k+=2){g.ellipsoid(x+Math.sin(i+k),k,z,1.3,.45,.7,[1,1,1],5,2);}}prototypes.bamboo={near:g.mesh('n').vertices};prototypes.bamboo.far=prototypes.bamboo.near;
 g=new G.Geometry();g.ellipsoid(0,.8,0,1.8,1.0,1.3,[1,1,1],6,3);prototypes.shrub={near:g.mesh('n').vertices};prototypes.shrub.far=prototypes.shrub.near;
 g=new G.Geometry();g.ellipsoid(0,.8,0,2.2,1.65,1.9,[1,1,1],5,3);prototypes.rock={near:g.mesh('n').vertices};prototypes.rock.far=prototypes.rock.near;
 g=new G.Geometry();for(let k=0;k<7;k++){const a=k*2.399,h=.6+(k%3)*.23;g.tri([-.12*Math.cos(a),0,-.12*Math.sin(a)],[.12*Math.cos(a),0,.12*Math.sin(a)],[Math.sin(a)*.3,h,Math.cos(a)*.3],[1,1,1]);}prototypes.grass={near:g.mesh('n').vertices};prototypes.grass.far=prototypes.grass.near;
 const meshes=[];for(const [key,p] of groups){meshes.push({id:'island:transition:'+key,owner:'island',overview:true,globalSurface:true,component:'transition-vegetation',nearDecoration:p.kind==='grass',material:'foliage',group:'vegetation',vertices:prototypes[p.kind].near,farVertices:prototypes[p.kind].far,instances:new Float32Array(p.ma),instanceColors:new Float32Array(p.co),center:p.lo.map((v,i)=>(v+p.hi[i])/2),radius:G.length(G.sub(p.hi,p.lo))/2,lodDistance:360});}
 for(const [gg,id,mat] of[[patches,'fields','ground'],[furrows,'furrows','foliage'],[fences,'fences','timber']])if(gg.a.length)meshes.push(indexed(gg.mesh('island:'+id,'architecture',{owner:'island',overview:true,globalSurface:true,component:'transition-fields',material:mat,maxDetailDistance:id==='furrows'?650:undefined})));
 return{meshes,meta:{treeCount:trees.length,fields,rockCount:rockSites.length,grassCount,trees,rockSites}};
}
function build(t){const topo=terrainTiles(t),r=roads(t),v=vegetation(t);return{meshes:[...topo,...shell(t),cutWalls(t),...r.meshes,...v.meshes],meta:{version:'0.15.0',singleOuterBoundary:true,topologicalLandComponents:1,outline,hole,roads:r.routeData,vegetation:v.meta,basis:'P: continuous island and transition scenery; regional logic unchanged'}};}
G.ISLAND={outline,hole,inside,polygonDistance,protectedDistance,transitionWeight,routeNear,surfaceColor,build,indexed,resolution,allRoutes};
// Surface regions are never translated. The historical cave stays directly
// under the cemetery; Senkai is entered separately, not hung above this island.
G.DIORAMA.transform=function(){return{scale:1,offset:[0,0,0]};};
G.DIORAMA.point=function(p){return p.slice();};
G.DIORAMA.inverse=function(p){return p.slice();};
G.PRESETS.diorama={label:'幻想乡 · 连续空岛',region:'world',space:'surface',eye:[3360,2750,4580],target:[-100,110,-250]};
G.PRESETS.overview=G.PRESETS.diorama;
G.PRESETS.dioramaLayers={label:'命莲寺 · 地下剖切',region:'world',space:'surface',eye:[625,540,805],target:[317,-30,500]};
G.PRESETS.continuous={label:'全岛俯瞰',region:'world',space:'surface',eye:[850,4360,2610],target:[-100,130,-340]};
G.PRESETS.islandEdge={label:'空岛外缘与云海',region:'world',space:'surface',eye:[2580,780,3380],target:[-120,75,-100]};
G.PRESETS.transitionForest={label:'田野与林缘',region:'connections',eye:[-285,70,185],target:[-470,43,18]};
G.PRESETS.transitionBamboo={label:'竹林外的缓坡',region:'connections',eye:[56,138,456],target:[363,82,777]};
G.PRESETS.transitionFlowers={label:'花田外的草坡',region:'connections',eye:[-245,155,735],target:[-490,105,1090]};
G.PRESETS.transitionLake={label:'山脚湖畔来路',region:'connections',eye:[-250,224,-236],target:[113,125,-482]};
G.PRESETS.shrineDiorama.label='博丽神社 · 山林庭院';
G.PRESETS.shrineSite.label='神社山坡与连接兽道';
G.PRESETS.shrineDioramaBack.label='后庭与山林';
G.PRESETS.shrineDioramaSide.label='石阶与连续山坡';
})(globalThis.GA);

/* Region builders invoke only the selected detail region. They do not call
 * createWorld() and do not generate the entire world before returning. */
(function(G){'use strict';
async function inflatePack(b64){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const buf=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return decodePack(buf);}
function decodePack(buf){let n=new DataView(buf).getUint32(0,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,n)).trim()),off=4+n;const arrays=json.arrays.map(a=>new ({f32:Float32Array,u32:Uint32Array,u16:Uint16Array}[a.type])(buf,off+a.offset,a.length));for(const m of json.meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(m[k]?.array!==undefined)m[k]=arrays[m[k].array];return json;}
function plantSubset(pack,owner){const out=[],owned=(x,z)=>G.DIORAMA.owner(x,z)===owner;let clone=new Map();const copy=a=>{if(!clone.has(a))clone.set(a,a.slice());return clone.get(a);};for(const m of pack.meshes){const ma=[],co=[];for(let i=0;i<m.instances.length;i+=16){if(!owned(m.instances[i+12],m.instances[i+14]))continue;for(let j=0;j<16;j++)ma.push(m.instances[i+j]);for(let j=0;j<3;j++)co.push(m.instanceColors[i/16*3+j]);}if(!ma.length)continue;const xs=[],ys=[],zs=[];for(let i=0;i<ma.length;i+=16){xs.push(ma[i+12]);ys.push(ma[i+13]);zs.push(ma[i+14]);}const lo=[Math.min(...xs)-18,Math.min(...ys),Math.min(...zs)-18],hi=[Math.max(...xs)+18,Math.max(...ys)+45,Math.max(...zs)+18];out.push({...m,id:owner+':legacy:'+m.id,owner,region:owner,vertices:copy(m.vertices),farVertices:copy(m.farVertices),instances:new Float32Array(ma),instanceColors:new Float32Array(co),center:lo.map((v,i)=>(v+hi[i])/2),radius:G.length(G.sub(hi,lo))/2,legacyInstanceIdentity:true});}return out;}
function cleanMeta(m){return JSON.parse(JSON.stringify(m,(k,v)=>['plantRecords','treeRecords'].includes(k)?undefined:v));}
async function buildRegion(data,id,legacyB64){const t=new G.Terrain(data),start=performance.now();let p;
 switch(id){case'village':{const v=G.buildVillage(t);p={meshes:v.meshes,meta:{houses:v.houses,gardens:v.gardens,refinement:v.refinement},signs:[],plantSites:v.plantSites};break;}
 case'hakurei':p=G.styleHakurei(G.buildHakurei(t));p.meshes.push(...G.hakureiPlanting(t,p.plantSites));break;
 case'trail':{const a=G.buildTrail(t),b=G.buildMystia(t);p={meshes:[...a.meshes,...b.meshes],signs:b.signs,meta:{trail:a.meta,mystia:b.meta}};break;}
 case'scarlet':p=G.buildScarlet(t);break;
 case'myouren':p=G.buildMyouren(t);break;
 case'mausoleum':p=G.buildMausoleum();break;
 case'senkai':p=G.buildSenkai();p.meshes.find(m=>m.id==='senkai:ground').legacyBackdrop=true;p.meshes.push(G.dioramaTerrain(G.senkaiDisplayGround(),G.DIORAMA.map.get('senkai'),6,false));break;
 case'bamboo':p=G.buildBamboo(t);break;
 case'sunflower':case'nameless':{const f=G.buildFlowerlands(t);p={...f,meshes:f.meshes.filter(m=>m.region===id)};break;}
 case'mountain':p=G.buildMountain(t);break;
 case'forest':p=G.buildForest(t);break;
 case'muenzuka':p=G.WEST.buildMuenzuka(t);break;
 case'genbu':p=G.WEST.buildGenbu(t);break;
 default:{const r=G.buildRegionalLandmarks(t,{placements:new Map(data.placements.map(x=>[x.id,x]))});p={meshes:r.meshes.filter(m=>G.DIORAMA.owner(...[m.center[0],m.center[2]])===id),signs:[],meta:{preview:true}};}
 }
 p.meshes=p.meshes.filter(m=>m.vertices?.length);p.signs=p.signs||[];
 for(const m of p.meshes){m.owner=id;if(!m.space)m.space='surface';if(!m.region)m.region=id;}
 // Old trees are selected by original instance identity, not by center of a mixed batch.
 if(legacyB64&&!['forest','hakurei','mausoleum','senkai','bamboo','sunflower','nameless','mountain','genbu','muenzuka'].includes(id))p.meshes.push(...plantSubset(await inflatePack(legacyB64),id));
 const block=G.DIORAMA.map.get(id);// v0.15 ground comes from the common uninterrupted island, not regional slabs.
 if(['scarlet','mountain','village'].includes(id)){const water=t.waterMeshes().filter(m=>id==='scarlet'?m.id==='mist_lake-water':id==='mountain'?m.id==='wind_lake-water':m.id==='village-canal-water');p.meshes.push(...water.map(m=>({...m,owner:id})));}
 // Keep external route geometry only inside this authored display block; renderer
 // can use the full coarse road network in the continuous check mode.
 // External routes are now complete global ribbons, shared across ownership boundaries.

 p.meta=cleanMeta(p.meta||{});p.id=id;p.builtMs=performance.now()-start;p.source='v0.13-preserved-builder';if(id==='forest')p.source='reconstructed_from_agreed_scope';if(['genbu','muenzuka'].includes(id))p.source='v0.16-western-refinement';
 const seen=new Set();p.bytes=0;for(const m of p.meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index']){const a=m[k];if(a&&!seen.has(a.buffer)){seen.add(a.buffer);p.bytes+=a.buffer.byteLength;}}
 return p;
}
Object.assign(G,{inflatePack,decodePack,plantSubset,buildRegion});
})(globalThis.GA);

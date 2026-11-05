/* 镜头手感：旋转、平移、缩放和飞行、地面移动都带缓动。
 * 总位移与父类完全一致，只把输入分摊到后续几帧；模式切换和限位仍由父类处理。
 * 测试暂停时直接生效，固定机位的检查不受影响。 */
(function(G){'use strict';
const Base=G.CameraRig;
// 部分检查只加载渲染器，没有相机类。
if(!Base)return;
const LOOK_RATE=13,FLY_RATE=7,GROUND_RATE=10,REST_PIXELS=.02,REST_ZOOM=.2,REST_SPEED=.05;
class EasedCamera extends Base{
 constructor(...args){super(...args);this.clearEase();}
 clearEase(){this.pendingRotate=[0,0];this.pendingPan=[0,0];this.pendingZoom=0;this.moveVelocity=[0,0,0];this.stepPhase=0;this.coasting=false;}
 setView(view,animate=true){this.clearEase();return super.setView(view,animate);}
 setMode(mode){this.clearEase();return super.setMode(mode);}
 rotate(dx,dy){
  if(globalThis.ATLAS_TEST_PAUSE)return super.rotate(dx,dy);
  this.transition=null;this.pendingRotate[0]+=dx;this.pendingRotate[1]+=dy;this.changed();
 }
 pan(dx,dy){
  if(globalThis.ATLAS_TEST_PAUSE)return super.pan(dx,dy);
  this.transition=null;this.pendingPan[0]+=dx;this.pendingPan[1]+=dy;this.changed();
 }
 zoom(delta){
  if(globalThis.ATLAS_TEST_PAUSE)return super.zoom(delta);
  this.transition=null;this.pendingZoom+=this.mode==='fly'?G.clamp(delta,-240,240):delta;this.changed();
 }
 settleInput(dt){
  const share=1-Math.exp(-dt*LOOK_RATE),rotate=this.pendingRotate,pan=this.pendingPan;
  const part=(value,rest)=>Math.abs(value)<rest?value:value*share;
  const rx=part(rotate[0],REST_PIXELS),ry=part(rotate[1],REST_PIXELS),px=part(pan[0],REST_PIXELS),py=part(pan[1],REST_PIXELS),z=part(this.pendingZoom,REST_ZOOM);
  rotate[0]-=rx;rotate[1]-=ry;pan[0]-=px;pan[1]-=py;this.pendingZoom-=z;
  if(rx||ry)super.rotate(rx,ry);
  if(px||py)super.pan(px,py);
  if(z)super.zoom(z);
 }
 // 父类这一帧走出的位移当作目标速度，按时间常数逼近，起步和松键都不再是硬切。
 smoothMove(before,dt){
  const ground=this.mode==='ground',velocity=this.moveVelocity,blend=1-Math.exp(-dt*(ground?GROUND_RATE:FLY_RATE));
  for(let i=0;i<3;i++)velocity[i]+=((this.eye[i]-before[i])/dt-velocity[i])*blend;
  if(ground)velocity[1]=0;
  if(Math.hypot(...velocity)<REST_SPEED)velocity.fill(0);
  let next=G.add(before,G.mul(velocity,dt));
  if(ground){
   if(!G.ISLAND.inside(next[0],next[2])){velocity.fill(0);next=before.slice();}
   const pace=Math.hypot(velocity[0],velocity[2]);this.stepPhase+=dt*pace*1.9;
   next[1]=this.terrain.height(next[0],next[2])+1.82+Math.sin(this.stepPhase)*.035*Math.min(1,pace/4);
  }
  this.eye=next;this.aim();this.updateMatrices();
 }
 update(dt){
  this.settleInput(dt);
  const free=(this.mode==='fly'||this.mode==='ground')&&!this.transition&&dt>0,before=free?this.eye.slice():null;
  super.update(dt);
  if(free)this.smoothMove(before,dt);
  this.coasting=!!(this.pendingRotate[0]||this.pendingRotate[1]||this.pendingPan[0]||this.pendingPan[1]||this.pendingZoom||Math.hypot(...this.moveVelocity));
  // app.js 的续帧条件不认识缓动，这里自己续帧。
  if(this.coasting)this.changed();
 }
}
G.CameraRig=EasedCamera;
})(globalThis.GA);

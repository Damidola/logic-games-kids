import {BOOSTS} from './engine.mjs?v=20261024-boosts';
import {drawHero} from './heroes.js?v=20261024-boosts';
import {drawBackground,star} from './scenery.js?v=20261024-boosts';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function capsule(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function flame(ctx,x,y,size,t){
  const length=size*(reduced?1:1+Math.sin(t*32)*.13);ctx.save();ctx.translate(x,y);ctx.fillStyle='#ff9a59b0';ctx.beginPath();ctx.moveTo(-size*.45,0);ctx.quadraticCurveTo(-size*.7,length*.45,0,length);ctx.quadraticCurveTo(size*.7,length*.45,size*.45,0);ctx.fill();ctx.fillStyle='#ffeaae';ctx.beginPath();ctx.moveTo(-size*.23,0);ctx.quadraticCurveTo(-size*.28,length*.4,0,length*.7);ctx.quadraticCurveTo(size*.28,length*.4,size*.23,0);ctx.fill();ctx.restore();
}
function rocket(ctx,x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#e18b80';ctx.beginPath();ctx.moveTo(-9,7);ctx.lineTo(-19,21);ctx.lineTo(-18,5);ctx.lineTo(-8,-5);ctx.fill();ctx.beginPath();ctx.moveTo(9,7);ctx.lineTo(19,21);ctx.lineTo(18,5);ctx.lineTo(8,-5);ctx.fill();
  const metal=ctx.createLinearGradient(-11,0,11,0);metal.addColorStop(0,'#c6d6df');metal.addColorStop(.45,'#f7fbff');metal.addColorStop(1,'#a7b9cc');ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(0,-31);ctx.bezierCurveTo(10,-23,15,-6,9,14);ctx.lineTo(-9,14);ctx.bezierCurveTo(-15,-6,-10,-23,0,-31);ctx.fill();ctx.fillStyle='#e18b80';ctx.beginPath();ctx.moveTo(0,-31);ctx.quadraticCurveTo(8,-24,10,-16);ctx.lineTo(-10,-16);ctx.quadraticCurveTo(-8,-24,0,-31);ctx.fill();capsule(ctx,-8,12,16,5,2,'#758caa');ctx.fillStyle='#6dc7e3';ctx.strokeStyle='#91a8b9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-5,6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffffb0';ctx.beginPath();ctx.arc(-2,-7,1.8,0,Math.PI*2);ctx.fill();ctx.restore();
}
function jetpack(ctx,x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.strokeStyle='#657d94';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-10);ctx.quadraticCurveTo(0,-20,8,-10);ctx.stroke();for(const sx of[-10,10]){const tank=ctx.createLinearGradient(sx-6,0,sx+6,0);tank.addColorStop(0,'#7e9db9');tank.addColorStop(.4,'#d7edf1');tank.addColorStop(1,'#7094b3');capsule(ctx,sx-6,-14,12,29,5,tank);capsule(ctx,sx-5,13,10,5,2,'#54758c');capsule(ctx,sx-6,-8,12,5,1,'#eaac78')}capsule(ctx,-6,-9,12,21,3,'#91b7cf');capsule(ctx,-4,-6,8,5,2,'#b7ecde');ctx.restore();
}
function spring(ctx,x,superSpring,pulse){
  const color=superSpring?'#b38bd9':'#eb987c',height=pulse?14:24;ctx.save();ctx.translate(x,0);capsule(ctx,-14,-3,28,5,2,'#80939c');ctx.strokeStyle=superSpring?'#b9a5d9':'#9aa9b0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-9,-4);for(let i=0;i<6;i++)ctx.lineTo(i%2?-9:9,-4-(i+1)*(height-6)/6);ctx.stroke();capsule(ctx,-17,-height,34,6,3,color);capsule(ctx,-15,-height,30,2,1,'#fff9e19c');if(superSpring){star(ctx,-21,-height-8,3,'#d8bced');star(ctx,23,-height-3,2,'#d8bced')}ctx.restore();
}
function trampoline(ctx,x,pulse){ctx.save();ctx.translate(x,0);ctx.strokeStyle='#637f8c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-24,-5);ctx.lineTo(-26,0);ctx.moveTo(24,-5);ctx.lineTo(26,0);ctx.stroke();ctx.fillStyle='#4b7c93';ctx.beginPath();ctx.ellipse(0,pulse?-7:-13,30,7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#68d7bb';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#9fdedc66';ctx.lineWidth=.8;for(let i=-16;i<=16;i+=8){ctx.beginPath();ctx.moveTo(i,-16);ctx.lineTo(i+4,-10);ctx.stroke()}ctx.restore();}
export function drawScene(ctx,world,hero,theme,t){
  const {width:w,height:h}=ctx.canvas,blend=drawBackground(ctx,world,theme,t,reduced);
  for(const e of world.trail){ctx.save();ctx.globalAlpha=e.life*.7;const y=e.y-world.camera,r=(.7-e.life)*15;ctx.fillStyle=e.type==='rocket'?'#ffca94':'#c6e4f6';ctx.beginPath();ctx.arc(e.x,y,r,0,7);ctx.fill();ctx.restore()}
  for(const q of world.platforms){
    const sy=q.y-world.camera;if(sy<-80||sy>h+30)continue;ctx.save();ctx.translate(q.x,sy);ctx.shadowColor=blend.dark>.5?'#00000050':'#8caa8c30';ctx.shadowBlur=5;ctx.shadowOffsetY=4;
    capsule(ctx,0,0,q.w,12,7,q.type==='moving'?'#bba3dc':blend.dark>.5?'#83b7ac':'#a5c795');ctx.shadowBlur=0;ctx.shadowOffsetY=0;capsule(ctx,2,0,q.w-4,4,3,q.type==='moving'?'#dbc9ef':'#d3e6b9');
    const cx=q.w/2,pulse=q.pulseUntil>world.time;
    if(q.type==='moving'){ctx.strokeStyle='#8d73ae';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-6,8);ctx.lineTo(cx+6,8);ctx.moveTo(cx-6,8);ctx.lineTo(cx-3,6);ctx.moveTo(cx+6,8);ctx.lineTo(cx+3,6);ctx.stroke()}
    if(q.bonus==='spring'||q.bonus==='superSpring')spring(ctx,cx,q.bonus==='superSpring',pulse);
    if(q.bonus==='trampoline')trampoline(ctx,cx,pulse);
    if(q.bonus==='jetpack'||q.bonus==='rocket'){
      const float=reduced?0:Math.sin(t*2+q.phase)*3;ctx.save();ctx.shadowColor=BOOSTS[q.bonus].color;ctx.shadowBlur=14;(q.bonus==='jetpack'?jetpack:rocket)(ctx,cx,-35+float,q.bonus==='jetpack'?.9:.8);ctx.restore();
    }
    if(q.star)star(ctx,cx,-30+(reduced?0:Math.sin(t*2+q.phase)*3),9,blend.dark>.5?'#ffe8a0':'#cfac53');ctx.restore();
  }
  for(const e of world.effects){const progress=1-e.life/e.maxLife,ey=e.y-world.camera;ctx.save();ctx.globalAlpha=Math.min(1,e.life*3);for(let i=0;i<7;i++)star(ctx,e.x+Math.cos(i*6.28/7)*progress*47,ey+Math.sin(i*6.28/7)*progress*30-progress*30,Math.max(0,(1-progress)*5),e.type==='boost'?BOOSTS[e.bonus].color:e.type==='star'?'#eac673':'#b6cba8');
    if(e.type==='boost'){ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle=blend.dark>.5?'#fff6db':'#496e61';ctx.fillText(BOOSTS[e.bonus].name,e.x,ey-55-progress*28)}ctx.restore();
  }
  const p=world.player,py=p.y-world.camera;const positions=[p.x];if(p.x<55)positions.push(p.x+w);if(p.x>w-55)positions.push(p.x-w);for(const px of positions){ctx.save();ctx.translate(px,py);ctx.rotate(p.vx/5000);
  if(blend.dark>.5&&hero==='cat'){ctx.shadowColor='#bedfff';ctx.shadowBlur=5}
  if(world.boost?.type==='jetpack'){jetpack(ctx,0,-4,1.5);flame(ctx,-15,23,24,t);flame(ctx,15,23,24,t)}
  if(world.boost?.type==='rocket'){rocket(ctx,0,42,.95);flame(ctx,0,59,48,t)}
  drawHero(ctx,hero,0,0);ctx.restore()}return blend;
}

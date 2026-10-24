export const THEMES = [
  { id:'day', name:'Хмаринки', at:0, top:'#c9e9f1', middle:'#e9f4e9', bottom:'#faf2ce', cloud:'#ffffffb5', dark:0 },
  { id:'sunset', name:'Захід сонця', at:150, top:'#a993d9', middle:'#f6b6bc', bottom:'#ffe2aa', cloud:'#ffe7d7a0', dark:0 },
  { id:'night', name:'Зоряна ніч', at:400, top:'#171b49', middle:'#343467', bottom:'#7b6396', cloud:'#bdb9e029', dark:1 },
  { id:'space', name:'Космос', at:750, top:'#070e29', middle:'#202555', bottom:'#473168', cloud:null, dark:1 },
  { id:'aurora', name:'Північне сяйво', at:1200, top:'#071e33', middle:'#164c5d', bottom:'#54788a', cloud:null, dark:1 }
];
export function themeBlend(height, selection='auto') {
  if(selection!=='auto'){const theme=THEMES.find(t=>t.id===selection)||THEMES[0];return {from:theme,to:theme,mix:0,dark:theme.dark}}
  let index=0;for(let i=1;i<THEMES.length;i++)if(height>=THEMES[i].at)index=i;
  if(height>=1600){const phase=Math.floor((height-1600)/400),from=THEMES[phase%2?3:4],to=THEMES[phase%2?4:3];const mix=Math.min(1,((height-1600)%400)/45);return {from,to,mix,dark:1}}
  const from=THEMES[Math.max(0,index-1)],to=THEMES[index],mix=index?Math.min(1,(height-to.at)/45):0;
  return {from:index?from:to,to,mix,dark:from.dark+(to.dark-from.dark)*mix};
}
function colorMix(a,b,t){const c=x=>[parseInt(x.slice(1,3),16),parseInt(x.slice(3,5),16),parseInt(x.slice(5,7),16)];const aa=c(a),bb=c(b);return `rgb(${aa.map((n,i)=>Math.round(n+(bb[i]-n)*t)).join(',')})`}
export function star(ctx,x,y,r=8,color='#d6bc72'){
  ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.restore();
}
export function cloud(ctx,x,y,s=1,color='#ffffffb5'){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-38,6);ctx.bezierCurveTo(-52,6,-53,-15,-36,-17);ctx.bezierCurveTo(-37,-39,-6,-43,2,-24);ctx.bezierCurveTo(18,-40,42,-25,36,-10);ctx.bezierCurveTo(59,-13,60,10,39,12);ctx.lineTo(-38,12);ctx.fill();ctx.restore();
}
function circle(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function decorations(ctx,theme,world,t,reduced){
  const {width:w,height:h}=ctx.canvas;
  if(theme.id==='day'){
    const sun=ctx.createRadialGradient(w*.78,h*.22,5,w*.78,h*.22,95);sun.addColorStop(0,'#fff8ca7a');sun.addColorStop(1,'#fff8ca00');ctx.fillStyle=sun;ctx.fillRect(w*.78-100,h*.22-100,200,200);
    ctx.save();ctx.globalAlpha=.3;['#eeb9c6','#efd39b','#d1dca2','#a9d4c5','#b7c5e1','#c7acdb'].forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=12;ctx.beginPath();ctx.arc(w+8,h*.45,170-i*11,Math.PI,Math.PI*1.54);ctx.stroke()});ctx.restore();
    if(world.height<90){ctx.save();ctx.globalAlpha=Math.max(0,1-world.height/90);ctx.fillStyle='#a5cda750';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,h-42-world.camera*.12);ctx.quadraticCurveTo(w*.22,h-130-world.camera*.12,w*.5,h-40-world.camera*.12);ctx.quadraticCurveTo(w*.8,h-100-world.camera*.12,w,h-32-world.camera*.12);ctx.lineTo(w,h);ctx.fill();ctx.restore()}
  }
  if(theme.id==='sunset'){
    const glow=ctx.createRadialGradient(w*.76,h*.25,20,w*.76,h*.25,120);glow.addColorStop(0,'#ffe7a7aa');glow.addColorStop(1,'#ffc78400');ctx.fillStyle=glow;ctx.fillRect(w*.76-120,h*.25-120,240,240);circle(ctx,w*.76,h*.25,48,'#ffe4ac');
    ctx.fillStyle='#a27db133';for(let j=0;j<2;j++){const base=h*.85+j*65;ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,base);for(let x=0;x<=w+60;x+=60)ctx.lineTo(x,base-Math.sin(x*.009+j)*45);ctx.lineTo(w,h);ctx.fill()}
  }
  if(theme.dark){
    for(let i=0;i<70;i++){const x=(i*127.31+17)%w,y=((i*79.87-world.camera*.055)%(h+30)+h+30)%(h+30);const alpha=reduced?.65:.5+Math.sin(t*.7+i)*.22;circle(ctx,x,y,i%6===0?1.6:.8,`rgba(237,238,255,${alpha})`)}
  }
  if(theme.id==='night'){
    ctx.save();ctx.translate(w*.8,h*.22);ctx.rotate(-.3);ctx.fillStyle='#ffedc1';ctx.beginPath();ctx.arc(0,0,35,Math.PI*.45,Math.PI*1.55);ctx.bezierCurveTo(-1,-20,-1,20,5.5,34.5);ctx.fill();ctx.restore();
    for(let i=0;i<7;i++)star(ctx,(i*97+30)%w,(i*113+90)%h,3,'#eee8ff95');
  }
  if(theme.id==='space'){
    for(const [x,y,c]of[[w*.2,h*.4,'#8456c83c'],[w*.8,h*.73,'#3c79c22b']]){const nebula=ctx.createRadialGradient(x,y,0,x,y,210);nebula.addColorStop(0,c);nebula.addColorStop(1,'#45266200');ctx.fillStyle=nebula;ctx.fillRect(x-210,y-210,420,420)}
    ctx.save();ctx.translate(w*.77,h*.28);ctx.rotate(-.3);ctx.strokeStyle='#d8baec73';ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(0,0,75,18,0,Math.PI,Math.PI*2);ctx.stroke();const planet=ctx.createLinearGradient(-30,-30,30,30);planet.addColorStop(0,'#ddb5dc');planet.addColorStop(.45,'#9e92cd');planet.addColorStop(1,'#5b5891');circle(ctx,0,0,37,planet);ctx.strokeStyle='#b899d1';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-29,-18);ctx.quadraticCurveTo(4,-8,35,-9);ctx.moveTo(-36,0);ctx.quadraticCurveTo(0,12,32,19);ctx.stroke();ctx.strokeStyle='#d8baecb0';ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(0,0,75,18,0,0,Math.PI);ctx.stroke();ctx.restore();
  }
  if(theme.id==='aurora'){
    ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<3;i++){const phase=reduced?i:t*.13+i,gradient=ctx.createLinearGradient(0,h*.1,0,h*.55);gradient.addColorStop(0,i%2?'#9e6be000':'#63f3bd00');gradient.addColorStop(.5,i%2?'#9e6be06b':'#63f3bd70');gradient.addColorStop(1,'#63f3bd00');ctx.strokeStyle=gradient;ctx.lineWidth=28+i*15;ctx.beginPath();ctx.moveTo(-50,h*.2+i*40);ctx.bezierCurveTo(w*.25,h*(.46+Math.sin(phase)*.04),w*.5,h*.05,w+50,h*.28+i*35);ctx.stroke()}ctx.restore();
    ctx.fillStyle='#122d4866';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,h*.88);for(let x=0;x<w+120;x+=110){ctx.lineTo(x+55,h*.72+(x%3)*15);ctx.lineTo(x+110,h*.9)}ctx.lineTo(w,h);ctx.fill();
  }
  if(theme.cloud)for(let i=0;i<6;i++){const y=((i*137-world.camera*.2)%(h+150)+h+150)%(h+150)-70;cloud(ctx,i%2?w-40:25,y,i%2?1.2:.9,theme.cloud)}
}
export function drawBackground(ctx,world,selection,t,reduced=false){
  const {width:w,height:h}=ctx.canvas,blend=themeBlend(world.height,selection);
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,colorMix(blend.from.top,blend.to.top,blend.mix));bg.addColorStop(.55,colorMix(blend.from.middle,blend.to.middle,blend.mix));bg.addColorStop(1,colorMix(blend.from.bottom,blend.to.bottom,blend.mix));ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.globalAlpha=1-blend.mix;decorations(ctx,blend.from,world,t,reduced);ctx.restore();if(blend.mix>0){ctx.save();ctx.globalAlpha=blend.mix;decorations(ctx,blend.to,world,t,reduced);ctx.restore()}
  return blend;
}

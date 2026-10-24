function cat(ctx,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.lineCap='round';ctx.lineJoin='round';
 const fur=ctx.createLinearGradient(-24,-20,27,23);fur.addColorStop(0,'#141619');fur.addColorStop(.45,'#28282b');fur.addColorStop(.72,'#1b1c20');fur.addColorStop(1,'#0e1115');
 // A long, relaxed tail, like the cat in the reference photograph.
 ctx.strokeStyle='#15171b';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(18,16);ctx.bezierCurveTo(35,13,43,13,46,20);ctx.bezierCurveTo(48,24,46,26,44,25);ctx.stroke();ctx.strokeStyle='#454149';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(25,14);ctx.bezierCurveTo(35,12,42,15,44,18);ctx.stroke();
 // Sloping shoulders and seated hindquarters, with long front legs.
 ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-13,-30);ctx.bezierCurveTo(-5,-31,10,-26,16,-17);ctx.bezierCurveTo(23,-8,25,6,23,15);ctx.quadraticCurveTo(22,23,12,23);ctx.lineTo(-15,23);ctx.quadraticCurveTo(-24,16,-20,2);ctx.lineTo(-19,-19);ctx.closePath();ctx.fill();
 const flank=ctx.createRadialGradient(13,3,0,13,3,21);flank.addColorStop(0,'#45404766');flank.addColorStop(1,'#14171c00');ctx.fillStyle=flank;ctx.beginPath();ctx.ellipse(12,5,13,18,-.2,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#101318';ctx.beginPath();ctx.moveTo(-19,-8);ctx.quadraticCurveTo(-14,-6,-13,1);ctx.lineTo(-12,19);ctx.quadraticCurveTo(-10,24,-17,24);ctx.quadraticCurveTo(-24,24,-23,20);ctx.lineTo(-22,0);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(-2,-5);ctx.lineTo(-2,19);ctx.quadraticCurveTo(2,24,-6,24);ctx.quadraticCurveTo(-12,24,-10,20);ctx.lineTo(-11,0);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#5a525c66';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-18,-7);ctx.quadraticCurveTo(-17,7,-18,18);ctx.moveTo(-7,-5);ctx.lineTo(-6,18);ctx.moveTo(15,-2);ctx.quadraticCurveTo(2,6,7,18);ctx.stroke();
 // Small pale throat tuft visible in the first photograph.
 ctx.fillStyle='#bbb9b6';ctx.beginPath();ctx.moveTo(-17,-21);ctx.quadraticCurveTo(-12,-17,-8,-20);ctx.lineTo(-12,-13);ctx.lineTo(-14,-16);ctx.lineTo(-16,-14);ctx.closePath();ctx.fill();
 const face=ctx.createLinearGradient(-27,-50,13,-18);face.addColorStop(0,'#15171d');face.addColorStop(.4,'#303036');face.addColorStop(.7,'#202127');face.addColorStop(1,'#11151a');ctx.fillStyle=face;
 ctx.beginPath();ctx.moveTo(-24,-39);ctx.bezierCurveTo(-29,-48,-29,-61,-27,-64);ctx.quadraticCurveTo(-23,-64,-15,-50);ctx.quadraticCurveTo(-5,-53,3,-49);ctx.bezierCurveTo(9,-61,13,-65,15,-63);ctx.quadraticCurveTo(19,-53,12,-39);ctx.bezierCurveTo(17,-30,10,-23,2,-20);ctx.quadraticCurveTo(-6,-15,-15,-22);ctx.bezierCurveTo(-24,-25,-29,-32,-24,-39);ctx.closePath();ctx.fill();
 // Muted inner ears and a soft edge of fur.
 for(const sign of[-1,1]){ctx.save();ctx.translate(-6,0);ctx.scale(sign,1);const ear=ctx.createLinearGradient(11,-58,15,-43);ear.addColorStop(0,'#76656d');ear.addColorStop(1,'#302c35');ctx.fillStyle=ear;ctx.beginPath();ctx.moveTo(20,-58);ctx.quadraticCurveTo(24,-50,17,-42);ctx.lineTo(11,-47);ctx.closePath();ctx.fill();ctx.strokeStyle='#77717d55';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(21,-59);ctx.lineTo(22,-51);ctx.stroke();ctx.restore()}
 // Narrow almond eyes, yellow-green irises and vertical pupils.
 for(const ex of[-16,4]){ctx.save();ctx.translate(ex,-35);ctx.rotate(ex<0?.18:-.18);ctx.fillStyle='#080c10';ctx.beginPath();ctx.moveTo(-6,-.5);ctx.quadraticCurveTo(-1,-5,6,-1);ctx.quadraticCurveTo(2,5,-4,2);ctx.closePath();ctx.fill();const iris=ctx.createLinearGradient(0,-3,0,3);iris.addColorStop(0,'#a3ae67');iris.addColorStop(.5,'#d3d996');iris.addColorStop(1,'#8b9b52');ctx.fillStyle=iris;ctx.beginPath();ctx.moveTo(-5,-.4);ctx.quadraticCurveTo(0,-3.6,5,-.6);ctx.quadraticCurveTo(1,3.9,-3,1.8);ctx.closePath();ctx.fill();ctx.fillStyle='#121815';ctx.beginPath();ctx.ellipse(.3,0,.85,2.7,0,0,7);ctx.fill();ctx.fillStyle='#ffffffb0';ctx.beginPath();ctx.ellipse(-1.8,-1.1,1,.7,0,0,7);ctx.fill();ctx.restore()}
 // Nose bridge, dark muzzle and fine whiskers.
 ctx.fillStyle='#4f485080';ctx.beginPath();ctx.moveTo(-8,-35);ctx.lineTo(-4,-28);ctx.lineTo(-9,-26);ctx.lineTo(-11,-28);ctx.closePath();ctx.fill();ctx.fillStyle='#242128';ctx.beginPath();ctx.moveTo(-11,-27);ctx.quadraticCurveTo(-7,-29,-3,-27);ctx.lineTo(-7,-23);ctx.closePath();ctx.fill();ctx.strokeStyle='#665c6466';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-7,-24);ctx.lineTo(-7,-21);ctx.moveTo(-12,-21);ctx.quadraticCurveTo(-9,-19,-7,-21);ctx.quadraticCurveTo(-4,-19,-1,-21);ctx.stroke();
 ctx.strokeStyle='#a8a0aa77';ctx.lineWidth=.45;for(const side of[-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-7+side*8,-24+i*1.5);ctx.quadraticCurveTo(-7+side*20,-26+i*4,-7+side*(28-i*2),-28+i*6);ctx.stroke()}
 ctx.strokeStyle='#a49ba323';ctx.lineWidth=.5;for(let i=0;i<12;i++){const fx=-18+(i*7)%32,fy=-13+(i*11)%30;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+1,fy+4);ctx.stroke()}ctx.strokeStyle='#8f859636';ctx.beginPath();ctx.moveTo(-20,-45);ctx.lineTo(-16,-41);ctx.moveTo(-9,-47);ctx.lineTo(-8,-42);ctx.moveTo(5,-44);ctx.lineTo(2,-40);ctx.stroke();ctx.restore();
}

function unicorn(ctx,x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.lineCap='round';ctx.lineJoin='round';
  // A horse in profile: flowing tail, four legs, arched neck and a long muzzle.
  ctx.strokeStyle='#aa88c5';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-19,1);ctx.bezierCurveTo(-34,-5,-29,16,-39,12);ctx.stroke();
  ctx.strokeStyle='#e6afd0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,1);ctx.bezierCurveTo(-34,0,-29,19,-40,16);ctx.stroke();
  const coat=ctx.createLinearGradient(-20,-18,20,20);coat.addColorStop(0,'#fffef8');coat.addColorStop(1,'#e7e2ee');
  ctx.fillStyle=coat;ctx.strokeStyle='#c5bcd3';ctx.lineWidth=1;
  for(const [lx,far]of[[-12,true],[14,true],[-18,false],[7,false]]){
    ctx.fillStyle=far?'#d7cfe3':coat;ctx.beginPath();ctx.moveTo(lx,6);ctx.lineTo(lx+5,7);ctx.lineTo(lx+4,22);ctx.lineTo(lx-2,22);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#9f82bb';ctx.beginPath();ctx.roundRect(lx-3,20,8,5,2);ctx.fill();
  }
  ctx.fillStyle=coat;ctx.beginPath();ctx.ellipse(-3,2,24,14,-.1,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(7,7);ctx.bezierCurveTo(8,-5,8,-24,16,-34);ctx.quadraticCurveTo(25,-38,28,-29);ctx.lineTo(22,-12);ctx.lineTo(21,4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#bb93d0';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(16,-36);ctx.bezierCurveTo(6,-29,13,-15,3,-8);ctx.stroke();
  ctx.strokeStyle='#f0bdd8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(13,-34);ctx.bezierCurveTo(4,-27,12,-17,4,-12);ctx.stroke();
  ctx.fillStyle=coat;ctx.strokeStyle='#c5bcd3';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(13,-33);ctx.lineTo(13,-48);ctx.quadraticCurveTo(19,-47,21,-39);ctx.quadraticCurveTo(28,-41,32,-34);ctx.lineTo(41,-28);ctx.quadraticCurveTo(45,-21,36,-21);ctx.lineTo(26,-25);ctx.quadraticCurveTo(15,-24,13,-33);ctx.fill();ctx.stroke();
  ctx.fillStyle='#d6b3d8';ctx.beginPath();ctx.moveTo(15,-44);ctx.lineTo(16,-36);ctx.lineTo(19,-39);ctx.fill();
  ctx.fillStyle='#edcf83';ctx.beginPath();ctx.moveTo(24,-39);ctx.lineTo(31,-61);ctx.lineTo(31,-37);ctx.closePath();ctx.fill();ctx.strokeStyle='#c8a464';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(26,-44);ctx.lineTo(30,-43);ctx.moveTo(28,-50);ctx.lineTo(30,-49);ctx.stroke();
  ctx.fillStyle='#c9a4dc';ctx.beginPath();ctx.ellipse(22,-40,6,3,-.3,0,7);ctx.fill();ctx.fillStyle='#343646';ctx.beginPath();ctx.ellipse(28,-33,1.7,2.4,-.2,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(28.5,-34,0.65,0,7);ctx.fill();ctx.fillStyle='#b3a4bd';ctx.beginPath();ctx.arc(39,-26,1.1,0,7);ctx.fill();ctx.restore();
}

function dog(ctx,x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='#ac7543';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(17,11);ctx.bezierCurveTo(35,15,33,-6,29,-8);ctx.stroke();
  const fur=ctx.createLinearGradient(-19,-25,23,24);fur.addColorStop(0,'#e3b975');fur.addColorStop(1,'#b77e44');ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(3,3,20,23,-.12,0,7);ctx.fill();
  ctx.fillStyle='#f1d7ac';ctx.beginPath();ctx.ellipse(-2,1,10,14,0,0,7);ctx.fill();
  for(const lx of[-12,6]){ctx.fillStyle=fur;ctx.beginPath();ctx.roundRect(lx-5,0,9,23,4);ctx.fill();ctx.fillStyle='#d6a263';ctx.beginPath();ctx.ellipse(lx,22,7,4,0,0,7);ctx.fill();ctx.strokeStyle='#a2764d';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(lx-2,21);ctx.lineTo(lx-2,24);ctx.moveTo(lx+1,21);ctx.lineTo(lx+1,24);ctx.stroke()}
  ctx.fillStyle='#835331';ctx.beginPath();ctx.ellipse(-21,-29,8,20,-.25,0,7);ctx.ellipse(19,-29,8,20,.25,0,7);ctx.fill();
  ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-18,-38);ctx.quadraticCurveTo(-14,-53,0,-51);ctx.quadraticCurveTo(20,-51,20,-34);ctx.lineTo(17,-22);ctx.quadraticCurveTo(2,-11,-15,-22);ctx.closePath();ctx.fill();
  ctx.fillStyle='#efd4a7';ctx.beginPath();ctx.ellipse(-1,-23,14,10,0,0,7);ctx.fill();
  for(const ex of[-10,9]){ctx.fillStyle='#35291e';ctx.beginPath();ctx.ellipse(ex,-34,2.8,3.4,0,0,7);ctx.fill();ctx.fillStyle='#fff6db';ctx.beginPath();ctx.arc(ex-.7,-35,1,0,7);ctx.fill()}
  ctx.fillStyle='#352c29';ctx.beginPath();ctx.moveTo(-7,-28);ctx.quadraticCurveTo(-1,-31,5,-28);ctx.quadraticCurveTo(4,-23,-1,-23);ctx.quadraticCurveTo(-6,-24,-7,-28);ctx.fill();ctx.strokeStyle='#775337';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-1,-23);ctx.lineTo(-1,-19);ctx.quadraticCurveTo(-5,-16,-8,-19);ctx.moveTo(-1,-19);ctx.quadraticCurveTo(4,-16,7,-19);ctx.stroke();ctx.restore();
}

function giraffe(ctx,x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='#bd813b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(17,7);ctx.quadraticCurveTo(30,8,29,19);ctx.stroke();ctx.fillStyle='#725039';ctx.beginPath();ctx.ellipse(29,20,3,5,-.3,0,7);ctx.fill();
  ctx.fillStyle='#e6bd6a';ctx.strokeStyle='#bb8a43';ctx.lineWidth=.7;for(const lx of[-15,-6,10,17]){ctx.beginPath();ctx.roundRect(lx,6,5,18,2);ctx.fill();ctx.fillStyle='#6b513f';ctx.fillRect(lx,21,5,4);ctx.fillStyle='#e6bd6a'}
  ctx.beginPath();ctx.ellipse(-1,3,21,12,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(5,6);ctx.lineTo(3,-43);ctx.lineTo(13,-43);ctx.lineTo(20,2);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#8a5b37';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(4,-39);ctx.lineTo(6,-9);ctx.stroke();
  ctx.fillStyle='#e9c578';ctx.beginPath();ctx.ellipse(13,-48,12,9,.2,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(23,-44,9,5,.2,0,7);ctx.fill();
  ctx.strokeStyle='#b28a50';ctx.lineWidth=3;for(const x of[7,16]){ctx.beginPath();ctx.moveTo(x,-54);ctx.lineTo(x,-65);ctx.stroke();ctx.fillStyle='#6e4a33';ctx.beginPath();ctx.arc(x,-66,2.6,0,7);ctx.fill()}
  ctx.fillStyle='#e6bd6a';ctx.beginPath();ctx.ellipse(-1,-53,8,3.8,.5,0,7);ctx.ellipse(24,-55,7,3.5,-.5,0,7);ctx.fill();
  ctx.fillStyle='#a16b36';for(const[px,py,r]of[[-14,1,4],[-4,9,3.5],[8,6,4],[-1,-4,3.5],[10,-13,3],[8,-25,3],[8,-36,2.5]]){ctx.beginPath();ctx.moveTo(px-r,py);ctx.lineTo(px-r*.4,py-r);ctx.lineTo(px+r*.7,py-r*.5);ctx.lineTo(px+r,py+r*.6);ctx.lineTo(px-r*.6,py+r);ctx.closePath();ctx.fill()}
  ctx.fillStyle='#30281d';ctx.beginPath();ctx.ellipse(17,-49,1.9,2.8,.1,0,7);ctx.fill();ctx.fillStyle='#fff6db';ctx.beginPath();ctx.arc(17.5,-50,0.7,0,7);ctx.fill();ctx.fillStyle='#9d7545';ctx.beginPath();ctx.arc(28,-44,1,0,7);ctx.fill();ctx.restore();
}

const DRAWERS={cat,unicorn,dog,giraffe};
export function drawHero(ctx,hero,x,y,scale=1){(DRAWERS[hero]||cat)(ctx,x,y,scale)}

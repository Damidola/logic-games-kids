export let W=420,H=720;
export function setViewport(width,height){const scale=Math.min(width/420,height/720);W=Math.round(width/scale);H=Math.round(height/scale)}
export class World{
 constructor(random=Math.random){this.random=random;this.reset()}
 reset(){this.player={x:W/2,y:H-86,vy:-530,vx:0};this.originY=H-86;this.camera=0;this.height=0;this.stars=0;this.bounces=0;this.over=false;this.time=0;this.effects=[];this.platforms=[{x:W/2-55,y:H-44,w:110,type:'normal',phase:0,star:false}];let y=H-110,x=W/2;for(let i=0;i<17;i++){x=Math.max(48,Math.min(W-48,x+(this.random()-.5)*230));this.platforms.push(this.makePlatform(y,x,i));y-=66+this.random()*14}this.top=y;this.lastX=x;}
 makePlatform(y,x,i){return{x:x-42,y,w:84,type:i>5&&i%7===0?'spring':i>7&&i%5===0?'moving':'normal',phase:this.random()*6.28,baseX:x-42,star:i%3===1}}
 step(dt,input){if(this.over)return;this.time+=dt;const p=this.player,oldY=p.y;p.vx=input*285;p.x+=p.vx*dt;if(p.x<-20)p.x=W+20;if(p.x>W+20)p.x=-20;p.vy+=1350*dt;p.y+=p.vy*dt;
 for(const q of this.platforms){if(q.type==='moving')q.x=Math.max(4,Math.min(W-q.w-4,q.baseX+Math.sin(this.time*1.1+q.phase)*38));if(p.vy>0&&oldY+22<=q.y&&p.y+22>=q.y&&p.x+16>q.x&&p.x-16<q.x+q.w){p.y=q.y-22;p.vy=q.type==='spring'?-790:-530;this.bounces++;this.effects.push({x:p.x,y:q.y,life:.4,type:q.type==='spring'?'rainbow':'bounce'});break}}
 this.camera=Math.min(this.camera,p.y-H*.43);this.height=Math.max(this.height,Math.floor((this.originY-p.y)/10));
 for(const q of this.platforms){if(q.star&&Math.abs(p.x-(q.x+q.w/2))<32&&Math.abs(p.y-(q.y-35))<35){q.star=false;this.stars++;this.effects.push({x:p.x,y:p.y,life:.65,type:'star'})}}
 this.platforms=this.platforms.filter(q=>q.y-this.camera<H+40);while(this.top-this.camera>-150){this.lastX=Math.max(46,Math.min(W-46,this.lastX+(this.random()-.5)*245));this.platforms.push(this.makePlatform(this.top,this.lastX,Math.floor(-this.top/70)+20));this.top-=70+Math.min(20,this.height/150)+this.random()*10}this.effects=this.effects.filter(e=>(e.life-=dt)>0);if(p.y-this.camera>H+60)this.over=true;
 }
}

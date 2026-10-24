import {World,W,H,setViewport,BOOSTS} from './engine.mjs?v=20261024-boosts';
import {drawHero} from './heroes.js?v=20261024-boosts';
import {drawScene} from './render.js?v=20261024-boosts';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),world=new World();let state='ready',hero='cat',left=false,right=false,last=0,acc=0,best=0,sound=true,audio,tilt=true,tiltValue=0,tiltBase=null,sensorSeen=false;
let selectedTheme='auto';
try{best=Number(localStorage.getItem('mur-jump-best'))||0}catch{}$('best').textContent=best;
const tiltStatus=$('tilt-status');
let motionGranted=false,dragging=false;
async function prepareTilt(){
 if(!window.DeviceOrientationEvent){tilt=false;tiltStatus.textContent='Веди пальцем по грі, щоб керувати';return}
 try{
  if(typeof DeviceOrientationEvent.requestPermission==='function'&&!motionGranted){const result=await DeviceOrientationEvent.requestPermission();if(result!=='granted')throw new Error('denied');motionGranted=true}
  tilt=true;tiltBase=null;tiltValue=0;tiltStatus.textContent='Нахиляй телефон ліворуч / праворуч';
 }catch{tilt=false;tiltStatus.textContent='Доступ до нахилу не надано. Веди пальцем по грі, щоб керувати.'}
}
async function play(){unlockAudio();await prepareTilt();if(state==='paused')pause();else start()}
canvas.addEventListener('pointerdown',e=>{if(state!=='playing')return;dragging=true;canvas.setPointerCapture(e.pointerId);moveFinger(e)});
canvas.addEventListener('pointermove',e=>{if(dragging)moveFinger(e)});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>dragging=false);
function moveFinger(e){const rect=canvas.getBoundingClientRect();world.player.x=Math.max(0,Math.min(W,(e.clientX-rect.left)*W/rect.width))}
let musicGain=null,musicTimer=null,musicNext=0,musicIndex=0;
const melody=[72,76,79,83,79,76,74,71,69,72,76,79,76,72,71,67,65,69,72,76,72,69,67,64,67,71,74,79,77,74,71,67];
function unlockAudio(){try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();if(!musicGain){musicGain=audio.createGain();musicGain.gain.value=0;musicGain.connect(audio.destination)}}catch{}}
function musicNote(midi,at,duration,volume,type='sine'){const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.value=440*Math.pow(2,(midi-69)/12);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.018);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain).connect(musicGain);osc.start(at);osc.stop(at+duration+.03);osc.onended=()=>{osc.disconnect();gain.disconnect()}}
function scheduleMusic(){if(!audio||!sound||state!=='playing')return;while(musicNext<audio.currentTime+.18){const i=musicIndex%melody.length;musicNote(melody[i],musicNext,.55,.17);if(i%2===0)musicNote(melody[i]-12,musicNext,.8,.045,'triangle');if(i%8===0){const root=[48,45,41,43][Math.floor(i/8)];musicNote(root,musicNext,1.8,.12,'triangle');musicNote(root+7,musicNext,1.6,.045)}musicIndex++;musicNext+=.28}}
function syncMusic(){if(!audio||!musicGain)return;const active=sound&&state==='playing'&&!document.hidden;musicGain.gain.cancelScheduledValues(audio.currentTime);musicGain.gain.setTargetAtTime(active?.32:0,audio.currentTime,.06);if(active){if(!musicTimer){musicNext=audio.currentTime+.04;scheduleMusic();musicTimer=setInterval(scheduleMusic,80)}}else if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function tone(freq=550){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.5,audio.currentTime+.1);g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.16);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.17)}catch{}}
function updateHUD(){
 $('height').textContent=world.height;$('stars').textContent=world.stars;$('best').textContent=best;
 const boost=world.boost;$('boost-meter').hidden=!boost||state!=='playing';
 if(boost){$('boost-label').textContent=BOOSTS[boost.type].name;$('boost-fuel').value=Math.max(0,boost.left/boost.duration);$('boost-meter').style.setProperty('--boost-color',BOOSTS[boost.type].color)}
}
function start(){world.reset();tiltBase=null;tiltValue=0;dragging=false;left=right=false;state='playing';acc=0;$('overlay').hidden=true;setPauseIcon(false);$('pause').setAttribute('aria-label','Пауза');tone(450);syncMusic();updateHUD()}
function setPauseIcon(paused){$('pause').innerHTML=paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>'}
function pause(){if(state==='playing'){state='paused';show('Трохи перепочинемо?','Хмаринки почекають на тебе.','Продовжити');setPauseIcon(true);$('pause').setAttribute('aria-label','Продовжити')}else if(state==='paused'){state='playing';$('overlay').hidden=true;setPauseIcon(false);$('pause').setAttribute('aria-label','Пауза')}syncMusic();updateHUD()}
function show(title,text,button){$('overlay-title').textContent=title;$('overlay-text').textContent=text;$('play').textContent=button;$('overlay-hint').textContent=tilt?'Нахиляй телефон, щоб керувати':'Веди пальцем по грі або натискай ← → / A та D';$('restart').hidden=state!=='paused';$('overlay').hidden=false;syncMusic();updateHUD()}
$('play').onclick=play;$('restart').onclick=()=>{unlockAudio();start()};$('pause').onclick=pause;$('sound').onclick=()=>{sound=!sound;unlockAudio();$('sound').setAttribute('aria-label',sound?'Вимкнути музику':'Увімкнути музику');$('sound').setAttribute('aria-pressed',String(sound));syncMusic()};
document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{hero=b.dataset.hero;document.querySelectorAll('[data-hero]').forEach(c=>{c.classList.toggle('selected',c===b);c.setAttribute('aria-pressed',String(c===b))})});
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='ArrowLeft'||e.code==='KeyA')left=true;if(e.code==='ArrowRight'||e.code==='KeyD')right=true;if(e.repeat)return;if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='Space'){if(state==='ready'||state==='over')play();else pause()}});window.addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')left=false;if(e.code==='ArrowRight'||e.code==='KeyD')right=false});
window.addEventListener('blur',()=>{left=right=false;if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
function onOrientation(e){if(!tilt||e.gamma===null||!Number.isFinite(e.gamma))return;const angle=screen.orientation?.angle??window.orientation??0;let v=Math.abs(angle)===90?(angle===90?-e.beta:e.beta):e.gamma;if(!Number.isFinite(v))return;if(tiltBase===null)tiltBase=v;tiltValue=Math.max(-1,Math.min(1,(v-tiltBase)/20));if(Math.abs(tiltValue)<.08)tiltValue=0;if(!sensorSeen){sensorSeen=true;$('tilt-status').textContent='Нахиляй телефон ліворуч / праворуч'}}
window.addEventListener('deviceorientation',onOrientation);window.addEventListener('orientationchange',()=>{tiltBase=null;tiltValue=0});
function draw(t){const blend=drawScene(ctx,world,hero,selectedTheme,t);document.body.classList.toggle('night-sky',blend.dark>.45)}
function frame(ts){const dt=Math.min((ts-last)/1000||0,.05);last=ts;if(state==='playing'){acc+=dt;while(acc>=1/120){const b=world.bounces,s=world.stars,pickups=world.boostsCollected;world.step(1/120,left||right?Number(right)-Number(left):tilt&&!dragging?tiltValue:0);if(world.bounces>b)tone(330);if(world.stars>s)tone(880);if(world.boostsCollected>pickups){tone(world.lastBonus==='rocket'?165:world.lastBonus==='jetpack'?220:660);tiltStatus.textContent=BOOSTS[world.lastBonus].name}acc-=1/120;if(world.over){state='over';if(world.height>best){best=world.height;try{localStorage.setItem('mur-jump-best',String(best))}catch{}}show('Оце так політ! ✦',`${world.height} м угору · ${world.stars} зірок. Спробуємо ще вище?`,'Ще один стрибок');break}}updateHUD()}draw(ts/1000);requestAnimationFrame(frame)}requestAnimationFrame(frame);
resizeGame();
for(const id of ['cat','unicorn','dog','giraffe']){const portrait=$(id+'-portrait');ctx.clearRect(0,0,W,H);drawHero(ctx,id,46,72,.95);portrait.getContext('2d').drawImage(canvas,0,0,100,100,0,0,100,100)}ctx.clearRect(0,0,W,H);
document.querySelectorAll('[data-theme]').forEach(button=>button.onclick=()=>{selectedTheme=button.dataset.theme;document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))});

function resizeGame(){const oldW=W;const width=document.documentElement.clientWidth,height=window.visualViewport?.height||innerHeight;setViewport(width,height);canvas.width=W;canvas.height=H;if(state==='ready'){world.reset()}else{const ratio=W/oldW;world.player.x*=ratio;world.lastX*=ratio;for(const q of world.platforms){q.x=Math.max(0,Math.min(W-q.w,q.x*ratio));if(q.baseX!==undefined)q.baseX=q.x}world.camera=world.player.y-H*.5}tiltBase=null}
window.addEventListener('resize',resizeGame);window.visualViewport?.addEventListener('resize',resizeGame);

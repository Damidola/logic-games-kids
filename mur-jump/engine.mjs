export let W = 420, H = 720;
export function setViewport(width, height) {
  const scale = Math.min(width / 420, height / 720);
  W = Math.round(width / scale); H = Math.round(height / scale);
}
export const MOVE_SPEED = 350, BOOST_MOVE_SPEED = 420;
export const BOOSTS = {
  spring: { name: 'Пружинка', jump: 840, color: '#f59475' },
  superSpring: { name: 'Суперпружина', jump: 1100, color: '#bc91ee' },
  trampoline: { name: 'Батут', jump: 1360, color: '#64ceb9' },
  jetpack: { name: 'Джетпак', duration: 3, speed: 680, color: '#70c9eb' },
  rocket: { name: 'Ракета', duration: 2.8, speed: 1180, color: '#ffb575' }
};
const BONUS_CYCLE = [null, 'spring', null, 'jetpack', null, 'spring', 'trampoline', null, 'superSpring', null, 'spring', null, 'rocket', null, 'trampoline', null];
export class World {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() {
    this.player = { x: W / 2, y: H - 86, vy: -530, vx: 0 };
    this.originY = H - 86; this.camera = 0; this.height = 0;
    this.stars = 0; this.bounces = 0; this.over = false; this.time = 0;
    this.boost = null; this.boostsCollected = 0; this.lastBonus = null;
    this.effects = []; this.trail = []; this.trailTimer = 0; this.sequence = 0;
    this.platforms = [{ x: W / 2 - 55, y: H - 44, w: 110, type: 'normal', phase: 0, star: false, bonus: null }];
    let y = H - 110, x = W / 2;
    for (let i = 0; i < 17; i++) {
      x = Math.max(48, Math.min(W - 48, x + (this.random() - .5) * 230));
      this.platforms.push(this.makePlatform(y, x)); y -= 66 + this.random() * 14;
    }
    this.top = y; this.lastX = x;
  }
  makePlatform(y, x) {
    const i = this.sequence++, bonus = BONUS_CYCLE[i % BONUS_CYCLE.length];
    return { x: x - 42, y, w: 84, type: i > 5 && i % 5 === 0 ? 'moving' : 'normal', phase: this.random() * 6.28, baseX: x - 42, star: i % 3 === 1 && !bonus, bonus, pulseUntil: 0 };
  }
  activate(type, x, y) {
    const info = BOOSTS[type];
    if (info.duration) this.boost = { type, left: info.duration, duration: info.duration, speed: info.speed };
    this.lastBonus = type; this.boostsCollected++;
    this.effects.push({ x, y, life: 1.1, maxLife: 1.1, type: 'boost', bonus: type });
  }
  bounce(platform, bonus = null) {
    const top = platform.y - (bonus === 'trampoline' ? 17 : bonus ? 24 : 0);
    this.player.y = top - 22;
    this.player.vy = bonus ? -BOOSTS[bonus].jump : -530;
    this.bounces++; platform.pulseUntil = this.time + .3;
    if (bonus) this.activate(bonus, this.player.x, top);
    else this.effects.push({ x: this.player.x, y: top, life: .4, maxLife: .4, type: 'bounce' });
  }
  step(dt, input) {
    if (this.over) return;
    this.time += dt;
    const p = this.player, oldY = p.y;
    p.vx = input * (this.boost ? BOOST_MOVE_SPEED : MOVE_SPEED); p.x += p.vx * dt;
    p.x = ((p.x % W) + W) % W;
    if (this.boost) {
      p.vy = -this.boost.speed; this.boost.left -= dt;
      if (this.boost.left <= 0) { this.boost = null; p.vy = -480; }
    } else p.vy += 1350 * dt;
    p.y += p.vy * dt;
    for (const q of this.platforms) {
      if (q.type === 'moving') q.x = Math.max(4, Math.min(W - q.w - 4, q.baseX + Math.sin(this.time * 1.1 + q.phase) * 38));
      const cx = q.x + q.w / 2;
      if (!this.boost && (q.bonus === 'jetpack' || q.bonus === 'rocket') && Math.abs(p.x - cx) < 35 && Math.min(oldY, p.y) - 17 < q.y - 9 && Math.max(oldY, p.y) + 20 > q.y - 65) {
        const type = q.bonus; q.bonus = null; this.activate(type, cx, q.y - 36); p.vy = -this.boost.speed;
      }
      if (!this.boost && p.vy > 0 && p.x + 16 > q.x && p.x - 16 < q.x + q.w) {
        const spring = q.bonus && BOOSTS[q.bonus].jump ? q.bonus : null;
        const capY = q.y - (spring === 'trampoline' ? 17 : spring ? 24 : 0);
        if (spring && Math.abs(p.x - cx) < (spring === 'trampoline' ? 33 : 25) && oldY + 22 <= capY && p.y + 22 >= capY) { this.bounce(q, spring); break; }
        if (oldY + 22 <= q.y && p.y + 22 >= q.y) { this.bounce(q); break; }
      }
    }
    this.camera = Math.min(this.camera, p.y - H * .43);
    this.height = Math.max(this.height, Math.floor((this.originY - p.y) / 10));
    for (const q of this.platforms) {
      if (q.star && Math.abs(p.x - (q.x + q.w / 2)) < 32 && Math.abs(p.y - (q.y - 35)) < 35) {
        q.star = false; this.stars++; this.effects.push({ x: p.x, y: p.y, life: .65, maxLife: .65, type: 'star' });
      }
    }
    this.platforms = this.platforms.filter(q => q.y - this.camera < H + 40);
    while (this.top - this.camera > -150) {
      this.lastX = Math.max(46, Math.min(W - 46, this.lastX + (this.random() - .5) * 245));
      this.platforms.push(this.makePlatform(this.top, this.lastX));
      this.top -= 70 + Math.min(18, this.height / 150) + this.random() * 10;
    }
    if (this.boost) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) { this.trail.push({ x: p.x, y: p.y + 28, life: .6, type: this.boost.type }); this.trailTimer = .035; }
    }
    this.trail = this.trail.filter(e => (e.life -= dt) > 0);
    this.effects = this.effects.filter(e => (e.life -= dt) > 0);
    if (p.y - this.camera > H + 60) this.over = true;
  }
}

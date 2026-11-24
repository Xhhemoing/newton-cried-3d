(function (factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof window === 'object') {
    window.ChopsticksEngine = factory();
  }
})(function () {
  'use strict';

  const WORLD_SIZE = 320;
  const BOWL_CENTER = Object.freeze({ x: 160, y: 160, r: 124 });
  const ARCHIVE_MAX_BYTES = 2000;
  const MAX_ATTEMPTS = 3;
  const DUEL_TARGET_SCORE = 3;
  const MAX_SEED = 0xffffffff;
  const MAX_VOLLEY = 9999;
  const DEFAULT_SEED = 0x4b0c4501;
  const TAU = Math.PI * 2;
  const DAY_MS = 86400000;

  const FOODS = Object.freeze({
    dumpling: Object.freeze({ id: 'dumpling', emoji: '🥟', name: '水饺', radius: 26, color: '#FFF7ED', accent: '#F59E0B', isMealOption: true, bit: 0 }),
    chicken: Object.freeze({ id: 'chicken', emoji: '🍗', name: '炸鸡', radius: 28, color: '#F59E0B', accent: '#B45309', isMealOption: true, bit: 1 }),
    egg: Object.freeze({ id: 'egg', emoji: '🥚', name: '卤蛋', radius: 24, color: '#FEF3C7', accent: '#D97706', isMealOption: false, bit: 2 }),
    noodle: Object.freeze({ id: 'noodle', emoji: '🍜', name: '面条', radius: 27, color: '#FDE68A', accent: '#EA580C', isMealOption: true, bit: 3 }),
    cilantro: Object.freeze({ id: 'cilantro', emoji: '🌿', name: '香菜', radius: 22, color: '#22C55E', accent: '#15803D', isMealOption: false, bit: 4 }),
    octopus: Object.freeze({ id: 'octopus', emoji: '🐙', name: '章鱼丸', radius: 25, color: '#FB7185', accent: '#BE123C', isMealOption: true, bit: 5 }),
    chili: Object.freeze({ id: 'chili', emoji: '🌶️', name: '小米辣', radius: 21, color: '#EF4444', accent: '#991B1B', isMealOption: false, bit: 6 }),
    boba: Object.freeze({ id: 'boba', emoji: '🧋', name: '珍珠茶', radius: 25, color: '#A16207', accent: '#FDE047', isMealOption: true, bit: 7 }),
  });

  const FUSIONS = Object.freeze({
    golden_egg_noodle: Object.freeze({ id: 'golden_egg_noodle', req: Object.freeze(['noodle', 'egg']), emoji: '✨', name: '金甲护蛋面', radius: 30, color: '#FACC15', accent: '#CA8A04', bit: 0 }),
    fire_wings: Object.freeze({ id: 'fire_wings', req: Object.freeze(['chicken', 'chili']), emoji: '🔥', name: '喷火霸王翅', radius: 30, color: '#F97316', accent: '#DC2626', bit: 1 }),
    jade_dumpling: Object.freeze({ id: 'jade_dumpling', req: Object.freeze(['dumpling', 'cilantro']), emoji: '💎', name: '翡翠水晶饺', radius: 29, color: '#34D399', accent: '#059669', bit: 2 }),
  });

  const TRAIT_CHIPS = Object.freeze([
    { id: 'steal_stick', icon: '🪃', label: '夺筷' },
    { id: 'teleport_flee', icon: '💨', label: '瞬移' },
    { id: 'bodyguard', icon: '🛡️', label: '护驾' },
    { id: 'magnet_trap', icon: '🧲', label: '吸筷' },
    { id: 'clone_split', icon: '🫧', label: '分身' },
    { id: 'chili_blast', icon: '💥', label: '震飞' },
  ].map(Object.freeze));

  const TRIGGER_CHIPS = Object.freeze([
    { id: 'on_first_tap', icon: '1️⃣', label: '首筷翻脸' },
    { id: 'on_second_tap', icon: '2️⃣', label: '二筷阴人' },
  ].map(Object.freeze));

  const TAUNT_STAMPS = Object.freeze([
    { id: 'doge', icon: '🐶', label: '略略略' },
    { id: 'laugh', icon: '🤣', label: '差一点' },
    { id: 'spark', icon: '🔥', label: '续火花' },
  ].map(Object.freeze));

  const DAILY_LEVELS = Object.freeze([
    { day: 1, icon: '🥟', label: '夺筷饺', targetFoodId: 'dumpling', foods: ['dumpling', 'egg', 'octopus', 'boba'], rules: { steal: true }, seed: 4081 },
    { day: 2, icon: '🛡️', label: '护蛋面', targetFoodId: 'egg', foods: ['egg', 'noodle', 'boba', 'dumpling'], rules: { guardian: 'noodle' }, seed: 8287 },
    { day: 3, icon: '🌿', label: '破盾鸡', targetFoodId: 'chicken', foods: ['chicken', 'cilantro', 'egg', 'octopus'], rules: { shieldBreaker: 'cilantro' }, seed: 12619 },
    { day: 4, icon: '🫧', label: '真假丸', targetFoodId: 'octopus', foods: ['octopus', 'boba', 'egg'], rules: { split: true }, seed: 16417 },
    { day: 5, icon: '🧊', label: '打滑锅', targetFoodId: 'boba', foods: ['boba', 'egg', 'chicken', 'chili', 'octopus'], rules: { slippery: true }, seed: 20753 },
    { day: 6, icon: '💥', label: '爆辣助推', targetFoodId: 'dumpling', foods: ['dumpling', 'chili', 'egg', 'noodle'], rules: { shieldBreaker: 'chili' }, seed: 24281 },
    { day: 7, icon: '👑', label: '满汉反骨王', targetFoodId: 'chicken', foods: ['chicken', 'noodle', 'cilantro', 'boba', 'octopus'], rules: { guardian: 'noodle', shieldBreaker: 'cilantro' }, seed: 29753 },
  ].map(level => Object.freeze({
    ...level, foods: Object.freeze(level.foods), rules: Object.freeze(level.rules),
  })));

  const MEAL_OPTIONS = Object.values(FOODS).filter(food => food.isMealOption).map(food => food.id);
  const DUEL_FOODS = ['dumpling', 'chicken', 'egg', 'octopus', 'chili'];
  const MODES = new Set(['daily', 'fair', 'duel', 'prank']);
  const TRAIT_IDS = new Set(TRAIT_CHIPS.map(chip => chip.id));
  const TRIGGER_IDS = new Set(TRIGGER_CHIPS.map(chip => chip.id));
  const TAUNT_IDS = new Set(TAUNT_STAMPS.map(stamp => stamp.id));
  const URL_FIELDS = ['m', 'f', 'tr', 'tg', 'vl', 'tn', 's'];
  const BANNERS = {
    caught: { tag: '拿捏入碗!', icon: '🥢' },
    scored: { tag: '手快得分!', icon: '⚡' },
    won: { tag: '抢菜夺冠!', icon: '🏆' },
    lost: { tag: '筷子用完!', icon: '🥢' },
    stolen: { tag: '反手夺筷!', icon: '🪃' },
    blocked: { tag: '护短弹开!', icon: '🛡️' },
    guardGone: { tag: '护驾退场!', icon: '💨' },
    evaded: { tag: '闪身逃跑!', icon: '💨' },
    broken: { tag: '破盾成功!', icon: '🌿' },
    split: { tag: '真假分身!', icon: '🫧' },
    decoy: { tag: '夹中假丸!', icon: '🫧' },
    magnetized: { tag: '强磁吸住!', icon: '🧲' },
    blasted: { tag: '辣浪震飞!', icon: '💥' },
    primed: { tag: '还差一筷!', icon: '🥢' },
  };
  const IGNORED = Object.freeze({ outcome: 'ignored', sound: null, targetFoodId: null });

  function isFood(id) {
    return typeof id === 'string' && Object.prototype.hasOwnProperty.call(FOODS, id);
  }

  function isIntegerIn(value, min, max) {
    return Number.isInteger(value) && value >= min && value <= max;
  }

  function random(world) {
    world.rngState = (Math.imul(world.rngState, 1664525) + 1013904223) >>> 0;
    return world.rngState / (MAX_SEED + 1);
  }

  function makeChopsticks(player) {
    const homeY = player === 'p2' ? 32 : WORLD_SIZE - 32;
    return { player, x: BOWL_CENTER.x, y: homeY, homeY, rotation: 0, state: 'idle', timer: 0, targetFoodId: null, targetUid: null };
  }

  function makeEntity(world, foodId, x, y, speed, decoy = false) {
    const direction = random(world) * TAU;
    const entity = {
      uid: world.nextUid++, foodId, x, y,
      vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
      radius: FOODS[foodId].radius,
      scaleX: 1, scaleY: 1, scaleVX: 0, scaleVY: 0, rotation: 0,
      shielded: false, magnetized: false, decoy, vulnerable: false,
      grabbedBy: null, popped: false, mood: 'normal', stunTimer: 0,
    };
    world.entities.push(entity);
    return entity;
  }

  function normalizePrank(spec) {
    if (!spec || typeof spec !== 'object') return null;
    const {
      v = 1, targetFoodId, traitId, triggerId,
      volley = 1, tauntId = 'doge', seed = DEFAULT_SEED,
    } = spec;
    if (v !== 1 || !isFood(targetFoodId) || !TRAIT_IDS.has(traitId) || !TRIGGER_IDS.has(triggerId) ||
        !TAUNT_IDS.has(tauntId) || !isIntegerIn(volley, 0, MAX_VOLLEY) || !isIntegerIn(seed, 0, MAX_SEED)) {
      return null;
    }
    let helperFoodId = null;
    if (traitId === 'bodyguard') helperFoodId = targetFoodId === 'noodle' ? 'egg' : 'noodle';
    if (traitId === 'magnet_trap') helperFoodId = 'cilantro';
    if (traitId === 'chili_blast') helperFoodId = 'chili';
    return { v, targetFoodId, traitId, triggerId, helperFoodId, volley, tauntId, seed: seed >>> 0 };
  }

  function createGame(config = {}) {
    const { day, prankSpec, ghostEnabled = true, excludedFoods } = config || {};
    const mode = MODES.has(config?.mode) ? config.mode : 'daily';
    const level = DAILY_LEVELS[isIntegerIn(day, 1, 7) ? day - 1 : 0];
    const prank = mode === 'prank' ? normalizePrank(prankSpec) || normalizePrank({
      targetFoodId: 'dumpling', traitId: 'steal_stick', triggerId: 'on_first_tap',
    }) : null;
    const rules = mode === 'daily' ? level.rules : {};
    const showGhost = mode === 'daily' && Boolean(ghostEnabled);
    const world = {
      mode, day: level.day, status: 'playing', attemptsLeft: MAX_ATTEMPTS, maxAttempts: MAX_ATTEMPTS,
      tapCount: 0, targetFoodId: prank?.targetFoodId || (mode === 'daily' ? level.targetFoodId : null),
      caughtFoodId: null, winner: null, duelScores: { p1: 0, p2: 0 }, duelTargetScore: DUEL_TARGET_SCORE,
      prankSpec: prank ? { ...prank, solvable: true } : null, prankRevealed: false,
      entities: [], chopsticks: { p1: makeChopsticks('p1'), p2: mode === 'duel' ? makeChopsticks('p2') : null },
      ghost: {
        enabled: showGhost, visible: showGhost,
        x: BOWL_CENTER.x - 75, y: BOWL_CENTER.y + 66,
        state: 'tracking', targetFoodId: null, opacity: 0.32, trail: [], missed: false,
      },
      fx: {
        hitStopTimer: 0, zoom: 1, focusX: BOWL_CENTER.x, focusY: BOWL_CENTER.y,
        bannerTimer: 0, eventBanner: null, ripples: [], particles: [],
      },
      time: 0, rngState: prank?.seed ?? (mode === 'daily' ? level.seed : DEFAULT_SEED),
      nextUid: 1, targetUid: null, helperUid: null, rules,
    };
    let foods = level.foods;
    if (mode === 'prank') {
      foods = [prank.targetFoodId];
      if (prank.helperFoodId) foods.push(prank.helperFoodId);
      const fillers = MEAL_OPTIONS.filter(id => !foods.includes(id));
      while (foods.length < 4) {
        const index = Math.floor(random(world) * fillers.length);
        foods.push(fillers.splice(index, 1)[0]);
      }
    }
    if (mode === 'fair') foods = MEAL_OPTIONS;
    if (mode === 'duel') foods = DUEL_FOODS;

    const excluded = new Set(Array.isArray(excludedFoods) ? excludedFoods : []);
    const phase = 0.15 + random(world) * 0.4;
    for (const [index, foodId] of foods.entries()) {
      const angle = mode === 'duel'
        ? Math.PI / 4 + (phase - 0.35) / 2 + index * TAU / (foods.length - 1)
        : phase + index * TAU / foods.length;
      const speed = rules.slippery ? 172 + random(world) * 50 : 19 + random(world) * 23;
      const ring = mode === 'duel' && foodId === 'chili' ? 0 : foods.length === 3 ? 68 : 80;
      const item = makeEntity(world, foodId, BOWL_CENTER.x + Math.cos(angle) * ring, BOWL_CENTER.y + Math.sin(angle) * ring, speed);
      item.popped = mode === 'fair' && excluded.has(foodId);
    }
    if (mode === 'fair' && world.entities.every(item => item.popped)) world.entities[0].popped = false;
    if (world.targetFoodId) {
      const target = world.entities[0];
      world.targetUid = target.uid;
      target.shielded = Boolean(rules.shieldBreaker);
      target.mood = target.shielded || rules.steal || prank ? 'smug' : 'normal';
      if (prank?.helperFoodId) {
        const helper = world.entities[1];
        world.helperUid = helper.uid;
        helper.magnetized = prank.traitId === 'magnet_trap';
      }
    }
    return world;
  }

  function bounceAtBowl(item) {
    const dx = item.x - BOWL_CENTER.x;
    const dy = item.y - BOWL_CENTER.y;
    const distance = Math.hypot(dx, dy);
    const limit = BOWL_CENTER.r - item.radius;
    if (distance <= limit) return;
    const nx = dx / distance;
    const ny = dy / distance;
    item.x = BOWL_CENTER.x + nx * limit;
    item.y = BOWL_CENTER.y + ny * limit;
    const outwardSpeed = item.vx * nx + item.vy * ny;
    if (outwardSpeed > 0) {
      item.vx -= 1.86 * outwardSpeed * nx;
      item.vy -= 1.86 * outwardSpeed * ny;
    }
  }

  function resolveContact(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    const overlap = a.radius + b.radius - distance;
    if (overlap <= 0) return;
    const nx = distance === 0 ? 1 : dx / distance;
    const ny = distance === 0 ? 0 : dy / distance;
    a.x -= nx * overlap / 2;
    a.y -= ny * overlap / 2;
    b.x += nx * overlap / 2;
    b.y += ny * overlap / 2;

    const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (approach < 0) {
      const impulse = -0.94 * approach;
      a.vx -= nx * impulse;
      a.vy -= ny * impulse;
      b.vx += nx * impulse;
      b.vy += ny * impulse;
    }
  }

  function recoverScale(item, dt) {
    const stiffness = 16;
    const decay = Math.exp(-stiffness * dt);
    const dx = item.scaleX - 1;
    const dy = item.scaleY - 1;
    const slopeX = item.scaleVX + stiffness * dx;
    const slopeY = item.scaleVY + stiffness * dy;
    item.scaleX = 1 + (dx + slopeX * dt) * decay;
    item.scaleY = 1 + (dy + slopeY * dt) * decay;
    item.scaleVX = (item.scaleVX - stiffness * slopeX * dt) * decay;
    item.scaleVY = (item.scaleVY - stiffness * slopeY * dt) * decay;
  }

  function repositionChopsticks(stick, dt) {
    if (!stick) return;
    stick.timer = Math.max(0, stick.timer - dt);
    if (stick.timer > 0.000001) return;
    stick.timer = 0;
    stick.state = 'idle';
    stick.targetFoodId = null;
    stick.targetUid = null;
    const blend = 1 - Math.exp(-16 * dt);
    stick.x += (BOWL_CENTER.x - stick.x) * blend;
    stick.y += (stick.homeY - stick.y) * blend;
    stick.rotation *= 1 - blend;
  }

  function addRipple(world, x, y, color, radius = 10) {
    world.fx.ripples.push({ x, y, radius, color, life: 0.45, maxLife: 0.45, alpha: 1 });
  }

  function burst(world, x, y, color, count = 11) {
    for (let index = 0; index < count; index++) {
      const angle = random(world) * TAU;
      const speed = 50 + random(world) * 140;
      const life = 0.24 + random(world) * 0.34;
      world.fx.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color, size: 2 + random(world) * 5, life, maxLife: life, alpha: 1,
      });
    }
  }

  function updateEffects(world, dt, motionDt) {
    const { fx } = world;
    fx.bannerTimer = Math.max(0, fx.bannerTimer - dt);
    if (fx.bannerTimer <= 0) fx.eventBanner = null;
    for (const ripple of fx.ripples) {
      ripple.life -= dt;
      ripple.radius += 155 * motionDt;
      ripple.alpha = Math.max(0, ripple.life / ripple.maxLife);
    }
    fx.ripples = fx.ripples.filter(ripple => ripple.life > 0);
    for (const piece of fx.particles) {
      piece.life -= dt;
      piece.x += piece.vx * motionDt;
      piece.y += piece.vy * motionDt;
      piece.vy += 130 * motionDt;
      piece.alpha = Math.max(0, piece.life / piece.maxLife);
    }
    fx.particles = fx.particles.filter(piece => piece.life > 0);
  }

  function advanceGhost(world) {
    const { ghost } = world;
    if (!ghost.enabled) return;
    const target = world.entities.find(item => item.uid === world.targetUid && !item.popped);
    const time = world.time;
    const { x, y } = target || BOWL_CENTER;
    ghost.targetFoodId = target?.foodId || null;
    if (!ghost.missed && time >= 1.12) {
      ghost.missed = true;
      const active = world.entities.filter(item => !item.popped);
      const miss = findOpenPosition(0, active, x - 37, y + 33);
      ghost.missX = miss.x;
      ghost.missY = miss.y;
      addRipple(world, ghost.missX, ghost.missY, '#BFCBFF', 7);
    }
    if (time >= 1.12 && time < 1.35) {
      ghost.state = 'miss';
      ghost.x = ghost.missX;
      ghost.y = ghost.missY;
    } else {
      ghost.state = 'tracking';
      ghost.x = x + 47 * Math.cos(time * 2.3);
      ghost.y = y + 36 * Math.sin(time * 2.7);
    }
    ghost.trail.push({ x: ghost.x, y: ghost.y });
    if (ghost.trail.length > 12) ghost.trail.shift();
  }

  function findOpenPosition(radius, occupied, preferredX, preferredY) {
    let best;
    let bestDistance = Infinity;
    let bestGap = -Infinity;
    let fallback = BOWL_CENTER;
    for (const ring of [0, 44, 83]) {
      const samples = ring === 0 ? 1 : 16;
      for (let index = 0; index < samples; index++) {
        const angle = TAU * index / samples;
        const x = BOWL_CENTER.x + Math.cos(angle) * ring;
        const y = BOWL_CENTER.y + Math.sin(angle) * ring;
        const gap = Math.min(...occupied.map(item => Math.hypot(item.x - x, item.y - y) - item.radius - radius));
        const distance = Math.hypot(x - preferredX, y - preferredY);
        if (gap >= 2 && distance < bestDistance) {
          best = { x, y };
          bestDistance = distance;
        }
        if (gap > bestGap) {
          bestGap = gap;
          fallback = { x, y };
        }
      }
    }
    return best || fallback;
  }

  function stepWorld(world, dtSeconds) {
    const dt = typeof dtSeconds === 'number' && !Number.isNaN(dtSeconds) ? Math.min(0.05, Math.max(0, dtSeconds)) : 0;
    if (dt === 0) return world;
    world.time += dt;
    const { fx } = world;
    const slowDt = Math.min(fx.hitStopTimer, dt);
    const motionDt = dt - slowDt * 0.82;
    fx.hitStopTimer = Math.max(0, fx.hitStopTimer - dt);
    const zoomTarget = slowDt > 0 ? 1.28 : 1;
    fx.zoom += (zoomTarget - fx.zoom) * (1 - Math.exp(-14 * dt));
    if (Math.abs(zoomTarget - fx.zoom) < 0.001) fx.zoom = zoomTarget;

    const active = world.entities.filter(item => !item.popped);
    const friction = Math.exp(-(world.rules.slippery ? 0.15 : 1.1) * motionDt);
    for (const item of world.entities) {
      recoverScale(item, motionDt);
      item.stunTimer = Math.max(0, item.stunTimer - dt);
      if (item.stunTimer === 0 && (item.mood === 'dizzy' || item.mood === 'panic')) item.mood = 'normal';
      if (item.popped) continue;
      item.x += item.vx * motionDt;
      item.y += item.vy * motionDt;
      item.rotation += (item.vx - item.vy) * 0.006 * motionDt;
      item.vx *= friction;
      item.vy *= friction;
      bounceAtBowl(item);
    }
    for (let pass = 0; pass < 3; pass++) {
      for (const [index, first] of active.entries()) {
        for (let next = index + 1; next < active.length; next++) resolveContact(first, active[next]);
      }
      for (const item of active) bounceAtBowl(item);
    }

    repositionChopsticks(world.chopsticks.p1, dt);
    repositionChopsticks(world.chopsticks.p2, dt);
    advanceGhost(world);
    updateEffects(world, dt, motionDt);

    if (world.mode === 'duel' && world.status === 'playing' && !active.some(item => item.foodId !== 'chili')) {
      const foodId = MEAL_OPTIONS[Math.floor(random(world) * MEAL_OPTIONS.length)];
      const { x, y } = findOpenPosition(FOODS[foodId].radius, active, BOWL_CENTER.x, BOWL_CENTER.y);
      makeEntity(world, foodId, x, y, 38);
    }
    return world;
  }

  function closestFood(items, x, y) {
    let closest = null;
    let bestDistance = Infinity;
    for (const item of items) {
      if (item.popped) continue;
      const distance = (item.x - x) ** 2 + (item.y - y) ** 2;
      if (distance < bestDistance && distance <= item.radius ** 2) {
        closest = item;
        bestDistance = distance;
      }
    }
    return closest;
  }

  function stirAndPick(world, x, y) {
    scatter(world, x, y, 180);
    const eligible = world.entities.filter(item => !item.popped);
    if (!eligible.length) return null;
    const distances = eligible.map(item => Math.hypot(item.x - x, item.y - y));
    const nearest = Math.min(...distances);
    const tied = eligible.filter((item, index) => Math.abs(distances[index] - nearest) < 0.000001);
    return tied.length === 1 ? tied[0] : tied[Math.floor(random(world) * tied.length)];
  }

  function announce(world, event) {
    world.fx.eventBanner = { ...BANNERS[event] };
    world.fx.bannerTimer = 0.78;
  }

  function result(outcome, sound, item) {
    return { outcome, sound, targetFoodId: item?.foodId || null };
  }

  function spendAttempt(world, response) {
    world.attemptsLeft--;
    if (world.attemptsLeft === 0) {
      world.status = 'lost';
      if (!world.fx.eventBanner || response.outcome === 'miss') announce(world, 'lost');
    }
    return response;
  }

  function squeeze(item) {
    item.scaleX = 1.28;
    item.scaleY = 0.74;
    item.scaleVX = 0;
    item.scaleVY = 0;
  }

  function markMood(item, mood, timer = 0.4) {
    item.mood = mood;
    item.stunTimer = timer;
  }

  function scatter(world, x, y, force) {
    for (const item of world.entities) {
      if (item.popped) continue;
      let dx = item.x - x;
      let dy = item.y - y;
      if (dx === 0 && dy === 0) {
        const angle = random(world) * TAU;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      }
      const distance = Math.hypot(dx, dy);
      const impulse = force / (1 + distance / 150);
      item.vx += dx / distance * impulse;
      item.vy += dy / distance * impulse;
    }
  }

  function takeFood(world, item, stick, status) {
    item.popped = true;
    item.grabbedBy = stick.player;
    stick.state = 'pinching';
    stick.timer = 0.28;
    world.caughtFoodId = item.foodId;
    if (status) world.status = status;
    burst(world, item.x, item.y, FOODS[item.foodId].accent, 16);
  }

  function stealStick(world, item, stick) {
    item.vulnerable = true;
    markMood(item, 'smug');
    stick.state = 'stolen';
    stick.timer = 0.42;
    world.fx.hitStopTimer = 0.42;
    world.fx.focusX = item.x;
    world.fx.focusY = item.y;
    burst(world, item.x, item.y, FOODS[item.foodId].accent);
    announce(world, 'stolen');
    return result('stolen', 'steal', item);
  }

  function teleport(world, item) {
    const active = world.entities.filter(other => !other.popped);
    const origin = { x: item.x, y: item.y };
    const { x, y } = findOpenPosition(item.radius, active, BOWL_CENTER.x * 2 - item.x, BOWL_CENTER.y * 2 - item.y);
    item.x = x;
    item.y = y;
    markMood(item, 'panic');
    burst(world, origin.x, origin.y, FOODS[item.foodId].color);
    addRipple(world, x, y, FOODS[item.foodId].accent);
    announce(world, 'evaded');
    return result('evaded', 'boing', item);
  }

  function blockWithGuardian(world, item, helper, stick) {
    const dx = item.x - helper.x;
    const dy = item.y - helper.y;
    const distance = Math.hypot(dx, dy) || 1;
    helper.vx += dx / distance * 160;
    helper.vy += dy / distance * 160;
    markMood(helper, 'smug');
    stick.state = 'stunned';
    stick.timer = 0.26;
    burst(world, item.x, item.y, FOODS[helper.foodId].accent);
    announce(world, 'blocked');
    return result('blocked', 'boing', item);
  }

  function splitFood(world, item) {
    const angle = random(world) * TAU;
    const active = world.entities.filter(other => !other.popped);
    for (const side of [-1, 1]) {
      const preferredX = item.x + side * 64 * Math.cos(angle);
      const preferredY = item.y + side * 64 * Math.sin(angle);
      const { x, y } = findOpenPosition(item.radius, active, preferredX, preferredY);
      const decoy = makeEntity(world, item.foodId, x, y, 36, true);
      active.push(decoy);
    }
    item.vulnerable = true;
    markMood(item, 'panic');
    announce(world, 'split');
    burst(world, item.x, item.y, FOODS[item.foodId].color);
    return result('split', 'bloop', item);
  }

  function blast(world, item) {
    scatter(world, item.x, item.y, 200);
    addRipple(world, item.x, item.y, FOODS.chili.color, 20);
    burst(world, item.x, item.y, FOODS.chili.accent, 18);
    for (const other of world.entities) {
      if (!other.shielded) continue;
      other.shielded = false;
      other.vulnerable = true;
      markMood(other, 'dizzy');
    }
    announce(world, 'blasted');
  }

  function tapDaily(world, item, stick) {
    const { rules } = world;
    if (item.uid !== world.targetUid) {
      if (item.foodId === rules.guardian) {
        item.popped = true;
        item.grabbedBy = stick.player;
        burst(world, item.x, item.y, FOODS[item.foodId].accent);
        announce(world, 'guardGone');
        return result('cleared', 'bloop', item);
      }
      if (item.foodId === rules.shieldBreaker) {
        const target = world.entities.find(other => other.uid === world.targetUid);
        item.popped = true;
        if (item.foodId === 'chili') {
          blast(world, item);
          return result('broken', 'boom', item);
        }
        target.shielded = false;
        target.vulnerable = true;
        markMood(target, 'dizzy');
        addRipple(world, item.x, item.y, FOODS.cilantro.color, 20);
        burst(world, target.x, target.y, FOODS.cilantro.color);
        announce(world, 'broken');
        return result('broken', 'bloop', item);
      }
      return tapWrongFood(world, item);
    }

    if (rules.steal && !item.vulnerable) return stealStick(world, item, stick);
    if (rules.split && !item.vulnerable) return splitFood(world, item);
    const guardian = world.entities.find(other => !other.popped && other.foodId === rules.guardian);
    if (guardian) return blockWithGuardian(world, item, guardian, stick);
    if (item.shielded) return teleport(world, item);
    takeFood(world, item, stick, 'won');
    announce(world, 'caught');
    return result('caught', 'win', item);
  }

  function tapWrongFood(world, item) {
    if (item.decoy) {
      item.popped = true;
      announce(world, 'decoy');
      burst(world, item.x, item.y, FOODS[item.foodId].color, 7);
      return result('decoy', 'bloop', item);
    }
    scatter(world, item.x, item.y, 52);
    return result('miss', 'clack', item);
  }

  function springPrank(world, item, stick) {
    const helper = world.entities.find(other => !other.popped && other.uid === world.helperUid);
    const { traitId } = world.prankSpec;
    if (traitId === 'steal_stick') return stealStick(world, item, stick);
    if (traitId === 'teleport_flee') return teleport(world, item);
    if (traitId === 'bodyguard') return blockWithGuardian(world, item, helper, stick);
    if (traitId === 'clone_split') return splitFood(world, item);
    if (traitId === 'magnet_trap') {
      helper.x = stick.x;
      helper.y = stick.y;
      takeFood(world, helper, stick, null);
      stick.targetUid = helper.uid;
      stick.targetFoodId = helper.foodId;
      announce(world, 'magnetized');
      return result('magnetized', 'bloop', helper);
    }
    blast(world, helper);
    stick.state = 'stunned';
    stick.timer = 0.38;
    return result('stunned', 'boom', item);
  }

  function tapPrank(world, item, stick) {
    if (item.uid !== world.targetUid) return tapWrongFood(world, item);
    const triggerTap = world.prankSpec.triggerId === 'on_second_tap' ? 2 : 1;
    if (!world.prankRevealed && world.tapCount < triggerTap) {
      announce(world, 'primed');
      return result('primed', 'clack', item);
    }
    if (!world.prankRevealed && world.tapCount === triggerTap) {
      world.prankRevealed = true;
      item.vulnerable = true;
      return springPrank(world, item, stick);
    }
    takeFood(world, item, stick, 'won');
    announce(world, 'caught');
    return result('caught', 'win', item);
  }

  function tapDuel(world, item, stick) {
    if (!item) return result('miss', 'clack', null);
    if (item.foodId === 'chili') {
      stick.state = 'stunned';
      stick.timer = 0.9;
      blast(world, item);
      return result('stunned', 'boom', item);
    }
    const won = ++world.duelScores[stick.player] === world.duelTargetScore;
    if (won) world.winner = stick.player;
    takeFood(world, item, stick, won ? 'won' : null);
    announce(world, won ? 'won' : 'scored');
    return result('caught', won ? 'win' : 'bloop', item);
  }

  function tapArena(world, x, y, player) {
    if (world.status !== 'playing' || !Number.isFinite(x) || !Number.isFinite(y)) return IGNORED;
    const who = player ?? (world.mode === 'duel' && y < BOWL_CENTER.y ? 'p2' : 'p1');
    if (who !== 'p1' && who !== 'p2') return IGNORED;
    const stick = world.chopsticks[who];
    if (!stick || ((stick.state === 'stunned' || stick.state === 'stolen') && stick.timer > 0)) return IGNORED;

    world.tapCount++;
    const item = closestFood(world.entities, x, y);
    stick.x = x;
    stick.y = y;
    stick.rotation = Math.atan2(y - stick.homeY, x - BOWL_CENTER.x);
    stick.state = 'pinching';
    stick.timer = 0.18;
    stick.targetFoodId = item?.foodId || null;
    stick.targetUid = item?.uid ?? null;
    addRipple(world, x, y, item ? FOODS[item.foodId].color : '#FFFFFF');
    if (item) squeeze(item);

    if (world.mode === 'fair') {
      const chosen = item || stirAndPick(world, x, y);
      if (!chosen) return result('miss', 'clack', null);
      squeeze(chosen);
      stick.targetFoodId = chosen.foodId;
      stick.targetUid = chosen.uid;
      stick.x = chosen.x;
      stick.y = chosen.y;
      takeFood(world, chosen, stick, 'picked');
      world.targetFoodId = chosen.foodId;
      announce(world, 'caught');
      return result('caught', 'win', chosen);
    }

    if (world.mode === 'duel') return tapDuel(world, item, stick);
    let response = result('miss', 'clack', null);
    if (item) response = world.mode === 'daily' ? tapDaily(world, item, stick) : tapPrank(world, item, stick);
    return world.status === 'won' ? response : spendAttempt(world, response);
  }

  function toggleFairExclude(world, foodId) {
    if (world.mode !== 'fair' || world.status !== 'playing') return false;
    const item = world.entities.find(entity => entity.foodId === foodId);
    if (!item) return false;
    if (!item.popped && world.entities.filter(entity => !entity.popped).length <= 1) return false;
    item.popped = !item.popped;
    return true;
  }

  function verifySolvable(patch) {
    const normalized = normalizePrank(patch);
    if (!normalized) return false;
    const world = createGame({ mode: 'prank', prankSpec: normalized, ghostEnabled: false });
    // Follow the target through the trap and its recovery using the same hit test as the player.
    while (world.status === 'playing' && world.tapCount < world.maxAttempts) {
      const target = world.entities.find(item => item.uid === world.targetUid && !item.popped);
      if (!target) return false;
      const response = tapArena(world, target.x, target.y);
      if (response.outcome === 'ignored') return false;
      while (world.status === 'playing' && world.chopsticks.p1.timer > 0) stepWorld(world, 0.05);
    }
    return world.status === 'won' && world.prankRevealed && world.caughtFoodId === normalized.targetFoodId;
  }

  function compileRulePatch(spec) {
    const patch = normalizePrank(spec);
    return patch && verifySolvable(patch) ? { ...patch, solvable: true } : null;
  }

  function encodePrankUrl(patch) {
    const compiled = compileRulePatch(patch);
    if (!compiled) return '';
    const params = new URLSearchParams([
      ['m', 'prank'], ['f', compiled.targetFoodId], ['tr', compiled.traitId], ['tg', compiled.triggerId],
      ['vl', compiled.volley], ['tn', compiled.tauntId], ['s', compiled.seed],
    ]);
    return '?' + params.toString();
  }

  function decodePrankUrl(searchStr) {
    const invalid = { isPrank: false, patch: null };
    if (typeof searchStr !== 'string' || searchStr.length > 256) return invalid;
    const params = new URLSearchParams(searchStr);
    if (Array.from(params.keys()).length !== URL_FIELDS.length ||
        !URL_FIELDS.every(key => params.getAll(key).length === 1) || params.get('m') !== 'prank') return invalid;
    const volley = params.get('vl');
    const seed = params.get('s');
    if (!/^(0|[1-9]\d{0,3})$/.test(volley) || !/^(0|[1-9]\d{0,9})$/.test(seed)) return invalid;
    const patch = compileRulePatch({
      targetFoodId: params.get('f'), traitId: params.get('tr'), triggerId: params.get('tg'),
      volley: Number(volley), tauntId: params.get('tn'), seed: Number(seed),
    });
    return patch ? { isPrank: true, patch } : invalid;
  }

  function buildCounterPrankPatch(prevPatch, overrides = {}) {
    const prev = normalizePrank(prevPatch);
    if (!prev) return null;
    const {
      targetFoodId = prev.targetFoodId, traitId = prev.traitId, triggerId = prev.triggerId,
      tauntId = prev.tauntId, seed = prev.seed,
    } = overrides || {};
    return compileRulePatch({ targetFoodId, traitId, triggerId, tauntId, seed, volley: prev.volley + 1 });
  }

  function createEmptySave() {
    return { v: 1, foodMask: 0, fusionMask: 0, dayMask: 0, lastStamp: '', streak: 0, bestVolley: 0 };
  }

  function dateStamp(raw) {
    if (typeof raw !== 'number' && typeof raw !== 'string') return '';
    const value = String(raw);
    const stamp = /^\d{8}$/.test(value) ? value.slice(0, 4) + '-' + value.slice(4, 6) + '-' + value.slice(6) : value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return '';
    const date = new Date(stamp + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === stamp ? stamp : '';
  }

  function fusionMaskFor(foodMask) {
    let mask = 0;
    for (const fusion of Object.values(FUSIONS)) {
      if (fusion.req.every(id => (foodMask & (1 << FOODS[id].bit)) !== 0)) mask |= 1 << fusion.bit;
    }
    return mask;
  }

  function normalizeSave(save) {
    const normalized = createEmptySave();
    if (!save || typeof save !== 'object' || Array.isArray(save) || (save.v !== undefined && save.v !== 1)) return normalized;
    if (Number.isSafeInteger(save.foodMask) && save.foodMask >= 0) normalized.foodMask = save.foodMask & 0xff;
    if (Number.isSafeInteger(save.dayMask) && save.dayMask >= 0) normalized.dayMask = save.dayMask & 0x7f;
    if (isIntegerIn(save.bestVolley, 0, MAX_VOLLEY)) normalized.bestVolley = save.bestVolley;
    normalized.fusionMask = fusionMaskFor(normalized.foodMask);
    normalized.lastStamp = dateStamp(save.lastStamp);
    if (normalized.lastStamp && isIntegerIn(save.streak, 1, Number.MAX_SAFE_INTEGER)) normalized.streak = save.streak;
    return normalized;
  }

  function recordCatchInSave(save, caught = {}) {
    const next = normalizeSave(save);
    const { foodId, dayCleared, todayStamp, volley } = caught || {};
    const alreadyFused = next.fusionMask;
    const hasFood = isFood(foodId);
    const hasDay = isIntegerIn(dayCleared, 1, 7);
    if (hasFood) next.foodMask |= 1 << FOODS[foodId].bit;
    if (hasDay) next.dayMask |= 1 << (dayCleared - 1);
    if (isIntegerIn(volley, 0, MAX_VOLLEY)) next.bestVolley = Math.max(next.bestVolley, volley);
    const stamp = dateStamp(todayStamp);
    if ((hasFood || hasDay) && stamp && stamp > next.lastStamp) {
      const consecutive = Date.parse(stamp) - Date.parse(next.lastStamp) === DAY_MS;
      next.streak = consecutive ? Math.min(Number.MAX_SAFE_INTEGER, next.streak + 1) : 1;
      next.lastStamp = stamp;
    }
    next.fusionMask = fusionMaskFor(next.foodMask);
    const unlocked = next.fusionMask & ~alreadyFused;
    const newlyFused = Object.values(FUSIONS).filter(fusion => (unlocked & (1 << fusion.bit)) !== 0);
    return { save: next, newlyFused };
  }

  function getUnlockedBentoItems(save) {
    const { foodMask, fusionMask } = normalizeSave(save);
    return [
      ...Object.values(FOODS).filter(food => (foodMask & (1 << food.bit)) !== 0),
      ...Object.values(FUSIONS).filter(fusion => (fusionMask & (1 << fusion.bit)) !== 0),
    ];
  }

  function getSaveByteLength(save) {
    return new TextEncoder().encode(serializeSave(save)).length;
  }

  function serializeSave(save) {
    const serialized = JSON.stringify(normalizeSave(save));
    return new TextEncoder().encode(serialized).length < ARCHIVE_MAX_BYTES ? serialized : JSON.stringify(createEmptySave());
  }

  function parseSave(str) {
    if (typeof str !== 'string' || str.length >= ARCHIVE_MAX_BYTES || new TextEncoder().encode(str).length >= ARCHIVE_MAX_BYTES) {
      return createEmptySave();
    }
    try {
      return normalizeSave(JSON.parse(str));
    } catch {
      return createEmptySave();
    }
  }

  function clearSave() {
    return createEmptySave();
  }

  return {
    WORLD_SIZE, BOWL_CENTER, ARCHIVE_MAX_BYTES, FOODS, FUSIONS, TRAIT_CHIPS, TRIGGER_CHIPS, TAUNT_STAMPS, DAILY_LEVELS,
    createGame, stepWorld, tapArena, toggleFairExclude, compileRulePatch, verifySolvable, encodePrankUrl, decodePrankUrl,
    buildCounterPrankPatch, createEmptySave, recordCatchInSave, getUnlockedBentoItems, getSaveByteLength,
    serializeSave, parseSave, clearSave,
  };
});

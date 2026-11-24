(() => {
  'use strict';
  const laws = [
    {id: 'float', name: '反重力', icon: '↑', ink: '#286e61', pale: '#d7f0df'},
    {id: 'heavy', name: '千斤坠', icon: '↓', ink: '#996035', pale: '#f8e2be'},
    {id: 'jelly', name: '果冻化', icon: '≈', ink: '#8358a2', pale: '#eadcf5'},
    {id: 'vortex', name: '小黑洞', icon: '◎', ink: '#526aa1', pale: '#dfe8fa'},
    {id: 'slow', name: '慢动作', icon: '◷', ink: '#ab5866', pale: '#fae0e3'},
    {id: 'rain', name: '玩具雨', icon: '☄', ink: '#727f36', pale: '#e7edca'}
  ];
  const Stage = typeof module !== 'undefined' && module.exports ? require('./stage3d.js') : window.NewtonStage;
  const {products, sceneProps} = Stage;
  const toys = {cat: '胖橘', piano: '三角琴', bowl: '拉面碗', tower: '积木塔', apple: '青苹果'};
  Object.assign(toys, Object.fromEntries(Object.entries(products).map(([id, p]) => [id, p.name])));
  const triggers = {now: '立刻', tap: '下一戳', impact: '落地时'};
  const law = id => laws.find(l => l.id === id);
  const recipes = [
    ['肚皮蹦床', 'cat', 'jelly', 'float'], ['橘猫拉面', 'cat', 'vortex', 'jelly'],
    ['螺旋升空', 'apple', 'vortex', 'float'], ['猫掌拆塔', 'tower', 'heavy', 'jelly'],
    ['月球漫步', 'cat', 'slow', 'float'], ['双星绕碗', 'apple', 'slow', 'vortex'],
    ['暴雨琴键', 'piano', 'rain', 'heavy'], ['拉面瀑布', 'bowl', 'rain', 'jelly'],
    ['牛顿慢镜', 'apple', 'heavy', 'slow'], ['积木龙卷', 'tower', 'rain', 'vortex'],
    ['失重猫群', 'cat', 'rain', 'float'], ['果冻休止符', 'piano', 'slow', 'jelly']
  ].map(([name, subject, ...pair], id) => ({id, name, subject, laws: pair}));
  function prime(id) {
    const r = recipes[id];
    if (!r)
      return null;
    return {
      id, first: r.laws[0], next: r.laws[1]
    }
  }
  function finish(pending, id) {
    if (!pending || pending.next !== id)
      return null;
    const r = recipes[pending.id];
    return {
      subject: r.subject, forces: r.laws.slice(), trigger: 'now', reaction: r.id,
          caption: r.name + '！'
    }
  }
  const combo = history => history.length >= 3 && new Set(history.slice(-3)).size === 3;
  const levelData = Stage.levels.map((name, i) => [name, [
    '99.2% · 三秒护杯', '6.8% · 千斤背刺', '1mm · 果冻压箱', '每日 · 引力天气'
  ][i]]);
  const objectives = ['戳开猫爪，护杯三秒', '接住手机，扛过桌震', '按住鼓包，合盖三秒', '开罐引力，救出胖橘'];
  const examples = ['让泡面变成黑洞把钢琴吸走', '下十倍大橘猫雨', '时间慢放果冻蹦床'];
  const aliases = [
    ['coffee', /咖啡|美式|护杯/], ['phone', /手机|防摔/], ['tin', /罐头|开罐/],
    ['case', /行李箱|登机箱|收纳|压箱/],
    ['bowl', /泡面|方便面|拉面|牛肉面|面碗|面条|汤碗/],
    ['piano', /钢琴|三角琴|琴键|琴/], ['tower', /积木|塔/], ['apple', /苹果|水果/],
    ['cat', /猫|胖橘|大橘|肉垫/]
  ];
  function findToy(text) {
    return aliases.find(([, rx]) => rx.test(text))?.[0]
  }
  function variation(s) {
    return [...s].reduce((v, c) => (Math.imul(v, 31) + c.codePointAt(0)) >>> 0, 13)
  }
  function compile(text) {
    const s = String(text).trim().slice(0, 100), bits = s.split(/把|将/), v = variation(s);
    const subject = findToy(bits.at(-1)) || findToy(s) || Object.keys(toys)[v % 5];
    const forces =
        [
          ['slow', /慢|定格|时间暂停|静止/], ['jelly', /果冻|弹|布丁|软胶|收纳|压箱/],
          ['vortex', /黑洞|吸|旋涡|漩涡|绕/], ['rain', /雨|复制|降下/],
          ['float', /失重|反重力|升空|漂浮|飘|飞天/],
          ['heavy', /千斤|砸|吨|超重|坠|防摔|多米诺/]
        ].filter(([, rx]) => rx.test(s))
            .map(([id]) => id);
    if (!forces.length)
      forces.push(laws[v % 6].id);
    const p = {
      subject,
      forces,
      trigger: /落地|着陆|碰地/.test(s) ? 'impact' :
          /下一戳|点按|再戳/.test(s)   ? 'tap' :
                                                'now'
    };
    if (/多米诺/.test(s)) p.domino = true;
    if (forces.includes('vortex'))
      p.anchor = (bits.length > 1 && findToy(bits[0])) || (subject === 'tin' ? 'tin' : subject === 'bowl' ? 'apple' : 'bowl');
    if (p.anchor === 'tin' && p.subject === 'tin') p.subject = 'all';
    if (forces.includes('rain')) {
      const n = s.match(/(\d+|十|三|五|六|八)\s*[倍只个]/);
      p.count = Math.min(
          16, Math.max(1, n ? (Number(n[1]) || ({十: 10, 三: 3, 五: 5, 六: 6, 八: 8})[n[1]]) : 6))
    }
    return p;
  }
  function encode(level, moves, context) {
    const base = 'NT' + (level + 1) + '-' +
        moves.slice(-6)
            .map(id => (laws.findIndex(l => l.id === id) + 1).toString())
            .join('')
            .padStart(6, '0');
    let code = context && (context.seed != null || context.recipe != null) ? base + '-' + (context.seed >>> 0).toString(36).toUpperCase() +
            (context.recipe == null ? '' : '.' + (context.recipe + 1).toString(36).toUpperCase()) :
                     base;
    if (context?.relayDepth != null || context?.prop != null) {
      const {relayDepth, prop} = context;
      if (relayDepth != null && (!Number.isSafeInteger(relayDepth) || relayDepth < 1 || relayDepth > 9999))
        throw RangeError('棒次须在 1–9999 之间');
      if (prop != null && !Object.hasOwn(products, prop)) throw RangeError('未知实验品');
      code += '~' + (relayDepth ?? '') + '/' + (prop ?? '');
    }
    if (context?.frame && context.relayDepth) {
      code += '!' + btoa(String.fromCharCode(...context.frame)).replace(/=+$/, '')
          .replace(/\+/g, '-').replace(/\//g, '_');
    }
    return code;
  }
  function decode(s) {
    const [header, payload, extra] = String(s).trim().split('!');
    if (extra != null) return null;
    const parts = header.split('~');
    if (parts.length > 2) return null;
    const m = /^NT([1-4])-(0*[1-6]*)(?:-([0-9A-Z]{1,7})(?:\.([1-9A-C]))?)?$/.exec(
        parts[0].toUpperCase());
    if (!m || m[2].length !== 6)
      return null;
    const game = {
      level: Number(m[1]) - 1,
      moves: [...m[2]].filter(n => n !== '0').map(n => laws[Number(n) - 1].id)
    };
    if (m[3]) {
      game.seed = parseInt(m[3], 36);
      if (game.seed > 0xffffffff)
        return null
    }
    if (m[4])
      game.recipe = parseInt(m[4], 36) - 1;
    if (parts.length === 2) {
      const ext = /^([1-9]\d{0,3})?\/(coffee|phone|tin|case)?$/i.exec(parts[1]);
      if (!ext || (!ext[1] && !ext[2])) return null;
      if (ext[1]) game.relayDepth = Number(ext[1]);
      if (ext[2]) game.prop = ext[2].toLowerCase();
    }
    if (payload != null) {
      if (!game.relayDepth || !game.prop || !/^[A-Za-z0-9_-]{71}$/.test(payload)) return null;
      const bytes = Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      if (bytes[0] > 9 || bytes[1] > 35 || bytes[2] > 3 || bytes[3] > 140 || bytes[4] > 145) return null;
      for (let pos = 5; pos < bytes.length; pos += 8)
        if (bytes[pos + 6] > 63 || bytes[pos + 7] >= 6) return null;
      game.frame = bytes;
    }
    return game;
  }
  const transfer = (seedContext, earnedArtifact, unfinishedHook) =>
      ({seedContext, earnedArtifact, unfinishedHook});
  function fingerprint() {
    return {clicks: 0, buzzer: 0, losses: 0, chains: 0, props: {}, laws: {}, streak: 0, lastLaw: ''};
  }
  const favorite = counts => Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const counters = {wind: '反向横风', pull: '罐头吸力', oil: '盘沿抹油'};
  const opposite = id => ({float: 'wind', heavy: 'oil', jelly: 'oil', slow: 'wind', vortex: 'wind', rain: 'pull'})[id] || 'pull';
  function observe(profile, event, value) {
    if (event === 'loss') profile.losses++;
    if (event === 'win') profile.losses = 0;
    if (event === 'chain') profile.chains++;
    if (event === 'click') {
      profile.clicks++;
      if (value) profile.buzzer++;
    }
    if (event === 'prop' && Object.hasOwn(products, value))
      profile.props[value] = (profile.props[value] || 0) + 1;
    if (event === 'law' && law(value)) {
      profile.laws[value] = (profile.laws[value] || 0) + 1;
      profile.streak = profile.lastLaw === value ? profile.streak + 1 : 1;
      profile.lastLaw = value;
      if (profile.streak % 3 === 0) return opposite(value);
    }
  }
  function reading(p) {
    if (p.losses >= 2) return ['执念上头战神', '桌都塌了你还加码'];
    if (p.buzzer >= 2 && p.buzzer * 3 >= p.clicks) return ['极限压哨赌徒', '差半秒你才肯出手'];
    if (favorite(p.props) === 'phone') return ['硬核防摔质检员', '你测手机桌子遭殃'];
    if (p.chains >= 3 && p.chains >= p.clicks / 2) return ['混沌拆家乐子人', '拆家这事你有天赋'];
    return ['温柔护杯狂魔', '你连冰块都想接住'];
  }
  function directorPatch(profile, prop) {
    const preferred = favorite(profile.laws);
    const force = ({heavy: 'float', float: 'heavy', jelly: 'heavy', rain: 'vortex',
      vortex: 'rain', slow: 'jelly'})[preferred] || (prop === 'coffee' ? 'float' : 'jelly');
    const subject = favorite(profile.props) || prop;
    return {subject, forces: [force], trigger: 'now', counter: opposite(preferred),
      caption: ({phone: '手机毫发无损，地球下沉2cm', coffee: '咖啡没洒，冰块请了飞行假',
        tin: '拉环起飞，全屋申请入罐', case: '箱盖合格，袜子进入平行宇宙'})[subject]};
  }
  function dailyWallet(saved, day) {
    return saved?.day === day ? saved : {day, remaining: 3, bonus: 0};
  }
  function spend(wallet) {
    if (wallet.remaining <= 0) return false;
    wallet.remaining--;
    return true;
  }
  function rewardAvailable(wallet, losses) {
    return wallet.remaining === 0 || (losses >= 2 && losses !== wallet.claimedLoss);
  }
  function reward(wallet, losses) {
    if (!rewardAvailable(wallet, losses)) return false;
    wallet.claimedLoss = losses;
    wallet.remaining++;
    wallet.bonus++;
    return true;
  }
  const api = {products, sceneProps, fingerprint, observe, reading, directorPatch, dailyWallet, spend, reward, laws, recipes, prime, finish, compile, combo, encode, decode, transfer};
  if (typeof module !== 'undefined' && module.exports)
    module.exports = api;
  if (typeof document === 'undefined')
    return;

  const $ = id => document.getElementById(id),
        buttons = (node, values, make) => node.replaceChildren(...values.map(make));
  function btn(label, fn, cls = '') {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = cls;
    b.addEventListener('click', fn);
    return b
  }
  function read(key, base) {
    try {
      return JSON.parse(localStorage.getItem('newton3d.' + key)) ?? base
    } catch {
      return base
    }
  }
  function save(key, v) {
    try {
      localStorage.setItem('newton3d.' + key, JSON.stringify(v))
    } catch {
    }
  }
  let noticeTimer;
  function notice(s) {
    const o = $('notice');
    o.textContent = s;
    o.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => o.classList.remove('show'), 2100)
  }
  const scroll = id => $(id).scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth',
    block: 'center'
  });
  const date = new Date(),
        dateText =
            [
              date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
              String(date.getDate()).padStart(2, '0')
            ].join('.'),
        daily = variation(dateText);
  let level = 0, pending = null, moves = [], comboRun = [], lastTap = 0,
      stampBook = read('discoveries', {}), relayPack = null, parcelTimer = 0;
  const profile = Object.assign(fingerprint(), read('profileV2', {}));
  let wallet, depth = 0, restoring = false;
  function walletForToday() {
    const now = new Date();
    const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
    wallet = dailyWallet(wallet || read('alchemyV2', null), day);
    return wallet;
  }
  function updateDirector() {
    const measured = profile.clicks || profile.losses || profile.chains;
    const [badge, line] = reading(profile);
    $('director-title').textContent = measured ? badge : '等待第一爪';
    $('director-comment').textContent = measured ? line : '先玩一局，让胖橘猜猜你。';
    $('fingerprint').textContent = '出手 ' + profile.clicks + ' · 压哨 ' + profile.buzzer + ' · 连败 ' +
      profile.losses + ' · 连锁 ' + profile.chains + ' · 常用' + (law(favorite(profile.laws))?.name || '待测') +
      ' · 偏爱' + (products[favorite(profile.props)]?.name || '待测');
    walletForToday();
    $('quota').textContent = '每日免费 3 次 AI 炼金 · 可用 ' + wallet.remaining + ' 次';
    $('reward').disabled = !rewardAvailable(wallet, profile.losses);
    $('reward-note').textContent = $('reward').disabled ? '连败 ' + profile.losses + '/2 · 可在试玩台开局' : '救场已解锁 · 点按模拟完整播放';
  }
  function track(event, value) {
    if (restoring) return;
    const counter = observe(profile, event, value);
    save('profileV2', profile);
    updateDirector();
    if (counter) counterStage(counter);
  }
  function counterStage(kind) {
    stage.applyCounter(kind);
    $('counter').textContent = '胖橘看穿了你！' + counters[kind];
    stage.say(counters[kind] + '!', stage.body(stage.prop));
  }
  function debit() {
    if (!spend(walletForToday())) {
      updateDirector();
      notice('今天的炼金用完啦，领一杯再继续');
      scroll('reward');
      return false;
    }
    save('alchemyV2', wallet);
    updateDirector();
    return true;
  }
  function download(blob, name) {
    if (!blob) {
      notice('导出未完成，请再试一次');
      return
    }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  const stage = new window.NewtonStage($('world'), $('overlay'), {
    meter(n) {
      $('meter-value').textContent = n + '%';
      if (n) {
        $('meter').classList.remove('kick');
        void $('meter').offsetWidth;
        $('meter').classList.add('kick')
      }
    },
    level(n) {
      level = n;
      $('objective').parentElement.classList.remove('cleared');
      $('objective').textContent = objectives[n];
      $('level-name').textContent = levelData[n][0];
      $('level-no').textContent = 'LEVEL 0' + (n + 1) + ' / 04';
      [...$('levels').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === n)))
    },
    unprime() {
      pending = null;
      highlight()
    },
    action(id, late) {
      track('click', late);
      if (products[id]) track('prop', id);
    },
    frame() { receipt(); },
    clock(t) {
      $('round-state').textContent = '剩 ' + (3 - t / 10).toFixed(1) + ' 秒 · 点猫或实验品救场';
    },
    counterEnd() { $('counter').textContent = ''; },
    chain(count) {
      $('chain').textContent = '连锁 ×' + count;
      $('chain').classList.add('hit');
      if (!stage.won && !stage.failed) track('chain');
    },
    loss(n) {
      track('loss');
      $('objective').textContent = '翻车！点开局再试';
      $('round-state').textContent = '翻车了 · 可生成好友残局';
      $('start-round').textContent = '↻ 再开一局';
      notice(profile.losses >= 2 ? '连败救场已解锁 · 去实验室续杯' : levelData[n][0] + ' · 翻车了');
    },
    win(n) {
      delete walletForToday().claimedLoss;
      save('alchemyV2', wallet);
      track('win');
      $('round-state').textContent = '守住了 · 可把残局交给好友';
      $('start-round').textContent = '↻ 再开一局';
      $('objective').parentElement.classList.add('cleared');
      $('objective').textContent = '✓ 已通关';
      notice(levelData[n][0] + ' · 挑战完成')
    }
  });
  function reset(n, seed = n === 3 ? daily : 113, prop = sceneProps[n]) {
    pending = null;
    stage.primed = false;
    comboRun = [];
    moves = [];
    depth = 0;
    stage.reset(n, seed, prop);
    syncStage();
    stage.render();
    highlight();
    receipt()
  }
  buttons($('levels'), levelData, ([name, sub], i) => {
    const b = btn('', () => {
      reset(i);
      notice(name + ' · ' + sub)
    }, 'level');
    b.innerHTML = '<i class="idx">0' + (i + 1) + '</i><span><strong>' + name + '</strong><small>' +
        sub + '</small></span>';
    b.setAttribute('aria-pressed', String(i === 0));
    return b
  });
  function highlight() {
    [...$('caps').children].forEach(
        (b, i) => b.classList.toggle('next', pending?.next === laws[i].id))
  }
  function tapLaw(id) {
    track('click', stage.elapsed >= 2.5 && !stage.won && !stage.failed);
    track('law', id);
    const result = finish(pending, id);
    stage.primed = false;
    if (result) {
      pending = null;
      stage.inject(result);
      notice('反应解锁 · ' + recipes[result.reaction].name)
    } else {
      pending = null;
      stage.inject({subject: restoring && !depth ? 'cat' : stage.prop, forces: [id], trigger: 'now', caption: law(id).name + '！'})
    }
    historyMove(id);
    highlight();
  }
  function historyMove(id) {
    moves.push(id);
    moves = moves.slice(-6);
    const now = performance.now();
    if (now - lastTap > 3000)
      comboRun = [];
    lastTap = now;
    comboRun.push(id);
    comboRun = comboRun.slice(-3);
    if (combo(comboRun)) {
      stage.overload();
      comboRun = [];
      notice('三连成功 · OIIA 橘猫超载！')
    }
    receipt();
  }
  buttons($('caps'), laws, l => {
    const b = btn('', () => tapLaw(l.id), 'cap');
    b.innerHTML = '<i>' + l.icon + '</i>' + l.name;
    b.style.setProperty('--ink', l.ink);
    b.style.setProperty('--pale', l.pale);
    return b
  });
  $('reset').onclick = () => {
    reset(level);
    notice('玩具已归位')
  };
  $('play-cat').onclick = () => {
    if (stage.failed || stage.won) reset(level, stage.seed, stage.prop);
    stage.poke('cat');
    scroll('console')
  };
  function syncProducts() {
    const product = products[stage.prop];
    for (const id of ['props', 'brand-props'])
      for (const b of $(id).children) b.setAttribute('aria-pressed', String(b.dataset.prop === stage.prop));
    $('formula').textContent = product.formula;
    $('live-formula').textContent = product.formula;
    $('offer').textContent = product.offer + ' · 同款好物';
  }
  function syncStage() {
    syncProducts();
    $('chain').textContent = '连锁 ×' + stage.chainCount;
    $('chain').classList.remove('hit');
    $('counter').textContent = '';
    $('round-state').textContent = objectives[level];
    $('start-round').textContent = '▶ 开始三秒挑战';
  }
  for (const group of ['props', 'brand-props']) {
    buttons($(group), Object.entries(products), ([id, p]) => {
      const b = btn(p.icon + ' ' + p.name, () => {
        reset(level, stage.seed, id);
        track('prop', id);
        if (group === 'brand-props') { scroll('console'); stage.poke(id); }
        else notice(p.name + ' 已上桌');
      });
      b.dataset.prop = id;
      return b;
    });
  }
  syncStage();
  updateDirector();
  $('start-round').onclick = () => {
    if (stage.started && !stage.relayReady && !stage.primed) reset(level, stage.seed, stage.prop);
    if (stage.primed || pending) { pending = null; stage.primed = false; highlight(); }
    stage.relayReady = false;
    stage.start();
    $('start-round').textContent = '↻ 重新开局';
    stage.render();
  };
  $('custom').onclick = () => {
    if (!debit()) return;
    if (stage.won || stage.failed) reset(level, stage.seed, stage.prop);
    const p = directorPatch(profile, stage.prop);
    track('click', stage.elapsed >= 2.5);
    pending = null;
    stage.primed = false;
    highlight();
    stage.inject(p);
    counterStage(p.counter);
    historyMove(p.forces[0]);
    syncProducts();
    $('report').textContent = '质检报告 · ' + p.caption;
    scroll('console');
  };
  $('reward').onclick = () => {
    if (!reward(walletForToday(), profile.losses)) return;
    save('alchemyV2', wallet);
    if (stage.failed || stage.won) reset(level, stage.seed, stage.prop);
    pending = null;
    stage.primed = false;
    highlight();
    stage.rescue();
    updateDirector();
    $('reward-note').textContent = '模拟播放完成 · 已到账一次炼金';
    $('round-state').textContent = '绝对静止 · 救场中';
    scroll('console');
    notice('激励已兑现 · 绝对静止 + 一次炼金');
  };
  $('sound').onclick = () => {
    const s = stage.synth;
    s.enabled = !s.enabled;
    if (s.enabled) {
      s.unlock();
      s.play('cat')
    } else if (s.ctx)
      s.ctx.suspend().catch(() => {});
    $('sound').setAttribute('aria-pressed', String(s.enabled));
    $('sound').querySelector('span').textContent = s.enabled ? '声音开' : '声音关'
  };
  function film(on) {
    stage.film = on;
    $('console').classList.toggle('film', on);
    if (!on)
      stage.stopRecord();
    stage.resize();
    stage.schedule();
    (on ? $('record') : $('cinema')).focus({preventScroll: true})
  }
  $('cinema').onclick = () => film(true);
  $('exit-film').onclick = () => film(false);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && stage.film)
      film(false)
  });
  $('record').onclick = () => {
    if (stage.rec) {
      stage.stopRecord();
      return
    }
    try {
      stage.startRecord(blob => {
        download(blob, '牛顿哭了-高光.webm');
        if (blob)
          notice('高光视频已生成');
        $('record').textContent = '● 录制高光'
      });
      $('record').textContent = '■ 停止并导出';
      notice('录制中 · 最长 15 秒')
    } catch (e) {
      notice(e.message)
    }
  };
  $('snap').onclick = () => stage.snapshot(blob => download(blob, '牛顿哭了-高光.png'));

  let mode = 'slots', selection = {subject: 'cat', force: 'jelly', trigger: 'now'};
  const desktop = matchMedia('(min-width:741px) and (pointer:fine)');
  const patch = () => mode === 'oracle' && desktop.matches ?
      compile($('phrase').value) :
      {subject: selection.subject, forces: [selection.force], trigger: selection.trigger};
  function preview() {
    const p = patch();
    $('patch').textContent = JSON.stringify(p, null, 2);
    const badge = stampBook[JSON.stringify(p)];
    $('stamp').textContent = badge ? '✦ 本机首发调配师 #No.' + badge : ''
  }
  function selectMode(id) {
    mode = id === 'oracle' && desktop.matches ? 'oracle' : 'slots';
    $('oracle').hidden = mode !== 'oracle';
    $('slots').hidden = mode !== 'slots';
    document.querySelectorAll('[data-mode]')
        .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    preview()
  }
  desktop.addEventListener('change', () => selectMode(mode));
  document.querySelectorAll('[data-mode]')
      .forEach(b => b.onclick = () => selectMode(b.dataset.mode));
  const slotRows = [
    ['实验主体', 'subject', Object.entries(toys)],
    ['违禁力场', 'force', laws.map(l => [l.id, l.name])],
    ['暴走时机', 'trigger', Object.entries(triggers)]
  ];
  function renderSlots() {
    $('slots').replaceChildren(...slotRows.map(([title, key, opts]) => {
      const row = document.createElement('div');
      row.className = 'row';
      const label = document.createElement('label');
      label.textContent = title;
      const list = document.createElement('div');
      list.className = 'choices';
      buttons(list, opts, ([v, name]) => {
        const b = btn(name, () => {
          selection[key] = v;
          renderSlots();
          preview()
        });
        b.setAttribute('aria-pressed', String(selection[key] === v));
        return b
      });
      row.append(label, list);
      return row
    }));
  }
  renderSlots();
  preview();
  $('phrase').oninput = preview;
  buttons($('examples'), examples, (x, i) => btn(['黑洞拉面', '十倍猫雨', '慢放蹦床'][i], () => {
                                     $('phrase').value = x;
                                     preview()
                                   }));
  function inject() {
    if (!debit()) return;
    if (stage.won || stage.failed) reset(level, stage.seed, stage.prop);
    const p = patch(), key = JSON.stringify(p);
    track('click', stage.elapsed >= 2.5);
    if (!stampBook[key]) {
      stampBook[key] = String(Object.keys(stampBook).length + 1).padStart(4, '0');
      save('discoveries', stampBook);
      notice('✨ 全服首发调配师 #No.' + stampBook[key] + ' · 本机演示')
    }
    pending = null;
    stage.primed = false;
    highlight();
    stage.inject(p);
    syncProducts();
    for (const id of p.forces) { track('law', id); historyMove(id); }
    preview();
    scroll('console');
  }
  $('inject').onclick = inject;
  $('phrase').onkeydown = e => {
    if (e.key === 'Enter')
      inject()
  };
  $('dice').onclick = () => {
    if (mode === 'oracle')
      $('phrase').value = examples[Math.floor(Math.random() * examples.length)];
    else {
      for (const [, key, opts] of slotRows)
        selection[key] = opts[Math.floor(Math.random() * opts.length)][0];
      renderSlots()
    }
    preview();
    inject()
  };

  function illustrate(c, r) {
    const ctx = c.getContext('2d');
    c.width = 480;
    c.height = 178;
    const a = law(r.laws[0]), b = law(r.laws[1]), w = c.width, h = c.height;
    ctx.fillStyle = a.pale;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = a.ink + '22';
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke()
    }
    ctx.save();
    ctx.translate(w * .52, h * .55);
    ctx.rotate((r.id % 3 - 1) * .12);
    ctx.strokeStyle = b.ink;
    ctx.globalAlpha = .5;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.ellipse(0, 5, 119, 41, -.23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    const ell = (x, y, rx, ry, col, angle = 0) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
      ctx.fill()
    };
    const path = (pts, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fill()
    };
    const box = (x, y, ww, hh, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(x, y, ww, hh, 5);
      ctx.fill()
    };
    ell(4, 38, 54, 9, '#51425924');
    ctx.shadowColor = '#64516f44';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;
    if (r.subject === 'cat') {
      for (const sign of [-1, 1]) {
        path([[sign * 49, -15], [sign * 45, -53], [sign * 16, -35]], '#e79a46');
        path([[sign * 42, -22], [sign * 40, -43], [sign * 26, -32]], '#efae9b')
      }
      ell(0, -1, 53, 40, '#eea650');
      ell(0, 14, 31, 17, '#ffebcb');
      for (const sign of [-1, 1]) {
        ell(sign * 20, -1, 4.5, 6, '#47354c');
        ell(sign * 17, -26, 3, 9, '#c37b3d', sign * .2);
        ell(sign * 34, 10, 8, 3, '#e9a18e')
      }
      ell(0, 6, 5, 3.5, '#ba746e');
    } else if (r.subject === 'bowl') {
      ell(0, 2, 53, 29, '#f4cdab');
      ell(0, -9, 54, 20, '#bc7065');
      ell(0, -10, 47, 14, '#cb8749');
      for (let j = 0; j < 5; j++) {
        ctx.strokeStyle = '#ffe6a0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-32 + j * 12, -8);
        ctx.bezierCurveTo(-20 + j * 12, -49, -17 + j * 12, 22, -6 + j * 12, -18);
        ctx.stroke()
      }
      path([[12, -9], [38, -47], [43, -48], [19, -8]], '#926e54');
    } else if (r.subject === 'tower') {
      ['#b091d8', '#77c0d9', '#6ccbb9', '#fac664', '#ef937b'].forEach((v, i) => {
        const x = -46 + i * 5, y = 25 - i * 16;
        box(x, y, 92 - i * 10, 14, v);
        path([[x, y], [x + 10, y - 6], [x + 100 - i * 10, y - 6], [x + 92 - i * 10, y]], '#ffefcc')
      })
    } else if (r.subject === 'piano') {
      box(-42, 8, 8, 27, '#705d80');
      box(31, 8, 8, 27, '#705d80');
      box(-49, -21, 98, 34, '#a58ac6');
      path([[-49, -22], [-29, -47], [46, -38], [49, -21]], '#c5abe0');
      for (let i = 0; i < 9; i++) {
        box(-44 + i * 10, -3, 9, 13, '#fff4dc');
        if (i % 3)
          box(-44 + i * 10, -3, 5, 8, '#564360')
      }
    } else {
      ell(-12, -3, 27, 36, '#a8ce55', -.22);
      ell(14, -3, 27, 36, '#badb67', .22);
      path([[-2, -29], [5, -53], [11, -51], [3, -28]], '#8b6545');
      ell(19, -40, 16, 6, '#5a9b70', -.4);
      ell(-22, -17, 6, 10, '#e1f3a4', .4)
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = b.ink;
    ctx.font = 'bold 32px Georgia';
    ctx.fillText(b.icon, 78, -20);
    ctx.restore();
    ctx.fillStyle = a.ink;
    ctx.font = '700 15px Consolas, monospace';
    ctx.fillText('RX / ' + String(r.id + 1).padStart(2, '0'), 15, 24);
    ctx.fillText('✦', w - 32, h - 14);
  }
  buttons($('cards'), recipes, r => {
    const b = btn('', () => {
      pending = prime(r.id);
      comboRun = [];
      moves = [pending.first];
      stage.prepare(r);
      syncStage();
      highlight();
      receipt();
      notice('再按「' + law(pending.next).name + '」完成反应');
      scroll('console')
    }, 'recipe');
    const c = document.createElement('canvas');
    illustrate(c, r);
    const detail = document.createElement('div');
    detail.className = 'detail';
    detail.innerHTML = '<strong>' + r.name + '</strong><small>' + law(r.laws[0]).name + ' × ' +
        law(r.laws[1]).name + '</small>';
    b.append(c, detail);
    return b
  });
  const wardrobe = [
    ['none', '原味胖橘'], ['glasses', '酷墨镜'], ['apple', '迷你苹果帽'], ['bow', '弹簧领结'],
    ['wig', '牛顿卷发套']
  ];
  buttons($('wear'), wardrobe, ([id, n], i) => {
    const b = btn(n, () => {
      stage.wear = id;
      stage.burst(stage.body('cat'), 10);
      stage.say(n, stage.body('cat'));
      stage.render();
      [...$('wear').children].forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      scroll('console')
    });
    b.setAttribute('aria-pressed', String(!i));
    return b
  });

  let rescueCount = 0, bundle = null;
  [...$('heights').children].forEach((b, i) => b.onclick = () => {
    $('feed').style.height = (i ? 436 : 300) + 'px';
    [...$('heights').children].forEach(x => x.setAttribute('aria-pressed', String(x === b)))
  });
  $('rescue').onclick = () => {
    rescueCount++;
    const seed = (daily + rescueCount * 31) >>> 0;
    bundle = transfer(seed, '橘爪徽章 ' + rescueCount, laws[seed % 6].id);
    $('rescue-label').textContent = '救到了！' + bundle.earnedArtifact;
    $('carry').disabled = false;
    $('rescue').textContent = '再救一只';
    stage.synth.play('cat')
  };
  $('carry').onclick = () => {
    if (!bundle)
      return;
    const pack = {...bundle, code: challengeCode()};
    $('parcel').textContent = '第 ' + nextDepth() + ' 棒 · ' + products[stage.prop].name + ' · T −0.50s';
    const row = document.querySelector('.relay');
    row.classList.remove('flying');
    void row.offsetWidth;
    row.classList.add('flying');
    $('resume').disabled = true;
    $('arrival').textContent = '胖橘飞行中…';
    clearTimeout(parcelTimer);
    parcelTimer = setTimeout(() => {
      relayPack = pack;
      row.classList.remove('flying');
      $('arrival').textContent = '第 ' + decode(pack.code).relayDepth + ' 棒崩盘残局';
      $('artifact').textContent =
          pack.earnedArtifact + ' · 待触发「' + law(pack.unfinishedHook).name + '」';
      $('resume').disabled = false;
      document.querySelector('.arrival-icon').textContent = '✳'
    }, 500)
  };
  $('resume').onclick = () => {
    if (!relayPack)
      return;
    replay(relayPack.code);
    stage.wear = 'bow';
    stage.pendingEffect = {subject: 'cat', forces: [relayPack.unfinishedHook],
      trigger: 'tap', caption: relayPack.earnedArtifact};
    [...$('wear').children].forEach((b, i) => b.setAttribute('aria-pressed', String(wardrobe[i][0] === 'bow')));
  };

  const provinces =
      '北京 天津 河北 山西 内蒙古 辽宁 吉林 黑龙江 上海 江苏 浙江 安徽 福建 江西 山东 河南 湖北 湖南 广东 广西 海南 重庆 四川 贵州 云南 西藏 陕西 甘肃 青海 宁夏 新疆 香港 澳门 台湾'
          .split(' ');
  let scores = read('teams', {}), selected = read('province', '广东'), share = true;
  if (!provinces.includes(selected))
    selected = '广东';
  for (const p of provinces) {
    const opt = new Option(p, p);
    $('province').add(opt)
  }
  $('province').value = selected;
  function ranks() {
    const all =
              provinces
                  .map((name, i) => ({name, n: 75 + (variation(name) % 440) + (scores[name] || 0)}))
                  .sort((a, b) => b.n - a.n),
          total = all.reduce((s, x) => s + x.n, 0), top = all.slice(0, 3);
    if (!top.some(x => x.name === selected))
      top.push(all.find(x => x.name === selected));
    $('teams').replaceChildren(...top.map(x => {
      const div = document.createElement('div');
      div.className = 'rank';
      div.innerHTML = '<b>' + String(all.indexOf(x) + 1).padStart(2, '0') + ' ' + x.name +
          '</b><i></i><small>' + x.n + ' · ' + (x.n / total * 100).toFixed(1) + '%</small>';
      div.children[1].style.width = (x.n / all[0].n * 100) + '%';
      return div
    }));
  }
  ranks();
  $('province').onchange = () => {
    selected = $('province').value;
    save('province', selected);
    scores[selected] = (scores[selected] || 0) + 1;
    save('teams', scores);
    ranks()
  };
  $('cheer').onclick = () => {
    scores[selected] = (scores[selected] || 0) + 1;
    save('teams', scores);
    ranks();
    notice(selected + '队气哭值 +1')
  };
  $('date').textContent = dateText;
  $('weather').textContent = '今日气象 · ' +
      ['低空猫雨', '果冻暖流', '螺旋微风', '反重力晴空', '慢放阵雨', '苹果逆流'][daily % 6];
  const nextDepth = () => Math.min(9999, depth + 1);
  function challengeCode() {
    return encode(level, moves, {seed: stage.seed, recipe: pending?.id, prop: stage.prop, relayDepth: nextDepth(), frame: stage.relayFrame})
  }
  function receipt() {
    $('cells').replaceChildren(...Array.from({length: 6}, (_, i) => {
      const l = law(moves[i]), el = document.createElement('i');
      el.textContent = l ? l.icon : '·';
      el.style.background = l ? l.pale : '#e5ddcd';
      el.style.color = l ? l.ink : '#a59988';
      return el
    }));
    $('relay-label').textContent = '第 ' + nextDepth() + ' 棒崩盘残局 · ' + products[stage.prop].name +
      (stage.relayFrame ? ' · 实战留帧' : ' · 预设险局');
    $('challenge').textContent = challengeCode();
  }
  receipt();
  for (const [id, panel, label] of [
           ['retention', 'ret-panel', '留存引擎'], ['sharing', 'share-panel', '社交裂变']]) {
    $(id).onclick = () => {
      const on = $(id).getAttribute('aria-pressed') !== 'true';
      $(id).setAttribute('aria-pressed', String(on));
      $(id).textContent = label + ' ' + (on ? 'ON' : 'OFF');
      $(panel).hidden = !on;
      if (id === 'sharing')
        share = on
    }
  }
  async function copyCode() {
    const s = challengeCode();
    try {
      await navigator.clipboard.writeText(s);
      notice('挑战码已复制')
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('challenge'));
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try {
        if (document.execCommand('copy')) {
          notice('挑战码已复制');
          return
        }
      } catch {
      }
      notice('已选中挑战码，可手动复制');
    }
  }
  $('copy').onclick = copyCode;
  function replay(code) {
    const game = decode(code);
    if (!game) {
      notice('挑战码格式不符');
      return
    }
    reset(game.level, game.seed, game.prop);
    depth = game.relayDepth || 0;
    if (game.recipe != null) {
      pending = prime(game.recipe);
      stage.prepare(recipes[game.recipe]);
      if (depth) stage.primed = false;
      moves = game.moves;
      highlight();
      receipt()
    } else if (game.frame) {
      moves = game.moves.slice();
    } else {
      restoring = true;
      try {
        for (const id of game.moves) {
          tapLaw(id);
          for (let i = 0; i < 12; i++) stage.step(1 / 60);
        }
      } finally { restoring = false; }
    }
    if (depth) {
      stage.critical(game.frame);
      $('round-state').textContent = '第 ' + depth + ' 棒 · 点按救场或放手倒计时';
      $('start-round').textContent = '▶ 放手倒计时';
    }
    receipt();
    stage.render();
    scroll('console');
    notice(depth ? '第 ' + depth + ' 棒 · 崩盘前 0.5 秒' : pending ? '残局已载入 · 按发光胶囊补刀' : '残局已载入 · 接着戳飞')
  }
  $('replay').onclick = () => replay(challengeCode());
  $('paste').onclick = async () => {
    try {
      replay(await navigator.clipboard.readText())
    } catch {
      notice('浏览器未开放剪贴板读取，可在桌面按 Ctrl+V 接战')
    }
  };
  document.addEventListener('paste', e => {
    if (e.target === $('phrase') || !share)
      return;
    const code = e.clipboardData?.getData('text');
    if (decode(code)) {
      e.preventDefault();
      replay(code)
    }
  });
  $('ticket').onclick = () => {
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 930;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff8ef';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#bba78e';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 12]);
    ctx.strokeRect(34, 34, 1012, 862);
    const txt = (s, x, y, size, color = '#392f40') => {
      ctx.fillStyle = color;
      ctx.font = 'bold ' + size + 'px system-ui';
      ctx.fillText(s, x, y)
    };
    txt('ANTI-GRAVITY LAB', 76, 120, 32, '#7955b4');
    txt('AI 生成', 852, 119, 28);
    txt('崩坏配方小票', 76, 250, 82);
    txt('第 ' + nextDepth() + ' 棒 · ' + products[stage.prop].name + ' · 崩盘前 0.5 秒', 78, 340, 42);
    for (let i = 0; i < 6; i++) {
      const l = law(moves[i]), x = 78 + i * 155;
      ctx.fillStyle = l ? l.pale : '#e6dece';
      ctx.fillRect(x, 405, 132, 132);
      txt(l ? l.icon : '·', x + 39, 497, 57, l ? l.ink : '#9c9082');
      if (l)
        txt(l.name, x + 8, 585, 25)
    }
    const lines = challengeCode().match(/.{1,45}/g);
    lines.forEach((line, i) => txt(line, 76, 660 + i * 44, 28));
    txt(dateText + '   /   牛顿哭了 3D', 78, 824, 32);
    c.toBlob(blob => download(blob, '牛顿哭了-配方小票.png'), 'image/png');
  };
})();

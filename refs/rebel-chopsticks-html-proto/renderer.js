(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.ChopsticksRenderer = factory(root);
})(typeof window !== 'undefined' ? window : globalThis, function (host) {
  'use strict';

  const SIZE = 320, TAU = Math.PI * 2;
  const INK = '#542b24', GLAZE = '#fff5ce';
  const RARE = new Set(['golden_egg_noodle', 'fire_wings', 'jade_dumpling']);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function paint(c, fill, stroke, width) {
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }

  // After the starting point, each segment supplies the endpoints and optional control points.
  function path(c, fill, stroke, width, start, ...segments) {
    c.beginPath();
    c.moveTo(...start);
    for (const p of segments) {
      if (p.length === 2) c.lineTo(...p);
      else if (p.length === 4) c.quadraticCurveTo(...p);
      else c.bezierCurveTo(...p);
    }
    if (fill) c.closePath();
    paint(c, fill, stroke, width);
  }

  function oval(c, x, y, rx, ry, fill, stroke, width = 1, tilt = 0) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, tilt, 0, TAU);
    paint(c, fill, stroke, width);
  }

  function roundBox(c, x, y, w, h, r, fill, stroke, width = 1) {
    r = Math.min(r, w / 2, h / 2);
    path(c, fill, stroke, width, [x + r, y], [x + w - r, y], [x + w, y, x + w, y + r],
      [x + w, y + h - r], [x + w, y + h, x + w - r, y + h],
      [x + r, y + h], [x, y + h, x, y + h - r], [x, y + r], [x, y, x + r, y]);
  }

  function stops(g, colors) {
    colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
    return g;
  }

  function wash(c, top, bottom, ...colors) {
    return stops(c.createLinearGradient(0, top, 0, bottom), colors);
  }

  function star(c, x, y, r, fill) {
    path(c, fill, null, 0, [x, y-r], [x+.22*r,y-.26*r], [x+.82*r,y],
      [x+.22*r,y+.23*r], [x,y+r], [x-.22*r,y+.23*r], [x-.82*r,y], [x-.22*r,y-.26*r]);
  }

  function steam(c, x, y, time, size) {
    c.save();
    const phase = (time * .58 + x * .031 + 100) % 1;
    c.globalAlpha *= .7 * Math.sin(Math.PI * phase);
    c.translate(x, y - phase * 8 * size);
    c.scale(size, size);
    path(c, null, '#fff9e8', 1.5, [0,0], [6,-6,-4,-7,1,-13]);
    c.restore();
  }

  function dumpling(c, jade) {
    const dough = jade ? ['#e8ffe7','#76e8af','#23a582'] : ['#fffbea','#ffe6b2','#e6a96f'];
    path(c, wash(c,-19,16,...dough), jade ? '#317665' : '#985e40', 1.7,
      [-22,6],[-22,0,-18,-7],[-19,-12,-14,-12],[-14,-17,-9,-16],[-6,-21,-2,-17],
      [3,-21,7,-16],[13,-18,15,-12],[20,-12,20,-6],[25,0,22,7],[17,19,-12,21,-22,6]);
    for (let i=-2; i<=2; i++) {
      const x=i*6, y=-15+Math.abs(i)*1.8;
      path(c,null,jade?'#4db88c':'#ce9364',1.5,[x-2,y],[x+2,y+1,x+3,y+8]);
    }
    path(c,null,'#fffee0',2.2,[-17,-4],[-15,-9,-12,-9]);
    path(c,null,jade?'#a4fbd1':'#ffe8c2',1.8,[-16,10],[-3,18,12,12]);
  }

  function chicken(c) {
    path(c,'#fff1ce','#935f40',1.5,[7,3],[15,10],[21,11,20,15],
      [24,17,20,21],[16,25,14,19],[9,15],[3,11]);
    path(c,wash(c,-20,16,'#ffe789','#f9af32','#bd571f'),'#8c461f',1.8,
      [-20,-4],[-22,-11,-17,-13],[-14,-20,-7,-18],[-1,-23,5,-17],
      [13,-18,14,-10],[20,-6,15,1],[16,9,7,11],[1,18,-6,14],
      [-14,18,-17,10],[-24,6,-20,-4]);
    for (const [x,y] of [[-14,-8],[-6,-13],[4,-12],[10,-5],[-13,6],[3,9]]) {
      path(c,null,'#c67426',2.5,[x-1,y+2],[x,y-1,x+3,y]);
      path(c,null,'#ffdf78',1.4,[x-2,y],[x,y-3,x+2,y-2]);
    }
  }

  function egg(c) {
    path(c,wash(c,-22,20,'#f2c692','#a76436'),'#874a2e',1.7,
      [0,-22],[12,-23,22,-3,20,7],[19,24,-11,26,-18,13],[-25,1,-12,-21,0,-22]);
    path(c,wash(c,-20,17,'#fffbe7','#ffedcd','#eac38f'),null,0,
      [0,-20],[11,-21,20,-3,18,6],[16,20,-10,22,-17,11],[-22,0,-10,-20,0,-20]);
    oval(c,1,4,12,11,wash(c,-7,15,'#ffc33a','#ff9427','#f2761c'),'#e49732',1,-.2);
    path(c,null,'#ffe480',2.6,[-7,0],[-4,-5,1,-5]);
  }

  function noodle(c) {
    oval(c,0,5,20,12,'#dc8733','#995323',1.4);
    for (let i=0; i<6; i++) {
      const y=-14+i*4.8, inset=Math.abs(i-2)*1.25;
      const strand=[[-20+inset,y+4],[-14,y-8,-6,y+8,1,y+1],[9,y-6,14,y+7,20-inset,y]];
      path(c,null,'#b56c29',5.2,...strand);
      path(c,null,i%2?'#ffc84d':'#ffe37a',3.5,...strand);
    }
    path(c,null,'#cc842a',4,[14,9],[9,19,23,12,21,19],[20,23,15,20]);
    path(c,null,'#ffdf68',2.4,[14,9],[9,19,23,12,21,19],[20,23,15,20]);
  }

  function cilantro(c) {
    for (const angle of [-.96,.85,-.12]) {
      c.save(); c.translate(0,10); c.rotate(angle);
      path(c,wash(c,-31,3,'#b5ed66','#4bbd67','#188458'),'#27794a',1.2,
        [0,2],[-9,-3,-10,-11],[-6,-10],[-14,-22,-8,-20],[-6,-18],
        [-9,-30,-3,-26],[0,-34,3,-27],[8,-31,7,-20],[13,-23,10,-15],
        [7,-10],[11,-12],[8,-3,0,2]);
      path(c,null,'#d3f099',1.2,[0,3],[1,-10,0,-23]);
      path(c,null,'#a9e482',.9,[0,-9],[-5,-16]);
      c.restore();
    }
    path(c,null,'#267b49',4,[0,6],[2,15,-4,20]);
    path(c,null,'#a9dc73',1.6,[0,8],[1,16,-4,20]);
  }

  function octopus(c) {
    oval(c,0,1,21,19,wash(c,-18,21,'#ffde89','#eea74d','#b75c32'),'#90502b',1.6,-.15);
    path(c,'#95432e',null,0,[-19,-6],[-16,-19,3,-24,15,-12],[23,-6,15,-2],
      [10,3,6,-5],[0,-9,-4,-5],[-9,0,-13,-5],[-15,-8,-19,-6]);
    for (const x of [-13,-5,3]) {
      path(c,null,'#ffe9a1',2.2,[x,-12],[x+5,-17,x+11,-10]);
    }
    for (const [x,y] of [[-7,-15],[4,-11],[13,-7],[-13,-7],[8,-16]]) {
      path(c,null,'#507448',2,[x,y],[x+2,y-1]);
    }
  }

  function chili(c) {
    path(c,wash(c,-16,16,'#ff9859','#f84632','#b62732'),'#973032',1.6,
      [-22,9],[-9,12,-8,-2,-1,-10],[4,-18,15,-18,18,-8],
      [22,6,3,18,-10,15],[-19,14,-22,9]);
    path(c,'#58a754','#39783e',1.2,[2,-13],[5,-17,12,-16],[14,-23,20,-21],
      [16,-19,16,-14],[22,-14,21,-9],[16,-11,15,-5],[13,-11,8,-8],[8,-13,2,-13]);
    path(c,null,'#ffbd83',2,[-11,9],[-3,6,-4,-1,2,-5]);
  }

  function boba(c) {
    path(c,'#ffd696','#935338',1.4,[3,-12],[8,-26],[13,-24],[8,-10]);
    path(c,wash(c,-13,18,'#f5ca86','#d99a59','#a35e3c'),'#784936',1.6,
      [-17,-12],[17,-12],[14,15],[13,21,-12,21,-14,15]);
    for (const [x,y,r] of [[-8,12,4.2],[1,14,4], [9,10,3.7],[-3,7,3.2]]) {
      oval(c,x,y,r,r,wash(c,y-r,y+r,'#995b3a','#42251f'));
      oval(c,x-1,y-1.5,1.2,.7,'#e6aa74');
    }
    oval(c,0,-12,18,5,'#ffebc2','#8e5e43',1.4);
    oval(c,0,-12,14,2.7,'#d69e69');
    path(c,null,'#fff1cc',2.2,[-13,-6],[-12,4]);
  }

  function fireWings(c) {
    path(c,wash(c,-24,16,'#ffe264','#ff8035','#be3328'),'#9a4229',1.6,
      [-19,11],[-25,2,-17,-12],[-15,-5,-12,-7],[-10,-13,-7,-22],
      [-3,-15,-2,-10],[5,-14,7,-25],[14,-17,11,-8],[18,-12,22,-16],
      [23,-2,14,1],[17,0,21,-2],[15,13,3,13],[-8,22,-19,11]);
    for (let i=0;i<3;i++) {
      path(c,null,'#ffbb59',2.4,[-13+i*5,6+i],[-6+i*5,4+i,2+i*5,-4+i]);
    }
  }

  function crown(c,t) {
    c.save(); c.translate(1,-21); c.rotate(-.13);
    path(c,wash(c,-11,0,'#fff5a5','#ffc036'),'#a46726',1.1,
      [-8,-2],[-10,-9],[-4,-6],[0,-12],[4,-6],[10,-10],[8,-2]);
    oval(c,0,-5,1.4,1.6,'#ff7061');
    c.restore();
    for (let i=0;i<3;i++) {
      const a=t*.8+i*TAU/3;
      star(c,Math.cos(a)*24,Math.sin(a)*20,2.2+1.4*Math.sin(t*4+i),'#ffeb8a');
    }
  }

  const foods = {
    dumpling: c => dumpling(c,false), chicken, egg, noodle, cilantro, octopus, chili, boba,
    jade_dumpling: c => dumpling(c,true), fire_wings: fireWings,
    golden_egg_noodle(c) {
      noodle(c); c.save(); c.translate(1,-3); c.rotate(.25); c.scale(.62,.64); egg(c); c.restore();
    }
  };


  function face(c, mood, blink, foodId) {
    c.save();
    const isTea = foodId === 'boba', isLeaf = foodId === 'cilantro';
    c.translate(foodId === 'chili' ? 4 : 0, isTea ? -3 : isLeaf ? -4 : 3);
    if (isLeaf || isTea) c.scale(.85,.85);
    for (const side of [-1,1]) {
      const x = side*5.2;
      oval(c,side*9.1,2.7,2.6,1.4,'rgba(242,111,96,.62)');
      if (blink || mood === 'smug') {
        path(c,null,INK,1.7,[x-2,-.2],[x,-2.4,x+2,-.6]);
        if (!blink && side===1) path(c,null,INK,1.1,[x-2,-4],[x+1,-6,x+3,-5]);
      } else if (mood === 'dizzy') {
        c.beginPath();
        for (let i=0;i<=20;i++) {
          const a=i*.52, r=.2+i*.11;
          const px=x+r*Math.cos(a), py=-1+r*Math.sin(a);
          if (!i) c.moveTo(px,py); else c.lineTo(px,py);
        }
        paint(c,null,INK,1);
      } else {
        if (mood === 'panic') oval(c,x,-1,3.6,4.2,'#fff9dd',INK,.85);
        oval(c,x,-.9,1.7,2.3,INK);
        oval(c,x-.55,-1.9,.65,.7,'#fff7de');
      }
    }
    if (mood === 'panic') {
      oval(c,0,3.2,1.7,2.3,INK);
      path(c,'#a7e8f4','#478ca1',.7,[12,-11],[18,-6,15,-4],[10,-2,12,-11]);
    } else if (mood === 'smug') {
      path(c,null,INK,1.4,[-2,3],[1,6,4,1]);
    } else {
      path(c,null,INK,1.35,[-2,2.8],[0,6,2.5,2.7]);
    }
    c.restore();
  }

  function sprite(c, e, t, blink = false, packed = false) {
    const draw = foods[e.foodId];
    if (e.popped || typeof draw !== 'function') return;
    const s = (e.radius || 25)/25;
    c.save();
    c.translate(e.x,e.y);
    if (e.decoy) c.globalAlpha *= .47+.14*Math.sin(t*8+e.x);
    if (!packed) {
      oval(c,1,10*s,19*s,7*s,'rgba(66,22,16,.18)');
      if (e.magnetized) {
        for (let i=0;i<2;i++) {
          const phase=(t*1.4+i*.5)%1;
          oval(c,0,1,(24+phase*13)*s,(19+phase*12)*s,null,'rgba(125,238,255,'+(.75*(1-phase))+')',1.7);
        }
      }
      if (!e.decoy) steam(c,-8*s,-18*s,t+e.x*.13,.68*s);
    }
    c.rotate(e.rotation || 0);
    c.scale((e.scaleX ?? 1)*s,(e.scaleY ?? 1)*s);
    draw(c);
    face(c,e.mood,blink,e.foodId);
    if (RARE.has(e.foodId)) crown(c,t);
    if (e.shielded) {
      const angle = t*1.7;
      oval(c,0,0,27,27,'rgba(156,236,252,.14)','#baf9ff',1.5);
      c.beginPath(); c.arc(0,0,24.5,angle,angle+.87); paint(c,null,'rgba(255,255,255,.85)',2.6);
      star(c,27*Math.cos(angle),27*Math.sin(angle),3.3,'white');
    }
    c.restore();
  }

  function grain(c,x,y,w,h) {
    for (let i=0;i<17;i++) {
      const gy=y+h*(i+.5)/17, bend=4*Math.sin(i*2.27);
      path(c,null,i%3?'rgba(116,62,28,.12)':'rgba(255,247,207,.39)',i%3?.7:1.2,
        [x,gy],[x+w*.31,gy+bend,x+w*.62,gy-bend*1.8,x+w,gy+bend]);
    }
  }

  function vessel(c, fair) {
    c.save(); c.translate(160,160);
    oval(c,1,11,137,131,'rgba(60,25,17,.12)');
    oval(c,0,7,137,131,'rgba(63,25,15,.18)');
    if (!fair) {
      for (const side of [-1,1]) {
        c.save(); c.scale(side,1);
        path(c,null,'#6a3c32',10,[126,-23],[154,-32,158,-20,155,0],[154,22,148,26,128,19]);
        path(c,null,'#d28c58',7,[126,-24],[154,-33,157,-21,154,-1],[153,21,148,24,128,18]);
        path(c,null,'#ffda9b',1.8,[135,-27],[152,-31,154,-21,153,-9]);
        c.restore();
      }
    }
    const rim = fair ? ['#fff0c9','#dba377','#ffe9bf','#bc8560'] :
      ['#ffe8a6','#ca794a','#ffda93','#945338','#e9a66b'];
    oval(c,0,0,136,136,wash(c,-137,137,...rim),fair?'#c79569':'#643d35',1.6);
    oval(c,0,0,131,131,null,fair?'#f9e1b6':'#fff0bd',1.6);
    oval(c,0,0,127,127,null,fair?'#c79a73':'#8a4733',2.5);
    const base = stops(c.createRadialGradient(-40,-45,8,0,0,125),fair?
      ['#fff3d7','#f4dbb4','#e5be92']:['#f77730','#e34420','#b52b20','#85241e']);
    oval(c,0,0,124,124,base);
    c.beginPath(); c.arc(0,0,124,0,TAU); c.clip();
    if (fair) {
      grain(c,-125,-125,250,250);
      for (let i=0;i<3;i++) oval(c,-72,53,19+i*6,2+i*2,null,'rgba(155,95,55,.13)',.8,.08);
    } else {
      // Fixed oil slicks and toasted spice flakes stay put under the moving bubbles.
      for (let i=0;i<42;i++) {
        const a=i*2.39996, d=120*Math.sqrt((i+.5)/42), x=Math.cos(a)*d, y=Math.sin(a)*d;
        oval(c,x,y,5+(i%5)*2,2+i%3,'rgba(255,178,46,.26)',null,0,a);
        if (i%2===0) path(c,null,i%4?'#843b21':'#ffcf79',1.5,[x-2,y+4],[x+1,y+3]);
      }
      for (const [x,y] of [[-82,37],[59,-81],[77,60]]) {
        for (let i=0;i<6;i++) {
          const a=i*TAU/6;
          oval(c,x+Math.cos(a)*3.2,y+Math.sin(a)*3.2,3.8,1.5,'#813821',null,0,a);
        }
        oval(c,x,y,1.7,1.7,'#cc7b36');
      }
    }
    c.restore();
  }

  function soup(c,t) {
    for (let i=0;i<20;i++) {
      const phase=(t*(.46+(i%3)*.08)+i*.384)%1;
      const a=i*2.39996, d=29+Math.sqrt((i+.5)/20)*87;
      const x=160+Math.cos(a)*d, y=160+Math.sin(a)*d, r=1+phase*(3+i%4);
      c.save(); c.globalAlpha *= Math.sin(phase*Math.PI)*.76;
      oval(c,x,y,r,r*.7,'rgba(255,177,60,.36)','#ffac57',1);
      oval(c,x-r*.3,y-r*.32,r*.32,.7,'#fff3a3');
      c.restore();
    }
    for (let i=0;i<4;i++) steam(c,80+i*47,96+Math.sin(i*3)*19,t+i*.42,1.2);
  }

  function score(c, world) {
    const target = world.duelTargetScore || 3;
    for (const [key,y,tint] of [['p2',13,'#5569b7'],['p1',307,'#d94c37']]) {
      const total = world.duelScores?.[key] || 0;
      const half = target*4.5+6;
      path(c,'#fff0d0','#78493b',1.25,[160-half,y-3],[160+half,y-3],
        [160+half-4,y+8,160,y+8],[160-half+4,y+8,160-half,y-3]);
      oval(c,160,y-3,half,3.2,'#d6b08f','#78493b',1);
      for (let i=0;i<target;i++) oval(c,160+(i-(target-1)/2)*9,y-3,3.2,3.2,
        i<total?tint:'#fbe7c7',i<total?'#fff5d7':'#bd957a',.8);
    }
  }

  function boundary(c) {
    c.save();
    c.setLineDash([4,5]);
    const g=stops(c.createLinearGradient(38,0,282,0),['#a4d6fa','#f8ebcd','#ffb6a7']);
    c.globalAlpha*=.66;
    path(c,null,g,1.55,[37,160],[283,160]);
    c.restore();
  }

  function sticks(c, hand, side, ghost, t) {
    if (!hand) return;
    const x=hand.x, y=hand.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const stolen=hand.state==='stolen', stunned=hand.state==='stunned';
    const shake = Math.sin(t*35);
    const gap = hand.state==='pinching'?1.8:stolen?10:stunned?11+shake*2:7;
    const handleX=side===1?352:-32, handleY=side===1?339:-19;
    const length=Math.max(1,Math.hypot(handleX-x,handleY-y));
    const colors = ghost?['#fffaf2','#f7f1ff','#ffffff']:
      side===1?['#692a25','#bf4830','#ffbe79']:['#303553','#5168a0','#b0cfeb'];
    c.save();
    if (ghost) c.globalAlpha*=.35;
    c.translate(x,y); c.rotate(Math.atan2(handleY-y,handleX-x));
    for (const s of [-1,1]) {
      c.save(); c.translate(stunned?shake*1.5:0,gap*s);
      c.rotate(s*(.055+(stolen&&s===-1?shake*.13:0)));
      path(c,colors[1],colors[0],1.05,[0,-1],[length,-3.8],[length,3.8],[0,1.15],[-1.6,0,0,-1]);
      path(c,null,colors[2],1,[2,-.4],[length,-2.5]);
      if (!ghost) {
        for (const d of [42,46,49]) path(c,null,'#f4c977',1.35,[d,-1.4],[d,1.3]);
      }
      if (stolen&&s===-1) {
        c.save(); c.translate(15,-5); c.rotate(-.7); c.scale(.49,.49);
        dumpling(c,false); face(c,'smug',false,'dumpling');
        oval(c,-9,11,4,3,GLAZE,'#a36743',1); oval(c,9,10,4,3,GLAZE,'#a36743',1);
        c.restore();
      }
      c.restore();
    }
    if (stunned) for (const s of [-1,1]) {
      path(c,'#ffdc53','#985827',.8,[-7,10*s],[-1,17*s],[-4,17*s],[1,23*s],[-10,15*s],[-6,15*s]);
    }
    c.restore();
  }


  function ripple(c, r) {
    const size = Math.max(.1,r.radius ?? r.r ?? 6);
    c.save(); c.globalAlpha *= clamp(r.alpha ?? 1,0,1);
    oval(c,r.x,r.y,size,size*.84,null,r.color || '#ffe8a3',1.65);
    oval(c,r.x,r.y,size*.78,size*.64,null,'rgba(255,246,201,.58)',.75);
    c.restore();
  }

  function fleck(c,p) {
    const r = Math.max(.5,p.size ?? p.radius ?? p.r ?? 2.5);
    c.save(); c.globalAlpha *= clamp(p.alpha ?? 1,0,1);
    if (p.type==='star' || p.kind==='star') star(c,p.x,p.y,r*1.4,p.color || '#ffea85');
    else oval(c,p.x,p.y,r,r*.7,p.color || '#ffcc75',null,0,Math.atan2(p.vy || 0,p.vx || 0));
    c.restore();
  }

  function impact(c,x,y,zoom,timer) {
    c.save();
    c.globalAlpha = clamp((zoom-1)*4,0,1);
    const shade=c.createRadialGradient(160,160,90,160,160,223);
    shade.addColorStop(0,'rgba(58,22,28,0)'); shade.addColorStop(1,'rgba(58,22,28,.45)');
    c.fillStyle=shade; c.fillRect(0,0,SIZE,SIZE);
    // Start each wedge on a screen edge and taper it towards the actual point of impact.
    for (let i=0;i<40;i++) {
      const side=i%4, p=(Math.floor(i/4)+.4)*32+Math.sin(i*4)*6;
      const sx=side===0?-1:side===1?321:p, sy=side===2?-1:side===3?321:p;
      const reach=.07+.10*(1+Math.sin(i*5.3+timer*4))/2;
      path(c,i%3?'rgba(255,241,203,.69)':'rgba(85,34,31,.53)',null,0,
        [sx,sy],[sx+(x-sx)*reach,sy+(y-sy)*reach],[sx+(side>1?3:0),sy+(side<2?3:0)]);
    }
    c.restore();
  }

  function banner(c,event) {
    const label=[event.icon,event.tag].filter(Boolean).join(' ');
    if (!label) return;
    c.save(); c.font='900 15px system-ui, sans-serif'; c.textAlign='center'; c.textBaseline='middle';
    const w=Math.min(230,c.measureText(label).width+23);
    roundBox(c,(SIZE-w)/2,9,w,25,12,'#63362b');
    roundBox(c,(SIZE-w)/2,6,w,25,12,'#fff2c5','#673a30',1.7);
    c.lineWidth=2.1; c.strokeStyle='#fffbec'; c.strokeText(label,160,19,w-14);
    c.fillStyle='#572c26'; c.fillText(label,160,19,w-14);
    c.restore();
  }

  function fitCanvas(canvas, width, height) {
    const ratio = host.devicePixelRatio || 1;
    const pw=Math.max(1,Math.round(width*ratio)), ph=Math.max(1,Math.round(height*ratio));
    if (canvas.width===pw && canvas.height===ph) return;
    const oldW=canvas.width, oldH=canvas.height;
    canvas.width=pw; canvas.height=ph;
    // On a bare canvas, changing intrinsic dimensions can also change its CSS dimensions.
    if (canvas.style) {
      if (width===oldW && canvas.clientWidth===pw && pw!==width) canvas.style.width=width+'px';
      if (height===oldH && canvas.clientHeight===ph && ph!==height) canvas.style.height=height+'px';
    }
  }

  function bento(box,items,t=0) {
    if (!box) return;
    const c=box.getContext('2d');
    const w=box.clientWidth || 320, h=box.clientHeight || 88;
    fitCanvas(box,w,h);
    c.save(); c.setTransform(box.width/w,0,0,box.height/h,0,0);
    c.clearRect(0,0,w,h); c.lineCap=c.lineJoin='round';
    roundBox(c,1,2,w-2,h-3,13,wash(c,0,h,'#edbf88','#bd7853','#985735'),'#875339',1.6);
    c.save(); c.clip(); grain(c,0,0,w,h); c.restore();
    const ids=(items || []).map(item=>typeof item==='string'?item:item.foodId || item.id).filter(id=>Object.hasOwn(foods,id));
    const n=Math.max(ids.length,3);
    // Maximise the smaller cell dimension, so a full collection still fits short, wide boxes.
    let cols=1, best=0;
    for (let i=1;i<=n;i++) {
      const size=Math.min((w-10)/i,(h-10)/Math.ceil(n/i));
      if (size>best) {best=size; cols=i;}
    }
    const rows=Math.ceil(n/cols), cw=(w-10)/cols, ch=(h-10)/rows;
    for (let i=0;i<rows*cols;i++) {
      const x=5+i%cols*cw, y=5+Math.floor(i/cols)*ch;
      roundBox(c,x+1,y+1,cw-2,ch-2,7,wash(c,y,y+ch,'#c39164','#f2d5a6','#f7dfb5'),'#b78152',1);
      if (!ids[i]) continue;
      const phase=t*2.7+i*2.1, wave=Math.sin(phase);
      const unit=Math.min(cw-5,ch-5)/76;
      const cx=x+cw/2, cy=y+ch*.54;
      oval(c,cx,cy+17*unit,15*unit,3*unit,'rgba(127,72,39,.20)');
      c.save(); c.translate(cx,cy); c.scale(unit,unit);
      sprite(c,{foodId:ids[i],x:0,y:-2-wave*2.5,rotation:Math.sin(phase*.85)*.065,
        scaleX:1-wave*.04,scaleY:1+wave*.055,mood:'normal'},t+i,(t+i*.42)%3.1<.14,true);
      c.restore();
    }
    c.restore();
  }

  // [waveform, start Hz, end Hz, duration, start delay, gain]
  const sounds={
    bloop:[['sine',340,910,.10,0,.19],['sine',850,540,.065,.07,.08]],
    clack:[['triangle',1730,590,.042,0,.24],['square',2450,860,.022,.012,.035]],
    boing:[['triangle',440,115,.11,0,.18],['sine',120,440,.17,.09,.17]],
    steal:[['triangle',260,690,.12,0,.16],['sine',590,1190,.13,.09,.13]],
    boom:[['sawtooth',180,30,.18,0,.14],['sine',124,35,.25,0,.26]],
    win:[['sine',660,668,.14,0,.18],['sine',831,842,.15,.085,.17],['sine',990,1008,.22,.17,.18]],
    fusion:[['sine',523,536,.18,0,.16],['triangle',659,680,.18,.06,.14],['sine',784,810,.19,.12,.17],
      ['sine',1047,1070,.23,.18,.14],['sine',1568,1590,.25,.24,.09]]
  };

  function createRenderer(canvas, opts = {}) {
    const c=canvas.getContext('2d');
    let muted=true, audio, master, cachedSkin, lastFair;
    function resize() {
      const w=canvas.clientWidth || SIZE;
      fitCanvas(canvas,w,w);
    }
    function background(fair) {
      const pixels=Math.ceil(canvas.width*1.3);
      if (!cachedSkin || cachedSkin.width!==pixels || lastFair!==fair) {
        const layer=cachedSkin || canvas.ownerDocument?.createElement('canvas') ||
          (typeof host.OffscreenCanvas==='function'?new host.OffscreenCanvas(pixels,pixels):null);
        if (!layer) {vessel(c,fair); return;}
        layer.width=layer.height=pixels;
        const g=layer.getContext('2d'); g.setTransform(pixels/SIZE,0,0,pixels/SIZE,0,0);
        g.lineCap=g.lineJoin='round'; vessel(g,fair); cachedSkin=layer; lastFair=fair;
      }
      c.drawImage(cachedSkin,0,0,SIZE,SIZE);
    }

    function renderFrame(world) {
      resize();
      const t=world.time || 0, fair=world.mode==='fair', fx=world.fx || {};
      const zoom=fx.zoom>1.01?fx.zoom:1, x=fx.focusX ?? 160, y=fx.focusY ?? 160;
      c.save(); c.setTransform(canvas.width/SIZE,0,0,canvas.height/SIZE,0,0);
      c.clearRect(0,0,SIZE,SIZE); c.lineJoin=c.lineCap='round';
      c.save();
      if (zoom>1) {c.translate(x,y); c.scale(zoom,zoom); c.translate(-x,-y);}
      background(fair);
      if (!fair) soup(c,t);
      if (world.mode==='duel') boundary(c);
      for (const r of fx.ripples || []) ripple(c,r);
      for (const e of world.entities || []) sprite(c,e,t);
      if (world.ghost?.visible) sticks(c,world.ghost,-1,true,t);
      sticks(c,world.chopsticks?.p1,1,false,t);
      sticks(c,world.chopsticks?.p2,-1,false,t);
      for (const p of fx.particles || []) fleck(c,p);
      c.restore();
      if (zoom>1) impact(c,x,y,zoom,fx.hitStopTimer || 0);
      if (world.mode==='duel') score(c,world);
      if (fx.eventBanner) {
        c.save();
        if (world.mode==='duel') c.translate(0,18);
        banner(c,fx.eventBanner); c.restore();
      }
      c.restore();
    }

    function prepareAudio() {
      const Audio=host.AudioContext || host.webkitAudioContext;
      if (!Audio) return;
      if (!audio || audio.state==='closed') {
        audio=new Audio();
        master=audio.createGain(); master.gain.value=.72; master.connect(audio.destination);
      }
      if (audio.state==='suspended' || audio.state==='interrupted') audio.resume()?.catch(()=>{});
    }

    function setMuted(value) {
      muted=Boolean(value);
      try {
        if (!muted) prepareAudio();
        if (master) master.gain.setValueAtTime(muted?0:.72,audio.currentTime);
      } catch { /* The toy is fully playable in silent WebViews. */ }
    }

    function playSound(type) {
      if (muted || !Object.prototype.hasOwnProperty.call(sounds,type)) return;
      try {
        prepareAudio();
        if (!audio || !master) return;
        const now=audio.currentTime;
        for (const [wave,from,to,duration,delay,volume] of sounds[type]) {
          const start=now+delay, end=start+duration;
          const osc=audio.createOscillator(), gain=audio.createGain();
          osc.type=wave; osc.frequency.setValueAtTime(from,start); osc.frequency.exponentialRampToValueAtTime(to,end);
          gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(volume,start+.005);
          gain.gain.exponentialRampToValueAtTime(.0001,end);
          osc.connect(gain); gain.connect(master);
          osc.onended=()=>{osc.disconnect(); gain.disconnect();};
          osc.start(start); osc.stop(end+.005);
        }
      } catch { /* Some hosts disable oscillators even after a gesture. */ }
    }

    resize();
    return {renderFrame,renderBentoCanvas:bento,playSound,setMuted,isMuted:()=>muted,resize};
  }
  return {createRenderer};
});


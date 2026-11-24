/* Offline toy stage. World units are centimetres in the tabletop model. */
(() => {
  'use strict';
  const PI = Math.PI, TAU = PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const unit = v => {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x / n)
  };
  const cross =
      (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  function mul(a, b) {
    const c = Array(16);
    for (let j = 0; j < 16; j += 4)
      for (let i = 0; i < 4; i++)
        c[j + i] = a[i] * b[j] + a[4 + i] * b[j + 1] + a[8 + i] * b[j + 2] + a[12 + i] * b[j + 3];
    return c;
  }
  function transform(x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz),
          f = Math.sin(rz);
    return [
      e * c * sx, f * c * sx, -d * sx, 0, (e * d * b - f * a) * sy, (f * d * b + e * a) * sy,
      c * b * sy, 0, (e * d * a + f * b) * sz, (f * d * a - e * b) * sz, c * a * sz, 0, x, y, z, 1
    ];
  }
  function camera(yaw, pitch, aspect, zoom) {
    const z = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)],
          x = unit(cross([0, 1, 0], z)), y = cross(z, x);
    const dist = Math.max(12.1, 17 / aspect) * zoom, target = [0, 1.28, 0],
          pos = z.map((v, i) => v * dist + target[i]);
    const view = [
      x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, pos), -dot(y, pos),
      -dot(z, pos), 1
    ];
    const f = 1 / Math.tan(.248), near = .1, far = 70;
    return mul(
        [
          f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0,
          2 * far * near / (near - far), 0
        ],
        view);
  }
  function project(m, p, w, h) {
    const [x, y, z] = p, d = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [
      (1 + (m[0] * x + m[4] * y + m[8] * z + m[12]) / d) * w / 2,
      (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / d) * h / 2, d
    ];
  }
  function hitDistance(m, offset, origin, ray, kind) {
    const axis = j => [m[offset + j], m[offset + j + 1], m[offset + j + 2]], a = axis(0),
          b = axis(4), c = axis(8), t = axis(12);
    const co = [cross(b, c), cross(c, a), cross(a, b)], det = dot(a, co[0]);
    if (Math.abs(det) < 1e-9)
      return Infinity;
    const delta = origin.map((v, i) => v - t[i]), o = co.map(v => dot(v, delta) / det),
          d = co.map(v => dot(v, ray) / det);
    if (kind === 'round' || kind === 'bowl') {
      let lo = 0, hi = Infinity;
      for (let j = 0; j < 3; j++) {
        if (Math.abs(d[j]) < 1e-8) {
          if (Math.abs(o[j]) > 1)
            return Infinity;
          continue
        }
        const x = (-1 - o[j]) / d[j], y = (1 - o[j]) / d[j];
        lo = Math.max(lo, Math.min(x, y));
        hi = Math.min(hi, Math.max(x, y))
      }
      return hi >= lo ? lo : Infinity;
    }
    const A = dot(d, d), B = dot(o, d), C = dot(o, o) - 1, disc = B * B - A * C;
    return disc >= 0 && -B > 0 ? (-B - Math.sqrt(disc)) / A : Infinity;
  }
  const pow = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
  function surface(kind) {
    if (kind === 'shadow')
      return {
        vertices: new Float32Array(
            [-1, 0, -1, 0, 1, 0, 1, 0, -1, 0, 1, 0, 1, 0, 1, 0, 1, 0, -1, 0, 1, 0, 1, 0]),
        indices: new Uint16Array([0, 1, 2, 0, 2, 3])
      };
    const rows = kind === 'round' ? 14 : 18, cols = kind === 'round' ? 24 : 28, vertices = [],
          indices = [];
    function point(a, b) {
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      if (kind === 'ring')
        return [(1 + .11 * ca) * cb, .11 * sa, (1 + .11 * ca) * sb];
      if (kind === 'ear') {
        const taper = (1 - sa) * .52 + .09;
        return [ca * cb * taper, sa, ca * sb * taper]
      }
      if (kind === 'bowl') {
        const r = .76 + .25 * sa;
        return [cb * r, sa, sb * r]
      }
      const e = kind === 'round' ? .18 : 1;
      return [pow(ca, e) * pow(cb, e), pow(sa, e), pow(ca, e) * pow(sb, e)];
    }
    for (let i = 0; i <= rows; i++)
      for (let j = 0; j <= cols; j++) {
        const a = kind === 'ring' ? (i / rows - .5) * TAU : (i / rows - .5) * PI,
              b = j / cols * TAU, p = point(a, b);
        const aa = kind === 'ring' ? a : clamp(a, -PI / 2 + .002, PI / 2 - .002);
        const tangent = (da, db) =>
            point(aa + da, b + db).map((v, k) => v - point(aa - da, b - db)[k]);
        const normal = unit(cross(tangent(.001, 0), tangent(0, .001)));
        vertices.push(...p, ...normal);
        if (i < rows && j < cols) {
          const v = i * (cols + 1) + j;
          indices.push(v, v + cols + 1, v + 1, v + 1, v + cols + 1, v + cols + 2)
        }
      }
    return {vertices: new Float32Array(vertices), indices: new Uint16Array(indices)};
  }
  const shapes = ['ball', 'round', 'ear', 'bowl', 'ring', 'shadow'];
  const palette = new Map();
  function rgb(hex) {
    if (!palette.has(hex))
      palette.set(hex, [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255));
    return palette.get(hex)
  }
  const vert = `attribute vec3 p,n;
attribute vec4 m0,m1,m2,m3,paint;
uniform mat4 vp; varying vec3 norm,local,col,world; varying float style;
void main(){mat4 m=mat4(m0,m1,m2,m3);vec4 q=m*vec4(p,1.);world=q.xyz;gl_Position=vp*q;local=p;col=paint.rgb;style=paint.a;
norm=normalize(cross(m1.xyz,m2.xyz)*n.x+cross(m2.xyz,m0.xyz)*n.y+cross(m0.xyz,m1.xyz)*n.z);}`;
  const frag = `precision mediump float;
varying vec3 norm,local,col,world; varying float style;
void main(){if(style>3.5){float r=dot(local.xz,local.xz);gl_FragColor=vec4(col,.37*(1.-smoothstep(.06,1.,r)));return;}vec3 n=normalize(norm);vec3 color=col;
if(style>.5&&style<2.5){float stripe=0.;
if(style<1.5){float side=smoothstep(.56,.88,abs(local.x))*smoothstep(-.35,.15,local.y);
stripe=side*pow(.5+.5*cos(local.y*22.+local.z*5.),6.);
float bangs=smoothstep(.48,.82,local.y+abs(local.x)*.24)*smoothstep(-.03,.52,local.z);
stripe=max(stripe,bangs*pow(.5+.5*cos(local.x*18.),5.));}
else {stripe=smoothstep(.24,.86,abs(local.x)+max(0.,-local.z))*pow(.5+.5*cos(local.y*16.+local.z*3.),5.);}
color=mix(color,vec3(.67,.27,.095),stripe*.78);}
if(style>2.5&&style<3.5){float grain=sin(world.x*3.+sin(world.z*5.))*sin(world.z*19.+sin(world.x*1.5));color+=grain*.018;}
float key=max(0.,dot(n,normalize(vec3(-.5,.84,.58))));float fill=max(0.,dot(n,normalize(vec3(.86,.35,.15))));float rim=max(0.,dot(n,normalize(vec3(.18,.7,-.8))));
vec3 lit=color*(vec3(.59,.56,.52)+key*vec3(.43,.40,.35)+fill*vec3(.12,.11,.13))+vec3(.11,.085,.06)*pow(rim,3.);
lit+=.15*pow(max(0.,dot(n,normalize(vec3(-.26,.66,.69)))),25.);
gl_FragColor=vec4(lit,1.);}`;
  function renderer(canvas) {
    const gl = canvas.getContext(
        'webgl',
        {alpha: true, antialias: true, preserveDrawingBuffer: false, premultipliedAlpha: true});
    if (!gl)
      return painter(canvas);
    const ext = gl.getExtension('ANGLE_instanced_arrays');
    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(s));
      return s
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    const loc = Object.fromEntries(['p', 'n', 'm0', 'm1', 'm2', 'm3', 'paint'].map(
              k => [k, gl.getAttribLocation(prog, k)])),
          vp = gl.getUniformLocation(prog, 'vp');
    function buffer(target, data, usage) {
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, usage);
      return b
    }
    const meshes = Object.fromEntries(shapes.map(k => {
      const s = surface(k);
      return [
        k, {
          v: buffer(gl.ARRAY_BUFFER, s.vertices, gl.STATIC_DRAW),
          i: buffer(gl.ELEMENT_ARRAY_BUFFER, s.indices, gl.STATIC_DRAW),
          count: s.indices.length
        }
      ]
    }));
    const instance = gl.createBuffer(), names = ['m0', 'm1', 'm2', 'm3', 'paint'];
    return (scene, mat) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(vp, false, mat);
      for (const k of shapes) {
        const batch = scene[k];
        if (!batch.length)
          continue;
        if (k === 'shadow') {
          gl.enable(gl.BLEND);
          gl.blendFuncSeparate(
              gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false)
        }
        const mesh = meshes[k];
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.v);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.i);
        for (const [a, offset] of [[loc.p, 0], [loc.n, 12]]) {
          gl.enableVertexAttribArray(a);
          gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 24, offset)
        }
        if (ext) {
          gl.bindBuffer(gl.ARRAY_BUFFER, instance);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(batch), gl.DYNAMIC_DRAW);
          names.forEach((name, i) => {
            const a = loc[name];
            gl.enableVertexAttribArray(a);
            gl.vertexAttribPointer(a, 4, gl.FLOAT, false, 80, i * 16);
            ext.vertexAttribDivisorANGLE(a, 1)
          });
          ext.drawElementsInstancedANGLE(
              gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0, batch.length / 20);
        } else {
          for (let i = 0; i < batch.length; i += 20) {
            names.forEach(
                (name, j) => gl.vertexAttrib4fv(loc[name], batch.slice(i + j * 4, i + j * 4 + 4)));
            gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0)
          }
        }
      }
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    };
  }
  /* A projection-based painter also works on browsers with GPU contexts disabled. */
  function painter(canvas) {
    const ctx = canvas.getContext('2d');
    return (scene, mat) => {
      const w = canvas.width, h = canvas.height, parts = [];
      for (const k of shapes)
        for (let i = 0; i < scene[k].length; i += 20) {
          const s = scene[k].slice(i, i + 20), ctr = s.slice(12, 15), q = project(mat, ctr, w, h);
          const axes = [0, 4, 8].map(
              j => project(mat, ctr.map((v, n) => v + s[j + n]), w, h).map((v, n) => v - q[n]));
          parts.push({k, q, axes, c: s.slice(16, 19).map(v => Math.round(v * 255)), s});
        }
      ctx.clearRect(0, 0, w, h);
      for (const {k, q, axes, c, s} of parts.sort((a, b) => b.q[2] - a.q[2])) {
        const [x, y] = q, X = axes.reduce((v, a) => v + a[0] * a[0], 0),
                  Y = axes.reduce((v, a) => v + a[1] * a[1], 0),
                  Z = axes.reduce((v, a) => v + a[0] * a[1], 0);
        const theta = .5 * Math.atan2(2 * Z, X - Y), d = Math.hypot(X - Y, 2 * Z),
              rx = Math.sqrt(Math.max(.1, (X + Y + d) / 2)),
              ry = Math.sqrt(Math.max(.1, (X + Y - d) / 2));
        const shade = v => 'rgb(' + c.map(n => clamp(Math.round(n * v), 0, 255)).join(',') + ')';
        const grad = ctx.createLinearGradient(x - rx * .5, y - ry, x + rx * .25, y + ry);
        grad.addColorStop(0, shade(1.16));
        grad.addColorStop(.57, shade(1));
        grad.addColorStop(1, shade(.72));
        ctx.fillStyle = grad;
        if (k === 'shadow') {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(theta);
          ctx.scale(rx, ry);
          const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
          shadow.addColorStop(0, shade(.9));
          shadow.addColorStop(1, 'transparent');
          ctx.globalAlpha = .32;
          ctx.fillStyle = shadow;
          ctx.fillRect(-1, -1, 2, 2);
          ctx.restore();
          continue
        }
        if (k === 'round') {
          const points = [];
          for (const a of [-1, 1])
            for (const b of [-1, 1])
              for (const z of [-1, 1])
                points.push(project(
                    mat, [0, 1, 2].map(n => s[12 + n] + s[n] * a + s[4 + n] * b + s[8 + n] * z), w,
                    h));
          const out = [];
          points.sort((a, b) => a[0] - b[0]);
          const side = arr => {
            const line = [];
            for (const p of arr) {
              while (line.length > 1) {
                const a = line.at(-2), b = line.at(-1);
                if ((b[0] - a[0]) * (p[1] - a[1]) > (b[1] - a[1]) * (p[0] - a[0]))
                  break;
                line.pop()
              }
              line.push(p)
            }
            return line.slice(0, -1)
          };
          out.push(...side(points), ...side(points.reverse()));
          ctx.beginPath();
          out.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, theta, 0, TAU);
          if (k === 'ring') {
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(1, rx * .08);
            ctx.stroke()
          } else
            ctx.fill()
        }
      }
    };
  }
  const colors = {
    fur: '#f2a04c',
    cream: '#fff0ce',
    pink: '#f59b98',
    ink: '#403040',
    wood: '#e6c8a1',
    brass: '#c9963b',
    teal: '#63cebb',
    purple: '#a58be9',
    red: '#f17a83'
  };
  const sceneOf = () => Object.fromEntries(shapes.map(s => [s, []]));
  function model(scene, parent = identity) {
    function put(kind, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, style = 0) {
      const m = mul(parent, transform(x, y, z, sx, sy, sz, rx, ry, rz));
      scene[kind].push(...m, ...rgb(color), style)
    }
    return {
      put,
      ball: (...v) => put('ball', ...v),
      box: (...v) => put('round', ...v),
      ring: (...v) => put('ring', ...v),
      child: (...v) => model(scene, mul(parent, transform(...v))),
      link: (color, a, b, r) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz);
        put('ball', color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, r,
            l / 2 + r * .48, r, 0, 0, 0);
        const batch = scene.ball;
        const m =
            mul(parent,
                mul(transform(
                        (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1, 1, 1, 0,
                        Math.atan2(dx, dz), 0),
                    transform(0, 0, 0, r, l / 2 + r * .48, r, Math.atan2(Math.hypot(dx, dz), dy))));
        for (let i = 0; i < 16; i++)
          batch[batch.length - 20 + i] = m[i];
      }
    };
  }
  function cat(g, t, wear, tail, pawTime) {
    const {fur, cream, pink, ink} = colors;
    g.ball(fur, 0, 0, 0, .91, .88, .72, 0, 0, -.09, 2);
    g.ball(cream, 0, -.04, .6, .6, .57, .16);
    for (const sign of [-1, 1]) {
      const paw = g.child(sign * .63, -.57, .37, 1, 1, 1, -.32, 0, sign * .18);
      paw.ball(cream, 0, 0, 0, .33, .31, .38);
      paw.ball(pink, 0, -.03, .35, .14, .11, .046);
      for (let j = -1; j <= 1; j++)
        paw.ball(pink, j * .102, .105 - Math.abs(j) * .022, .325, .045, .054, .036);
      const reach = sign > 0 ? Math.sin(PI * pawTime / .55) : 0;
      const arm = g.child(sign * .88 + reach * .32, .16, .18, 1, 1, 1, 0, 0,
          sign * (-.5 + .1 * Math.sin(t * 2)) + reach * 1.4);
      arm.ball(fur, 0, 0, 0, .24, .42, .26);
      arm.ball(cream, 0, -.24, .02, .22, .2, .24);
    }
    let p = [.66, -.23, -.45];
    for (let j = 0; j < 5; j++) {
      const phase = tail[j], next = [
        p[0] + .28 - j * .043, p[1] + .1 + j * .043 + Math.sin(phase) * .09,
        p[2] - .12 + Math.cos(phase) * .15
      ];
      g.link(j === 4 ? cream : j % 2 ? '#c87538' : fur, p, next, .215 - j * .018);
      p = next;
    }
    const h = g.child(0, .99, .03, 1, 1, 1, -.04, .035 * Math.sin(t), .035 * Math.sin(t * .9));
    for (const s of [-1, 1]) {
      h.put('ear', fur, s * .73, .64, -.05, .52, .54, .41, 0, 0, -s * .34);
      h.put('ear', pink, s * .75, .69, .145, .29, .35, .21, 0, 0, -s * .34);
    }
    h.ball(fur, 0, 0, 0, 1.08, .84, .81, 0, 0, 0, 1);
    h.ball(cream, -.29, -.25, .65, .46, .33, .19);
    h.ball(cream, .29, -.25, .65, .46, .33, .19);
    for (const s of [-1, 1]) {
      h.ball(ink, s * .425, .09, .725, .112, .134, .068);
      h.ball('#fffdf2', s * .425 - .027, .129, .785, .033, .037, .021);
      h.ball('#d47c47', s * .46, .31, .65, .135, .034, .035, 0, 0, s * .18);
      h.ball('#f2aa91', s * .64, -.18, .612, .147, .074, .045, 0, s * .3, 0);
      for (let j = 0; j < 2; j++)
        h.link(
            '#956947', [s * .65, -.19 - j * .09, .6], [s * (1.05 + j * .02), -.14 - j * .17, .55],
            .016);
      h.link(ink, [0, -.24, .855], [s * .1, -.31, .836], .018);
    }
    h.ball('#b76d69', 0, -.16, .857, .114, .065, .056);
    if (wear === 'glasses') {
      for (const s of [-1, 1]) {
        h.box('#302738', s * .43, .075, .79, .335, .205, .067, 0, s * .16, 0);
        h.link('#97b7ca', [s * .43 - .09, .19, .86], [s * .43 - .19, .065, .86], .022)
      }
      h.link(ink, [-.18, .13, .84], [.18, .13, .84], .036);
    } else if (wear === 'apple') {
      const hat = h.child(.04, .89, -.02, .48, .48, .48, 0, 0, -.12);
      apple(hat)
    } else if (wear === 'bow') {
      const stretch = .035 * Math.sin(t * 10);
      for (let j = 0; j < 4; j++)
        g.ring('#c89b61', 0, .48, .66 + j * (.04 + stretch * .15), .085, .045, .085, PI / 2);
      g.ball('#7c58ac', 0, .48, .81 + stretch, .14, .13, .12);
      for (const s of [-1, 1])
        g.ball('#ae81dc', s * .23, .48, .8 + stretch, .24, .16, .095, 0, 0, s * .3)
    } else if (wear === 'wig') {
      for (let j = 0; j < 11; j++) {
        const a = j / 10 * PI;
        h.ball('#f6efde', Math.cos(a) * .99, Math.sin(a) * .73 + .14, .33, .24, .25, .24)
      }
      for (const s of [-1, 1])
        for (let j = 0; j < 3; j++)
          h.ball('#e7dbc6', s * .94, .12 - j * .22, .2, .23, .19, .25)
    }
  }
  function apple(g) {
    for (const s of [-1, 1])
      g.ball('#b3df53', s * .095, 0, 0, .34, .4, .34, 0, 0, s * .12);
    g.link('#795239', [0, .28, 0], [.07, .57, 0], .05);
    g.ball('#53a56f', .18, .42, .01, .16, .06, .08, 0, 0, .42);
    g.ball('#e9ffa8', -.18, .16, .29, .072, .094, .026);
  }
  function piano(g, t, playing = 0) {
    const lid = '#ae8bcc';
    g.box('#9c7ac1', 0, .02, 0, .72, .17, .5);
    g.ball('#ad8aca', -.24, 0, -.34, .48, .18, .45);
    for (const x of [-.46, .46])
      for (const z of [-.25, .24])
        g.link('#9773b0', [x, -.12, z], [x * .92, -.58, z], .062);
    g.box(lid, 0, .47, -.19, .7, .06, .48, -.38);
    g.link('#deba78', [.49, .12, .19], [.49, .48, .2], .032);
    for (let i = 0; i < 9; i++)
      g.box(
          '#fff5df', (i - 4) * .14, .17 + playing * Math.max(0, Math.sin(t * 9 + i)) * .09, .39,
          .063, .035, .19);
    for (const i of [1, 2, 4, 5, 6, 8])
      g.box('#50415f', (i - 4.5) * .14, .22, .32, .041, .04, .1);
    g.link('#c5974f', [-.7, 0, 0], [-.94, 0, 0], .048);
    g.ball('#ecc677', -.95, 0, 0, .061, .19, .084, t);
  }
  function bowl(g, t, stretch = 0) {
    g.put('bowl', '#efddbc', 0, 0, 0, .72, .31, .72);
    g.ring('#cd7871', 0, .3, 0, .697, .34, .697);
    g.ball('#cc8846', 0, .29, 0, .68, .06, .68);
    g.ring('#efba66', 0, .35, 0, .51 + .02 * Math.sin(t * 2), .12, .51);
    for (let j = 0; j < 7; j++) {
      let p;
      for (let k = 0; k < 5; k++) {
        const a = j * .82 + k * .52, q = [
          Math.cos(a) * (.28 + j * .024),
          .35 + (.14 + stretch * .48) * Math.sin(k * .72 + j + t * 2), Math.sin(a) * .51
        ];
        if (p)
          g.link('#ffe2a0', p, q, .036);
        p = q
      }
    }
    for (const s of [-1, 1]) {
      g.box('#a75439', s * .22, .38, -.17, .11, .06, .115, 0, .3);
      g.link('#8a674b', [s * .09, .3, -.26], [.35 + s * .12, .98, -.57], .026)
    }
    for (let i = 0; i < 5; i++)
      g.ball('#fff3d9', Math.cos(i * 1.3) * .65, -.02, Math.sin(i * 1.3) * .65, .13, .1, .13);
  }
  function tower(g, t, scatter = 0) {
    const c = ['#b095d0', '#7fbcd6', '#69cdb7', '#f4c566', '#ef9970'];
    for (let i = 0; i < 5; i++)
      g.box(
          c[i], .03 * Math.sin(i + t) + Math.sin(i * 2 + t * 3) * scatter * i * .13,
          i * .24 - .49 + scatter * i * .19, Math.cos(i + t) * scatter * .24, .52 - i * .045, .116,
          .36 - i * .025, scatter * .2, (i % 2) * .24 + scatter * i, scatter * Math.sin(i));
    g.ball('#ec8996', .02 + scatter * .5, .68 + scatter * 1.2, 0, .19, .2, .19);
  }
  function coffee(g) {
    g.put('bowl', '#81462f', 0, -.03, 0, .52, .56, .52);
    g.put('bowl', '#e4bd87', 0, -.08, 0, .52, .25, .52);
    g.ball('#562f25', 0, .52, 0, .51, .05, .51);
    for (const [x, z] of [[-.23, .14], [.14, .22], [.05, -.23]])
      g.box('#eddfbf', x, .55, z, .115, .08, .1, .16, x * 3);
    g.ring('#fff6e4', 0, .56, 0, .52, .42, .52);
    g.link('#a9d994', [.18, .52, .04], [.36, 1.07, .04], .044);
    g.ball('#784c35', 0, -.07, .41, .11, .14, .035, 0, 0, -.3);
  }
  function phone(g) {
    g.box('#3f464c', 0, 0, 0, .48, .76, .14);
    g.box('#73c8b9', 0, .01, .14, .42, .68, .043);
    for (const x of [-.41, .41])
      for (const y of [-.66, .66])
        g.box('#454051', x, y, 0, .11, .14, .17);
    g.box('#42756f', -.19, .43, .2, .18, .2, .05);
    for (const [x, y] of [[-.26, .51], [-.12, .36]]) {
      g.ball('#283538', x, y, .26, .088, .088, .036);
      g.ball('#c2efde', x - .023, y + .027, .292, .023, .023, .009);
    }
    g.ring('#c6e8d6', 0, -.15, .193, .2, .19, .2, PI / 2);
  }
  function tin(g, t, open = false) {
    g.put('bowl', '#bac5c2', 0, 0, 0, .57, .37, .57);
    g.put('bowl', '#ea9471', 0, -.01, 0, .57, .27, .57);
    g.ball('#ebe0bf', 0, .37, 0, .57, .045, .57);
    g.ring('#949d97', 0, .395, 0, .51, .22, .51);
    g.ring('#9b8d73', .05, open ? .57 : .48, .04, .13, .19, .2, open ? -1.15 : -.32);
    g.ball('#ffdfaa', -.04, 0, .46, .2, .1, .04);
    g.put('ear', '#ffdfaa', .18, .02, .43, .14, .13, .09, 0, 0, -PI / 2);
  }
  function suitcase(g) {
    for (const x of [-.36, .36]) {
      g.ball('#413d49', x, -.63, .06, .12, .14, .14);
      g.link('#a39a87', [x * .6, .48, 0], [x * .6, 1.03, 0], .038);
    }
    g.box('#554557', 0, 1.03, 0, .28, .06, .08);
    g.box('#79618c', 0, 0, 0, .65, .59, .31);
    g.box('#e7b85d', -.25, .58, .16, .17, .105, .09, 0, 0, .26);
    g.box('#70bdaf', .14, .59, .14, .13, .12, .09, 0, 0, -.18);
    g.ball('#b9a1d5', 0, .02, .22, .64, .61, .31);
    for (const x of [-.34, -.16, .02, .2, .38])
      g.ball('#9b82b7', x, .02, .45 - x*x*.63, .03, .47, .055);
    g.box('#f0be60', -.23, .21, .49, .16, .1, .037, 0, 0, -.34);
    g.ball('#77cfb8', .23, -.19, .48, .13, .12, .035);
  }
  const products = {
    coffee: {name: '冰美式', icon: '☕', radius: .55, floor: .65, mass: .85, draw: coffee,
      hit: '飞杯反杀!', formula: '杯盖锁紧 × 凌空回弹 = 护住最后一口', offer: '冰美式续杯券'},
    phone: {name: '防摔手机壳', icon: '📱', radius: .69, floor: .85, mass: 3.2, draw: phone,
      hit: '手机零伤桌先塌!', formula: '气囊护角 × 千斤落地 = 桌震机无伤', offer: '同款防摔壳券'},
    tin: {name: '引力猫罐头', icon: '🥫', radius: .55, floor: .46, mass: 1.3, draw: tin,
      hit: '罐头黑洞!', formula: '拉环开启 × 全桌吸附 = 胖橘先到', offer: '猫罐头试吃券'},
    case: {name: '爆满登机箱', icon: '🧳', radius: .68, floor: .83, mass: 1.8, draw: suitcase,
      hit: '河豚压箱!', formula: '鼓包箱壳 × 果冻压缩 = 合盖只差一毫米', offer: '同款登机箱券'}
  };
  const sceneProps = ['coffee', 'phone', 'case', 'tin'];
  function tray(g) {
    g.put('shadow', '#8a684a', .16, -.66, .09, 4.5, .01, 2.47, 0, 0, 0, 4);
    g.box('#ad947a', 0, -.42, 0, 3.95, .17, 2.05, 0, 0, 0, 3);
    g.box('#dfb888', 0, -.22, 0, 4.06, .22, 2.15, 0, 0, 0, 3);
    g.box('#f0d6ad', 0, -.075, 0, 3.99, .14, 2.08, 0, 0, 0, 3);
    for (const s of [-1, 1]) {
      g.box('#ebcda4', 0, .072, s * 1.96, 3.83, .07, .091);
      g.box('#ebcda4', s * 3.88, .07, 0, .08, .07, 1.86);
    }
    for (let i = -14; i <= 14; i++)
      g.box('#ad8b66', i * .25, .148, 1.965, .012, .008, i % 5 === 0 ? .075 : .04);
    for (const x of [-3.7, 3.7])
      for (const z of [-1.85, 1.85])
        g.ball('#bf9a62', x, .14, z, .055, .022, .055);
    g.box('#be9862', 0, -.203, 2.12, .58, .075, .026);
    for (const s of [-1, 1])
      g.ball('#765f47', s * .5, -.2, 2.149, .02, .02, .015);
  }

  class Synth {
    constructor() {
      this.enabled = false
    }
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC)
          return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = .27;
        this.master.connect(this.ctx.destination);
        this.stream = this.ctx.createMediaStreamDestination();
        this.master.connect(this.stream);
      }
      if (this.ctx.state === 'suspended')
        this.ctx.resume().catch(() => {});
    }
    tone(hz, end, length, type = 'sine', delay = 0, gain = .43) {
      if (!this.enabled || !this.ctx)
        return;
      const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), e = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(hz, t);
      o.frequency.exponentialRampToValueAtTime(end, t + length);
      e.gain.setValueAtTime(.001, t);
      e.gain.exponentialRampToValueAtTime(gain, t + .012);
      e.gain.exponentialRampToValueAtTime(.001, t + length);
      o.connect(e);
      e.connect(this.master);
      o.start(t);
      o.stop(t + length + .014);
    }
    play(kind) {
      if (!this.enabled)
        return;
      this.unlock();
      if (kind === 'wood') {
        this.tone(160, 58, .09, 'triangle');
        this.tone(520, 180, .055, 'sine', 0, .17)
      } else if (kind === 'cat') {
        this.tone(420, 760, .12, 'triangle');
        this.tone(760, 340, .26, 'triangle', .1)
      } else if (kind === 'oiia' || kind === 'win') {
        (kind === 'oiia' ? [330, 494, 659, 494, 392, 587, 784, 659] : [
          392, 494, 587, 784
        ]).forEach((n, i) => this.tone(n, n * 1.012, .15, 'triangle', i * .09))
      } else {
        this.tone(290, 61, .22, 'sine');
        this.tone(84, 238, .21, 'triangle', .16)
      }
    }
  }
  const specs = {
    cat: [-.36, 1.39, .13, .82],
    piano: [-2.53, .68, -.37, .7],
    bowl: [1.64, .48, 1.02, .61],
    tower: [2.54, .76, -.76, .57],
    apple: [-2.02, .51, 1.06, .37]
  };
  const levels = ['猫推冰美式', '手机千斤砸', '爆满硬塞箱', '引力猫罐头'];
  const cloneColor = ['#8964dc', '#f68666', '#52c7b4', '#f3c659', '#ef7e9c'];
  function noise(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296
    }
  }
  class Stage {
    constructor(canvas, overlay, hooks = {}) {
      this.canvas = canvas;
      this.overlay = overlay;
      this.ink = overlay.getContext('2d');
      this.hooks = hooks;
      this.draw = renderer(canvas);
      this.synth = new Synth();
      this.yaw = .16;
      this.pitch = .38;
      this.zoom = 1;
      this.wear = 'none';
      this.film = false;
      this.tail = [0, 0, 0, 0, 0];
      this.visible = true;
      this.t = 0;
      this.last = 0;
      this.acc = 0;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      canvas.addEventListener('webglcontextlost', e => {
        e.preventDefault();
        this.lost = true
      });
      canvas.addEventListener('webglcontextrestored', () => {
        this.draw = renderer(canvas);
        this.lost = false;
        this.render()
      });
      this.base = sceneOf();
      tray(model(this.base));
      this.reset(0);
      this.gestures();
      this.ro = new ResizeObserver(() => {
        this.resize();
        this.render()
      });
      this.ro.observe(canvas.parentElement);
      this.io = new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        this.schedule()
      });
      this.io.observe(canvas);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.raf)
            cancelAnimationFrame(this.raf);
          this.raf = 0;
          this.last = 0;
          this.synth.ctx?.suspend().catch(() => {});
          this.stopRecord()
        } else {
          if (this.synth.enabled)
            this.synth.unlock();
          this.schedule()
        }
      });
      this.resize();
      this.render();
      this.schedule();
    }
    reset(level = 0, seed = 113, prop = sceneProps[level]) {
      this.primed = false;
      this.level = clamp(level, 0, 3);
      this.seed = seed;
      this.random = noise(seed);
      this.reaction = null;
      this.elapsed = 0;
      this.started = false;
      this.won = false;
      this.atRim = false;
      this.score = 0;
      this.patches = [];
      this.rain = [];
      this.bits = [];
      this.words = [];
      this.targets = [];
      this.over = 0;
      this.pendingEffect = null;
      this.bodies = Object.entries(specs).map(([id, [x, y, z, r]]) => ({
                                                id,
                                                x,
                                                y,
                                                z,
                                                r,
                                                home: [x, y, z],
                                                vx: 0,
                                                vy: 0,
                                                vz: 0,
                                                angle: 0,
                                                spin: 0,
                                                roll: 0,
                                                squash: 0,
                                                spring: 0,
                                                touched: false
                                              }));
      this.failed = false;
      this.guarded = false;
      this.relayReady = false;
      this.chainCount = 0;
      this.contacts = new Set();
      this.flash = 0;
      this.freeze = 0;
      this.counter = null;
      this.paw = 0;
      this.attraction = 0;
      this.landed = false;
      this.relayFrame = null;
      this.clockTick = -1;
      this.installProp(prop);
      this.hooks.meter?.(0);
      this.hooks.level?.(this.level);
    }
    installProp(id) {
      this.relayFrame = null;
      const product = products[id];
      if (this.bodies) delete this.body('bowl').skin;
      if (!product) return;
      const old = this.bodies.find(b => b.id === this.prop && products[b.id]);
      const hero = old || {...this.body('apple')};
      const x = this.level === 2 ? 3.85 - product.radius - .1 : 1.05;
      Object.assign(hero, {id, x, y: product.floor, z: -.08, home: [x, product.floor, -.08],
        r: product.radius, vx: 0, vy: 0, vz: 0, spin: 0, angle: 0, roll: 0, squash: 0, spring: 0});
      if (!old) this.bodies.push(hero);
      this.prop = id;
    }
    start() {
      if (this.started || this.won || this.failed) return;
      this.started = true;
      const hero = this.body(this.prop);
      if (this.level === 0) {
        this.paw = .55;
        hero.vx = 3.5;
        hero.roll = .36;
      } else if (this.level === 1) {
        hero.y += 2.5;
        hero.vy = -2;
      } else if (this.level === 2) {
        hero.spring = 3.5;
        hero.vx = .95;
      } else {
        this.say('拉环开了!', hero);
      }
    }
    // Compact tabletop frame: pose, velocity and active force mask per rigid body.
    // Position quantum is 1/24 model unit; the signed velocity quantum is 1/8.
    captureFrame() {
      const skin = this.body('bowl').skin;
      const bytes = [Number(this.landed) + 2 * (sceneProps.indexOf(skin) + 1), Math.round(this.flash * 100),
        ['none', 'wind', 'pull', 'oil'].indexOf(this.counter?.kind || 'none'),
        Math.round((this.counter?.time || 0) * 60), Math.round(this.attraction * 60)];
      for (const b of this.bodies) {
        const active = this.patches.filter(p => p.subject === b.id || p.subject === 'all');
        const mask = ['float', 'heavy', 'jelly', 'vortex', 'slow', 'rain'].reduce((bits, id, i) =>
          bits | (active.some(p => p.forces.includes(id)) ? 1 << i : 0), 0);
        for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz'])
          bytes.push(clamp(Math.round(b[key] * (key.length === 1 ? 24 : 8)) + 128, 0, 255));
        const vortex = active.find(p => p.forces.includes('vortex'));
        bytes.push(mask, Math.max(0, this.bodies.findIndex(o => o.id === vortex?.anchor || (o.skin && o.skin === vortex?.anchor))));
      }
      return bytes;
    }
    restoreFrame(bytes) {
      this.landed = Boolean(bytes[0] & 1);
      this.body('bowl').skin = sceneProps[(bytes[0] >> 1) - 1];
      this.flash = bytes[1] / 100;
      if (bytes[2]) this.counter = {kind: ['none', 'wind', 'pull', 'oil'][bytes[2]], time: bytes[3] / 60};
      this.attraction = bytes[4] / 60;
      this.patches = [];
      this.bodies.forEach((b, i) => {
        let pos = 5 + 8 * i;
        for (const field of ['x', 'y', 'z', 'vx', 'vy', 'vz'])
          b[field] = (bytes[pos++] - 128) / (field.length === 1 ? 24 : 8);
        const forces = ['float', 'heavy', 'jelly', 'vortex', 'slow', 'rain'].filter((_, j) => (bytes[pos] >> j) & 1);
        if (forces.length) this.patches.push({subject: b.id, forces, life: .5, anchor: this.bodies[bytes[pos + 1]]?.id});
      });
    }
    critical(frame) {
      this.start();
      const hero = this.body(this.prop);
      this.elapsed = 2.5;
      this.relayReady = true;
      this.guarded = false;
      hero.x = 3.65 - hero.r;
      hero.z = .45 + (this.seed % 9) * .05;
      hero.y = hero.home[1] + (this.level === 1 ? 1.2 : .12);
      hero.vx = 1.8;
      hero.vy = -.5;
      hero.roll = .48;
      if (frame) this.restoreFrame(frame);
      this.relayFrame = this.captureFrame();
      this.render();
    }
    intervene() {
      this.start();
      this.relayReady = false;
      if (this.won || this.failed) return;
      const hero = this.body(this.prop);
      this.guarded = true;
      hero.vx = -Math.abs(hero.vx) * .55 - .55;
      hero.vz *= .3;
      if (this.level === 1 && !this.landed) hero.vy = Math.min(hero.vy, -4.2);
      hero.spring = -2.6;
    }
    applyCounter(kind) {
      this.counter = {kind, time: 2.3};
    }
    rescue() {
      if (this.failed || this.won) this.reset(this.level, this.seed, this.prop);
      this.intervene();
      for (const b of this.bodies) b.vx = b.vy = b.vz = b.spin = 0;
      this.freeze = 3.05;
      this.say('绝对静止!', this.body(this.prop));
      this.render();
    }
    impact(a, b, label) {
      this.chainCount++;
      this.flash = .35;
      b.spring = -2.4;
      this.burst(b, 8);
      this.say(label || ('连锁 ×' + this.chainCount), b);
      this.hooks.chain?.(this.chainCount, a.id, b.id);
    }
    shockwave(hero) {
      for (const b of this.bodies) {
        if (b === hero) continue;
        const dx = b.x - hero.x, dz = b.z - hero.z, d = Math.hypot(dx, dz) || 1;
        const speed = 5 / (1 + d);
        b.vx += dx / d * speed;
        b.vz += dz / d * speed;
        b.vy += speed;
        b.roll = .48;
      }
    }
    resize() {
      const {width: w, height: h} = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, w);
      this.h = Math.max(1, h);
      const dpr = clamp(devicePixelRatio || 1, 1, 2);
      for (const c of [this.canvas, this.overlay]) {
        const width = Math.round(this.w * dpr), height = Math.round(this.h * dpr);
        if (c.width !== width || c.height !== height) {
          c.width = width;
          c.height = height
        }
      }
      this.ink.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.dpr = dpr;
    }
    schedule() {
      if (this.raf || document.hidden || !this.visible && !this.film && !this.rec)
        return;
      this.raf = requestAnimationFrame(time => {
        this.raf = 0;
        this.acc += Math.min(.09, this.last ? (time - this.last) / 1000 : 0);
        this.last = time;
        while (this.acc >= 1 / 60) {
          this.step(1 / 60);
          this.acc -= 1 / 60
        }
        this.render();
        this.schedule()
      });
    }
    gestures() {
      const c = this.canvas;
      let start = null;
      c.addEventListener('pointerdown', e => {
        if (!e.isPrimary)
          return;
        start = {x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, drag: false};
        c.setPointerCapture(e.pointerId)
      });
      c.addEventListener('pointermove', e => {
        if (!start || !e.isPrimary)
          return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 5)
          start.drag = true;
        if (start.drag) {
          this.yaw = start.yaw - dx * .012;
          this.pitch = clamp(start.pitch + dy * .006, .13, 1.12);
          this.render()
        }
      });
      c.addEventListener('pointerup', e => {
        if (!start || !e.isPrimary)
          return;
        if (!start.drag) {
          const rect = c.getBoundingClientRect();
          const x = e.clientX - rect.left, y = e.clientY - rect.top;
          const hit = this.pick(x, y);
          if (hit)
            this.poke(hit);
          else
            this.say('戳一下胖橘！', this.body('cat'))
        }
        start = null
      });
      c.addEventListener('pointercancel', () => {start = null});
      c.addEventListener('keydown', e => {
        if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
          e.preventDefault();
          if (e.key.startsWith('Arrow'))
            this.yaw += e.key === 'ArrowLeft' ? -.18 : .18;
          else
            this.poke('cat');
          this.render()
        }
      });
    }
    pick(x, y) {
      const yaw = this.yaw, pitch = this.pitch,
            z = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)],
            right = unit(cross([0, 1, 0], z)), up = cross(z, right);
      const aspect = this.w / this.h, dist = Math.max(12.1, 17 / aspect) * this.zoom,
            origin = z.map((v, i) => v * dist + (i === 1 ? 1.28 : 0));
      const u = (2 * x / this.w - 1) * aspect * Math.tan(.248),
            v = (1 - 2 * y / this.h) * Math.tan(.248),
            ray = unit(z.map((n, i) => right[i] * u + up[i] * v - n));
      let distance = Infinity, hit;
      for (const part of this.pickParts || [])
        for (let i = part.start; i < part.end; i += 20) {
          const depth = hitDistance(part.buffer, i, origin, ray, part.kind);
          if (depth < distance) {
            distance = depth;
            hit = part.id
          }
        }
      return hit;
    }
    body(id) {
      return this.bodies.find(b => b.id === id || b.skin === id) || this.bodies[0]
    }
    meter(n) {
      this.score = Math.min(999, Math.round(this.score + n));
      this.hooks.meter?.(this.score)
    }
    say(text, b) {
      this.words.push({text, x: b.x, y: b.y + (b.id === 'cat' ? 1.3 : .5), z: b.z, life: 1.25});
      if (this.words.length > 4)
        this.words.shift()
    }
    burst(b, count = 18) {
      for (let i = 0; i < count; i++)
        this.bits.push({
          x: b.x,
          y: b.y + .6,
          z: b.z,
          vx: (this.random() - .5) * 4,
          vy: 1 + this.random() * 3,
          vz: (this.random() - .5) * 3,
          life: 1 + this.random() * .5,
          c: cloneColor[i % 5],
          angle: this.random() * 6
        });
      if (this.bits.length > 160)
        this.bits.splice(0, this.bits.length - 160)
    }
    poke(id, quiet = false) {
      if (this.primed) {
        this.primed = false;
        this.hooks.unprime?.()
      }
      const b = this.body(id);
      if (!quiet) this.hooks.action?.(id, this.elapsed >= 2.5 && !this.won && !this.failed);
      if (id === this.prop || id === 'cat') this.intervene();
      else this.start();
      b.touched = true;
      b.vy = this.level === 1 && id === 'cat' ? 2.3 : 4.8;
      b.vx = (this.random() - .5) * 1.9;
      b.vz = (this.random() - .5) * 1.2;
      if (this.level === 2 && id === 'cat') {
        b.vx = 4.9;
        b.vz = .22
      }
      b.spin = (this.random() > .5 ? 1 : -1) * 4;
      b.spring = -2;
      b.roll = .63;
      if (id === this.prop) {
        this.demonstrate(b);
      }
      this.meter(id === 'cat' ? 23 : 15);
      if (!quiet) {
        this.say(id === 'cat' ? '喵呜起飞!' : 'DUANG!', b);
        this.burst(b, 12);
        this.synth.play(id === 'cat' ? 'cat' : 'wood')
      }
      if (this.pendingEffect?.trigger === 'tap') {
        const p = this.pendingEffect;
        this.pendingEffect = null;
        this.activate(p)
      }
      this.render();
    }
    demonstrate(hero) {
      if (hero.id === 'coffee') {
        hero.vx = -4.4; hero.vy = 2.1;
      } else if (hero.id === 'phone') {
        hero.y = Math.max(hero.y, 2.15); hero.vy = -6;
        return; // The landing delivers the shock.
      } else if (hero.id === 'case') {
        hero.vy = 0; hero.y = hero.home[1]; hero.squash = -.32;
      } else {
        this.attraction = 2.4;
      }
      this.impact(hero, hero, products[hero.id].hit);
    }
    inject(p) {
      const patch = {...p, forces: [...p.forces]};
      if (products[p.subject] && this.prop !== p.subject) this.installProp(p.subject);
      if (products[p.anchor] && this.prop !== p.anchor) {
        if (products[p.subject]) this.body('bowl').skin = p.anchor;
        else this.installProp(p.anchor);
      }
      this.intervene();
      if (p.trigger === 'impact') {
        this.pendingEffect = patch;
        this.poke(p.subject, true);
        this.say('落地生效！', this.body(p.subject))
      } else if (p.trigger === 'tap') {
        this.pendingEffect = patch;
        this.say('下一戳生效！', this.body(p.subject))
      } else
        this.activate(patch);
      this.render();
    }
    activate(p) {
      if (p.domino) {
        const hero = this.body(this.prop), target = this.body('cat');
        const dir = unit([target.x - hero.x, target.y - hero.y, target.z - hero.z]);
        [hero.vx, hero.vy, hero.vz] = dir.map(n => n * 7);
      }
      this.patches.push({...p, life: 5});
      if (this.patches.length > 5)
        this.patches.shift();
      const b = this.body(p.subject);
      b.touched = true;
      b.vy = Math.max(b.vy, 2.4);
      b.spring = -2.5;
      b.spin += 1.7;
      const paired = Number.isInteger(p.reaction);
      this.meter(paired ? 100 : 36);
      this.burst(b, paired ? 38 : 14);
      this.synth.play(paired ? 'win' : 'jelly');
      if (p.forces.includes('rain'))
        for (let i = 0; i < (p.count || 6); i++)
          this.rain.push({
            x: (this.random() - .5) * 6,
            y: 3 + this.random() * 3,
            z: (this.random() - .5) * 2.5,
            vy: 0,
            life: 4,
            subject: p.subject
          });
      if (this.rain.length > 24)
        this.rain.splice(0, this.rain.length - 24);
      if (paired)
        this.react(p.reaction, b);
      this.say(p.caption || 'DUANG!', b);
    }
    react(id, b) {
      this.reaction = {id, age: 0};
      const cat = this.body('cat'), bowl = this.body('bowl'), fruit = this.body('apple');
      if (id === 0) {
        fruit.x = cat.x;
        fruit.z = cat.z;
        fruit.y = cat.y + 1.7;
        fruit.vy = -3;
        cat.spring = -3
      }
      if (id === 1) {
        cat.vx = (bowl.x - cat.x) * 1.5;
        cat.vz = (bowl.z - cat.z) * 1.5;
        cat.spin = 4
      }
      if (id === 2) {
        b.vy = 5.5;
        b.spin = 5
      }
      if (id === 3) {
        cat.vx = (b.x - cat.x) * 2;
        cat.vz = (b.z - cat.z) * 2;
        cat.vy = 3;
        b.spin = -4
      }
      if (id === 4) {
        cat.vx = 3;
        cat.roll = .35;
        cat.vy = 2
      }
      if (id === 5) {
        this.patches.push({subject: 'cat', forces: ['vortex', 'slow'], anchor: 'bowl', life: 5});
        cat.vy = 2
      }
      if (id === 8) {
        b.vy = 6;
        b.vx = 2;
        b.roll = .5
      }
      if (id === 9) {
        b.spin = 8;
        b.vy = 4
      }
      if (id === 11) {
        b.spring = -4;
        this.synth.play('win')
      }
    }
    overload() {
      this.over = 3.1;
      this.meter(180);
      this.say('🌀 OIIA 超载!', this.body('cat'));
      this.burst(this.body('cat'), 52);
      this.synth.play('oiia');
      this.poke('cat', true)
    }
    prepare(recipe) {
      this.reset(this.level, this.seed, this.prop);
      this.started = true;
      const b = this.body(recipe.subject);
      this.activate(
          {subject: b.id, forces: [recipe.laws[0]], trigger: 'now', caption: '崩塌前 1 秒'});
      b.y += .55;
      b.spin = 1.4;
      this.primed = true;
      this.cue = recipe.name;
      this.render();
    }
    step(dt) {
      this.t += dt;
      if (this.primed || this.relayReady) {
        for (let i = 0; i < 5; i++)
          this.tail[i] += .003;
        return
      }
      if (this.reaction) {
        this.reaction.age += dt;
        if (this.reaction.age >= 4.5)
          this.reaction = null
      }
      if (this.started && !this.won && !this.failed) {
        this.elapsed += dt;
        const tick = Math.min(30, Math.floor(this.elapsed * 10 + 1e-7));
        if (tick !== this.clockTick) { this.clockTick = tick; this.hooks.clock?.(tick); }
      }
      this.paw = Math.max(0, this.paw - dt);
      this.attraction = Math.max(0, this.attraction - dt);
      if (this.counter && (this.counter.time -= dt) <= 0) {
        this.counter = null;
        this.hooks.counterEnd?.();
      }
      const slow = this.flash > 0;
      this.flash = Math.max(0, this.flash - dt);
      const frozen = this.freeze > 0;
      this.freeze = Math.max(0, this.freeze - dt);
      const physicsDt = frozen ? 0 : dt * (slow ? .33 : 1);
      const hero = this.body(this.prop);
      this.over = Math.max(0, this.over - dt);
      for (const p of this.patches)
        p.life -= dt;
      this.patches = this.patches.filter(p => p.life > 0);
      for (let i = 0; i < this.tail.length; i++) {
        const target = i ? this.tail[i - 1] : this.t * 2 + this.body('cat').spin * .3;
        this.tail[i] += (target - this.tail[i]) * (i ? .13 : .24)
      }
      for (const b of this.bodies) {
        const active = this.patches.filter(p => p.subject === b.id || p.subject === 'all'),
              forces = new Set(active.flatMap(p => p.forces)),
              h = physicsDt * (forces.has('slow') ? .34 : 1);
        const floor = b.home[1],
              gravity =
                  (this.level === 1 && b === hero ? 20 : 9.5) * (forces.has('heavy') ? 3 : 1);
        b.vy -= gravity * h;
        if (forces.has('float'))
          b.vy += (gravity + 2.6) * h;
        for (const p of active.filter(p => p.forces.includes('vortex'))) {
          const anchor = this.body(p.anchor || (b.id === 'bowl' ? 'cat' : 'bowl')),
                dx = anchor.x - b.x, dz = anchor.z - b.z;
          b.vx += (dx * 3.3 - dz * 2) * h;
          b.vz += (dz * 3.3 + dx * 2) * h;
          b.spin += 2 * h
        }
        if (b !== hero && ((this.started && this.level === 3) || this.attraction || this.counter?.kind === 'pull')) {
          const strength = 2.8 + (this.seed % 11) * .23;
          b.vx += (hero.x - b.x) * strength * h;
          b.vz += (hero.z - b.z) * strength * h;
          b.vy += (hero.y - b.y) * strength * h;
        }
        if (this.counter?.kind === 'wind') b.vx -= 6 * h;
        if (this.level === 2 && this.started && !this.guarded && b === hero)
          b.spring += 6 * h;
        b.vx += (b.home[0] - b.x) * .75 * h;
        b.vz += (b.home[2] - b.z) * .75 * h;
        b.x += b.vx * h;
        b.z += b.vz * h;
        b.y += b.vy * h;
        if (b.y > 4.4) {
          b.y = 4.4;
          b.vy = -Math.abs(b.vy) * .65
        }
        for (const [key, speed, edge] of [['x', 'vx', 3.85 - b.r], ['z', 'vz', 1.95 - b.r * .65]])
          if (Math.abs(b[key]) > edge) {
            b[key] = Math.sign(b[key]) * edge;
            b[speed] *= -.77;
            if (b.id === 'cat')
              this.atRim = true
          }
        if (this.reaction?.id === 0 && b.id === 'apple' && b.vy < 0) {
          const cat = this.body('cat');
          if (Math.hypot(b.x - cat.x, b.z - cat.z) < 1 && b.y <= cat.y + 1.35) {
            b.vy = 5.2;
            cat.spring = -3.2;
            this.burst(b, 8)
          }
        }
        if (this.reaction?.id === 5 && ['cat', 'apple'].includes(b.id)) {
          const a = this.reaction.age * 2.2 + (b.id === 'cat' ? PI : 0), o = this.body('bowl');
          b.x = o.x + Math.cos(a) * 1.25;
          b.z = o.z + Math.sin(a) * .77;
          b.y = o.y + 1.05 + .2 * Math.sin(a)
        }
        if (b.y <= floor) {
          const impact = -b.vy;
          b.y = floor;
          b.vy = impact > .72 ? impact * (forces.has('jelly') || this.level === 2 ? .87 : .44) : 0;
          if (b === hero && impact > 3 && (hero.id === 'phone' || this.level === 1)) {
            this.landed = true;
            this.shockwave(hero);
            this.impact(hero, hero, products[hero.id].hit);
          }
          if (impact > 1.4) {
            b.spring -= Math.min(3, impact * .3);
            if (impact > 2.6)
              this.synth.play(forces.has('jelly') ? 'jelly' : 'wood');
            if (this.pendingEffect?.trigger === 'impact' && this.pendingEffect.subject === b.id) {
              const patch = this.pendingEffect;
              this.pendingEffect = null;
              this.activate(patch)
            }
          }
          b.spin *= .958;
          const friction = Math.pow(this.counter?.kind === 'oil' ? .999 : .97, h * 60);
          b.vx *= friction;
          b.vz *= friction;
          b.roll *= .96;
        }
        b.angle += b.spin * h;
        if (this.over && b.id === 'cat')
          b.angle += h * 14;
        b.spring += (-65 * b.squash - 8 * b.spring) * h;
        b.squash = clamp(b.squash + b.spring * h, -.32, .29);
      }
      const touching = new Set();
      for (let i = 0; i < this.bodies.length && !frozen; i++)
        for (let j = i + 1; j < this.bodies.length; j++) {
          const a = this.bodies[i], b = this.bodies[j], dx = b.x - a.x, dy = b.y - a.y,
                dz = b.z - a.z, dist = Math.hypot(dx, dy, dz) || .01, over = a.r + b.r - dist;
          if (over <= 0)
            continue;
          const nx = dx / dist, nz = dz / dist, ny = dy / dist;
          const invMass = body =>
              ((this.level === 1 && body === hero) ||
               this.patches.some(p => p.subject === body.id && p.forces.includes('heavy'))) ?
              .15 :
              1 / (products[body.skin || body.id]?.mass || 1);
          const wa = invMass(a), wb = invMass(b), sum = wa + wb;
          const impulse =
              Math.max(0, -((b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz)) * 1.44 /
              sum;
          const pair = a.id + '/' + b.id;
          touching.add(pair);
          if (this.started && impulse > .38 && !this.contacts.has(pair)) {
            const product = products[a.skin || a.id] || products[b.skin || b.id];
            this.impact(a, b, product?.hit);
          }
          a.y = Math.max(a.home[1], a.y - ny * over * wa / sum);
          b.y = Math.max(b.home[1], b.y + ny * over * wb / sum);
          a.x -= nx * over * wa / sum;
          b.x += nx * over * wb / sum;
          a.z -= nz * over * wa / sum;
          b.z += nz * over * wb / sum;
          a.vx -= nx * impulse * wa;
          b.vx += nx * impulse * wb;
          a.vy -= ny * impulse * wa;
          b.vy += ny * impulse * wb;
          a.vz -= nz * impulse * wa;
          b.vz += nz * impulse * wb;
          const tangent = (b.vx - a.vx) * nz - (b.vz - a.vz) * nx;
          a.spin += tangent * wa * .13;
          b.spin -= tangent * wb * .13;
        }
      this.contacts = touching;
      for (const p of this.rain) {
        p.vy -= 8 * dt;
        p.y += p.vy * dt;
        if (p.y < .39) {
          p.y = .39;
          p.vy = Math.abs(p.vy) * .55
        }
        p.life -= dt
      }
      this.rain = this.rain.filter(p => p.life > 0);
      for (const p of this.bits) {
        p.vy -= 5 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.angle += dt * 4;
        p.life -= dt
      }
      this.bits = this.bits.filter(p => p.life > 0);
      for (const w of this.words) {
        w.life -= dt;
        w.y += .38 * dt
      }
      this.words = this.words.filter(w => w.life > 0);
      if (this.started && !this.relayFrame && this.elapsed + 1e-8 >= 2.5) {
        this.relayFrame = this.captureFrame();
        this.hooks.frame?.();
      }
      if (this.started && !this.won && !this.failed && this.elapsed + 1e-8 >= 3) {
        const safe = this.freeze > 0 || (this.guarded && [
          Math.abs(hero.x) < 3.65 - hero.r,
          this.landed && hero.y - hero.home[1] < .8,
          hero.y - hero.home[1] < .5 && Math.hypot(hero.vx, hero.vz) < 2,
          Math.hypot(this.body('cat').x - hero.x, this.body('cat').z - hero.z) > .42
        ][this.level]);
        if (safe) {
          this.won = true;
          this.meter(80);
          this.burst(hero, 32);
          this.say('守住了!', hero);
          this.synth.play('win');
          this.hooks.win?.(this.level);
        } else {
          this.failed = true;
          this.shockwave(hero);
          this.say(['咖啡洒了!', '桌先塌了!', '箱盖炸了!', '全屋坍缩!'][this.level], hero);
          this.hooks.loss?.(this.level);
        }
      }
    }
    specimen(id, g) {
      const rx = this.reaction?.id,
            amplitude =
                this.reaction ? Math.min(1, this.reaction.age * 5, 4.5 - this.reaction.age) : 0;
      if (id === 'cat')
        cat(g, this.t, this.wear, this.tail, this.paw);
      else if (products[id])
        products[id].draw(g, this.t, this.attraction > 0 || (this.started && this.level === 3));
      else if (id === 'piano')
        piano(g, this.t, rx === 6 || rx === 11 ? amplitude : 0);
      else if (id === 'bowl')
        bowl(g, this.t, rx === 1 || rx === 7 ? amplitude : 0);
      else if (id === 'tower')
        tower(g, this.t, rx === 3 || rx === 9 ? amplitude : 0);
      else
        apple(g);
    }
    render() {
      if (this.lost)
        return;
      const scene = Object.fromEntries(shapes.map(k => [k, this.base[k].slice()])),
            g = model(scene), m = camera(this.yaw, this.pitch, this.w / this.h, this.zoom);
      this.targets = [];
      this.pickParts = [];
      const t = this.t;
      for (const b of this.bodies) {
        const {x, y, z} = b, catToy = b.id === 'cat',
                     hover = catToy && !this.reduced ? .065 * Math.sin(t * 1.8) : 0;
        const lift = Math.max(0, y - b.home[1]),
              shadow = (catToy ? 1.04 : b.r * .91) / (1 + lift * .15);
        g.put('shadow', '#896542', x, .077, z, shadow * 1.27, .01, shadow * .89, 0, 0, 0, 4);
        const sy = 1 + b.squash, sx = 1 / Math.sqrt(sy),
              turn = b.angle +
            (catToy               ? -.03 :
                 b.id === 'piano' ? .27 :
                                    -.12);
        const group = g.child(
            x, y + hover, z, sx, sy, sx, b.roll * Math.sin(b.angle * .83), turn,
            (catToy ? -.12 : 0) + b.roll * Math.sin(b.angle));
        const starts = shapes.map(k => scene[k].length);
        this.specimen(b.skin || b.id, group);
        shapes.forEach((kind, i) => {
          if (starts[i] < scene[kind].length)
            this.pickParts.push(
                {kind, id: b.id, buffer: scene[kind], start: starts[i], end: scene[kind].length})
        });
        const p = project(m, [x, y + (catToy ? .52 : 0), z], this.w, this.h),
              scale = this.h * 1.98 / p[2];
        this.targets.push({
          id: b.id,
          x: p[0],
          y: p[1],
          rx: (catToy ? 1.15 : b.r * 1.33) * scale,
          ry: (catToy ? 1.48 : b.r * 1.32) * scale,
          depth: p[2]
        });
      }
      for (const p of this.rain) {
        const s = .28;
        const small = g.child(p.x, p.y, p.z, s, s, s, 0, p.y * .48, .12);
        if (p.subject === 'cat') {
          small.ball(colors.fur, 0, 0, 0, .75, .62, .58, 0, 0, 0, 1);
          for (const sign of [-1, 1]) {
            small.put('ear', colors.fur, sign * .48, .5, 0, .33, .33, .3);
            small.ball(colors.ink, sign * .28, .09, .53, .067, .07, .043)
          }
          small.ball(colors.cream, 0, -.14, .52, .32, .18, .078)
        } else
          this.specimen(p.subject, small);
      }
      this.draw(scene, m);
      const ctx = this.ink;
      ctx.clearRect(0, 0, this.w, this.h);
      if (this.flash > 0) {
        const hero = this.targets.find(p => p.id === this.prop);
        ctx.save();
        ctx.strokeStyle = '#d79e38';
        ctx.globalAlpha = this.flash / .35 * .8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(hero.x, hero.y, hero.rx * (2 - this.flash), hero.ry * (1.5 - this.flash),
            -.25, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      // Small orbit traces and glints are projected from stage space.
      const star = (x, y, r, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x + r * .12, y - r * .1, x + r, y);
        ctx.quadraticCurveTo(x + r * .15, y + r * .1, x, y + r);
        ctx.quadraticCurveTo(x - r * .15, y + r * .1, x - r, y);
        ctx.quadraticCurveTo(x - r * .12, y - r * .1, x, y - r);
        ctx.fill()
      };
      for (const [x, y, z, r, c] of [
               [-1.66, 2.55, 0, 8, '#9680bd'], [1.5, 2.85, -.2, 6, '#c49a52'],
               [2.02, 2.5, -.3, 3, '#ad98c8'], [-2.9, 1.84, 0, 4, '#b19abf']]) {
        const q = project(m, [x, y, z], this.w, this.h);
        star(q[0], q[1], r * (this.reduced ? 1 : .84 + .16 * Math.sin(t * 2 + x)), c)
      }
      if (this.primed || this.relayReady) {
        ctx.fillStyle = '#604881';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(this.relayReady ? 'T −0.50s  ·  点按拆弹' : 'T −1.00s  ·  ' + this.cue, this.w * .5, 23);
        ctx.textAlign = 'left'
      }
      if (this.over) {
        const p = this.targets[0];
        ctx.save();
        ctx.globalAlpha = .48;
        for (let j = 0; j < 7; j++) {
          ctx.strokeStyle = cloneColor[j % 5];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(t * 5 + j) * this.w, p.y + Math.sin(t * 5 + j) * this.h);
          ctx.stroke()
        }
        ctx.restore()
      }
      for (const p of this.bits) {
        const q = project(m, [p.x, p.y, p.z], this.w, this.h);
        ctx.save();
        ctx.translate(q[0], q[1]);
        ctx.rotate(p.angle);
        ctx.globalAlpha = Math.min(1, p.life * 3);
        ctx.fillStyle = p.c;
        ctx.fillRect(-2, -3, 4, 7);
        ctx.restore()
      }
      for (const w of this.words) {
        const q = project(m, [w.x, w.y, w.z], this.w, this.h);
        ctx.save();
        ctx.translate(clamp(q[0], 65, this.w - 65), clamp(q[1], 35, this.h - 30));
        ctx.rotate(-.09);
        ctx.globalAlpha = Math.min(1, w.life * 3);
        ctx.font = '900 ' + Math.round(clamp(this.w / 33, 16, 31)) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#514260';
        ctx.strokeText(w.text, 0, 0);
        ctx.fillStyle = '#fff0a8';
        ctx.fillText(w.text, 0, 0);
        ctx.restore()
      }
      if (this.film) {
        ctx.fillStyle = '#423452';
        ctx.font = '900 ' + clamp(this.w / 28, 17, 37) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.over ? '橘猫超载，牛顿退场！' : levels[this.level] + ' · 一戳失重', this.w / 2,
            this.h * .12);
        ctx.textAlign = 'left'
      }
      if (this.rec && performance.now() - this.rec.lastFrame >= 1000 / 30) {
        this.composite(this.rec.surface);
        this.rec.lastFrame = performance.now()
      }
    }
    composite(c) {
      const a = c.getContext('2d');
      a.fillStyle = '#e9e2f3';
      a.fillRect(0, 0, c.width, c.height);
      a.strokeStyle = '#dcd2e5';
      a.lineWidth = 1;
      const grid = 27 * c.width / this.w;
      a.beginPath();
      for (let x = 0; x < c.width; x += grid) {
        a.moveTo(x, 0);
        a.lineTo(x, c.height)
      }
      for (let y = 0; y < c.height; y += grid) {
        a.moveTo(0, y);
        a.lineTo(c.width, y)
      }
      a.stroke();
      a.drawImage(this.canvas, 0, 0, c.width, c.height);
      a.drawImage(this.overlay, 0, 0, c.width, c.height);
    }
    surface(width) {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = Math.round(width * this.h / this.w);
      return c
    }
    snapshot(done) {
      const scale = Math.min(2, Math.max(1, 1600 / this.w)),
            old = [this.canvas.width, this.canvas.height, this.overlay.width, this.overlay.height];
      try {
        for (const c of [this.canvas, this.overlay]) {
          c.width = Math.round(this.w * scale);
          c.height = Math.round(this.h * scale)
        }
        this.ink.setTransform(scale, 0, 0, scale, 0, 0);
        this.render();
        const out = this.surface(this.canvas.width);
        this.composite(out);
        out.toBlob(done, 'image/png');
      } finally {
        [this.canvas.width, this.canvas.height, this.overlay.width, this.overlay.height] = old;
        this.ink.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.render()
      }
    }
    startRecord(done) {
      if (this.rec)
        return;
      const surface = this.surface(Math.min(1600, this.canvas.width));
      const mime = window.MediaRecorder && [
        'video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm'
      ].find(x => MediaRecorder.isTypeSupported(x));
      if (!mime || !surface.captureStream)
        throw Error('当前浏览器可用高清抓拍');
      this.render();
      this.composite(surface);
      const stream = surface.captureStream(30);
      if (this.synth.enabled && this.synth.stream)
        for (const t of this.synth.stream.stream.getAudioTracks())
          stream.addTrack(t.clone());
      const cleanup = () => stream.getTracks().forEach(t => t.stop());
      let recorder;
      try {
        recorder = new MediaRecorder(stream, {mimeType: mime});
        const chunks = [];
        recorder.ondataavailable = e => {
          if (e.data.size)
            chunks.push(e.data)
        };
        recorder.onstop = () => {
          clearTimeout(this.rec?.timer);
          this.rec = null;
          cleanup();
          done(chunks.length ? new Blob(chunks, {type: mime}) : null)
        };
        recorder.start(200);
        this.rec = {
          surface,
          recorder,
          lastFrame: -Infinity,
          timer: setTimeout(() => this.stopRecord(), 15000)
        };
        this.render();
        this.schedule();
      } catch (e) {
        cleanup();
        throw e
      }
    }
    stopRecord() {
      if (this.rec?.recorder.state === 'recording')
        this.rec.recorder.stop()
    }
  }
  Stage.products = products;
  Stage.sceneProps = sceneProps;
  Stage.levels = levels;
  if (typeof window !== 'undefined') window.NewtonStage = Stage;
  if (typeof module !== 'undefined' && module.exports) module.exports = Stage;
})();

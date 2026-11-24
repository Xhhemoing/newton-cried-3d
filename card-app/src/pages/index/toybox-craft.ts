import type { ScopedThreejs } from '@open-dy/threejs'

// All surfaces are generated once when a canvas opens, including on an offline host.
export function craftShapes(t: ScopedThreejs) {
  function profile(points: number[][], segments = 32) {
    return new t.LatheGeometry(points.map(([r, h]) => new t.Vector2(r, h)), segments)
  }
  function stroke(points: number[][], radius: number, segments = 16) {
    const path = new t.CatmullRomCurve3(points.map(([x,y,z]) => new t.Vector3(x,y,z)))
    return new t.TubeGeometry(path, segments, radius, 7, false)
  }
  function solid(outline: number[][], depth: number, bevel: number) {
    const shape = new t.Shape()
    outline.forEach(([x, y], i) => { if (i) shape.lineTo(x, y); else shape.moveTo(x, y) })
    shape.closePath()
    const geometry = new t.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel,
      bevelThickness: bevel, bevelSegments: 3, steps: 1, curveSegments: 12 })
    geometry.translate(0, 0, -depth / 2)
    return geometry
  }
  function tabbyTail() {
    const curve = new t.CatmullRomCurve3([[0,0,0],[.17,.08,-.07],[.29,.26,-.08],
      [.34,.45,-.05],[.29,.60,-.01],[.18,.66,.015]].map(([x,y,z])=>new t.Vector3(x,y,z)))
    const rings=32, sides=10
    const tube=new t.TubeGeometry(curve,rings,1,sides,false)
    const vertices=tube.getAttribute('position')
    const normal=tube.getAttribute('normal')
    const colors:number[]=[]
    const tint=new t.Color()
    for(let i=0;i<=rings;i++) {
      const u=i/rings
      const center=curve.getPointAt(u)
      const radius=(.102-.023*u)*Math.min(1,Math.sqrt((1-u)*8))
      tint.set(u>.77 ? '#f6d49b' : (u>.22 && u<.36) || (u>.52 && u<.66) ? '#a8532c' : '#dc873f')
      for(let j=0;j<=sides;j++) {
        const idx=i*(sides+1)+j
        vertices.setXYZ(idx,center.x+radius*normal.getX(idx),center.y+radius*normal.getY(idx),center.z+radius*normal.getZ(idx))
        colors.push(tint.r,tint.g,tint.b)
      }
    }
    tube.setAttribute('color',new t.Float32BufferAttribute(colors,3))
    tube.computeVertexNormals()
    return tube
  }
  return {
    tabbyTail: tabbyTail(),
    mug: profile([[0,.045],[.14,.045],[.165,.056],[.181,.09],[.208,.18],[.244,.46],
      [.249,.505],[.243,.526],[.228,.526],[.221,.508],[.213,.46],[.18,.19],[0,.15]]),
    handle: stroke([[.203,.425,0],[.291,.448,0],[.377,.396,0],[.385,.30,0],[.321,.209,0],[.196,.19,0]],.033),
    latheBowl: profile([[0,.013],[.185,.013],[.20,.042],[.215,.076],[.315,.11],[.405,.194],[.449,.263],
      [.456,.285],[.438,.296],[.423,.273],[.381,.21],[.29,.146],[0,.09]]),
    earShell: solid([[-.16,-.09],[-.118,.061],[-.018,.239],[.022,.247],[.142,.046],[.162,-.07],[.065,-.113]],.11,.032),
    cheekStripe: stroke([[0,0,0],[.062,.02,-.005],[.129,.043,-.027],[.176,.063,-.065]],.016),
    whisker: stroke([[0,0,0],[.09,.023,0],[.18,.045,-.022]],.009,8),
    rolledPaw: stroke([[0,.02,0],[.037,.047,.008],[.095,.051,.054],[.135,.044,.094]],.086),
    roundedBlock: solid([[-.42,-.41],[.42,-.41],[.45,-.38],[.45,.38],[.42,.41],[-.42,.41],[-.45,.38],[-.45,-.38]],.77,.055),
    roof: solid([[-.25,-.087],[.25,-.087],[.035,.13],[-.035,.13]],.26,.02),
    ivories: solid([[-.46,-.42],[.46,-.42],[.46,.42],[-.46,.42]],.82,.05),
    pianoLid: (() => {
      const shape = new t.Shape()
      shape.moveTo(-.44,.25); shape.lineTo(.43,.25); shape.lineTo(.43,.04)
      shape.bezierCurveTo(.42,-.23,.22,-.20,.12,-.25)
      shape.bezierCurveTo(-.03,-.35,-.01,-.51,-.25,-.48)
      shape.bezierCurveTo(-.43,-.45,-.45,-.30,-.44,.25)
      const lid = new t.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.025,bevelThickness:.016,bevelSegments:2,curveSegments:12})
      lid.rotateX(Math.PI / 2)
      return lid
    })(),
  }
}

export function oakGrain(t: ScopedThreejs) {
  const size = 256
  const bytes = new Uint8Array(size * size * 4)
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const x = col / size, y = row / size
    const knots = Math.sin(6 * x + 4 * y) * .9 + Math.sin(13 * x - 7 * y) * .25
    const ring = Math.sin(135 * y + 4 * knots + Math.sin(48 * y))
    const grain = 4 * ring + 2 * Math.sin(385 * y + 13 * knots) + 3 * Math.sin(19 * y + knots)
    const i = (row * size + col) * 4
    bytes.set([217 + grain, 179 + grain, 133 + grain, 255], i)
  }
  const map = new t.DataTexture(bytes, size, size)
  map.colorSpace = t.SRGBColorSpace
  map.magFilter = t.LinearFilter
  map.minFilter = t.LinearMipmapLinearFilter
  map.generateMipmaps = true
  map.needsUpdate = true
  return map
}

export function contactShadow(t: ScopedThreejs) {
  const size=64, bytes=new Uint8Array(size*size*4)
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1)
    bytes.set([255,255,255,Math.round(255*Math.pow(Math.max(0,1-r*r),2.6))],4*(y*size+x))
  }
  const map=new t.DataTexture(bytes,size,size)
  map.magFilter=map.minFilter=t.LinearFilter
  map.needsUpdate=true
  return map
}

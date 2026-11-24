import Taro from '@tarojs/taro'
import { createScopedThreejs } from '@open-dy/threejs'
import type { MiniappCanvas, MiniappRuntimeApi, ThreeObject3D } from '@open-dy/threejs'
import type { OutfitId, SimStepState, SubjectId } from '../../shared/newton-core'
import { TARGET_Y, WORLD_WIDTH, cameraAxes, displayPosition, toyLift } from './toybox-camera'
import type { ToyboxView, ToyPose } from './toybox-camera'
import { craftShapes, oakGrain, contactShadow } from './toybox-craft'

export type CanvasBox = { node: MiniappCanvas; top: number; left: number; width: number; height: number }

export function makeScene(box: CanvasBox, initialView: ToyboxView) {
  // [PLATFORM-INTEGRATION: bind @open-dy/threejs createScopedThreejs(canvasNode) in Douyin MiniApp WebGL V2]
  const three = createScopedThreejs(box.node, { api: Taro as unknown as MiniappRuntimeApi, displaySize: box })
  const scene = new three.Scene()
  const camera = new three.OrthographicCamera(-1, 1, 1, -1, 0.1, 35)
  const origin = new three.Vector3(0, TARGET_Y, 0)
  let view = initialView
  let cameraChanged = true
  function positionCamera() {
    cameraChanged = true
    const { front } = cameraAxes(view)
    camera.position.set(9 * front.x, TARGET_Y + 9 * front.y, 9 * front.z)
    camera.lookAt(origin)
    camera.updateMatrixWorld(true)
    const halfWidth = WORLD_WIDTH / (2 * view.zoom)
    const halfHeight = halfWidth * box.height / box.width
    camera.left = -halfWidth
    camera.right = halfWidth
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
  }
  const shapes = {
    ...craftShapes(three),
    footprint: new three.PlaneGeometry(2,2).rotateX(-Math.PI/2),
    orb: new three.SphereGeometry(1, 16, 12),
    cube: new three.BoxGeometry(1, 1, 1),
    drum: new three.CylinderGeometry(1, 1, 1, 52),
    ear: new three.ConeGeometry(1, 1, 3),
    hoop: new three.TorusGeometry(1, 0.055, 6, 48),
  }
  const palette = new Map<string, InstanceType<typeof three.MeshStandardMaterial>>()
  const grain = oakGrain(three)
  const softEdge = contactShadow(three)
  const shadowMaterials: InstanceType<typeof three.MeshBasicMaterial>[] = []
  const finishes = {
    toy: { roughness: 0.55, metalness: 0.03 },
    rubber: { roughness: 0.76, metalness: 0 },
    oak: { roughness: 0.63, metalness: 0 },
    cup: { roughness: 0.32, metalness: 0 },
    coffee: { roughness: 0.24, metalness: 0 },
    ice: { roughness: 0.18, metalness: 0 },
    brass: { roughness: 0.36, metalness: 0.52 },
  }
  let renderer: InstanceType<typeof three.WebGLRenderer> | undefined
  function dispose() {
    Object.values(shapes).forEach(shape => shape.dispose())
    shadowMaterials.forEach(material => material.dispose())
    grain.dispose()
    softEdge.dispose()
    palette.forEach(material => material.dispose())
    renderer?.dispose()
    three.dispose()
  }
  try {
    const gl = renderer = new three.WebGLRenderer({ antialias: true, alpha: true })
    gl.setClearColor(0xfff7ec, 0)
    gl.setPixelRatio(Math.min(three.pixelRatio || 1, 2))
    let sized = false
    function resize(next: CanvasBox) {
      const sameSize = sized && box.width === next.width && box.height === next.height
      box = next
      if (sameSize) return
      sized = true
      three.setDisplaySize(next)
      positionCamera()
      gl.setSize(next.width, next.height, false)
    }
    resize(box)
    scene.add(new three.HemisphereLight(0xfff4dc, 0xb6ad97, 1.18))
    for (const [color, intensity, x, y, z] of [
      [0xffedd0, 2.05, -3, 6, 5], [0xc0e6ef, 0.66, 4, 2, 3], [0xffe0aa, 1.1, 1, 4, -4],
    ]) {
      const light = new three.DirectionalLight(color, intensity)
      light.position.set(x, y, z)
      scene.add(light)
    }
    function group(parent: ThreeObject3D) {
      const result = new three.Group()
      parent.add(result)
      return result
    }
    function part(parent: ThreeObject3D, shape: keyof typeof shapes, color: string,
      x: number, y: number, z: number, sx: number, sy: number, sz: number, finish: keyof typeof finishes = 'toy') {
      const key = finish + ':' + color
      let material = palette.get(key)
      if (!material) {
        material = new three.MeshStandardMaterial({ color, ...finishes[finish] })
        if (color === '#acdf56') material.emissive.setHex(0x27480c)
        palette.set(key, material)
      }
      const piece = new three.Mesh(shapes[shape], material)
      piece.position.set(x, y, z)
      piece.scale.set(sx, sy, sz)
      parent.add(piece)
      return piece
    }
    const tray = group(scene)
    function shadow(opacity: number) {
      const material = new three.MeshBasicMaterial({color:'#574032',map:softEdge,transparent:true,opacity,depthWrite:false})
      shadowMaterials.push(material)
      const mesh = new three.Mesh(shapes.footprint,material)
      scene.add(mesh)
      return {mesh,material}
    }
    const tableShadow = shadow(.33).mesh
    tableShadow.position.set(.068,-.327,.10)
    tableShadow.scale.set(3.15,1,3.05)
    part(tray, 'drum', '#4b3930', 0, -.266, 0, 2.32, .10, 2.32, 'oak')
    part(tray, 'drum', '#935635', 0, -.166, 0, 2.51, .19, 2.51, 'oak')
    part(tray, 'drum', '#32685e', 0, -.163, 0, 2.516, .084, 2.516, 'cup')
    part(tray, 'drum', '#d0a05d', 0, -.105, 0, 2.52, .018, 2.52, 'brass')
    const board = part(tray, 'drum', '#ffffff', 0, -.052, 0, 2.46, .102, 2.46, 'oak')
    board.material.map = grain
    part(tray, 'hoop', '#ad764c', 0, -.007, 0, 2.416, 2.416, .14, 'oak').rotation.x = Math.PI / 2
    const coaster = group(tray)
    coaster.position.set(-.36,0,.29)
    part(coaster,'drum','#96694d',0,.001,0,.53,.009,.53,'oak')
    part(coaster,'drum','#89b8a0',0,.007,0,.502,.007,.502,'rubber')
    part(coaster,'hoop','#c6d7ae',0,.013,0,.438,.438,.12).rotation.x = Math.PI/2
    part(coaster,'orb','#699781',0,.013,.066,.115,.007,.091)
    for (const side of [-1,1]) {
      part(coaster,'orb','#699781',side*.125,.014,-.026,.043,.007,.064)
      part(coaster,'orb','#699781',side*.049,.014,-.105,.042,.007,.066)
    }
    const models = { cat: group(scene), apple: group(scene), piano: group(scene), noodle: group(scene), blocks: group(scene) }
    const cat = models.cat
    const cream = '#fff0cb', orange = '#df893f', ink = '#392c32', pink = '#e59886'
    part(cat, 'orb', orange, -.025, .28, -.018, .46, .34, .355, 'rubber')
    part(cat, 'orb', cream, -.012, .21, .25, .28, .20, .133, 'rubber')
    const head = group(cat)
    head.rotation.y = .22
    part(head, 'orb', orange, 0,.68,.07,.515,.408,.398,'rubber')
    const eyes = group(head)
    for (const side of [-1, 1]) {
      part(head,'earShell',orange,side*.318,.936,.04,1,1,1,'rubber').rotation.z=-side*.22
      part(head,'earShell',pink,side*.321,.949,.109,.67,.68,.39,'rubber').rotation.z=-side*.22
      part(eyes,'orb','#a3a365',side*.176,0,.429,.079,.080,.035,'cup')
      part(eyes,'orb',ink,side*.176+.021,-.001,.456,.043,.061,.022,'cup')
      part(eyes,'orb','#fff8dd',side*.176+.032,.023,.477,.013,.015,.006)
      part(head,'orb',cream,side*.126,.592,.418,.166,.115,.075,'rubber')
      for (let i=0;i<2;i++) {
        part(head,'cheekStripe','#af562c',side*.305,.679-i*.075,.386,side,.80,1).rotation.z=side*.04
        part(head,'whisker','#624836',side*.182,.596-i*.040,.477,side,.75,1).rotation.z=side*(.06-i*.28)
      }
      part(cat, 'orb', cream, side * 0.33, 0.012, 0.25, 0.145, 0.14, 0.14, 'rubber')
      part(cat, 'orb', pink, side * 0.33, 0.015, 0.38, 0.067, 0.05, 0.024, 'rubber')
      for (const toe of [-1, 1]) part(cat, 'orb', pink, side * 0.33 + toe * 0.053, 0.077, 0.365, 0.028, 0.03, 0.02, 'rubber')
    }
    eyes.position.y=.746
    const paw=group(cat)
    paw.position.set(.325,.353,.185)
    part(paw,'rolledPaw',orange,0,0,0,1,1,1,'rubber')
    part(paw,'orb',cream,.154,.048,.112,.12,.088,.102,'rubber')
    part(cat,'hoop','#296b60',0,.405,.017,.346,.306,.69,'rubber').rotation.x=Math.PI/2
    part(cat,'orb','#d9ac4e',.018,.351,.355,.067,.076,.047,'brass')
    for (const stripe of [-1, 0, 1]) {
      part(head, 'orb', '#a9532d', 0.116 * stripe, 0.951, 0.318, 0.033, 0.084, 0.033, 'rubber').rotation.z = stripe * 0.29
    }
    part(head, 'orb', '#ae6156', 0, .644,.49,.052,.034,.029,'rubber')
    const tail=part(cat,'tabbyTail','#ffffff',.30,.17,-.21,1,1,1,'rubber')
    tail.material.vertexColors=true
    const wear = { shades: group(head), apple_hat: group(head), spring_bow: group(cat), newton_wig: group(head) }
    for (const side of [-1, 1]) {
      part(wear.shades, 'orb', '#29323c', side * 0.196, 0.755, 0.47, 0.15, 0.10, 0.045)
      part(wear.shades, 'orb', '#77b5bc', side * 0.196 - 0.031, 0.788, 0.51, 0.047, 0.012, 0.008).rotation.z = 0.4
      part(wear.spring_bow, 'ear', '#956be3', side * 0.098, 0.39, 0.405, 0.10, 0.18, 0.10).rotation.z = side * Math.PI / 2
      for (let i = 0; i < 3; i++) part(wear.newton_wig, 'orb', '#e8dfd2', side * (0.37 + 0.05 * i), 0.99 - i * 0.13, 0.16, 0.18, 0.14, 0.18)
    }
    part(wear.shades, 'cube', '#bc853d', 0, 0.78, 0.48, 0.13, 0.025, 0.025, 'brass')
    part(wear.spring_bow, 'orb', '#bc853d', 0, 0.39, 0.42, 0.058, 0.058, 0.046, 'brass')
    part(wear.newton_wig, 'orb', '#eee7d8', 0, 1.08, 0.04, 0.47, 0.19, 0.38)
    function apple(parent: ThreeObject3D, color: string) {
      for (const side of [-1, 1]) part(parent, 'orb', color, side * 0.10, 0.21, 0, 0.20, 0.24, 0.235)
      part(parent, 'drum', '#794f33', 0.01, 0.47, 0, 0.025, 0.19, 0.025).rotation.z = -0.26
      part(parent, 'orb', '#439666', 0.10, 0.52, 0, 0.13, 0.04, 0.065).rotation.z = 0.28
    }
    apple(wear.apple_hat, '#f77761')
    wear.apple_hat.position.y = 1.06
    wear.apple_hat.scale.setScalar(0.66)
    const props = { coffee: group(models.apple), phone_case: group(models.apple),
      cat_can: group(models.apple), luggage: group(models.apple) }
    const { coffee, phone_case: phone, cat_can: can, luggage } = props
    part(coffee,'mug','#307e74',0,-.043,0,1,1,1,'cup')
    part(coffee,'handle','#479389',0,-.043,0,1,1,1,'cup')
    part(coffee,'hoop',cream,0,.48,0,.238,.238,.18,'cup').rotation.x=Math.PI/2
    const drink=group(coffee)
    drink.position.y=.438
    part(drink,'drum','#4d291c',0,0,0,.217,.018,.217,'coffee')
    part(drink,'hoop','#a7744d',0,.010,0,.194,.194,.13,'coffee').rotation.x=Math.PI/2
    for (const [x,z,angle] of [[-.075,.07,.38],[.091,.053,-.47],[-.09,-.072,-.19]]) {
      const ice=part(drink,'roundedBlock','#c5ddd2',x,.031,z,.099,.079,.091,'ice')
      ice.rotation.set(.16,angle,.12)
    }
    const straw=group(coffee)
    straw.position.set(.046,.56,-.081)
    straw.rotation.z=-.27
    part(straw,'drum','#f7dfab',0,.041,0,.022,.326,.022,'cup')
    for(const height of [-.032,.067,.16]) part(straw,'drum','#cc634b',0,height,0,.0225,.039,.0225,'cup')
    part(straw,'drum',ink,0,.205,0,.013,.002,.013)
    part(coffee,'orb',cream,0,.25,.211,.093,.096,.012,'cup')
    part(coffee,'orb','#945234',0,.244,.223,.032,.039,.006,'coffee').rotation.z=-.36

    function roundedPlate(parent: ThreeObject3D, color: string, width: number, height: number, depth: number, z: number) {
      const radius = .08
      part(parent, 'cube', color, 0, .37, z, width - 2 * radius, height, depth)
      part(parent, 'cube', color, 0, .37, z, width, height - 2 * radius, depth)
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        part(parent, 'drum', color, x * (width / 2 - radius), .37 + y * (height / 2 - radius),
          z, radius, depth, radius).rotation.x = Math.PI / 2
      }
    }
    roundedPlate(phone, '#5af3df', .43, .74, .13, 0)
    roundedPlate(phone, '#9eabb4', .36, .66, .035, .073)
    part(phone, 'cube', '#59616c', -.085, .56, .104, .15, .21, .035)
    for (const y of [.515, .61]) part(phone, 'orb', ink, -.085, y, .126, .05, .05, .024)
    phone.rotation.y = -.28

    part(can, 'drum', '#bdc6ca', 0, .22, 0, .30, .40, .30)
    part(can, 'drum', '#fa793c', 0, .20, 0, .305, .25, .305)
    part(can, 'drum', '#eff0e3', 0, .43, 0, .315, .045, .315)
    part(can, 'hoop', '#626b73', 0, .459, .05, .12, .072, .22).rotation.x = Math.PI / 2
    part(can, 'orb', '#ffcf80', 0, .22, .30, .12, .07, .012)

    part(luggage, 'cube', '#ed82a3', 0, .31, 0, .49, .53, .23)
    part(luggage, 'orb', '#f19fba', 0, .32, .095, .28, .29, .105)
    for (const side of [-1, 1]) {
      part(luggage, 'drum', ink, side * .105, .66, 0, .018, .22, .018)
      part(luggage, 'orb', ink, side * .18, .045, 0, .066, .061, .08)
      part(luggage, 'cube', side > 0 ? '#ffcf65' : '#64d9c4', side * .15, .31, .168, .05, .54, .042)
    }
    part(luggage, 'cube', ink, 0, .77, 0, .25, .055, .06)
    part(luggage, 'cube', '#fff3c6', -.01, .43, .195, .15, .085, .012).rotation.z = -.27
    let shownProp: SimStepState['propSkin'] | undefined
    const piano = models.piano
    part(piano,'pianoLid','#4f515d',0,.30,-.02,1,3,1,'cup')
    part(piano,'pianoLid','#8b5b43',0,.387,-.058,.99,1,.94,'oak').rotation.x=.27
    part(piano,'roundedBlock','#3f454b',0,.218,.18,.9,.19,.40,'cup')
    for (let i = 0; i < 8; i++) {
      part(piano, 'ivories', cream, -0.37 + i * 0.105, 0.334, 0.30, 0.098, 0.05, 0.20)
      if (i % 4 !== 2 && i < 7) part(piano, 'ivories', ink, -0.32 + i * 0.105, 0.369, 0.248, 0.049, 0.04, 0.11)
    }
    part(piano, 'hoop', '#bc853d', 0.51, 0.35, -0.08, 0.16, 0.10, 0.13, 'brass')
    for (const x of [-0.32, 0.32]) part(piano, 'drum', '#bc853d', x, 0.055, 0.14, 0.05, 0.17, 0.05, 'brass')
    const bowl = models.noodle
    part(bowl,'latheBowl','#e9deba',0,0,0,1,1,1,'cup')
    part(bowl,'hoop','#4b8886',0,.278,0,.45,.45,.15,'cup').rotation.x=Math.PI/2
    part(bowl, 'drum', '#dc9955', 0, 0.265, 0, 0.39, 0.018, 0.39)
    for (let i = 0; i < 7; i++) {
      const noodle = part(bowl, 'hoop', '#ffe0a1', Math.sin(i * 3) * 0.12, 0.28 + i * 0.012, Math.cos(i * 2) * 0.09, 0.23, 0.15, 0.38)
      noodle.rotation.set(Math.PI / 2 - 0.15, 0, i * 0.5)
    }
    const egg=group(bowl)
    egg.position.set(-.17,.284,-.09); egg.rotation.z=.35
    part(egg,'orb',cream,0,0,0,.116,.035,.15)
    part(egg,'orb','#e6a841',0,.029,.011,.065,.019,.081)
    for(const [x,z] of [[.18,.06],[.14,.14],[.23,.13],[.15,-.11]])
      part(bowl,'hoop','#568b4f',x,.318,z,.033,.029,.23).rotation.x=Math.PI/2
    for (let i = 0; i < 4; i++) {
      const block=group(models.blocks)
      block.position.set(i%2*.047,.09+.181*i,0); block.rotation.y=(i-1)*.18
      if(i===3) part(block,'roof','#c25d46',0,-.015,0,.92,1,1,'oak')
      else {
        part(block,'roundedBlock',['#397a73','#e2aa53','#657f96'][i],0,0,0,.65-i*.074,.19,.36,'oak')
        part(block,'hoop',cream,0,0,.164,.047,.047,.22)
      }
    }
    const shadows = Object.fromEntries(Object.keys(models).map(id => [id,shadow(.33)]))
    const pick = new three.Raycaster()
    const pointer = new three.Vector2()
    let equipped: OutfitId | null | undefined
    let drawnState: SimStepState | undefined
    return {
      requestFrame: (fn: (time: number) => void) => three.requestAnimationFrame(fn),
      cancelFrame: (id: number) => three.cancelAnimationFrame(id),
      dispose, resize,
      setView(next: ToyboxView) {
        if (view === next) return
        view = next
        positionCamera()
      },
      hit(x: number, y: number): SubjectId | undefined {
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > box.width || y > box.height) return
        pointer.set(x * 2 / box.width - 1, 1 - y * 2 / box.height)
        pick.setFromCamera(pointer, camera)
        const mesh = pick.intersectObjects(Object.values(models), true).find(hit => {
          let part: ThreeObject3D | null = hit.object
          while (part) { if (!part.visible) return false; part = part.parent }
          return true
        })?.object
        let object: ThreeObject3D | null | undefined = mesh
        while (object) {
          const id = (Object.keys(models) as SubjectId[]).find(key => models[key] === object)
          if (id) return id
          object = object.parent
        }
      },
      draw(state: SimStepState, outfit: OutfitId | null) {
        if (!cameraChanged && state === drawnState && outfit === equipped) return
        cameraChanged = false
        drawnState = state
        if (shownProp !== state.propSkin) {
          for (const prop of Object.keys(props) as Array<keyof typeof props>) props[prop].visible = prop === state.propSkin
          shownProp = state.propSkin
        }
        if (outfit !== equipped) {
          for (const id of Object.keys(wear) as OutfitId[]) wear[id].visible = outfit === id
          equipped = outfit
        }
        for (const b of state.bodies as ToyPose[]) {
          const model = models[b.id]
          const p = displayPosition(b)
          model.position.set(p.x, p.y, p.z)
          model.rotation.set(b.rotX, b.rotY, b.rotZ)
          model.scale.set(b.scale * b.squashX, b.scale * b.squashY, b.scale * b.squashX)
          const { mesh, material } = shadows[b.id]
          mesh.visible = b.y >= 0 && Math.hypot(b.x, b.z) <= 2.45
          if (mesh.visible) {
            const lift = Math.min(1, Math.max(0, toyLift(b)) / 2.2)
            const footprint = b.scale * (1 - 0.58 * lift)
            mesh.position.set((b.freeBounds ? b.x : p.x)+.045,.017,(b.freeBounds ? b.z : p.z)+.065)
            mesh.scale.set(.64*footprint,1,.46*footprint)
            material.opacity = .38 - .31 * lift
          }
        }
        tail.rotation.z=.09*Math.sin(state.tick*.065)
        const cup=state.bodies.find(b=>b.id==='apple')
        const kitten=state.bodies.find(b=>b.id==='cat')
        if(cup && kitten) {
          head.rotation.y=Math.max(-.57,Math.min(.57,(cup.x-kitten.x)*.55))
          const reach=Math.max(0,1-Math.hypot(cup.x-kitten.x,cup.z-kitten.z)/1.25)
          paw.rotation.z=.16+reach*.67
          paw.position.x=.30+reach*.096
          // Keep the ice inside the lip even when the player throws or rolls the mug.
          drink.rotation.z=Math.max(-.09,Math.min(.09,-cup.rotZ*.14-cup.vx*.016))
          drink.rotation.x=Math.max(-.09,Math.min(.09,-cup.rotX*.14+cup.vz*.016))
        }
        const blink=state.tick%181
        eyes.scale.y=blink>151 && blink<159 ? .28+.72*Math.abs(blink-155)/4 : 1
        gl.render(scene, camera)
      },
    }
  } catch (error) {
    dispose()
    throw error
  }
}

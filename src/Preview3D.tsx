import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, useGLTF, useProgress, useTexture } from '@react-three/drei'
import { Box3, CanvasTexture, Color, Group, Material, MathUtils, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, ShaderChunk, SRGBColorSpace, Texture, Vector3 } from 'three'
import './preview-3d.css'

const debug = new URLSearchParams(window.location.search).get('debug') === '1'
const sections = [{ id: 'projetos', label: 'PROJETOS' }, { id: 'sobre', label: 'SOBRE' }, { id: 'trajetoria', label: 'TRAJETÓRIA' }, { id: 'contato', label: 'CONTATO' }]
type Control = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select'

class SceneError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="preview-error" role="alert">Não foi possível carregar o console 3D. <a href="/#projetos">Abrir portfólio</a></div> : this.props.children
  }
}

function CameraFit() {
  const { camera, size } = useThree()
  useEffect(() => {
    const perspective = camera as PerspectiveCamera
    const mobile = window.matchMedia('(pointer: coarse)').matches
    const distance = (mobile ? 3.6 : 3.3) / (2 * Math.tan(perspective.fov * Math.PI / 360) * size.width / size.height)
    const heightDistance = mobile ? 10.8 * .864 * size.height / Math.max(1, size.height - 140) : 10.8
    perspective.position.z = Math.max(10.8, distance, heightDistance)
    perspective.updateProjectionMatrix()
  }, [camera, size])
  return null
}

function Loading({ ready }: { ready: boolean }) {
  const { active } = useProgress()
  return active || !ready ? <div className="preview-loading" role="status">Carregando console…</div> : null
}

function WebGLFallback({ onReady }: { onReady: (ready: boolean) => void }) {
  useEffect(() => { onReady(true) }, [onReady])
  return <div className="preview-error">WebGL não está disponível. <a href="/#projetos">Abrir portfólio</a></div>
}

function Console({ onHover, onReady, onIntroReady, onSoundReady, onControl, controlsReady, soundPreference, progress, screenElement }: { onHover: (name: string) => void, onReady: (ready: boolean) => void, onIntroReady: (ready: boolean) => void, onSoundReady: (ready: boolean) => void, onControl: (control: Control) => void, controlsReady: boolean, soundPreference: RefObject<boolean>, progress: RefObject<number>, screenElement: RefObject<HTMLDivElement | null> }) {
  const { scene } = useGLTF('/models/console-otimizado.glb')
  const { gl, camera, scene: renderScene } = useThree()
  const cartridgeArt = useTexture('/images/rotulo-andrde.png')
  cartridgeArt.colorSpace = SRGBColorSpace
  const group = useRef<Group>(null)
  const previousProgress = useRef(0)
  const animatedProgress = useRef(0)
  const displayedReady = useRef(false)
  const impactTime = useRef(Infinity)
  const pressed = useRef<Control | null>(null)
  const clickSound = useRef<{ context: AudioContext, noise: AudioBuffer } | null>(null)
  const cartridgeGlint = useMemo(() => ({ value: 0 }), [])
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const cartridgeLogo = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 160
    const context = canvas.getContext('2d')!
    context.font = 'italic 600 105px Arial, sans-serif'; context.textAlign = 'center'
    context.fillStyle = '#ffffff'; context.fillText('Andrde', 496, 119)
    context.font = '500 32px Arial, sans-serif'; context.fillText('™', 690, 53)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])
  const serialLabel = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900; canvas.height = 140
    const context = canvas.getContext('2d')!
    context.font = '110px "Courier New", monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'
    context.fillStyle = '#303375'; context.fillText('AN2RD3', 490, 72)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])
  const { model, center, screen, screenBounds, cartridgePivot, cartridgeY, buttons, dpad } = useMemo(() => {
    const model = scene.clone(true)
    const names = new Set<string>()
    let grayCartridge: MeshStandardMaterial | undefined
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const material = materials.find((item) => item.name === 'Cartridge_2')
      if (material instanceof MeshStandardMaterial) grayCartridge = material
    })
    let screen: MeshStandardMaterial | undefined
    let screenMesh: Mesh | undefined
    let baseMesh: Mesh | undefined
    let selectMesh: Mesh | undefined
    let dpad: Mesh | undefined
    const buttons = new Map<Control | 'dpad', { object: Object3D, z: number }[]>()
    const cartridgeParts: Object3D[] = []
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => names.add(material.name))
      if (materials.some((material) => material.name === 'Cartridge_2')) { object.visible = false; object.raycast = () => {}; return }
      if (object.name === 'base_low_Main_0') baseMesh = object
      if (object.name === 'screen_low_External_0') screenMesh = object
      if (object.name === 'select_low_External_0') selectMesh = object
      if (object.name === 'movement_low_External_0') dpad = object
      if (materials.some((material) => material.name === 'Cartridge') && object.parent) cartridgeParts.push(object.parent)
      const updateMaterial = (material: Material) => {
        if (debug) {
          let hash = 0
          for (const letter of material.name) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0
          const color = new Color().setHSL((hash % 360) / 360, .7, .55)
          const result = new MeshStandardMaterial({ color, roughness: .8 })
          result.name = material.name
          return result
        }
        if (object.name === 'screen_low_External_0') {
          const result = new MeshStandardMaterial({ color: '#172d18', roughness: .8 })
          result.name = material.name
          screen = result
          return result
        }
        if (object.name === 'cartridge_low_Cartridge_0' && material instanceof MeshStandardMaterial) {
          const result = material.clone()
          if (grayCartridge?.map) result.map = grayCartridge.map
          result.onBeforeCompile = (shader) => {
            shader.uniforms.cartridgeLogo = { value: cartridgeLogo }
            shader.uniforms.cartridgeArt = { value: cartridgeArt }
            shader.uniforms.cartridgeGlint = cartridgeGlint
            shader.fragmentShader = `uniform sampler2D cartridgeLogo;
              uniform sampler2D cartridgeArt;
              uniform float cartridgeGlint;
              float cartCleanup(vec2 uv) {
                return smoothstep(.065, .08, uv.x) * (1.0 - smoothstep(.38, .40, uv.x)) * smoothstep(.415, .42, uv.y) * (1.0 - smoothstep(.465, .47, uv.y));
              }
              vec4 cleanCartSample(sampler2D source, vec2 uv) {
                vec4 original = texture2D(source, uv);
                vec2 cleanUv = vec2(uv.x, .457 + (uv.y - .42) * .08);
                return mix(original, texture2D(source, cleanUv), cartCleanup(uv));
              }\n` + shader.fragmentShader
            shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
              #ifdef USE_MAP
                vec4 sampledDiffuseColor = cleanCartSample(map, vMapUv);
                sampledDiffuseColor.rgb *= 1.0 + cartCleanup(vMapUv) * .06;
                if (vMapUv.x > .08 && vMapUv.x < .38 && vMapUv.y > .42 && vMapUv.y < .465) {
                  vec4 mark = texture2D(cartridgeLogo, vec2((vMapUv.x - .08) / .30, (vMapUv.y - .42) / .045));
                  sampledDiffuseColor.rgb *= 1.0 - mark.a * .12;
                }
                if (vMapUv.x > .004 && vMapUv.x < .325 && vMapUv.y > .53 && vMapUv.y < .845) {
                  vec2 labelUv = vec2((vMapUv.x - .004) / .321, (vMapUv.y - .53) / .315);
                  vec2 artworkUv = vec2(mix(.12, .87, labelUv.x), mix(.14, .88, labelUv.y));
                  sampledDiffuseColor.rgb = texture2D(cartridgeArt, artworkUv).rgb;
                  float band = 1.0 - smoothstep(0.0, .12, abs(labelUv.x + labelUv.y * .18 - mix(-.2, 1.2, cartridgeGlint)));
                  float glintFade = smoothstep(.05, .2, cartridgeGlint) * (1.0 - smoothstep(.8, .95, cartridgeGlint));
                  sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(1.0), band * glintFade * .12);
                }
                diffuseColor *= sampledDiffuseColor;
              #endif
            `)
            shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
              ${ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv )', 'cleanCartSample(normalMap, vNormalMapUv)').replace('mapN.xy *= normalScale;', `
                mapN.xy *= normalScale;
                if (vNormalMapUv.x > .08 && vNormalMapUv.x < .38 && vNormalMapUv.y > .42 && vNormalMapUv.y < .465) {
                  vec2 markUv = vec2((vNormalMapUv.x - .08) / .30, (vNormalMapUv.y - .42) / .045);
                  float left = texture2D(cartridgeLogo, markUv - vec2(.003, 0.)).a;
                  float right = texture2D(cartridgeLogo, markUv + vec2(.003, 0.)).a;
                  float down = texture2D(cartridgeLogo, markUv - vec2(0., .018)).a;
                  float up = texture2D(cartridgeLogo, markUv + vec2(0., .018)).a;
                  mapN.xy += vec2(left - right, down - up) * .4;
                }
              `)}
            `)
            shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', ShaderChunk.aomap_fragment.replaceAll('texture2D( aoMap, vAoMapUv )', 'cleanCartSample(aoMap, vAoMapUv)'))
            shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', ShaderChunk.roughnessmap_fragment.replaceAll('texture2D( roughnessMap, vRoughnessMapUv )', 'cleanCartSample(roughnessMap, vRoughnessMapUv)'))
            shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>', ShaderChunk.metalnessmap_fragment.replaceAll('texture2D( metalnessMap, vMetalnessMapUv )', 'cleanCartSample(metalnessMap, vMetalnessMapUv)'))
          }
          return result
        }
        if (material.name === 'Main' && material instanceof MeshStandardMaterial) {
          const result = material.clone()
          result.onBeforeCompile = (shader) => {
            shader.uniforms.serialLabel = { value: serialLabel }
            shader.fragmentShader = `uniform sampler2D serialLabel;
              vec4 cleanSerialSample(sampler2D source, vec2 uv) {
                vec4 original = texture2D(source, uv);
                float blend = smoothstep(.796, .798, uv.x) * (1.0 - smoothstep(.812, .814, uv.x))
                  * smoothstep(.002, .007, uv.y) * (1.0 - smoothstep(.112, .118, uv.y));
                return mix(original, texture2D(source, vec2(uv.x, .0645)), blend);
              }\n` + shader.fragmentShader
            shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
              #ifdef USE_MAP
                vec2 bodyUv = vMapUv;
                if (bodyUv.x > .08 && bodyUv.x < .32 && bodyUv.y > .355 && bodyUv.y < .39) {
                  bodyUv.x = .35 + (bodyUv.x - .08) * .4;
                  bodyUv.y -= .05;
                }
                if (bodyUv.x > .60 && bodyUv.x < .72 && bodyUv.y > .73 && bodyUv.y < .90) {
                  bodyUv.x = .35 + (bodyUv.x - .60) * .5;
                  bodyUv.y = .30 + (bodyUv.y - .73) * .2;
                }
                vec4 sampledDiffuseColor = cleanSerialSample(map, bodyUv);
                if (vMapUv.x > .795 && vMapUv.x < .815 && vMapUv.y < .13) {
                  vec4 serial = texture2D(serialLabel, vec2(1.0 - vMapUv.y / .13, (vMapUv.x - .795) / .02));
                  sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * vec3(.22, .24, .55), serial.a * .85);
                }
                diffuseColor *= sampledDiffuseColor;
              #endif
            `)
            shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv )', 'cleanSerialSample(normalMap, vNormalMapUv)'))
            shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', ShaderChunk.aomap_fragment.replaceAll('texture2D( aoMap, vAoMapUv )', 'cleanSerialSample(aoMap, vAoMapUv)'))
            shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', ShaderChunk.roughnessmap_fragment.replaceAll('texture2D( roughnessMap, vRoughnessMapUv )', 'cleanSerialSample(roughnessMap, vRoughnessMapUv)'))
            shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>', ShaderChunk.metalnessmap_fragment.replaceAll('texture2D( metalnessMap, vMetalnessMapUv )', 'cleanSerialSample(metalnessMap, vMetalnessMapUv)'))
          }
          return result
        }
        return material
      }
      object.material = Array.isArray(object.material) ? object.material.map(updateMaterial) : updateMaterial(object.material)
    })
    for (const [name, control] of [['a_low_External_0', 'b'], ['b_low_External_0', 'a'], ['movement_low_External_0', 'dpad'], ['movementknobs_low_External_0', 'dpad']] as const) {
      const object = model.getObjectByName(name)
      if (object) buttons.set(control, [...(buttons.get(control) ?? []), { object, z: object.position.z }])
    }
    if (selectMesh?.parent) {
      const source = selectMesh
      const parent = selectMesh.parent
      const position = source.geometry.getAttribute('position')
      const index = source.geometry.getIndex()
      if (index) {
        const left: number[] = [], right: number[] = []
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
          ;((position.getX(a) + position.getX(b) + position.getX(c)) / 3 < -5.046 ? left : right).push(a, b, c)
        }
        for (const [control, indices] of [['select', left], ['start', right]] as const) {
          const part = source.clone()
          part.name = `control_${control}`
          part.geometry = source.geometry.clone()
          part.geometry.setIndex(indices)
          parent.add(part)
          buttons.set(control, [{ object: part, z: part.position.z }])
        }
        source.visible = false
        source.raycast = () => {}
      }
    }
    if (debug) console.info('Materiais do modelo:', [...names].sort())
    model.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(baseMesh!)
    const screenBounds = new Box3().setFromObject(screenMesh!)
    const cartridgeBounds = new Box3()
    for (const part of cartridgeParts) cartridgeBounds.union(new Box3().setFromObject(part))
    const cartridgePivot = new Group()
    cartridgePivot.position.copy(model.worldToLocal(cartridgeBounds.getCenter(new Vector3())))
    model.add(cartridgePivot)
    model.updateMatrixWorld(true)
    for (const part of cartridgeParts) cartridgePivot.attach(part)
    return { model, center: bounds.getCenter(new Vector3()), screen, screenBounds, cartridgePivot, cartridgeY: cartridgePivot.position.y, buttons, dpad }
  }, [scene, cartridgeLogo, cartridgeArt, cartridgeGlint, serialLabel, progress])
  const logo = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 720; canvas.height = 150
    const context = canvas.getContext('2d')!
    context.fillStyle = '#343c86'
    context.font = 'italic 500 120px Arial, sans-serif'
    context.fillText('Andrde', 8, 115)
    const width = context.measureText('Andrde').width
    context.font = '500 35px Arial, sans-serif'
    context.fillText('™', width + 22, 48)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])
  useLayoutEffect(() => {
    let active = true
    const textures = new Set<Texture>([cartridgeArt, cartridgeLogo, serialLabel, logo])
    model.traverse((object) => {
      if (!(object instanceof Mesh) || !object.visible) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
      }
    })
    try {
      for (const texture of textures) gl.initTexture(texture)
      void gl.compileAsync(model, camera, renderScene).catch(() => {}).finally(() => { if (active) onReady(true) })
    } catch {
      onReady(true)
    }
    return () => { active = false }
  }, [camera, cartridgeArt, cartridgeLogo, gl, logo, model, onReady, renderScene, serialLabel])
  useEffect(() => () => { logo.dispose(); cartridgeLogo.dispose(); serialLabel.dispose() }, [logo, cartridgeLogo, serialLabel])
  useEffect(() => () => { document.body.style.cursor = '' }, [])
  function playSound(kind: 'insert' | 'power' | 'move') {
    const sound = clickSound.current
    if (!soundPreference.current || sound?.context.state !== 'running') return
    const { context, noise } = sound
    const volume = context.createGain()
    const start = context.currentTime
    if (kind === 'insert') {
      const source = context.createBufferSource()
      const filter = context.createBiquadFilter()
      source.buffer = noise
      filter.type = 'lowpass'; filter.frequency.value = 1400
      volume.gain.setValueAtTime(.18, start)
      volume.gain.exponentialRampToValueAtTime(.001, start + .045)
      source.connect(filter).connect(volume).connect(context.destination)
      source.start(start); source.stop(start + .045)
    } else {
      const oscillator = context.createOscillator()
      const duration = kind === 'power' ? .16 : .055
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(kind === 'power' ? 440 : 620, start)
      if (kind === 'power') oscillator.frequency.setValueAtTime(660, start + .08)
      volume.gain.setValueAtTime(.035, start)
      volume.gain.exponentialRampToValueAtTime(.001, start + duration)
      oscillator.connect(volume).connect(context.destination)
      oscillator.start(start); oscillator.stop(start + duration)
    }
  }
  useEffect(() => {
    let active = true
    const prepareSound = (feedback: boolean) => {
      try {
        if (!clickSound.current) {
          const context = new AudioContext()
          const noise = context.createBuffer(1, Math.ceil(context.sampleRate * .045), context.sampleRate)
          const samples = noise.getChannelData(0)
          for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
          clickSound.current = { context, noise }
        }
        const context = clickSound.current.context
        const ready = () => {
          if (!active || !soundPreference.current || context.state !== 'running') return
          if (feedback) playSound('move')
        }
        if (context.state === 'running') ready()
        else if (context.state === 'suspended') void context.resume().then(ready).catch(() => {})
      } catch { /* O encaixe continua funcionando sem áudio. */ }
    }
    const enableSound = () => {
      soundPreference.current = true
      onSoundReady(true)
      prepareSound(true)
    }
    const disableSound = () => {
      soundPreference.current = false
      onSoundReady(false)
    }
    const moveSound = () => playSound('move')
    window.addEventListener('portfolio-enable-sound', enableSound)
    window.addEventListener('portfolio-disable-sound', disableSound)
    window.addEventListener('portfolio-move-sound', moveSound)
    return () => {
      active = false
      window.removeEventListener('portfolio-enable-sound', enableSound)
      window.removeEventListener('portfolio-disable-sound', disableSound)
      window.removeEventListener('portfolio-move-sound', moveSound)
      if (clickSound.current) void clickSound.current.context.close().catch(() => {})
      clickSound.current = null
    }
  }, [onSoundReady, soundPreference])
  const corners = useMemo(() => [new Vector3(), new Vector3(), new Vector3(), new Vector3()], [])
  useFrame(({ pointer, camera, size }, delta) => {
    if (!group.current) return
    const speed = 1 - Math.exp(-delta * 5)
    const difference = progress.current - animatedProgress.current
    const step = Math.min(Math.abs(difference), .65 * Math.min(delta, .05))
    let nextProgress = reduced ? progress.current : animatedProgress.current + Math.sign(difference) * step
    if (!reduced && difference > 0) {
      if (animatedProgress.current < .7 && nextProgress > .7) nextProgress = .7
      else if (animatedProgress.current === .7 && impactTime.current < .4) nextProgress = .7
    }
    animatedProgress.current = nextProgress
    const p = animatedProgress.current
    const isReady = p >= .98
    if (isReady !== displayedReady.current) { displayedReady.current = isReady; onIntroReady(isReady) }
    const rise = MathUtils.smoothstep(p, .08, .48)
    const insert = MathUtils.smootherstep(p, .42, .7)
    const spin = reduced ? 0 : MathUtils.smootherstep(p, 0, .38)
    const turn = MathUtils.smoothstep(p, .7, .94)
    if (previousProgress.current < .7 && p >= .7) {
      if (!reduced) impactTime.current = 0
      playSound('insert')
    }
    if (previousProgress.current < .91 && p >= .91) playSound('power')
    if (screen && (previousProgress.current > .91) !== (p > .91)) screen.color.set(p > .91 ? '#718d28' : '#172d18')
    previousProgress.current = p
    impactTime.current += delta
    const impact = reduced || impactTime.current > .45 ? 0 : Math.sin(impactTime.current * 42) * Math.exp(-impactTime.current * 11)
    group.current.position.y = reduced ? 0 : -7 * (1 - rise) - impact * .055
    const x = reduced ? 0 : -pointer.y * Math.PI / 30 * turn
    const y = reduced ? 0 : Math.PI * (1 - turn) + pointer.x * Math.PI / 30 * turn
    group.current.rotation.x += (x - group.current.rotation.x) * speed
    group.current.rotation.y = y
    group.current.rotation.z = impact * .006
    const cartridgeOffset = reduced ? 0 : 7 * (1 - rise) + 2.1 * rise - insert * .75 - 1.35
    cartridgePivot.position.y = cartridgeY + cartridgeOffset / 32.2
    cartridgePivot.rotation.y = spin * Math.PI * 2
    cartridgePivot.rotation.x = -.08 * Math.sin(spin * Math.PI)
    cartridgePivot.rotation.z = .06 * Math.sin(spin * Math.PI)
    cartridgeGlint.value = spin
    for (const [control, parts] of buttons) {
      const isPressed = control === 'dpad' ? ['up', 'down', 'left', 'right'].includes(pressed.current ?? '') : pressed.current === control
      for (const part of parts) part.object.position.z = part.z - (isPressed && !reduced ? .45 : 0)
    }
    if (screenElement.current && p >= .98 && !debug) {
      group.current.updateWorldMatrix(true, false)
      const middleX = (screenBounds.min.x + screenBounds.max.x) / 2
      const middleY = (screenBounds.min.y + screenBounds.max.y) / 2
      const halfWidth = (screenBounds.max.x - screenBounds.min.x) * .46
      const halfHeight = (screenBounds.max.y - screenBounds.min.y) * .46
      const left = (middleX - halfWidth - center.x) * 32.2, right = (middleX + halfWidth - center.x) * 32.2
      const top = (middleY + halfHeight - center.y) * 32.2, bottom = (middleY - halfHeight - center.y) * 32.2
      const front = (screenBounds.max.z - center.z) * 32.2 + .005
      corners[0].set(left, top, front); corners[1].set(right, top, front); corners[2].set(right, bottom, front); corners[3].set(left, bottom, front)
      for (const corner of corners) {
        group.current.localToWorld(corner).project(camera)
        corner.set((corner.x + 1) * size.width / 2, (1 - corner.y) * size.height / 2, 0)
      }
      const [a, b, c, d] = corners
      const dx1 = b.x - c.x, dx2 = d.x - c.x, dy1 = b.y - c.y, dy2 = d.y - c.y
      const sx = a.x - b.x + c.x - d.x, sy = a.y - b.y + c.y - d.y
      const denominator = dx1 * dy2 - dx2 * dy1
      const g = denominator ? (sx * dy2 - dx2 * sy) / denominator : 0
      const h = denominator ? (dx1 * sy - sx * dy1) / denominator : 0
      screenElement.current.style.transform = `matrix3d(${(b.x-a.x+g*b.x)/280}, ${(b.y-a.y+g*b.y)/280}, 0, ${g/280}, ${(d.x-a.x+h*d.x)/255}, ${(d.y-a.y+h*d.y)/255}, 0, ${h/255}, 0, 0, 1, 0, ${a.x}, ${a.y}, 0, 1)`
    }
  })
  function hover(event: ThreeEvent<PointerEvent>) {
    if (!debug) return
    event.stopPropagation()
    const mesh = event.object as Mesh
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    onHover(material?.name || 'Sem material')
    document.body.style.cursor = 'crosshair'
  }
  function controlAt(event: ThreeEvent<PointerEvent>): Control | null {
    const name = event.object.name
    if (name === 'a_low_External_0') return 'b'
    if (name === 'b_low_External_0') return 'a'
    if (name === 'control_start') return 'start'
    if (name === 'control_select') return 'select'
    if ((name === 'movement_low_External_0' || name === 'movementknobs_low_External_0') && dpad) {
      const point = dpad.worldToLocal(event.point.clone())
      return Math.abs(point.x) > Math.abs(point.y) ? (point.x < 0 ? 'left' : 'right') : (point.y < 0 ? 'down' : 'up')
    }
    return null
  }
  return <group ref={group} onPointerMove={debug ? hover : undefined} onPointerOut={debug ? () => { onHover(''); document.body.style.cursor = '' } : undefined}
    onPointerDown={!debug && controlsReady ? (event) => { const control = controlAt(event); if (!control) return; event.stopPropagation(); pressed.current = control; (event.target as Element).setPointerCapture(event.pointerId) } : undefined}
    onPointerUp={!debug && controlsReady ? (event) => { if (!pressed.current) return; event.stopPropagation(); const control = pressed.current; pressed.current = null; (event.target as Element).releasePointerCapture(event.pointerId); onControl(control) } : undefined}
    onPointerCancel={() => { pressed.current = null }}>
    <group scale={32.2}><primitive object={model} position={[-center.x, -center.y, -center.z]} /></group>
    {!debug && <mesh position={[-.56, -.05, .58]}><planeGeometry args={[1.45, .3]} /><meshBasicMaterial map={logo} transparent depthWrite={false} /></mesh>}
  </group>
}

export default function Preview3D() {
  const [hover, setHover] = useState('')
  const [sceneReady, setSceneReady] = useState(false)
  const [soundReady, setSoundReady] = useState(false)
  const soundPreference = useRef(soundReady)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState(0)
  const progress = useRef(0)
  const screenElement = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let distance = 0
    const onScroll = () => {
      progress.current = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 1
    }
    const onResize = () => { distance = document.documentElement.scrollHeight - window.innerHeight; onScroll() }
    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize) }
  }, [])
  function openPortfolio(section = 'projetos') {
    try { sessionStorage.setItem('portfolio-intro', 'seen') } catch { /* O conteúdo continua disponível. */ }
    if (window.location.pathname === '/') {
      history.replaceState(null, '', `/#${section}`)
      window.location.reload()
    } else window.location.assign(`/#${section}`)
  }
  function useControl(control: Control) {
    if (control === 'a' || control === 'start') { openPortfolio(sections[selected].id); return }
    if (control === 'select') {
      try { localStorage.setItem('portfolio-theme', localStorage.getItem('portfolio-theme') === 'dark' ? 'light' : 'dark') } catch { /* O menu continua acessível. */ }
    } else {
      setSelected((current) => (current + (control === 'down' || control === 'right' ? 1 : -1) + sections.length) % sections.length)
    }
    window.dispatchEvent(new Event('portfolio-move-sound'))
  }
  useEffect(() => {
    if (!ready) return
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        useControl(({ ArrowDown: 'down', ArrowUp: 'up', ArrowLeft: 'left', ArrowRight: 'right' } as const)[event.key])
      } else if ((event.key === 'Enter' || event.key.toLowerCase() === 'x') && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault(); useControl('a')
      } else if (event.key.toLowerCase() === 'z' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault(); useControl('b')
      } else if (event.key === 'Shift') {
        event.preventDefault(); useControl('select')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, selected])
  return <main className="preview-3d">
    <div className="preview-stage">
    <button className="preview-skip" onClick={() => openPortfolio()}>Pular intro ↗</button>
    {sceneReady && <button className="preview-sound" aria-pressed={soundReady} onClick={() => window.dispatchEvent(new Event(soundReady ? 'portfolio-disable-sound' : 'portfolio-enable-sound'))}>{soundReady ? 'Desativar som' : 'Ativar som'} ♪</button>}
    <SceneError><Canvas dpr={[1, 2]} camera={{ position: [0, 0, 10.8], fov: 30, near: .1, far: 100 }} fallback={<WebGLFallback onReady={setSceneReady} />}>
      <CameraFit />
      <Suspense fallback={null}>
        <ambientLight intensity={.65} />
        <directionalLight position={[4, 7, 6]} intensity={1.3} />
        <directionalLight position={[-5, 2, 3]} intensity={.45} />
        <Environment resolution={128}><Lightformer intensity={2} position={[0, 4, 5]} scale={[8, 4, 1]} /><Lightformer intensity={1} position={[-5, 0, 3]} scale={[4, 6, 1]} /></Environment>
        <Console onHover={setHover} onReady={setSceneReady} onIntroReady={setReady} onSoundReady={setSoundReady} onControl={useControl} controlsReady={ready} soundPreference={soundPreference} progress={progress} screenElement={screenElement} />
        <ContactShadows position={[0, -2.42, 0]} opacity={.35} scale={8} blur={2} far={4} resolution={256} smooth={false} />
      </Suspense>
    </Canvas><Loading ready={sceneReady} /></SceneError>
    {ready && !debug && <div ref={screenElement} className="console-menu" aria-label="Menu do portfólio">
      <div className="menu-content"><div className="menu-title">LUCIANO ANDRADE FILHO</div><div className="menu-ribbon">PORTFÓLIO</div>
        <div className="menu-options" role="listbox" aria-label="Escolha uma seção" aria-activedescendant={`menu-${sections[selected].id}`}>
          {sections.map((section, index) => <button id={`menu-${section.id}`} role="option" aria-selected={selected === index} key={section.id} onFocus={() => { if (selected !== index) window.dispatchEvent(new Event('portfolio-move-sound')); setSelected(index) }} onClick={() => openPortfolio(section.id)}><span aria-hidden="true">{selected === index ? '▶' : '　'}</span> {section.label}</button>)}
        </div>
      </div><div className="menu-prompt">PRESSIONE ENTER OU X</div><span className="menu-live" aria-live="polite">{sections[selected].label}</span>
    </div>}
    {ready && !debug && <div className="preview-touch-controls" aria-label="Controles do menu">
      <button onClick={() => useControl('up')} aria-label="Opção anterior">◀</button>
      <button onClick={() => useControl('a')}>ABRIR</button>
      <button onClick={() => useControl('down')} aria-label="Próxima opção">▶</button>
    </div>}
    {ready && !debug && <nav className="preview-landscape-menu" aria-label="Seções do portfólio">
      {sections.map((section, index) => <button key={section.id} aria-current={selected === index ? 'true' : undefined} onClick={() => openPortfolio(section.id)}>{section.label}</button>)}
    </nav>}
    <span className="preview-hint">{ready ? 'SETAS + ENTER · OU TOQUE NA TELA' : 'ROLE PARA INSERIR O CARTUCHO ↓'}</span>
    {debug && <output className="preview-debug">{hover || 'Passe o cursor sobre um material'}</output>}
    </div>
  </main>
}

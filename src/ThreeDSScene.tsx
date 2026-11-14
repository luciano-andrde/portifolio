import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Box3, CanvasTexture, Color, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Quaternion, SRGBColorSpace, Texture, Vector3 } from 'three'
import { createThreeDSCard, THREE_DS_CARD_HEIGHT } from './three-ds-card'
import type { MediaAnchor } from './media-anchor'

export default function ThreeDSScene({ active, progress, cameraDistance, cardAnchor, screenElement, onReady, onIntroReady, exitProgress, onEntered }: { exitProgress: RefObject<number>, onEntered: () => void, active: boolean, progress: RefObject<number>, cameraDistance: RefObject<number>, cardAnchor: RefObject<MediaAnchor>, screenElement: RefObject<HTMLDivElement | null>, onReady: (ready: boolean) => void, onIntroReady: (ready: boolean) => void }) {
  const { scene } = useGLTF('/models/andrde-eds-rigged.glb')
  const { scene: cardScene } = useGLTF('/models/cartucho-3ds-otimizado.glb')
  const artwork = useTexture('/images/rotulo-3ds-novo.webp')
  const cardArtwork = useTexture('/images/rotulo-eds-cartucho.webp')
  const { gl, camera, scene: renderScene } = useThree()
  const consoleGroup = useRef<Group>(null)
  const cardGroup = useRef<Group>(null)
  const lowerScreen = useRef<Mesh>(null)
  const upperScreen = useRef<Mesh>(null)
  const wasReady = useRef(false)
  const cameraOwned = useRef(false)
  const previousProgress = useRef(0)
  const impactTime = useRef(1)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const { model, center, size, upper, base, insertionAxis } = useMemo(() => {
    const model = scene.clone(true)
    model.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(model)
    const base = model.getObjectByName('ds_Low1_LowerScreen_Low')!
    const upper = model.getObjectByName('EDS_Hinge')!
    for (const child of [...base.children]) {
      if (!(child instanceof Mesh)) continue
      if (child.material instanceof MeshStandardMaterial) {
        const material = child.material.clone()
        material.metalness = .08
        material.roughness = .48
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            #include <map_fragment>
            #ifdef USE_MAP
              float red = smoothstep(.06, .30, diffuseColor.r - max(diffuseColor.g, diffuseColor.b));
              float gray = dot(diffuseColor.rgb, vec3(.299, .587, .114));
              vec3 muted = mix(diffuseColor.rgb, vec3(gray), .3) * .58;
              diffuseColor.rgb = mix(diffuseColor.rgb, muted, red);
              vec2 cell = floor(vMapUv * vec2(210.0, 160.0));
              vec2 mark = fract(vMapUv * vec2(210.0, 160.0)) - .5;
              float seed = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
              float scratch = (1.0 - smoothstep(.015, .05, abs(mark.y + mark.x * .3))) * (1.0 - smoothstep(.12, .42, abs(mark.x))) * step(.985, seed);
              diffuseColor.rgb += vec3(.018) * scratch;
            #endif
          `)
        }
        material.customProgramCacheKey = () => '3ds-muted-wear'
        child.material = material
      }
    }
    const insertionAxis = new Vector3(0, 0, 1).transformDirection(base.matrixWorld)
    return { model, center: bounds.getCenter(new Vector3()), size: bounds.getSize(new Vector3()), upper, base, insertionAxis }
  }, [scene])
  const card = useMemo(() => createThreeDSCard(cardScene, cardArtwork, Math.min(8, gl.capabilities.getMaxAnisotropy())), [cardScene, cardArtwork, gl])
  const topTexture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 960
    const context = canvas.getContext('2d')!
    const background = context.createLinearGradient(0, 0, 0, 960)
    background.addColorStop(0, '#f9f8f5'); background.addColorStop(1, '#deddda')
    context.fillStyle = background; context.fillRect(0, 0, 1600, 960)
    context.strokeStyle = 'rgba(110,105,100,.08)'; context.lineWidth = 2
    for (let y = 0; y < 960; y += 24) { context.beginPath(); context.moveTo(0, y); context.lineTo(1600, y); context.stroke() }
    context.fillStyle = '#8f4b50'; context.fillRect(0, 0, 1600, 14)
    context.save(); context.beginPath(); context.roundRect(64, 64, 555, 832, 20); context.clip()
    context.drawImage(artwork.image as CanvasImageSource, 64, 64, 555, 832); context.restore()
    context.fillStyle = '#8f4b50'; context.font = '600 38px sans-serif'; context.fillText('ANDRDE EDS', 700, 240)
    context.fillStyle = '#383638'; context.font = '700 88px sans-serif'
    context.fillText('Luciano', 700, 410); context.fillText('Andrade', 700, 515); context.fillText('Filho', 700, 620)
    context.fillStyle = '#787171'; context.font = '40px sans-serif'; context.fillText('Portfólio', 704, 755)
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); return texture
  }, [artwork, gl])
  useEffect(() => () => topTexture.dispose(), [topTexture])
  const scratch = useMemo(() => ({ position: new Vector3(), slot: new Vector3(), direction: new Vector3(), up: new Vector3(), camera: new Vector3(), target: new Vector3(), forward: new Vector3(0, 0, 1), orientation: new Quaternion(), cameraTurn: new Quaternion(), cameraBlend: new Quaternion(), cardTurn: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2), identity: new Quaternion(), corners: [new Vector3(), new Vector3(), new Vector3(), new Vector3()] }), [])

  useLayoutEffect(() => {
    let mounted = true
    const textures = new Set<Texture>([topTexture])
    model.traverse((object) => { if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value) })
    try { textures.forEach((texture) => gl.initTexture(texture)); void gl.compileAsync(model, camera, renderScene).catch(() => {}).finally(() => { if (mounted) onReady(true) }) }
    catch { onReady(true) }
    return () => { mounted = false }
  }, [camera, gl, model, onReady, renderScene, topTexture])

  const screenOff = useMemo(() => new Color('#080b0d'), [])
  const screenOn = useMemo(() => new Color('#ffffff'), [])
  useFrame(({ size: viewport }, delta) => {
    if (!consoleGroup.current || !cardGroup.current || !lowerScreen.current || !upperScreen.current) return
    if (!active) {
      consoleGroup.current.visible = false; cardGroup.current.visible = false
      previousProgress.current = 0
      impactTime.current = 1
      if (cameraOwned.current) { camera.quaternion.identity(); camera.position.set(0, 0, cameraDistance.current); cameraOwned.current = false }
      return
    }
    cameraOwned.current = true
    const p = progress.current
    if (p < .66) impactTime.current = 1
    if (previousProgress.current < .68 && p >= .68) impactTime.current = 0
    previousProgress.current = p
    impactTime.current = Math.min(1, impactTime.current + Math.min(delta, .05))
    const impact = reduced ? 0 : Math.sin(Math.min(1, impactTime.current / .32) * Math.PI) * Math.exp(-impactTime.current * 6)
    const ready = p >= .99
    if (ready !== wasReady.current) { wasReady.current = ready; onIntroReady(ready) }
    const perspective = camera as PerspectiveCamera
    const height = 2 * cameraDistance.current * Math.tan(perspective.fov * Math.PI / 360)
    const width = height * viewport.width / viewport.height
    const scale = Math.min(5.4, width * .8, height * .7) / size.x
    const reveal = reduced ? (p > 0 ? 1 : 0) : MathUtils.smootherstep(p, .32, .52)
    const align = reduced ? 1 : MathUtils.smootherstep(p, .33, .55)
    // The last part of the travel catches on the latch before snapping into place.
    const insert = reduced ? 1 : .88 * MathUtils.smootherstep(p, .55, .645) + .12 * MathUtils.smootherstep(p, .66, .68)
    const open = reduced ? (p > 0 ? 1 : 0) : MathUtils.smootherstep(p, .78, .97)
    upper.rotation.x = (1 - open) * 2.62
    consoleGroup.current.visible = true
    consoleGroup.current.scale.setScalar(scale)
    consoleGroup.current.position.set(0, MathUtils.lerp(-height / 2 - size.length() * scale / 2, -.15, reveal), 0).addScaledVector(insertionAxis, impact * .075)
    consoleGroup.current.rotation.set(impact * .012, 0, 0)
    consoleGroup.current.updateWorldMatrix(true, true)
    const anchor = cardAnchor.current
    const cardHeight = MathUtils.lerp(anchor.ready ? anchor.scale.x * THREE_DS_CARD_HEIGHT / 32.2 : 1.2, size.x * scale * .23, align)
    cardGroup.current.visible = p >= .32
    cardGroup.current.scale.setScalar(cardHeight)
    scratch.slot.set(0, -2.95, -3).applyMatrix4(base.matrixWorld)
    scratch.direction.set(0, 0, -1).transformDirection(base.matrixWorld)
    scratch.position.copy(scratch.slot).addScaledVector(scratch.direction, cardHeight * (1.2 - insert * 1.72 - impact * .075))
    cardGroup.current.position.set(anchor.ready ? anchor.position.x : 0, anchor.ready ? anchor.position.y : 0, anchor.ready ? anchor.position.z : 0).lerp(scratch.position, align)
    base.getWorldQuaternion(scratch.orientation).multiply(scratch.cardTurn)
    cardGroup.current.quaternion.copy(anchor.ready ? anchor.rotation : scratch.identity).slerp(scratch.orientation, align)
    const close = reduced ? 0 : MathUtils.smootherstep(p, .36, .57) * (1 - MathUtils.smootherstep(p, .71, .9))
    scratch.up.set(0, 1, 0).transformDirection(base.matrixWorld)
    scratch.camera.copy(scratch.direction).multiplyScalar(.48).addScaledVector(scratch.up, .3).normalize()
    scratch.cameraTurn.setFromUnitVectors(scratch.forward, scratch.camera)
    scratch.cameraBlend.copy(scratch.identity).slerp(scratch.cameraTurn, close)
    const settle = reduced ? 1 : MathUtils.smootherstep(p, .87, 1)
    const finalDistance = Math.max(.7, size.x * scale / (width * .91), size.y * scale / (height * .78))
    scratch.target.set(0, -.15 * settle, 0).lerp(scratch.slot, close)
    const distance = MathUtils.lerp(MathUtils.lerp(.9, finalDistance, settle), .58, close) + .35 * Math.sin(Math.PI * close)
    camera.position.copy(scratch.forward).applyQuaternion(scratch.cameraBlend).multiplyScalar(cameraDistance.current * distance).add(scratch.target)
    camera.position.addScaledVector(scratch.up, impact * .018)
    camera.lookAt(scratch.target)
    const lit = MathUtils.smootherstep(p, .93, .99)
    ;(lowerScreen.current.material as MeshBasicMaterial).color.copy(screenOff).lerp(screenOn, lit)
    ;(upperScreen.current.material as MeshBasicMaterial).color.copy(screenOff).lerp(screenOn, lit)
    if (exitProgress.current > 0) {
      exitProgress.current = Math.min(1, exitProgress.current + Math.min(delta, .05) / .8)
      const zoom = MathUtils.smootherstep(exitProgress.current, 0, 1)
      lowerScreen.current.getWorldPosition(scratch.position)
      camera.position.lerp(scratch.position, zoom * .65)
      scratch.target.lerp(scratch.position, zoom)
      camera.lookAt(scratch.target)
      if (screenElement.current) screenElement.current.style.opacity = String(1 - MathUtils.smootherstep(zoom, .65, 1))
      if (exitProgress.current === 1) onEntered()
    }
    camera.updateMatrixWorld()
    if (screenElement.current && ready) {
      const corners = scratch.corners
      corners[0].set(-26.3, 19.795, 0); corners[1].set(26.3, 19.795, 0); corners[2].set(26.3, -19.795, 0); corners[3].set(-26.3, -19.795, 0)
      lowerScreen.current.updateWorldMatrix(true, false)
      for (const corner of corners) { lowerScreen.current.localToWorld(corner).project(camera); corner.set((corner.x + 1) * viewport.width / 2, (1 - corner.y) * viewport.height / 2, 0) }
      const [a, b, c, d] = corners
      const dx1 = b.x - c.x, dx2 = d.x - c.x, dy1 = b.y - c.y, dy2 = d.y - c.y
      const sx = a.x - b.x + c.x - d.x, sy = a.y - b.y + c.y - d.y
      const denominator = dx1 * dy2 - dx2 * dy1
      const g = denominator ? (sx * dy2 - dx2 * sy) / denominator : 0, h = denominator ? (dx1 * sy - sx * dy1) / denominator : 0
      screenElement.current.style.transform = `matrix3d(${(b.x-a.x+g*b.x)/560}, ${(b.y-a.y+g*b.y)/560}, 0, ${g/560}, ${(d.x-a.x+h*d.x)/420}, ${(d.y-a.y+h*d.y)/420}, 0, ${h/420}, 0, 0, 1, 0, ${a.x}, ${a.y}, 0, 1)`
    }
  })

  return <>
    <group ref={consoleGroup} visible={false}><primitive object={model} position={[-center.x, -center.y, -center.z]} /></group>
    <group ref={cardGroup} visible={false}><primitive object={card} /></group>
    {createPortal(<mesh ref={lowerScreen} position={[0, 1.73, 24.395]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[52.6, 39.59]} /><meshBasicMaterial color="#090e12" /></mesh>, base)}
    {createPortal(<group position={[0, -2.95, -3.35]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0, -7]}><boxGeometry args={[28, 4.6, 1]} /><meshStandardMaterial color="#09080b" roughness={.85} /></mesh>
      <mesh position={[0, 2.3, -3]}><boxGeometry args={[29, .8, 8]} /><meshStandardMaterial color="#29272a" roughness={.5} /></mesh>
      <mesh position={[0, -2.3, -3]}><boxGeometry args={[29, .8, 8]} /><meshStandardMaterial color="#29272a" roughness={.5} /></mesh>
      <mesh position={[-14, 0, -3]}><boxGeometry args={[1, 4.6, 8]} /><meshStandardMaterial color="#29272a" roughness={.5} /></mesh>
      <mesh position={[14, 0, -3]}><boxGeometry args={[1, 4.6, 8]} /><meshStandardMaterial color="#29272a" roughness={.5} /></mesh>
    </group>, base)}
    {createPortal(<mesh ref={upperScreen} position={[0, 12.75, -20.375]} rotation={[-Math.PI / 3, 0, 0]}><planeGeometry args={[70.17, 41.77]} /><meshBasicMaterial map={topTexture} color="#080b0d" /></mesh>, upper)}
  </>
}

import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Color, Group, MathUtils, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Texture, Vector3 } from 'three'
import { createUMD, UMD_DISPLAY_HEIGHT } from './umd'
import type { MediaAnchor } from './media-anchor'
import PSPDrive from './PSPDrive'

export default function PSPScene({ active, progress, cameraDistance, mediaAnchor, screenElement, onReady, onIntroReady, exitProgress, onEntered }: {
  active: boolean, progress: RefObject<number>, cameraDistance: RefObject<number>, mediaAnchor: RefObject<MediaAnchor>,
  screenElement: RefObject<HTMLDivElement | null>, onReady: (ready: boolean) => void, onIntroReady: (ready: boolean) => void,
  exitProgress: RefObject<number>, onEntered: () => void,
}) {
  const { scene } = useGLTF('/models/psp-otimizado.glb')
  const { scene: discScene } = useGLTF('/models/umd-otimizado.glb')
  const artwork = useTexture('/images/psp-urban-umd-v2.webp')
  const { gl, camera, scene: renderScene } = useThree()
  const consoleGroup = useRef<Group>(null)
  const discGroup = useRef<Group>(null)
  const carrier = useRef<Group>(null)
  const screen = useRef<Mesh>(null)
  const wasReady = useRef(false)
  const cameraOwned = useRef(false)
  const previousProgress = useRef(0)
  const impactTime = useRef(1)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const { model, hinge } = useMemo(() => {
    const model = scene.clone(true)
    model.getObjectByName('screen_low_sony_psp_0')!.visible = false
    const hinge = model.getObjectByName('PSP_UMD_Hinge')!
    return { model, hinge }
  }, [scene])
  const disc = useMemo(() => createUMD(discScene, artwork, Math.min(8, gl.capabilities.getMaxAnisotropy())), [discScene, artwork, gl])
  const scratch = useMemo(() => ({
    point: new Vector3(), target: new Vector3(), screenCenter: new Vector3(), orientation: new Quaternion(), identity: new Quaternion(),
    seated: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    off: new Color('#030609'), on: new Color('#315a81'), corners: [new Vector3(), new Vector3(), new Vector3(), new Vector3()],
  }), [])

  useLayoutEffect(() => {
    let mounted = true
    const textures = new Set<Texture>([artwork])
    model.traverse(object => {
      if (!(object instanceof Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
      }
    })
    const ready = () => { if (mounted) onReady(true) }
    try { textures.forEach(texture => gl.initTexture(texture)); void gl.compileAsync(consoleGroup.current ?? model, camera, renderScene).catch(() => {}).finally(ready) }
    catch { ready() }
    return () => { mounted = false }
  }, [artwork, camera, gl, model, onReady, renderScene])

  useFrame(({ size }, delta) => {
    if (!consoleGroup.current || !discGroup.current || !screen.current || !carrier.current) return
    if (!active) {
      consoleGroup.current.visible = false
      discGroup.current.visible = false
      previousProgress.current = 0
      impactTime.current = 1
      if (cameraOwned.current) { camera.position.set(0, 0, cameraDistance.current); camera.quaternion.identity(); cameraOwned.current = false }
      return
    }
    cameraOwned.current = true
    const p = progress.current
    if (p < .66) impactTime.current = 1
    if (previousProgress.current < .68 && p >= .68) impactTime.current = 0
    previousProgress.current = p
    impactTime.current = Math.min(1, impactTime.current + Math.min(delta, .05))
    const impact = reduced ? 0 : Math.sin(Math.min(1, impactTime.current / .32) * Math.PI) * Math.exp(-impactTime.current * 7)
    const ready = p >= .99
    if (ready !== wasReady.current) { wasReady.current = ready; onIntroReady(ready) }
    const perspective = camera as PerspectiveCamera
    const height = 2 * cameraDistance.current * Math.tan(perspective.fov * Math.PI / 360)
    const width = height * size.width / size.height
    const scale = Math.min(1, width * .86 / 6.2, height * .58 / 2.74)
    const reveal = reduced ? Number(p > 0) : MathUtils.smootherstep(p, .32, .51)
    const align = reduced ? 1 : MathUtils.smootherstep(p, .32, .55)
    const insert = reduced ? 1 : .9 * MathUtils.smootherstep(p, .55, .65) + .1 * MathUtils.smootherstep(p, .665, .68)
    const close = reduced ? 1 : MathUtils.smootherstep(p, .70, .79)
    const turn = reduced ? 1 : MathUtils.smootherstep(p, .79, .955)
    const doorOpen = reduced ? 0 : MathUtils.smootherstep(p, .40, .53) * (1 - close)
    hinge.rotation.x = -.65 * doorOpen
    carrier.current.rotation.x = -.34 * doorOpen
    consoleGroup.current.visible = p >= .32
    consoleGroup.current.scale.setScalar(scale)
    consoleGroup.current.position.set(0, MathUtils.lerp(-height / 2 - 3 * scale, -.2, reveal) - impact * .035, 0)
    consoleGroup.current.rotation.set(-.14 * (1 - turn) + impact * .012, Math.PI * (1 - turn), -.035 * Math.sin(Math.PI * turn))
    consoleGroup.current.updateWorldMatrix(true, true)
    const anchor = mediaAnchor.current
    const discHeight = MathUtils.lerp(anchor.ready ? anchor.scale.x * UMD_DISPLAY_HEIGHT / 32.2 : 1.4, 2.02 * scale, align)
    discGroup.current.visible = p >= .32 && p < .83
    discGroup.current.scale.setScalar(discHeight)
    scratch.point.set(0, 1.12 + 2.8 * (1 - insert) - impact * .025, -.005).applyMatrix4(carrier.current.matrixWorld)
    discGroup.current.position.copy(anchor.position).lerp(scratch.point, align)
    carrier.current.getWorldQuaternion(scratch.orientation).multiply(scratch.seated)
    discGroup.current.quaternion.copy(anchor.ready ? anchor.rotation : scratch.identity).slerp(scratch.orientation, align)
    const focus = reduced ? 0 : MathUtils.smootherstep(p, .39, .56) * (1 - MathUtils.smootherstep(p, .77, .94))
    scratch.point.set(0, .4 + .6 * (1 - insert), -.4).applyMatrix4(consoleGroup.current.matrixWorld)
    scratch.target.set(0, -.12, 0).lerp(scratch.point, focus)
    const finalZoom = MathUtils.lerp(1, Math.max(.88, 6.2 * scale / (width * .91)), turn)
    camera.position.set(scratch.target.x + cameraDistance.current * .34 * focus, scratch.target.y + cameraDistance.current * .43 * focus, cameraDistance.current * MathUtils.lerp(finalZoom, MathUtils.lerp(.84, .72, insert), focus))
    camera.lookAt(scratch.target)
    const lit = MathUtils.smootherstep(p, .94, .985)
    ;(screen.current.material as MeshBasicMaterial).color.copy(scratch.off).lerp(scratch.on, lit)
    if (exitProgress.current > 0) {
      exitProgress.current = Math.min(1, exitProgress.current + Math.min(delta, .05) / .8)
      const zoom = MathUtils.smootherstep(exitProgress.current, 0, 1)
      screen.current.getWorldPosition(scratch.screenCenter)
      camera.position.lerp(scratch.screenCenter, zoom * .72)
      scratch.target.lerp(scratch.screenCenter, zoom)
      camera.lookAt(scratch.target)
      if (screenElement.current) screenElement.current.style.opacity = String(1 - MathUtils.smootherstep(zoom, .65, 1))
      if (exitProgress.current === 1) onEntered()
    }
    camera.updateMatrixWorld()
    if (screenElement.current && ready) {
      const corners = scratch.corners
      corners[0].set(-1.74317, .98009, 0); corners[1].set(1.74317, .98009, 0)
      corners[2].set(1.74317, -.98009, 0); corners[3].set(-1.74317, -.98009, 0)
      screen.current.updateWorldMatrix(true, false)
      for (const corner of corners) { screen.current.localToWorld(corner).project(camera); corner.set((corner.x + 1) * size.width / 2, (1 - corner.y) * size.height / 2, 0) }
      const [a, b, c, d] = corners
      const dx1 = b.x - c.x, dx2 = d.x - c.x, dy1 = b.y - c.y, dy2 = d.y - c.y
      const sx = a.x - b.x + c.x - d.x, sy = a.y - b.y + c.y - d.y
      const determinant = dx1 * dy2 - dx2 * dy1
      const g = determinant ? (sx * dy2 - dx2 * sy) / determinant : 0
      const h = determinant ? (dx1 * sy - sx * dy1) / determinant : 0
      screenElement.current.style.transform = `matrix3d(${(b.x-a.x+g*b.x)/960}, ${(b.y-a.y+g*b.y)/960}, 0, ${g/960}, ${(d.x-a.x+h*d.x)/540}, ${(d.y-a.y+h*d.y)/540}, 0, ${h/540}, 0, 0, 1, 0, ${a.x}, ${a.y}, 0, 1)`
    }
  })

  return <>
    <group ref={consoleGroup} visible={false}>
      <primitive object={model} />
      <PSPDrive door={model.getObjectByName('PSP_UMD_Door') as Mesh} carrier={carrier} />
      <mesh ref={screen} position={[-.00027, .09103, .374]}><planeGeometry args={[3.48634, 1.96018]} /><meshBasicMaterial color="#030609" toneMapped={false} /></mesh>
    </group>
    <group ref={discGroup} visible={false}><primitive object={disc} /></group>
  </>
}

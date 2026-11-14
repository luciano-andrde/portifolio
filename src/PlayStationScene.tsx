import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import { Box3, BufferGeometry, Float32BufferAttribute, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight, Quaternion, Texture, Vector3 } from 'three'
import { createMemoryCard, MEMORY_DISPLAY_HEIGHT, type MemoryAnchor } from './memory-card'

export default function PlayStationScene({ active, progress, cameraDistance, memoryAnchor, onReady, onIntroReady, exitProgress, onEntered }: { active: boolean, progress: RefObject<number>, cameraDistance: RefObject<number>, memoryAnchor: RefObject<MemoryAnchor>, onReady: (ready: boolean) => void, onIntroReady: (ready: boolean) => void, exitProgress: RefObject<number>, onEntered: () => void }) {
  const { scene } = useGLTF('/models/playstation-2-otimizado.glb')
  const { scene: memoryScene } = useGLTF('/models/memory-card-otimizado.glb')
  const { gl, camera, scene: renderScene } = useThree()
  const consoleGroup = useRef<Group>(null)
  const cardGroup = useRef<Group>(null)
  const slotDoor = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const led = useRef<Mesh>(null)
  const wasReady = useRef(false)
  const cameraOwned = useRef(false)
  const previousProgress = useRef(0)
  const impactTime = useRef(Infinity)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const { model, center, dimensions, front, slot, surfaceMaterial, doorText, textMaterial, remainingText } = useMemo(() => {
    const model = scene.clone(true)
    model.rotation.y = Math.PI / 2
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>()
    model.traverse((object) => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return
      const source = object.material
      if (!materials.has(source)) {
        const material = source.clone()
        if (source.name === 'SURFACE') {
          material.roughness = .62
          material.metalness = 0
          material.normalScale.multiplyScalar(.65)
        } else if (source.name === 'white' || source.name === 'marks') {
          material.roughness = .65
          material.metalness = 0
        }
        materials.set(source, material)
      }
      object.material = materials.get(source)!
    })
    model.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(model)
    const center = bounds.getCenter(new Vector3())
    const ports = model.getObjectByName('gamepad_port_SURFACE_0') as Mesh
    const portBounds = new Box3().setFromObject(ports)
    const dimensions = bounds.getSize(new Vector3())
    const slot = new Vector3(portBounds.min.x + (portBounds.max.x - portBounds.min.x) * .25 - center.x, (portBounds.min.y + portBounds.max.y) / 2 - center.y + dimensions.y * .2, 0)
    const lettering = model.getObjectByName('Text004_white_0') as Mesh
    const letters = lettering.geometry.index ? lettering.geometry.toNonIndexed() : lettering.geometry.clone()
    const positions = letters.getAttribute('position')
    const doorVertices: number[] = [], remainingVertices: number[] = []
    const point = new Vector3()
    const splitX = (portBounds.min.x + portBounds.max.x) / 2
    for (let i = 0; i < positions.count; i += 3) {
      point.fromBufferAttribute(positions, i).applyMatrix4(lettering.matrixWorld)
      const onDoor = point.x < splitX
      for (let j = 0; j < 3; j++) {
        point.fromBufferAttribute(positions, i + j)
        if (onDoor) {
          point.applyMatrix4(lettering.matrixWorld)
          doorVertices.push(point.x - center.x - slot.x, point.y - center.y - slot.y - dimensions.y * .041, .43)
        } else remainingVertices.push(point.x, point.y, point.z)
      }
    }
    letters.dispose()
    const geometry = (vertices: number[]) => {
      const result = new BufferGeometry()
      result.setAttribute('position', new Float32BufferAttribute(vertices, 3))
      result.computeVertexNormals()
      return result
    }
    const doorText = geometry(doorVertices)
    const remainingText = geometry(remainingVertices)
    lettering.geometry = remainingText
    return {
      model, center, dimensions, front: bounds.max.z - center.z, slot,
      surfaceMaterial: ports.material, doorText, textMaterial: lettering.material, remainingText,
    }
  }, [scene])
  const card = useMemo(() => createMemoryCard(memoryScene), [memoryScene])
  useEffect(() => () => { doorText.dispose(); remainingText.dispose() }, [doorText, remainingText])
  const rotation = useMemo(() => ({
    target: new Quaternion(),
    fallback: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    seated: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2)).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI)),
    point: new Vector3(), direction: new Vector3(),
    cameraTarget: new Vector3(),
  }), [])

  useLayoutEffect(() => {
    let active = true
    const textures = new Set<Texture>()
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
      }
    })
    const ready = () => { if (active) onReady(true) }
    try {
      textures.forEach((texture) => gl.initTexture(texture))
      void gl.compileAsync(model, camera, renderScene).catch(() => {}).finally(ready)
    } catch { ready() }
    return () => { active = false }
  }, [camera, gl, model, onReady, renderScene])

  useFrame(({ size }, delta) => {
    if (!consoleGroup.current || !cardGroup.current) return
    if (!active) {
      consoleGroup.current.visible = false
      cardGroup.current.visible = false
      if (cameraOwned.current) {
        camera.position.set(0, 0, cameraDistance.current)
        camera.quaternion.identity()
        cameraOwned.current = false
      }
      previousProgress.current = 0
      impactTime.current = Infinity
      return
    }
    const p = progress.current
    cameraOwned.current = true
    if (previousProgress.current < .86 && p >= .86) impactTime.current = 0
    previousProgress.current = p
    impactTime.current += delta
    const impact = reduced || impactTime.current > .45 ? 0 : Math.sin(impactTime.current * 32) * Math.exp(-impactTime.current * 10)
    const ready = p >= .99
    if (ready !== wasReady.current) { wasReady.current = ready; onIntroReady(ready) }
    const perspective = camera as PerspectiveCamera
    const viewportHeight = 2 * cameraDistance.current * Math.tan(perspective.fov * Math.PI / 360)
    const viewportWidth = viewportHeight * size.width / size.height
    const landscape = size.width > size.height && size.height < 550
    const consoleScale = Math.min(4.8, viewportWidth * (landscape ? .46 : .8)) / dimensions.x
    const reveal = reduced ? (p > 0 ? 1 : 0) : MathUtils.smootherstep(p, .32, .52)
    const align = reduced ? 1 : MathUtils.smootherstep(p, .33, .6)
    const insert = reduced ? 1 : MathUtils.smootherstep(p, .62, .86)
    const boot = reduced ? (p > 0 ? 1 : 0) : MathUtils.smootherstep(p, .89, .99)
    const startY = -viewportHeight / 2 - dimensions.length() * consoleScale / 2 - .5
    const consoleY = MathUtils.lerp(startY, -.3, reveal) + boot * viewportHeight * (landscape ? .04 : .13) - impact * .018
    consoleGroup.current.visible = true
    consoleGroup.current.scale.setScalar(consoleScale)
    consoleGroup.current.position.y = consoleY
    consoleGroup.current.position.x = landscape ? -viewportWidth * .25 * boot : 0
    const settle = reduced ? 1 : MathUtils.smootherstep(p, .3, .9)
    consoleGroup.current.rotation.set(MathUtils.lerp(.3, .32, settle), MathUtils.lerp(-.65, -.22, settle), MathUtils.lerp(-.05, 0, settle) + impact * .004)
    consoleGroup.current.updateWorldMatrix(true, false)

    const anchor = memoryAnchor.current
    const cardHeight = MathUtils.lerp(anchor.ready ? anchor.scale.x * MEMORY_DISPLAY_HEIGHT / 32.2 : 1.3, dimensions.x * consoleScale * .16, align)
    cardGroup.current.visible = p >= .32
    cardGroup.current.scale.setScalar(cardHeight)
    rotation.point.set(slot.x, slot.y, front).applyMatrix4(consoleGroup.current.matrixWorld)
    const focus = reduced ? 0 : MathUtils.smootherstep(p, .4, .7) * (1 - boot)
    rotation.cameraTarget.copy(rotation.point).multiplyScalar(focus)
    camera.position.set(rotation.cameraTarget.x + focus * .2, rotation.cameraTarget.y + focus * .12, cameraDistance.current * (1 - focus * (size.width < 650 ? .46 : .4)))
    camera.lookAt(rotation.cameraTarget)
    camera.updateMatrixWorld()
    rotation.direction.set(0, 0, 1).applyQuaternion(consoleGroup.current.quaternion)
    const protrusion = cardHeight * (.95 - insert * .8)
    rotation.point.addScaledVector(rotation.direction, protrusion)
    // The card's leading edge opens the flap only after reaching its front face.
    const penetration = Math.max(0, cardHeight * .5 + consoleScale * .8 - protrusion)
    const doorHeight = dimensions.y * .08 * consoleScale
    if (slotDoor.current) slotDoor.current.rotation.x = Math.min(1.42, Math.atan2(penetration, doorHeight * .5))
    cardGroup.current.position.set(anchor.ready ? anchor.position.x : 0, anchor.ready ? anchor.position.y : 0, anchor.ready ? anchor.position.z : 0).lerp(rotation.point, align)
    if (!reduced) cardGroup.current.position.y += Math.sin(Math.PI * align) * .22
    rotation.target.copy(consoleGroup.current.quaternion).multiply(rotation.seated)
    cardGroup.current.quaternion.copy(anchor.ready ? anchor.rotation : rotation.fallback).slerp(rotation.target, align)
    if (light.current) light.current.intensity = 12 + boot * 4
    if (led.current) (led.current.material as MeshBasicMaterial).color.set(p >= .91 ? '#82edb1' : '#18332a')
    if (exitProgress.current > 0) {
      exitProgress.current = Math.min(1, exitProgress.current + Math.min(delta, .05) / .6)
      if (exitProgress.current === 1) onEntered()
    }
  })

  return <>
    <pointLight ref={light} position={[-3, 4, 2]} color="#91b5ff" intensity={active ? 12 : 0} distance={12} />
    <directionalLight position={[4, 3, -4]} color="#b8ceef" intensity={active ? 1.6 : 0} />
    <group ref={consoleGroup} visible={false}>
      <primitive object={model} position={[-center.x, -center.y, -center.z]} />
      <mesh ref={led} position={[dimensions.x * .44, dimensions.y * .335, front + .5]}><sphereGeometry args={[.7, 8, 6]} /><meshBasicMaterial color="#18332a" /></mesh>
      <group position={[slot.x, slot.y, front + .3]}>
        <mesh><planeGeometry args={[dimensions.x * .155, dimensions.y * .085]} /><meshStandardMaterial color="#08090c" roughness={.94} /></mesh>
        <mesh position={[0, dimensions.y * .046, .1]} material={surfaceMaterial}><boxGeometry args={[dimensions.x * .16, dimensions.y * .009, .8]} /></mesh>
        <mesh position={[0, -dimensions.y * .046, .1]} material={surfaceMaterial}><boxGeometry args={[dimensions.x * .16, dimensions.y * .009, .8]} /></mesh>
        <mesh position={[-dimensions.x * .079, 0, -3]} material={surfaceMaterial}><boxGeometry args={[1, dimensions.y * .09, 6]} /></mesh>
        <mesh position={[dimensions.x * .079, 0, -3]} material={surfaceMaterial}><boxGeometry args={[1, dimensions.y * .09, 6]} /></mesh>
        <group ref={slotDoor} position={[0, dimensions.y * .041, .5]}>
          <RoundedBox position={[0, -dimensions.y * .041, 0]} args={[dimensions.x * .151, dimensions.y * .08, .8]} radius={.2} smoothness={2} material={surfaceMaterial} />
          <mesh geometry={doorText} material={textMaterial} />
        </group>
      </group>
    </group>
    <group ref={cardGroup} visible={false}><primitive object={card} /></group>
  </>
}

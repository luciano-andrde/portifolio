import { useEffect, useMemo, type RefObject } from 'react'
import { createPortal } from '@react-three/fiber'
import { BackSide, ExtrudeGeometry, Group, Mesh, MeshPhysicalMaterial, Path, Shape } from 'three'

function outline(points: number[][]) {
  const shape = new Shape()
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y))
  shape.closePath()
  return shape
}

function slot(shape: Shape, x: number, y: number, width: number, height: number, r = .025) {
  const hole = new Path()
  hole.moveTo(x + r, y)
  hole.lineTo(x + width - r, y); hole.quadraticCurveTo(x + width, y, x + width, y + r)
  hole.lineTo(x + width, y + height - r); hole.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  hole.lineTo(x + r, y + height); hole.quadraticCurveTo(x, y + height, x, y + height - r)
  hole.lineTo(x, y + r); hole.quadraticCurveTo(x, y, x + r, y)
  shape.holes.push(hole)
}

function bore(shape: Shape, x: number, y: number, radius: number) {
  const hole = new Path()
  hole.absarc(x, y, radius, 0, Math.PI * 2, true)
  shape.holes.push(hole)
}

// Open stamped sheets follow the PSP-1000 drive; holes reveal the mechanism underneath.
export default function PSPDrive({ door, carrier }: { door: Mesh, carrier: RefObject<Group | null> }) {
  const steel = useMemo(() => new MeshPhysicalMaterial({ color:'#969da3', metalness:.94, roughness:.40, anisotropy:.35, anisotropyRotation:Math.PI/2 }), [])
  const geometry = useMemo(() => {
    const tray = outline([[-1.1,.12],[1.1,.12],[1.1,2.04],[.94,2.04],[.88,2.14],[.64,2.14],[.58,2.05],[-.58,2.05],[-.64,2.14],[-.88,2.14],[-.94,2.04],[-1.1,2.04]])
    const opening = new Path()
    opening.moveTo(-.62,.52); opening.quadraticCurveTo(-.62,.32,0,.31)
    opening.quadraticCurveTo(.62,.32,.62,.52); opening.lineTo(.62,1.25)
    opening.quadraticCurveTo(.62,1.40,.45,1.53); opening.lineTo(.12,1.81)
    opening.quadraticCurveTo(0,1.91,-.12,1.81); opening.lineTo(-.45,1.53)
    opening.quadraticCurveTo(-.62,1.40,-.62,1.25); opening.closePath(); tray.holes.push(opening)
    for (const side of [-1,1]) {
      slot(tray, side < 0 ? -.99 : .18, 1.76, .81, .22, .045)
      for (const x of [.76,.91]) slot(tray, side*x-.022, .43, .044, .62, .018)
      for (const y of [.26,1.59,2.02]) bore(tray,side*.99,y,.055)
    }
    bore(tray,0,1.98,.045); slot(tray,-.15,.18,.3,.055,.02)
    const bed = outline([[-1.18,-.94],[1.18,-.94],[1.18,.84],[1.03,1.02],[-.98,1.02],[-1.18,.82]])
    for (const [x,y,r] of [[-.93,.76,.08],[-.57,.79,.10],[-.23,.75,.065],[.17,.80,.075],[.78,.80,.15],[-.87,.40,.12],[-.91,-.15,.09],[.86,-.17,.12],[.72,-.65,.14],[-.81,-.69,.10],[.4,-.76,.06]]) bore(bed,x,y,r)
    bore(bed,0,.04,.29); slot(bed,.28,.19,.46,.48,.06)
    const inner = door.geometry.clone()
    const positions = inner.getAttribute('position'), normals = inner.getAttribute('normal')
    // Offset inward along the original curved shell, keeping its exterior and UVs intact.
    for (let i=0;i<positions.count;i++) positions.setXYZ(i,positions.getX(i)-normals.getX(i)*.018,positions.getY(i)-normals.getY(i)*.018,positions.getZ(i)-normals.getZ(i)*.018)
    const extrusion = { depth:.012, bevelEnabled:true, bevelSegments:1, steps:1, bevelSize:.003, bevelThickness:.003, curveSegments:12 }
    return { tray:new ExtrudeGeometry(tray,extrusion), bed:new ExtrudeGeometry(bed,extrusion), inner }
  }, [door])
  useEffect(() => () => { steel.dispose(); Object.values(geometry).forEach(part => part.dispose()) }, [geometry, steel])

  return <>
    <mesh position={[0,.025,-.04]}><boxGeometry args={[2.77,2.25,.06]} /><meshStandardMaterial color="#101113" roughness={.87} /></mesh>
    <mesh geometry={geometry.bed} position={[0,0,-.145]} material={steel} />
    <group position={[0,.04,-.155]} rotation={[Math.PI/2,0,0]}>
      <mesh><cylinderGeometry args={[.25,.27,.035,40]} /><meshStandardMaterial color="#141619" roughness={.55} metalness={.15} /></mesh>
      <mesh position={[0,-.026,0]}><cylinderGeometry args={[.15,.18,.035,32]} /><meshStandardMaterial color="#565c60" metalness={.9} roughness={.28} /></mesh>
      <mesh position={[0,-.048,0]}><cylinderGeometry args={[.065,.065,.015,24]} /><meshStandardMaterial color="#9da3a7" metalness={1} roughness={.23} /></mesh>
    </group>
    <group position={[.51,.43,-.14]}>
      <mesh><boxGeometry args={[.34,.40,.035]} /><meshStandardMaterial color="#16171a" roughness={.7} /></mesh>
      <mesh position={[0,0,-.023]}><torusGeometry args={[.10,.022,8,32]} /><meshStandardMaterial color="#25272b" roughness={.45} /></mesh>
      <mesh position={[0,0,-.028]} scale={[1,1,.35]}><sphereGeometry args={[.078,20,12]} /><meshPhysicalMaterial color="#3d2544" metalness={.25} roughness={.09} clearcoat={1} clearcoatRoughness={.05} /></mesh>
      {[-.23,.23].map(x=><mesh key={x} position={[x,0,-.01]}><boxGeometry args={[.022,.63,.022]} /><meshStandardMaterial color="#90989d" metalness={.9} roughness={.27} /></mesh>)}
    </group>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*1.365,.02,-.25]}><boxGeometry args={[.08,2.23,.30]} /><meshStandardMaterial color="#17191b" roughness={.75} /></mesh>
      {[-.87,.94].map(y=><group key={y} position={[side*1.12,y,-.161]} rotation={[Math.PI/2,0,0]}>
        <mesh><cylinderGeometry args={[.043,.043,.014,16]} /><meshStandardMaterial color="#727a80" metalness={.85} roughness={.36} /></mesh>
        <mesh position={[0,-.008,0]}><boxGeometry args={[.052,.002,.011]} /><meshStandardMaterial color="#121416" roughness={.8} /></mesh>
      </group>)}
    </group>)}
    <group ref={carrier} position={[0,-1.10,-.24]}>
      <mesh geometry={geometry.tray} position={[0,0,.08]} material={steel} />
      {[-1,1].map(side=><group key={side}>
        <mesh position={[side*1.065,1.10,.035]}><boxGeometry args={[.035,1.73,.085]} /><meshStandardMaterial color="#777f84" metalness={.9} roughness={.4} /></mesh>
        <mesh position={[side*1.03,.37,-.018]}><boxGeometry args={[.09,.32,.025]} /><meshStandardMaterial color="#9aa1a5" metalness={.9} roughness={.33} /></mesh>
        <mesh position={[side*1.06,.15,.05]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.043,.043,.19,20]} /><meshStandardMaterial color="#848d92" metalness={.9} roughness={.3} /></mesh>
        <mesh position={[side*.53,1.91,.056]} rotation={[.14,0,0]}><boxGeometry args={[.72,.035,.035]} /><meshStandardMaterial color="#b0b6b9" metalness={.9} roughness={.32} /></mesh>
      </group>)}
      <mesh position={[0,.13,.015]}><boxGeometry args={[1.94,.045,.13]} /><meshStandardMaterial color="#6e777e" metalness={.9} roughness={.35} /></mesh>
    </group>
    {createPortal(<mesh geometry={geometry.inner}><meshStandardMaterial color="#151619" roughness={.72} metalness={.05} side={BackSide} /></mesh>,door)}
  </>
}

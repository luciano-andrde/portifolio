import { Group, Mesh, MeshStandardMaterial, SRGBColorSpace, type Object3D, type Texture } from 'three'

export const UMD_DISPLAY_HEIGHT = 1.95

export function createUMD(source: Object3D, artwork: Texture, anisotropy: number) {
  const disc = source.clone(true)
  const label = disc.getObjectByName('UmdDisc_DiscLabel_0') as Mesh
  const geometry = label.geometry.clone()
  const positions = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  // Map the circular label from its physical plane, preserving the center opening.
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i) + .44324535) / .88649082, (.42868885 - positions.getY(i)) / .88649097)
  }
  label.geometry = geometry
  const map = artwork.clone()
  map.colorSpace = SRGBColorSpace
  map.anisotropy = anisotropy
  map.needsUpdate = true
  label.material = new MeshStandardMaterial({ map, roughness: .65, metalness: .05 })
  const holder = new Group()
  holder.rotation.x = Math.PI
  holder.add(disc)
  return holder
}

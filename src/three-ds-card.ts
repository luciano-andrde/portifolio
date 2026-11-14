import { Box3, CanvasTexture, Group, Mesh, MeshStandardMaterial, SRGBColorSpace, Texture, Vector3, type Object3D } from 'three'

export const THREE_DS_CARD_HEIGHT = 1.8
let label: CanvasTexture | undefined

function getLabel(artwork: Texture) {
  if (label) return label
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 720
  const context = canvas.getContext('2d')!
  context.setTransform(.714, 0, 0, -1, 0, 720)
  context.drawImage(artwork.image as CanvasImageSource, 0, 0, 512, 720)
  label = new CanvasTexture(canvas); label.colorSpace = SRGBColorSpace; label.flipY = false
  return label
}

export function createThreeDSCard(source: Object3D, artwork: Texture) {
  const card = source.getObjectByName('Empty003')!.clone(true)
  card.position.set(0, 0, 0)
  card.rotation.set(0, 0, 0)
  card.scale.set(1, 1, 1)
  card.traverse((object) => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial) || object.material.name !== 'CartLabel') return
    const material = object.material.clone(); material.map = getLabel(artwork); material.color.set('#ffffff'); object.material = material
  })
  card.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(card)
  card.position.sub(bounds.getCenter(new Vector3()))
  const holder = new Group()
  holder.rotation.y = Math.PI
  holder.scale.setScalar(1 / bounds.getSize(new Vector3()).y)
  holder.add(card)
  return holder
}

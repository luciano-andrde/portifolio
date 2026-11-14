import { Box3, CanvasTexture, Group, Mesh, MeshStandardMaterial, SRGBColorSpace, Texture, Vector3, type Object3D } from 'three'

export const THREE_DS_CARD_HEIGHT = 1.8
let label: CanvasTexture | undefined

function getLabel(artwork: Texture, anisotropy: number) {
  if (label) return label
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1440
  const context = canvas.getContext('2d')!
  const image = artwork.image as HTMLImageElement
  const labelAspect = 26 / 29
  const cropWidth = Math.min(image.width, image.height * labelAspect)
  const cropHeight = cropWidth / labelAspect
  context.setTransform(1, 0, 0, -1, 0, canvas.height)
  // The label uses this UV rectangle within the original texture atlas.
  context.drawImage(image,
    (image.width - cropWidth) / 2, (image.height - cropHeight) / 2, cropWidth, cropHeight,
    .00923854 * canvas.width, .01193267 * canvas.height,
    .70483631 * canvas.width, .97334534 * canvas.height)
  label = new CanvasTexture(canvas); label.colorSpace = SRGBColorSpace; label.flipY = false
  label.anisotropy = anisotropy
  return label
}

export function createThreeDSCard(source: Object3D, artwork: Texture, anisotropy: number) {
  const card = source.getObjectByName('Empty003')!.clone(true)
  card.position.set(0, 0, 0)
  card.rotation.set(0, 0, 0)
  card.scale.set(1, 1, 1)
  card.traverse((object) => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial) || object.material.name !== 'CartLabel') return
    const material = object.material.clone(); material.map = getLabel(artwork, anisotropy); material.color.set('#ffffff'); object.material = material
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

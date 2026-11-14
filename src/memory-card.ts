import { Box3, CanvasTexture, Group, Mesh, MeshStandardMaterial, Quaternion, SRGBColorSpace, Vector3, type Object3D } from 'three'

export type MemoryAnchor = { position: Vector3, rotation: Quaternion, scale: Vector3, ready: boolean }
export const MEMORY_DISPLAY_HEIGHT = 1.95

let labelTexture: CanvasTexture | undefined

function getLabelTexture() {
  if (labelTexture) return labelTexture
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 1024
  const context = canvas.getContext('2d')!
  labelTexture = new CanvasTexture(canvas)
  labelTexture.colorSpace = SRGBColorSpace
  labelTexture.flipY = false

  const texture = labelTexture
  const draw = () => {
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.fillStyle = '#d1cfca'; context.fillRect(0, 0, 1024, 1024)
    context.translate(0, 1024); context.scale(1, -1)
    context.translate(512, 530); context.rotate(-.035)
    context.shadowColor = 'rgba(38, 36, 32, .22)'; context.shadowBlur = 18; context.shadowOffsetY = 9
    context.fillStyle = '#eeeae0'; context.fillRect(-380, -180, 760, 360)
    context.shadowColor = 'transparent'
    context.strokeStyle = '#d8d1c4'; context.lineWidth = 5; context.strokeRect(-380, -180, 760, 360)
    context.fillStyle = '#303b65'; context.textAlign = 'center'; context.textBaseline = 'middle'
    context.font = '240px MemoryHandwriting, cursive'
    context.fillText('andrde', 0, 12)
    texture.needsUpdate = true
  }
  draw()
  const font = new FontFace('MemoryHandwriting', 'url(/fonts/kalam-latin.woff2)')
  void font.load().then((loaded) => { document.fonts.add(loaded); draw() }).catch(() => {})
  return labelTexture
}

export function createMemoryCard(source: Object3D) {
  const card = source.clone(true)
  card.scale.y *= 1.3
  card.rotation.x = Math.PI / 2
  let wornPlastic: MeshStandardMaterial | undefined
  let wornLabel: MeshStandardMaterial | undefined
  card.traverse((object) => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return
    if (object.material.name === 'Material.002') {
      if (!wornLabel) { wornLabel = object.material.clone(); wornLabel.color.set('#ffffff'); wornLabel.map = getLabelTexture(); wornLabel.roughness = .85; wornLabel.metalness = 0 }
      object.material = wornLabel
      return
    }
    if (object.material.name !== 'Material.001') return
    if (!wornPlastic) {
      wornPlastic = object.material.clone()
      wornPlastic.roughness = .72
      wornPlastic.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          #ifdef USE_MAP
            vec2 wearGrid = vMapUv * vec2(38.0, 52.0);
            vec2 wearCell = floor(wearGrid);
            vec2 wearLocal = fract(wearGrid) - .5;
            float wearRandom = fract(sin(dot(wearCell, vec2(127.1, 311.7))) * 43758.5453);
            float wearLine = (1.0 - smoothstep(.02, .065, abs(wearLocal.y + wearLocal.x * .28)))
              * (1.0 - smoothstep(.23, .46, abs(wearLocal.x))) * step(.96, wearRandom);
            float plastic = 1.0 - smoothstep(.06, .32, max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b));
            diffuseColor.rgb += vec3(.025) * wearLine * plastic;
          #endif
        `)
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
          #include <normal_fragment_maps>
          #ifdef USE_MAP
            float edgeWear = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
            float darkPlastic = 1.0 - smoothstep(.06, .32, max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b));
            diffuseColor.rgb += vec3(.018) * edgeWear * darkPlastic;
          #endif
        `)
      }
    }
    object.material = wornPlastic
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

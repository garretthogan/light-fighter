import * as THREE from 'three'

const FLOOR_HALF = 40
const FLOOR_INSET = 0.3

export class Target {
  constructor(x, y, z, texture = null) {
    const floorMin = -FLOOR_HALF + FLOOR_INSET
    const floorMax = FLOOR_HALF - FLOOR_INSET
    const cx = Math.max(floorMin, Math.min(floorMax, x))
    const cz = Math.max(floorMin, Math.min(floorMax, z))
    const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6)
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: texture || null
    })
    if (!material.map) material.color.setHex(0x00d4ff)
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(cx, y + 0.3, cz)
    this.boxHalf = 0.3
  }

  destroy() {
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh)
    }
  }
}

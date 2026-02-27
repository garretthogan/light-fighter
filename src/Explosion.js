import * as THREE from 'three'

const DURATION = 0.35
const TUI_RED = 0xff4d4d

export class Explosion {
  constructor(x, y, z) {
    const geometry = new THREE.SphereGeometry(0.3, 8, 8)
    const material = new THREE.MeshLambertMaterial({
      color: TUI_RED,
      emissive: TUI_RED,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(x, y, z)
    this.age = 0
    this.duration = DURATION
  }

  update(delta) {
    this.age += delta
    if (this.age >= this.duration) return false
    const t = this.age / this.duration
    const scale = 1 + t * 4
    this.mesh.scale.setScalar(scale)
    this.mesh.material.opacity = 0.9 * (1 - t)
    return true
  }
}

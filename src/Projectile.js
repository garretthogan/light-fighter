import * as THREE from 'three'

const PINK = 0xff69b6
const HIT_RADIUS = 0.5
const MAX_DISTANCE = 35

export class Projectile {
  constructor(origin, velocity) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8)
    const material = new THREE.MeshStandardMaterial({
      color: PINK,
      emissive: PINK,
      emissiveIntensity: 0.5
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.copy(origin)
    this.velocity = velocity
    this.origin = origin.clone()
    const pointLight = new THREE.PointLight(PINK, 2, 8)
    this.mesh.add(pointLight)
  }

  update(delta, targets) {
    this.mesh.position.x += this.velocity.x * delta
    this.mesh.position.y += this.velocity.y * delta
    this.mesh.position.z += this.velocity.z * delta

    const distSqFromOrigin = this.mesh.position.distanceToSquared(this.origin)
    if (distSqFromOrigin > MAX_DISTANCE * MAX_DISTANCE) {
      return { remove: true }
    }

    for (const target of targets) {
      const dx = this.mesh.position.x - target.mesh.position.x
      const dy = this.mesh.position.y - target.mesh.position.y
      const dz = this.mesh.position.z - target.mesh.position.z
      const distSq = dx * dx + dy * dy + dz * dz
      const r = target.hitRadius !== undefined ? target.hitRadius : HIT_RADIUS
      if (distSq <= r * r) {
        return {
          hit: true,
          point: this.mesh.position.clone(),
          target
        }
      }
    }
    return null
  }
}

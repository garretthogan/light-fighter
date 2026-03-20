import * as THREE from 'three'
import { Projectile } from './Projectile.js'

const PINK = 0xff00ff
const FIRE_COOLDOWN_MS = 450
const AUTO_FIRE_START_MULTIPLIER = 1.35
const FIRE_COOLDOWN_MULTIPLIER_MIN = 0.4
const RATE_OF_FIRE_UPGRADE_MULTIPLIER = 0.8
const MOVE_SPEED = 5
const PLAYER_HEIGHT = 0.2
const BOUNDS = 39
const PLAYER_RADIUS = 0.25
const TARGET_HALF = 0.3
const STAMINA_MAX = 100
const STAMINA_DRAIN_PER_SEC = 20

export class Player {
  constructor() {
    const geometry = new THREE.SphereGeometry(0.25, 16, 16)
    const material = new THREE.MeshStandardMaterial({
      color: PINK,
      emissive: PINK,
      emissiveIntensity: 0.2,
      roughness: 0.6,
      metalness: 0.1
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(0, PLAYER_HEIGHT, 0)
    this.aimDirection = new THREE.Vector3(0, 0, 1)
    this.lastFireTime = 0
    this.autoAimFire = false
    this.fireCooldownMultiplier = 1.0
    this.stamina = STAMINA_MAX
    this._buildArrow()
  }

  addStamina(percent) {
    this.stamina = Math.min(STAMINA_MAX, this.stamina + (percent / 100) * STAMINA_MAX)
  }

  _buildArrow() {
    const cone = new THREE.ConeGeometry(0.12, 0.3, 8)
    const BLUE = 0x0088ff
    const mat = new THREE.MeshStandardMaterial({
      color: BLUE,
      emissive: BLUE,
      emissiveIntensity: 0.6
    })
    this.arrow = new THREE.Mesh(cone, mat)
    this.arrow.position.set(0, 0, 0.25)
    this.arrow.rotation.x = -Math.PI / 2
    this.arrow.rotation.z = Math.PI
    this.mesh.add(this.arrow)
  }

  _updateRotation() {
    this.mesh.rotation.y = Math.atan2(this.aimDirection.x, this.aimDirection.z)
  }

  _overlapsTarget(targets) {
    const px = this.mesh.position.x
    const pz = this.mesh.position.z
    for (const t of targets) {
      const half = t.boxHalf !== undefined ? t.boxHalf : TARGET_HALF
      const tx = t.mesh.position.x
      const tz = t.mesh.position.z
      const cx = Math.max(tx - half, Math.min(tx + half, px))
      const cz = Math.max(tz - half, Math.min(tz + half, pz))
      const distSq = (px - cx) ** 2 + (pz - cz) ** 2
      if (distSq < PLAYER_RADIUS * PLAYER_RADIUS) return true
    }
    return false
  }

  update(delta, keys, targets, gamepadMove = null) {
    let dx = 0
    let dz = 0
    if (gamepadMove && (gamepadMove.dx !== 0 || gamepadMove.dz !== 0)) {
      const len = Math.sqrt(gamepadMove.dx * gamepadMove.dx + gamepadMove.dz * gamepadMove.dz)
      dx = len > 0 ? gamepadMove.dx / len : 0
      dz = len > 0 ? gamepadMove.dz / len : 0
    } else {
      if (keys['KeyW']) dz -= 1
      if (keys['KeyS']) dz += 1
      if (keys['KeyA']) dx -= 1
      if (keys['KeyD']) dx += 1
      if (dx !== 0 || dz !== 0) {
        const len = Math.sqrt(dx * dx + dz * dz)
        dx /= len
        dz /= len
      }
    }
    const canMove = this.stamina > 0
    if ((dx !== 0 || dz !== 0) && canMove) {
      const ox = this.mesh.position.x
      const oz = this.mesh.position.z
      this.mesh.position.x += dx * MOVE_SPEED * delta
      this.mesh.position.z += dz * MOVE_SPEED * delta
      this.mesh.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, this.mesh.position.x))
      this.mesh.position.z = Math.max(-BOUNDS, Math.min(BOUNDS, this.mesh.position.z))
      if (this._overlapsTarget(targets)) {
        this.mesh.position.x = ox
        this.mesh.position.z = oz
      } else {
        this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_PER_SEC * delta)
      }
    }
    this.tryingToMoveNoStamina = (dx !== 0 || dz !== 0) && !canMove
    this._updateRotation()
  }

  setAimDirection(dx, dz) {
    this.aimDirection.set(dx, 0, dz)
    if (this.aimDirection.lengthSq() > 0.0001) {
      this.aimDirection.normalize()
    } else {
      this.aimDirection.set(0, 0, 1)
    }
    this._updateRotation()
  }

  setAimPoint(worldPoint) {
    this.aimDirection.set(worldPoint.x - this.mesh.position.x, 0, worldPoint.z - this.mesh.position.z)
    if (this.aimDirection.lengthSq() > 0.0001) {
      this.aimDirection.normalize()
    } else {
      this.aimDirection.set(0, 0, 1)
    }
    this._updateRotation()
  }

  fire() {
    const now = performance.now()
    const cooldown = FIRE_COOLDOWN_MS * this.fireCooldownMultiplier
    if (now - this.lastFireTime < cooldown) return null
    this.lastFireTime = now
    const origin = this.mesh.position.clone()
    const velocity = this.aimDirection.clone().multiplyScalar(18)
    velocity.y = 0
    return new Projectile(origin, velocity)
  }

  enableAutoAimFire() {
    this.autoAimFire = true
    this.fireCooldownMultiplier = Math.max(this.fireCooldownMultiplier, AUTO_FIRE_START_MULTIPLIER)
  }

  increaseRateOfFire() {
    this.fireCooldownMultiplier = Math.max(FIRE_COOLDOWN_MULTIPLIER_MIN, this.fireCooldownMultiplier * RATE_OF_FIRE_UPGRADE_MULTIPLIER)
  }
}

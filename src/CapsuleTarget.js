import * as THREE from 'three'

const SPAWN_DISTANCE = 10
const SPEED_MIN = 0.5
const SPEED_MAX = 2.2
const WAVE_AMPLITUDE_MAX = 1.8
const WAVE_AMPLITUDE_MIN = 0.3
const WAVE_FREQUENCY = 0.5
const DIFFICULTY_SPEED_EXP = 0.65
const SPHERE_RADIUS = 0.35
const BOX_HALF = 0.3
const FLOOR_HALF = 40
const FLOOR_INSET = 0.3
const HEADING_LERP = 2.2
const SPEED_AT_EXTREME = 0.6
const SPEED_AT_CENTER = 1.0
const BOUNCE_STRENGTH = 0.45
const SEPARATION_MIN_DIST = 1.2
const SEPARATION_STRENGTH = 0.6
const TUI_RED = 0xff4d4d

export class CapsuleTarget {
  constructor(playerMesh, sphereTexture = null, spawnPosition = null, sphereInstanced = null, sphereIndex = null, difficulty = 0) {
    this._sphereInstanced = sphereInstanced
    this._sphereIndex = sphereIndex
    this._position = new THREE.Vector3()
    this._matrix = new THREE.Matrix4()
    const px = playerMesh.position.x
    const pz = playerMesh.position.z
    let x, z
    if (spawnPosition && typeof spawnPosition.x === 'number' && typeof spawnPosition.z === 'number') {
      x = spawnPosition.x
      z = spawnPosition.z
    } else {
      const angle = Math.random() * Math.PI * 2
      x = px + Math.cos(angle) * SPAWN_DISTANCE
      z = pz + Math.sin(angle) * SPAWN_DISTANCE
    }
    const floorMin = -FLOOR_HALF + FLOOR_INSET
    const floorMax = FLOOR_HALF - FLOOR_INSET
    x = Math.max(floorMin, Math.min(floorMax, x))
    z = Math.max(floorMin, Math.min(floorMax, z))
    this.basePosition = new THREE.Vector3(x, 0.3, z)
    const d = Math.max(0, Math.min(1, difficulty))
    this.speed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * Math.pow(d, DIFFICULTY_SPEED_EXP)
    this.waveAmplitude = WAVE_AMPLITUDE_MIN + (WAVE_AMPLITUDE_MAX - WAVE_AMPLITUDE_MIN) * (1 - d)
    this.waveFrequency = WAVE_FREQUENCY
    this.time = 0
    this._wavePhaseOffset = Math.random() * Math.PI * 2
    this.hitRadius = 1.0
    this.points = 15
    this.sphereRadius = 0.25
    this.wasStopped = false
    this.moveDirection = null
    if (this._sphereInstanced != null && this._sphereIndex != null) {
      this.mesh = new THREE.Group()
      this._position.set(x, 0.3, z)
      this.mesh.position.copy(this._position)
    } else {
      const geometry = new THREE.SphereGeometry(0.25, 16, 16)
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: sphereTexture || null,
        emissive: TUI_RED,
        emissiveIntensity: 0.5
      })
      if (!material.map) material.color.setHex(TUI_RED)
      this.mesh = new THREE.Mesh(geometry, material)
      this.mesh.position.copy(this.basePosition)
    }
    this._buildCone()
  }

  _buildCone() {
    const cone = new THREE.ConeGeometry(0.08, 0.2, 8)
    const CONE_BLUE = 0x0088ff
    const mat = new THREE.MeshStandardMaterial({
      color: CONE_BLUE,
      emissive: CONE_BLUE,
      emissiveIntensity: 0.6
    })
    this.cone = new THREE.Mesh(cone, mat)
    this.cone.position.set(0, 0, 0.25)
    this.cone.rotation.x = -Math.PI / 2
    this.cone.rotation.z = Math.PI
    this.mesh.add(this.cone)
  }

  update(delta, playerPosition, boxTargets = [], otherMovingSpheres = []) {
    const dx = playerPosition.x - this.basePosition.x
    const dz = playerPosition.z - this.basePosition.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const toPlayerX = dist > 1e-6 ? dx / dist : 0
    const toPlayerZ = dist > 1e-6 ? dz / dist : 0
    const pos = this._sphereInstanced != null ? this._position : this.mesh.position
    if (this.wasStopped) {
      this.basePosition.x = pos.x
      this.basePosition.y = 0.3
      this.basePosition.z = pos.z
      this.time = 0
      this.wasStopped = false
    }
    if (!this.moveDirection || (this.moveDirection.x === 0 && this.moveDirection.z === 0)) {
      this.moveDirection = { x: toPlayerX, z: toPlayerZ }
    }
    const k = 1 - Math.exp(-HEADING_LERP * delta)
    this.moveDirection.x += (toPlayerX - this.moveDirection.x) * k
    this.moveDirection.z += (toPlayerZ - this.moveDirection.z) * k
    const len = Math.sqrt(this.moveDirection.x ** 2 + this.moveDirection.z ** 2)
    if (len > 1e-6) {
      this.moveDirection.x /= len
      this.moveDirection.z /= len
    }
    this.time += delta
    const wavePhase = this.time * this.waveFrequency + this._wavePhaseOffset
    const sinWave = Math.sin(wavePhase)
    const speedMult = SPEED_AT_EXTREME + (SPEED_AT_CENTER - SPEED_AT_EXTREME) * (1 - Math.abs(sinWave))
    const currentSpeed = this.speed * speedMult
    const perpX = -this.moveDirection.z
    const perpZ = this.moveDirection.x
    let moveX = this.moveDirection.x * currentSpeed * delta
    let moveZ = this.moveDirection.z * currentSpeed * delta
    const myPos = this._sphereInstanced != null ? this._position : this.mesh.position
    for (const other of otherMovingSpheres) {
      const otherPos = other._sphereInstanced != null ? other._position : other.mesh.position
      const dx = myPos.x - otherPos.x
      const dz = myPos.z - otherPos.z
      const distSq = dx * dx + dz * dz
      const minDistSq = SEPARATION_MIN_DIST * SEPARATION_MIN_DIST
      if (distSq < minDistSq && distSq > 1e-6) {
        const dist = Math.sqrt(distSq)
        const nx = dx / dist
        const nz = dz / dist
        const overlap = SEPARATION_MIN_DIST - dist
        moveX += nx * overlap * SEPARATION_STRENGTH
        moveZ += nz * overlap * SEPARATION_STRENGTH
      }
    }
    const waveOffset = this.waveAmplitude * sinWave
    const nextX = this.basePosition.x + moveX + perpX * waveOffset
    const nextZ = this.basePosition.z + moveZ + perpZ * waveOffset
    for (const box of boxTargets) {
      const half = box.boxHalf !== undefined ? box.boxHalf : BOX_HALF
      const bx = box.mesh.position.x
      const bz = box.mesh.position.z
      const cx = Math.max(bx - half, Math.min(bx + half, nextX))
      const cz = Math.max(bz - half, Math.min(bz + half, nextZ))
      const ddx = nextX - cx
      const ddz = nextZ - cz
      const distToBox = Math.sqrt(ddx * ddx + ddz * ddz)
      if (distToBox < SPHERE_RADIUS && distToBox > 1e-6) {
        const nx = ddx / distToBox
        const nz = ddz / distToBox
        const dot = moveX * nx + moveZ * nz
        const reflX = moveX - 2 * dot * nx
        const reflZ = moveZ - 2 * dot * nz
        moveX = moveX + (reflX - moveX) * BOUNCE_STRENGTH
        moveZ = moveZ + (reflZ - moveZ) * BOUNCE_STRENGTH
        const reflDx = this.moveDirection.x - 2 * (this.moveDirection.x * nx + this.moveDirection.z * nz) * nx
        const reflDz = this.moveDirection.z - 2 * (this.moveDirection.x * nx + this.moveDirection.z * nz) * nz
        this.moveDirection.x = this.moveDirection.x + (reflDx - this.moveDirection.x) * BOUNCE_STRENGTH
        this.moveDirection.z = this.moveDirection.z + (reflDz - this.moveDirection.z) * BOUNCE_STRENGTH
        const dlen = Math.sqrt(this.moveDirection.x ** 2 + this.moveDirection.z ** 2)
        if (dlen > 1e-6) {
          this.moveDirection.x /= dlen
          this.moveDirection.z /= dlen
        }
      }
    }
    this.basePosition.x += moveX
    this.basePosition.z += moveZ
    this.basePosition.y = 0.3
    const rotY = Math.atan2(this.moveDirection.x, this.moveDirection.z)
    const min = -FLOOR_HALF + FLOOR_INSET
    const max = FLOOR_HALF - FLOOR_INSET
    this.basePosition.x = Math.max(min, Math.min(max, this.basePosition.x))
    this.basePosition.z = Math.max(min, Math.min(max, this.basePosition.z))
    const worldX = Math.max(min, Math.min(max, this.basePosition.x + perpX * waveOffset))
    const worldZ = Math.max(min, Math.min(max, this.basePosition.z + perpZ * waveOffset))
    if (this._sphereInstanced != null && this._sphereIndex != null) {
      this._position.set(worldX, 0.3, worldZ)
      this.mesh.position.copy(this._position)
      this.mesh.rotation.y = rotY
      this._matrix.compose(this._position, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1))
      this._sphereInstanced.setMatrixAt(this._sphereIndex, this._matrix)
    } else {
      this.mesh.position.x = worldX
      this.mesh.position.z = worldZ
      this.mesh.position.y = 0.3
      this.mesh.rotation.y = rotY
    }
  }

  destroy() {
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh)
    }
  }
}

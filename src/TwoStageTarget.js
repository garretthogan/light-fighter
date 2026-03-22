import * as THREE from 'three'

const BIG_SIZE = 1.2
const SMALL_SIZE = 0.6
const BIG_COLOR = 0x00d4ff
const SMALL_COLOR = 0x0099cc
const ABILITY_GRANT_CHANCE = 0.6

const ABILITY_GRANT_AFTER_SECONDS = 30
const FLOOR_HALF = 40
const FLOOR_INSET = 0.3

export class TwoStageTarget {
  constructor(x, y, z, texture = null, abilityTexture = null, playerAlreadyHasAbility = false, gameElapsedSeconds = 0, forceAbilityGrant = false) {
    const floorMin = -FLOOR_HALF + FLOOR_INSET
    const floorMax = FLOOR_HALF - FLOOR_INSET
    const cx = Math.max(floorMin, Math.min(floorMax, x))
    const cz = Math.max(floorMin, Math.min(floorMax, z))
    this.stage = 'big'
    this.spawnPosition = { x: cx, y, z: cz }
    this._abilityTexture = abilityTexture
    this.willGrantAbility =
      forceAbilityGrant ||
      (gameElapsedSeconds >= ABILITY_GRANT_AFTER_SECONDS &&
        Math.random() < ABILITY_GRANT_CHANCE)
    this._buildBig(cx, y, cz, texture)
  }

  _buildBig(x, y, z, texture = null) {
    const geometry = new THREE.BoxGeometry(BIG_SIZE, BIG_SIZE, BIG_SIZE)
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: texture || null
    })
    if (!material.map) material.color.setHex(BIG_COLOR)
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(x, y + 0.6, z)
    this.hitRadius = 0.85
    this.points = 5
    this.boxHalf = 0.6
    this.respawnAsBigBox = false
    this._boxTexture = texture
  }

  shrink() {
    const parent = this.mesh.parent
    const x = this.mesh.position.x
    const z = this.mesh.position.z
    const texture = this.willGrantAbility && this._abilityTexture ? this._abilityTexture : this._boxTexture
    if (parent) parent.remove(this.mesh)
    const geometry = new THREE.BoxGeometry(SMALL_SIZE, SMALL_SIZE, SMALL_SIZE)
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: texture || null
    })
    if (!material.map) material.color.setHex(SMALL_COLOR)
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(x, 0.3, z)
    if (parent) parent.add(this.mesh)
    this.stage = 'small'
    this.hitRadius = 0.6
    this.points = 10
    this.boxHalf = 0.3
    this.respawnAsBigBox = true
  }

  destroy() {
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh)
    }
  }
}

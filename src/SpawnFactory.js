import * as THREE from 'three'
import { Target } from './Target.js'
import { TwoStageTarget } from './TwoStageTarget.js'
import { CapsuleTarget } from './CapsuleTarget.js'
import { ArmoredSphereTarget } from './ArmoredSphereTarget.js'
import { Explosion } from './Explosion.js'
import { PowerUpEffect } from './PowerUpEffect.js'

/**
 * Factory for creating all spawnable game objects (targets, effects, preview circles).
 * Does not add to scene or manage scheduling; Game remains responsible for that.
 */
export class SpawnFactory {
  constructor(context) {
    this.ctx = context
  }

  createTarget(x, y, z) {
    return new Target(x, y, z, this.ctx.boxTexture)
  }

  createTwoStageTarget(x, y, z, options = {}) {
    const playerAlreadyHasAbility = options.playerAlreadyHasAbility ?? this.ctx.player?.autoAimFire ?? false
    const gameElapsedSeconds = options.gameElapsedSeconds ?? (this.ctx.clock ? this.ctx.clock.getElapsedTime() : 0)
    const forceAbilityGrant = options.forceAbilityGrant ?? false
    return new TwoStageTarget(
      x,
      y,
      z,
      this.ctx.boxTexture,
      this.ctx.abilityBoxTexture,
      playerAlreadyHasAbility,
      gameElapsedSeconds,
      forceAbilityGrant
    )
  }

  createCapsuleTarget(spawnPosition, instancedIndex, difficulty = 0) {
    const playerMesh = this.ctx.player?.mesh
    const instanced = instancedIndex != null ? this.ctx.smallSphereInstanced : null
    return new CapsuleTarget(
      playerMesh,
      this.ctx.sphereTexture,
      spawnPosition,
      instanced,
      instancedIndex ?? null,
      difficulty
    )
  }

  createArmoredSphereTarget(spawnPosition, instancedIndex) {
    const playerMesh = this.ctx.player?.mesh
    const instanced = instancedIndex != null ? this.ctx.largeSphereInstanced : null
    return new ArmoredSphereTarget(
      playerMesh,
      this.ctx.sphereTexture,
      spawnPosition,
      instanced,
      instancedIndex ?? null
    )
  }

  createExplosion(x, y, z) {
    return new Explosion(x, y, z)
  }

  createPowerUpEffect(x, y, z) {
    return new PowerUpEffect(x, y, z)
  }

  createBigBoxPreviewCircle(x, z) {
    const geometry = new THREE.RingGeometry(0.4, 0.9, 24)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const circle = new THREE.Mesh(geometry, material)
    circle.rotation.x = -Math.PI / 2
    circle.position.set(x, 0.01, z)
    return circle
  }

  createMovingSpherePreviewCircle(x, z) {
    const geometry = new THREE.RingGeometry(0.15, 0.5, 24)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4d4d,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    const circle = new THREE.Mesh(geometry, material)
    circle.rotation.x = -Math.PI / 2
    circle.position.set(x, 0.01, z)
    return circle
  }

  createArmoredSpherePreviewCircle(x, z) {
    const geometry = new THREE.RingGeometry(0.2, 0.6, 24)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    const circle = new THREE.Mesh(geometry, material)
    circle.rotation.x = -Math.PI / 2
    circle.position.set(x, 0.01, z)
    return circle
  }
}

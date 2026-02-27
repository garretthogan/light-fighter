import * as THREE from 'three'

const FIREWORKS_COUNT = 14
const FIREWORKS_DURATION = 1.4
const TEXT_DURATION = 2.5
const PARTICLE_SPEED = 4
const GRAVITY = -2

function createFireworksParticle(x, y, z) {
  const geometry = new THREE.SphereGeometry(0.12, 6, 6)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setHSL(Math.random() * 0.15 + 0.02, 1, 0.6),
    transparent: true,
    opacity: 0.95
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI * 0.5
  const speed = PARTICLE_SPEED * (0.6 + Math.random() * 0.6)
  return {
    mesh,
    vx: Math.sin(phi) * Math.cos(theta) * speed,
    vy: Math.cos(phi) * speed,
    vz: Math.sin(phi) * Math.sin(theta) * speed
  }
}

function createPowerUpTextSprite(x, y, z) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, 256, 64)
  ctx.font = 'bold 36px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#00ff88'
  ctx.strokeStyle = '#003322'
  ctx.lineWidth = 2
  ctx.strokeText('Power up!', 128, 32)
  ctx.fillText('Power up!', 128, 32)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthWrite: false
  })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(x, y + 1, z)
  sprite.scale.set(3, 0.75, 1)
  return sprite
}

export class PowerUpEffect {
  constructor(x, y, z) {
    this.group = new THREE.Group()
    this.group.position.set(0, 0, 0)
    this.particles = []
    for (let i = 0; i < FIREWORKS_COUNT; i++) {
      const p = createFireworksParticle(x, y, z)
      this.particles.push(p)
      this.group.add(p.mesh)
    }
    this.textSprite = createPowerUpTextSprite(x, y, z)
    this.group.add(this.textSprite)
    this.age = 0
    this.duration = TEXT_DURATION
  }

  update(delta) {
    this.age += delta
    const t = this.age / this.duration
    for (const p of this.particles) {
      p.vy += GRAVITY * delta
      p.mesh.position.x += p.vx * delta
      p.mesh.position.y += p.vy * delta
      p.mesh.position.z += p.vz * delta
      const particleLife = this.age / FIREWORKS_DURATION
      if (particleLife <= 1) {
        p.mesh.material.opacity = 0.95 * (1 - particleLife)
        p.mesh.scale.setScalar(1 + particleLife * 0.5)
      } else {
        p.mesh.visible = false
      }
    }
    if (t <= 1) {
      this.textSprite.material.opacity = 1 - t * 0.9
    }
    return this.age < this.duration
  }
}

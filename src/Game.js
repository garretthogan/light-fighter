import * as THREE from 'three'
import { Stage } from './Stage.js'
import { Player } from './Player.js'
import { Projectile } from './Projectile.js'
import { Target } from './Target.js'
import { TwoStageTarget } from './TwoStageTarget.js'
import { CapsuleTarget } from './CapsuleTarget.js'
import { ArmoredSphereTarget } from './ArmoredSphereTarget.js'
import { Explosion } from './Explosion.js'
import { PowerUpEffect } from './PowerUpEffect.js'

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.scene = null
    this.camera = null
    this.renderer = null
    this.stage = null
    this.player = null
    this.projectiles = []
    this.targets = []
    this.explosions = []
    this.powerUpEffects = []
    this.pendingRespawns = []
    this.pendingBigBoxRespawns = []
    this.RESPAWN_DELAY_MS = 7000
    this.BIG_BOX_RESPAWN_MS = 10000
    this.bigBoxPositions = [
      [14, 0, 14],
      [-14, 0, 14],
      [14, 0, -14],
      [-14, 0, -14],
      [0, 0, 16],
      [16, 0, 0]
    ]
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2(0, 0)
    this.aimPlaneIntersect = new THREE.Vector3()
    this._cameraDirection = new THREE.Vector3()
    this._unprojectOrigin = new THREE.Vector3()
    this.clock = new THREE.Clock()
    this.animationId = null
    this.keys = {}
    this.score = 0
    this.POINTS_PER_TARGET = 5
    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.cameraOffset = new THREE.Vector3(12, 14, 12)
    this.CAMERA_FOLLOW_THRESHOLD = 2
    this.CAMERA_FOLLOW_SPEED = 12
    this.lastMovingSphereSpawn = 0
    this.SPAWN_INTERVAL_MAX_MS = 12000
    this.SPAWN_INTERVAL_MIN_MS = 1400
    this.SPAWN_CURVE_DURATION_S = 120
    this.SPAWN_CURVE_EXPONENT = 0.45
    this.SPAWN_COUNT_MIN = 2
    this.SPAWN_COUNT_MAX = 6
    this.gameOver = false
    this.started = false
    this.paused = false
    this._prevGamepadA = false
    this._prevGamepadStart = false
    this.spawnPreviewPositions = []
    this.spawnPreviewCircles = []
    this.SPAWN_PREVIEW_MS = 2000
    this.BIG_BOX_PREVIEW_MS = 6000
    this.lastArmoredSphereSpawn = 0
    this.armoredSpawnPreviewPositions = []
    this.armoredSpawnPreviewCircles = []
    this.ARMORED_SPAWN_INTERVAL_MAX_MS = 14000
    this.ARMORED_SPAWN_INTERVAL_MIN_MS = 5000
    this.ARMORED_SPAWN_COUNT_MIN = 1
    this.ARMORED_SPAWN_COUNT_MAX = 3
    this.ARMORED_SPAWN_PREVIEW_MS = 3500
    this.lastGreenCheckElapsed = 0
    this.GREEN_CHECK_INTERVAL_S = 30
    this.forceNextBigBoxGreen = false
    this.MAX_SMALL_SPHERES = 64
    this.MAX_ARMORED_SPHERES = 32
    this._smallSphereFree = []
    this._largeSphereFree = []
    this._hiddenMatrix = new THREE.Matrix4().makeScale(0.001, 0.001, 0.001)
  }

  _allocateSmallSphereIndex() {
    return this._smallSphereFree.pop()
  }

  _freeSmallSphereIndex(i) {
    if (i == null) return
    this.smallSphereInstanced.setMatrixAt(i, this._hiddenMatrix.clone())
    this._smallSphereFree.push(i)
  }

  _allocateLargeSphereIndex() {
    return this._largeSphereFree.pop()
  }

  _freeLargeSphereIndex(i) {
    if (i == null) return
    this.largeSphereInstanced.setMatrixAt(i, this._hiddenMatrix.clone())
    this._largeSphereFree.push(i)
  }

  _freeMovingSphereTarget(target) {
    if (typeof target.update !== 'function') return
    if (target._sphereIndex == null) return
    if (target._sphereInstanced === this.smallSphereInstanced) this._freeSmallSphereIndex(target._sphereIndex)
    else this._freeLargeSphereIndex(target._sphereIndex)
  }

  _createSpawnPreviewCircle(x, z) {
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

  _createArmoredSpawnPreviewCircle(x, z) {
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

  _createBigBoxPreviewCircle(x, z) {
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

  _getDifficulty() {
    return Math.min(1, this.clock.getElapsedTime() / this.SPAWN_CURVE_DURATION_S)
  }

  _getMovingSphereSpawnIntervalMs() {
    const elapsed = this.clock.getElapsedTime()
    const progress = Math.min(1, elapsed / this.SPAWN_CURVE_DURATION_S)
    const curve = Math.pow(progress, this.SPAWN_CURVE_EXPONENT)
    return this.SPAWN_INTERVAL_MAX_MS - (this.SPAWN_INTERVAL_MAX_MS - this.SPAWN_INTERVAL_MIN_MS) * curve
  }

  _getMovingSphereSpawnCount() {
    const elapsed = this.clock.getElapsedTime()
    const progress = Math.min(1, elapsed / this.SPAWN_CURVE_DURATION_S)
    const curve = Math.pow(progress, this.SPAWN_CURVE_EXPONENT)
    const count = this.SPAWN_COUNT_MIN + (this.SPAWN_COUNT_MAX - this.SPAWN_COUNT_MIN) * curve
    return Math.max(this.SPAWN_COUNT_MIN, Math.round(count))
  }

  _getArmoredSphereSpawnIntervalMs() {
    const elapsed = this.clock.getElapsedTime()
    const progress = Math.min(1, elapsed / this.SPAWN_CURVE_DURATION_S)
    const curve = Math.pow(progress, this.SPAWN_CURVE_EXPONENT)
    return this.ARMORED_SPAWN_INTERVAL_MAX_MS - (this.ARMORED_SPAWN_INTERVAL_MAX_MS - this.ARMORED_SPAWN_INTERVAL_MIN_MS) * curve
  }

  _getArmoredSphereSpawnCount() {
    const elapsed = this.clock.getElapsedTime()
    const progress = Math.min(1, elapsed / this.SPAWN_CURVE_DURATION_S)
    const curve = Math.pow(progress, this.SPAWN_CURVE_EXPONENT)
    const count = this.ARMORED_SPAWN_COUNT_MIN + (this.ARMORED_SPAWN_COUNT_MAX - this.ARMORED_SPAWN_COUNT_MIN) * curve
    return Math.max(this.ARMORED_SPAWN_COUNT_MIN, Math.round(count))
  }

  _loadTexture(url) {
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(url, resolve, undefined, reject)
    })
  }

  async init() {
    const baseUrl = typeof window !== 'undefined' && window.location
      ? window.location.origin + (import.meta.env.BASE_URL || '/')
      : ''
    this.floorTexture = await this._loadTexture(`${baseUrl}texture_01.png`).catch(() => null)
    this.sphereTexture = await this._loadTexture(`${baseUrl}texture_03.png`).catch(() => null)
    this.boxTexture = await this._loadTexture(`${baseUrl}texture_07.png`).catch(() => null)
    this.abilityBoxTexture = await this._loadTexture(`${baseUrl}texture_03green.png`).catch(() => null)

    this.scene = new THREE.Scene()
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight
    const frustumSize = 20
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect * 0.5,
      frustumSize * aspect * 0.5,
      frustumSize * 0.5,
      -frustumSize * 0.5,
      0.1,
      1000
    )
    this.camera.position.copy(this.cameraOffset)
    this.camera.lookAt(this.cameraTarget)
    this.camera.updateProjectionMatrix()

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.stage = new Stage(this.scene)
    this.stage.build(this.floorTexture)

    const TUI_RED = 0xff4d4d
    const smallSphereGeom = new THREE.SphereGeometry(0.25, 16, 16)
    const smallSphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.sphereTexture,
      emissive: TUI_RED,
      emissiveIntensity: 0.5
    })
    if (!smallSphereMat.map) smallSphereMat.color.setHex(TUI_RED)
    this.smallSphereInstanced = new THREE.InstancedMesh(smallSphereGeom, smallSphereMat, this.MAX_SMALL_SPHERES)
    this.smallSphereInstanced.frustumCulled = false
    for (let i = 0; i < this.MAX_SMALL_SPHERES; i++) {
      this.smallSphereInstanced.setMatrixAt(i, this._hiddenMatrix.clone())
    }
    this.smallSphereInstanced.instanceMatrix.needsUpdate = true
    this.scene.add(this.smallSphereInstanced)

    const largeSphereGeom = new THREE.SphereGeometry(0.5, 16, 16)
    const largeSphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.sphereTexture,
      emissive: TUI_RED,
      emissiveIntensity: 0.5
    })
    if (!largeSphereMat.map) largeSphereMat.color.setHex(TUI_RED)
    this.largeSphereInstanced = new THREE.InstancedMesh(largeSphereGeom, largeSphereMat, this.MAX_ARMORED_SPHERES)
    this.largeSphereInstanced.frustumCulled = false
    for (let i = 0; i < this.MAX_ARMORED_SPHERES; i++) {
      this.largeSphereInstanced.setMatrixAt(i, this._hiddenMatrix.clone())
    }
    this.largeSphereInstanced.instanceMatrix.needsUpdate = true
    this.scene.add(this.largeSphereInstanced)

    for (let i = 0; i < this.MAX_SMALL_SPHERES; i++) this._smallSphereFree.push(i)
    for (let i = 0; i < this.MAX_ARMORED_SPHERES; i++) this._largeSphereFree.push(i)

    this.player = new Player()
    this.scene.add(this.player.mesh)

    this.targetPositions = [
      [4, 0, 4],
      [-5, 0, 3],
      [3, 0, -5],
      [-4, 0, -4],
      [0, 0, 6]
    ]
    for (const [x, y, z] of this.targetPositions) {
      const target = new Target(x, y, z, this.boxTexture)
      this.targets.push(target)
      this.scene.add(target.mesh)
    }
    for (const [x, y, z] of this.bigBoxPositions) {
      const bigBox = new TwoStageTarget(x, y, z, this.boxTexture, this.abilityBoxTexture, this.player.autoAimFire, this.clock.getElapsedTime())
      this.targets.push(bigBox)
      this.scene.add(bigBox.mesh)
    }
    const smallIdx0 = this._allocateSmallSphereIndex()
    const capsuleTarget = new CapsuleTarget(this.player.mesh, this.sphereTexture, null, smallIdx0 != null ? this.smallSphereInstanced : null, smallIdx0 ?? null, 0)
    this.targets.push(capsuleTarget)
    this.scene.add(capsuleTarget.mesh)

    window.addEventListener('resize', () => this.onResize())
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.canvas.addEventListener('click', (e) => this.onClick(e))
    this.canvas.addEventListener('mousedown', (e) => e.preventDefault())
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true
      if (e.code === 'Space') e.preventDefault()
      if (e.code === 'Escape') {
        if (this.started && !this.gameOver) {
          this.paused = !this.paused
          this.pauseMenuEl.style.display = this.paused ? 'flex' : 'none'
        }
        e.preventDefault()
      }
    })
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false })

    this.timerEl = document.createElement('div')
    this.timerEl.id = 'survival-timer'
    this.canvas.parentElement.appendChild(this.timerEl)
    this.scoreEl = document.createElement('div')
    this.scoreEl.id = 'score-display'
    this.canvas.parentElement.appendChild(this.scoreEl)
    this._leaderboardMock = [
      { rank: 1, name: 'ACE', pts: 485, time: '12:34' },
      { rank: 2, name: 'NOVA', pts: 412, time: '10:22' },
      { rank: 3, name: 'BLUE', pts: 398, time: '9:58' },
      { rank: 4, name: 'VIXEN', pts: 355, time: '8:41' },
      { rank: 5, name: 'ZERO', pts: 320, time: '7:55' },
      { rank: 6, name: 'ECHO', pts: 278, time: '6:12' },
      { rank: 7, name: 'ROOK', pts: 245, time: '5:33' },
      { rank: 8, name: 'JADE', pts: 198, time: '4:20' },
      { rank: 9, name: 'SAGE', pts: 165, time: '3:45' },
      { rank: 10, name: 'LYNX', pts: 112, time: '2:18' }
    ]
    this.leaderboardEl = document.createElement('div')
    this.leaderboardEl.id = 'leaderboard-panel'
    this.leaderboardEl.className = 'tui-panel'
    this.leaderboardEl.innerHTML = `
      <button type="button" class="tui-panel-header" aria-expanded="true">
        <span class="tui-panel-chevron" aria-hidden="true">▼</span>
        <span class="tui-panel-title">Leaderboard</span>
        <span id="fps-display" class="tui-fps-in-header"></span>
      </button>
      <div class="tui-panel-content">
        <table class="tui-leaderboard-table">
          <thead><tr><th>#</th><th>Name</th><th>Pts</th><th>Time</th></tr></thead>
          <tbody>
            ${this._leaderboardMock.map((r) => `<tr><td>${r.rank}</td><td>${r.name}</td><td>${r.pts}</td><td>${r.time}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `
    this.canvas.parentElement.appendChild(this.leaderboardEl)
    this.fpsEl = this.leaderboardEl.querySelector('#fps-display')
    const header = this.leaderboardEl.querySelector('.tui-panel-header')
    header.addEventListener('click', () => {
      const collapsed = this.leaderboardEl.classList.toggle('collapsed')
      header.setAttribute('aria-expanded', !collapsed)
    })

    this.gameOverEl = document.createElement('div')
    this.gameOverEl.id = 'game-over-overlay'
    this.gameOverEl.className = 'tui-overlay'
    this.gameOverEl.innerHTML = `
      <div class="tui-modal-card">
        <h2 class="tui-modal-title">Game Over</h2>
        <p class="tui-modal-stats"><span id="game-over-time">0:00</span> · <span id="game-over-score">0</span> pts</p>
        <button id="restart-btn" class="tui-btn tui-btn-danger">Restart</button>
      </div>
    `
    this.canvas.parentElement.appendChild(this.gameOverEl)
    this.gameOverEl.style.display = 'none'
    this.gameOverEl.querySelector('#restart-btn').addEventListener('click', () => this.reset())

    this.startMenuEl = document.createElement('div')
    this.startMenuEl.id = 'start-menu-overlay'
    this.startMenuEl.className = 'tui-overlay'
    this.startMenuEl.innerHTML = `
      <div class="tui-modal-card">
        <h2 class="tui-modal-title">Dot Shooter</h2>
        <button id="start-game-btn" class="tui-btn tui-btn-primary">Start Game</button>
      </div>
    `
    this.canvas.parentElement.appendChild(this.startMenuEl)
    this.startMenuEl.querySelector('#start-game-btn').addEventListener('click', () => this._onStartGame())

    this.pauseMenuEl = document.createElement('div')
    this.pauseMenuEl.id = 'pause-menu-overlay'
    this.pauseMenuEl.className = 'tui-overlay'
    this.pauseMenuEl.style.display = 'none'
    this.pauseMenuEl.innerHTML = `
      <div class="tui-modal-card">
        <h2 class="tui-modal-title">Paused</h2>
        <button id="resume-btn" class="tui-btn tui-btn-primary">Resume</button>
      </div>
    `
    this.canvas.parentElement.appendChild(this.pauseMenuEl)
    this.pauseMenuEl.querySelector('#resume-btn').addEventListener('click', () => this._onResume())
  }

  _onStartGame() {
    this.startMenuEl.style.display = 'none'
    this.started = true
    this.clock.start()
  }

  _onResume() {
    this.pauseMenuEl.style.display = 'none'
    this.paused = false
  }

  _showGameOver() {
    const elapsed = this.clock.getElapsedTime()
    this.gameOverEl.querySelector('#game-over-time').textContent = this._formatTime(elapsed)
    this.gameOverEl.querySelector('#game-over-score').textContent = this.score
    this.gameOverEl.style.display = 'flex'
  }

  _hideGameOver() {
    this.gameOverEl.style.display = 'none'
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  onResize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const aspect = w / h
    const frustumSize = 20
    this.camera.left = -frustumSize * aspect * 0.5
    this.camera.right = frustumSize * aspect * 0.5
    this.camera.top = frustumSize * 0.5
    this.camera.bottom = -frustumSize * 0.5
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  onMouseMove(event) {
    this._clientX = event.clientX
    this._clientY = event.clientY
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock()
    }
  }

  _mouseToNDC() {
    const rect = this.canvas.getBoundingClientRect()
    if (typeof this._clientX !== 'number' || typeof this._clientY !== 'number') {
      this.mouse.set(0, 0)
      return
    }
    const x = (this._clientX - rect.left) / rect.width
    const y = (this._clientY - rect.top) / rect.height
    this.mouse.x = Math.max(0, Math.min(1, x)) * 2 - 1
    this.mouse.y = -(Math.max(0, Math.min(1, y)) * 2 - 1)
  }

  _getGamepadState() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
    const gp = pads[0]
    if (!gp || !gp.connected) return null
    const deadzone = 0.2
    const ax = (i) => (Math.abs(gp.axes[i]) > deadzone ? gp.axes[i] : 0)
    const leftX = ax(0)
    const leftZ = ax(1)
    const rightX = ax(2)
    const rightZ = ax(3)
    const move = leftX !== 0 || leftZ !== 0 ? { dx: leftX, dz: leftZ } : null
    const aim = rightX !== 0 || rightZ !== 0 ? { x: rightX, z: rightZ } : null
    const trigger = (gp.buttons[7] && gp.buttons[7].value > 0.5) || (gp.axes[7] !== undefined && gp.axes[7] > 0.5)
    const aPressed = gp.buttons[0] && (gp.buttons[0].pressed || gp.buttons[0].value > 0.5)
    const startPressed = gp.buttons[9] && (gp.buttons[9].pressed || gp.buttons[9].value > 0.5)
    return { move, aim, fire: trigger, aPressed, startPressed, _gp: gp }
  }

  _getAimPointOnPlane() {
    this._mouseToNDC()
    const planeY = this.player.mesh.position.y
    this.camera.getWorldDirection(this._cameraDirection)
    this._cameraDirection.negate()
    this._unprojectOrigin.set(this.mouse.x, this.mouse.y, 0).unproject(this.camera)
    const denom = this._cameraDirection.y
    if (Math.abs(denom) < 1e-6) return null
    const t = (planeY - this._unprojectOrigin.y) / denom
    if (t < 0) return null
    this.aimPlaneIntersect.copy(this._cameraDirection).multiplyScalar(t).add(this._unprojectOrigin)
    return this.aimPlaneIntersect
  }

  onClick() {
    if (this.gameOver) return
    const projectile = this.player.fire()
    if (projectile) {
      this.projectiles.push(projectile)
      this.scene.add(projectile.mesh)
    }
  }

  update(delta) {
    const gamepad = this._getGamepadState()
    if (!this.started) {
      if (gamepad && gamepad.aPressed && !this._prevGamepadA) this._onStartGame()
      this._prevGamepadA = gamepad ? gamepad.aPressed : false
      this._prevGamepadStart = gamepad ? gamepad.startPressed : false
      return
    }
    if (this.paused) {
      if (gamepad && gamepad.startPressed && !this._prevGamepadStart) {
        this.paused = false
        this.pauseMenuEl.style.display = 'none'
      }
      if (gamepad && gamepad.aPressed && !this._prevGamepadA) this._onResume()
      this._prevGamepadA = gamepad ? gamepad.aPressed : false
      this._prevGamepadStart = gamepad ? gamepad.startPressed : false
      return
    }
    if (this.gameOver) {
      if (gamepad && gamepad.aPressed && !this._prevGamepadA) this.reset()
      this._prevGamepadA = gamepad ? gamepad.aPressed : false
      this._prevGamepadStart = gamepad ? gamepad.startPressed : false
      this.render()
      return
    }
    if (gamepad && gamepad.startPressed && !this._prevGamepadStart) {
      this.paused = true
      this.pauseMenuEl.style.display = 'flex'
      this._prevGamepadStart = true
      return
    }
    if (gamepad && (gamepad.move || gamepad.aim || gamepad.fire) && document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock()
    }
    const gamepadMove = gamepad && gamepad.move ? gamepad.move : null
    this.player.update(delta, this.keys, this.targets, gamepadMove)

    if (gamepad && gamepad.aim) {
      this.player.setAimDirection(gamepad.aim.x, gamepad.aim.z)
    } else {
      const aimPoint = this._getAimPointOnPlane()
      if (aimPoint) this.player.setAimPoint(aimPoint)
    }

    if (this.keys['Space'] || (gamepad && gamepad.fire)) {
      const projectile = this.player.fire()
      if (projectile) {
        this.projectiles.push(projectile)
        this.scene.add(projectile.mesh)
      }
    }

    if (this.player.autoAimFire && this.targets.length > 0) {
      const playerPos = this.player.mesh.position
      let nearest = null
      let nearestDistSq = Infinity
      for (const t of this.targets) {
        if (!t.mesh || !t.mesh.position) continue
        const dx = t.mesh.position.x - playerPos.x
        const dz = t.mesh.position.z - playerPos.z
        const distSq = dx * dx + dz * dz
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq
          nearest = t
        }
      }
      if (nearest) {
        this.player.setAimPoint(nearest.mesh.position)
        const projectile = this.player.fire()
        if (projectile) {
          this.projectiles.push(projectile)
          this.scene.add(projectile.mesh)
        }
      }
    }

    const px = this.player.mesh.position.x
    const pz = this.player.mesh.position.z
    const dx = px - this.cameraTarget.x
    const dz = pz - this.cameraTarget.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > this.CAMERA_FOLLOW_THRESHOLD) {
      const move = Math.min(this.CAMERA_FOLLOW_SPEED * delta, dist - this.CAMERA_FOLLOW_THRESHOLD)
      const t = move / dist
      this.cameraTarget.x += dx * t
      this.cameraTarget.z += dz * t
    }
    this.camera.position.set(
      this.cameraTarget.x + this.cameraOffset.x,
      this.cameraTarget.y + this.cameraOffset.y,
      this.cameraTarget.z + this.cameraOffset.z
    )
    this.camera.lookAt(this.cameraTarget)

    const boxTargets = this.targets.filter((t) => typeof t.update !== 'function')
    const movingSpheres = this.targets.filter((t) => typeof t.update === 'function')
    this.targets.forEach((t) => {
      if (typeof t.update === 'function') {
        const others = movingSpheres.filter((m) => m !== t)
        t.update(delta, this.player.mesh.position, boxTargets, others)
      }
    })
    this.smallSphereInstanced.instanceMatrix.needsUpdate = true
    this.largeSphereInstanced.instanceMatrix.needsUpdate = true
    const playerPos = this.player.mesh.position
    for (const sphere of movingSpheres) {
      const touchDistSq = (0.25 + (sphere.sphereRadius ?? 0.25)) ** 2
      if (playerPos.distanceToSquared(sphere.mesh.position) < touchDistSq) {
        this.gameOver = true
        this._showGameOver()
        break
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      const hit = p.update(delta, this.targets)
      if (hit) {
        this.scene.remove(p.mesh)
        this.projectiles.splice(i, 1)
        if (hit.remove) continue
        const explosion = new Explosion(hit.point.x, hit.point.y, hit.point.z)
        this.explosions.push(explosion)
        this.scene.add(explosion.mesh)
        if (hit.target) {
          const pos = hit.target.mesh.position
          if (typeof hit.target.shrink === 'function' && hit.target.stage === 'big') {
            this.score += 5
            hit.target.shrink()
            const targetExplosion = new Explosion(pos.x, pos.y, pos.z)
            this.explosions.push(targetExplosion)
            this.scene.add(targetExplosion.mesh)
          } else if (hit.target.respawnAsBigBox) {
            if (hit.target.willGrantAbility) {
              if (!this.player.autoAimFire) {
                this.player.autoAimFire = true
              } else {
                this.player.increaseRateOfFire()
              }
              const powerUp = new PowerUpEffect(pos.x, pos.y, pos.z)
              this.powerUpEffects.push(powerUp)
              this.scene.add(powerUp.group)
            }
            this.score += hit.target.points
            this.scene.remove(hit.target.mesh)
            this.targets = this.targets.filter((t) => t !== hit.target)
            this.pendingBigBoxRespawns.push({
              x: pos.x,
              y: pos.y - 0.3,
              z: pos.z,
              respawnAt: performance.now() + this.BIG_BOX_RESPAWN_MS
            })
            const targetExplosion = new Explosion(pos.x, pos.y, pos.z)
            this.explosions.push(targetExplosion)
            this.scene.add(targetExplosion.mesh)
          } else if (hit.target.shellHealth !== undefined) {
            hit.target.shellHealth--
            const targetExplosion = new Explosion(pos.x, pos.y, pos.z)
            this.explosions.push(targetExplosion)
            this.scene.add(targetExplosion.mesh)
            if (hit.target.shellHealth <= 0) {
              this.score += hit.target.points
              this._freeMovingSphereTarget(hit.target)
              this.scene.remove(hit.target.mesh)
              this.targets = this.targets.filter((t) => t !== hit.target)
              const innerIdx = this._allocateSmallSphereIndex()
              const inner = new CapsuleTarget(this.player.mesh, this.sphereTexture, { x: pos.x, z: pos.z }, innerIdx != null ? this.smallSphereInstanced : null, innerIdx ?? null, this._getDifficulty())
              this.targets.push(inner)
              this.scene.add(inner.mesh)
            }
          } else {
            this.score += (hit.target.points !== undefined ? hit.target.points : this.POINTS_PER_TARGET)
            this._freeMovingSphereTarget(hit.target)
            this.scene.remove(hit.target.mesh)
            this.targets = this.targets.filter((t) => t !== hit.target)
            if (typeof hit.target.update !== 'function') {
              this.pendingRespawns.push({
                x: pos.x,
                y: pos.y - 0.3,
                z: pos.z,
                respawnAt: performance.now() + this.RESPAWN_DELAY_MS
              })
            }
            const targetExplosion = new Explosion(pos.x, pos.y, pos.z)
            this.explosions.push(targetExplosion)
            this.scene.add(targetExplosion.mesh)
          }
        }
      }
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i]
      if (!e.update(delta)) {
        this.scene.remove(e.mesh)
        this.explosions.splice(i, 1)
      }
    }
    for (let i = this.powerUpEffects.length - 1; i >= 0; i--) {
      const effect = this.powerUpEffects[i]
      if (!effect.update(delta)) {
        this.scene.remove(effect.group)
        this.powerUpEffects.splice(i, 1)
      }
    }
    const now = performance.now()
    for (let i = this.pendingRespawns.length - 1; i >= 0; i--) {
      const r = this.pendingRespawns[i]
      if (now >= r.respawnAt) {
        const target = new Target(r.x, r.y, r.z, this.boxTexture)
        this.targets.push(target)
        this.scene.add(target.mesh)
        this.pendingRespawns.splice(i, 1)
      }
    }
    const elapsed = this.clock.getElapsedTime()
    if (elapsed - this.lastGreenCheckElapsed >= this.GREEN_CHECK_INTERVAL_S) {
      this.lastGreenCheckElapsed = elapsed
      const hasGreenInPlay = this.targets.some((t) => t.willGrantAbility === true)
      if (!hasGreenInPlay) {
        this.forceNextBigBoxGreen = true
      }
    }
    for (let i = this.pendingBigBoxRespawns.length - 1; i >= 0; i--) {
      const r = this.pendingBigBoxRespawns[i]
      const timeUntilBigBox = r.respawnAt - now
      if (timeUntilBigBox <= this.BIG_BOX_PREVIEW_MS && timeUntilBigBox > 0 && !r.previewCircle) {
        r.previewCircle = this._createBigBoxPreviewCircle(r.x, r.z)
        this.scene.add(r.previewCircle)
      }
      if (now >= r.respawnAt) {
        if (r.previewCircle) {
          this.scene.remove(r.previewCircle)
        }
        const forceGreen = this.forceNextBigBoxGreen
        if (forceGreen) this.forceNextBigBoxGreen = false
        const bigBox = new TwoStageTarget(r.x, r.y, r.z, this.boxTexture, this.abilityBoxTexture, this.player.autoAimFire, this.clock.getElapsedTime(), forceGreen)
        this.targets.push(bigBox)
        this.scene.add(bigBox.mesh)
        this.pendingBigBoxRespawns.splice(i, 1)
      }
    }
    if (this.lastMovingSphereSpawn === 0) this.lastMovingSphereSpawn = now
    const spawnIntervalMs = this._getMovingSphereSpawnIntervalMs()
    const timeUntilSpawn = spawnIntervalMs - (now - this.lastMovingSphereSpawn)
    const MIN_MOVING_SPHERE_SEP = 4
    const sepSq = MIN_MOVING_SPHERE_SEP * MIN_MOVING_SPHERE_SEP
    const currentMovingSpheres = this.targets.filter((t) => typeof t.update === 'function')

    if (timeUntilSpawn <= this.SPAWN_PREVIEW_MS && timeUntilSpawn > 0 && this.spawnPreviewPositions.length === 0) {
      const spawnCount = this._getMovingSphereSpawnCount()
      const toCheck = [...currentMovingSpheres]
      for (let s = 0; s < spawnCount; s++) {
        let spawned = false
        for (let attempt = 0; attempt < 15 && !spawned; attempt++) {
          const movingSphere = new CapsuleTarget(this.player.mesh, this.sphereTexture)
          const tooClose = toCheck.some(
            (other) => movingSphere.mesh.position.distanceToSquared(other.mesh.position) < sepSq
          )
          if (!tooClose) {
            const x = movingSphere.mesh.position.x
            const z = movingSphere.mesh.position.z
            this.spawnPreviewPositions.push({ x, z })
            const circle = this._createSpawnPreviewCircle(x, z)
            this.scene.add(circle)
            this.spawnPreviewCircles.push(circle)
            toCheck.push({ mesh: { position: new THREE.Vector3(x, 0.3, z) } })
            spawned = true
          }
        }
      }
    }

    if (now - this.lastMovingSphereSpawn >= spawnIntervalMs) {
      if (this.spawnPreviewPositions.length > 0) {
        for (const pos of this.spawnPreviewPositions) {
          const smallIdxS = this._allocateSmallSphereIndex()
          const movingSphere = new CapsuleTarget(this.player.mesh, this.sphereTexture, pos, smallIdxS != null ? this.smallSphereInstanced : null, smallIdxS ?? null, this._getDifficulty())
          this.targets.push(movingSphere)
          this.scene.add(movingSphere.mesh)
        }
        for (const circle of this.spawnPreviewCircles) {
          this.scene.remove(circle)
        }
        this.spawnPreviewPositions = []
        this.spawnPreviewCircles = []
      } else {
        const spawnCount = this._getMovingSphereSpawnCount()
        const toCheck = [...currentMovingSpheres]
        for (let s = 0; s < spawnCount; s++) {
          let spawned = false
          for (let attempt = 0; attempt < 15 && !spawned; attempt++) {
            const smallIdxF = this._allocateSmallSphereIndex()
            const movingSphere = new CapsuleTarget(this.player.mesh, this.sphereTexture, null, smallIdxF != null ? this.smallSphereInstanced : null, smallIdxF ?? null, this._getDifficulty())
            const tooClose = toCheck.some(
              (other) => movingSphere.mesh.position.distanceToSquared(other.mesh.position) < sepSq
            )
            if (!tooClose) {
              this.targets.push(movingSphere)
              this.scene.add(movingSphere.mesh)
              toCheck.push(movingSphere)
              spawned = true
            } else if (smallIdxF != null) {
              this._freeSmallSphereIndex(smallIdxF)
            }
          }
        }
      }
      this.lastMovingSphereSpawn = now
    }

    const MIN_ARMORED_SEP = 5
    const armoredSepSq = MIN_ARMORED_SEP * MIN_ARMORED_SEP
    const movingSpheresAfterSpawn = this.targets.filter((t) => typeof t.update === 'function')
    const allMovingSpherePositions = [
      ...movingSpheresAfterSpawn.map((t) => t.mesh.position.clone()),
      ...this.spawnPreviewPositions.map((p) => new THREE.Vector3(p.x, 0.3, p.z))
    ]
    if (this.lastArmoredSphereSpawn === 0) this.lastArmoredSphereSpawn = now
    const armoredSpawnIntervalMs = this._getArmoredSphereSpawnIntervalMs()
    const armoredTimeUntilSpawn = armoredSpawnIntervalMs - (now - this.lastArmoredSphereSpawn)

    if (armoredTimeUntilSpawn <= this.ARMORED_SPAWN_PREVIEW_MS && armoredTimeUntilSpawn > 0 && this.armoredSpawnPreviewPositions.length === 0) {
      const armoredCount = this._getArmoredSphereSpawnCount()
      const armoredToCheck = [...allMovingSpherePositions]
      for (let s = 0; s < armoredCount; s++) {
        let placed = false
        for (let attempt = 0; attempt < 25 && !placed; attempt++) {
          const armored = new ArmoredSphereTarget(this.player.mesh, this.sphereTexture)
          const tooClose = armoredToCheck.some(
            (pos) => armored.mesh.position.distanceToSquared(pos) < armoredSepSq
          )
          if (!tooClose) {
            const x = armored.mesh.position.x
            const z = armored.mesh.position.z
            this.armoredSpawnPreviewPositions.push({ x, z })
            const circle = this._createArmoredSpawnPreviewCircle(x, z)
            this.scene.add(circle)
            this.armoredSpawnPreviewCircles.push(circle)
            armoredToCheck.push(new THREE.Vector3(x, 0.3, z))
            placed = true
          }
        }
      }
    }

    if (now - this.lastArmoredSphereSpawn >= armoredSpawnIntervalMs) {
      if (this.armoredSpawnPreviewPositions.length > 0) {
        for (const pos of this.armoredSpawnPreviewPositions) {
          const largeIdxS = this._allocateLargeSphereIndex()
          const armored = new ArmoredSphereTarget(this.player.mesh, this.sphereTexture, pos, largeIdxS != null ? this.largeSphereInstanced : null, largeIdxS ?? null)
          this.targets.push(armored)
          this.scene.add(armored.mesh)
        }
        for (const circle of this.armoredSpawnPreviewCircles) {
          this.scene.remove(circle)
        }
        this.armoredSpawnPreviewPositions = []
        this.armoredSpawnPreviewCircles = []
      } else {
        const toCheckArmored = [...movingSpheresAfterSpawn]
        const armoredCount = this._getArmoredSphereSpawnCount()
        for (let s = 0; s < armoredCount; s++) {
          let armoredSpawned = false
          for (let attempt = 0; attempt < 25 && !armoredSpawned; attempt++) {
            const largeIdxF = this._allocateLargeSphereIndex()
            const armored = new ArmoredSphereTarget(this.player.mesh, this.sphereTexture, null, largeIdxF != null ? this.largeSphereInstanced : null, largeIdxF ?? null)
            const tooClose = toCheckArmored.some(
              (other) => armored.mesh.position.distanceToSquared(other.mesh.position) < armoredSepSq
            )
            const tooCloseToPreview = allMovingSpherePositions.some(
              (pos) => armored.mesh.position.distanceToSquared(pos) < armoredSepSq
            )
            if (!tooClose && !tooCloseToPreview) {
              this.targets.push(armored)
              this.scene.add(armored.mesh)
              toCheckArmored.push(armored)
              armoredSpawned = true
            } else if (largeIdxF != null) {
              this._freeLargeSphereIndex(largeIdxF)
            }
          }
        }
      }
      this.lastArmoredSphereSpawn = now
    }
    if (gamepad) {
      this._prevGamepadA = gamepad.aPressed
      this._prevGamepadStart = gamepad.startPressed
    }
  }

  render() {
    this.timerEl.style.visibility = this.started ? 'visible' : 'hidden'
    if (this.fpsEl) this.fpsEl.textContent = `${this._fps ?? 0} FPS`
    this.scoreEl.style.visibility = this.started ? 'visible' : 'hidden'
    if (this.started && !this.gameOver) {
      this.timerEl.textContent = this._formatTime(this.clock.getElapsedTime())
      this.scoreEl.textContent = this.score
    }
    this.renderer.render(this.scene, this.camera)
  }

  reset() {
    this._leftoverDelta = 0
    if (this._lastFrameTime != null) this._lastFrameTime = performance.now() / 1000
    this.spawnPreviewCircles.forEach((c) => this.scene.remove(c))
    this.spawnPreviewCircles = []
    this.spawnPreviewPositions = []
    this.armoredSpawnPreviewCircles.forEach((c) => this.scene.remove(c))
    this.armoredSpawnPreviewCircles = []
    this.armoredSpawnPreviewPositions = []
    this.pendingBigBoxRespawns.forEach((r) => {
      if (r.previewCircle) this.scene.remove(r.previewCircle)
    })
    this.scene.remove(this.player.mesh)
    this.targets.forEach((t) => {
      this._freeMovingSphereTarget(t)
      this.scene.remove(t.mesh)
    })
    this.projectiles.forEach((p) => this.scene.remove(p.mesh))
    this.explosions.forEach((e) => this.scene.remove(e.mesh))
    this.powerUpEffects.forEach((e) => this.scene.remove(e.group))
    this.targets = []
    this.projectiles = []
    this.explosions = []
    this.powerUpEffects = []
    this.pendingRespawns = []
    this.pendingBigBoxRespawns = []

    this.player = new Player()
    this.scene.add(this.player.mesh)
    for (const [x, y, z] of this.targetPositions) {
      const target = new Target(x, y, z, this.boxTexture)
      this.targets.push(target)
      this.scene.add(target.mesh)
    }
    for (const [x, y, z] of this.bigBoxPositions) {
      const bigBox = new TwoStageTarget(x, y, z, this.boxTexture, this.abilityBoxTexture, this.player.autoAimFire, this.clock.getElapsedTime())
      this.targets.push(bigBox)
      this.scene.add(bigBox.mesh)
    }
    const smallIdxR = this._allocateSmallSphereIndex()
    const capsuleTarget = new CapsuleTarget(this.player.mesh, this.sphereTexture, null, smallIdxR != null ? this.smallSphereInstanced : null, smallIdxR ?? null, 0)
    this.targets.push(capsuleTarget)
    this.scene.add(capsuleTarget.mesh)

    this.player.autoAimFire = false
    this.player.fireCooldownMultiplier = 1.0
    this.score = 0
    this.clock = new THREE.Clock()
    this.lastMovingSphereSpawn = 0
    this.lastArmoredSphereSpawn = 0
    this.lastGreenCheckElapsed = 0
    this.forceNextBigBoxGreen = false
    this.cameraTarget.set(0, 0, 0)
    this.gameOver = false
    this._hideGameOver()
  }

  start() {
    const MAX_DELTA = 0.1
    const MAX_SUB_STEPS = 3
    const MAX_RAW_DELTA = 0.25
    this._leftoverDelta = 0
    this._lastFrameTime = performance.now() / 1000
    const loop = () => {
      const now = performance.now() / 1000
      let rawDelta = now - this._lastFrameTime
      this._lastFrameTime = now
      if (rawDelta <= 0) rawDelta = 1 / 60
      if (rawDelta > MAX_RAW_DELTA) rawDelta = MAX_RAW_DELTA
      this._fps = Math.round(1 / rawDelta)
      let remaining = this._leftoverDelta + rawDelta
      this._leftoverDelta = 0
      let steps = 0
      while (remaining > 1e-6 && steps < MAX_SUB_STEPS) {
        const delta = Math.min(remaining, MAX_DELTA)
        this.update(delta)
        remaining -= delta
        steps++
      }
      this._leftoverDelta = remaining > 0 ? remaining : 0
      this.render()
      this.animationId = requestAnimationFrame(loop)
    }
    loop()
  }
}

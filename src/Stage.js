import * as THREE from 'three'

export class Stage {
  constructor(scene) {
    this.scene = scene
  }

  build(floorTexture = null) {
    this._buildLights()
    this._buildGridFloor(floorTexture)
    this._buildSkybox()
  }

  _buildLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(10, 20, 10)
    dir.castShadow = false
    this.scene.add(dir)
  }

  _buildGridFloor(floorTexture) {
    if (floorTexture) {
      floorTexture.wrapS = THREE.RepeatWrapping
      floorTexture.wrapT = THREE.RepeatWrapping
      floorTexture.repeat.set(10, 10)
    }
    const geometry = new THREE.PlaneGeometry(80, 80)
    const material = new THREE.MeshLambertMaterial({
      map: floorTexture || null,
      color: floorTexture ? 0xffffff : 0x1a1a1a,
      side: THREE.DoubleSide
    })
    const floor = new THREE.Mesh(geometry, material)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    this.scene.add(floor)
  }

  _buildSkybox() {
    this.scene.background = new THREE.Color(0x0a0a12)
  }
}

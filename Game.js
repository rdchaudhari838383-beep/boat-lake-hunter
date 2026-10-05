import * as THREE from 'three';
import { Bird } from './Bird.js';
import { AudioManager } from './AudioManager.js';
import { HUD } from './HUD.js';
import { InputController } from './InputController.js';
import { WeaponSystem } from './Weapons.js';
import { createWorld } from './world.js';

export class Game {
  constructor() {
    this.container = document.getElementById('scene');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.1, 260);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Lakefront first-person game view');
    this.container.append(this.renderer.domElement);

    this.world = createWorld(this.scene);
    this.boat = this.world.boat;
    this.birds = [];
    this.clock = new THREE.Timer();
    this.clock.connect(document);
    this.elapsed = 0;
    this.score = 0;
    this.aimAssist = true;
    this.running = false;
    this.paused = false;
    this.started = false;
    this.spawnTimer = 0;
    this.spawnCount = 0;
    this.boatSpeed = 0;
    this.boatDrift = new THREE.Vector3();
    this.cameraWorldPosition = new THREE.Vector3();
    this.disposed = false;
    this.audio = new AudioManager();

    this.hud = new HUD({
      onSelectWeapon: (index) => this.weapons.select(index),
      onToggleAim: () => {
        this.aimAssist = !this.aimAssist;
        this.hud.setAimAssist(this.aimAssist);
      },
      onToggleMute: () => {
        this.audio.setMuted(!this.audio.muted);
        this.hud.setMuted(this.audio.muted);
      },
      onStart: () => this.startOrResume(),
      onRestart: () => this.startGame(),
    });
    this.weapons = new WeaponSystem({
      camera: this.camera,
      scene: this.scene,
      onHit: () => {
        this.audio.playBirdHit();
        this.score += 10;
        this.hud.setScore(this.score);
        this.hud.showFeedback('+10', true);
      },
      onMiss: () => this.hud.showFeedback('MISS', false),
      onRecoil: (amount) => this.input?.addRecoil(amount * 0.42),
      onChange: (weapon, index) => this.hud.setWeapon(weapon, index),
    });
    this.input = new InputController({
      camera: this.camera,
      boat: this.boat,
      canvas: this.renderer.domElement,
      joystick: document.getElementById('joystick'),
      joystickKnob: document.getElementById('joystick-knob'),
      fireButton: document.getElementById('fire-button'),
      onFire: () => this.shoot(),
      onSelectGun: (index, reload) => {
        if (reload) {
          this.weapons.reload();
          this.audio.playReload();
        } else {
          this.weapons.select(index);
        }
      },
      onPause: (pause) => this.handlePointerLock(pause),
      onFallbackLook: () => this.hud.showFeedback('MOVE MOUSE TO LOOK', false),
    });

    this.handleResize = () => this.resize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.container);
    this.resize();
    this.hud.setAimAssist(this.aimAssist);
    this.frameId = requestAnimationFrame(this.animate);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  startOrResume() {
    if (this.started && this.paused) {
      this.paused = false;
      this.running = true;
      this.input.setActive(true);
      this.audio.setPaused(false);
      this.hud.hideOverlay();
      this.input.requestPointerLock();
      return;
    }
    if (!this.started) this.startGame();
  }

  startGame() {
    this.clearBirds();
    this.score = 0;
    this.spawnCount = 0;
    this.spawnTimer = 0.65;
    this.boat.position.set(0, 0, 0);
    this.boat.rotation.set(0, 0, 0);
    this.boat.userData.turnLean = 0;
    this.boatSpeed = 0;
    this.boatDrift.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.input.recoil = 0;
    this.input.recoilVelocity = 0;
    this.input.recoilPivot.rotation.set(0, 0, 0);
    this.input.recoilPivot.position.y = this.input.cameraHeight;
    this.hud.setScore(this.score);
    this.weapons.reset();
    this.started = true;
    this.running = true;
    this.paused = false;
    this.input.setActive(true);
    this.hud.hideOverlay();
    this.input.requestPointerLock();
    this.audio.start();
  }

  handlePointerLock(paused) {
    if (!this.started || this.input.isMobile) return;
    if (paused) {
      this.paused = true;
      this.running = false;
      this.input.setActive(false);
      this.audio.setPaused(true);
      this.hud.showOverlay({
        title: 'TAKE A<br /><em>BREATHER.</em>',
        copy: 'Your hunt is paused. Resume or restart whenever you are ready.',
        buttonText: 'RESUME HUNT',
        showRestart: true,
      });
      return;
    }
    this.paused = false;
    this.running = true;
    this.input.setActive(true);
    this.audio.setPaused(false);
    this.hud.hideOverlay();
  }

  shoot() {
    if (!this.running || this.paused) return;
    if (!this.weapons.fire(this.birds, this.aimAssist)) return;
    this.audio.playGunshot(this.weapons.current);
    const reticle = document.querySelector('.reticle');
    reticle.classList.add('firing');
    window.setTimeout(() => reticle.classList.remove('firing'), 75);
  }

  spawnBird() {
    const difficulty = 1 + Math.min(this.spawnCount * 0.012, 0.65);
    const available = 22 - this.birds.length;
    const flockSize = available > 2 && Math.random() < 0.34
      ? Math.min(available, 2 + Math.floor(Math.random() * 3))
      : 1;
    const flight = {
      angle: Math.random() * Math.PI * 2,
      radius: THREE.MathUtils.randFloat(37, 58),
      direction: Math.random() < 0.5 ? -1 : 1,
      angularSpeed: THREE.MathUtils.randFloat(0.035, 0.095),
    };
    for (let index = 0; index < flockSize; index += 1) {
      this.birds.push(new Bird(this.scene, difficulty, flight, index));
      this.spawnCount += 1;
    }
  }

  updateMovement(delta) {
    const movement = this.input.getMovement();
    this.boatSpeed += movement.throttle * 3.2 * delta;
    this.boatSpeed *= Math.exp(-0.9 * delta);
    this.boatSpeed = THREE.MathUtils.clamp(this.boatSpeed, -2.2, 5.2);

    const turnGrip = 0.22 + Math.min(Math.abs(this.boatSpeed) / 7, 1) * 0.78;
    this.boat.rotation.y -= movement.steer * 0.8 * turnGrip * delta;

    this.boatDrift.x += -Math.sin(this.boat.rotation.y) * this.boatSpeed * delta;
    this.boatDrift.z += -Math.cos(this.boat.rotation.y) * this.boatSpeed * delta;
    this.boatDrift.multiplyScalar(Math.exp(-0.9 * delta));
    this.boat.position.x += this.boatDrift.x;
    this.boat.position.z += this.boatDrift.z;
    const targetLean = -movement.steer * Math.min(Math.abs(this.boatSpeed), 8) * 0.002;
    this.boat.userData.turnLean += (targetLean - this.boat.userData.turnLean) * Math.min(1, delta * 2.8);

    const distance = Math.hypot(this.boat.position.x, this.boat.position.z);
    if (distance > 51) {
      const shoreNormal = new THREE.Vector3(this.boat.position.x, 0, this.boat.position.z).normalize();
      this.boat.position.x = shoreNormal.x * 51;
      this.boat.position.z = shoreNormal.z * 51;
      const outwardSpeed = this.boatDrift.dot(shoreNormal);
      if (outwardSpeed > 0) this.boatDrift.addScaledVector(shoreNormal, -outwardSpeed * 1.4);
      this.boatSpeed = Math.min(this.boatSpeed, 0);
    }
  }

  updateBirds(delta) {
    for (let index = this.birds.length - 1; index >= 0; index -= 1) {
      if (!this.birds[index].update(delta, this.elapsed)) {
        continue;
      }
      this.birds[index].dispose();
      this.birds.splice(index, 1);
    }
  }

  clearBirds() {
    for (const bird of this.birds) bird.dispose();
    this.birds.length = 0;
  }

  animate = () => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);
    this.clock.update();
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed = this.clock.getElapsed();
    if (this.running && !this.paused) {
      this.updateMovement(delta);
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        if (this.birds.length < 22) this.spawnBird();
        this.spawnTimer = Math.max(0.62, 1.5 - this.spawnCount * 0.006) + Math.random() * 0.55;
      }
      this.updateBirds(delta);
      this.weapons.update(delta);
      this.input.update(delta);
      this.hud.update(delta);
    }

    this.world.update(this.elapsed, this.camera.getWorldPosition(this.cameraWorldPosition));
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.clock.dispose();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    this.resizeObserver.disconnect();
    this.input.dispose();
    this.weapons.dispose();
    this.audio.dispose();
    this.clearBirds();

    const geometries = new Set();
    const materials = new Set();
    this.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
        }
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

import * as THREE from 'three';

const bodyGeometry = new THREE.SphereGeometry(1, 12, 9);
const wingGeometry = new THREE.SphereGeometry(1, 10, 7);
const tailGeometry = new THREE.ConeGeometry(0.16, 0.55, 5);
const beakGeometry = new THREE.ConeGeometry(0.105, 0.34, 5);
const eyeGeometry = new THREE.SphereGeometry(0.045, 6, 5);
const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x171b17 });
const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xd99a3c, roughness: 0.7 });

const varieties = [
  { body: 0x9b6440, wing: 0x68452f, scale: 0.77, speed: 1.05 },
  { body: 0x899064, wing: 0x596146, scale: 0.93, speed: 0.88 },
  { body: 0x586f63, wing: 0x374b43, scale: 1.08, speed: 0.82 },
  { body: 0xb2a075, wing: 0x79714f, scale: 0.68, speed: 1.22 },
];

function addBirdPart(group, geometry, material, position, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.userData.birdRoot = group;
  group.add(mesh);
  return mesh;
}

export class Bird {
  constructor(scene, difficulty = 1, flight = null, flockIndex = 0) {
    this.group = new THREE.Group();
    this.scene = scene;
    this.variety = varieties[Math.floor(Math.random() * varieties.length)];
    this.flight = flight ?? {
      angle: Math.random() * Math.PI * 2,
      radius: THREE.MathUtils.randFloat(37, 58),
      direction: Math.random() < 0.5 ? -1 : 1,
      angularSpeed: THREE.MathUtils.randFloat(0.035, 0.095),
    };
    this.direction = this.flight.direction;
    this.phase = Math.random() * Math.PI * 2;
    this.baseY = 7.5 + Math.random() * 7;
    this.flockOffset = (flockIndex - 1.5) * 0.035 + THREE.MathUtils.randFloatSpread(0.018);
    this.radiusOffset = THREE.MathUtils.randFloatSpread(4.5);
    this.age = flockIndex * 0.08;
    this.falling = false;
    this.fallSpeed = 0;
    this.life = 0;
    this.scale = this.variety.scale;
    this.group.scale.setScalar(this.scale);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.variety.body,
      roughness: 0.86,
    });
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: this.variety.wing,
      roughness: 0.9,
    });
    this.fadeMaterials = [bodyMaterial, wingMaterial];
    const body = addBirdPart(
      this.group,
      bodyGeometry,
      bodyMaterial,
      [0, 0, 0],
      [0.58, 0.34, 0.29]
    );
    body.castShadow = false;
    addBirdPart(this.group, bodyGeometry, bodyMaterial, [0.43, 0.16, 0], [0.23, 0.22, 0.21]);

    const beak = addBirdPart(this.group, beakGeometry, beakMaterial, [0.73, 0.11, 0], [0.62, 0.62, 0.62]);
    beak.rotation.z = -Math.PI / 2;
    for (const side of [-1, 1]) {
      addBirdPart(this.group, eyeGeometry, eyeMaterial, [0.48, 0.25, side * 0.18], [1, 1, 1]);
    }

    this.wings = [];
    for (const side of [-1, 1]) {
      const wing = addBirdPart(
        this.group,
        wingGeometry,
        wingMaterial,
        [-0.06, 0.14, side * 0.31],
        [0.38, 0.095, 0.42]
      );
      wing.castShadow = false;
      this.wings.push({ mesh: wing, side });
    }

    const tail = addBirdPart(this.group, tailGeometry, wingMaterial, [-0.58, 0.11, 0], [0.7, 0.65, 0.7]);
    tail.rotation.z = Math.PI / 2;

    const hitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.userData.birdRoot = this.group;
    this.group.add(hitMesh);
    this.hitMesh = hitMesh;

    this.group.position.set(
      Math.cos(this.flight.angle) * this.flight.radius,
      this.baseY,
      Math.sin(this.flight.angle) * this.flight.radius
    );
    scene.add(this.group);
  }

  update(delta, elapsed) {
    this.age += delta;
    if (this.falling) {
      this.fallSpeed += 12 * delta;
      this.group.position.y -= this.fallSpeed * delta;
      this.group.rotation.z += this.direction * delta * 2.7;
      this.group.rotation.x += delta * 1.4;
      this.life -= delta;
      const fade = Math.max(0, Math.min(1, this.life / 1.35));
      this.group.scale.setScalar(this.scale * Math.max(0.05, fade));
      for (const material of this.fadeMaterials) {
        material.transparent = true;
        material.opacity = fade;
      }
      return this.life <= 0 || this.group.position.y < -5;
    }

    const t = this.age + this.phase;
    const angle =
      this.flight.angle +
      this.direction * this.flight.angularSpeed * t +
      this.flockOffset;
    const radius = this.flight.radius + this.radiusOffset + Math.sin(t * 0.57 + this.phase) * 1.8;
    this.group.position.x = Math.cos(angle) * radius;
    this.group.position.y = this.baseY + Math.sin(t * 1.8) * 0.72 + Math.sin(t * 0.53) * 0.42;
    this.group.position.z = Math.sin(angle) * radius;
    this.group.rotation.z = Math.sin(t * 1.8 + this.phase) * 0.055;
    const velocityX = -Math.sin(angle) * this.direction;
    const velocityZ = Math.cos(angle) * this.direction;
    const heading = Math.atan2(-velocityZ, velocityX);
    this.group.rotation.y = THREE.MathUtils.euclideanModulo(heading + Math.PI, Math.PI * 2) - Math.PI;
    const flap = Math.sin(t * 10.5 + this.phase) * 0.56;
    for (const { mesh, side } of this.wings) {
      mesh.rotation.x = side * flap;
    }
    return false;
  }

  hit() {
    if (this.falling) return false;
    this.falling = true;
    this.fallSpeed = 0.8;
    this.life = 1.35;
    this.hitMesh.visible = false;
    return true;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const child of this.group.children) {
      if (child.material !== eyeMaterial && child.material !== beakMaterial && child.material) {
        child.material.dispose();
      }
      if (child === this.hitMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    }
  }
}

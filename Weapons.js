import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const WEAPONS = [
  { name: 'Trail Carbine', icon: '▰', color: 0x765b3e, barrel: 0.74, kick: 0.085, reload: 0.52, fireRate: 0.19 },
  { name: 'Lake Revolver', icon: '◉', color: 0x858474, barrel: 0.4, kick: 0.14, reload: 0.72, fireRate: 0.34 },
  { name: 'Ranger Shotgun', icon: '▤', color: 0x694c35, barrel: 0.88, kick: 0.19, reload: 0.86, fireRate: 0.62 },
  { name: 'Longscope', icon: '⊖', color: 0x47584a, barrel: 0.92, kick: 0.12, reload: 0.64, fireRate: 0.41 },
];

function makeMesh(geometry, material, position, parent, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function createGun(camera, definition, index) {
  const group = new THREE.Group();
  group.position.set(0.32, -0.23, -0.48);
  group.scale.setScalar(0.72);
  group.visible = index === 0;
  camera.add(group);

  const mainMaterial = new THREE.MeshStandardMaterial({
    color: definition.color,
    roughness: 0.52,
    metalness: 0.38,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x252a25,
    roughness: 0.42,
    metalness: 0.55,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4f07e,
    roughness: 0.5,
    metalness: 0.2,
  });
  const stockLength = index === 1 ? 0.15 : 0.31;
  makeMesh(
    new RoundedBoxGeometry(0.15, 0.15, stockLength + 0.2, 3, 0.035),
    mainMaterial,
    [0, 0, 0.09],
    group
  );

  const receiverPlate = makeMesh(
    new THREE.BoxGeometry(0.018, 0.083, index === 1 ? 0.18 : 0.26),
    accentMaterial,
    [0.086, 0.015, -0.11],
    group
  );
  receiverPlate.castShadow = false;

  const triggerGuard = makeMesh(
    new THREE.TorusGeometry(0.075, 0.012, 5, 12, Math.PI),
    darkMaterial,
    [0, -0.088, 0.015],
    group,
    [Math.PI, 0, 0]
  );
  triggerGuard.castShadow = false;

  for (let groove = 0; groove < 4; groove += 1) {
    const gripLine = makeMesh(
      new THREE.BoxGeometry(0.124, 0.012, 0.014),
      darkMaterial,
      [0, -0.13 - groove * 0.025, 0.075],
      group,
      [0, 0, -0.12]
    );
    gripLine.castShadow = false;
  }
  makeMesh(
    new RoundedBoxGeometry(0.12, 0.22, 0.13, 3, 0.025),
    darkMaterial,
    [0, -0.15, 0.09],
    group,
    [0.22, 0, -0.12]
  );

  const barrelRadius = index === 2 ? 0.055 : 0.037;
  const barrel = makeMesh(
    new THREE.CylinderGeometry(barrelRadius, barrelRadius * 1.12, definition.barrel, 8),
    darkMaterial,
    [0, 0.015, -definition.barrel / 2 - 0.09],
    group,
    [-Math.PI / 2, 0, 0]
  );
  barrel.castShadow = false;

  makeMesh(
    new RoundedBoxGeometry(0.19, 0.075, index === 2 ? 0.34 : 0.2, 3, 0.024),
    mainMaterial,
    [0, 0.092, -0.18],
    group
  );

  if (index === 1) {
    makeMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.19, 9), darkMaterial, [0, 0.005, -0.08], group, [-Math.PI / 2, 0, 0]);
    makeMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), accentMaterial, [0, 0.015, -0.08], group, [-Math.PI / 2, 0, 0]);
  } else if (index === 2) {
    makeMesh(new THREE.CylinderGeometry(0.064, 0.064, 0.24, 8), mainMaterial, [0, -0.012, -0.39], group, [-Math.PI / 2, 0, 0]);
  } else if (index === 3) {
    makeMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 8), darkMaterial, [0, 0.14, -0.43], group, [-Math.PI / 2, 0, 0]);
    makeMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 8), accentMaterial, [0, 0.14, -0.43], group, [-Math.PI / 2, 0, 0]);
  } else {
    makeMesh(new THREE.BoxGeometry(0.055, 0.05, 0.2), darkMaterial, [0, 0.105, -0.18], group);
  }

  makeMesh(new THREE.BoxGeometry(0.022, 0.025, 0.05), accentMaterial, [0, 0.105, -definition.barrel - 0.06], group);
  makeMesh(new THREE.BoxGeometry(0.018, 0.035, 0.025), darkMaterial, [0, 0.13, -0.42], group);
  makeMesh(new THREE.BoxGeometry(0.016, 0.035, 0.02), darkMaterial, [0, 0.13, 0.01], group);

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc75c,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
  });
  const flash = makeMesh(
    new THREE.ConeGeometry(0.16, 0.56, 8),
    flashMaterial,
    [0, 0.015, -definition.barrel - 0.23],
    group
  );
  flash.rotation.x = -Math.PI / 2;
  flash.scale.set(0.75, 0.75, 1.2);
  flash.visible = false;
  const light = new THREE.PointLight(0xffa84a, 0, 3, 2);
  light.position.copy(flash.position);
  group.add(light);

  return {
    group,
    flash,
    light,
    recoil: definition.kick,
    reloadDuration: definition.reload,
    materials: [mainMaterial, darkMaterial, accentMaterial, flashMaterial],
  };
}

export class WeaponSystem {
  constructor({ camera, scene, onHit, onMiss, onRecoil, onChange }) {
    this.camera = camera;
    this.scene = scene;
    this.onHit = onHit;
    this.onMiss = onMiss;
    this.onRecoil = onRecoil;
    this.onChange = onChange;
    this.raycaster = new THREE.Raycaster();
    this.screenCenter = new THREE.Vector2(0, 0);
    this.current = 0;
    this.recoil = 0;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.flashTimer = 0;
    this.tracerTimer = 0;
    this.tracer = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xffd88d, transparent: true, opacity: 0.9 })
    );
    this.tracer.frustumCulled = false;
    this.tracer.visible = false;
    scene.add(this.tracer);
    this.guns = WEAPONS.map((definition, index) => createGun(camera, definition, index));
    this.select(0, false);
  }

  select(index, animate = true) {
    if (!Number.isInteger(index) || index < 0 || index >= this.guns.length) return;
    if (this.current === index && !animate) {
      this.onChange(WEAPONS[index], index);
      return;
    }
    this.current = index;
    for (let gunIndex = 0; gunIndex < this.guns.length; gunIndex += 1) {
      this.guns[gunIndex].group.visible = gunIndex === index;
    }
    this.recoil = animate ? 0.08 : 0;
    this.reloadTimer = animate ? this.guns[index].reloadDuration * 0.8 : 0;
    this.onChange(WEAPONS[index], index);
  }

  reload() {
    this.reloadTimer = this.guns[this.current].reloadDuration;
  }

  reset() {
    this.current = 0;
    this.recoil = 0;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.flashTimer = 0;
    this.tracerTimer = 0;
    this.tracer.visible = false;
    const oldTracerGeometry = this.tracer.geometry;
    this.tracer.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    oldTracerGeometry.dispose();
    for (let index = 0; index < this.guns.length; index += 1) {
      const gun = this.guns[index];
      gun.group.visible = index === 0;
      gun.group.position.set(0.32, -0.23, -0.48);
      gun.group.rotation.set(0, 0, 0);
      gun.flash.visible = false;
      gun.light.intensity = 0;
    }
    this.onChange(WEAPONS[0], 0);
  }

  fire(birds, aimAssist) {
    if (this.fireCooldown > 0) return false;
    const gun = this.guns[this.current];
    const definition = WEAPONS[this.current];
    this.camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.screenCenter, this.camera);

    let target = null;
    let hitPoint = null;
    let closestDistance = Infinity;
    for (const bird of birds) {
      if (bird.falling) continue;
      const intersections = aimAssist
        ? this.raycaster.intersectObject(bird.hitMesh)
        : this.raycaster.intersectObjects(
          bird.group.children.filter((part) => part !== bird.hitMesh)
        );
      const intersection = intersections[0];
      if (intersection && intersection.distance < closestDistance) {
        closestDistance = intersection.distance;
        target = bird;
        hitPoint = intersection.point.clone();
      }
    }

    const origin = gun.group.localToWorld(
      new THREE.Vector3(0, 0.015, -definition.barrel - 0.16)
    );
    const endpoint = hitPoint
      ?? this.raycaster.ray.origin.clone().addScaledVector(this.raycaster.ray.direction, 90);
    this.setTracer(origin, endpoint);

    gun.flash.visible = true;
    gun.light.intensity = 12;
    this.flashTimer = 0.065;
    this.tracerTimer = 0.12;
    this.recoil += gun.recoil;
    this.reloadTimer = gun.reloadDuration * 0.6;
    this.fireCooldown = definition.fireRate;
    this.onRecoil(gun.recoil);

    if (target && target.hit()) this.onHit(target);
    else this.onMiss();
    return true;
  }

  setTracer(start, end) {
    const previousGeometry = this.tracer.geometry;
    this.tracer.geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    previousGeometry.dispose();
    this.tracer.visible = true;
  }

  update(delta) {
    const gun = this.guns[this.current];
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    this.recoil = THREE.MathUtils.damp(this.recoil, 0, 17, delta);
    this.reloadTimer = Math.max(0, this.reloadTimer - delta);
    this.flashTimer = Math.max(0, this.flashTimer - delta);
    this.tracerTimer = Math.max(0, this.tracerTimer - delta);
    gun.group.position.y = -0.31 - this.recoil * 0.32;
    gun.group.rotation.x = this.recoil * 0.55;
    gun.group.rotation.z = -this.recoil * 0.35;
    if (this.reloadTimer > 0) {
      const progress = this.reloadTimer / gun.reloadDuration;
      const reloadDip = Math.sin(progress * Math.PI) * 0.15;
      gun.group.position.y -= reloadDip;
      gun.group.rotation.z -= reloadDip * 0.7;
    }
    gun.flash.visible = this.flashTimer > 0;
    gun.light.intensity = this.flashTimer > 0 ? 12 * (this.flashTimer / 0.065) : 0;
    this.tracer.visible = this.tracerTimer > 0;
    this.tracer.material.opacity = Math.min(1, this.tracerTimer / 0.12) * 0.88;
  }

  dispose() {
    this.scene.remove(this.tracer);
    this.tracer.geometry.dispose();
    this.tracer.material.dispose();
    for (const gun of this.guns) {
      gun.group.parent?.remove(gun.group);
      gun.group.traverse((child) => {
        if (child.isMesh) child.geometry.dispose();
      });
      for (const material of gun.materials) material.dispose();
    }
  }
}

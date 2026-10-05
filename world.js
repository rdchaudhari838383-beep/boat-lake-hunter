import * as THREE from 'three';

const TAU = Math.PI * 2;
const random = (min, max) => min + Math.random() * (max - min);

function terrainHeight(angle, radius) {
  const shoreline = 71 + Math.sin(angle * 7) * 1.6 + Math.sin(angle * 17 + 0.5) * 0.55;
  const t = THREE.MathUtils.clamp((radius - shoreline) / (154 - shoreline), 0, 1);
  const variation =
    Math.sin(angle * 5 + radius * 0.07) * 1.2 +
    Math.sin(angle * 13 - radius * 0.035) * 0.6;
  const ridge = Math.pow(Math.max(0, Math.sin(angle * 9 + 1.4)), 5) * 15;
  const hill = Math.pow(Math.max(0, Math.sin(t * 5.7 + angle * 3)), 2) * 5;
  return Math.max(-0.1, t * 7.5 + variation + ridge * t + hill);
}

function standardMaterial(color, roughness = 0.85, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function createMountainGeometry(radius, height, seed) {
  const geometry = new THREE.ConeGeometry(radius, height, 12, 10);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  const stoneColor = new THREE.Color(0x90988a);
  const snowColor = new THREE.Color(0xc3c4b6);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const angle = Math.atan2(z, x);
    const heightRatio = y / height + 0.5;
    const roughness =
      Math.sin(angle * 4 + seed) * 0.12 +
      Math.sin(angle * 9 - seed * 0.7) * 0.065;
    const radialScale = 1 + roughness * (1 - heightRatio * 0.35);
    positions.setX(index, x * radialScale);
    positions.setZ(index, z * radialScale);

    const stone = THREE.MathUtils.smoothstep(heightRatio + roughness * 0.3, 0.56, 0.92);
    const paleRidge = THREE.MathUtils.smoothstep(heightRatio + roughness * 0.16, 0.9, 1);
    color.setHSL(
      0.31 + roughness * 0.035,
      0.13 + Math.abs(roughness) * 0.12,
      0.27 + roughness * 0.16
    );
    color.lerp(stoneColor, stone * 0.65);
    color.lerp(snowColor, paleRidge * 0.56);
    color.toArray(colors, index * 3);
  }

  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createWater(scene) {
  const geometry = new THREE.PlaneGeometry(126, 126, 96, 96);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uEye: { value: new THREE.Vector3() },
      uSun: { value: new THREE.Vector3(-0.45, 0.72, 0.52).normalize() },
      uDeep: { value: new THREE.Color(0x103541) },
      uShallow: { value: new THREE.Color(0x367276) },
      uSky: { value: new THREE.Color(0xa9c7c5) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vFoam;
      void main() {
        vec3 p = position;
        float a = p.x * 0.105 + p.z * 0.067 + uTime * 0.72;
        float b = p.x * -0.048 + p.z * 0.13 - uTime * 0.48;
        p.y += sin(a) * 0.2 + sin(b) * 0.095;
        float dx = cos(a) * 0.105 * 0.2 - cos(b) * -0.048 * 0.095;
        float dz = cos(a) * 0.067 * 0.2 + cos(b) * 0.13 * 0.095;
        vNormal = normalize(vec3(-dx, 1.0, -dz));
        vFoam = smoothstep(0.065, 0.145, abs(sin(a * 0.67 + b * 0.41)));
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uEye;
      uniform vec3 uSun;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vFoam;
      void main() {
        float lakeRadius = length(vWorldPosition.xz);
        if (lakeRadius > 63.0) discard;
        vec3 n = normalize(vNormal);
        vec3 viewDirection = normalize(uEye - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(n, viewDirection), 0.0), 3.0);
        float lightReflection = pow(max(dot(reflect(-normalize(uSun), n), viewDirection), 0.0), 52.0);
        float waveShade = clamp(n.y * 0.74 + 0.18, 0.0, 1.0);
        vec3 water = mix(uDeep, uShallow, waveShade);
        water = mix(water, uSky, fresnel * 0.25);
        water += vec3(1.0, 0.88, 0.65) * lightReflection * 0.65;
        float ripple = sin(vWorldPosition.x * 0.48 + vWorldPosition.z * 0.31 + uTime * 0.8)
          * sin(vWorldPosition.z * 0.44 - uTime * 0.57);
        float glint = smoothstep(0.78, 0.96, ripple) * (1.0 - fresnel);
        water += vec3(0.63, 0.76, 0.68) * glint * 0.17;
        water = mix(water, vec3(0.72, 0.79, 0.72), vFoam * 0.11);
        water = mix(water, uShallow, smoothstep(63.0, 58.0, lakeRadius) * 0.28);
        float fogAmount = smoothstep(76.0, 132.0, distance(uEye, vWorldPosition));
        water = mix(water, vec3(0.62, 0.73, 0.70), fogAmount * 0.72);
        gl_FragColor = vec4(water, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const water = new THREE.Mesh(geometry, material);
  water.position.y = -0.34;
  water.frustumCulled = false;
  water.renderOrder = 1;
  scene.add(water);

  return (time, cameraPosition) => {
    material.uniforms.uTime.value = time;
    material.uniforms.uEye.value.copy(cameraPosition);
  };
}

function createShoreAndTerrain(scene) {
  const shore = new THREE.Mesh(
    new THREE.RingGeometry(61, 76, 192, 3),
    standardMaterial(0x857e58, 0.96)
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = -0.08;
  shore.receiveShadow = true;
  scene.add(shore);

  const angularSegments = 192;
  const radialSegments = 28;
  const innerRadius = 73;
  const outerRadius = 154;
  const positions = [];
  const colors = [];
  const indices = [];
  const sand = new THREE.Color(0x958965);
  const grass = new THREE.Color(0x617153);
  const highGrass = new THREE.Color(0x485c49);
  const color = new THREE.Color();

  for (let radial = 0; radial <= radialSegments; radial += 1) {
    const t = radial / radialSegments;
    for (let angular = 0; angular <= angularSegments; angular += 1) {
      const angle = (angular / angularSegments) * TAU;
      const shoreline = 71 + Math.sin(angle * 7) * 1.6 + Math.sin(angle * 17 + 0.5) * 0.55;
      const radius = THREE.MathUtils.lerp(shoreline, outerRadius, t);
      const elevation = terrainHeight(angle, radius);
      positions.push(Math.cos(angle) * radius, elevation, Math.sin(angle) * radius);

      const landBlend = THREE.MathUtils.smoothstep(t, 0, 0.12);
      const heightBlend = THREE.MathUtils.smoothstep(elevation, 1, 17);
      color.copy(sand).lerp(grass, landBlend).lerp(highGrass, heightBlend * 0.78);
      const fleck = (Math.sin(angle * 97 + radial * 23) + 1) * 0.018;
      color.offsetHSL(0, 0, fleck - 0.009);
      colors.push(color.r, color.g, color.b);

      if (radial < radialSegments && angular < angularSegments) {
        const a = radial * (angularSegments + 1) + angular;
        const b = a + angularSegments + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98 })
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.97,
    flatShading: true,
  });
  for (let index = 0; index < 64; index += 1) {
    const angle = (index / 64) * TAU + random(-0.025, 0.025);
    const radius = random(112, 148);
    const height = random(26, 58);
    const width = random(18, 34);
    const mountain = new THREE.Mesh(createMountainGeometry(width, height, index * 0.73), mountainMaterial);
    mountain.position.set(
      Math.cos(angle) * radius,
      height * 0.35 - 2,
      Math.sin(angle) * radius
    );
    mountain.rotation.y = random(0, TAU);
    mountain.scale.set(1, random(0.8, 1.2), random(0.68, 0.92));
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    scene.add(mountain);
  }
}

function createTrees(scene) {
  const count = 1100;
  const trunkGeometry = new THREE.CylinderGeometry(0.14, 0.3, 3.2, 7);
  const crownGeometry = new THREE.SphereGeometry(1, 9, 7);
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    standardMaterial(0x594632, 0.96),
    count
  );
  const foliageMaterials = [0xffffff, 0xffffff, 0xffffff].map((color) =>
    standardMaterial(color, 0.94)
  );
  const crowns = foliageMaterials.map(
    (foliageMaterial) => new THREE.InstancedMesh(crownGeometry, foliageMaterial, count)
  );
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * TAU;
    const radius = random(77, 111);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = random(0.7, 1.8);
    const height = 3.05 * scale;
    const groundY = terrainHeight(angle, radius);

    dummy.position.set(x, groundY + height * 0.47, z);
    dummy.rotation.set(0, random(0, TAU), random(-0.035, 0.035));
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);

    for (let layer = 0; layer < crowns.length; layer += 1) {
      const crownScale = (1.16 - layer * 0.22) * scale;
      dummy.position.set(x, groundY + height + (0.42 + layer * 0.76) * scale, z);
      dummy.rotation.set(random(-0.08, 0.08), random(0, TAU), random(-0.08, 0.08));
      dummy.scale.set(crownScale * 1.1, crownScale * 0.94, crownScale);
      dummy.updateMatrix();
      crowns[layer].setMatrixAt(index, dummy.matrix);
      tint.setHSL(
        random(0.255, 0.34),
        random(0.25, 0.43),
        THREE.MathUtils.clamp(random(0.18, 0.34) + layer * 0.025, 0, 1)
      );
      crowns[layer].setColorAt(index, tint);
    }
  }

  trunks.instanceMatrix.needsUpdate = true;
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  scene.add(trunks);
  for (const crown of crowns) {
    crown.instanceMatrix.needsUpdate = true;
    if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
    crown.castShadow = true;
    crown.receiveShadow = true;
    scene.add(crown);
  }
}

function createBoat(scene) {
  const boat = new THREE.Group();
  boat.userData.turnLean = 0;
  scene.add(boat);

  const outline = new THREE.Shape();
  outline.moveTo(0, -2.7);
  outline.lineTo(0.68, -1.65);
  outline.lineTo(0.91, 1.45);
  outline.lineTo(0.79, 1.78);
  outline.lineTo(-0.79, 1.78);
  outline.lineTo(-0.91, 1.45);
  outline.lineTo(-0.68, -1.65);
  outline.closePath();

  const hullGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.5,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.075,
    bevelThickness: 0.07,
  });
  hullGeometry.translate(0, 0, -0.25);
  hullGeometry.rotateX(Math.PI / 2);
  const hullMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x544532,
    roughness: 0.38,
    metalness: 0.08,
    clearcoat: 0.48,
    clearcoatRoughness: 0.34,
  });
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  hull.position.y = 0.07;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const floorGeometry = new THREE.ShapeGeometry(outline);
  floorGeometry.rotateX(Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, standardMaterial(0x40372c, 0.95));
  floor.position.y = 0.115;
  floor.receiveShadow = true;
  boat.add(floor);

  const interiorMaterial = standardMaterial(0x736044, 0.84);
  const innerFloor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.045, 2.3), interiorMaterial);
  innerFloor.position.set(0, 0.16, 0.08);
  innerFloor.receiveShadow = true;
  boat.add(innerFloor);

  const railMaterial = standardMaterial(0x8a704b, 0.42, { metalness: 0.14 });
  const gunwaleMaterial = standardMaterial(0x493b2c, 0.44);
  const rubberMaterial = standardMaterial(0x242a27, 0.62);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.066, 3.7, 9), railMaterial);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(side * 0.79, 0.53, 0.03);
    rail.castShadow = true;
    boat.add(rail);

    const sideRim = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.09, 3.25), gunwaleMaterial);
    sideRim.position.set(side * 0.76, 0.39, 0.08);
    sideRim.castShadow = true;
    boat.add(sideRim);

    const rubber = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.32, 9), rubberMaterial);
    rubber.rotation.z = Math.PI / 2;
    rubber.position.set(side * 0.83, 0.2, -0.38);
    boat.add(rubber);
  }

  const benchMaterial = standardMaterial(0x9a7850, 0.66);
  for (const z of [0.76, 1.42]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.13, 0.3), benchMaterial);
    seat.position.set(0, 0.58, z);
    seat.castShadow = true;
    boat.add(seat);
    for (const x of [-0.48, 0.48]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.08), interiorMaterial);
      support.position.set(x, 0.37, z);
      boat.add(support);
    }
  }

  const bowCleat = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.045, 0.1),
    standardMaterial(0x8e8d7d, 0.3, { metalness: 0.68 })
  );
  bowCleat.position.set(0, 0.42, -1.9);
  boat.add(bowCleat);

  return boat;
}

export function createWorld(scene) {
  scene.background = new THREE.Color(0x91afb0);
  scene.fog = new THREE.FogExp2(0x91afb0, 0.0032);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDirection;
        void main() {
          float blend = smoothstep(-0.14, 0.86, vDirection.y);
          vec3 horizon = vec3(0.70, 0.79, 0.76);
          vec3 zenith = vec3(0.31, 0.49, 0.62);
          vec3 skyColor = mix(horizon, zenith, blend);
          skyColor += vec3(0.1, 0.08, 0.04) * pow(max(dot(vDirection, normalize(vec3(-0.45, 0.62, 0.48))), 0.0), 48.0);
          gl_FragColor = vec4(skyColor, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );
  sky.renderOrder = -100;
  scene.add(sky);

  const hemisphere = new THREE.HemisphereLight(0xd9ebf2, 0x44483b, 1.35);
  scene.add(hemisphere);

  const sunlight = new THREE.DirectionalLight(0xffe8be, 3.15);
  sunlight.position.set(-46, 74, 30);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -105;
  sunlight.shadow.camera.right = 105;
  sunlight.shadow.camera.top = 105;
  sunlight.shadow.camera.bottom = -105;
  sunlight.shadow.normalBias = 0.035;
  sunlight.shadow.radius = 4;
  scene.add(sunlight);

  createShoreAndTerrain(scene);
  createTrees(scene);
  const updateWater = createWater(scene);
  const boat = createBoat(scene);

  return {
    boat,
    update(time, cameraPosition) {
      updateWater(time, cameraPosition);
      boat.position.y = Math.sin(time * 1.05) * 0.042;
      boat.rotation.z = Math.sin(time * 0.66) * 0.012 + (boat.userData.turnLean ?? 0);
      boat.rotation.x = Math.sin(time * 0.84 + 0.7) * 0.008;
    },
  };
}

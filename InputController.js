import { Group } from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export class InputController {
  constructor({ camera, boat, canvas, joystick, joystickKnob, fireButton, onFire, onSelectGun, onPause, onFallbackLook }) {
    this.canvas = canvas;
    this.gameElement = document.getElementById('game');
    this.boat = boat;
    this.camera = camera;
    this.onFire = onFire;
    this.onSelectGun = onSelectGun;
    this.onPause = onPause;
    this.onFallbackLook = onFallbackLook;
    this.joystickKnob = joystickKnob;
    this.isMobile = window.matchMedia('(pointer: coarse)').matches;
    this.useDragLook = this.isMobile;
    this.keys = new Set();
    this.joystick = { x: 0, y: 0 };
    this.joystickPointer = null;
    this.lookPointer = null;
    this.lastLook = null;
    this.active = false;
    this.recoil = 0;
    this.recoilVelocity = 0;

    document.addEventListener('pointerlockerror', this.handlePointerLockError, true);
    // Recent Three.js releases rotate the supplied camera directly instead of using a yaw object.
    this.pointerControls = new PointerLockControls(camera, canvas);
    this.yawObject = camera;
    camera.rotation.order = 'YXZ';
    this.cameraHeight = 1.48;
    this.recoilPivot = new Group();
    this.recoilPivot.position.y = this.cameraHeight;
    boat.add(this.recoilPivot);
    this.recoilPivot.add(camera);

    this.pointerControls.addEventListener('lock', () => {
      if (this.active) this.onPause(false);
    });
    this.pointerControls.addEventListener('unlock', () => {
      if (this.active && !this.isMobile) this.onPause(true);
    });

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    canvas.addEventListener('pointermove', this.handleCanvasPointerMove);
    canvas.addEventListener('pointerup', this.handleCanvasPointerUp);
    canvas.addEventListener('pointercancel', this.handleCanvasPointerUp);
    canvas.addEventListener('contextmenu', this.preventContextMenu);

    joystick.addEventListener('pointerdown', this.handleJoystickDown);
    joystick.addEventListener('pointermove', this.handleJoystickMove);
    joystick.addEventListener('pointerup', this.handleJoystickUp);
    joystick.addEventListener('pointercancel', this.handleJoystickUp);
    fireButton.addEventListener('pointerdown', this.handleFirePointerDown);
    fireButton.addEventListener('contextmenu', this.preventContextMenu);

    this.joystickElement = joystick;
    this.fireButton = fireButton;
  }

  handleKeyDown = (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    this.keys.add(event.code);
    if (event.repeat || !this.active) return;
    if (event.code === 'Space') this.onFire();
    if (event.code === 'KeyR') this.onSelectGun(null, true);
    if (/^Digit[1-4]$/.test(event.code)) this.onSelectGun(Number(event.code.slice(-1)) - 1);
  };

  handleKeyUp = (event) => {
    this.keys.delete(event.code);
  };

  handleCanvasPointerDown = (event) => {
    if (!this.active) return;
    if (this.useDragLook && (event.pointerType === 'touch' || (!this.isMobile && event.button === 0))) {
      if (!this.isMobile) this.onFire();
      this.lookPointer = event.pointerId;
      this.lastLook = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (!this.isMobile && event.button === 0) this.onFire();
  };

  handleCanvasPointerMove = (event) => {
    if (!this.active || !this.useDragLook) return;

    if (this.isMobile) {
      if (event.pointerId !== this.lookPointer || !this.lastLook) return;
      const deltaX = event.clientX - this.lastLook.x;
      const deltaY = event.clientY - this.lastLook.y;
      this.lastLook = { x: event.clientX, y: event.clientY };
      this.applyLookDelta(deltaX, deltaY);
      return;
    }

    if (this.pointerControls.isLocked) return;
    const deltaX = this.lookPointer === event.pointerId && this.lastLook
      ? event.clientX - this.lastLook.x
      : event.movementX;
    const deltaY = this.lookPointer === event.pointerId && this.lastLook
      ? event.clientY - this.lastLook.y
      : event.movementY;
    this.lastLook = this.lookPointer === event.pointerId
      ? { x: event.clientX, y: event.clientY }
      : null;
    this.applyLookDelta(deltaX, deltaY);
  };

  applyLookDelta(deltaX, deltaY) {
    this.camera.rotation.y -= deltaX * 0.004;
    this.camera.rotation.x = clamp(this.camera.rotation.x - deltaY * 0.0035, -1.25, 1.25);
  }

  handleCanvasPointerUp = (event) => {
    if (event.pointerId !== this.lookPointer) return;
    this.lookPointer = null;
    this.lastLook = null;
  };

  handleJoystickDown = (event) => {
    event.preventDefault();
    this.joystickPointer = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    this.updateJoystick(event, event.currentTarget);
  };

  handleJoystickMove = (event) => {
    if (event.pointerId === this.joystickPointer) this.updateJoystick(event, event.currentTarget);
  };

  handleJoystickUp = (event) => {
    if (event.pointerId !== this.joystickPointer) return;
    this.joystickPointer = null;
    this.joystick.x = 0;
    this.joystick.y = 0;
    this.joystickKnob.style.transform = 'translate(0px, 0px)';
  };

  updateJoystick(event, element) {
    const bounds = element.getBoundingClientRect();
    const maxRadius = bounds.width * 0.34;
    const offsetX = event.clientX - (bounds.left + bounds.width / 2);
    const offsetY = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(offsetX, offsetY);
    const scale = distance > maxRadius ? maxRadius / distance : 1;
    const x = offsetX * scale;
    const y = offsetY * scale;
    this.joystick.x = x / maxRadius;
    this.joystick.y = -y / maxRadius;
    this.joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
  }

  handleFirePointerDown = (event) => {
    event.preventDefault();
    if (this.active) this.onFire();
  };

  preventContextMenu = (event) => event.preventDefault();

  handlePointerLockError = (event) => {
    event.stopImmediatePropagation();
    this.enableDragLookFallback();
  };

  enableDragLookFallback() {
    if (this.useDragLook) return;
    this.useDragLook = true;
    this.onFallbackLook();
  }

  setActive(active) {
    this.active = active;
    this.gameElement.classList.toggle('gameplay-active', active);
  }

  getMovement() {
    const steer =
      Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
      Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')) +
      this.joystick.x;
    const throttle =
      Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) -
      Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) +
      this.joystick.y;
    return {
      steer: clamp(steer, -1, 1),
      throttle: clamp(throttle, -1, 1),
    };
  }

  requestPointerLock() {
    if (this.isMobile) return;
    if (typeof this.canvas.requestPointerLock !== 'function') {
      this.useDragLook = true;
      this.onFallbackLook();
      return;
    }
    try {
      const request = this.canvas.requestPointerLock({ unadjustedMovement: false });
      if (request && typeof request.catch === 'function') {
        request.catch(() => this.enableDragLookFallback());
      }
    } catch {
      this.enableDragLookFallback();
    }
  }

  addRecoil(amount) {
    this.recoilVelocity += amount;
  }

  update(delta) {
    this.recoilVelocity -= this.recoil * 18 * delta;
    this.recoilVelocity *= Math.exp(-9 * delta);
    this.recoil += this.recoilVelocity * delta;
    this.recoil = clamp(this.recoil, -0.01, 0.09);
    this.recoilPivot.rotation.x = this.recoil;
    this.recoilPivot.position.y = this.cameraHeight + this.recoil * 0.2;
  }

  dispose() {
    this.gameElement.classList.remove('gameplay-active');
    if (this.pointerControls.isLocked) this.pointerControls.unlock();
    this.pointerControls.dispose();
    document.removeEventListener('pointerlockerror', this.handlePointerLockError, true);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.canvas.removeEventListener('pointermove', this.handleCanvasPointerMove);
    this.canvas.removeEventListener('pointerup', this.handleCanvasPointerUp);
    this.canvas.removeEventListener('pointercancel', this.handleCanvasPointerUp);
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.joystickElement.removeEventListener('pointerdown', this.handleJoystickDown);
    this.joystickElement.removeEventListener('pointermove', this.handleJoystickMove);
    this.joystickElement.removeEventListener('pointerup', this.handleJoystickUp);
    this.joystickElement.removeEventListener('pointercancel', this.handleJoystickUp);
    this.fireButton.removeEventListener('pointerdown', this.handleFirePointerDown);
    this.fireButton.removeEventListener('contextmenu', this.preventContextMenu);
  }
}

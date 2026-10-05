import { WEAPONS } from './Weapons.js';

export class HUD {
  constructor({ onSelectWeapon, onToggleAim, onToggleMute, onStart, onRestart }) {
    this.scoreElement = document.getElementById('score');
    this.weaponNameElement = document.getElementById('weapon-name');
    this.weaponIconElement = document.getElementById('weapon-icon');
    this.feedbackElement = document.getElementById('shot-feedback');
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayCopy = document.getElementById('overlay-copy');
    this.startButton = document.getElementById('start-button');
    this.overlayRestart = document.getElementById('overlay-restart');
    this.aimButton = document.getElementById('aim-toggle');
    this.aimState = document.getElementById('aim-state');
    this.soundButton = document.getElementById('sound-toggle');
    this.soundState = document.getElementById('sound-state');
    this.weaponButtons = [];
    this.feedbackTimer = 0;

    const weaponList = document.getElementById('weapon-list');
    const mobileGuns = document.getElementById('mobile-guns');
    WEAPONS.forEach((weapon, index) => {
      const desktopButton = this.createWeaponButton(index, false);
      const mobileButton = this.createWeaponButton(index, true);
      weaponList.append(desktopButton);
      mobileGuns.append(mobileButton);
      this.weaponButtons.push(desktopButton, mobileButton);
    });

    this.selectWeaponCallback = onSelectWeapon;
    this.aimButton.addEventListener('click', onToggleAim);
    this.soundButton.addEventListener('click', onToggleMute);
    this.startButton.addEventListener('click', onStart);
    this.overlayRestart.addEventListener('click', onRestart);
    document.getElementById('restart-button').addEventListener('click', onRestart);
  }

  createWeaponButton(index, mobile) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = mobile ? 'mobile-gun' : 'weapon-choice';
    button.textContent = mobile ? String(index + 1) : `${index + 1}`;
    button.setAttribute('aria-label', `Select ${WEAPONS[index].name}`);
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    button.addEventListener('click', () => this.selectWeaponCallback(index));
    return button;
  }

  setScore(score) {
    this.scoreElement.textContent = String(score).padStart(5, '0');
  }

  setWeapon(weapon, index) {
    this.weaponNameElement.textContent = weapon.name;
    this.weaponIconElement.textContent = weapon.icon;
    const buttons = document.querySelectorAll('.weapon-choice, .mobile-gun');
    buttons.forEach((button, buttonIndex) => {
      button.setAttribute('aria-pressed', buttonIndex % WEAPONS.length === index ? 'true' : 'false');
    });
  }

  setAimAssist(enabled) {
    this.aimButton.setAttribute('aria-pressed', String(enabled));
    this.aimState.textContent = enabled ? 'ON' : 'OFF';
  }

  setMuted(muted) {
    this.soundButton.setAttribute('aria-pressed', String(muted));
    this.soundButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    this.soundState.textContent = muted ? 'OFF' : 'ON';
  }

  showOverlay({ title, copy, buttonText, showRestart = false }) {
    this.overlayTitle.innerHTML = title;
    this.overlayCopy.textContent = copy;
    this.startButton.firstChild.textContent = buttonText;
    this.overlayRestart.hidden = !showRestart;
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  showFeedback(text, hit) {
    this.feedbackElement.textContent = text;
    this.feedbackElement.classList.toggle('hit', hit);
    this.feedbackElement.classList.add('visible');
    this.feedbackTimer = 0.65;
  }

  update(delta) {
    this.feedbackTimer = Math.max(0, this.feedbackTimer - delta);
    if (this.feedbackTimer === 0) this.feedbackElement.classList.remove('visible');
  }
}

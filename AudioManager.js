const AUDIO_PATH = '/audio/';

export class AudioManager {
  constructor() {
    this.muted = false;
    this.started = false;
    this.paused = false;
    this.activeVoices = new Set();
    this.reportedErrors = new Set();
    this.ambient = new Audio(`${AUDIO_PATH}water-wind-loop.mp3`);
    this.ambient.loop = true;
    this.ambient.preload = 'none';
    this.ambient.volume = 0.2;
    this.gunshots = [1, 2, 3, 4].map((number) =>
      this.createSound(`gunshot-${number}.mp3`, 0.62)
    );
    this.reload = this.createSound('reload.mp3', 0.7);
    this.birdHit = this.createSound('bird-hit.mp3', 0.58);
  }

  createSound(file, volume) {
    const sound = new Audio(`${AUDIO_PATH}${file}`);
    sound.preload = 'none';
    sound.volume = volume;
    return sound;
  }

  start() {
    this.started = true;
    this.paused = false;
    this.updateAmbient();
  }

  setPaused(paused) {
    this.paused = paused;
    this.updateAmbient();
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      this.ambient.pause();
      for (const voice of this.activeVoices) {
        voice.pause();
        voice.currentTime = 0;
      }
      this.activeVoices.clear();
    } else {
      this.updateAmbient();
    }
  }

  playGunshot(index) {
    this.play(this.gunshots[index]);
  }

  playReload() {
    this.play(this.reload);
  }

  playBirdHit() {
    this.play(this.birdHit);
  }

  updateAmbient() {
    if (!this.started || this.paused || this.muted) {
      this.ambient.pause();
      return;
    }
    this.playElement(this.ambient, 'water-wind-loop.mp3');
  }

  play(sound) {
    if (!this.started || this.paused || this.muted || !sound) return;
    const voice = sound.cloneNode();
    voice.preload = 'auto';
    voice.addEventListener('ended', () => this.activeVoices.delete(voice), { once: true });
    voice.addEventListener('error', () => this.activeVoices.delete(voice), { once: true });
    this.activeVoices.add(voice);
    this.playElement(voice, sound.src.slice(sound.src.lastIndexOf('/') + 1));
  }

  playElement(element, file) {
    element.play().catch((error) => {
      if (this.reportedErrors.has(file)) return;
      this.reportedErrors.add(file);
      console.error(`Unable to play /audio/${file}. Check that the audio file exists and is playable.`, error);
    });
  }

  dispose() {
    this.started = false;
    this.ambient.pause();
    for (const voice of this.activeVoices) voice.pause();
    this.activeVoices.clear();
  }
}

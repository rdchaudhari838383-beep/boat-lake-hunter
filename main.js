import './style.css';
import { Game } from './Game.js';

const game = new Game();

window.addEventListener('pagehide', () => game.dispose(), { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.dispose());
}

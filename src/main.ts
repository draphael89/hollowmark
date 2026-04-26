import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './game/layout';
import { THEME } from './game/theme';
import { sceneRouteFromLocation, scenesForRoute } from './scenes/sceneRouting';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = '<div id="game-root"></div>';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-root',
  backgroundColor: THEME.text.void,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: scenesForRoute(sceneRouteFromLocation(window.location)),
};

new Phaser.Game(config);

function resizePixelCanvas() {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
  if (!canvas) return;

  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)));
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
  canvas.style.imageRendering = 'pixelated';
}

window.addEventListener('resize', resizePixelCanvas);
window.requestAnimationFrame(resizePixelCanvas);

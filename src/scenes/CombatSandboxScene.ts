import Phaser from 'phaser';
import { planFeelCues, type FeelCue } from '../fx/feelScheduler';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/layout';
import { MOTION } from '../game/motion';
import { THEME } from '../game/theme';
import type { GameEvent } from '../game/types';
import { publishDevSceneDebug } from './devSceneDebug';

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;

type CueButton = Readonly<{
  key: string;
  label: string;
  event: GameEvent;
}>;

const cues: readonly CueButton[] = [
  { key: 'ONE', label: '1 Light hit', event: damage(3) },
  { key: 'TWO', label: '2 Heavy hit', event: damage(12) },
  { key: 'THREE', label: '3 Blocked', event: { ...damage(0), blocked: 6 } },
  { key: 'FOUR', label: '4 Debt', event: { type: 'DEBT_GAINED', heroId: 'mia', amount: 4, total: 4, source: { kind: 'hero', id: 'mia' } } },
  { key: 'FIVE', label: '5 Victory', event: { type: 'VICTORY' } },
  { key: 'SIX', label: '6 Defeat', event: { type: 'DEFEAT' } },
];

export class CombatSandboxScene extends Phaser.Scene {
  private fx!: Phaser.GameObjects.Group;
  private statusLabel!: Phaser.GameObjects.Text;
  private audioContext: AudioContext | null = null;
  private lastCue = 'ready';

  constructor() {
    super('CombatSandboxScene');
  }

  create(): void {
    this.fx = this.add.group();
    this.drawShell();
    cues.forEach((cue) => {
      this.input.keyboard?.on(`keydown-${cue.key}`, () => this.trigger(cue));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audioContext?.close();
      this.audioContext = null;
    });
    publishDevSceneDebug(this, 'combat-sandbox', this.lastCue);
  }

  private trigger(cue: CueButton): void {
    this.lastCue = cue.label;
    this.statusLabel.setText(`Last: ${this.lastCue}`);
    for (const feelCue of planFeelCues(cue.event)) this.playFeelCue(feelCue);
    publishDevSceneDebug(this, 'combat-sandbox', this.lastCue);
  }

  private drawShell(): void {
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);
    g.fillStyle(colors.combatVoid, 1).fillRect(38, 50, 360, 190);
    g.fillStyle(colors.oxblood, 1).fillTriangle(168, 180, 218, 90, 268, 180);
    g.fillStyle(colors.gold, 1).fillCircle(204, 132, 4).fillCircle(232, 132, 4);
    g.fillStyle(colors.panelDeep, 1).fillRect(424, 50, 174, 190);

    this.label('Combat Sandbox', 32, 28, text.gold);
    cues.forEach((cue, index) => this.label(cue.label, 440, 66 + index * 22, text.bone));
    this.statusLabel = this.add.text(32, 260, `Last: ${this.lastCue}`, { ...textStyle, color: text.cyan });
  }

  private playFeelCue(cue: FeelCue): void {
    if (cue.type === 'shake') {
      this.cameras.main.shake(cue.durationMs, cue.intensity);
      return;
    }
    if (cue.type === 'hit-stop') {
      this.time.timeScale = 0.001;
      window.setTimeout(() => { this.time.timeScale = 1; }, cue.durationMs);
      return;
    }
    if (cue.type === 'float-text') {
      this.float(cue.text, cue.target === 'enemy' ? 218 : 510, cue.target === 'debt' ? 170 : 118, cue.tone === 'debt' ? text.red : text.gold);
      return;
    }
    if (cue.type === 'tone') this.tone(cue.tone.frequencyHz, cue.tone.durationMs);
  }

  private float(labelText: string, x: number, y: number, color: string): void {
    const label = this.add.text(x, y, labelText, { ...textStyle, color, fontSize: MOTION.text.largeFloatFontSize });
    this.fx.add(label);
    this.tweens.add({
      targets: label,
      y: y + MOTION.text.floatDriftY,
      alpha: 0,
      duration: MOTION.fx.damageFloatMs,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private tone(frequency: number, durationMs: number): void {
    this.audioContext ??= new AudioContext();
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.value = MOTION.audio.squareGain;
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + durationMs / 1000);
  }

  private label(value: string, x: number, y: number, color: string): void {
    this.add.text(x, y, value, { ...textStyle, color });
  }
}

function damage(amount: number): Extract<GameEvent, { type: 'DAMAGE_DEALT' }> {
  return {
    type: 'DAMAGE_DEALT',
    source: { kind: 'hero', id: 'liese' },
    target: { kind: 'enemy', id: 'root-wolf' },
    amount,
    blocked: 0,
    lethal: false,
    tags: ['physical'],
  };
}

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SIDE_PANEL, TRAY, VIEWPORT } from '../game/constants';
import type { CardDef, CardId, CombatEvent, HeroState, SliceCommand, SliceState } from '../game/types';
import { applyCommand, createSliceState } from '../systems/slice';

declare global {
  interface Window {
    __HOLLOWMARK_DEBUG__?: {
      state: SliceState;
      selectedCardId: CardId | null;
    };
  }
}

const colors = {
  void: 0x08080f,
  panel: 0x10121c,
  stone: 0x1f2236,
  stoneLight: 0x3f4870,
  bone: 0xe4d4b0,
  mutedBone: 0xc9b79a,
  oxblood: 0x7a1f2b,
  red: 0xa03040,
  gold: 0xf2c36b,
  moss: 0x4a6b3a,
  cyan: 0x6fb1d6,
};

const textStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '10px',
  color: '#e4d4b0',
};

export class S0Scene extends Phaser.Scene {
  private state = createSliceState();
  private selectedCardId: CardId | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    super('S0Scene');
  }

  create() {
    this.input.keyboard?.on('keydown-W', () => this.dispatch({ type: 'step-forward' }));
    this.input.keyboard?.on('keydown-UP', () => this.dispatch({ type: 'step-forward' }));
    this.input.keyboard?.on('keydown-S', () => this.dispatch({ type: 'step-back' }));
    this.input.keyboard?.on('keydown-DOWN', () => this.dispatch({ type: 'step-back' }));
    this.input.keyboard?.on('keydown-A', () => this.dispatch({ type: 'turn-left' }));
    this.input.keyboard?.on('keydown-LEFT', () => this.dispatch({ type: 'turn-left' }));
    this.input.keyboard?.on('keydown-D', () => this.dispatch({ type: 'turn-right' }));
    this.input.keyboard?.on('keydown-RIGHT', () => this.dispatch({ type: 'turn-right' }));
    this.input.keyboard?.on('keydown-SPACE', () => this.dispatch({ type: 'interact' }));
    this.input.keyboard?.on('keydown-H', () => this.holdSelected());
    this.input.keyboard?.on('keydown-ENTER', () => this.playSelected());
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => this.selectCard(index));
    });

    this.render();
  }

  private dispatch(command: SliceCommand) {
    const before = this.state;
    this.state = applyCommand(this.state, command);

    if (command.type === 'step-forward' || command.type === 'step-back') {
      this.stepFeedback(before.position.x !== this.state.position.x || before.position.y !== this.state.position.y);
    }

    if (command.type === 'turn-left' || command.type === 'turn-right') {
      this.tone(180, 45);
    }

    if (command.type === 'play-card') {
      this.selectedCardId = null;
    }

    this.render();
  }

  private render() {
    this.children.removeAll();
    this.cameras.main.setBackgroundColor(colors.void);
    this.drawShell();
    this.drawViewport();
    this.drawTray();
    this.drawSidePanel();
    this.drawFooter();
    this.publishDebug();
  }

  private drawShell() {
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.panel(g, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, VIEWPORT.h);
    this.panel(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h);
    this.panel(g, SIDE_PANEL.x, SIDE_PANEL.y, SIDE_PANEL.w, SIDE_PANEL.h);
  }

  private drawViewport() {
    if (this.state.mode === 'combat' || this.state.mode === 'victory') {
      this.drawCombatView();
      return;
    }

    const g = this.add.graphics();
    const threatTint = this.state.threat === 'hunted' ? colors.red : this.state.threat === 'uneasy' ? colors.gold : colors.stoneLight;
    g.fillStyle(0x05050a, 1).fillRect(VIEWPORT.x + 4, VIEWPORT.y + 4, VIEWPORT.w - 8, VIEWPORT.h - 8);
    g.fillStyle(colors.stone, 1).fillTriangle(64, 215, 204, 36, 344, 215);
    g.fillStyle(0x131728, 1).fillTriangle(8, 228, 204, 36, 64, 215);
    g.fillStyle(0x171a2c, 1).fillTriangle(400, 228, 204, 36, 344, 215);
    g.lineStyle(2, threatTint, 0.9).strokeRect(68, 42, 272, 170);
    g.fillStyle(colors.void, 0.55).fillRect(96, 72, 216, 108);
    g.lineStyle(1, colors.moss, 0.8);
    for (let x = 122; x < 300; x += 34) g.lineBetween(x, 55, x - 22, 190);

    if (this.state.threat === 'hunted') {
      g.fillStyle(colors.oxblood, 0.85).fillEllipse(204, 145, 86, 44);
      g.fillStyle(colors.gold, 1).fillCircle(188, 130, 3).fillCircle(220, 130, 3);
      this.label('Rootbitten Wolf', 165, 94, '#f2c36b');
      this.label('Intent: Bite 6', 170, 108, '#a03040');
    }

    this.label(`Facing ${this.state.facing.toUpperCase()}  ${this.state.position.x},${this.state.position.y}`, 18, 18);
  }

  private drawCombatView() {
    const g = this.add.graphics();
    g.fillStyle(0x090b12, 1).fillRect(VIEWPORT.x + 4, VIEWPORT.y + 4, VIEWPORT.w - 8, VIEWPORT.h - 8);
    g.fillStyle(colors.stone, 1).fillRect(32, 46, 344, 156);
    g.fillStyle(0x0b0d15, 0.78).fillRect(48, 74, 312, 112);
    g.fillStyle(colors.moss, 0.35).fillEllipse(204, 176, 192, 28);

    const combat = this.assertCombat();
    const enemyTint = combat.enemy.marked ? colors.gold : colors.oxblood;
    g.fillStyle(0x151111, 1).fillEllipse(204, 150, 114, 56);
    g.fillStyle(enemyTint, 1).fillTriangle(146, 150, 204, 70, 262, 150);
    g.fillStyle(colors.gold, 1).fillCircle(187, 119, 4).fillCircle(221, 119, 4);
    g.lineStyle(1, colors.bone, 1).strokeRect(148, 64, 112, 104);

    this.label(combat.enemy.name, 154, 48, '#f2c36b');
    this.label(`${combat.enemy.hp}/${combat.enemy.maxHp} HP`, 178, 174);
    this.label(combat.enemy.intent, 160, 30, '#a03040');
    this.add
      .zone(148, 64, 112, 104)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.playSelected());

    if (this.state.mode === 'victory') this.label('VICTORY: the command log can replay this slice.', 72, 196, '#6fb1d6');
  }

  private drawTray() {
    if (this.state.mode !== 'combat' && this.state.mode !== 'victory') {
      this.label(this.state.log.slice(-3).join('\n'), TRAY.x + 10, TRAY.y + 12);
      this.label('W/S step   A/D turn   Space interact', TRAY.x + 10, TRAY.y + 58, '#c9b79a');
      return;
    }

    const combat = this.assertCombat();
    const g = this.add.graphics();
    this.label(`Energy ${combat.energy}/3`, TRAY.x + 10, TRAY.y + 8, '#f2c36b');

    combat.hand.forEach((card, index) => {
      this.drawCard(card, TRAY.x + 8 + index * 76, TRAY.y + 23);
    });

    const heldLabel = combat.held ? combat.held.name : 'empty';
    g.lineStyle(1, colors.gold, 1).strokeRect(TRAY.x + 306, TRAY.y + 6, 78, 14);
    this.label(`Hold: ${heldLabel}`, TRAY.x + 310, TRAY.y + 9, '#f2c36b');
    this.add
      .zone(TRAY.x + 306, TRAY.y + 6, 78, 14)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.holdSelected());
  }

  private drawCard(card: CardDef, x: number, y: number) {
    const g = this.add.graphics();
    const selected = card.id === this.selectedCardId;
    g.fillStyle(card.debt > 0 ? colors.oxblood : colors.panel, 1).fillRect(x, y, 70, 46);
    g.lineStyle(1, selected ? colors.gold : colors.stoneLight, 1).strokeRect(x, y, 70, 46);
    this.label(`${card.cost} ${card.name}`, x + 4, y + 4, selected ? '#f2c36b' : '#e4d4b0');
    this.label(card.text, x + 4, y + 20, card.debt > 0 ? '#f2c36b' : '#c9b79a');
    this.add
      .zone(x, y, 70, 46)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => {
        this.selectedCardId = card.id;
        this.tone(260, 35);
        this.render();
      });
  }

  private drawSidePanel() {
    const combat = this.state.combat;
    const heroes = combat?.heroes ?? [
      { id: 'liese', name: 'Liese', role: 'Warrior', hp: 31, maxHp: 31, block: 0, debt: 0 },
      { id: 'eris', name: 'Eris', role: 'Priest', hp: 24, maxHp: 24, block: 0, debt: 0 },
      { id: 'mia', name: 'Mia', role: 'Mage', hp: 20, maxHp: 20, block: 0, debt: 0 },
      { id: 'robin', name: 'Robin', role: 'Ranger', hp: 23, maxHp: 23, block: 0, debt: 0 },
    ];

    this.label('MINIMAP', SIDE_PANEL.x + 10, SIDE_PANEL.y + 10, '#f2c36b');
    this.drawMiniMap();
    heroes.forEach((hero, index) => this.drawHero(hero, SIDE_PANEL.y + 70 + index * 48));
    this.label(`Seed: ${this.state.seed}`, SIDE_PANEL.x + 10, SIDE_PANEL.y + 270, '#c9b79a');
    this.label(`Commands: ${this.state.commandLog.length}`, SIDE_PANEL.x + 10, SIDE_PANEL.y + 286, '#c9b79a');
  }

  private drawMiniMap() {
    const g = this.add.graphics();
    const x = SIDE_PANEL.x + 12;
    const y = SIDE_PANEL.y + 28;
    g.lineStyle(1, colors.stoneLight, 1).strokeRect(x, y, 56, 30);
    [
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ].forEach((tile) => {
      const tileColor = tile.x === this.state.position.x && tile.y === this.state.position.y ? colors.gold : colors.mutedBone;
      g.fillStyle(tileColor, 1).fillRect(x + tile.x * 12, y + tile.y * 7 - 4, 9, 5);
    });
  }

  private drawHero(hero: HeroState, y: number) {
    const g = this.add.graphics();
    const x = SIDE_PANEL.x + 10;
    g.fillStyle(colors.panel, 1).fillRect(x, y, 204, 38);
    g.lineStyle(1, hero.debt >= 4 ? colors.red : colors.stoneLight, 1).strokeRect(x, y, 204, 38);
    this.label(`${hero.name}  ${hero.role}`, x + 6, y + 5);
    this.bar(x + 6, y + 19, 86, 6, hero.hp / hero.maxHp, colors.red);
    this.label(`${hero.hp}/${hero.maxHp}`, x + 98, y + 16);
    this.label(`Blk ${hero.block}`, x + 140, y + 5, '#6fb1d6');
    this.label(`Debt ${hero.debt}`, x + 140, y + 20, hero.debt > 0 ? '#f2c36b' : '#c9b79a');
  }

  private drawFooter() {
    const g = this.add.graphics();
    g.fillStyle(colors.panel, 1).fillRect(8, 322, 624, 30);
    g.lineStyle(1, colors.oxblood, 1).strokeRect(8, 322, 624, 30);
    const threat = this.state.threat === 'calm' ? 'calm torch' : this.state.threat === 'uneasy' ? 'uneasy flame' : 'hunted silence';
    const selected = this.selectedCardId ? `Selected ${this.selectedCardId}` : 'Select a card, then click enemy or Hold';
    this.label(`${threat}     ${selected}`, 18, 331, this.state.threat === 'hunted' ? '#f2c36b' : '#c9b79a');
  }

  private panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.fillStyle(colors.panel, 1).fillRect(x, y, w, h);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(x, y, w, h);
    g.lineStyle(1, colors.stoneLight, 0.9).strokeRect(x + 3, y + 3, w - 6, h - 6);
  }

  private bar(x: number, y: number, w: number, h: number, ratio: number, color: number) {
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(x, y, w, h);
    g.fillStyle(color, 1).fillRect(x, y, Math.round(w * ratio), h);
    g.lineStyle(1, colors.stoneLight, 1).strokeRect(x, y, w, h);
  }

  private label(text: string, x: number, y: number, color = '#e4d4b0') {
    this.add.text(Math.round(x), Math.round(y), text, { ...textStyle, color });
  }

  private selectCard(index: number) {
    const card = this.state.combat?.hand[index];
    if (!card) return;
    this.selectedCardId = card.id;
    this.render();
  }

  private holdSelected() {
    if (!this.selectedCardId || this.state.mode !== 'combat') return;
    this.dispatch({ type: 'hold-card', cardId: this.selectedCardId });
    this.selectedCardId = null;
  }

  private playSelected() {
    if (!this.selectedCardId || this.state.mode !== 'combat') return;
    const before = this.assertCombat();
    this.dispatch({ type: 'play-card', cardId: this.selectedCardId });
    const after = this.assertCombat();
    this.playCardFeedback(before.enemy.hp - after.enemy.hp, before.heroes, after.heroes);
  }

  private stepFeedback(moved: boolean) {
    if (moved) {
      this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 2, 70, 'Sine.easeOut', true);
      this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 90, 'Sine.easeIn', true);
      this.tone(96, 65);
      return;
    }

    this.cameras.main.shake(100, 0.006);
    this.tone(62, 90);
  }

  private playCardFeedback(damage: number, beforeHeroes: HeroState[], afterHeroes: HeroState[]) {
    const debtChanged = afterHeroes.some((hero, index) => hero.debt !== beforeHeroes[index]!.debt);
    const events: CombatEvent[] = damage > 0 ? [{ type: 'DAMAGE', amount: damage }] : [];
    if (debtChanged) events.push({ type: 'DEBT', heroId: 'mia', amount: 4 });

    if (events.some((event) => event.type === 'DAMAGE')) {
      this.time.delayedCall(60, () => {
        this.cameras.main.shake(130, 0.006);
        this.floatingText(`-${damage}`, 198, 96, '#f2c36b');
        this.tone(120, 80);
      });
    }
    if (debtChanged) this.floatingText('+debt', SIDE_PANEL.x + 152, SIDE_PANEL.y + 184, '#a03040');
  }

  private floatingText(text: string, x: number, y: number, color: string) {
    const label = this.add.text(x, y, text, { ...textStyle, color, fontSize: '14px' });
    this.tweens.add({ targets: label, y: y - 20, alpha: 0, duration: 420, ease: 'Cubic.easeOut' });
  }

  private tone(frequency: number, durationMs: number) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.025;
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + durationMs / 1000);
  }

  private assertCombat() {
    if (!this.state.combat) throw new Error('Expected combat state');
    return this.state.combat;
  }

  private publishDebug() {
    window.__HOLLOWMARK_DEBUG__ = {
      state: this.state,
      selectedCardId: this.selectedCardId,
    };
  }
}

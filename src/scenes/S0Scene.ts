import Phaser from 'phaser';
import { EventScheduler, FX_TIMING } from '../fx/eventScheduler';
import { GAME_HEIGHT, GAME_WIDTH, SIDE_PANEL, TRAY, VIEWPORT } from '../game/constants';
import type { CardDef, CardInstanceId, GameEvent, HeroId, HeroState, SliceCommand, SliceState } from '../game/types';
import { cardDefFor, renderIntentText } from '../systems/combat';
import { applyCommand, createSliceState } from '../systems/slice';

declare global {
  interface Window {
    __HOLLOWMARK_DEBUG__?: {
      objectCounts: {
        total: number;
        dynamicLabels: number;
        fx: number;
        hitZones: number;
      };
      pendingEvents: number;
      state: SliceState;
      selectedCardId: CardInstanceId | null;
      intentText: string | null;
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
  private selectedCardId: CardInstanceId | null = null;
  private audioContext: AudioContext | null = null;
  private shell!: Phaser.GameObjects.Graphics;
  private viewport!: Phaser.GameObjects.Graphics;
  private tray!: Phaser.GameObjects.Graphics;
  private sidePanel!: Phaser.GameObjects.Graphics;
  private footer!: Phaser.GameObjects.Graphics;
  private dynamicLabels!: Phaser.GameObjects.Group;
  private eventScheduler!: EventScheduler;
  private fx!: Phaser.GameObjects.Group;
  private hitZones!: Phaser.GameObjects.Group;

  constructor() {
    super('S0Scene');
  }

  create() {
    this.buildViews();
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
    this.input.keyboard?.on('keydown-T', () => this.endTurn());
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => this.selectCard(index));
    });

    this.syncFromState();
  }

  private buildViews() {
    this.cameras.main.setBackgroundColor(colors.void);
    this.shell = this.add.graphics();
    this.viewport = this.add.graphics();
    this.tray = this.add.graphics();
    this.sidePanel = this.add.graphics();
    this.footer = this.add.graphics();
    this.dynamicLabels = this.add.group();
    this.eventScheduler = new EventScheduler(this);
    this.fx = this.add.group();
    this.hitZones = this.add.group();
    this.drawShell();
  }

  private dispatch(command: SliceCommand): GameEvent[] {
    const result = applyCommand(this.state, command);
    this.state = result.state;

    if (command.type === 'play-card') {
      this.selectedCardId = null;
    }

    this.syncFromState();
    this.eventScheduler.enqueue(result.events, (event) => this.handleEvent(event));
    this.publishDebug();
    return result.events;
  }

  private handleEvent(event: GameEvent) {
    if (event.type === 'STEP_MOVED') this.stepFeedback(true);
    if (event.type === 'STEP_BUMPED') this.stepFeedback(false);
    if (event.type === 'FACING_CHANGED') this.tone(180, FX_TIMING.turnToneMs);
    if (event.type === 'DAMAGE' && event.amount > 0) this.damageFeedback(event);
    if (event.type === 'DEBT') this.floatingText('+debt', SIDE_PANEL.x + 152, SIDE_PANEL.y + 184, '#a03040');
    this.publishDebug();
  }

  private syncFromState() {
    this.clearDynamicViews();
    this.viewport.clear();
    this.tray.clear();
    this.sidePanel.clear();
    this.footer.clear();
    this.drawViewport();
    this.drawTray();
    this.drawSidePanel();
    this.drawFooter();
    this.publishDebug();
  }

  private drawShell() {
    const g = this.shell;
    g.clear();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.panel(g, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, VIEWPORT.h);
    this.panel(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h);
    this.panel(g, SIDE_PANEL.x, SIDE_PANEL.y, SIDE_PANEL.w, SIDE_PANEL.h);
  }

  private drawViewport() {
    if (this.state.mode === 'combat' || this.state.mode === 'victory' || this.state.mode === 'defeat') {
      this.drawCombatView();
      return;
    }

    const g = this.viewport;
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
    const g = this.viewport;
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
    this.label(renderIntentText(combat.enemy.intent), 160, 30, '#a03040');
    this.zone(148, 64, 112, 104, () => this.playSelected());

    if (this.state.mode === 'victory') this.label('VICTORY: the command log can replay this slice.', 72, 196, '#6fb1d6');
    if (this.state.mode === 'defeat') this.label('DEFEAT: the Underroot remembers the party.', 74, 196, '#a03040');
  }

  private drawTray() {
    if (this.state.mode !== 'combat' && this.state.mode !== 'victory' && this.state.mode !== 'defeat') {
      this.label(this.state.log.slice(-3).join('\n'), TRAY.x + 10, TRAY.y + 12);
      this.label('W/S step   A/D turn   Space interact', TRAY.x + 10, TRAY.y + 58, '#c9b79a');
      return;
    }

    const combat = this.assertCombat();
    const g = this.tray;
    this.label(`Energy ${combat.energy}/3`, TRAY.x + 10, TRAY.y + 8, '#f2c36b');
    g.lineStyle(1, colors.cyan, 1).strokeRect(TRAY.x + 220, TRAY.y + 6, 70, 14);
    this.label('End Turn', TRAY.x + 232, TRAY.y + 9, '#6fb1d6');
    this.zone(TRAY.x + 220, TRAY.y + 6, 70, 14, () => this.endTurn());

    combat.hand.forEach((cardId, index) => {
      this.drawCard(cardId, cardDefFor(combat, cardId), TRAY.x + 8 + index * 76, TRAY.y + 23);
    });

    const heldLabel = combat.held ? cardDefFor(combat, combat.held).name : 'empty';
    const heldSelected = combat.held === this.selectedCardId;
    g.lineStyle(1, heldSelected ? colors.cyan : colors.gold, 1).strokeRect(TRAY.x + 306, TRAY.y + 6, 78, 14);
    this.label(`Hold: ${heldLabel}`, TRAY.x + 310, TRAY.y + 9, heldSelected ? '#6fb1d6' : '#f2c36b');
    this.zone(TRAY.x + 306, TRAY.y + 6, 78, 14, () => this.selectHeldOrHold());
  }

  private drawCard(cardId: CardInstanceId, card: CardDef, x: number, y: number) {
    const g = this.tray;
    const selected = cardId === this.selectedCardId;
    g.fillStyle(card.debt > 0 ? colors.oxblood : colors.panel, 1).fillRect(x, y, 70, 46);
    g.lineStyle(1, selected ? colors.gold : colors.stoneLight, 1).strokeRect(x, y, 70, 46);
    this.label(`${card.cost} ${card.name}`, x + 4, y + 4, selected ? '#f2c36b' : '#e4d4b0');
    this.label(card.text, x + 4, y + 20, card.debt > 0 ? '#f2c36b' : '#c9b79a');
    this.zone(x, y, 70, 46, () => {
      this.selectedCardId = cardId;
      this.tone(260, 35);
      this.syncFromState();
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
    const g = this.sidePanel;
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
    const g = this.sidePanel;
    const x = SIDE_PANEL.x + 10;
    g.fillStyle(colors.panel, 1).fillRect(x, y, 204, 38);
    g.lineStyle(1, hero.debt >= 4 ? colors.red : colors.stoneLight, 1).strokeRect(x, y, 204, 38);
    this.label(`${hero.name}  ${hero.role}`, x + 6, y + 5);
    this.bar(this.sidePanel, x + 6, y + 19, 86, 6, hero.hp / hero.maxHp, colors.red);
    this.label(`${hero.hp}/${hero.maxHp}`, x + 98, y + 16);
    this.label(`Blk ${hero.block}`, x + 140, y + 5, '#6fb1d6');
    this.label(`Debt ${hero.debt}`, x + 140, y + 20, hero.debt > 0 ? '#f2c36b' : '#c9b79a');
  }

  private drawFooter() {
    const g = this.footer;
    g.fillStyle(colors.panel, 1).fillRect(8, 322, 624, 30);
    g.lineStyle(1, colors.oxblood, 1).strokeRect(8, 322, 624, 30);
    const threat = this.state.threat === 'calm' ? 'calm torch' : this.state.threat === 'uneasy' ? 'uneasy flame' : 'hunted silence';
    const selected =
      this.selectedCardId && this.state.combat
        ? `Selected ${cardDefFor(this.state.combat, this.selectedCardId).name}`
        : 'Select card, click enemy/Hold, or T/Enter to end turn';
    this.label(`${threat}     ${selected}`, 18, 331, this.state.threat === 'hunted' ? '#f2c36b' : '#c9b79a');
  }

  private panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.fillStyle(colors.panel, 1).fillRect(x, y, w, h);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(x, y, w, h);
    g.lineStyle(1, colors.stoneLight, 0.9).strokeRect(x + 3, y + 3, w - 6, h - 6);
  }

  private bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, ratio: number, color: number) {
    g.fillStyle(colors.void, 1).fillRect(x, y, w, h);
    g.fillStyle(color, 1).fillRect(x, y, Math.round(w * ratio), h);
    g.lineStyle(1, colors.stoneLight, 1).strokeRect(x, y, w, h);
  }

  private label(text: string, x: number, y: number, color = '#e4d4b0') {
    const label = this.add.text(Math.round(x), Math.round(y), text, { ...textStyle, color });
    this.dynamicLabels.add(label);
  }

  private zone(x: number, y: number, w: number, h: number, onClick: () => void) {
    const zone = this.add.zone(x, y, w, h).setOrigin(0).setInteractive().on('pointerdown', onClick);
    this.hitZones.add(zone);
  }

  private clearDynamicViews() {
    this.dynamicLabels.clear(true, true);
    this.hitZones.clear(true, true);
  }

  private selectCard(index: number) {
    const cardId = this.state.combat?.hand[index];
    if (!cardId) return;
    this.selectedCardId = cardId;
    this.syncFromState();
  }

  private holdSelected() {
    if (!this.selectedCardId || this.state.mode !== 'combat') return;
    const cardId = this.selectedCardId;
    this.selectedCardId = null;
    this.dispatch({ type: 'hold-card', cardId });
  }

  private selectHeldOrHold() {
    if (this.state.mode !== 'combat') return;
    const heldCard = this.state.combat?.held;

    if (!heldCard) {
      this.holdSelected();
      return;
    }

    this.selectedCardId = heldCard;
    this.tone(260, 35);
    this.syncFromState();
  }

  private playSelected() {
    if (this.state.mode === 'combat' && !this.selectedCardId) {
      this.endTurn();
      return;
    }
    if (!this.selectedCardId || this.state.mode !== 'combat') return;
    this.dispatch({ type: 'play-card', cardId: this.selectedCardId });
  }

  private endTurn() {
    if (this.state.mode !== 'combat') return;
    this.selectedCardId = null;
    this.dispatch({ type: 'end-turn' });
  }

  private stepFeedback(moved: boolean) {
    if (moved) {
      this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 2, 70, 'Sine.easeOut', true);
      this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 90, 'Sine.easeIn', true);
      this.tone(96, FX_TIMING.stepToneMs);
      return;
    }

    this.cameras.main.shake(FX_TIMING.bumpMs, 0.006);
    this.tone(62, 90);
  }

  private damageFeedback(event: Extract<GameEvent, { type: 'DAMAGE' }>) {
    const x = event.target === 'enemy' ? 198 : SIDE_PANEL.x + 64;
    const y = event.target === 'enemy' ? 96 : SIDE_PANEL.y + 88 + heroIndex(event.target) * 48;
    this.cameras.main.shake(130, 0.006);
    this.floatingText(`-${event.amount}`, x, y, event.target === 'enemy' ? '#f2c36b' : '#a03040');
    this.tone(120, 80);
  }

  private floatingText(text: string, x: number, y: number, color: string) {
    const label = this.add.text(x, y, text, { ...textStyle, color, fontSize: '14px' });
    this.fx.add(label);
    this.tweens.add({
      targets: label,
      y: y - 20,
      alpha: 0,
      duration: FX_TIMING.damageFloatMs,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.fx.remove(label, true, true);
        this.publishDebug();
      },
    });
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
      objectCounts: {
        total: this.children.length,
        dynamicLabels: this.dynamicLabels.getLength(),
        fx: this.fx.getLength(),
        hitZones: this.hitZones.getLength(),
      },
      pendingEvents: this.eventScheduler.getPendingCount(),
      state: this.state,
      selectedCardId: this.selectedCardId,
      intentText: this.state.combat ? renderIntentText(this.state.combat.enemy.intent) : null,
    };
  }
}

function heroIndex(heroId: HeroId): number {
  if (heroId === 'liese') return 0;
  if (heroId === 'eris') return 1;
  if (heroId === 'mia') return 2;
  return 3;
}

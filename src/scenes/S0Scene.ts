import Phaser from 'phaser';
import { EventScheduler } from '../fx/eventScheduler';
import { getInitialFeelSettings, planFeelCues, type FeelCue, type FeelSettings, type FeelTarget } from '../fx/feelScheduler';
import { GAME_HEIGHT, GAME_WIDTH, S0_LAYOUT, SIDE_PANEL, TRAY, VIEWPORT } from '../game/layout';
import { MOTION } from '../game/motion';
import { THEME } from '../game/theme';
import type { CardDef, CardInstanceId, GameEvent, HeroId, HeroState, SliceCommand, SliceState } from '../game/types';
import { cardDefFor, renderIntentText } from '../systems/combat';
import { floorForId } from '../data/floors';
import { deserializeSave, serializeSave } from '../systems/save';
import { applyCommand, createSliceState } from '../systems/slice';
import { computeViewSlots, viewSlot } from '../systems/viewSlots';

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
      feelSettings: FeelSettings;
      lastEvents: readonly GameEvent[];
    };
  }
}

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;
const layout = S0_LAYOUT;
const SAVE_KEY = 'hollowmark:s0-save';

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
  private feelSettings!: FeelSettings;
  private fx!: Phaser.GameObjects.Group;
  private hitZones!: Phaser.GameObjects.Group;
  private hitStopUntil = 0;
  private lastEvents: readonly GameEvent[] = [];

  constructor() {
    super('S0Scene');
  }

  create() {
    this.state = loadSavedState();
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
    this.input.keyboard?.on('keydown-R', () => this.restartRun());
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
    this.feelSettings = getInitialFeelSettings();
    this.fx = this.add.group();
    this.hitZones = this.add.group();
    this.drawShell();
  }

  private dispatch(command: SliceCommand): GameEvent[] {
    const result = applyCommand(this.state, command);
    this.state = result.state;
    this.lastEvents = result.events;
    persistState(this.state);

    if (command.type === 'play-card') {
      this.selectedCardId = null;
    }

    this.syncFromState();
    this.eventScheduler.enqueue(result.events, (event) => this.handleEvent(event));
    this.publishDebug();
    return result.events;
  }

  private restartRun(): void {
    if (this.state.mode !== 'victory' && this.state.mode !== 'defeat') return;
    clearSavedState();
    this.eventScheduler.reset();
    this.fx.clear(true, true);
    this.time.timeScale = 1;
    this.hitStopUntil = 0;
    this.selectedCardId = null;
    this.state = createSliceState();
    this.syncFromState();
  }

  private handleEvent(event: GameEvent) {
    planFeelCues(event, this.feelSettings).forEach((cue) => this.playFeelCue(cue));
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
    const viewport = layout.viewport;
    const floor = floorForId(this.state.floorId);
    const slots = computeViewSlots(floor, this.state.position, this.state.facing);
    const current = viewSlot(slots, 'current');
    const front = viewSlot(slots, 'front');
    const threat = current.threat === 'calm' && front.threat !== 'calm' ? front.threat : current.threat;
    const threatTint = threat === 'hunted' ? colors.red : threat === 'uneasy' ? colors.gold : colors.stoneLight;
    g.fillStyle(colors.voidDeep, 1).fillRect(
      VIEWPORT.x + viewport.innerPad,
      VIEWPORT.y + viewport.innerPad,
      VIEWPORT.w - viewport.innerPad * 2,
      VIEWPORT.h - viewport.innerPad * 2,
    );
    g.fillStyle(colors.stone, 1).fillTriangle(
      viewport.leftWall.x1,
      viewport.leftWall.y1,
      viewport.leftWall.x2,
      viewport.leftWall.y2,
      viewport.leftWall.x3,
      viewport.leftWall.y3,
    );
    g.fillStyle(colors.stoneLeft, 1).fillTriangle(
      viewport.leftWing.x1,
      viewport.leftWing.y1,
      viewport.leftWing.x2,
      viewport.leftWing.y2,
      viewport.leftWing.x3,
      viewport.leftWing.y3,
    );
    g.fillStyle(colors.stoneRight, 1).fillTriangle(
      viewport.rightWing.x1,
      viewport.rightWing.y1,
      viewport.rightWing.x2,
      viewport.rightWing.y2,
      viewport.rightWing.x3,
      viewport.rightWing.y3,
    );
    g.lineStyle(layout.panel.border, threatTint, THEME.alpha.exploreBackWall).strokeRect(
      viewport.exploreBackWall.x,
      viewport.exploreBackWall.y,
      viewport.exploreBackWall.w,
      viewport.exploreBackWall.h,
    );
    g.fillStyle(colors.void, THEME.alpha.exploreMouth).fillRect(
      viewport.exploreMouth.x,
      viewport.exploreMouth.y,
      viewport.exploreMouth.w,
      viewport.exploreMouth.h,
    );
    g.lineStyle(1, colors.moss, THEME.alpha.rootLines);
    for (let x = viewport.rootLines.startX; x < viewport.rootLines.endX; x += viewport.rootLines.stepX) {
      g.lineBetween(x, viewport.rootLines.topY, x + viewport.rootLines.dx, viewport.rootLines.bottomY);
    }

    if (current.threat === 'hunted' || front.threat === 'hunted') {
      g.fillStyle(colors.oxblood, THEME.alpha.huntedWolf).fillEllipse(
        viewport.huntedWolf.x,
        viewport.huntedWolf.y,
        viewport.huntedWolf.w,
        viewport.huntedWolf.h,
      );
      g.fillStyle(colors.gold, 1)
        .fillCircle(viewport.huntedEyeLeft.x, viewport.huntedEyeLeft.y, viewport.huntedEyeLeft.radius)
        .fillCircle(viewport.huntedEyeRight.x, viewport.huntedEyeRight.y, viewport.huntedEyeRight.radius);
      this.label('Rootbitten Wolf', viewport.huntedName.x, viewport.huntedName.y, text.gold);
      this.label('Intent: Bite 6', viewport.huntedIntent.x, viewport.huntedIntent.y, text.red);
    }

    this.label(`Facing ${this.state.facing.toUpperCase()}  ${current.coord.x},${current.coord.y}`, viewport.facingLabel.x, viewport.facingLabel.y);
  }

  private drawCombatView() {
    const g = this.viewport;
    const combatLayout = layout.combat;
    const viewport = layout.viewport;
    g.fillStyle(colors.combatVoid, 1).fillRect(
      VIEWPORT.x + viewport.innerPad,
      VIEWPORT.y + viewport.innerPad,
      VIEWPORT.w - viewport.innerPad * 2,
      VIEWPORT.h - viewport.innerPad * 2,
    );
    g.fillStyle(colors.stone, 1).fillRect(combatLayout.room.x, combatLayout.room.y, combatLayout.room.w, combatLayout.room.h);
    g.fillStyle(colors.panelDeep, THEME.alpha.combatBackWall).fillRect(combatLayout.backWall.x, combatLayout.backWall.y, combatLayout.backWall.w, combatLayout.backWall.h);
    g.fillStyle(colors.moss, THEME.alpha.combatFloorShadow).fillEllipse(
      combatLayout.floorShadow.x,
      combatLayout.floorShadow.y,
      combatLayout.floorShadow.w,
      combatLayout.floorShadow.h,
    );

    const combat = this.assertCombat();
    const enemyTint = combat.enemy.marked ? colors.gold : colors.oxblood;
    g.fillStyle(colors.wolfShadow, 1).fillEllipse(
      combatLayout.enemyShadow.x,
      combatLayout.enemyShadow.y,
      combatLayout.enemyShadow.w,
      combatLayout.enemyShadow.h,
    );
    g.fillStyle(enemyTint, 1).fillTriangle(
      combatLayout.enemyBody.x1,
      combatLayout.enemyBody.y1,
      combatLayout.enemyBody.x2,
      combatLayout.enemyBody.y2,
      combatLayout.enemyBody.x3,
      combatLayout.enemyBody.y3,
    );
    g.fillStyle(colors.gold, 1)
      .fillCircle(combatLayout.enemyEyeLeft.x, combatLayout.enemyEyeLeft.y, combatLayout.enemyEyeLeft.radius)
      .fillCircle(combatLayout.enemyEyeRight.x, combatLayout.enemyEyeRight.y, combatLayout.enemyEyeRight.radius);
    g.lineStyle(1, colors.bone, 1).strokeRect(
      combatLayout.enemyHitBox.x,
      combatLayout.enemyHitBox.y,
      combatLayout.enemyHitBox.w,
      combatLayout.enemyHitBox.h,
    );

    this.label(combat.enemy.name, combatLayout.enemyName.x, combatLayout.enemyName.y, text.gold);
    this.label(`${combat.enemy.hp}/${combat.enemy.maxHp} HP`, combatLayout.enemyHp.x, combatLayout.enemyHp.y);
    this.label(renderIntentText(combat.enemy.intent), combatLayout.enemyIntent.x, combatLayout.enemyIntent.y, text.red);
    if (this.state.mode === 'combat') {
      this.zone(combatLayout.enemyHitBox.x, combatLayout.enemyHitBox.y, combatLayout.enemyHitBox.w, combatLayout.enemyHitBox.h, () => this.playSelected());
    }

    if (this.state.mode === 'victory') this.label('VICTORY: the command log can replay this slice.', combatLayout.victoryLabel.x, combatLayout.victoryLabel.y, text.cyan);
    if (this.state.mode === 'defeat') this.label('DEFEAT: the Underroot remembers the party.', combatLayout.defeatLabel.x, combatLayout.defeatLabel.y, text.red);
  }

  private drawTray() {
    const tray = layout.tray;
    if (this.state.mode !== 'combat' && this.state.mode !== 'victory' && this.state.mode !== 'defeat') {
      this.label(this.state.log.slice(-3).join('\n'), tray.log.x, tray.log.y);
      this.label('W/S step   A/D turn   Space interact', tray.exploreHint.x, tray.exploreHint.y, text.mutedBone);
      return;
    }

    if (this.state.mode === 'victory' || this.state.mode === 'defeat') {
      const outcomeColor = this.state.mode === 'victory' ? text.cyan : text.red;
      const outcomeTitle = this.state.mode === 'victory' ? 'Victory' : 'Defeat';
      const outcomeLine =
        this.state.mode === 'victory'
          ? 'The command log can replay this slice.'
          : 'The Underroot remembers the party.';

      this.label(outcomeTitle, tray.outcomeTitle.x, tray.outcomeTitle.y, outcomeColor);
      this.label(outcomeLine, tray.outcomeLine.x, tray.outcomeLine.y, text.bone);
      this.label(this.state.log.slice(-2).join('\n'), tray.outcomeLog.x, tray.outcomeLog.y, text.mutedBone);
      return;
    }

    const combat = this.assertCombat();
    const g = this.tray;
    this.label(`Energy ${combat.energy}/3`, tray.energy.x, tray.energy.y, text.gold);
    g.lineStyle(1, colors.cyan, 1).strokeRect(tray.endTurn.x, tray.endTurn.y, tray.endTurn.w, tray.endTurn.h);
    this.label('End Turn', tray.endTurnLabel.x, tray.endTurnLabel.y, text.cyan);
    this.zone(tray.endTurn.x, tray.endTurn.y, tray.endTurn.w, tray.endTurn.h, () => this.endTurn());

    combat.hand.forEach((cardId, index) => {
      this.drawCard(cardId, cardDefFor(combat, cardId), tray.hand.x + index * tray.hand.gapX, tray.hand.y);
    });

    const heldLabel = combat.held ? cardDefFor(combat, combat.held).name : 'empty';
    const heldSelected = combat.held === this.selectedCardId;
    g.lineStyle(1, heldSelected ? colors.cyan : colors.gold, 1).strokeRect(tray.hold.x, tray.hold.y, tray.hold.w, tray.hold.h);
    this.label(`H: ${heldLabel}`, tray.holdTitle.x, tray.holdTitle.y, heldSelected ? text.cyan : text.gold);
    this.zone(tray.hold.x, tray.hold.y, tray.hold.w, tray.hold.h, () => this.selectHeldOrHold());
  }

  private drawCard(cardId: CardInstanceId, card: CardDef, x: number, y: number) {
    const g = this.tray;
    const selected = cardId === this.selectedCardId;
    const cardRect = layout.tray.card;
    const debtCard = hasDebtEffect(card);
    g.fillStyle(debtCard ? colors.oxblood : colors.panel, 1).fillRect(x, y, cardRect.w, cardRect.h);
    g.lineStyle(1, selected ? colors.gold : colors.stoneLight, 1).strokeRect(x, y, cardRect.w, cardRect.h);
    this.label(`${card.cost} ${heroCode(card.owner)} ${targetCode(card)}`, x + cardRect.textX, y + cardRect.ownerY, selected ? text.gold : text.mutedBone);
    this.label(card.name, x + cardRect.textX, y + cardRect.nameY, selected ? text.gold : text.bone);
    this.label(cardSummary(card), x + cardRect.textX, y + cardRect.bodyY, debtCard ? text.gold : text.mutedBone);
    this.zone(x, y, cardRect.w, cardRect.h, () => {
      this.selectedCardId = cardId;
      this.tone(MOTION.audio.cardSelectToneHz, MOTION.audio.cardSelectMs);
      this.syncFromState();
    });
  }

  private drawSidePanel() {
    const combat = this.state.combat;
    const side = layout.sidePanel;
    const heroes = combat?.heroes ?? [
      { id: 'liese', name: 'Liese', role: 'Warrior', hp: 31, maxHp: 31, block: 0, debt: 0 },
      { id: 'eris', name: 'Eris', role: 'Priest', hp: 24, maxHp: 24, block: 0, debt: 0 },
      { id: 'mia', name: 'Mia', role: 'Mage', hp: 20, maxHp: 20, block: 0, debt: 0 },
      { id: 'robin', name: 'Robin', role: 'Ranger', hp: 23, maxHp: 23, block: 0, debt: 0 },
    ];

    this.label('MINIMAP', side.title.x, side.title.y, text.gold);
    this.drawMiniMap();
    heroes.forEach((hero, index) => this.drawHero(hero, side.heroStartY + index * side.heroGapY));
    this.label(`Seed: ${this.state.seed}`, side.seed.x, side.seed.y, text.mutedBone);
    this.label(`Commands: ${this.state.commandLog.length}`, side.commandCount.x, side.commandCount.y, text.mutedBone);
  }

  private drawMiniMap() {
    const g = this.sidePanel;
    const side = layout.sidePanel;
    const x = side.minimap.x;
    const y = side.minimap.y;
    g.lineStyle(1, colors.stoneLight, 1).strokeRect(x, y, side.minimap.w, side.minimap.h);
    floorForId(this.state.floorId).tiles.forEach(({ coord: tile }) => {
      const tileColor = tile.x === this.state.position.x && tile.y === this.state.position.y ? colors.gold : colors.mutedBone;
      g.fillStyle(tileColor, 1).fillRect(
        x + tile.x * side.minimapTile.stepX,
        y + tile.y * side.minimapTile.stepY + side.minimapTile.offsetY,
        side.minimapTile.w,
        side.minimapTile.h,
      );
    });
  }

  private drawHero(hero: HeroState, y: number) {
    const g = this.sidePanel;
    const side = layout.sidePanel;
    const x = side.heroCard.x;
    g.fillStyle(colors.panel, 1).fillRect(x, y, side.heroCard.w, side.heroCard.h);
    g.lineStyle(1, hero.debt >= side.debtWarning ? colors.red : colors.stoneLight, 1).strokeRect(x, y, side.heroCard.w, side.heroCard.h);
    this.label(`${hero.name}  ${hero.role}`, side.heroName.x, y + side.heroName.yOffset);
    this.bar(
      this.sidePanel,
      side.heroHpBar.x,
      y + side.heroHpBar.yOffset,
      side.heroHpBar.w,
      side.heroHpBar.h,
      hero.hp / hero.maxHp,
      colors.red,
    );
    this.label(`${hero.hp}/${hero.maxHp}`, side.heroHpText.x, y + side.heroHpText.yOffset);
    this.label(`Blk ${hero.block}`, side.heroBlock.x, y + side.heroBlock.yOffset, text.cyan);
    this.label(`Debt ${hero.debt}`, side.heroDebt.x, y + side.heroDebt.yOffset, hero.debt > 0 ? text.gold : text.mutedBone);
  }

  private drawFooter() {
    const g = this.footer;
    g.fillStyle(colors.panel, 1).fillRect(layout.footer.rect.x, layout.footer.rect.y, layout.footer.rect.w, layout.footer.rect.h);
    g.lineStyle(1, colors.oxblood, 1).strokeRect(layout.footer.rect.x, layout.footer.rect.y, layout.footer.rect.w, layout.footer.rect.h);
    const threat = this.state.threat === 'calm' ? 'calm torch' : this.state.threat === 'uneasy' ? 'uneasy flame' : 'hunted silence';
    if (this.state.mode === 'victory') {
      this.label(`${threat}     Victory sealed. Press R for a new run.`, layout.footer.label.x, layout.footer.label.y, text.cyan);
      return;
    }
    if (this.state.mode === 'defeat') {
      this.label(`${threat}     Defeat reached. Press R for a new run.`, layout.footer.label.x, layout.footer.label.y, text.red);
      return;
    }
    if (this.state.mode === 'explore') {
      this.label(`${threat}     W/S step     A/D turn     Space interact`, layout.footer.label.x, layout.footer.label.y, this.state.threat === 'hunted' ? text.gold : text.mutedBone);
      return;
    }
    const selected =
      this.selectedCardId && this.state.combat
        ? `Selected ${cardDefFor(this.state.combat, this.selectedCardId).name}     ${this.targetHint(cardDefFor(this.state.combat, this.selectedCardId))}`
        : 'Select card, click enemy/Hold, or T/Enter to end turn';
    this.label(`${threat}     ${selected}`, layout.footer.label.x, layout.footer.label.y, this.state.threat === 'hunted' ? text.gold : text.mutedBone);
  }

  private panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    const panel = layout.panel;
    g.fillStyle(colors.panel, 1).fillRect(x, y, w, h);
    g.lineStyle(panel.border, colors.oxblood, 1).strokeRect(x, y, w, h);
    g.lineStyle(panel.innerBorder, colors.stoneLight, THEME.alpha.panelInnerBorder).strokeRect(
      x + panel.innerInset,
      y + panel.innerInset,
      w - panel.innerInset * 2,
      h - panel.innerInset * 2,
    );
  }

  private bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, ratio: number, color: number) {
    g.fillStyle(colors.void, 1).fillRect(x, y, w, h);
    g.fillStyle(color, 1).fillRect(x, y, Math.round(w * ratio), h);
    g.lineStyle(1, colors.stoneLight, 1).strokeRect(x, y, w, h);
  }

  private label(labelText: string, x: number, y: number, color: string = text.bone) {
    const label = this.add.text(Math.round(x), Math.round(y), labelText, { ...textStyle, color });
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
    this.tone(MOTION.audio.cardSelectToneHz, MOTION.audio.cardSelectMs);
    this.syncFromState();
  }

  private playSelected() {
    if (this.state.mode === 'combat' && !this.selectedCardId) {
      this.endTurn();
      return;
    }
    if (!this.selectedCardId || this.state.mode !== 'combat') return;
    const combat = this.assertCombat();
    const card = cardDefFor(combat, this.selectedCardId);
    const target = card.target.type === 'enemy'
      ? { kind: 'enemy' as const, id: combat.enemy.id }
      : { kind: 'hero' as const, id: card.owner };
    this.dispatch({ type: 'play-card', cardId: this.selectedCardId, target });
  }

  private endTurn() {
    if (this.state.mode !== 'combat') return;
    this.selectedCardId = null;
    this.dispatch({ type: 'end-turn' });
  }

  private playFeelCue(cue: FeelCue) {
    switch (cue.type) {
      case 'step-bob':
        this.stepBob();
        return;
      case 'hit-stop':
        this.hitStop(cue.durationMs);
        return;
      case 'shake':
        this.cameras.main.shake(cue.durationMs, cue.intensity);
        return;
      case 'float-text':
        this.floatCue(cue);
        return;
      case 'tone':
        this.tone(cue.tone.frequencyHz, cue.tone.durationMs);
        return;
    }
  }

  private stepBob() {
    this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2 + MOTION.camera.stepBobPx, MOTION.camera.stepPanDownMs, 'Sine.easeOut', true);
    this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, MOTION.camera.stepPanReturnMs, 'Sine.easeIn', true);
  }

  private hitStop(durationMs: number) {
    const deadline = window.performance.now() + durationMs;
    this.hitStopUntil = Math.max(this.hitStopUntil, deadline);
    this.time.timeScale = 0.001;
    window.setTimeout(() => {
      if (deadline < this.hitStopUntil) return;
      this.time.timeScale = 1;
      this.hitStopUntil = 0;
    }, durationMs);
  }

  private floatCue(cue: Extract<FeelCue, { type: 'float-text' }>) {
    const point = this.floatPoint(cue.target);
    const color = cue.tone === 'debt'
      ? text.red
      : cue.tone === 'blocked'
        ? text.cyan
        : cue.target === 'enemy'
          ? text.gold
          : text.red;
    this.floatingText(cue.text, point.x, point.y, color, cue.scale);
  }

  private floatPoint(target: FeelTarget) {
    if (target === 'enemy') return layout.feedback.enemyDamageFloat;
    if (target === 'debt') return layout.feedback.debtFloat;
    return {
      x: layout.feedback.heroDamageFloat.x,
      y: layout.feedback.heroDamageFloat.y + heroIndex(target) * layout.feedback.heroDamageFloat.heroGapY,
    };
  }

  private floatingText(labelText: string, x: number, y: number, color: string, scale: 'normal' | 'large') {
    const fontSize = scale === 'large' ? MOTION.text.largeFloatFontSize : MOTION.text.floatFontSize;
    const label = this.add.text(x, y, labelText, { ...textStyle, color, fontSize });
    this.fx.add(label);
    this.tweens.add({
      targets: label,
      y: y + MOTION.text.floatDriftY,
      alpha: 0,
      duration: MOTION.fx.damageFloatMs,
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
    gain.gain.value = MOTION.audio.squareGain;
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
      feelSettings: this.feelSettings,
      lastEvents: this.lastEvents,
    };
  }

  private targetHint(card: CardDef): string {
    if (card.target.type === 'enemy') return 'Click enemy or Enter';
    return `Plays on ${heroName(card.owner)}`;
  }
}

function heroIndex(heroId: HeroId): number {
  if (heroId === 'liese') return 0;
  if (heroId === 'eris') return 1;
  if (heroId === 'mia') return 2;
  return 3;
}

function heroName(heroId: HeroId): string {
  if (heroId === 'liese') return 'Liese';
  if (heroId === 'eris') return 'Eris';
  if (heroId === 'mia') return 'Mia';
  return 'Robin';
}

function hasDebtEffect(card: CardDef): boolean {
  return card.effects.some((effect) => effect.type === 'gain-debt');
}

function heroCode(heroId: HeroId): string {
  if (heroId === 'liese') return 'LIE';
  if (heroId === 'eris') return 'ERI';
  if (heroId === 'mia') return 'MIA';
  return 'ROB';
}

function targetCode(card: CardDef): string {
  return card.target.type === 'enemy' ? 'EN' : 'OWN';
}

function cardSummary(card: CardDef): string {
  const damage = card.effects.find((effect) => effect.type === 'damage');
  const debt = card.effects.find((effect) => effect.type === 'gain-debt');
  const block = card.effects.find((effect) => effect.type === 'gain-block');
  const heal = card.effects.find((effect) => effect.type === 'heal');
  const status = card.effects.find((effect) => effect.type === 'apply-status');

  if (damage && debt) return `Deal ${damage.amount} +D${debt.amount}`;
  if (damage) return `Deal ${damage.amount}`;
  if (block) return `Block ${block.amount}`;
  if (heal) return `Heal ${heal.amount}`;
  if (status) return 'Apply Mark';
  return card.text.split('\n')[0] ?? '';
}

function loadSavedState(): SliceState {
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return createSliceState();

  try {
    const result = deserializeSave(JSON.parse(raw));
    return result.ok ? result.state : createSliceState();
  } catch {
    return createSliceState();
  }
}

function persistState(state: SliceState): void {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSave(state)));
}

function clearSavedState(): void {
  window.localStorage.removeItem(SAVE_KEY);
}

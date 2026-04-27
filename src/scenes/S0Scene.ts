import Phaser from 'phaser';
import { ASSET_MANIFEST_KEY, ASSET_MANIFEST_URL, assetFromManifest } from '../assets/manifest';
import { EventScheduler } from '../fx/eventScheduler';
import { getInitialFeelSettings, planFeelCues, type FeelCue, type FeelSettings, type FeelTarget } from '../fx/feelScheduler';
import { GAME_HEIGHT, GAME_WIDTH, S0_LAYOUT, SIDE_PANEL, TRAY, VIEWPORT } from '../game/layout';
import { MOTION } from '../game/motion';
import { THEME } from '../game/theme';
import type { CardDef, CardInstanceId, CombatState, ExploreCommand, FloorTile, GameEvent, HeroId, HeroState, SliceCommand, SliceState, StatusId, TilePurpose, TownCommand } from '../game/types';
import { M1_STARTER_CARDS } from '../data/combat';
import { cardDefFor, createCombatWithCards, renderIntentText } from '../systems/combat';
import { floorForId } from '../data/floors';
import { deserializeSave, serializeSave } from '../systems/save';
import { applyCommand, createSliceState, createTownState } from '../systems/slice';
import { emptyStatusStacks, hasStatus, statusRule, statusSummary } from '../systems/status';
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
      selectedCardDetail: string | null;
      selectedCardHint: string | null;
      selectedCardSummary: string | null;
      selectedStatusRule: string | null;
      intentText: string | null;
      gameplayAssets: {
        explorationBackground: null | {
          id: string;
          path: string;
          approvalGate: string;
        };
        combatBackground: null | {
          id: string;
          path: string;
          approvalGate: string;
        };
        cardArt: readonly {
          cardId: string;
          assetId: string;
          path: string;
          approvalGate: string;
        }[];
        enemySprite: null | {
          id: string;
          path: string;
          approvalGate: string;
        };
      };
      feelSettings: FeelSettings;
      lastEvents: readonly GameEvent[];
      dispatch?: (command: SliceCommand) => readonly GameEvent[];
    };
  }
}

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;
const layout = S0_LAYOUT;
const SAVE_KEY = 'hollowmark:s0-save';
const M1_COMBAT_SEED = 'm1-natural-19';
const GAMEPLAY_EXPLORATION_BACKGROUND = {
  id: 'underroot.corridor.placeholder',
  key: 'gameplay-underroot-corridor-background',
} as const;
const GAMEPLAY_COMBAT_BACKGROUND = {
  id: 'underroot.combat.placeholder',
  key: 'gameplay-underroot-combat-background',
} as const;
const GAMEPLAY_CARD_ART = {
  'blood-edge': {
    id: 'card.blood-edge.placeholder',
    key: 'gameplay-card-blood-edge',
  },
} as const;
const GAMEPLAY_ENEMY_SPRITE = {
  id: 'enemy.root-wolf.placeholder',
  key: 'gameplay-root-wolf-sprite',
} as const;
const COMPACT_CARD_NAMES: Record<string, string> = {
  'Ringing Blow': 'Ring Blow',
  'Shadow Mark': 'Shado Mark',
  'Quiet Rebuke': 'Quiet Reb',
  'Prayer Knot': 'Pray Knot',
  'Black Spark': 'Black Spk',
  'Glass Pulse': 'Glass P',
  'Sundering Cut': 'Sunde Cut',
  'Sanctuary Veil': 'Sanct Veil',
};
type ExploreMotionCommand = Extract<ExploreCommand, { type: 'step-forward' | 'step-back' | 'turn-left' | 'turn-right' }>;
type GameplayExplorationBackground = Readonly<{
  id: string;
  path: string;
  approvalGate: string;
}> | null;
type GameplayCombatBackground = Readonly<{
  id: string;
  path: string;
  approvalGate: string;
}> | null;
type GameplayCardArt = Readonly<{
  cardId: keyof typeof GAMEPLAY_CARD_ART;
  assetId: string;
  key: string;
  path: string;
  approvalGate: string;
}>;
type GameplayEnemySprite = Readonly<{
  id: string;
  path: string;
  approvalGate: string;
}> | null;

export class S0Scene extends Phaser.Scene {
  private state = createSliceState();
  private selectedCardId: CardInstanceId | null = null;
  private audioContext: AudioContext | null = null;
  private shell!: Phaser.GameObjects.Graphics;
  private explorationBackgroundImage: Phaser.GameObjects.Image | null = null;
  private combatBackgroundImage: Phaser.GameObjects.Image | null = null;
  private enemySpriteImage: Phaser.GameObjects.Image | null = null;
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
  private hitStopTimeout: number | null = null;
  private exploreMotionTimer: Phaser.Time.TimerEvent | null = null;
  private queuedExploreMotion: ExploreMotionCommand | null = null;
  private explorationBackground: GameplayExplorationBackground = null;
  private combatBackground: GameplayCombatBackground = null;
  private cardArt: readonly GameplayCardArt[] = [];
  private enemySprite: GameplayEnemySprite = null;
  private lastEvents: readonly GameEvent[] = [];

  constructor() {
    super('S0Scene');
  }

  preload(): void {
    this.load.json(ASSET_MANIFEST_KEY, ASSET_MANIFEST_URL);
  }

  create() {
    this.state = initialStateForLocation(window.location);
    const manifest = this.cache.json.get(ASSET_MANIFEST_KEY);
    this.explorationBackground = gameplayExplorationBackground(manifest);
    this.combatBackground = gameplayCombatBackground(manifest);
    this.cardArt = gameplayCardArt(manifest);
    this.enemySprite = gameplayEnemySprite(manifest);
    if (this.explorationBackground) {
      this.load.image(GAMEPLAY_EXPLORATION_BACKGROUND.key, this.explorationBackground.path);
    }
    if (this.combatBackground) {
      this.load.image(GAMEPLAY_COMBAT_BACKGROUND.key, this.combatBackground.path);
    }
    for (const art of this.cardArt) this.load.image(art.key, art.path);
    if (this.enemySprite) {
      this.load.image(GAMEPLAY_ENEMY_SPRITE.key, this.enemySprite.path);
    }
    if (this.explorationBackground || this.combatBackground || this.cardArt.length > 0 || this.enemySprite) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.createScene());
      this.load.start();
      return;
    }
    this.createScene();
  }

  private createScene(): void {
    this.buildViews();
    this.bindKey('W', () => this.handleExploreMotion({ type: 'step-forward' }));
    this.bindKey('UP', () => this.handleExploreMotion({ type: 'step-forward' }));
    this.bindKey('S', () => this.handleExploreMotion({ type: 'step-back' }));
    this.bindKey('DOWN', () => this.handleExploreMotion({ type: 'step-back' }));
    this.bindKey('A', () => this.handleExploreMotion({ type: 'turn-left' }));
    this.bindKey('LEFT', () => this.handleExploreMotion({ type: 'turn-left' }));
    this.bindKey('D', () => this.handleExploreMotion({ type: 'turn-right' }));
    this.bindKey('RIGHT', () => this.handleExploreMotion({ type: 'turn-right' }));
    this.bindKey('SPACE', () => this.dispatch(this.state.mode === 'town' ? { type: 'enter-underroot' } : { type: 'interact' }));
    this.bindKey('G', () => this.dispatchTownCommand({ type: 'enter-underroot' }));
    this.bindKey('V', () => this.dispatchTownCommand({ type: 'choose-town-service', service: 'vellum' }));
    this.bindKey('C', () => this.dispatchTownCommand({ type: 'settle-debt' }));
    this.bindKey('H', () => this.holdSelected());
    this.bindKey('ENTER', () => this.playSelected());
    this.bindKey('T', () => this.endTurn());
    this.bindKey('R', () => this.restartRun());
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((key, index) => {
      this.bindKey(key, () => this.selectCard(index));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdownScene());

    this.syncFromState();
  }

  private bindKey(key: string, onPress: () => void): void {
    this.input.keyboard?.on(`keydown-${key}`, (event: KeyboardEvent) => {
      if (event.repeat) return;
      onPress();
    });
  }

  private buildViews() {
    this.cameras.main.setBackgroundColor(colors.void);
    this.shell = this.add.graphics();
    if (this.explorationBackground && this.textures.exists(GAMEPLAY_EXPLORATION_BACKGROUND.key)) {
      this.explorationBackgroundImage = this.add.image(VIEWPORT.x + VIEWPORT.w / 2, VIEWPORT.y + VIEWPORT.h / 2, GAMEPLAY_EXPLORATION_BACKGROUND.key);
      this.explorationBackgroundImage.setDisplaySize(VIEWPORT.w - S0_LAYOUT.viewport.innerPad * 2, VIEWPORT.h - S0_LAYOUT.viewport.innerPad * 2);
      this.explorationBackgroundImage.setAlpha(0.76);
      this.explorationBackgroundImage.setVisible(false);
    }
    if (this.combatBackground && this.textures.exists(GAMEPLAY_COMBAT_BACKGROUND.key)) {
      this.combatBackgroundImage = this.add.image(VIEWPORT.x + VIEWPORT.w / 2, VIEWPORT.y + VIEWPORT.h / 2, GAMEPLAY_COMBAT_BACKGROUND.key);
      this.combatBackgroundImage.setDisplaySize(VIEWPORT.w - S0_LAYOUT.viewport.innerPad * 2, VIEWPORT.h - S0_LAYOUT.viewport.innerPad * 2);
      this.combatBackgroundImage.setAlpha(0.78);
      this.combatBackgroundImage.setVisible(false);
    }
    if (this.enemySprite && this.textures.exists(GAMEPLAY_ENEMY_SPRITE.key)) {
      this.enemySpriteImage = this.add.image(layout.combat.enemyShadow.x, 111, GAMEPLAY_ENEMY_SPRITE.key);
      this.enemySpriteImage.setDisplaySize(88, 118);
      this.enemySpriteImage.setAlpha(0.95);
      this.enemySpriteImage.setVisible(false);
    }
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
    if (this.state.mode !== 'explore') this.clearExploreMotion();
    if (!isLabRoute(window.location)) persistState(this.state);

    if (command.type === 'play-card') {
      this.selectedCardId = null;
    }

    this.syncFromState();
    this.eventScheduler.enqueue(result.events, (event) => this.handleEvent(event));
    this.publishDebug();
    return result.events;
  }

  private dispatchTownCommand(command: TownCommand): void {
    if (this.state.mode !== 'town') return;
    this.dispatch(command);
  }

  private handleExploreMotion(command: ExploreMotionCommand): void {
    if (this.state.mode !== 'explore') {
      this.dispatch(command);
      return;
    }

    if (this.exploreMotionTimer) {
      if (!this.queuedExploreMotion) this.queuedExploreMotion = command;
      return;
    }

    const events = this.dispatch(command);
    const durationMs = exploreMotionDuration(command, events);
    if (durationMs > 0) this.lockExploreMotion(durationMs);
  }

  private lockExploreMotion(durationMs: number): void {
    this.exploreMotionTimer = this.time.delayedCall(durationMs, () => this.finishExploreMotion());
  }

  private finishExploreMotion(): void {
    this.exploreMotionTimer = null;
    const queued = this.queuedExploreMotion;
    this.queuedExploreMotion = null;
    if (queued && this.state.mode === 'explore') this.handleExploreMotion(queued);
  }

  private clearExploreMotion(): void {
    this.queuedExploreMotion = null;
    this.exploreMotionTimer?.remove(false);
    this.exploreMotionTimer = null;
  }

  private restartRun(): void {
    if (this.state.mode !== 'victory' && this.state.mode !== 'defeat') return;
    if (!isLabRoute(window.location)) clearSavedState();
    this.eventScheduler.reset();
    this.fx.clear(true, true);
    this.clearHitStop();
    this.clearExploreMotion();
    this.selectedCardId = null;
    this.lastEvents = [];
    this.state = initialStateForLocation(window.location);
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
    this.explorationBackgroundImage?.setVisible(false);
    this.combatBackgroundImage?.setVisible(false);
    this.enemySpriteImage?.setVisible(false);
    if (this.state.mode === 'town') {
      this.drawTownView();
      return;
    }

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
    if (this.explorationBackgroundImage) {
      this.explorationBackgroundImage.setVisible(true);
      g.fillStyle(colors.void, 0.2).fillRect(
        VIEWPORT.x + viewport.innerPad,
        VIEWPORT.y + viewport.innerPad,
        VIEWPORT.w - viewport.innerPad * 2,
        VIEWPORT.h - viewport.innerPad * 2,
      );
    } else {
      g.fillStyle(colors.voidDeep, 1).fillRect(
        VIEWPORT.x + viewport.innerPad,
        VIEWPORT.y + viewport.innerPad,
        VIEWPORT.w - viewport.innerPad * 2,
        VIEWPORT.h - viewport.innerPad * 2,
      );
    }
    g.fillStyle(colors.stone, this.explorationBackgroundImage ? 0.3 : 1).fillTriangle(
      viewport.leftWall.x1,
      viewport.leftWall.y1,
      viewport.leftWall.x2,
      viewport.leftWall.y2,
      viewport.leftWall.x3,
      viewport.leftWall.y3,
    );
    g.fillStyle(colors.stoneLeft, this.explorationBackgroundImage ? 0.24 : 1).fillTriangle(
      viewport.leftWing.x1,
      viewport.leftWing.y1,
      viewport.leftWing.x2,
      viewport.leftWing.y2,
      viewport.leftWing.x3,
      viewport.leftWing.y3,
    );
    g.fillStyle(colors.stoneRight, this.explorationBackgroundImage ? 0.24 : 1).fillTriangle(
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
    if (this.state.floorId === 'underroot-m2-placeholder') {
      this.drawTilePurposeCue(this.state, current.tile, front.tile);
    }
  }

  private drawTilePurposeCue(state: SliceState, current: FloorTile | null, front: FloorTile | null): void {
    const currentPurpose = current?.purpose ?? 'side-path';
    const frontPurpose = front?.purpose ?? 'side-path';
    const g = this.viewport;
    const color = purposeColor(currentPurpose);
    g.fillStyle(colors.void, 0.68).fillRect(28, 184, 342, 28);
    g.lineStyle(1, color, 1).strokeRect(28, 184, 342, 28);
    this.label(tileCue('Here', current, state), 38, 191, purposeText(currentPurpose));
    this.label(tileCue('Ahead', front, state), 200, 191, purposeText(frontPurpose));
  }

  private drawTownView() {
    const g = this.viewport;
    const viewport = layout.viewport;
    g.fillStyle(colors.voidDeep, 1).fillRect(
      VIEWPORT.x + viewport.innerPad,
      VIEWPORT.y + viewport.innerPad,
      VIEWPORT.w - viewport.innerPad * 2,
      VIEWPORT.h - viewport.innerPad * 2,
    );
    g.fillStyle(colors.stone, 1).fillRect(viewport.exploreBackWall.x, viewport.exploreBackWall.y, viewport.exploreBackWall.w, viewport.exploreBackWall.h);
    g.fillStyle(colors.moss, THEME.alpha.combatFloorShadow).fillEllipse(220, 158, 210, 52);
    g.lineStyle(2, colors.gold, 1).strokeRect(172, 72, 96, 112);
    g.lineStyle(1, colors.oxblood, 1).strokeRect(182, 82, 76, 92);
    g.fillStyle(colors.void, 0.9).fillRect(194, 100, 52, 74);
    g.lineStyle(1, colors.moss, 0.75);
    for (let x = 180; x <= 260; x += 10) {
      g.lineBetween(x, 76, x - 16, 176);
    }
    this.label('MARROWGATE', 188, 52, text.gold);
    this.label(`Service: ${townServiceName(this.state.townService)}`, 174, 196, text.mutedBone);
  }

  private drawCombatView() {
    const g = this.viewport;
    const combatLayout = layout.combat;
    const viewport = layout.viewport;
    if (this.combatBackgroundImage) {
      this.combatBackgroundImage.setVisible(true);
      g.fillStyle(colors.void, 0.28).fillRect(
        VIEWPORT.x + viewport.innerPad,
        VIEWPORT.y + viewport.innerPad,
        VIEWPORT.w - viewport.innerPad * 2,
        VIEWPORT.h - viewport.innerPad * 2,
      );
    } else {
      g.fillStyle(colors.combatVoid, 1).fillRect(
        VIEWPORT.x + viewport.innerPad,
        VIEWPORT.y + viewport.innerPad,
        VIEWPORT.w - viewport.innerPad * 2,
        VIEWPORT.h - viewport.innerPad * 2,
      );
      g.fillStyle(colors.stone, 1).fillRect(combatLayout.room.x, combatLayout.room.y, combatLayout.room.w, combatLayout.room.h);
      g.fillStyle(colors.panelDeep, THEME.alpha.combatBackWall).fillRect(combatLayout.backWall.x, combatLayout.backWall.y, combatLayout.backWall.w, combatLayout.backWall.h);
    }
    g.fillStyle(colors.moss, THEME.alpha.combatFloorShadow).fillEllipse(
      combatLayout.floorShadow.x,
      combatLayout.floorShadow.y,
      combatLayout.floorShadow.w,
      combatLayout.floorShadow.h,
    );

    const combat = this.assertCombat();
    const enemyTint = hasStatus(combat.enemy.statuses, 'mark') ? colors.gold : colors.oxblood;
    if (this.enemySpriteImage) {
      this.enemySpriteImage.setVisible(true);
      if (hasStatus(combat.enemy.statuses, 'mark')) this.enemySpriteImage.setTint(colors.gold);
      else this.enemySpriteImage.clearTint();
    } else {
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
    }
    g.lineStyle(1, colors.bone, 1).strokeRect(
      combatLayout.enemyHitBox.x,
      combatLayout.enemyHitBox.y,
      combatLayout.enemyHitBox.w,
      combatLayout.enemyHitBox.h,
    );

    this.label(combat.enemy.name, combatLayout.enemyName.x, combatLayout.enemyName.y, text.gold);
    this.label(`${combat.enemy.hp}/${combat.enemy.maxHp} HP`, combatLayout.enemyHp.x, combatLayout.enemyHp.y);
    const enemyStatuses = statusSummary(combat.enemy.statuses);
    if (enemyStatuses) this.label(enemyStatuses, combatLayout.enemyStatus.x, combatLayout.enemyStatus.y, text.gold);
    this.label(renderIntentText(combat.enemy.intent), combatLayout.enemyIntent.x, combatLayout.enemyIntent.y, text.red);
    if (this.state.mode === 'combat') {
      this.zone(combatLayout.enemyHitBox.x, combatLayout.enemyHitBox.y, combatLayout.enemyHitBox.w, combatLayout.enemyHitBox.h, () => this.playSelectedOnEnemy());
    }

    if (this.state.mode === 'victory') this.label('VICTORY: the command log can replay this slice.', combatLayout.victoryLabel.x, combatLayout.victoryLabel.y, text.cyan);
    if (this.state.mode === 'defeat') this.label('DEFEAT: the Underroot remembers the party.', combatLayout.defeatLabel.x, combatLayout.defeatLabel.y, text.red);
  }

  private drawTray() {
    const tray = layout.tray;
    if (this.state.mode === 'town') {
      this.label(this.state.log.slice(-2).join('\n'), tray.log.x, tray.log.y);
      this.label(`Service ${townServiceName(this.state.townService)}   Sanctuary debt ${this.state.townDebt}`, tray.exploreHint.x, tray.exploreHint.y - 14, this.state.townDebt > 0 ? text.gold : text.mutedBone);
      this.label('Space/G Gate   V Vellum   C Sanctuary', tray.exploreHint.x, tray.exploreHint.y, text.cyan);
      return;
    }

    if (this.state.mode !== 'combat' && this.state.mode !== 'victory' && this.state.mode !== 'defeat') {
      this.label(this.state.log.slice(-2).join('\n'), tray.log.x, tray.log.y);
      if (this.state.floorId === 'underroot-m2-placeholder') {
        const spoils = claimedSpoilsLine(this.state);
        this.label(spoils || underrootProgressLine(this.state), tray.exploreHint.x, tray.exploreHint.y - 12, spoils ? text.cyan : text.gold);
      }
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
    const blocked = !cardPlayable(this.assertCombat(), card);
    g.fillStyle(debtCard ? colors.oxblood : colors.panel, blocked ? 0.68 : 1).fillRect(x, y, cardRect.w, cardRect.h);
    this.drawCardArt(card, x, y);
    g.lineStyle(1, selected ? colors.gold : blocked ? colors.red : colors.stoneLight, 1).strokeRect(x, y, cardRect.w, cardRect.h);
    this.label(`${card.cost} ${heroCode(card.owner)} ${targetCode(card)}`, x + cardRect.textX, y + cardRect.ownerY, selected ? text.gold : blocked ? text.red : text.mutedBone);
    this.label(compactCardName(card.name), x + cardRect.textX, y + cardRect.nameY, selected ? text.gold : text.bone);
    this.label(cardSummary(card), x + cardRect.textX, y + cardRect.bodyY, debtCard ? text.gold : blocked ? text.red : text.mutedBone);
    this.zone(x, y, cardRect.w, cardRect.h, () => {
      this.selectedCardId = cardId;
      this.tone(MOTION.audio.cardSelectToneHz, MOTION.audio.cardSelectMs);
      this.syncFromState();
    });
  }

  private drawCardArt(card: CardDef, x: number, y: number): void {
    const art = this.cardArt.find((entry) => entry.cardId === card.id);
    if (!art || !this.textures.exists(art.key)) return;
    const image = this.add.image(x + 49, y + 22, art.key);
    image.setDisplaySize(18, 34);
    image.setAlpha(0.62);
    this.dynamicLabels.add(image);
    this.tray.fillStyle(colors.void, 0.5).fillRect(x + 40, y + 4, 24, layout.tray.card.h - 8);
  }

  private drawSidePanel() {
    const combat = this.state.combat;
    const side = layout.sidePanel;
    const heroes = combat?.heroes ?? [
      { id: 'liese', name: 'Liese', role: 'Warrior', hp: 31, maxHp: 31, block: 0, debt: 0, statuses: emptyStatusStacks() },
      { id: 'eris', name: 'Eris', role: 'Priest', hp: 24, maxHp: 24, block: 0, debt: 0, statuses: emptyStatusStacks() },
      { id: 'mia', name: 'Mia', role: 'Mage', hp: 20, maxHp: 20, block: 0, debt: 0, statuses: emptyStatusStacks() },
      { id: 'robin', name: 'Robin', role: 'Ranger', hp: 23, maxHp: 23, block: 0, debt: 0, statuses: emptyStatusStacks() },
    ];

    this.label(this.selectedCardId && combat ? 'CARD' : 'MINIMAP', side.title.x, side.title.y, text.gold);
    if (this.selectedCardId && combat) this.drawSelectedCardDetail(cardDefFor(combat, this.selectedCardId));
    else this.drawMiniMap();
    heroes.forEach((hero, index) => this.drawHero(hero, side.heroStartY + index * side.heroGapY));
    this.label(`Seed: ${this.state.seed}`, side.seed.x, side.seed.y, text.mutedBone);
    this.label(`Commands: ${this.state.commandLog.length}`, side.commandCount.x, side.commandCount.y, text.mutedBone);
  }

  private drawSelectedCardDetail(card: CardDef) {
    const detail = layout.sidePanel.selectedCard;
    this.sidePanel.fillStyle(colors.panelDeep, 1).fillRect(detail.x, detail.y, detail.w, detail.h);
    this.drawSelectedCardArt(card);
    this.sidePanel.lineStyle(1, hasDebtEffect(card) ? colors.gold : colors.stoneLight, 1).strokeRect(detail.x, detail.y, detail.w, detail.h);
    this.label(card.name, detail.title.x, detail.title.y, hasDebtEffect(card) ? text.gold : text.bone);
    this.label(`${heroCode(card.owner)}  Cost ${card.cost}  ${targetLabel(card)}`, detail.meta.x, detail.meta.y, text.cyan);
    this.label(cardRules(card), detail.rules.x, detail.rules.y, hasDebtEffect(card) ? text.gold : text.mutedBone);
  }

  private drawSelectedCardArt(card: CardDef): void {
    const art = this.cardArt.find((entry) => entry.cardId === card.id);
    if (!art || !this.textures.exists(art.key)) return;
    const detail = layout.sidePanel.selectedCard;
    const image = this.add.image(detail.x + detail.w - 35, detail.y + 22, art.key);
    image.setDisplaySize(48, 36);
    image.setAlpha(0.78);
    this.dynamicLabels.add(image);
    this.sidePanel.fillStyle(colors.panelDeep, 0.58).fillRect(detail.x, detail.y, detail.w - 70, detail.h);
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
    const statuses = statusSummary(hero.statuses);
    if (statuses) this.label(statuses, side.heroStatus.x, y + side.heroStatus.yOffset, text.gold);
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
      const progress = this.state.floorId === 'underroot-m2-placeholder' ? `     ${underrootProgressLine(this.state)}` : '';
      this.label(`${threat}     ${pressureCue(this.state)}${progress}`, layout.footer.label.x, layout.footer.label.y, this.state.threat === 'hunted' ? text.gold : text.mutedBone);
      return;
    }
    if (this.state.mode === 'town') {
      this.label(`Marrowgate     ${townServiceName(this.state.townService)}     Gate G     Vellum V     Sanctuary C`, layout.footer.label.x, layout.footer.label.y, text.cyan);
      return;
    }
    const selected = this.selectedCardFooterHint();
    this.label(`${threat}     ${selected}`, layout.footer.label.x, layout.footer.label.y, this.state.threat === 'hunted' ? text.gold : text.mutedBone);
  }

  private selectedCardHint(): string {
    if (!this.selectedCardId || !this.state.combat) return 'Select card, click enemy/Hold, or T/Enter to end turn';
    const card = cardDefFor(this.state.combat, this.selectedCardId);
    const effectHints = selectedEffectHints(card);
    const hint = effectHints.length > 0 ? `     ${effectHints.join('     ')}` : '';
    return `Selected ${card.name}     ${this.targetHint(card)}${hint}`;
  }

  private selectedCardFooterHint(): string {
    if (!this.selectedCardId || !this.state.combat) return 'Select card, click enemy/Hold, or T/Enter to end turn';
    const card = cardDefFor(this.state.combat, this.selectedCardId);
    const hints = selectedEffectHints(card).map(shortEffectHint);
    return `Selected ${card.name}     ${this.targetHint(card)}${hints.length > 0 ? `     ${hints.join('     ')}` : ''}`;
  }

  private selectedStatusRule(): string | null {
    if (!this.selectedCardId || !this.state.combat) return null;
    const card = cardDefFor(this.state.combat, this.selectedCardId);
    const statusEffect = card.effects.find((effect) => effect.type === 'apply-status');
    return statusEffect ? statusRule(statusEffect.status) : null;
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

  private playSelectedOnEnemy() {
    if (!this.selectedCardId || this.state.mode !== 'combat') return;
    const combat = this.assertCombat();
    const card = cardDefFor(combat, this.selectedCardId);
    if (card.target.type !== 'enemy') return;
    this.dispatch({ type: 'play-card', cardId: this.selectedCardId, target: { kind: 'enemy', id: combat.enemy.id } });
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
    if (deadline <= this.hitStopUntil) return;
    this.hitStopUntil = Math.max(this.hitStopUntil, deadline);
    this.time.timeScale = 0.001;
    if (this.hitStopTimeout !== null) window.clearTimeout(this.hitStopTimeout);
    this.hitStopTimeout = window.setTimeout(() => {
      this.time.timeScale = 1;
      this.hitStopUntil = 0;
      this.hitStopTimeout = null;
    }, durationMs);
  }

  private clearHitStop(): void {
    if (this.hitStopTimeout !== null) window.clearTimeout(this.hitStopTimeout);
    this.hitStopTimeout = null;
    this.hitStopUntil = 0;
    this.time.timeScale = 1;
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

  private shutdownScene(): void {
    this.eventScheduler.reset();
    this.clearHitStop();
    this.clearExploreMotion();
    void this.audioContext?.close();
    this.audioContext = null;
  }

  private assertCombat() {
    if (!this.state.combat) throw new Error('Expected combat state');
    return this.state.combat;
  }

  private publishDebug() {
    const debug = {
      objectCounts: {
        total: this.children.length,
        dynamicLabels: this.dynamicLabels.getLength(),
        fx: this.fx.getLength(),
        hitZones: this.hitZones.getLength(),
      },
      pendingEvents: this.eventScheduler.getPendingCount(),
      state: structuredClone(this.state),
      selectedCardId: this.selectedCardId,
      selectedCardDetail: this.selectedCardId && this.state.combat ? selectedCardDetail(cardDefFor(this.state.combat, this.selectedCardId)) : null,
      selectedCardHint: this.selectedCardId ? this.selectedCardHint() : null,
      selectedCardSummary: this.selectedCardId && this.state.combat ? cardSummary(cardDefFor(this.state.combat, this.selectedCardId)) : null,
      selectedStatusRule: this.selectedStatusRule(),
      intentText: this.state.combat ? renderIntentText(this.state.combat.enemy.intent) : null,
      gameplayAssets: {
        explorationBackground: this.explorationBackground,
        combatBackground: this.combatBackground,
        cardArt: this.cardArt.map(({ cardId, assetId, path, approvalGate }) => ({ cardId, assetId, path, approvalGate })),
        enemySprite: this.enemySprite,
      },
      feelSettings: this.feelSettings,
      lastEvents: this.lastEvents,
    };
    window.__HOLLOWMARK_DEBUG__ = isLabRoute(window.location)
      ? { ...debug, dispatch: (command: SliceCommand) => this.dispatch(command) }
      : debug;
  }

  private targetHint(card: CardDef): string {
    if (card.target.type === 'enemy') return 'Click enemy or Enter';
    return `Plays on ${heroName(card.owner)}`;
  }
}

function pressureCue(state: SliceState): string {
  if (state.floorId !== 'underroot-m2-placeholder') return 'steady';
  if (state.threatClock >= 8) return 'roots hunting';
  if (state.threatClock >= 4) return 'roots listening';
  return 'quiet pressure';
}

function underrootProgressLine(state: SliceState): string {
  const rewards = countCompleted(state, 'underroot-reward-');
  const fights = countCompleted(state, 'underroot-normal-') + countCompleted(state, 'underroot-elite-');
  const rest = state.completedInteractions.includes('underroot-rest-1') ? 'rest used' : 'rest open';
  const boss = state.completedInteractions.includes('underroot-boss-1') ? 'boss sealed' : 'boss';
  return `Dive R${rewards}/3 F${fights}/6  ${rest}  ${boss}  D${state.townDebt}`;
}

function tileCue(prefix: 'Here' | 'Ahead', tile: FloorTile | null, state: SliceState): string {
  const purpose = tile?.purpose ?? 'side-path';
  if (tile?.interaction?.type === 'reward') {
    const claimed = state.completedInteractions.includes(tile.interaction.id) ? 'claimed' : `claim ${tile.interaction.spoil} +D${tile.interaction.debt}`;
    return `${purposeIcon(purpose)} ${prefix}: ${claimed}`;
  }
  if (tile?.interaction?.type === 'rest') {
    const claimed = state.completedInteractions.includes(tile.interaction.id) ? 'used' : 'rest';
    return `${purposeIcon(purpose)} ${prefix}: ${claimed}`;
  }
  if (tile?.interaction?.type === 'shortcut') {
    const claimed = state.completedInteractions.includes(tile.interaction.id) ? 'opened' : `shortcut +D${tile.interaction.debt}`;
    return `${purposeIcon(purpose)} ${prefix}: ${claimed}`;
  }
  if (tile?.interaction?.type === 'return-town') return `${purposeIcon(purpose)} ${prefix}: return`;
  if (tile?.interaction?.type === 'combat') return `${purposeIcon(purpose)} ${prefix}: fight`;
  return `${purposeIcon(purpose)} ${prefix}: ${purposeLabel(purpose)}`;
}

function claimedSpoilsLine(state: SliceState): string {
  const floor = floorForId(state.floorId);
  const spoils = floor.tiles.flatMap((tile) => {
    if (tile.interaction?.type !== 'reward') return [];
    return state.completedInteractions.includes(tile.interaction.id) ? [tile.interaction.spoil] : [];
  });
  return spoils.length > 0 ? `Spoils ${spoils.join(' / ')}` : '';
}

function countCompleted(state: SliceState, prefix: string): number {
  return state.completedInteractions.filter((id) => id.startsWith(prefix)).length;
}

function purposeIcon(purpose: TilePurpose): string {
  if (purpose === 'rest') return '+';
  if (purpose === 'reward') return '*';
  if (purpose === 'shortcut') return '>';
  if (purpose === 'boss-pressure') return '!';
  if (purpose === 'encounter') return '!';
  if (purpose === 'return') return '<';
  if (purpose === 'start') return '@';
  return '.';
}

function purposeLabel(purpose: TilePurpose): string {
  if (purpose === 'boss-pressure') return 'boss';
  if (purpose === 'side-path') return 'side path';
  return purpose;
}

function purposeColor(purpose: TilePurpose): number {
  if (purpose === 'rest') return colors.moss;
  if (purpose === 'reward') return colors.gold;
  if (purpose === 'shortcut' || purpose === 'return') return colors.cyan;
  if (purpose === 'boss-pressure' || purpose === 'encounter') return colors.red;
  return colors.stoneLight;
}

function purposeText(purpose: TilePurpose): string {
  if (purpose === 'rest') return text.cyan;
  if (purpose === 'reward') return text.gold;
  if (purpose === 'shortcut' || purpose === 'return') return text.cyan;
  if (purpose === 'boss-pressure' || purpose === 'encounter') return text.red;
  return text.mutedBone;
}

function exploreMotionDuration(command: ExploreMotionCommand, events: readonly GameEvent[]): number {
  if (events.some((event) => event.type === 'STEP_BUMPED')) return MOTION.explore.bumpMs;
  if (events.some((event) => event.type === 'STEP_MOVED')) {
    return command.type === 'step-back' ? MOTION.explore.backMs : MOTION.explore.forwardMs;
  }
  if (events.some((event) => event.type === 'FACING_CHANGED')) return MOTION.explore.turnMs;
  return 0;
}

function townServiceName(service: SliceState['townService']): string {
  if (service === 'gate') return 'Gate';
  if (service === 'vellum') return 'Vellum';
  return 'Sanctuary';
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

function initialStateForLocation(location: Pick<Location, 'search'>): SliceState {
  if (isM2UnderrootRoute(location)) return createTownState('m2-underroot');
  if (isS0Route(location)) return loadSavedState();
  if (!isM1CombatRoute(location)) return createTownState('m2-underroot');
  const state = createSliceState(M1_COMBAT_SEED);
  return {
    ...state,
    mode: 'combat',
    position: { x: 1, y: 1 },
    threat: 'hunted',
    combat: createCombatWithCards(M1_COMBAT_SEED, M1_STARTER_CARDS),
    log: ['M1 starter combat lab.'],
  };
}

function isS0Route(location: Pick<Location, 'search'>): boolean {
  return new URLSearchParams(location.search).get('scene') === 's0';
}

function isM1CombatRoute(location: Pick<Location, 'search'>): boolean {
  return new URLSearchParams(location.search).get('scene') === 'm1-combat';
}

function isM2UnderrootRoute(location: Pick<Location, 'search'>): boolean {
  return new URLSearchParams(location.search).get('scene') === 'm2-underroot';
}

function isLabRoute(location: Pick<Location, 'search'>): boolean {
  return isM1CombatRoute(location) || isM2UnderrootRoute(location);
}

function gameplayExplorationBackground(manifest: unknown): GameplayExplorationBackground {
  try {
    const asset = assetFromManifest(manifest, GAMEPLAY_EXPLORATION_BACKGROUND.id);
    if (asset.kind !== 'background' || asset.approvalGate !== 'approved-for-gameplay') return null;
    return {
      id: asset.id,
      path: asset.previewPath,
      approvalGate: asset.approvalGate,
    };
  } catch {
    return null;
  }
}

function gameplayCombatBackground(manifest: unknown): GameplayCombatBackground {
  try {
    const asset = assetFromManifest(manifest, GAMEPLAY_COMBAT_BACKGROUND.id);
    if (asset.kind !== 'background' || asset.approvalGate !== 'approved-for-gameplay') return null;
    return {
      id: asset.id,
      path: asset.previewPath,
      approvalGate: asset.approvalGate,
    };
  } catch {
    return null;
  }
}

function gameplayCardArt(manifest: unknown): readonly GameplayCardArt[] {
  return Object.entries(GAMEPLAY_CARD_ART).flatMap(([cardId, config]) => {
    try {
      const asset = assetFromManifest(manifest, config.id);
      if (asset.kind !== 'card-art' || asset.approvalGate !== 'approved-for-gameplay') return [];
      return [{
        cardId: cardId as keyof typeof GAMEPLAY_CARD_ART,
        assetId: asset.id,
        key: config.key,
        path: asset.previewPath,
        approvalGate: asset.approvalGate,
      }];
    } catch {
      return [];
    }
  });
}

function gameplayEnemySprite(manifest: unknown): GameplayEnemySprite {
  try {
    const asset = assetFromManifest(manifest, GAMEPLAY_ENEMY_SPRITE.id);
    if (asset.kind !== 'sprite' || asset.approvalGate !== 'approved-for-gameplay') return null;
    return {
      id: asset.id,
      path: asset.previewPath,
      approvalGate: asset.approvalGate,
    };
  } catch {
    return null;
  }
}

function targetCode(card: CardDef): string {
  return card.target.type === 'enemy' ? 'EN' : 'OWN';
}

function targetLabel(card: CardDef): string {
  return card.target.type === 'enemy' ? 'Enemy' : 'Owner';
}

function compactCardName(name: string): string {
  const fixed = COMPACT_CARD_NAMES[name];
  if (fixed) return fixed;
  if (name.length <= 10) return name;
  return name
    .split(' ')
    .map((part) => part.length > 5 ? part.slice(0, 5) : part)
    .join(' ')
    .slice(0, 10);
}

function cardPlayable(combat: CombatState, card: CardDef): boolean {
  const owner = combat.heroes.find((hero) => hero.id === card.owner);
  return combat.energy >= card.cost && !!owner && owner.hp > 0;
}

function cardSummary(card: CardDef): string {
  return card.effects.map(effectSummary).join(' ') || (card.text.split('\n')[0] ?? '');
}

function selectedCardDetail(card: CardDef): string {
  return `${card.name} | ${heroCode(card.owner)} Cost ${card.cost} ${targetLabel(card)} | ${cardRules(card)}`;
}

function cardRules(card: CardDef): string {
  return card.text.split('\n').map((line) => line.replace(/\.$/, '')).join(' / ');
}

function selectedEffectHints(card: CardDef): string[] {
  return card.effects.flatMap((effect) => {
    if (effect.type === 'apply-status') return [statusRule(effect.status)];
    if (effect.type === 'gain-debt') return [`Debt +${effect.amount}`];
    return [];
  });
}

function shortEffectHint(hint: string): string {
  if (hint === 'Mark adds burst damage') return 'Mark burst';
  if (hint === 'Vulnerable amplifies next hit') return 'Vuln amp';
  if (hint === 'Poison ticks before action') return 'Poison clock';
  if (hint === 'Bleed opens on HP hits') return 'Bleed payoff';
  if (hint === 'Weak softens next hit') return 'Weak hit';
  if (hint === 'Ward prevents one hit') return 'Ward save';
  return hint;
}

function effectSummary(effect: CardDef['effects'][number]): string {
  if (effect.type === 'damage') return `D${effect.amount}`;
  if (effect.type === 'gain-block') return `Blk${effect.amount}`;
  if (effect.type === 'heal') return `H${effect.amount}`;
  if (effect.type === 'apply-status') return `${statusCode(effect.status)}${effect.amount}`;
  return `+D${effect.amount}`;
}

function statusCode(status: StatusId): string {
  if (status === 'poison') return 'Po';
  if (status === 'bleed') return 'Bl';
  if (status === 'weak') return 'We';
  if (status === 'vulnerable') return 'Vu';
  if (status === 'mark') return 'Mk';
  return 'Wd';
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

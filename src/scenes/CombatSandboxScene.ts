import Phaser from 'phaser';
import { M1_STARTER_CARDS } from '../data/combat';
import { planFeelCues, type FeelCue } from '../fx/feelScheduler';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/layout';
import { MOTION } from '../game/motion';
import { THEME } from '../game/theme';
import type { CardId, CombatEvent, CombatState, GameEvent } from '../game/types';
import { cardDefFor, createCombatWithCards, endTurn, firstCardInstanceId, holdCard, playCard } from '../systems/combat';
import { stageCardInHandForLab } from '../systems/labCombat';
import { statusLegend, statusSummary } from '../systems/status';
import { publishDevSceneDebug } from './devSceneDebug';

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;
const SANDBOX_EVENT_STAGGER_MS = 120;
const SANDBOX_ENEMY_X = 304;
const COMBAT_PREVIEW = {
  backgroundId: 'underroot.combat.placeholder',
  backgroundKey: 'underroot-combat-preview',
  backgroundPath: '/assets/drafts/underroot/batch-01/underroot-combat-preview-01.png',
  backgroundApprovalState: 'approved',
  enemyId: 'enemy.root-wolf.placeholder',
  enemyKey: 'rootbitten-wolf-matte-preview',
  enemyPath: '/assets/drafts/underroot/batch-01/rootbitten-wolf-matte-preview-01.png',
  enemyApprovalState: 'in_game_previewed',
  compositionGate: 'needs-review',
} as const;
const HAND_SLOT_HITBOXES = [
  { x: 78, y: 114, w: 58, h: 18 },
  { x: 140, y: 114, w: 58, h: 18 },
  { x: 202, y: 114, w: 58, h: 18 },
  { x: 78, y: 132, w: 58, h: 18 },
  { x: 140, y: 132, w: 58, h: 18 },
] as const;

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
  private deckLabel!: Phaser.GameObjects.Text;
  private selectedSlot = 0;
  private audioContext: AudioContext | null = null;
  private lastCue = 'ready';
  private lastEvents: string[] = [];
  private deckSeedIndex = 0;
  private labCombat: CombatState = createCombatWithCards('sandbox-m1-0', M1_STARTER_CARDS);
  private floatLane = 0;
  private readonly cueTimers: Phaser.Time.TimerEvent[] = [];
  private hitStopUntil = 0;
  private hitStopTimeout: number | null = null;

  constructor() {
    super('CombatSandboxScene');
  }

  preload(): void {
    this.load.image(COMBAT_PREVIEW.backgroundKey, COMBAT_PREVIEW.backgroundPath);
    this.load.image(COMBAT_PREVIEW.enemyKey, COMBAT_PREVIEW.enemyPath);
  }

  create(): void {
    this.fx = this.add.group();
    this.drawShell();
    cues.forEach((cue) => {
      this.input.keyboard?.on(`keydown-${cue.key}`, () => this.trigger(cue));
    });
    this.input.keyboard?.on('keydown-SEVEN', () => this.previewNextDeck());
    this.input.keyboard?.on('keydown-EIGHT', () => this.playFirstLabCard());
    this.input.keyboard?.on('keydown-NINE', () => this.endLabTurn());
    this.input.keyboard?.on('keydown-ZERO', () => this.previewStatusStack());
    this.input.keyboard?.on('keydown-H', () => this.holdFirstLabCard());
    ['Q', 'W', 'E', 'R', 'T'].forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => this.selectLabSlot(index));
    });
    this.input.keyboard?.on('keydown-ENTER', () => this.playSelectedLabCard());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearCueTimers();
      this.clearHitStop();
      this.audioContext?.close();
      this.audioContext = null;
    });
    this.publishDebug();
  }

  private trigger(cue: CueButton): void {
    this.clearCueTimers();
    this.clearHitStop();
    this.lastCue = cue.label;
    this.floatLane = 0;
    this.statusLabel.setText(`Last: ${this.lastCue}`);
    for (const feelCue of planFeelCues(cue.event)) this.playFeelCue(feelCue);
    this.lastEvents = [cue.event.type];
    this.publishDebug();
  }

  private previewNextDeck(): void {
    this.clearCueTimers();
    this.clearHitStop();
    this.deckSeedIndex += 1;
    this.labCombat = createCombatWithCards(`sandbox-m1-${this.deckSeedIndex}`, M1_STARTER_CARDS);
    const preview = m1DeckPreview(this.labCombat);
    this.lastCue = `7 ${preview.seed}`;
    this.statusLabel.setText(`Last: ${this.lastCue}`);
    this.selectedSlot = 0;
    this.refreshDeckLabel();
    this.lastEvents = [];
    this.publishDebug();
  }

  private playFirstLabCard(): void {
    this.playLabCardAt(0);
  }

  private selectLabSlot(index: number): void {
    if (!this.labCombat.hand[index]) return;
    this.selectedSlot = index;
    const card = cardDefFor(this.labCombat, this.labCombat.hand[index]!);
    this.lastCue = `${slotKey(index)} ${card.name}`;
    this.statusLabel.setText(`Last: selected ${card.name}`);
    this.refreshDeckLabel();
    this.publishDebug();
  }

  private playSelectedLabCard(): void {
    this.playLabCardAt(this.selectedSlot);
  }

  private playLabCardAt(index: number): void {
    const cardId = this.labCombat.hand[index];
    if (!cardId) return;
    const card = cardDefFor(this.labCombat, cardId);
    const result = playCard(this.labCombat, cardId);
    this.labCombat = result.combat;
    this.selectedSlot = Math.min(index, Math.max(0, this.labCombat.hand.length - 1));
    this.applyLabResult(`${slotKey(index)} ${card.name}`, result.events);
  }

  private holdFirstLabCard(): void {
    const cardId = this.labCombat.hand[0];
    if (!cardId) return;
    const card = cardDefFor(this.labCombat, cardId);
    const result = holdCard(this.labCombat, cardId);
    this.labCombat = result.combat;
    this.selectedSlot = 0;
    this.applyLabResult(`H ${card.name}`, result.events);
  }

  private endLabTurn(): void {
    const result = endTurn(this.labCombat);
    this.labCombat = result.combat;
    this.selectedSlot = 0;
    this.applyLabResult('9 End turn', result.events);
  }

  private previewStatusStack(): void {
    this.labCombat = createCombatWithCards('sandbox-m1-status', M1_STARTER_CARDS);
    const events: CombatEvent[] = [];
    for (const defId of ['oath-ward', 'rootfire', 'barbed-shot'] as const) {
      this.labCombat = stageCardInHandForLab(this.labCombat, defId);
      const cardId = firstCardInstanceId(this.labCombat, defId);
      if (!cardId) throw new Error(`Missing sandbox card ${defId}`);
      const result = playCard(this.labCombat, cardId);
      this.labCombat = result.combat;
      events.push(...result.events);
    }
    this.selectedSlot = 0;
    this.applyLabResult('0 Status stack', events);
  }

  private applyLabResult(label: string, events: readonly CombatEvent[]): void {
    this.clearCueTimers();
    this.clearHitStop();
    this.lastCue = label;
    this.floatLane = 0;
    this.lastEvents = events.map(eventLabel).slice(-10);
    this.statusLabel.setText(`Last: ${this.lastCue}`);
    this.refreshDeckLabel();
    this.playCombatEvents(events);
    this.publishDebug();
  }

  private drawShell(): void {
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);
    g.fillStyle(colors.combatVoid, 1).fillRect(38, 50, 360, 190);
    g.fillStyle(colors.panelDeep, 1).fillRect(424, 50, 174, 190);

    this.add.image(218, 124, COMBAT_PREVIEW.backgroundKey)
      .setDisplaySize(360, 146);
    const plate = this.add.graphics();
    plate.fillStyle(colors.void, 0.18).fillRect(38, 51, 360, 146);
    plate.fillStyle(colors.void, 0.45).fillEllipse(SANDBOX_ENEMY_X, 171, 94, 16);
    this.add.image(SANDBOX_ENEMY_X, 130, COMBAT_PREVIEW.enemyKey)
      .setDisplaySize(84, 112);
    plate.lineStyle(1, colors.oxblood, 0.85).strokeRect(38, 51, 360, 146);
    plate.fillStyle(colors.panelDeep, 0.96).fillRect(38, 204, 360, 102);
    plate.lineStyle(1, colors.stoneLight, 0.45).strokeRect(38, 204, 360, 102);

    this.label('Combat Sandbox', 32, 28, text.gold);
    this.label('Draft combat comp', 44, 184, text.mutedBone);
    cues.forEach((cue, index) => this.label(cue.label, 440, 66 + index * 22, text.bone));
    this.label('7 M1 deck', 440, 66 + cues.length * 22, text.cyan);
    this.label('8 Play first', 440, 66 + (cues.length + 1) * 22, text.cyan);
    this.label('9 End turn', 440, 66 + (cues.length + 2) * 22, text.cyan);
    this.label('Q-T select  Enter play', 440, 66 + (cues.length + 3) * 22, text.cyan);
    this.label('H Hold first', 440, 66 + (cues.length + 4) * 22, text.cyan);
    this.label('0 Status stack', 440, 66 + (cues.length + 5) * 22, text.cyan);
    this.deckLabel = this.add.text(44, 210, deckPreviewText(m1DeckPreview(this.labCombat), this.labCombat, this.selectedSlot), { ...textStyle, color: text.bone, fontSize: '8px', lineSpacing: 0 });
    this.statusLabel = this.add.text(32, 316, `Last: ${this.lastCue}`, { ...textStyle, color: text.cyan });
    HAND_SLOT_HITBOXES.forEach((box, index) => {
      this.add.zone(box.x, box.y, box.w, box.h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectLabSlot(index));
    });
  }

  private refreshDeckLabel(): void {
    this.deckLabel.setText(deckPreviewText(m1DeckPreview(this.labCombat), this.labCombat, this.selectedSlot));
  }

  private publishDebug(): void {
    const preview = m1DeckPreview(this.labCombat);
    publishDevSceneDebug(this, 'combat-sandbox', this.lastCue, {
      combatSandbox: {
        seed: preview.seed,
        hand: preview.hand,
        drawPilePreview: preview.drawPile.slice(0, 5),
        drawPileCount: this.labCombat.drawPile.length,
        discardPileCount: this.labCombat.discardPile.length,
        held: this.labCombat.held ? cardDefFor(this.labCombat, this.labCombat.held).id : null,
        enemyHp: this.labCombat.enemy.hp,
        enemyStatuses: statusSummary(this.labCombat.enemy.statuses),
        enemyStatusStacks: this.labCombat.enemy.statuses,
        heroDebt: Object.fromEntries(this.labCombat.heroes.map((hero) => [hero.id, hero.debt])),
        heroStatuses: Object.fromEntries(this.labCombat.heroes.map((hero) => [hero.id, hero.statuses])),
        statusLegend: statusLegend(),
        lastEvents: this.lastEvents,
        selectedCard: selectedCardDebug(this.labCombat, this.selectedSlot),
        assetPreview: {
          backgroundId: COMBAT_PREVIEW.backgroundId,
          backgroundPath: COMBAT_PREVIEW.backgroundPath,
          backgroundApprovalState: COMBAT_PREVIEW.backgroundApprovalState,
          enemyId: COMBAT_PREVIEW.enemyId,
          enemyPath: COMBAT_PREVIEW.enemyPath,
          enemyApprovalState: COMBAT_PREVIEW.enemyApprovalState,
          compositionGate: COMBAT_PREVIEW.compositionGate,
        },
      },
    });
  }

  private playCombatEvent(event: CombatEvent): void {
    for (const feelCue of planFeelCues(event)) this.playFeelCue(feelCue);
  }

  private playCombatEvents(events: readonly CombatEvent[]): void {
    events.forEach((event, index) => {
      const timer = this.time.delayedCall(index * SANDBOX_EVENT_STAGGER_MS, () => {
        this.forgetCueTimer(timer);
        this.playCombatEvent(event);
      });
      this.cueTimers.push(timer);
    });
  }

  private playFeelCue(cue: FeelCue): void {
    if (cue.type === 'shake') {
      this.cameras.main.shake(cue.durationMs, cue.intensity);
      return;
    }
    if (cue.type === 'hit-stop') {
      const deadline = window.performance.now() + cue.durationMs;
      if (deadline <= this.hitStopUntil) return;
      this.hitStopUntil = deadline;
      this.time.timeScale = 0.001;
      if (this.hitStopTimeout !== null) window.clearTimeout(this.hitStopTimeout);
      this.hitStopTimeout = window.setTimeout(() => {
        this.time.timeScale = 1;
        this.hitStopUntil = 0;
        this.hitStopTimeout = null;
      }, cue.durationMs);
      return;
    }
    if (cue.type === 'float-text') {
      this.float(cue.text, cue.target === 'enemy' ? SANDBOX_ENEMY_X : 510, cue.target === 'debt' ? 170 : 118, cue.tone === 'debt' ? text.red : text.gold);
      return;
    }
    if (cue.type === 'tone') this.tone(cue.tone.frequencyHz, cue.tone.durationMs);
  }

  private float(labelText: string, x: number, y: number, color: string): void {
    const lane = this.floatLane;
    this.floatLane = (this.floatLane + 1) % 5;
    const laneX = x + (lane % 2 === 0 ? 0 : 22);
    const laneY = y - lane * 12;
    const label = this.add.text(laneX, laneY, labelText, { ...textStyle, color, fontSize: MOTION.text.largeFloatFontSize });
    this.fx.add(label);
    this.tweens.add({
      targets: label,
      y: laneY + MOTION.text.floatDriftY,
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

  private clearCueTimers(): void {
    for (const timer of this.cueTimers) timer.remove(false);
    this.cueTimers.length = 0;
  }

  private forgetCueTimer(timer: Phaser.Time.TimerEvent): void {
    const index = this.cueTimers.indexOf(timer);
    if (index >= 0) this.cueTimers.splice(index, 1);
  }

  private clearHitStop(): void {
    if (this.hitStopTimeout !== null) window.clearTimeout(this.hitStopTimeout);
    this.hitStopTimeout = null;
    this.hitStopUntil = 0;
    this.time.timeScale = 1;
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

type DeckPreview = Readonly<{
  seed: string;
  hand: readonly CardId[];
  drawPile: readonly CardId[];
}>;

function m1DeckPreview(combat: CombatState): DeckPreview {
  return {
    seed: combat.seed,
    hand: combat.hand.map((cardId) => cardDefFor(combat, cardId).id),
    drawPile: combat.drawPile.map((cardId) => cardDefFor(combat, cardId).id),
  };
}

function deckPreviewText(preview: DeckPreview, combat: CombatState, selectedSlot: number): string {
  return [
    'M1 starter lab',
    `Seed ${preview.seed}`,
    `Energy ${combat.energy}/3  Held ${combat.held ? shortCardName(cardDefFor(combat, combat.held).id) : '-'}`,
    ...cardListLines('Hand', preview.hand, 3, selectedSlot),
    ...cardListLines('Draw', preview.drawPile.slice(0, 5), 3),
    `Draw +${Math.max(0, preview.drawPile.length - 5)} more  Discard ${combat.discardPile.length}`,
    `Wolf ${combat.enemy.hp}/${combat.enemy.maxHp} ${statusSummary(combat.enemy.statuses) || '-'}`,
    `Debt ${combat.heroes.map((hero) => `${hero.name[0]}${hero.debt}`).join(' ')}`,
    selectedHandDetail(combat, selectedSlot),
  ].join('\n');
}

function cardListLines(label: string, cardIds: readonly CardId[], maxFirstLine: number, selectedSlot: number | null = null): string[] {
  const names = cardIds.map((cardId, index) => `${selectedSlot === index ? '>' : ''}${shortCardName(cardId)}`);
  if (names.length <= maxFirstLine) return [`${label} ${names.join(' / ')}`];
  return [
    `${label} ${names.slice(0, maxFirstLine).join(' / ')}`,
    `     ${names.slice(maxFirstLine).join(' / ')}`,
  ];
}

function slotKey(index: number): string {
  return ['Q', 'W', 'E', 'R', 'T'][index] ?? '8';
}

function eventLabel(event: CombatEvent): string {
  if (event.type === 'CARD_PLAYED') return `play:${event.defId}`;
  if (event.type === 'DAMAGE_DEALT') return `damage:${event.amount}`;
  if (event.type === 'STATUS_APPLIED') return `status:${event.status}+${event.amount}`;
  if (event.type === 'DEBT_GAINED') return `debt:${event.heroId}+${event.amount}`;
  if (event.type === 'CARD_HELD') return `hold:${event.defId}`;
  if (event.type === 'CARD_REJECTED') return `reject:${event.reason}`;
  return event.type.toLowerCase();
}

function shortCardName(cardId: CardId): string {
  if (cardId === 'iron-cut') return 'Iron';
  if (cardId === 'hold-fast') return 'Hold';
  if (cardId === 'mend') return 'Mend';
  if (cardId === 'mark-prey') return 'Mark';
  if (cardId === 'blood-edge') return 'Blood';
  if (cardId === 'oath-ward') return 'Oath';
  if (cardId === 'sundering-cut') return 'Sunder';
  if (cardId === 'sanctuary-veil') return 'Veil';
  if (cardId === 'quiet-rebuke') return 'Rebuke';
  if (cardId === 'glass-hex') return 'Glass';
  if (cardId === 'rootfire') return 'Rootfire';
  if (cardId === 'barbed-shot') return 'Barb';
  if (cardId === 'stone-guard') return 'Stone';
  if (cardId === 'ringing-blow') return 'Ring';
  if (cardId === 'white-thread') return 'Thread';
  if (cardId === 'mercy-cut') return 'Mercy';
  if (cardId === 'prayer-knot') return 'Prayer';
  if (cardId === 'black-spark') return 'Spark';
  if (cardId === 'venom-script') return 'Venom';
  if (cardId === 'glass-pulse') return 'Pulse';
  if (cardId === 'shadow-mark') return 'S.Mark';
  if (cardId === 'needle-rain') return 'Needle';
  if (cardId === 'marked-step') return 'Step';
  if (cardId === 'tripwire') return 'Trip';
  return assertNever(cardId);
}

function selectedHandDetail(combat: CombatState, selectedSlot: number): string {
  const cardId = combat.hand[selectedSlot];
  if (!cardId) return `${slotKey(selectedSlot)} -`;
  const card = cardDefFor(combat, cardId);
  return `${slotKey(selectedSlot)} ${shortCardName(card.id)} ${card.name} c${card.cost} ${card.owner} ${card.target.type}\n   ${card.text.replaceAll('\n', ' / ')}`;
}

function selectedCardDebug(combat: CombatState, selectedSlot: number) {
  const cardId = combat.hand[selectedSlot];
  if (!cardId) return null;
  const card = cardDefFor(combat, cardId);
  return {
    slot: slotKey(selectedSlot),
    id: card.id,
    name: card.name,
    owner: card.owner,
    cost: card.cost,
    target: card.target.type,
    text: card.text,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected card id: ${value}`);
}

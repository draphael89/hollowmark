export type Facing = 'north' | 'east' | 'south' | 'west';
export type ThreatBand = 'calm' | 'uneasy' | 'hunted';
export type SliceMode = 'explore' | 'combat' | 'victory' | 'defeat';
export type FloorId = 's0-root-wolf-hallway';
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type TileCoord = {
  x: number;
  y: number;
};

export type TilePurpose = 'start' | 'approach' | 'encounter' | 'side-path';

export type FloorTile = Readonly<{
  coord: TileCoord;
  walkable: boolean;
  threat: ThreatBand;
  purpose: TilePurpose;
  logLine: string;
  visual: 'stone-hall' | 'root-arch' | 'side-passage';
}>;

export type FloorDef = Readonly<{
  id: FloorId;
  start: TileCoord;
  startFacing: Facing;
  tiles: readonly FloorTile[];
}>;

export type HeroId = 'liese' | 'eris' | 'mia' | 'robin';
export type StatusId = 'poison' | 'bleed' | 'weak' | 'vulnerable' | 'mark' | 'ward';
export type StatusStacks = Readonly<Record<StatusId, number>>;

export type HeroState = {
  id: HeroId;
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  block: number;
  debt: number;
  statuses: StatusStacks;
};

export type EnemyState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusStacks;
  intent: EnemyIntent;
};

export type EnemyIntent = Readonly<{ type: 'attack'; target: HeroId; amount: number }>;

export type CardId =
  | 'iron-cut'
  | 'hold-fast'
  | 'mend'
  | 'mark-prey'
  | 'blood-edge'
  | 'oath-ward'
  | 'sundering-cut'
  | 'stone-guard'
  | 'ringing-blow'
  | 'sanctuary-veil'
  | 'quiet-rebuke'
  | 'white-thread'
  | 'mercy-cut'
  | 'prayer-knot'
  | 'glass-hex'
  | 'rootfire'
  | 'black-spark'
  | 'venom-script'
  | 'glass-pulse'
  | 'barbed-shot'
  | 'shadow-mark'
  | 'needle-rain'
  | 'marked-step'
  | 'tripwire';
export type CardInstanceId = Brand<string, 'CardInstanceId'>;

export function cardInstanceId(value: string): CardInstanceId {
  return value as CardInstanceId;
}

export type CardDef = Readonly<{
  id: CardId;
  name: string;
  owner: HeroId;
  cost: number;
  target: TargetRule;
  effects: readonly CardEffect[];
  text: string;
}>;

export type CardInstance = {
  id: CardInstanceId;
  defId: CardId;
};

export type ActorRef =
  | { kind: 'hero'; id: HeroId }
  | { kind: 'enemy'; id: string }
  | { kind: 'system' };

export type TargetRef =
  | { kind: 'hero'; id: HeroId }
  | { kind: 'enemy'; id: string };

export type TargetRule =
  | Readonly<{ type: 'enemy' }>
  | Readonly<{ type: 'owner' }>;

export type DamageTag = 'physical' | 'mark' | 'debt' | 'weak' | 'vulnerable' | 'poison' | 'bleed';

export type CardEffect =
  | Readonly<{ type: 'damage'; amount: number; tags: readonly DamageTag[] }>
  | Readonly<{ type: 'gain-block'; amount: number }>
  | Readonly<{ type: 'heal'; amount: number }>
  | Readonly<{ type: 'apply-status'; status: StatusId; amount: number }>
  | Readonly<{ type: 'gain-debt'; amount: number }>;

export type CombatEvent =
  | { type: 'CARD_PLAYED'; cardId: CardInstanceId; defId: CardId; owner: HeroId; cost: number; target: TargetRef }
  | {
      type: 'DAMAGE_DEALT';
      source: ActorRef;
      target: ActorRef;
      amount: number;
      blocked: number;
      lethal: boolean;
      tags: readonly DamageTag[];
      cardId?: CardInstanceId;
      defId?: CardId;
    }
  | { type: 'BLOCK_GAINED'; heroId: HeroId; amount: number; source: ActorRef; cardId?: CardInstanceId; defId?: CardId }
  | { type: 'HEAL_APPLIED'; heroId: HeroId; amount: number; source: ActorRef; cardId?: CardInstanceId; defId?: CardId }
  | { type: 'STATUS_APPLIED'; status: StatusId; amount: number; total: number; source: ActorRef; target: ActorRef; cardId?: CardInstanceId; defId?: CardId }
  | { type: 'STATUS_CONSUMED'; status: StatusId; target: ActorRef; prevented: number }
  | { type: 'DEBT_GAINED'; heroId: HeroId; amount: number; total: number; source: ActorRef; cardId?: CardInstanceId; defId?: CardId }
  | { type: 'CARD_DRAWN'; cardId: CardInstanceId; defId: CardId }
  | { type: 'CARD_HELD'; cardId: CardInstanceId; defId: CardId }
  | { type: 'CARD_REJECTED'; cardId: string; reason: 'hold-slot-full' | 'missing-card' | 'not-enough-energy' | 'invalid-target' | 'dead-target' | 'dead-owner'; target?: TargetRef }
  | { type: 'HAND_REFILLED'; count: number }
  | { type: 'ENEMY_TURN_ENDED' }
  | { type: 'ENEMY_TURN_STARTED' }
  | { type: 'PLAYER_TURN_STARTED' }
  | { type: 'DEFEAT' }
  | { type: 'VICTORY' };

export type GameEvent =
  | { type: 'STEP_MOVED'; from: TileCoord; to: TileCoord; threat: ThreatBand }
  | { type: 'STEP_BUMPED'; at: TileCoord; facing: Facing }
  | { type: 'FACING_CHANGED'; from: Facing; to: Facing }
  | { type: 'INTERACT_NONE' }
  | { type: 'COMBAT_STARTED' }
  | {
      type: 'COMMAND_REJECTED';
      reason: 'wrong-mode';
      commandType: SliceCommandType;
      mode: SliceMode;
    }
  | CombatEvent;

export type CombatState = {
  turn: number;
  seed: string;
  heroes: HeroState[];
  enemy: EnemyState;
  cards: Record<CardInstanceId, CardInstance>;
  drawPile: CardInstanceId[];
  hand: CardInstanceId[];
  discardPile: CardInstanceId[];
  held: CardInstanceId | null;
  energy: number;
  log: string[];
};

export type ExploreCommand =
  | { type: 'step-forward' }
  | { type: 'step-back' }
  | { type: 'turn-left' }
  | { type: 'turn-right' }
  | { type: 'interact' };

export type CombatCommand =
  | { type: 'hold-card'; cardId: CardInstanceId }
  | { type: 'end-turn' }
  | { type: 'play-card'; cardId: CardInstanceId; target?: TargetRef };

export type SliceCommand = ExploreCommand | CombatCommand;
export type SliceCommandType = SliceCommand['type'];

export type SliceState = {
  seed: string;
  floorId: FloorId;
  mode: SliceMode;
  position: TileCoord;
  facing: Facing;
  threat: ThreatBand;
  log: string[];
  commandLog: SliceCommand[];
  combat: CombatState | null;
};

export type Facing = 'north' | 'east' | 'south' | 'west';
export type ThreatBand = 'calm' | 'uneasy' | 'hunted';
export type SliceMode = 'explore' | 'combat' | 'victory' | 'defeat';
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type TileCoord = {
  x: number;
  y: number;
};

export type HeroId = 'liese' | 'eris' | 'mia' | 'robin';

export type HeroState = {
  id: HeroId;
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  block: number;
  debt: number;
};

export type EnemyState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  marked: boolean;
  intent: EnemyIntent;
};

export type EnemyIntent = { type: 'attack'; target: HeroId; amount: number };

export type CardId = 'iron-cut' | 'hold-fast' | 'mend' | 'mark-prey' | 'blood-edge';
export type CardInstanceId = Brand<string, 'CardInstanceId'>;

export function cardInstanceId(value: string): CardInstanceId {
  return value as CardInstanceId;
}

export type CardDef = {
  id: CardId;
  name: string;
  owner: HeroId;
  cost: number;
  kind: 'damage' | 'block' | 'heal' | 'mark';
  amount: number;
  debt: number;
  text: string;
};

export type CardInstance = {
  id: CardInstanceId;
  defId: CardId;
};

export type CombatEvent =
  | { type: 'DAMAGE'; amount: number; blocked: number; target: 'enemy' | HeroId }
  | { type: 'BLOCK'; heroId: HeroId; amount: number }
  | { type: 'HEAL'; heroId: HeroId; amount: number }
  | { type: 'MARK' }
  | { type: 'DEBT'; heroId: HeroId; amount: number }
  | { type: 'CARD_DRAWN'; cardId: CardInstanceId; defId: CardId }
  | { type: 'CARD_HELD'; cardId: CardInstanceId; defId: CardId }
  | { type: 'CARD_REJECTED'; cardId: string; reason: 'hold-slot-full' | 'missing-card' | 'not-enough-energy' }
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
  | { type: 'play-card'; cardId: CardInstanceId };

export type SliceCommand = ExploreCommand | CombatCommand;
export type SliceCommandType = SliceCommand['type'];

export type SliceState = {
  seed: string;
  mode: SliceMode;
  position: TileCoord;
  facing: Facing;
  threat: ThreatBand;
  log: string[];
  commandLog: SliceCommand[];
  combat: CombatState | null;
};

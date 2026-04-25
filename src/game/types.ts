export type Facing = 'north' | 'east' | 'south' | 'west';
export type ThreatBand = 'calm' | 'uneasy' | 'hunted';
export type SliceMode = 'explore' | 'combat' | 'victory';

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
  intent: string;
};

export type CardId = 'iron-cut' | 'hold-fast' | 'mend' | 'mark-prey' | 'blood-edge';

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

export type CombatEvent =
  | { type: 'DAMAGE'; amount: number }
  | { type: 'BLOCK'; heroId: HeroId; amount: number }
  | { type: 'HEAL'; heroId: HeroId; amount: number }
  | { type: 'MARK' }
  | { type: 'DEBT'; heroId: HeroId; amount: number }
  | { type: 'VICTORY' };

export type CombatState = {
  seed: string;
  heroes: HeroState[];
  enemy: EnemyState;
  hand: CardDef[];
  held: CardDef | null;
  energy: number;
  log: string[];
};

export type SliceCommand =
  | { type: 'step-forward' }
  | { type: 'step-back' }
  | { type: 'turn-left' }
  | { type: 'turn-right' }
  | { type: 'interact' }
  | { type: 'hold-card'; cardId: CardId }
  | { type: 'play-card'; cardId: CardId };

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

import { isFloorId } from '../data/floors';
import {
  cardInstanceId,
  type CardId,
  type CardInstance,
  type CardInstanceId,
  type CombatCommand,
  type CombatState,
  type EnemyIntent,
  type EnemyState,
  type ExploreCommand,
  type Facing,
  type FloorId,
  type HeroId,
  type HeroState,
  type SliceCommand,
  type SliceMode,
  type SliceState,
  type TargetRef,
  type ThreatBand,
  type TileCoord,
} from '../game/types';

export const SAVE_VERSION = 1;

export type SaveV1 = Readonly<{
  version: typeof SAVE_VERSION;
  state: SliceState;
}>;

export type LoadResult =
  | { ok: true; state: SliceState }
  | { ok: false; error: string };

const facings = ['north', 'east', 'south', 'west'] as const satisfies readonly Facing[];
const modes = ['explore', 'combat', 'victory', 'defeat'] as const satisfies readonly SliceMode[];
const threats = ['calm', 'uneasy', 'hunted'] as const satisfies readonly ThreatBand[];
const heroes = ['liese', 'eris', 'mia', 'robin'] as const satisfies readonly HeroId[];
const cards = ['iron-cut', 'hold-fast', 'mend', 'mark-prey', 'blood-edge'] as const satisfies readonly CardId[];

export function serializeSave(state: SliceState): SaveV1 {
  return { version: SAVE_VERSION, state };
}

export function deserializeSave(value: unknown): LoadResult {
  if (!isRecord(value)) return fail('Save must be an object.');
  if (value.version !== SAVE_VERSION) return fail('Unsupported save version.');

  const state = parseSliceState(value.state);
  if (!state) return fail('Save state is invalid.');
  return { ok: true, state };
}

export function migrateSave(value: unknown): LoadResult {
  return deserializeSave(value);
}

function parseSliceState(value: unknown): SliceState | null {
  if (!isRecord(value)) return null;
  if (!isString(value.seed)) return null;
  if (!isString(value.floorId) || !isFloorId(value.floorId)) return null;
  const floorId: FloorId = value.floorId;
  if (!isOneOf(value.mode, modes)) return null;
  if (!isCoord(value.position)) return null;
  if (!isOneOf(value.facing, facings)) return null;
  if (!isOneOf(value.threat, threats)) return null;
  if (!isStringArray(value.log)) return null;
  const commandLog = parseCommands(value.commandLog);
  if (!commandLog) return null;
  const combat = value.combat === null ? null : parseCombat(value.combat);
  if (combat === undefined) return null;
  if (value.mode !== 'explore' && !combat) return null;

  return {
    seed: value.seed,
    floorId,
    mode: value.mode,
    position: value.position,
    facing: value.facing,
    threat: value.threat,
    log: value.log,
    commandLog,
    combat,
  };
}

function parseCombat(value: unknown): CombatState | undefined {
  if (!isRecord(value)) return undefined;
  if (!isNumber(value.turn) || !isString(value.seed) || !isNumber(value.energy)) return undefined;
  const heroStates = parseHeroes(value.heroes);
  if (!heroStates) return undefined;
  const enemy = parseEnemy(value.enemy);
  if (!enemy) return undefined;
  const cardInstances = parseCards(value.cards);
  if (!cardInstances) return undefined;
  const cardIds = new Set(Object.keys(cardInstances));
  const drawPile = parseCardIds(value.drawPile, cardIds);
  const hand = parseCardIds(value.hand, cardIds);
  const discardPile = parseCardIds(value.discardPile, cardIds);
  if (!drawPile || !hand || !discardPile) return undefined;
  const held = value.held === null ? null : parseCardId(value.held, cardIds);
  if (held === undefined) return undefined;
  if (!isStringArray(value.log)) return undefined;
  if (!hasUniqueZoneCards(drawPile, hand, discardPile, held)) return undefined;

  return {
    turn: value.turn,
    seed: value.seed,
    heroes: heroStates,
    enemy,
    cards: cardInstances,
    drawPile,
    hand,
    discardPile,
    held,
    energy: value.energy,
    log: value.log,
  };
}

function hasUniqueZoneCards(
  drawPile: readonly CardInstanceId[],
  hand: readonly CardInstanceId[],
  discardPile: readonly CardInstanceId[],
  held: CardInstanceId | null,
): boolean {
  const seen = new Set<CardInstanceId>();
  for (const cardId of [...drawPile, ...hand, ...discardPile, ...(held ? [held] : [])]) {
    if (seen.has(cardId)) return false;
    seen.add(cardId);
  }
  return true;
}

function parseHeroes(value: unknown): HeroState[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parseHero);
  if (parsed.some((hero) => !hero)) return null;
  return parsed as HeroState[];
}

function parseHero(value: unknown): HeroState | null {
  if (!isRecord(value)) return null;
  if (!isOneOf(value.id, heroes)) return null;
  if (!isString(value.name) || !isString(value.role)) return null;
  if (!isNumber(value.hp) || !isNumber(value.maxHp) || !isNumber(value.block) || !isNumber(value.debt)) return null;
  return {
    id: value.id,
    name: value.name,
    role: value.role,
    hp: value.hp,
    maxHp: value.maxHp,
    block: value.block,
    debt: value.debt,
  };
}

function parseEnemy(value: unknown): EnemyState | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.name)) return null;
  if (!isNumber(value.hp) || !isNumber(value.maxHp) || !isNumber(value.block) || !isBoolean(value.marked)) return null;
  const intent = parseIntent(value.intent);
  if (!intent) return null;
  return {
    id: value.id,
    name: value.name,
    hp: value.hp,
    maxHp: value.maxHp,
    block: value.block,
    marked: value.marked,
    intent,
  };
}

function parseIntent(value: unknown): EnemyIntent | null {
  if (!isRecord(value)) return null;
  if (value.type !== 'attack' || !isOneOf(value.target, heroes) || !isNumber(value.amount)) return null;
  return { type: 'attack', target: value.target, amount: value.amount };
}

function parseCards(value: unknown): Record<CardInstanceId, CardInstance> | null {
  if (!isRecord(value)) return null;
  const parsed: Record<CardInstanceId, CardInstance> = {};
  for (const [key, card] of Object.entries(value)) {
    if (!isRecord(card) || card.id !== key || !isOneOf(card.defId, cards)) return null;
    const id = cardInstanceId(key);
    parsed[id] = { id, defId: card.defId };
  }
  return parsed;
}

function parseCardIds(value: unknown, known: ReadonlySet<string>): CardInstanceId[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((id) => parseCardId(id, known));
  if (parsed.some((id) => id === undefined)) return null;
  return parsed as CardInstanceId[];
}

function parseCardId(value: unknown, known: ReadonlySet<string>): CardInstanceId | undefined {
  if (!isString(value) || !known.has(value)) return undefined;
  return cardInstanceId(value);
}

function parseCommands(value: unknown): SliceCommand[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parseCommand);
  if (parsed.some((command) => !command)) return null;
  return parsed as SliceCommand[];
}

function parseCommand(value: unknown): SliceCommand | null {
  if (!isRecord(value) || !isString(value.type)) return null;
  if (value.type === 'step-forward' || value.type === 'step-back' || value.type === 'turn-left' || value.type === 'turn-right' || value.type === 'interact') {
    return { type: value.type } satisfies ExploreCommand;
  }
  if (value.type === 'end-turn') return { type: 'end-turn' } satisfies CombatCommand;
  if (value.type === 'hold-card' && isString(value.cardId)) {
    return { type: value.type, cardId: cardInstanceId(value.cardId) } satisfies CombatCommand;
  }
  if (value.type === 'play-card' && isString(value.cardId)) {
    const target = value.target === undefined ? undefined : parseTarget(value.target);
    if (value.target !== undefined && !target) return null;
    return { type: value.type, cardId: cardInstanceId(value.cardId), target: target ?? undefined } satisfies CombatCommand;
  }
  return null;
}

function parseTarget(value: unknown): TargetRef | null {
  if (!isRecord(value) || !isString(value.kind) || !isString(value.id)) return null;
  if (value.kind === 'enemy') return { kind: 'enemy', id: value.id };
  if (value.kind === 'hero' && isOneOf(value.id, heroes)) return { kind: 'hero', id: value.id };
  return null;
}

function isCoord(value: unknown): value is TileCoord {
  return isRecord(value) && isNumber(value.x) && isNumber(value.y);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return isString(value) && options.includes(value as T);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function fail(error: string): LoadResult {
  return { ok: false, error };
}

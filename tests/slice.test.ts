import { describe, expect, it } from 'vitest';
import { M1_STARTER_CARDS, S0_CARDS } from '../src/data/combat';
import { floorForId, UNDERROOT_M2_FLOOR_ID } from '../src/data/floors';
import { cardInstanceId, type FloorDef, type TileCoord } from '../src/game/types';
import { cardDefFor } from '../src/systems/combat';
import { applyCommand, createSliceState, createTownState } from '../src/systems/slice';

describe('mode-safe slice reducer', () => {
  it('rejects combat commands while exploring', () => {
    const result = applyCommand(createSliceState(), { type: 'play-card', cardId: cardInstanceId('iron-cut') });

    expect(result.state.mode).toBe('explore');
    expect(result.state.commandLog).toHaveLength(1);
    expect(result.events).toContainEqual({
      type: 'COMMAND_REJECTED',
      reason: 'wrong-mode',
      commandType: 'play-card',
      mode: 'explore',
    });
  });

  it('emits movement events while exploring', () => {
    const result = applyCommand(createSliceState(), { type: 'step-forward' });

    expect(result.state.position).toEqual({ x: 1, y: 2 });
    expect(result.events).toContainEqual({
      type: 'STEP_MOVED',
      from: { x: 1, y: 3 },
      to: { x: 1, y: 2 },
      threat: 'uneasy',
    });
  });

  it('does not emit the same event identity twice for one dispatch', () => {
    const result = applyCommand(createSliceState(), { type: 'step-back' });
    const seen = new Set<string>();

    for (const event of result.events) {
      const key = JSON.stringify(event);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('transitions to defeat when combat emits defeat', () => {
    let state = createSliceState();
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'interact' }).state;
    state = {
      ...state,
      combat: {
        ...state.combat!,
        heroes: state.combat!.heroes.map((hero) => ({
          ...hero,
          hp: hero.id === 'liese' ? 1 : 0,
        })),
      },
    };

    const result = applyCommand(state, { type: 'end-turn' });

    expect(result.state.mode).toBe('defeat');
    expect(result.events.at(-1)).toEqual({ type: 'DEFEAT' });
  });

  it('transitions to victory when poison kills the enemy during end turn', () => {
    let state = createSliceState();
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'interact' }).state;
    state = {
      ...state,
      combat: {
        ...state.combat!,
        enemy: {
          ...state.combat!.enemy,
          hp: 1,
          statuses: { ...state.combat!.enemy.statuses, poison: 1 },
        },
      },
    };

    const result = applyCommand(state, { type: 'end-turn' });

    expect(result.state.mode).toBe('victory');
    expect(result.state.combat?.enemy.hp).toBe(0);
    expect(result.events.at(-1)).toEqual({ type: 'VICTORY' });
  });

  it('rejects invalid explicit combat targets through the slice boundary', () => {
    let state = createSliceState();
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'interact' }).state;
    const combat = state.combat!;
    const ironCut = combat.hand.find((cardId) => combat.cards[cardId]?.defId === 'iron-cut');
    if (!ironCut) throw new Error('Missing Iron Cut');

    const result = applyCommand(state, { type: 'play-card', cardId: ironCut, target: { kind: 'hero', id: 'liese' } });

    expect(result.state.mode).toBe('combat');
    expect(result.state.combat).toBe(combat);
    expect(result.state.commandLog.at(-1)).toEqual({ type: 'play-card', cardId: ironCut, target: { kind: 'hero', id: 'liese' } });
    expect(result.events).toEqual([{ type: 'CARD_REJECTED', cardId: ironCut, reason: 'invalid-target', target: { kind: 'hero', id: 'liese' } }]);
  });

  it('enters the placeholder Underroot floor from Marrowgate', () => {
    const result = applyCommand(createTownState('m2-underroot'), { type: 'enter-underroot' });

    expect(result.state.mode).toBe('explore');
    expect(result.state.floorId).toBe('underroot-m2-placeholder');
    expect(result.state.position).toEqual({ x: 1, y: 5 });
    expect(result.events).toContainEqual({ type: 'UNDERROOT_ENTERED' });
  });

  it('keeps every authored Underroot interaction reachable from the entrance', () => {
    const floor = floorForId(UNDERROOT_M2_FLOOR_ID);
    const reachable = reachableTileKeys(floor);
    const interactions = floor.tiles.filter((tile) => tile.walkable && tile.interaction);

    expect(interactions.map((tile) => tile.interaction?.id)).toEqual([
      'underroot-rest-1',
      'underroot-normal-1',
      'underroot-normal-2',
      'underroot-reward-2',
      'underroot-return-1',
      'underroot-reward-1',
      'underroot-normal-3',
      'underroot-normal-5',
      'underroot-boss-1',
      'underroot-shortcut-1',
      'underroot-reward-3',
      'underroot-normal-4',
      'underroot-elite-1',
    ]);
    for (const tile of interactions) {
      expect(reachable.has(tileKey(tile.coord)), `${tile.interaction?.id} at ${tileKey(tile.coord)} should be reachable`).toBe(true);
    }
  });

  it('matches the M2 placeholder content targets before visual production', () => {
    const floor = floorForId(UNDERROOT_M2_FLOOR_ID);
    const interactions = floor.tiles.flatMap((tile) => tile.interaction ? [tile.interaction] : []);
    const combatIds = interactions.filter((interaction) => interaction.type === 'combat').map((interaction) => interaction.id);
    const rewardSpoils = interactions.flatMap((interaction) => interaction.type === 'reward' ? [interaction.spoil] : []);

    expect(floor.tiles).toHaveLength(15);
    expect(combatIds.filter((id) => id.startsWith('underroot-normal-'))).toHaveLength(5);
    expect(combatIds).toContain('underroot-elite-1');
    expect(combatIds).toContain('underroot-boss-1');
    expect(interactions.filter((interaction) => interaction.type === 'reward')).toHaveLength(3);
    expect(rewardSpoils).toEqual(['Bone Charm', 'Warm Shard', 'Silver Nest']);
    expect(interactions.filter((interaction) => interaction.type === 'rest')).toHaveLength(1);
    expect(interactions.filter((interaction) => interaction.type === 'shortcut')).toHaveLength(1);
    expect(interactions.filter((interaction) => interaction.type === 'return-town')).toHaveLength(1);
    expect(new Set(floor.tiles.map((tile) => tile.visualRecipe)).size).toBeGreaterThanOrEqual(10);
  });

  it('resolves authored rest, reward, and shortcut tile interactions once', () => {
    let state = applyCommand(createTownState('m2-underroot'), { type: 'enter-underroot' }).state;
    state = applyCommand(state, { type: 'step-forward' }).state;
    expect(state.position).toEqual({ x: 1, y: 4 });

    const rest = applyCommand(state, { type: 'interact' });
    expect(rest.events).toContainEqual({ type: 'TILE_INTERACTION_COMPLETED', id: 'underroot-rest-1', interaction: 'rest' });
    expect(rest.state.completedInteractions).toContain('underroot-rest-1');
    expect(rest.state.log.at(-1)).toContain('Sanctuary moss');

    const repeated = applyCommand(rest.state, { type: 'interact' });
    expect(repeated.events).toEqual([{ type: 'INTERACT_NONE' }]);

    state = applyCommand(rest.state, { type: 'step-forward' }).state;
    state = applyCommand(state, { type: 'turn-right' }).state;
    state = applyCommand(state, { type: 'step-forward' }).state;
    expect(state.position).toEqual({ x: 2, y: 3 });

    const reward = applyCommand(state, { type: 'interact' });
    expect(reward.events).toContainEqual({ type: 'TILE_INTERACTION_COMPLETED', id: 'underroot-reward-1', interaction: 'reward' });
    expect(reward.state.completedInteractions).toContain('underroot-reward-1');
    expect(reward.state.townDebt).toBe(1);
    expect(reward.state.log.at(-1)).toContain('warm shard');

    state = applyCommand(reward.state, { type: 'step-forward' }).state;
    expect(state.position).toEqual({ x: 3, y: 3 });

    const shortcut = applyCommand(state, { type: 'interact' });
    expect(shortcut.events).toContainEqual({ type: 'TILE_INTERACTION_COMPLETED', id: 'underroot-shortcut-1', interaction: 'shortcut' });
    expect(shortcut.state.position).toEqual({ x: 1, y: 3 });
    expect(shortcut.state.townDebt).toBe(2);
  });

  it('turns claimed Underroot rewards into distinct combat starts', () => {
    const state = {
      ...createTownState('m2-underroot'),
      mode: 'explore' as const,
      position: { x: 0, y: 3 },
      threat: 'hunted' as const,
      completedInteractions: ['underroot-reward-1', 'underroot-reward-2', 'underroot-reward-3'],
      townDebt: 3,
    };

    const result = applyCommand(state, { type: 'interact' });

    expect(result.state.mode).toBe('combat');
    expect(result.state.combat?.heroes.every((hero) => hero.block === 1)).toBe(true);
    expect(result.state.combat?.heroes.every((hero) => hero.statuses.ward === 1)).toBe(true);
    expect(result.state.combat?.enemy.statuses.mark).toBe(1);
    expect(result.state.log.slice(-3)).toEqual([
      'Warm Shard lights the party: +1 block.',
      'Bone Charm wakes: the party gains Ward 1.',
      'Silver Nest glitters: the enemy starts Marked.',
    ]);
  });

  it('uses the authored M1 starter deck for Underroot fights and keeps S0 on the signature floor', () => {
    const underroot = applyCommand(
      {
        ...createTownState('m2-underroot'),
        mode: 'explore' as const,
        position: { x: 0, y: 3 },
        threat: 'hunted' as const,
      },
      { type: 'interact' },
    );
    let s0State = createSliceState();
    s0State = applyCommand(s0State, { type: 'step-forward' }).state;
    s0State = applyCommand(s0State, { type: 'step-forward' }).state;
    const s0 = applyCommand(s0State, { type: 'interact' });

    expect(underroot.state.combat?.hand).toHaveLength(5);
    expect(underroot.state.combat?.drawPile).toHaveLength(M1_STARTER_CARDS.length - 5);
    expect(new Set(Object.values(underroot.state.combat!.cards).map((card) => card.defId))).toEqual(new Set(M1_STARTER_CARDS.map((card) => card.id)));
    expect(underroot.state.combat!.hand.map((cardId) => cardDefFor(underroot.state.combat!, cardId).id)).not.toEqual(S0_CARDS.map((card) => card.id));
    expect(s0.state.combat?.drawPile).toHaveLength(0);
    expect(s0.state.combat?.hand.map((cardId) => cardDefFor(s0.state.combat!, cardId).id)).toEqual(S0_CARDS.map((card) => card.id));
  });

  it('gives elite and boss Underroot encounters distinct stakes', () => {
    const elite = applyCommand(
      {
        ...createTownState('m2-underroot'),
        mode: 'explore' as const,
        position: { x: 4, y: 2 },
        threat: 'hunted' as const,
      },
      { type: 'interact' },
    );
    const boss = applyCommand(
      {
        ...createTownState('m2-underroot'),
        mode: 'explore' as const,
        position: { x: 1, y: 1 },
        threat: 'hunted' as const,
        completedInteractions: ['underroot-reward-1'],
      },
      { type: 'interact' },
    );

    expect(elite.state.combat?.enemy).toMatchObject({
      id: 'root-knotted-brute',
      name: 'Root-Knotted Brute',
      hp: 32,
      maxHp: 32,
      intent: { type: 'attack', target: 'mia', amount: 8 },
    });
    expect(boss.state.combat?.enemy).toMatchObject({
      id: 'underroot-alpha',
      name: 'Underroot Alpha',
      hp: 42,
      maxHp: 42,
      intent: { type: 'attack', target: 'liese', amount: 10 },
    });
  });

  it('spends Underroot safety on each committed step', () => {
    let state = applyCommand(createTownState('m2-underroot'), { type: 'enter-underroot' }).state;
    expect(state.threatClock).toBe(0);

    state = applyCommand(state, { type: 'step-forward' }).state;
    expect(state.position).toEqual({ x: 1, y: 4 });
    expect(state.threatClock).toBe(1);

    state = applyCommand(state, { type: 'step-forward' }).state;
    expect(state.position).toEqual({ x: 1, y: 3 });
    expect(state.threatClock).toBe(2);

    state = applyCommand({ ...state, facing: 'east' }, { type: 'step-forward' }).state;
    expect(state.position).toEqual({ x: 2, y: 3 });
    expect(state.threatClock).toBe(4);
  });

  it('settles placeholder debt in Marrowgate Sanctuary', () => {
    const state = {
      ...createTownState('m2-underroot'),
      townDebt: 2,
      completedInteractions: ['underroot-reward-1', 'underroot-shortcut-1'],
    };

    const result = applyCommand(state, { type: 'settle-debt' });

    expect(result.state.mode).toBe('town');
    expect(result.state.townService).toBe('sanctuary');
    expect(result.state.townDebt).toBe(0);
    expect(result.state.completedInteractions).toEqual(['underroot-reward-1', 'underroot-shortcut-1']);
    expect(result.state.log.at(-1)).toContain('Sanctuary');
  });

  it('selects placeholder Marrowgate services without changing dive progress', () => {
    const state = {
      ...createTownState('m2-underroot'),
      townDebt: 1,
      completedInteractions: ['underroot-reward-1'],
    };

    const vellum = applyCommand(state, { type: 'choose-town-service', service: 'vellum' });
    expect(vellum.state.townService).toBe('vellum');
    expect(vellum.state.townDebt).toBe(1);
    expect(vellum.state.completedInteractions).toEqual(['underroot-reward-1']);
    expect(vellum.events).toContainEqual({ type: 'TOWN_SERVICE_SELECTED', service: 'vellum' });

    const gate = applyCommand(vellum.state, { type: 'choose-town-service', service: 'gate' });
    expect(gate.state.townService).toBe('gate');
    expect(gate.events).toContainEqual({ type: 'TOWN_SERVICE_SELECTED', service: 'gate' });
  });

  it('returns to Marrowgate after the placeholder boss fight', () => {
    let state = applyCommand(createTownState('m2-underroot'), { type: 'enter-underroot' }).state;
    state = applyCommand({ ...state, position: { x: 1, y: 1 }, threat: 'hunted', completedInteractions: ['underroot-reward-1'] }, { type: 'interact' }).state;
    state = {
      ...state,
      combat: {
        ...state.combat!,
        enemy: { ...state.combat!.enemy, hp: 1 },
      },
    };
    const cardId = state.combat!.hand[0]!;

    const result = applyCommand(state, { type: 'play-card', cardId });

    expect(result.state.mode).toBe('town');
    expect(result.state.combat).toBeNull();
    expect(result.state.completedInteractions).toContain('underroot-boss-1');
    expect(result.state.log.at(-1)).toBe('Marrowgate bells answer: the Underroot Alpha is sealed.');
    expect(result.events).toContainEqual({ type: 'MARROWGATE_RETURNED' });
  });

  it('keeps the boss gate shut until the dive proves a spoil or hunter branch', () => {
    const blocked = applyCommand(
      {
        ...createTownState('m2-underroot'),
        mode: 'explore' as const,
        position: { x: 1, y: 1 },
        threat: 'hunted' as const,
      },
      { type: 'interact' },
    );
    const rewarded = applyCommand(
      {
        ...blocked.state,
        completedInteractions: ['underroot-reward-1'],
      },
      { type: 'interact' },
    );
    const blooded = applyCommand(
      {
        ...blocked.state,
        completedInteractions: ['underroot-normal-1'],
      },
      { type: 'interact' },
    );

    expect(blocked.state.mode).toBe('explore');
    expect(blocked.state.log.at(-1)).toContain('stays shut');
    expect(blocked.events).toEqual([{ type: 'INTERACT_NONE' }]);
    expect(rewarded.state.mode).toBe('combat');
    expect(rewarded.state.combat?.enemy.id).toBe('underroot-alpha');
    expect(blooded.state.mode).toBe('combat');
    expect(blooded.state.combat?.enemy.id).toBe('underroot-alpha');
  });

  it('returns to Underroot exploration after a normal placeholder fight', () => {
    let state = applyCommand(createTownState('m2-underroot'), { type: 'enter-underroot' }).state;
    state = applyCommand({ ...state, position: { x: 0, y: 4 }, threat: 'hunted' }, { type: 'interact' }).state;
    expect(state.mode).toBe('combat');
    expect(state.activeInteractionId).toBe('underroot-normal-1');
    expect(state.combatReturn).toBe('explore');
    state = {
      ...state,
      combat: {
        ...state.combat!,
        enemy: { ...state.combat!.enemy, hp: 1 },
      },
    };
    const cardId = state.combat!.hand[0]!;

    const result = applyCommand(state, { type: 'play-card', cardId });

    expect(result.state.mode).toBe('explore');
    expect(result.state.combat).toBeNull();
    expect(result.state.completedInteractions).toContain('underroot-normal-1');
    expect(result.events).toContainEqual({ type: 'TILE_INTERACTION_COMPLETED', id: 'underroot-normal-1', interaction: 'combat' });
    expect(result.events).not.toContainEqual({ type: 'MARROWGATE_RETURNED' });
  });

  it('returns to Underroot exploration after the elite placeholder fight', () => {
    let state = applyCommand(createTownState('m2-underroot'), { type: 'enter-underroot' }).state;
    state = applyCommand({ ...state, position: { x: 4, y: 2 }, threat: 'hunted' }, { type: 'interact' }).state;
    expect(state.mode).toBe('combat');
    expect(state.activeInteractionId).toBe('underroot-elite-1');
    expect(state.combatReturn).toBe('explore');
    state = {
      ...state,
      combat: {
        ...state.combat!,
        enemy: { ...state.combat!.enemy, hp: 1 },
      },
    };
    const cardId = state.combat!.hand[0]!;

    const result = applyCommand(state, { type: 'play-card', cardId });

    expect(result.state.mode).toBe('explore');
    expect(result.state.completedInteractions).toContain('underroot-elite-1');
    expect(result.events).toContainEqual({ type: 'TILE_INTERACTION_COMPLETED', id: 'underroot-elite-1', interaction: 'combat' });
  });
});

function reachableTileKeys(floor: FloorDef): Set<string> {
  const reachable = new Set<string>();
  const frontier = [floor.start];

  while (frontier.length > 0) {
    const coord = frontier.shift()!;
    const key = tileKey(coord);
    if (reachable.has(key)) continue;
    reachable.add(key);

    for (const next of neighbors(coord)) {
      if (!floor.tiles.some((tile) => tile.walkable && tileKey(tile.coord) === tileKey(next))) continue;
      frontier.push(next);
    }
  }

  return reachable;
}

function neighbors(coord: TileCoord): TileCoord[] {
  return [
    { x: coord.x, y: coord.y - 1 },
    { x: coord.x + 1, y: coord.y },
    { x: coord.x, y: coord.y + 1 },
    { x: coord.x - 1, y: coord.y },
  ];
}

function tileKey(coord: TileCoord): string {
  return `${coord.x},${coord.y}`;
}

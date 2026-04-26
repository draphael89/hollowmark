import type Phaser from 'phaser';
import type { CardId, HeroId, SliceMode, StatusStacks } from '../game/types';
import type { ViewSlotId } from '../systems/viewSlots';

export type DevSceneKey = 'combat-sandbox' | 'dungeon-sandbox' | 'visual-gallery' | 'scenario-lab';

export type CombatSandboxDebug = {
  seed: string;
  hand: readonly CardId[];
  drawPilePreview: readonly CardId[];
  drawPileCount: number;
  discardPileCount: number;
  held: CardId | null;
  enemyHp: number;
  enemyStatuses: string;
  enemyStatusStacks: StatusStacks;
  heroDebt: Readonly<Record<string, number>>;
  heroStatuses: Readonly<Record<string, StatusStacks>>;
  statusLegend: readonly string[];
  lastEvents: readonly string[];
  selectedCard: null | {
    slot: string;
    id: CardId;
    name: string;
    owner: HeroId;
    cost: number;
    target: 'enemy' | 'owner';
    text: string;
  };
};

export type DevSceneDebug = {
  scene: DevSceneKey;
  label: string;
  objectCount: number;
  combatSandbox?: CombatSandboxDebug;
  dungeonSandbox?: {
    floorId: string;
    position: string;
    facing: string;
    currentPurpose: string;
    slots: readonly {
      id: ViewSlotId;
      coord: string;
      walkable: boolean;
      threat: string;
      purpose: string | null;
    }[];
  };
  visualGallery?: {
    assetCount: number;
    selectedId: string;
    selectedKind: string;
    selectedStatus: string;
    selectedReviewFocus: string;
    stableIds: readonly string[];
  };
  scenarioLab?: {
    id: string;
    verdict: 'pass' | 'review' | 'fail';
    kind: 'replay' | 'fixture';
    gatesPassed: number;
    gatesTotal: number;
    gates: readonly {
      label: string;
      passed: boolean;
    }[];
    outcome: SliceMode;
    turns: number;
    cardsPlayed: number;
    energySpent: number;
    energyWasted: number;
    debtGained: number;
    damageTaken: number;
    cardsPlayedByHero: Readonly<Record<HeroId, number>>;
  };
};

declare global {
  interface Window {
    __HOLLOWMARK_DEV_SCENE__?: DevSceneDebug;
  }
}

export function publishDevSceneDebug(scene: Phaser.Scene, key: DevSceneKey, label: string, extra?: Pick<DevSceneDebug, 'combatSandbox' | 'dungeonSandbox' | 'visualGallery' | 'scenarioLab'>): void {
  window.__HOLLOWMARK_DEV_SCENE__ = {
    scene: key,
    label,
    objectCount: scene.children.length,
    ...extra,
  };
}

import Phaser from 'phaser';
import { S0_FLOOR } from '../data/floors/s0';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/layout';
import { THEME } from '../game/theme';
import type { Facing, TileCoord } from '../game/types';
import { turnFacing, vectorForFacing } from '../systems/direction';
import { isFloorWalkable } from '../systems/floor';
import { computeViewSlots } from '../systems/viewSlots';
import { publishDevSceneDebug } from './devSceneDebug';

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;

export class DungeonSandboxScene extends Phaser.Scene {
  private position: TileCoord = S0_FLOOR.start;
  private facing: Facing = S0_FLOOR.startFacing;

  constructor() {
    super('DungeonSandboxScene');
  }

  create(): void {
    this.input.keyboard?.on('keydown-W', () => this.step(1));
    this.input.keyboard?.on('keydown-S', () => this.step(-1));
    this.input.keyboard?.on('keydown-A', () => this.turn('left'));
    this.input.keyboard?.on('keydown-D', () => this.turn('right'));
    this.input.keyboard?.on('keydown-ONE', () => this.setPose(S0_FLOOR.start, S0_FLOOR.startFacing));
    this.input.keyboard?.on('keydown-TWO', () => this.setPose({ x: 1, y: 2 }, 'north'));
    this.input.keyboard?.on('keydown-THREE', () => this.setPose({ x: 1, y: 1 }, 'east'));
    this.input.keyboard?.on('keydown-FOUR', () => this.setPose({ x: 2, y: 1 }, 'west'));
    this.draw();
  }

  private step(sign: 1 | -1): void {
    const vector = vectorForFacing(this.facing);
    const next = { x: this.position.x + vector.x * sign, y: this.position.y + vector.y * sign };
    if (isFloorWalkable(S0_FLOOR, next)) this.position = next;
    this.draw();
  }

  private turn(direction: 'left' | 'right'): void {
    this.facing = turnFacing(this.facing, direction);
    this.draw();
  }

  private setPose(position: TileCoord, facing: Facing): void {
    this.position = position;
    this.facing = facing;
    this.draw();
  }

  private draw(): void {
    this.children.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);
    this.label('Dungeon Sandbox', 32, 28, text.gold);
    this.label(`Facing ${this.facing.toUpperCase()}  ${this.position.x},${this.position.y}`, 32, 48, text.cyan);
    this.label('W/S step  A/D turn  1-4 review poses', 278, 48, text.mutedBone);

    S0_FLOOR.tiles.forEach((tile) => {
      const x = 82 + tile.coord.x * 34;
      const y = 120 + tile.coord.y * 28;
      const active = tile.coord.x === this.position.x && tile.coord.y === this.position.y;
      g.fillStyle(active ? colors.gold : colors.stoneLight, 1).fillRect(x, y, 24, 18);
    });

    S0_FLOOR.tiles.forEach((tile, index) => {
      const y = 148 + index * 24;
      const active = tile.coord.x === this.position.x && tile.coord.y === this.position.y;
      g.fillStyle(active ? colors.gold : colors.stoneLight, 1).fillRect(116, y, 24, 18);
      this.label(tile.purpose, 150, y + 2, active ? text.gold : text.mutedBone);
    });

    const slots = computeViewSlots(S0_FLOOR, this.position, this.facing);
    slots.forEach((slot, index) => {
      const y = 96 + index * 32;
      const color = slot.walkable ? text.bone : text.red;
      this.label(`${slot.id}: ${coordLabel(slot.coord)} ${slot.threat}`, 348, y, color);
      this.label(slot.tile?.purpose ?? 'wall', 492, y, slot.tile ? text.mutedBone : text.red);
    });
    const current = slots[0];
    publishDevSceneDebug(this, 'dungeon-sandbox', `${coordLabel(this.position)}:${this.facing}`, {
      dungeonSandbox: {
        floorId: S0_FLOOR.id,
        position: coordLabel(this.position),
        facing: this.facing,
        currentPurpose: current?.tile?.purpose ?? 'wall',
        slots: slots.map((slot) => ({
          id: slot.id,
          coord: coordLabel(slot.coord),
          walkable: slot.walkable,
          threat: slot.threat,
          purpose: slot.tile?.purpose ?? null,
        })),
      },
    });
  }

  private label(value: string, x: number, y: number, color: string): void {
    this.add.text(x, y, value, { ...textStyle, color });
  }
}

function coordLabel(coord: TileCoord): string {
  return `${coord.x},${coord.y}`;
}

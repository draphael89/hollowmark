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

  private draw(): void {
    this.children.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);
    this.label('Dungeon Sandbox', 32, 28, text.gold);
    this.label(`Facing ${this.facing.toUpperCase()}  ${this.position.x},${this.position.y}`, 32, 48, text.cyan);

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
      this.label(`${slot.id}: ${slot.coord.x},${slot.coord.y} ${slot.threat}`, 348, y, color);
    });
    publishDevSceneDebug(this, 'dungeon-sandbox', `${this.position.x},${this.position.y}:${this.facing}`);
  }

  private label(value: string, x: number, y: number, color: string): void {
    this.add.text(x, y, value, { ...textStyle, color });
  }
}

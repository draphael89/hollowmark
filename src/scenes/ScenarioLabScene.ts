import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/layout';
import { THEME } from '../game/theme';
import { runAllScenarios, type ScenarioReport } from '../systems/scenarios';
import { publishDevSceneDebug } from './devSceneDebug';

const colors = THEME.color;
const text = THEME.text;
const textStyle = THEME.textStyle;
const keys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'] as const;

export class ScenarioLabScene extends Phaser.Scene {
  private reports: readonly ScenarioReport[] = [];
  private selected = 0;

  constructor() {
    super('ScenarioLabScene');
  }

  create(): void {
    this.reports = runAllScenarios();
    keys.forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => {
        if (this.reports[index]) {
          this.selected = index;
          this.draw();
        }
      });
    });
    this.draw();
  }

  private draw(): void {
    this.children.removeAll(true);
    const report = this.reports[this.selected]!;
    const metrics = report.metrics;
    const passedGates = report.verdict.gates.filter((gate) => gate.passed).length;
    const g = this.add.graphics();
    g.fillStyle(colors.void, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colors.panel, 1).fillRect(16, 16, 608, 328);
    g.lineStyle(2, colors.oxblood, 1).strokeRect(16, 16, 608, 328);

    this.label('Scenario Lab', 32, 28, text.gold);
    this.label('1-0 select', 512, 28, text.mutedBone);

    this.reports.forEach((item, index) => {
      const y = 54 + index * 25;
      const active = index === this.selected;
      g.fillStyle(active ? colors.oxblood : colors.panelDeep, active ? 0.9 : 1).fillRect(32, y, 250, 20);
      g.lineStyle(1, active ? colors.gold : colors.stoneLight, 1).strokeRect(32, y, 250, 20);
      this.label(`${keyLabel(index)} ${item.name}`, 42, y + 4, active ? text.gold : text.bone);
    });

    g.fillStyle(colors.panelDeep, 1).fillRect(304, 58, 286, 250);
    g.lineStyle(1, colors.stoneLight, 1).strokeRect(304, 58, 286, 250);
    this.label(report.name, 320, 74, text.gold);
    this.label(`Seed ${report.seed}`, 320, 94, text.mutedBone);
    this.label(`Gate ${report.verdict.status.toUpperCase()} ${passedGates}/${report.verdict.gates.length} ${report.verdict.kind}`, 320, 116, verdictColor(report.verdict.status));
    this.label(`Outcome ${metrics.outcome}   Turns ${metrics.turns}`, 320, 138, outcomeColor(metrics.outcome));
    this.label(`Commands ${metrics.commands}: ${commandTrace(report.commands)}`, 320, 158, text.bone);
    this.label(`Cards play/hold/draw ${metrics.cardsPlayed}/${metrics.cardsHeld}/${metrics.cardsDrawn}`, 320, 178, text.bone);
    this.label(`Energy spent/wasted ${metrics.energySpent}/${metrics.energyWasted}`, 320, 198, text.bone);
    this.label(`Debt +${metrics.debtGained}   Damage taken ${metrics.damageTaken}`, 320, 218, metrics.debtGained > 0 ? text.gold : text.bone);
    this.label(`No-choice ${metrics.noChoiceTurns}   Near-death ${metrics.nearDeathTurns}`, 320, 238, text.bone);
    this.label(heroLine(report), 320, 258, text.mutedBone);
    this.label(gateLine(report), 320, 282, report.verdict.status === 'pass' ? text.cyan : text.gold);

    publishDevSceneDebug(this, 'scenario-lab', report.id, {
      scenarioLab: {
        id: report.id,
        verdict: report.verdict.status,
        kind: report.verdict.kind,
        gatesPassed: passedGates,
        gatesTotal: report.verdict.gates.length,
        gates: report.verdict.gates,
        outcome: metrics.outcome,
        turns: metrics.turns,
        cardsPlayed: metrics.cardsPlayed,
        energySpent: metrics.energySpent,
        energyWasted: metrics.energyWasted,
        debtGained: metrics.debtGained,
        damageTaken: metrics.damageTaken,
        cardsPlayedByHero: metrics.cardsPlayedByHero,
      },
    });
  }

  private label(value: string, x: number, y: number, color: string): void {
    this.add.text(x, y, value, { ...textStyle, color });
  }
}

function outcomeColor(outcome: ScenarioReport['metrics']['outcome']): string {
  if (outcome === 'victory') return text.cyan;
  if (outcome === 'defeat') return text.red;
  return text.bone;
}

function verdictColor(verdict: ScenarioReport['verdict']['status']): string {
  if (verdict === 'pass') return text.cyan;
  if (verdict === 'fail') return text.red;
  return text.gold;
}

function heroLine(report: ScenarioReport): string {
  const played = report.metrics.cardsPlayedByHero;
  return `By hero L${played.liese} E${played.eris} M${played.mia} R${played.robin}`;
}

function commandTrace(commands: readonly string[]): string {
  return commands.slice(0, 3).map(shortCommand).join(' > ');
}

function shortCommand(command: string): string {
  if (command.startsWith('play-card:')) return command.replace('play-card:', '');
  if (command.startsWith('hold-card:')) return 'hold';
  if (command.startsWith('set-enemy-hp:')) return 'set hp';
  return command;
}

function gateLine(report: ScenarioReport): string {
  const gate = report.verdict.gates.find((candidate) => !candidate.passed) ?? report.verdict.gates.at(-1);
  return gate ? `${gate.passed ? 'OK' : 'Check'} ${gate.label}` : 'No gates';
}

function keyLabel(index: number): string {
  return index === 9 ? '0' : String(index + 1);
}

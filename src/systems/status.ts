import type { StatusId, StatusStacks } from '../game/types';

export const STATUS_IDS = ['poison', 'bleed', 'weak', 'vulnerable', 'mark', 'ward'] as const satisfies readonly StatusId[];

export function emptyStatusStacks(): StatusStacks {
  return {
    poison: 0,
    bleed: 0,
    weak: 0,
    vulnerable: 0,
    mark: 0,
    ward: 0,
  };
}

export function isStatusId(value: string): value is StatusId {
  return STATUS_IDS.includes(value as StatusId);
}

export function statusAmount(statuses: StatusStacks, status: StatusId): number {
  return statuses[status];
}

export function hasStatus(statuses: StatusStacks, status: StatusId): boolean {
  return statusAmount(statuses, status) > 0;
}

export function addStatus(statuses: StatusStacks, status: StatusId, amount = 1): StatusStacks {
  assertPositiveInteger(amount, 'Status amount');
  return {
    ...statuses,
    [status]: statuses[status] + amount,
  };
}

export function consumeStatus(statuses: StatusStacks, status: StatusId): StatusStacks {
  if (!hasStatus(statuses, status)) return statuses;
  return {
    ...statuses,
    [status]: 0,
  };
}

export function spendStatus(statuses: StatusStacks, status: StatusId, amount = 1): StatusStacks {
  assertPositiveInteger(amount, 'Status spend');
  if (!hasStatus(statuses, status)) return statuses;
  return {
    ...statuses,
    [status]: Math.max(0, statuses[status] - amount),
  };
}

export function statusSummary(statuses: StatusStacks): string {
  const labels = STATUS_IDS
    .filter((status) => statuses[status] > 0)
    .map((status) => `${statusCode(status)}${statuses[status]}`);
  return labels.join(' ');
}

export function statusName(status: StatusId): string {
  if (status === 'poison') return 'Poison';
  if (status === 'bleed') return 'Bleed';
  if (status === 'weak') return 'Weak';
  if (status === 'vulnerable') return 'Vulnerable';
  if (status === 'mark') return 'Mark';
  return 'Ward';
}

export function statusRule(status: StatusId): string {
  if (status === 'poison') return 'Poison ticks before action';
  if (status === 'bleed') return 'Bleed opens on HP hits';
  if (status === 'weak') return 'Weak softens next hit';
  if (status === 'vulnerable') return 'Vulnerable amplifies next hit';
  if (status === 'mark') return 'Mark adds burst damage';
  return 'Ward prevents one hit';
}

export function statusLegend(): readonly string[] {
  return STATUS_IDS.map((status) => `${statusName(status)}: ${statusRule(status)}`);
}

function statusCode(status: StatusId): string {
  if (status === 'poison') return 'Po';
  if (status === 'bleed') return 'Bl';
  if (status === 'weak') return 'We';
  if (status === 'vulnerable') return 'Vu';
  if (status === 'mark') return 'Mk';
  return 'Wd';
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
}

export type AssetManifestEntry = Readonly<{
  id: string;
  kind: 'background' | 'sprite' | 'card-art' | 'ui';
  status: 'placeholder';
  title: string;
}>;

export const PLACEHOLDER_ASSETS: readonly AssetManifestEntry[] = [
  { id: 'underroot.corridor.placeholder', kind: 'background', status: 'placeholder', title: 'Underroot Corridor' },
  { id: 'enemy.root-wolf.placeholder', kind: 'sprite', status: 'placeholder', title: 'Rootbitten Wolf' },
  { id: 'card.blood-edge.placeholder', kind: 'card-art', status: 'placeholder', title: 'Blood Edge' },
  { id: 'ui.debt-mark.placeholder', kind: 'ui', status: 'placeholder', title: 'Debt Mark' },
];

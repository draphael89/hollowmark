export type AssetManifestEntry = Readonly<{
  id: string;
  kind: 'background' | 'sprite' | 'card-art' | 'ui';
  status: 'placeholder';
  title: string;
  reviewFocus: string;
}>;

export const PLACEHOLDER_ASSETS: readonly AssetManifestEntry[] = [
  {
    id: 'underroot.corridor.placeholder',
    kind: 'background',
    status: 'placeholder',
    title: 'Underroot Corridor',
    reviewFocus: 'depth, tile read, no text',
  },
  {
    id: 'enemy.root-wolf.placeholder',
    kind: 'sprite',
    status: 'placeholder',
    title: 'Rootbitten Wolf',
    reviewFocus: 'silhouette, intent read, hit flash',
  },
  {
    id: 'card.blood-edge.placeholder',
    kind: 'card-art',
    status: 'placeholder',
    title: 'Blood Edge',
    reviewFocus: 'temptation, danger, crop safety',
  },
  {
    id: 'ui.debt-mark.placeholder',
    kind: 'ui',
    status: 'placeholder',
    title: 'Debt Mark',
    reviewFocus: 'small-size read, palette restraint',
  },
];

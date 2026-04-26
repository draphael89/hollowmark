export type AssetManifestEntry = Readonly<{
  id: string;
  kind: 'background' | 'sprite' | 'card-art' | 'ui';
  status: 'processed';
  title: string;
  reviewFocus: string;
  previewPath: string;
}>;

export const PLACEHOLDER_ASSETS: readonly AssetManifestEntry[] = [
  {
    id: 'underroot.corridor.placeholder',
    kind: 'background',
    status: 'processed',
    title: 'Underroot Corridor',
    reviewFocus: 'depth, tile read, no text',
    previewPath: '/assets/drafts/underroot/batch-01/underroot-corridor-preview-01.png',
  },
  {
    id: 'underroot.combat.placeholder',
    kind: 'background',
    status: 'processed',
    title: 'Underroot Combat',
    reviewFocus: 'enemy contrast, floor contact, no text',
    previewPath: '/assets/drafts/underroot/batch-01/underroot-combat-preview-01.png',
  },
  {
    id: 'enemy.root-wolf.placeholder',
    kind: 'sprite',
    status: 'processed',
    title: 'Rootbitten Wolf',
    reviewFocus: 'silhouette, intent read, hit flash',
    previewPath: '/assets/drafts/underroot/batch-01/rootbitten-wolf-preview-01.png',
  },
  {
    id: 'card.blood-edge.placeholder',
    kind: 'card-art',
    status: 'processed',
    title: 'Blood Edge',
    reviewFocus: 'temptation, danger, crop safety',
    previewPath: '/assets/drafts/underroot/batch-01/blood-edge-preview-01.png',
  },
  {
    id: 'ui.ornaments.placeholder',
    kind: 'ui',
    status: 'processed',
    title: 'UI Ornaments',
    reviewFocus: 'panel corners, status frames, palette restraint',
    previewPath: '/assets/drafts/underroot/batch-01/ui-ornaments-preview-01.png',
  },
];

export const ASSET_MANIFEST_KEY = 'asset-manifest';
export const ASSET_MANIFEST_URL = '/assets/manifest.json';

export type AssetKind = 'background' | 'sprite' | 'card-art' | 'ui';
export type AssetStatus = 'placeholder' | 'raw_generated' | 'candidate' | 'processed' | 'in_game_previewed' | 'approved' | 'manifested';

export type AssetManifestEntry = Readonly<{
  id: string;
  kind: AssetKind;
  status: AssetStatus;
  title: string;
  reviewFocus: string;
  previewPath: string;
}>;

type AssetPassport = Readonly<{
  id: string;
  kind: AssetKind;
  title: string;
  reviewFocus: string;
  approvalState: AssetStatus;
  processedPath: string | null;
}>;

type PublicAssetManifest = Readonly<{
  version: number;
  assets: readonly AssetPassport[];
}>;

export function galleryAssetsFromManifest(value: unknown): readonly AssetManifestEntry[] {
  const manifest = value as PublicAssetManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.assets)) {
    throw new Error('Asset manifest must be version 1 with an assets array.');
  }
  return manifest.assets.map((asset) => ({
    id: asset.id,
    kind: asset.kind,
    status: asset.approvalState,
    title: asset.title,
    reviewFocus: asset.reviewFocus,
    previewPath: previewPathFor(asset),
  }));
}

function previewPathFor(asset: AssetPassport): string {
  if (!asset.processedPath) throw new Error(`${asset.id} is missing processedPath for gallery preview.`);
  if (!asset.processedPath.startsWith('public/')) throw new Error(`${asset.id} processedPath must be public for gallery preview.`);
  return asset.processedPath.slice('public'.length);
}

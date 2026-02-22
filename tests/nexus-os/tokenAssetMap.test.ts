import { describe, expect, it } from 'vitest';
import {
  getNumberTokenAssetUrl,
  getNumberTokenVariantByState,
  getTokenAssetUrl,
  tokenCatalog,
} from '../../src/components/nexus-os/ui/tokens/tokenAssetMap';

describe('tokenAssetMap', () => {
  it('supports numbered purple variants and keeps canonical fallback compatibility', () => {
    expect(getNumberTokenAssetUrl(4, 'purple')).toContain('token-number-4-purple.png');
    expect(getNumberTokenAssetUrl(4, 'purple', { variant: 'v1' })).toContain('token-number-4-purple-1.png');
    expect(getNumberTokenAssetUrl(4, 'purple', { variant: 'v2' })).toContain('token-number-4-purple-2.png');

    // Non-number families ignore variants and resolve canonical filenames.
    expect(getTokenAssetUrl('hex', 'orange', { variant: 'v2' })).toContain('token-hex-orange.png');
  });

  it('resolves deterministic state-based numbered variants', () => {
    expect(getNumberTokenVariantByState('secure channel')).toBe('v1');
    expect(getNumberTokenVariantByState('critical jam')).toBe('v2');
    expect(getNumberTokenVariantByState('ready')).toBe('base');
  });

  it('catalog maps all token filenames, including purple numbered variants', () => {
    expect(tokenCatalog.fileNames.length).toBe(232);
    expect(new Set(tokenCatalog.fileNames).size).toBe(tokenCatalog.fileNames.length);
    expect(tokenCatalog.fileNames).toContain('token-number-0-purple-1.png');
    expect(tokenCatalog.fileNames).toContain('token-number-13-purple-2.png');
  });
});

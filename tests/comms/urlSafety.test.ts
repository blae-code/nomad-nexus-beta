import { describe, expect, it } from 'vitest';
import {
  isLikelyAudioUrl,
  isLikelyImageUrl,
  safeFileNameFromUrl,
  sanitizeAttachmentUrl,
  sanitizeExternalUrl,
} from '../../src/components/comms/urlSafety';

describe('comms url safety', () => {
  it('allows public http(s) links and blocks unsafe/private links', () => {
    expect(sanitizeExternalUrl('https://example.com/report')).toBe('https://example.com/report');
    expect(sanitizeExternalUrl('http://localhost:3000/test')).toBeNull();
    expect(sanitizeExternalUrl('http://127.0.0.1/test')).toBeNull();
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull();
  });

  it('sanitizes attachment urls and detects media types', () => {
    expect(sanitizeAttachmentUrl('blob:http://example.com/id-1')).toContain('blob:');
    expect(sanitizeAttachmentUrl('blob:http://example.com/id-1', { allowBlob: false })).toBeNull();
    expect(isLikelyImageUrl('https://cdn.example.com/files/map.png')).toBe(true);
    expect(isLikelyAudioUrl('https://cdn.example.com/files/net-call.m4a')).toBe(true);
    expect(isLikelyAudioUrl('https://cdn.example.com/files/net-call.txt')).toBe(false);
  });

  it('returns a safe fallback file label', () => {
    expect(safeFileNameFromUrl('https://cdn.example.com/files/ops%20brief.pdf')).toBe('ops_20brief.pdf');
    expect(safeFileNameFromUrl('javascript:alert(1)')).toBe('attachment');
  });
});


import { describe, it, expect } from 'vitest';
import { canShareFiles } from '@/qr/qrExport';

describe('qrExport', () => {
  it('canShareFiles returns boolean in node environment', () => {
    // In node/jsdom environment navigator may not have share
    const result = canShareFiles();
    expect(typeof result).toBe('boolean');
  });
});

/**
 * Snapshot command tests
 *
 * Tests: accessibility tree snapshots, ref-based element selection,
 * ref invalidation on navigation, and ref resolution in commands.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from './test-server';
import { BrowserManager } from '../src/browser-manager';
import { handleReadCommand } from '../src/read-commands';
import { handleWriteCommand } from '../src/write-commands';
import { handleMetaCommand } from '../src/meta-commands';

let testServer: ReturnType<typeof startTestServer>;
let bm: BrowserManager;
let baseUrl: string;
const shutdown = async () => {};

beforeAll(async () => {
  testServer = startTestServer(0);
  baseUrl = testServer.url;

  bm = new BrowserManager();
  await bm.launch();
});

afterAll(() => {
  try { testServer.server.stop(); } catch {}
  setTimeout(() => process.exit(0), 500);
});

// ─── Snapshot Output ────────────────────────────────────────────

describe('Snapshot', () => {
  test('snapshot returns accessibility tree with refs', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', [], bm, shutdown);
    expect(result).toContain('@e');
    expect(result).toContain('[heading]');
    expect(result).toContain('"Snapshot Test"');
    expect(result).toContain('[button]');
    expect(result).toContain('[link]');
  });

  test('snapshot -i returns only interactive elements', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    expect(result).toContain('[button]');
    expect(result).toContain('[link]');
    expect(result).toContain('[textbox]');
    // Should NOT contain non-interactive roles like heading or paragraph
    expect(result).not.toContain('[heading]');
  });

  test('snapshot -c returns compact output', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const full = await handleMetaCommand('snapshot', [], bm, shutdown);
    const compact = await handleMetaCommand('snapshot', ['-c'], bm, shutdown);
    // Compact should have fewer lines (empty structural elements removed)
    const fullLines = full.split('\n').length;
    const compactLines = compact.split('\n').length;
    expect(compactLines).toBeLessThanOrEqual(fullLines);
  });

  test('snapshot -d 2 limits depth', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const shallow = await handleMetaCommand('snapshot', ['-d', '2'], bm, shutdown);
    const deep = await handleMetaCommand('snapshot', [], bm, shutdown);
    // Shallow should have fewer or equal lines
    expect(shallow.split('\n').length).toBeLessThanOrEqual(deep.split('\n').length);
  });

  test('snapshot -s "#main" scopes to selector', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const scoped = await handleMetaCommand('snapshot', ['-s', '#main'], bm, shutdown);
    // Should contain elements inside #main
    expect(scoped).toContain('[button]');
    expect(scoped).toContain('"Submit"');
    // Should NOT contain elements outside #main (like nav links)
    expect(scoped).not.toContain('"Internal Link"');
  });

  test('snapshot on page with no interactive elements', async () => {
    // Navigate to about:blank which has minimal content
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    const result = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    // basic.html has links, so this should find those
    expect(result).toContain('[link]');
  });

  test('second snapshot generates fresh refs', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap1 = await handleMetaCommand('snapshot', [], bm, shutdown);
    const snap2 = await handleMetaCommand('snapshot', [], bm, shutdown);
    // Both should have @e1 (refs restart from 1)
    expect(snap1).toContain('@e1');
    expect(snap2).toContain('@e1');
  });
});

// ─── Ref-Based Interaction ──────────────────────────────────────

describe('Ref resolution', () => {
  test('click @ref works after snapshot', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    // Find a button ref
    const buttonLine = snap.split('\n').find(l => l.includes('[button]') && l.includes('"Submit"'));
    expect(buttonLine).toBeDefined();
    const refMatch = buttonLine!.match(/@(e\d+)/);
    expect(refMatch).toBeDefined();
    const ref = `@${refMatch![1]}`;
    const result = await handleWriteCommand('click', [ref], bm);
    expect(result).toContain('Clicked');
  });

  test('fill @ref works after snapshot', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    // Find a textbox ref (Username)
    const textboxLine = snap.split('\n').find(l => l.includes('[textbox]') && l.includes('"Username"'));
    expect(textboxLine).toBeDefined();
    const refMatch = textboxLine!.match(/@(e\d+)/);
    expect(refMatch).toBeDefined();
    const ref = `@${refMatch![1]}`;
    const result = await handleWriteCommand('fill', [ref, 'testuser'], bm);
    expect(result).toContain('Filled');
  });

  test('hover @ref works after snapshot', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const linkLine = snap.split('\n').find(l => l.includes('[link]'));
    expect(linkLine).toBeDefined();
    const refMatch = linkLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleWriteCommand('hover', [ref], bm);
    expect(result).toContain('Hovered');
  });

  test('html @ref returns innerHTML', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', [], bm, shutdown);
    // Find a heading ref
    const headingLine = snap.split('\n').find(l => l.includes('[heading]') && l.includes('"Snapshot Test"'));
    expect(headingLine).toBeDefined();
    const refMatch = headingLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleReadCommand('html', [ref], bm);
    expect(result).toContain('Snapshot Test');
  });

  test('css @ref returns computed CSS', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', [], bm, shutdown);
    const headingLine = snap.split('\n').find(l => l.includes('[heading]') && l.includes('"Snapshot Test"'));
    const refMatch = headingLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleReadCommand('css', [ref, 'font-family'], bm);
    expect(result).toBeTruthy();
  });

  test('attrs @ref returns element attributes', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    const snap = await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    const textboxLine = snap.split('\n').find(l => l.includes('[textbox]') && l.includes('"Username"'));
    const refMatch = textboxLine!.match(/@(e\d+)/);
    const ref = `@${refMatch![1]}`;
    const result = await handleReadCommand('attrs', [ref], bm);
    expect(result).toContain('id');
  });
});

// ─── Ref Invalidation ───────────────────────────────────────────

describe('Ref invalidation', () => {
  test('stale ref after goto returns clear error', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    // Navigate away — should invalidate refs
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    // Try to use old ref
    try {
      await handleWriteCommand('click', ['@e1'], bm);
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err.message).toContain('not found');
      expect(err.message).toContain('snapshot');
    }
  });

  test('refs cleared on page navigation', async () => {
    await handleWriteCommand('goto', [baseUrl + '/snapshot.html'], bm);
    await handleMetaCommand('snapshot', ['-i'], bm, shutdown);
    expect(bm.getRefCount()).toBeGreaterThan(0);
    // Navigate
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    expect(bm.getRefCount()).toBe(0);
  });
});

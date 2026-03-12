/**
 * Integration tests for all browse commands
 *
 * Tests run against a local test server serving fixture HTML files.
 * A real browse server is started and commands are sent via the CLI HTTP interface.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from './test-server';
import { BrowserManager } from '../src/browser-manager';
import { resolveServerScript } from '../src/cli';
import { handleReadCommand } from '../src/read-commands';
import { handleWriteCommand } from '../src/write-commands';
import { handleMetaCommand } from '../src/meta-commands';
import { consoleBuffer, networkBuffer, addConsoleEntry, addNetworkEntry, consoleTotalAdded, networkTotalAdded } from '../src/buffers';
import * as fs from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

let testServer: ReturnType<typeof startTestServer>;
let bm: BrowserManager;
let baseUrl: string;

beforeAll(async () => {
  testServer = startTestServer(0);
  baseUrl = testServer.url;

  bm = new BrowserManager();
  await bm.launch();
});

afterAll(() => {
  // Force kill browser instead of graceful close (avoids hang)
  try { testServer.server.stop(); } catch {}
  // bm.close() can hang — just let process exit handle it
  setTimeout(() => process.exit(0), 500);
});

// ─── Navigation ─────────────────────────────────────────────────

describe('Navigation', () => {
  test('goto navigates to URL', async () => {
    const result = await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    expect(result).toContain('Navigated to');
    expect(result).toContain('200');
  });

  test('url returns current URL', async () => {
    const result = await handleMetaCommand('url', [], bm, async () => {});
    expect(result).toContain('/basic.html');
  });

  test('back goes back', async () => {
    await handleWriteCommand('goto', [baseUrl + '/forms.html'], bm);
    const result = await handleWriteCommand('back', [], bm);
    expect(result).toContain('Back');
  });

  test('forward goes forward', async () => {
    const result = await handleWriteCommand('forward', [], bm);
    expect(result).toContain('Forward');
  });

  test('reload reloads page', async () => {
    const result = await handleWriteCommand('reload', [], bm);
    expect(result).toContain('Reloaded');
  });
});

// ─── Content Extraction ─────────────────────────────────────────

describe('Content extraction', () => {
  beforeAll(async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
  });

  test('text returns cleaned page text', async () => {
    const result = await handleReadCommand('text', [], bm);
    expect(result).toContain('Hello World');
    expect(result).toContain('Item one');
    expect(result).not.toContain('<h1>');
  });

  test('html returns full page HTML', async () => {
    const result = await handleReadCommand('html', [], bm);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<h1 id="title">Hello World</h1>');
  });

  test('html with selector returns element innerHTML', async () => {
    const result = await handleReadCommand('html', ['#content'], bm);
    expect(result).toContain('Some body text here.');
    expect(result).toContain('<li>Item one</li>');
  });

  test('links returns all links', async () => {
    const result = await handleReadCommand('links', [], bm);
    expect(result).toContain('Page 1');
    expect(result).toContain('Page 2');
    expect(result).toContain('External');
    expect(result).toContain('→');
  });

  test('forms discovers form fields', async () => {
    await handleWriteCommand('goto', [baseUrl + '/forms.html'], bm);
    const result = await handleReadCommand('forms', [], bm);
    const forms = JSON.parse(result);
    expect(forms.length).toBe(2);
    expect(forms[0].id).toBe('login-form');
    expect(forms[0].method).toBe('post');
    expect(forms[0].fields.length).toBeGreaterThanOrEqual(2);
    expect(forms[1].id).toBe('profile-form');

    // Check field discovery
    const emailField = forms[0].fields.find((f: any) => f.name === 'email');
    expect(emailField).toBeDefined();
    expect(emailField.type).toBe('email');
    expect(emailField.required).toBe(true);
  });

  test('accessibility returns ARIA tree', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    const result = await handleReadCommand('accessibility', [], bm);
    expect(result).toContain('Hello World');
  });
});

// ─── JavaScript / CSS / Attrs ───────────────────────────────────

describe('Inspection', () => {
  beforeAll(async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
  });

  test('js evaluates expression', async () => {
    const result = await handleReadCommand('js', ['document.title'], bm);
    expect(result).toBe('Test Page - Basic');
  });

  test('js returns objects as JSON', async () => {
    const result = await handleReadCommand('js', ['({a: 1, b: 2})'], bm);
    const obj = JSON.parse(result);
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
  });

  test('css returns computed property', async () => {
    const result = await handleReadCommand('css', ['h1', 'color'], bm);
    // Navy color
    expect(result).toContain('0, 0, 128');
  });

  test('css returns font-family', async () => {
    const result = await handleReadCommand('css', ['body', 'font-family'], bm);
    expect(result).toContain('Helvetica');
  });

  test('attrs returns element attributes', async () => {
    const result = await handleReadCommand('attrs', ['#content'], bm);
    const attrs = JSON.parse(result);
    expect(attrs.id).toBe('content');
    expect(attrs['data-testid']).toBe('main-content');
    expect(attrs['data-version']).toBe('1.0');
  });
});

// ─── Interaction ────────────────────────────────────────────────

describe('Interaction', () => {
  test('fill + click works on form', async () => {
    await handleWriteCommand('goto', [baseUrl + '/forms.html'], bm);

    let result = await handleWriteCommand('fill', ['#email', 'test@example.com'], bm);
    expect(result).toContain('Filled');

    result = await handleWriteCommand('fill', ['#password', 'secret123'], bm);
    expect(result).toContain('Filled');

    // Verify values were set
    const emailVal = await handleReadCommand('js', ['document.querySelector("#email").value'], bm);
    expect(emailVal).toBe('test@example.com');

    result = await handleWriteCommand('click', ['#login-btn'], bm);
    expect(result).toContain('Clicked');
  });

  test('select works on dropdown', async () => {
    await handleWriteCommand('goto', [baseUrl + '/forms.html'], bm);
    const result = await handleWriteCommand('select', ['#role', 'admin'], bm);
    expect(result).toContain('Selected');

    const val = await handleReadCommand('js', ['document.querySelector("#role").value'], bm);
    expect(val).toBe('admin');
  });

  test('hover works', async () => {
    const result = await handleWriteCommand('hover', ['h1'], bm);
    expect(result).toContain('Hovered');
  });

  test('wait finds existing element', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    const result = await handleWriteCommand('wait', ['#title'], bm);
    expect(result).toContain('appeared');
  });

  test('scroll works', async () => {
    const result = await handleWriteCommand('scroll', ['footer'], bm);
    expect(result).toContain('Scrolled');
  });

  test('viewport changes size', async () => {
    const result = await handleWriteCommand('viewport', ['375x812'], bm);
    expect(result).toContain('Viewport set');

    const size = await handleReadCommand('js', ['`${window.innerWidth}x${window.innerHeight}`'], bm);
    expect(size).toBe('375x812');

    // Reset
    await handleWriteCommand('viewport', ['1280x720'], bm);
  });

  test('type and press work', async () => {
    await handleWriteCommand('goto', [baseUrl + '/forms.html'], bm);
    await handleWriteCommand('click', ['#name'], bm);

    const result = await handleWriteCommand('type', ['John Doe'], bm);
    expect(result).toContain('Typed');

    const val = await handleReadCommand('js', ['document.querySelector("#name").value'], bm);
    expect(val).toBe('John Doe');
  });
});

// ─── SPA / Console / Network ───────────────────────────────────

describe('SPA and buffers', () => {
  test('wait handles delayed rendering', async () => {
    await handleWriteCommand('goto', [baseUrl + '/spa.html'], bm);
    const result = await handleWriteCommand('wait', ['.loaded'], bm);
    expect(result).toContain('appeared');

    const text = await handleReadCommand('text', [], bm);
    expect(text).toContain('SPA Content Loaded');
  });

  test('console captures messages', async () => {
    const result = await handleReadCommand('console', [], bm);
    expect(result).toContain('[SPA] Starting render');
    expect(result).toContain('[SPA] Render complete');
  });

  test('console --clear clears buffer', async () => {
    const result = await handleReadCommand('console', ['--clear'], bm);
    expect(result).toContain('cleared');

    const after = await handleReadCommand('console', [], bm);
    expect(after).toContain('no console messages');
  });

  test('network captures requests', async () => {
    const result = await handleReadCommand('network', [], bm);
    expect(result).toContain('GET');
    expect(result).toContain('/spa.html');
  });

  test('network --clear clears buffer', async () => {
    const result = await handleReadCommand('network', ['--clear'], bm);
    expect(result).toContain('cleared');
  });
});

// ─── Cookies / Storage ──────────────────────────────────────────

describe('Cookies and storage', () => {
  test('cookies returns array', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    const result = await handleReadCommand('cookies', [], bm);
    // Test server doesn't set cookies, so empty array
    expect(result).toBe('[]');
  });

  test('storage set and get works', async () => {
    await handleReadCommand('storage', ['set', 'testKey', 'testValue'], bm);
    const result = await handleReadCommand('storage', [], bm);
    const storage = JSON.parse(result);
    expect(storage.localStorage.testKey).toBe('testValue');
  });
});

// ─── Performance ────────────────────────────────────────────────

describe('Performance', () => {
  test('perf returns timing data', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    const result = await handleReadCommand('perf', [], bm);
    expect(result).toContain('dns');
    expect(result).toContain('ttfb');
    expect(result).toContain('load');
    expect(result).toContain('ms');
  });
});

// ─── Visual ─────────────────────────────────────────────────────

describe('Visual', () => {
  test('screenshot saves file', async () => {
    await handleWriteCommand('goto', [baseUrl + '/basic.html'], bm);
    const screenshotPath = '/tmp/browse-test-screenshot.png';
    const result = await handleMetaCommand('screenshot', [screenshotPath], bm, async () => {});
    expect(result).toContain('Screenshot saved');
    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(1000);
    fs.unlinkSync(screenshotPath);
  });

  test('responsive saves 3 screenshots', async () => {
    await handleWriteCommand('goto', [baseUrl + '/responsive.html'], bm);
    const prefix = '/tmp/browse-test-resp';
    const result = await handleMetaCommand('responsive', [prefix], bm, async () => {});
    expect(result).toContain('mobile');
    expect(result).toContain('tablet');
    expect(result).toContain('desktop');

    expect(fs.existsSync(`${prefix}-mobile.png`)).toBe(true);
    expect(fs.existsSync(`${prefix}-tablet.png`)).toBe(true);
    expect(fs.existsSync(`${prefix}-desktop.png`)).toBe(true);

    // Cleanup
    fs.unlinkSync(`${prefix}-mobile.png`);
    fs.unlinkSync(`${prefix}-tablet.png`);
    fs.unlinkSync(`${prefix}-desktop.png`);
  });
});

// ─── Tabs ───────────────────────────────────────────────────────

describe('Tabs', () => {
  test('tabs lists all tabs', async () => {
    const result = await handleMetaCommand('tabs', [], bm, async () => {});
    expect(result).toContain('[');
    expect(result).toContain(']');
  });

  test('newtab opens new tab', async () => {
    const result = await handleMetaCommand('newtab', [baseUrl + '/forms.html'], bm, async () => {});
    expect(result).toContain('Opened tab');

    const tabCount = bm.getTabCount();
    expect(tabCount).toBeGreaterThanOrEqual(2);
  });

  test('tab switches to specific tab', async () => {
    const result = await handleMetaCommand('tab', ['1'], bm, async () => {});
    expect(result).toContain('Switched to tab 1');
  });

  test('closetab closes a tab', async () => {
    const before = bm.getTabCount();
    // Close the last opened tab
    const tabs = await bm.getTabListWithTitles();
    const lastTab = tabs[tabs.length - 1];
    const result = await handleMetaCommand('closetab', [String(lastTab.id)], bm, async () => {});
    expect(result).toContain('Closed tab');
    expect(bm.getTabCount()).toBe(before - 1);
  });
});

// ─── Diff ───────────────────────────────────────────────────────

describe('Diff', () => {
  test('diff shows differences between pages', async () => {
    const result = await handleMetaCommand(
      'diff',
      [baseUrl + '/basic.html', baseUrl + '/forms.html'],
      bm,
      async () => {}
    );
    expect(result).toContain('---');
    expect(result).toContain('+++');
    // basic.html has "Hello World", forms.html has "Form Test Page"
    expect(result).toContain('Hello World');
    expect(result).toContain('Form Test Page');
  });
});

// ─── Chain ──────────────────────────────────────────────────────

describe('Chain', () => {
  test('chain executes sequence of commands', async () => {
    const commands = JSON.stringify([
      ['goto', baseUrl + '/basic.html'],
      ['js', 'document.title'],
      ['css', 'h1', 'color'],
    ]);
    const result = await handleMetaCommand('chain', [commands], bm, async () => {});
    expect(result).toContain('[goto]');
    expect(result).toContain('Test Page - Basic');
    expect(result).toContain('[css]');
  });

  test('chain reports real error when write command fails', async () => {
    const commands = JSON.stringify([
      ['goto', 'http://localhost:1/unreachable'],
    ]);
    const result = await handleMetaCommand('chain', [commands], bm, async () => {});
    expect(result).toContain('[goto] ERROR:');
    expect(result).not.toContain('Unknown meta command');
    expect(result).not.toContain('Unknown read command');
  });
});

// ─── Status ─────────────────────────────────────────────────────

describe('Status', () => {
  test('status reports health', async () => {
    const result = await handleMetaCommand('status', [], bm, async () => {});
    expect(result).toContain('Status: healthy');
    expect(result).toContain('Tabs:');
  });
});

// ─── CLI server script resolution ───────────────────────────────

describe('CLI server script resolution', () => {
  test('prefers adjacent browse/src/server.ts for compiled project installs', () => {
    const root = fs.mkdtempSync('/tmp/gstack-cli-');
    const execPath = path.join(root, '.claude/skills/gstack/browse/dist/browse');
    const serverPath = path.join(root, '.claude/skills/gstack/browse/src/server.ts');

    fs.mkdirSync(path.dirname(execPath), { recursive: true });
    fs.mkdirSync(path.dirname(serverPath), { recursive: true });
    fs.writeFileSync(serverPath, '// test server\n');

    const resolved = resolveServerScript(
      { HOME: path.join(root, 'empty-home') },
      '$bunfs/root',
      execPath
    );

    expect(resolved).toBe(serverPath);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

// ─── CLI lifecycle ──────────────────────────────────────────────

describe('CLI lifecycle', () => {
  test('dead state file triggers a clean restart', async () => {
    const stateFile = `/tmp/browse-test-state-${Date.now()}.json`;
    fs.writeFileSync(stateFile, JSON.stringify({
      port: 1,
      token: 'fake',
      pid: 999999,
    }));

    const cliPath = path.resolve(__dirname, '../src/cli.ts');
    const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const proc = spawn('bun', ['run', cliPath, 'status'], {
        timeout: 15000,
        env: {
          ...process.env,
          BROWSE_STATE_FILE: stateFile,
          BROWSE_PORT_START: '9520',
        },
      });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => stdout += d.toString());
      proc.stderr.on('data', (d) => stderr += d.toString());
      proc.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });

    let restartedPid: number | null = null;
    if (fs.existsSync(stateFile)) {
      restartedPid = JSON.parse(fs.readFileSync(stateFile, 'utf-8')).pid;
      fs.unlinkSync(stateFile);
    }
    if (restartedPid) {
      try { process.kill(restartedPid, 'SIGTERM'); } catch {}
    }

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Status: healthy');
    expect(result.stderr).toContain('Starting server');
  }, 20000);
});

// ─── Buffer bounds ──────────────────────────────────────────────

describe('Buffer bounds', () => {
  test('console buffer caps at 50000 entries', () => {
    consoleBuffer.length = 0;
    for (let i = 0; i < 50_010; i++) {
      addConsoleEntry({ timestamp: i, level: 'log', text: `msg-${i}` });
    }
    expect(consoleBuffer.length).toBe(50_000);
    expect(consoleBuffer[0].text).toBe('msg-10');
    expect(consoleBuffer[consoleBuffer.length - 1].text).toBe('msg-50009');
    consoleBuffer.length = 0;
  });

  test('network buffer caps at 50000 entries', () => {
    networkBuffer.length = 0;
    for (let i = 0; i < 50_010; i++) {
      addNetworkEntry({ timestamp: i, method: 'GET', url: `http://x/${i}` });
    }
    expect(networkBuffer.length).toBe(50_000);
    expect(networkBuffer[0].url).toBe('http://x/10');
    expect(networkBuffer[networkBuffer.length - 1].url).toBe('http://x/50009');
    networkBuffer.length = 0;
  });

  test('totalAdded counters keep incrementing past buffer cap', () => {
    const startConsole = consoleTotalAdded;
    const startNetwork = networkTotalAdded;
    for (let i = 0; i < 100; i++) {
      addConsoleEntry({ timestamp: i, level: 'log', text: `t-${i}` });
      addNetworkEntry({ timestamp: i, method: 'GET', url: `http://t/${i}` });
    }
    expect(consoleTotalAdded).toBe(startConsole + 100);
    expect(networkTotalAdded).toBe(startNetwork + 100);
    consoleBuffer.length = 0;
    networkBuffer.length = 0;
  });
});

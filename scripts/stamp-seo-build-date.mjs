import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { getLastModified, homeLastmodPaths } from '../src/lib/buildMetadata.js';

const distIndexPath = resolve('dist/index.html');
const homeLastModified = getLastModified(homeLastmodPaths);

const html = await readFile(distIndexPath, 'utf8');
if (!html.includes('__HOME_LASTMOD__')) {
  throw new Error('Expected __HOME_LASTMOD__ placeholder in dist/index.html');
}

const updatedHtml = html.replaceAll('__HOME_LASTMOD__', homeLastModified);
await writeFile(distIndexPath, updatedHtml);

console.log(`Stamped dist/index.html with home dateModified ${homeLastModified}`);

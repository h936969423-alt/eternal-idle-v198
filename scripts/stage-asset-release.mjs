import { finalizeAssetStorage } from './finalize-asset-storage.mjs';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
finalizeAssetStorage();
function bytes(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, item) => {
    const file = path.join(dir, item.name);
    return sum + (item.isDirectory() ? bytes(file) : statSync(file).size);
  }, 0);
}
const size = bytes('dist');
if (size > 240000000) throw new Error('Deployment exceeds safe expanded archive budget');
console.log(`Expanded deployment output: ${size} bytes.`);

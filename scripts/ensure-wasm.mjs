import fs from 'fs';
import path from 'path';

const source = path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const target = path.resolve('public/sql-wasm.wasm');

if (fs.existsSync(source)) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  const size = fs.statSync(target).size;
  console.log(`[ensure-wasm] Verified sql-wasm.wasm in public/ (${size} bytes)`);
} else {
  console.warn(`[ensure-wasm] Warning: ${source} not found!`);
}

// Generates extra piece sets (assets/pieces/<set>/*.svg) by recolouring the base cburnett SVGs in assets/pieces/.
// Run: node scripts/gen-piece-sets.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const base = path.join(root, 'assets/pieces');
// body = main fill, line = outline, detail = small inner marks (eyes, creases)
export const SETS = {
  midnight: { w: { body: '#e3edff', line: '#0f2a63', detail: '#0f2a63' }, b: { body: '#2a4a9c', line: '#07142f', detail: '#cfe0ff' } },
  royal: { w: { body: '#f7e6ad', line: '#4a3000', detail: '#4a3000' }, b: { body: '#5a1426', line: '#2a0610', detail: '#f1c75a' } },
  emerald: { w: { body: '#f3f1e2', line: '#10331f', detail: '#10331f' }, b: { body: '#1f7a4d', line: '#08241a', detail: '#d6f5e1' } },
  neon: { w: { body: '#7ef3ff', line: '#06202a', detail: '#06202a' }, b: { body: '#ff58c8', line: '#2a0620', detail: '#2a0620' } },
  ember: { w: { body: '#ffe1c2', line: '#4a1b00', detail: '#4a1b00' }, b: { body: '#c2410c', line: '#2a0d00', detail: '#ffe1c2' } },
  steel: { w: { body: '#f1f4f8', line: '#27303d', detail: '#27303d' }, b: { body: '#59677a', line: '#10151d', detail: '#e8edf4' } },
};
const kinds = ['p', 'n', 'b', 'r', 'q', 'k'];
for (const [name, def] of Object.entries(SETS)) {
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const c of ['w', 'b']) for (const k of kinds) {
    let svg = fs.readFileSync(path.join(base, `${c}${k}.svg`), 'utf8');
    const d = def[c];
    if (c === 'w') svg = svg.replace(/(fill|stroke)="#FFFFFF"/gi, `$1="${d.body}"`).replace(/(fill)="#000000"/gi, `$1="${d.detail}"`).replace(/(stroke)="#000000"/gi, `$1="${d.line}"`);
    else svg = svg.replace(/(fill)="#000000"/gi, `$1="${d.body}"`).replace(/(stroke)="#000000"/gi, `$1="${d.line}"`).replace(/(fill|stroke)="#FFFFFF"/gi, `$1="${d.detail}"`);
    fs.writeFileSync(path.join(dir, `${c}${k}.svg`), svg);
  }
}
console.log('piece sets written:', Object.keys(SETS).join(', '));

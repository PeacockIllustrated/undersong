// M5-04: zip dist/ for itch.io (an HTML game is a zip with index.html at its root). No dependencies:
// a plain zip writer over node:zlib. Run after `vite build`; writes undersong-itch.zip.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const DIST = 'dist';
/** `--out=name.zip` names the zip; the hybrid branch ships it as holloway-co-itch.zip. */
const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'undersong-itch.zip';
/** 1 Jan 1980, so the zip is the same byte for byte on every build. */
const DOS_DATE = (1 << 5) | 1;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const local: Buffer[] = [];
const central: Buffer[] = [];
let offset = 0;
const list = files(DIST).sort();
if (!list.includes(join(DIST, 'index.html')))
  throw new Error('dist/index.html missing: run `vite build` first');
for (const path of list) {
  const name = Buffer.from(relative(DIST, path).split('\\').join('/'));
  const raw = readFileSync(path);
  const data = deflateRawSync(raw, { level: 9 });
  const crc = crc32(raw);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  head.writeUInt16LE(20, 4); // version needed
  head.writeUInt16LE(0x0800, 6); // UTF-8 names
  head.writeUInt16LE(8, 8); // deflate
  head.writeUInt16LE(0, 10); // time
  head.writeUInt16LE(DOS_DATE, 12);
  head.writeUInt32LE(crc, 14);
  head.writeUInt32LE(data.length, 18);
  head.writeUInt32LE(raw.length, 22);
  head.writeUInt16LE(name.length, 26);
  head.writeUInt16LE(0, 28);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(20, 4);
  dir.writeUInt16LE(20, 6);
  dir.writeUInt16LE(0x0800, 8);
  dir.writeUInt16LE(8, 10);
  dir.writeUInt16LE(0, 12);
  dir.writeUInt16LE(DOS_DATE, 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(data.length, 20);
  dir.writeUInt32LE(raw.length, 24);
  dir.writeUInt16LE(name.length, 28);
  dir.writeUInt32LE(offset, 42);
  local.push(head, name, data);
  central.push(dir, name);
  offset += head.length + name.length + data.length;
}
const cd = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(list.length, 8);
end.writeUInt16LE(list.length, 10);
end.writeUInt32LE(cd.length, 12);
end.writeUInt32LE(offset, 16);
writeFileSync(OUT, Buffer.concat([...local, cd, end]));
console.log(`${OUT}: ${list.length} files, ${(statSync(OUT).size / 1024).toFixed(0)} KB`);

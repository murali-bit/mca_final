// Packages extension/ as a zip the dashboard serves for download, plus a small JSON with
// version/size so the setup page can show them. No dependencies: zlib does deflate + CRC-32.
//
// Client data files (extension/clients/*.json) hold real company financials and are NOT
// shipped; the zip gets an empty clients/index.json, and data arrives from the dashboard.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'extension');
const OUT_DIR = path.join(ROOT, 'dashboard', 'public', 'downloads');
const ZIP_NAME = 'germin8-extension.zip';
const FOLDER = 'germin8-extension';

const EXCLUDE = [
  /^clients\/(?!index\.json$)/,   // real client data
  /^config\.local.*\.js$/,        // local credentials / their template
  /(^|\/)\./,                     // dotfiles
  /(^|\/)node_modules\//,
  /\.zip$/,
];

function listFiles(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = zlib.crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);            // UTF-8 names
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(useDeflate ? 8 : 0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const files = listFiles(SRC).filter(f => !EXCLUDE.some(re => re.test(f))).sort();
if (!files.includes('manifest.json')) throw new Error('manifest.json missing from extension/');

const entries = files.map(rel => ({
  name: `${FOLDER}/${rel}`,
  data: rel === 'clients/index.json'
    ? Buffer.from(JSON.stringify({ firm: 'Germin8', clients: [] }, null, 2) + '\n')
    : fs.readFileSync(path.join(SRC, rel)),
}));
if (!files.includes('clients/index.json')) {
  entries.push({ name: `${FOLDER}/clients/index.json`, data: Buffer.from(JSON.stringify({ firm: 'Germin8', clients: [] }, null, 2) + '\n') });
}

const zip = buildZip(entries);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, ZIP_NAME), zip);
const info = {
  name: manifest.name,
  version: manifest.version,
  file: `downloads/${ZIP_NAME}`,
  bytes: zip.length,
  files: entries.length,
  sha256: crypto.createHash('sha256').update(zip).digest('hex'),
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(OUT_DIR, 'extension.json'), JSON.stringify(info, null, 2) + '\n');
console.log(`Built ${ZIP_NAME}: v${info.version}, ${entries.length} files, ${(zip.length / 1024).toFixed(0)} KB`);

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "public");
mkdirSync(output, { recursive: true });

for (const size of [16, 32, 48, 128]) writeFileSync(resolve(output, `icon-${size}.png`), createPng(size));

function createPng(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.23;
  const center = size / 2;
  const ringOuter = size * 0.31;
  const ringInner = size * 0.18;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cornerX = Math.max(radius - x, 0, x - (size - radius));
      const cornerY = Math.max(radius - y, 0, y - (size - radius));
      const inside = Math.hypot(cornerX, cornerY) <= radius || (x >= radius && x <= size - radius) || (y >= radius && y <= size - radius);
      const distance = Math.hypot(x - center, y - center);
      const ring = distance <= ringOuter && distance >= ringInner;
      const arrow = (x > size * 0.68 && y < size * 0.3 && Math.abs((x - size * 0.84) - (y - size * 0.16)) < Math.max(1, size * 0.045));
      const index = (y * size + x) * 4;
      if (!inside) continue;
      if (ring || arrow) {
        pixels[index] = 159; pixels[index + 1] = 232; pixels[index + 2] = 112; pixels[index + 3] = 255;
      } else if (distance < size * 0.1) {
        pixels[index] = 244; pixels[index + 1] = 247; pixels[index + 2] = 241; pixels[index + 3] = 255;
      } else {
        pixels[index] = 16; pixels[index + 1] = 33; pixels[index + 2] = 22; pixels[index + 3] = 255;
      }
    }
  }
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    rows[y * (size * 4 + 1)] = 0;
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([Buffer.from("\x89PNG\r\n\x1a\n", "binary"), pngChunk("IHDR", Buffer.concat([uint32(size), uint32(size), Buffer.from([8, 6, 0, 0, 0])])), pngChunk("IDAT", deflateSync(rows)), pngChunk("IEND", Buffer.alloc(0))]);
}

function uint32(value) { const buffer = Buffer.alloc(4); buffer.writeUInt32BE(value); return buffer; }
function pngChunk(type, data) { const name = Buffer.from(type); return Buffer.concat([uint32(data.length), name, data, uint32(crc32(Buffer.concat([name, data])))], 8 + data.length); }
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }

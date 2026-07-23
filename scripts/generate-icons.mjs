// Generates public/pwa-192.png and public/pwa-512.png without any image deps
// by writing the PNG format directly. Mirrors public/favicon.svg: a river-teal
// delta (outlined triangle fanning from an apex hub dot) on a near-black field.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const BG = [11, 15, 16] // near-black
const MARK = [45, 212, 191] // river teal #2dd4bf

// Delta geometry in a 64x64 design space (apex at top, fanning down).
const A = [32, 18]
const B = [50, 47]
const C = [14, 47]
const CENTROID = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3]
const shrink = (v) => [
  CENTROID[0] + (v[0] - CENTROID[0]) * 0.5,
  CENTROID[1] + (v[1] - CENTROID[1]) * 0.5,
]
const A2 = shrink(A)
const B2 = shrink(B)
const C2 = shrink(C)

function edge(px, py, a, b) {
  return (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1])
}
function inTriangle(px, py, a, b, c) {
  const d1 = edge(px, py, a, b)
  const d2 = edge(px, py, b, c)
  const d3 = edge(px, py, c, a)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

function makeIcon(size) {
  const s = size / 64
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const gx = x / s
      const gy = y / s
      let px = BG
      // Outlined delta = inside outer triangle but outside the inner one.
      if (inTriangle(gx, gy, A, B, C) && !inTriangle(gx, gy, A2, B2, C2)) px = MARK
      // Apex hub dot.
      const dx = gx - A[0]
      const dy = gy - A[1]
      if (dx * dx + dy * dy <= 4.5 * 4.5) px = MARK
      const off = y * (size * 3 + 1) + 1 + x * 3
      raw[off] = px[0]
      raw[off + 1] = px[1]
      raw[off + 2] = px[2]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/pwa-${size}.png`, import.meta.url), makeIcon(size))
  console.log(`public/pwa-${size}.png`)
}

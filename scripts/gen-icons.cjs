// Generates PWA icons using only built-in Node.js modules
'use strict'
const { writeFileSync, mkdirSync } = require('fs')
const { deflateSync } = require('zlib')
const { join } = require('path')

function crc32(buf) {
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeB = Buffer.from(type, 'ascii')
  const crcB = Buffer.alloc(4)
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])))
  return Buffer.concat([len, typeB, data, crcB])
}

function makePNG(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2  // 8-bit RGB

  // Raw scanlines: filter byte (0) + RGB*width per row
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const off = y * (1 + size * 3)
    raw[off] = 0  // filter type: None
    // Simple blue-to-purple gradient
    for (let x = 0; x < size; x++) {
      const t = x / size
      raw[off + 1 + x * 3 + 0] = Math.round(r * (1 - t) + 124 * t)  // R
      raw[off + 1 + x * 3 + 1] = Math.round(g * (1 - t) + 58 * t)   // G
      raw[off + 1 + x * 3 + 2] = Math.round(b * (1 - t) + 237 * t)  // B
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeFavIco(pngData) {
  // ICO header: reserved(2) + type=1(2) + count=1(2)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  // ICONDIRENTRY: w(1)+h(1)+colorCount(1)+reserved(1)+planes(2)+bitCount(2)+bytesInRes(4)+offset(4)
  const entry = Buffer.alloc(16)
  entry[0] = 32; entry[1] = 32  // 32x32
  entry[2] = 0; entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngData.length, 8)
  entry.writeUInt32LE(6 + 16, 12)  // offset = header + entry

  return Buffer.concat([header, entry, pngData])
}

mkdirSync(join(__dirname, '../public/icons'), { recursive: true })
const png192 = makePNG(192, [59, 130, 246])
const png512 = makePNG(512, [59, 130, 246])
const png32  = makePNG(32,  [59, 130, 246])
writeFileSync(join(__dirname, '../public/icons/icon-192.png'), png192)
writeFileSync(join(__dirname, '../public/icons/icon-512.png'), png512)
writeFileSync(join(__dirname, '../public/favicon.ico'), makeFavIco(png32))
console.log('Done: public/icons/icon-192.png, icon-512.png, public/favicon.ico')

import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

const svgIcon = (size, rx) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${rx}" fill="url(#g)"/>
    <text x="${size / 2}" y="${size * 0.72}" font-size="${size * 0.54}"
          text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, serif">👟</text>
  </svg>`
)

await Promise.all([
  sharp(svgIcon(192, 40)).png().toFile('public/icons/icon-192.png'),
  sharp(svgIcon(512, 100)).png().toFile('public/icons/icon-512.png'),
])

console.log('✓ public/icons/icon-192.png')
console.log('✓ public/icons/icon-512.png')

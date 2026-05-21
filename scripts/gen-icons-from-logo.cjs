'use strict'
const sharp = require('sharp')
const path = require('path')

const src = path.join(__dirname, '..', 'public', 'logo-source.png')
const iconsDir = path.join(__dirname, '..', 'public', 'icons')

async function gen() {
  await sharp(src).resize(192, 192).toFile(path.join(iconsDir, 'icon-192.png'))
  console.log('icon-192.png done')

  await sharp(src).resize(512, 512).toFile(path.join(iconsDir, 'icon-512.png'))
  console.log('icon-512.png done')

  await sharp(src).resize(180, 180).toFile(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'))
  console.log('apple-touch-icon.png done')

  await sharp(src).resize(32, 32).toFile(path.join(__dirname, '..', 'src', 'app', 'icon.png'))
  console.log('src/app/icon.png done')

  await sharp(src).resize(180, 180).toFile(path.join(__dirname, '..', 'src', 'app', 'apple-icon.png'))
  console.log('src/app/apple-icon.png done')
}

gen().catch(console.error)

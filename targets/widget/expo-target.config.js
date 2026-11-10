/** Home-screen widget extension (co.sauceroom.grandma.widget). Reads the snapshot the app writes to the App Group. */
const fs = require('fs')
const path = require('path')

// Every plain sticker (the snapshot names them per log type, lib/logStickers). Image("st_<name>") in Swift.
const STICKER_DIR = path.join(__dirname, '../../assets/stickers-site')
const STICKERS = fs.readdirSync(STICKER_DIR).filter((f) => f.endsWith('.png') && !f.includes('-cut')).map((f) => f.slice(0, -4))

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'GrandmaWidget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
  // Fonts live in ./assets (linked as target resources) and are listed in Info.plist UIAppFonts.
  images: Object.fromEntries(STICKERS.map((s) => [`st_${s}`, `../../assets/stickers-site/${s}.png`])),
})

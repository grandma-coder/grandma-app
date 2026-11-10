/** Home-screen widget extension (co.sauceroom.grandma.widget). Reads the snapshot the app writes to the App Group. */
const sticker = (name) => `../../assets/stickers-site/${name}.png`

// Stickers the widget draws (journey corner icon, log buttons, mood faces). Image("st_<name>") in Swift.
const STICKERS = [
  'flower', 'heart', 'baby', 'flame', 'drop', 'headache', 'face1', 'face2', 'face3', 'face4',
  'thermo', 'foot', 'glass', 'bottle', 'moon', 'diaper',
]

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'GrandmaWidget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
  // Fonts live in ./assets (linked as target resources) and are listed in Info.plist UIAppFonts.
  images: Object.fromEntries(STICKERS.map((s) => [`st_${s}`, sticker(s)])),
})

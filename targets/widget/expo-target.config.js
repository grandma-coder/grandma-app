/** Home-screen widget extension (co.sauceroom.grandma.widget). Reads the snapshot the app writes to the App Group. */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'GrandmaWidget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
})

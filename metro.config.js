const path = require("path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// site/ and admin/ are separate Next.js apps in this repo; keep Metro from crawling or bundling them.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const webApps = ["site", "admin"].map((d) => new RegExp(`^${esc(path.join(__dirname, d))}[\\/].*`));
const prev = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...webApps];

module.exports = config;

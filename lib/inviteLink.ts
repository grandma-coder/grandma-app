/**
 * Caregiver invite links use an HTTPS Universal Link / App Link on our own domain
 * instead of the `grandma-app://` custom scheme: any installed app can register
 * that scheme and read the token, but only Grandma is associated with
 * www.thegrandma.app (site/public/.well-known/apple-app-site-association).
 * Without the app installed, the site's /accept-invite page shows the store
 * links + an "open in app" button.
 */
export const INVITE_LINK_BASE = 'https://www.thegrandma.app/accept-invite'

export function buildInviteLink(token: string): string {
  return `${INVITE_LINK_BASE}?token=${encodeURIComponent(token)}`
}

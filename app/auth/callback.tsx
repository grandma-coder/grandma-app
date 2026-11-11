/**
 * Landing route for the Google OAuth return (grandma-app://auth/callback?…). lib/auth-providers
 * reads that URL from the auth sheet itself; on Android the same URL also reaches the router as a
 * deep link, and without this route it opened the "page not found" screen — where a returning user
 * stayed, because the guard only moves signed-in users off the auth screens. The root layout's
 * guard treats /auth/* as an auth screen and moves on from here.
 */
export default function AuthCallbackLanding() {
  return null
}

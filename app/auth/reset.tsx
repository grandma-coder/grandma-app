/**
 * Landing route for the password-reset email link (grandma-app://auth/reset#…). The root layout
 * reads the link itself (lib/authRedirect) and moves on to /(auth)/reset-password; this blank
 * route only stops the "page not found" screen from flashing while it does.
 */
export default function AuthResetLanding() {
  return null
}

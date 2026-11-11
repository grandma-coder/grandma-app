/**
 * Landing route for the sign-up confirmation email link (grandma-app://auth/confirm#…). The root
 * layout reads the link (lib/authRedirect), signs the user in and the guard moves on to
 * consent/onboarding; this blank route only stops the "page not found" screen from flashing.
 */
export default function AuthConfirmLanding() {
  return null
}

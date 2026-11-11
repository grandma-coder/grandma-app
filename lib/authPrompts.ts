import { Alert } from 'react-native'
import { supabase } from './supabase'
import { authErrorText } from './authError'
import { AUTH_CONFIRM_REDIRECT } from './authRedirect'
import { t } from './i18n'

/** Send the sign-up confirmation email again (Supabase rate-limits this per address). */
async function resendConfirmation(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: AUTH_CONFIRM_REDIRECT } })
    if (error) Alert.alert(t('auth_signUpFailed'), authErrorText(error))
    else Alert.alert(t('auth_checkEmailTitle'), t('auth_resendSent'))
  } catch (e) {
    Alert.alert(t('auth_signUpFailed'), authErrorText(e))
  }
}

/**
 * "Check your email" after sign-up (or a sign-in blocked by an unconfirmed address), with a resend.
 *
 * Shows the address so a typo is visible, and is deliberately the same for a brand-new address and
 * one that already has an account: with confirmations on, Supabase answers both with the same
 * fake success so the app can't tell them apart (no account enumeration).
 */
export function promptCheckEmail(email: string, onOk?: () => void): void {
  Alert.alert(t('auth_checkEmailTitle'), t('auth_checkEmailMsg', { email }), [
    { text: t('auth_resendEmail'), onPress: () => { void resendConfirmation(email) } },
    { text: t('common_ok'), style: 'default', onPress: onOk },
  ])
}

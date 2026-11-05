import { FutureDateError } from './futureDate'
import { t } from './i18n'

/** Alert text for a failed pregnancy-log save: our own translated future-date line, else a calm
 *  generic one. Never a raw English Supabase/network error. */
export function pregnancyLogErrorText(e: unknown): string {
  return e instanceof FutureDateError ? e.message : t('cyc_alert_saveFailed')
}

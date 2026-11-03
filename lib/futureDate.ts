import { toDateStr } from './cycleLogic'
import { t } from './i18n'

/**
 * Logs describe what happened, so they can't be dated in the future. A future period start entered
 * the cycle history as fact (shifting every prediction), and a future menopause period reset the
 * months-since counter. Entry points hide "log" for future days; savers call assertNotFuture too.
 */
export function isFutureDate(date: string, today: string = toDateStr(new Date())): boolean {
  return date > today
}

export class FutureDateError extends Error {
  constructor() {
    super(t('log_futureDateError'))
    this.name = 'FutureDateError'
  }
}

export function assertNotFuture(date: string): void {
  if (isFutureDate(date)) throw new FutureDateError()
}

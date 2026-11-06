import { Alert, type AlertButton, type AlertOptions } from 'react-native'
import { whenNoneClosing } from './modalQueue'

/** Run `fn` once no sheet/modal is closing — use instead of acting in the same handler that closes one. */
export function afterSheets(fn: () => void): () => void {
  return whenNoneClosing(fn)
}

/** `Alert.alert` that waits for a closing sheet to be gone (iOS drops/blocks alerts over a presenting Modal). */
export function alertAfterSheets(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
  whenNoneClosing(() => Alert.alert(title, message, buttons, options))
}

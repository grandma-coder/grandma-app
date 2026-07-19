/**
 * useConfirmDialog — a paper-styled replacement for React Native's Alert.alert().
 *
 * Alert.alert renders the raw iOS/Android system dialog, which breaks the
 * cream-paper / Diffuse design language. This hook wraps <PaperAlert> in an
 * imperative, promise-based API and returns the element to render, so no
 * context/provider plumbing is needed — the same component that calls confirm()
 * also renders the dialog:
 *
 *   const { confirm, confirmDialog } = useConfirmDialog()
 *   ...
 *   if (await confirm({ title: 'Leave channel?', message: '…',
 *                       confirmLabel: 'Leave', danger: true })) { … }
 *
 *   // one-button info / error dialog (resolves when dismissed):
 *   await confirm({ title: t('common_error'), message: e.message, cancelLabel: null })
 *
 *   return (<View>…{confirmDialog}</View>)
 */

import { useCallback, useRef, useState, type ReactElement } from 'react'
import { PaperAlert, type PaperAlertButton } from './PaperAlert'

export interface ConfirmOptions {
  title: string
  message?: string
  /** Accent line under the title (coral in current, accent in diffuse). */
  italic?: string
  /** Primary/confirm button label. Defaults to "OK". */
  confirmLabel?: string
  /** Cancel button label. Pass null for a single-button (info/error) dialog. */
  cancelLabel?: string | null
  /** Style the confirm button as destructive. */
  danger?: boolean
}

interface DialogState extends ConfirmOptions {
  visible: boolean
}

export function useConfirmDialog(): {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  confirmDialog: ReactElement
} {
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '' })
  const resolveRef = useRef<((v: boolean) => void) | undefined>(undefined)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setDialog({ ...opts, visible: true })
    })
  }, [])

  // Resolve once and close. `result` = whether the primary/confirm was tapped.
  const finish = useCallback((result: boolean) => {
    resolveRef.current?.(result)
    resolveRef.current = undefined
    setDialog((d) => ({ ...d, visible: false }))
  }, [])

  const buttons: PaperAlertButton[] = []
  if (dialog.cancelLabel !== null) {
    buttons.push({ label: dialog.cancelLabel ?? 'Cancel', variant: 'secondary', onPress: () => finish(false) })
  }
  buttons.push({
    label: dialog.confirmLabel ?? 'OK',
    variant: dialog.danger ? 'danger' : 'primary',
    onPress: () => finish(true),
  })

  const confirmDialog = (
    <PaperAlert
      visible={dialog.visible}
      title={dialog.title}
      message={dialog.message}
      italic={dialog.italic}
      buttons={buttons}
      onRequestClose={() => finish(false)}
    />
  )

  return { confirm, confirmDialog }
}

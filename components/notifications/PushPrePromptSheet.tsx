/**
 * PushPrePromptSheet — after a journey onboarding, a short sheet explains why notifications help
 * before the OS asks (the launch path never prompts). Allow → the OS prompt (which registers the
 * push token once granted). Not now / dismiss → hidden for 14 days. Shows only while the OS
 * permission is still undetermined (lib/pushPrePrompt).
 */
import { useEffect, useRef, useState } from 'react'
import { PaperActionSheet } from '../ui/PaperActionSheet'
import { useTranslation } from '../../lib/i18n'
import { getNotificationPermissionStatus, requestNotificationPermission } from '../../lib/pushNotifications'
import { shouldShowPushPrePrompt } from '../../lib/pushPrePrompt'
import { usePushPromptStore } from '../../store/usePushPromptStore'

/** Let the home settle (route change, first paint) before the sheet rises. */
const SHOW_DELAY_MS = 900

export function PushPrePromptSheet() {
  const { t } = useTranslation()
  const pending = usePushPromptStore((s) => s.pending)
  const [visible, setVisible] = useState(false)
  const allowed = useRef(false)

  useEffect(() => {
    if (!pending) return
    let alive = true
    const timer = setTimeout(() => {
      void getNotificationPermissionStatus().then((permission) => {
        if (!alive) return
        const { snoozedUntil, clear } = usePushPromptStore.getState()
        if (shouldShowPushPrePrompt({ permission, snoozedUntil, now: Date.now() })) {
          allowed.current = false
          setVisible(true)
        } else {
          clear()
        }
      })
    }, SHOW_DELAY_MS)
    return () => { alive = false; clearTimeout(timer) }
  }, [pending])

  function onClose() {
    setVisible(false)
    if (allowed.current) usePushPromptStore.getState().clear()
    else usePushPromptStore.getState().snooze()
  }

  return (
    <PaperActionSheet
      visible={visible}
      title={t('pushPrePrompt_title')}
      message={t('pushPrePrompt_body')}
      items={[{
        label: t('pushPrePrompt_allow'),
        onPress: () => {
          allowed.current = true
          void requestNotificationPermission().catch(() => false)
        },
      }]}
      cancelLabel={t('pushPrePrompt_notNow')}
      onRequestClose={onClose}
    />
  )
}

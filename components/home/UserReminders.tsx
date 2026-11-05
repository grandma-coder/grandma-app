/**
 * UserReminders — the reminders sheet body for the pregnancy + cycle wallets.
 *
 * `context` scopes the list (AsyncStorage key `grandma-reminders-<context>-<userId>`)
 * and the local alerts. Data + alert scheduling live in store/useRemindersStore;
 * the site-look UI is components/home/reminders/RemindersPanel. The Diffuse look
 * (off) keeps its previous component unchanged.
 *
 * The pregnancy entry point (components/home/pregnancy/PregnancyUserReminders)
 * is a thin wrapper that passes context="pregnancy".
 */
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'
import type { JourneyMode } from '../../types'
import { useReminders } from '../../store/useRemindersStore'
import { RemindersPanel } from './reminders/RemindersPanel'
import { DiffuseUserReminders } from './reminders/DiffuseUserReminders'

interface Props {
  userId: string | null
  /** Which journey the reminders belong to — scopes storage + alerts + tone.
   *  Defaults to pregnancy for the existing call sites. */
  context?: JourneyMode
  /** Embedded inside a wallet card (Diffuse only). */
  bare?: boolean
}

export function UserReminders({ userId, context = 'pregnancy', bare }: Props) {
  const diffuse = useIsDiffuse()
  if (diffuse) return <DiffuseUserReminders userId={userId} context={context} bare={bare} />
  return <SiteUserReminders userId={userId} context={context} />
}

function SiteUserReminders({ userId, context }: { userId: string | null; context: JourneyMode }) {
  const { t } = useTranslation()
  const { reminders, ready, add, update, setDone, remove, clearDone } = useReminders(userId, context)
  const placeholder =
    context === 'pregnancy' ? t('preg_reminders_inputPlaceholder')
    : context === 'pre-pregnancy' ? t('reminders_placeholder_cycle')
    : context === 'kids' ? t('kids_home_reminder_placeholder')
    : t('reminders_placeholder_generic')

  return (
    <RemindersPanel
      context={context}
      reminders={reminders}
      ready={ready}
      placeholder={placeholder}
      onAdd={async (d) => (await add(d)) !== null}
      onUpdate={async (id, d) => (await update(id, d)) !== null}
      onSetDone={(id, done) => { void setDone(id, done) }}
      onDelete={(id) => { void remove(id) }}
      onClearDone={() => { void clearDone() }}
    />
  )
}

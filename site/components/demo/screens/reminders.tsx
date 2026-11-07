'use client'

import { useDemo } from '../demo'
import { Head, List, Note, Row } from './parts'

export function Reminders() {
  const { data } = useDemo()
  const t = data.ui.screens.reminders
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <Note>{t.note}</Note>
      <List>{t.items.map((i) => <Row key={i.name} icon="bell" label={i.name} value={i.when} />)}</List>
    </>
  )
}

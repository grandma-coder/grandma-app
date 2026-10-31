'use client'

import { useDemo } from '../demo'
import { Head, List, Note, Row } from './parts'

export function Privacy() {
  const { data } = useDemo()
  const t = data.ui.screens.privacy
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <Note>{t.note}</Note>
      <List>{t.items.map((i) => <Row key={i.label} icon="lock" label={i.label} value={i.value} />)}</List>
    </>
  )
}

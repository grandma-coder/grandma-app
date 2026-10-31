'use client'

import { useDemo } from '../demo'
import { KidSwitch } from '../kid-switch'
import { currentKid } from '../kids'
import { Head, List, Note, Row } from './parts'

export function Pediatric() {
  const { state, data } = useDemo()
  const t = data.ui.screens.pediatric
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <KidSwitch all={false} />
      <Note>{t.note}</Note>
      <List>{t.items[currentKid(state.kid)].map((i) => <Row key={i.label} icon="doc" label={i.label} value={i.value} />)}</List>
    </>
  )
}

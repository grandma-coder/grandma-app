'use client'

import { useDemo } from '../demo'
import { KidSwitch } from '../kid-switch'
import { currentKid } from '../kids'
import { Head, List, Note, Row } from './parts'

export function Vaccines() {
  const { state, data } = useDemo()
  const t = data.ui.screens.vaccines
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <KidSwitch all={false} />
      <Note>{t.note}</Note>
      <List>{data.vax[currentKid(state.kid)].map((v, i) => <Row key={i} icon="syringe" label={v.name} value={v.when} ok={v.done} />)}</List>
    </>
  )
}

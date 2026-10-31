'use client'

import type { StickerName } from '@/components/stickers/paths'
import { Ico } from '../sticker-ico'
import { useDemo } from '../demo'
import styles from '../demo.module.css'
import f from './features.module.css'
import { Head, List, Note, Row } from './parts'

export function Care() {
  const { data } = useDemo()
  const t = data.ui.screens.care
  const people: [StickerName, string][] = [['me', t.circle.you], ['heart', t.circle.partner], ['eye', t.circle.grandma], ['bottle', t.circle.sitter]]
  const access: [StickerName, string, string][] = [
    ['heart', t.circle.partner, t.access.partner], ['eye', t.circle.grandma, t.access.grandma], ['bottle', t.circle.sitter, t.access.sitter],
  ]
  return (
    <>
      <Head title={t.title} icon={t.icon} />
      <Note>{t.note}</Note>
      <div className={f.circle}>{people.map(([icon, label]) => <span key={label}><Ico name={icon} cut />{label}</span>)}</div>
      <List>{access.map(([icon, label, value]) => <Row key={label} icon={icon} label={label} value={value} />)}</List>
      <div className={`${f.memo} ${styles.card}`}><small>{t.memoFrom}</small>{t.memo}</div>
    </>
  )
}

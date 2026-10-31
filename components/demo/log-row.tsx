'use client'

import type { CSSProperties } from 'react'
import type { KidId, LogItem } from '@/lib/demo'
import { Ico } from './sticker-ico'
import { useDemo } from './demo'
import styles from './demo.module.css'

export function KidTag({ id }: { id: KidId | null }) {
  const { data } = useDemo()
  if (!id) return null
  return <span className={styles.tag} style={{ '--tc': data.kids[id].tone } as CSSProperties}>{data.kids[id].name}</span>
}

export function LogRow({ item }: { item: LogItem }) {
  return (
    <li className={`${styles.log} ${styles.card}`}>
      <Ico name={item.icon} />
      <div>
        <b>{item.label}<KidTag id={item.kid} /></b>
        <span>{item.value}</span>
      </div>
      <time>{item.time}</time>
    </li>
  )
}

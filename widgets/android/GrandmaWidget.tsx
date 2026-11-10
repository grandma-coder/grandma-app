/** Android home-screen widget layouts (small / medium / large), drawn from a resolved snapshot entry. */
import React from 'react'
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget'
import type { Resolved } from './resolve'

type Size = 'small' | 'medium' | 'large'
type Hex = `#${string}`

const CREAM: Hex = '#FBF6EA'
const INK: Hex = '#161513'
const INK_SOFT: Hex = '#4F4B43'
const INK_MUTED: Hex = '#8C877C'
const ACCENT: Record<string, { soft: Hex; ink: Hex }> = {
  cycle: { soft: '#F9CFE0', ink: '#8E3A56' },
  pregnancy: { soft: '#DCCFF9', ink: '#3A2A6E' },
  kids: { soft: '#CFE1FA', ink: '#1F4A7A' },
  menopause: { soft: '#FBD3B3', ink: '#8B4A26' },
}
const PHASE: Record<string, Hex> = { m: '#EC4B3C', f: '#9ED8B0', o: '#F9C846', l: '#B69CF2' }

export function sizeFor(widthDp: number, heightDp: number): Size {
  if (heightDp >= 300) return 'large'
  if (heightDp >= 180 && widthDp >= 250) return 'large'
  if (widthDp >= 250) return 'medium'
  return 'small'
}

/** "2h" / "35m" since an ISO timestamp — Android re-renders on its update interval. */
export function sinceText(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`
}

export function GrandmaWidget({ resolved, size }: { resolved: Resolved; size: Size }) {
  if (resolved.kind === 'message') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: CREAM, borderRadius: 22, padding: 14, justifyContent: 'center', alignItems: 'center' }}
      >
        <TextWidget text="Grandma" style={{ fontSize: 12, color: INK_MUTED, fontWeight: '700' }} />
        <TextWidget text={resolved.text} maxLines={3} style={{ fontSize: 15, color: INK, fontWeight: '600', textAlign: 'center', marginTop: 6 }} />
      </FlexWidget>
    )
  }

  const { entry, day, stats, series } = resolved
  const accent = ACCENT[entry.journey] ?? ACCENT.menopause
  const empty = entry.state === 'empty'

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: entry.openUrl }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: CREAM, borderRadius: 22, padding: 14, flexDirection: 'column' }}
    >
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={entry.name.toUpperCase()} maxLines={1} style={{ fontSize: 11, color: accent.ink, fontWeight: '700' }} />
          {empty ? (
            <TextWidget text={entry.emptyText ?? ''} maxLines={4} style={{ fontSize: 14, color: INK, fontWeight: '600', marginTop: 4 }} />
          ) : (
            <>
              <TextWidget text={day?.title ?? ''} maxLines={2} style={{ fontSize: size === 'small' ? 16 : 19, color: INK, fontWeight: '700', marginTop: 4 }} />
              {day?.subtitle ? <TextWidget text={day.subtitle} maxLines={2} style={{ fontSize: 12, color: INK_SOFT, marginTop: 2 }} /> : null}
              {entry.sinceLast ? (
                <TextWidget text={`${sinceText(entry.sinceLast.at)} ${entry.sinceLast.label}`} maxLines={1} style={{ fontSize: 12, color: INK_SOFT, marginTop: 2 }} />
              ) : null}
            </>
          )}
        </FlexWidget>
        {entry.image ? (
          <ImageWidget image={`data:image/png;base64,${entry.image}`} imageWidth={size === 'small' ? 44 : 64} imageHeight={size === 'small' ? 44 : 64} />
        ) : null}
      </FlexWidget>

      {size !== 'small' ? (
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 10 }}>
          {entry.buttons.map((b, i) => (
            <FlexWidget
              key={b.url}
              clickAction="OPEN_URI"
              clickActionData={{ uri: b.url }}
              style={{ flex: 1, backgroundColor: accent.soft, borderRadius: 16, paddingVertical: 8, marginLeft: i === 0 ? 0 : 6, alignItems: 'center' }}
            >
              <TextWidget text={b.label} maxLines={1} style={{ fontSize: 12, color: accent.ink, fontWeight: '600' }} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : null}

      {size === 'large' ? (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 10 }}>
          {day?.strip ? (
            <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginBottom: 8 }}>
              {day.strip.phases.map((p, i) => (
                <FlexWidget
                  key={i}
                  style={{
                    flex: 1, height: 8, marginLeft: i === 0 ? 0 : 2, borderRadius: 4, backgroundColor: PHASE[p] ?? PHASE.l,
                    borderWidth: i + 1 === day.strip!.today ? 2 : 0, borderColor: INK,
                  }}
                />
              ))}
            </FlexWidget>
          ) : null}
          {day?.progress != null ? (
            <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height: 10, borderRadius: 5, backgroundColor: '#EDE7DA', marginBottom: 8 }}>
              <FlexWidget style={{ flex: Math.max(1, Math.round(day.progress * 100)), height: 10, borderRadius: 5, backgroundColor: accent.soft }} />
              <FlexWidget style={{ flex: Math.max(1, 100 - Math.round(day.progress * 100)), height: 10 }} />
            </FlexWidget>
          ) : null}
          {stats.map((s) => (
            <FlexWidget key={s.label} style={{ flexDirection: 'row', width: 'match_parent', marginTop: 4 }}>
              <TextWidget text={s.label} maxLines={1} style={{ fontSize: 12, color: INK_SOFT }} />
              <FlexWidget style={{ flex: 1 }} />
              <TextWidget text={s.value} maxLines={1} style={{ fontSize: 12, color: INK, fontWeight: '600' }} />
            </FlexWidget>
          ))}
          {series && entry.series ? (
            <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 8 }}>
              <TextWidget text={entry.series.label} style={{ fontSize: 11, color: INK_MUTED }} />
              <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height: 36, alignItems: 'flex-end', marginTop: 4 }}>
                {series.map((v, i) => {
                  const top = Math.max(entry.series!.kind === 'moods' ? 5 : 1, ...series)
                  return (
                    <FlexWidget
                      key={i}
                      style={{ flex: 1, marginLeft: i === 0 ? 0 : 6, height: Math.max(4, Math.round((36 * v) / top)), borderRadius: 3, backgroundColor: v > 0 ? accent.soft : '#EDE7DA' }}
                    />
                  )
                })}
              </FlexWidget>
            </FlexWidget>
          ) : null}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  )
}

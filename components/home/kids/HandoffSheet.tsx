/**
 * HandoffSheet — one-tap "what happened since…" summary for handing a child over
 * (nanny, grandparent, partner). Pick a start time, read the live preview, send it
 * through the phone's share sheet (or copy it).
 *
 * The text comes from the pure builder in lib/kidsHandoff.ts. Emoji live only in the
 * shared text; the in-app preview uses site stickers from KIDS_LOG_STICKER.
 * Light (site-look) only — KidsHome opens it from the non-Diffuse branch.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, Platform, Share, StyleSheet } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import * as Clipboard from 'expo-clipboard'
import { useQuery } from '@tanstack/react-query'
import { useTheme, getModeColorSoft } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { LogSheet, SheetFooterAction } from '../../calendar/LogSheet'
import { SiteChoice } from '../../ui/SiteChoice'
import { EyeAction, ACTION_TONES } from '../../ui/AuthDock'
import { SiteSticker } from '../../stickers/SiteSticker'
import { SkeletonRow } from '../../ui/Skeleton'
import {
  buildKidsHandoff, handoffFetchFrom, morningSince, sinceFromClock, type HandoffLog,
} from '../../../lib/kidsHandoff'

type SinceMode = '2h' | '4h' | 'morning' | 'pick'

interface Props {
  visible: boolean
  onClose: () => void
  child: { id: string; name: string } | null | undefined
}

const EYEBROW = 'SpaceMono_400Regular'

function useHandoffLogs(childId: string | undefined, fromDate: string, enabled: boolean) {
  // 'kids-' prefix → refreshed by invalidateKidsLogQueries() after any kids log save.
  return useQuery({
    queryKey: ['kids-handoff-logs', childId, fromDate],
    queryFn: async (): Promise<HandoffLog[]> => {
      if (!childId) return []
      const { data, error } = await supabase
        .from('child_logs')
        .select('id, date, type, value, notes, created_at')
        .eq('child_id', childId)
        .gte('date', fromDate)
        .order('created_at', { ascending: true })
        .limit(500)
      if (error) throw error
      return (data ?? []) as HandoffLog[]
    },
    enabled: enabled && !!childId,
    staleTime: 30_000,
  })
}

export function HandoffSheet({ visible, onClose, child }: Props) {
  const { colors, font, isDark } = useTheme()
  const { t, language } = useTranslation()
  const tone = getModeColorSoft('kids', isDark)
  const ink = colors.text

  const [mode, setMode] = useState<SinceMode>('4h')
  const [picked, setPicked] = useState<{ h: number; m: number }>(() => {
    const d = new Date(Date.now() - 3 * 3600_000)
    return { h: d.getHours(), m: d.getMinutes() }
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // "Now" is pinned per opening / selection so the preview doesn't drift mid-read.
  const now = useMemo(() => new Date(), [visible, mode, picked])

  useEffect(() => {
    if (!visible) { setPickerOpen(false); setCopied(false) }
  }, [visible])
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current) }, [])

  const since = useMemo(() => {
    if (mode === '2h') return new Date(now.getTime() - 2 * 3600_000)
    if (mode === '4h') return new Date(now.getTime() - 4 * 3600_000)
    if (mode === 'morning') return morningSince(now)
    return sinceFromClock(picked.h, picked.m, now)
  }, [mode, picked, now])

  const fromDate = handoffFetchFrom(since)
  const { data: logs, isLoading } = useHandoffLogs(child?.id, fromDate, visible)

  const handoff = useMemo(
    () => (child && logs ? buildKidsHandoff(logs, child, since, now, t, language) : null),
    [child, logs, since, now, t, language],
  )

  const fmtTime = (d: Date) => {
    try { return d.toLocaleTimeString(language === 'en' ? 'en-US' : language, { hour: 'numeric', minute: '2-digit' }) }
    catch { return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` }
  }
  const sixAm = useMemo(() => { const d = new Date(); d.setHours(6, 0, 0, 0); return d }, [])
  const pickedDate = useMemo(() => { const d = new Date(); d.setHours(picked.h, picked.m, 0, 0); return d }, [picked])

  function choose(next: SinceMode) {
    setMode(next)
    setPickerOpen(next === 'pick' ? !pickerOpen || mode !== 'pick' : false)
  }

  function onPickTime(event: DateTimePickerEvent, d?: Date) {
    if (Platform.OS === 'android') setPickerOpen(false)
    if (event.type === 'dismissed' || !d) return
    setPicked({ h: d.getHours(), m: d.getMinutes() })
  }

  async function share() {
    if (!handoff) return
    try { await Share.share({ message: handoff.text }) } catch {}
  }

  async function copy() {
    if (!handoff) return
    await Clipboard.setStringAsync(handoff.text)
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1600)
  }

  const loading = isLoading && !logs
  const eyebrow = [styles.eyebrow, { color: colors.textMuted, fontFamily: EYEBROW }]

  return (
    <LogSheet visible={visible} onClose={onClose} title={t('handoff_action')} sticker="bubble" chip={child?.name}>
      {/* Since — single-select chips; Pick time opens the clock wheel. */}
      <Text style={eyebrow}>{t('handoff_since')}</Text>
      <View style={styles.chips}>
        <SiteChoice compact tick={false} tone={tone} label={t('handoff_chip2h')} selected={mode === '2h'} onPress={() => choose('2h')} />
        <SiteChoice compact tick={false} tone={tone} label={t('handoff_chip4h')} selected={mode === '4h'} onPress={() => choose('4h')} />
        <SiteChoice compact tick={false} tone={tone} label={`${t('handoff_chipMorning')} · ${fmtTime(sixAm)}`} selected={mode === 'morning'} onPress={() => choose('morning')} />
        <SiteChoice compact tick={false} tone={tone} sticker="cal"
          label={mode === 'pick' ? fmtTime(pickedDate) : t('handoff_chipPick')}
          selected={mode === 'pick'} onPress={() => choose('pick')} />
      </View>

      {pickerOpen && mode === 'pick' ? (
        <View style={[styles.pickerWrap, { borderColor: ink, backgroundColor: colors.surface }]}>
          <DateTimePicker
            value={pickedDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={Platform.OS === 'ios' ? ink : undefined}
            onChange={onPickTime}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} style={({ pressed }) => [styles.pickerDone, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: ink }}>{t('common_done')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Live preview — quiet rows, sticker per type, hairlines between. */}
      <Text style={[eyebrow, { marginTop: 22 }]}>{t('handoff_summary')}</Text>
      {loading ? (
        <View>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : handoff ? (
        <View>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 16, color: ink, marginBottom: 4 }}>
            {/* Empty → the builder's "Nothing logged for … since …" line (first line of its text). */}
            {handoff.empty ? handoff.text.split('\n')[0] : handoff.title}
          </Text>
          {handoff.lines.map((line, i) => (
            <View
              key={`${line.kind}-${i}`}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <SiteSticker name={line.sticker} size={28} />
              <Text style={{ flex: 1, fontFamily: font.body, fontSize: 15, lineHeight: 21, color: ink }}>{line.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <SheetFooterAction>
        <View style={styles.footer}>
          <EyeAction
            label={t('handoff_share')}
            onPress={share}
            ink={ink}
            disabled={!handoff}
            sticker="bubble"
            fill={ACTION_TONES.blue}
            size={64}
          />
          <Pressable onPress={copy} disabled={!handoff} hitSlop={10} style={({ pressed }) => ({ opacity: pressed || !handoff ? 0.6 : 1, paddingVertical: 6 })}>
            <Text style={{ fontFamily: font.bodySemiBold, fontSize: 14, color: copied ? ink : colors.textMuted, textDecorationLine: copied ? 'none' : 'underline' }}>
              {copied ? t('handoff_copied') : t('handoff_copy')}
            </Text>
          </Pressable>
        </View>
      </SheetFooterAction>
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerWrap: { marginTop: 12, borderWidth: 1.5, borderRadius: 18, paddingVertical: 4, alignItems: 'center' },
  pickerDone: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
})

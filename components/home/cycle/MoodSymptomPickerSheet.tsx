/**
 * MoodSymptomPickerSheet — full symptom picker, opens from the card's "more".
 * Writes one row per selected symptom to cycle_logs, using the canonical
 * symptom ids from lib/cycleSymptoms (shared with the calendar log forms).
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { toDateStr } from '../../../lib/cycleLogic'
import { ALL_SYMPTOMS } from '../../../lib/cycleSymptoms'
import { SymptomSticker } from '../../calendar/symptomStickers'
import { LogSheet } from '../../calendar/LogSheet'
import { PillButton } from '../../ui/PillButton'

interface Props {
  visible: boolean
  onClose: () => void
  initialSelected?: string[]
}

export function MoodSymptomPickerSheet({ visible, onClose, initialSelected = [] }: Props) {
  const { colors, stickers, font, isDark } = useTheme()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'
  const [picked, setPicked] = useState<string[]>(initialSelected)
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function save() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const today = toDateStr(new Date())
      // Replace today's symptom rows (one row per symptom) so toggling-off works.
      const { error: delErr } = await supabase
        .from('cycle_logs')
        .delete()
        .eq('user_id', session.user.id)
        .eq('type', 'symptom')
        .eq('date', today)
      if (delErr) throw delErr
      if (picked.length > 0) {
        const rows = picked.map((id) => ({
          user_id: session.user.id,
          date: today,
          type: 'symptom',
          value: id,
        }))
        const { error: insErr } = await supabase.from('cycle_logs').insert(rows)
        if (insErr) throw insErr
      }
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible={visible} title="Anything today?" onClose={onClose}>
      <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          {ALL_SYMPTOMS.map((s) => {
            const on = picked.includes(s.id)
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? stickers.pinkSoft : colors.surface,
                    borderColor: on ? ink : colors.border,
                    borderWidth: on ? 2 : 1,
                  },
                ]}
              >
                <SymptomSticker id={s.id} size={16} />
                <Text style={{ color: ink, fontFamily: font.bodyBold, fontSize: 12 }}>{s.label}</Text>
              </Pressable>
            )
          })}
        </View>
        <PillButton
          label={saving ? 'Saving…' : `Save ${picked.length} symptom${picked.length === 1 ? '' : 's'}`}
          variant="accent"
          accentColor={stickers.pink}
          onPress={save}
          disabled={saving}
        />
      </ScrollView>
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
  },
})

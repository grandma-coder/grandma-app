/**
 * MenopauseLogSheet — the "Log activity" tile-grid launcher for menopause, the
 * exact analogue of cycle's LogActivitySheet. A bottom sheet of tiles (one per
 * symptom + a Period tile for peri); tapping a tile calls onPick(type) and the
 * host opens the matching form for the active date. Reuses the shared
 * LogTile / LogTileGrid so it's visually identical to the cycle launcher.
 */
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Display } from '../ui/Typography'
import { LogTile, LogTileGrid } from '../calendar/LogTile'
import { Character } from '../characters/Characters'
import { ALL_MENOPAUSE_SYMPTOMS, menopauseSymptomLabel, type MenopauseSymptomId } from '../../lib/menopauseSymptoms'
import { symptomBlob, symptomStickerKey } from './menopauseIcons'

export type MenopauseLogPick = MenopauseSymptomId | 'period'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (type: MenopauseLogPick) => void
  /** Peri users get the Period tile (resets the "months since last period"). */
  isPeri: boolean
  title?: string
}

export function MenopauseLogSheet({ open, onClose, onPick, isPeri, title }: Props) {
  const { colors, isDark, stickers } = useTheme()
  const st = stickers as Record<string, string>
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const bg = diffuse ? dt.colors.bg : (isDark ? colors.bg : '#F3ECD9')
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')

  function pick(type: MenopauseLogPick) {
    onClose()
    onPick(type)
  }

  const heading = title ?? 'Log activity'

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }, diffuse ? { borderTopWidth: 1, borderColor: dt.colors.line } : null]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: diffuse ? dt.colors.line2 : paperBorder }]} />
        </View>
        <View style={styles.header}>
          {diffuse ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 22, color: dt.colors.ink, letterSpacing: -0.3 }}>{heading}</Text>
          ) : (
            <Display size={22} color={ink}>{heading}</Display>
          )}
          <Pressable onPress={onClose} style={[styles.closeBtn, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline } : { backgroundColor: paper, borderColor: paperBorder }]}>
            <X size={18} color={ink} />
          </Pressable>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          <LogTileGrid>
            {ALL_MENOPAUSE_SYMPTOMS.map((s) => {
              const key = symptomStickerKey(s.id)
              return (
                <LogTile
                  key={s.id}
                  label={menopauseSymptomLabel(s.id)}
                  tint={key}
                  icon={<Character name={symptomBlob(s.id)} size={34} color={st[`${key}Ink`]} />}
                  onPress={() => pick(s.id)}
                />
              )
            })}
            {isPeri ? (
              <LogTile
                key="period"
                label="Period"
                tint="coral"
                icon={<Character name="period" size={34} color={st.coralInk} />}
                onPress={() => pick('period')}
              />
            ) : null}
          </LogTileGrid>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,6,0.55)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%' },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 42, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  closeBtn: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20 },
  bodyContent: { paddingBottom: 8 },
})

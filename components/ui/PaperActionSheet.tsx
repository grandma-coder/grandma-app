/**
 * PaperActionSheet — a paper-styled replacement for a multi-choice
 * Alert.alert() action sheet.
 *
 * Alert.alert with 3+ buttons renders the raw iOS/Android system sheet, which
 * breaks the cream-paper / Diffuse design language. This is a bottom-anchored
 * Modal listing choices as paper rows, mirroring the styling conventions in
 * PaperAlert.tsx (surface card, hairline border, serif/serif-mono title,
 * pill/rounded rows, backdrop rgba). Handles both the current (useTheme) and
 * Diffuse (useDiffuseTheme) variants.
 *
 *   const [sheet, setSheet] = useState<{ title?: string; items: ActionSheetItem[] } | null>(null)
 *   ...
 *   setSheet({ title: t('someTitle'), items: [{ label: 'Reply', onPress: () => … }] })
 *   ...
 *   <PaperActionSheet
 *     visible={!!sheet}
 *     title={sheet?.title}
 *     items={sheet?.items ?? []}
 *     onRequestClose={() => setSheet(null)}
 *   />
 */

import { type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, radius, spacing, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

export interface ActionSheetItem {
  label: string
  onPress: () => void
  danger?: boolean
  icon?: ReactNode
}

interface PaperActionSheetProps {
  visible: boolean
  title?: string
  message?: string
  items: ActionSheetItem[]
  cancelLabel?: string
  onRequestClose: () => void
}

export function PaperActionSheet(props: PaperActionSheetProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseActionSheet {...props} /> : <CurrentActionSheet {...props} />
}

// ─── Current — cream-paper card, filled soft rows, serif title ─────────────

function CurrentActionSheet({
  visible,
  title,
  message,
  items,
  cancelLabel = 'Cancel',
  onRequestClose,
}: PaperActionSheetProps) {
  const { colors, font, stickers } = useTheme()
  const insets = useSafeAreaInsets()

  const handle = (item: ActionSheetItem) => {
    item.onPress()
    onRequestClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} />
      <View pointerEvents="box-none" style={styles.anchor}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: (insets.bottom || spacing.md) + spacing.xs,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.textMuted + '55' }]} />

          {title ? (
            <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>{title}</Text>
          ) : null}
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary, fontFamily: font.body }]}>{message}</Text>
          ) : null}

          <View style={styles.rows}>
            {items.map((item, i) => {
              const fg = item.danger ? stickers.coral : colors.text
              const bg = item.danger ? stickers.coralInk + '14' : colors.surfaceRaised
              return (
                <Pressable
                  key={i}
                  onPress={() => handle(item)}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  {item.icon ? <View style={styles.rowIcon}>{item.icon}</View> : null}
                  <Text style={[styles.rowLabel, { color: fg, fontFamily: font.bodySemiBold }]}>{item.label}</Text>
                </Pressable>
              )
            })}
          </View>

          <Pressable
            onPress={onRequestClose}
            style={({ pressed }) => [
              styles.cancelRow,
              { borderColor: colors.borderStrong, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.rowLabel, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// ─── Diffuse — hairline card, mono uppercase rows, serif title ─────────────

function DiffuseActionSheet({
  visible,
  title,
  message,
  items,
  cancelLabel = 'Cancel',
  onRequestClose,
}: PaperActionSheetProps) {
  const { colors } = useDiffuseTheme()
  const insets = useSafeAreaInsets()

  const handle = (item: ActionSheetItem) => {
    item.onPress()
    onRequestClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} />
      <View pointerEvents="box-none" style={styles.anchor}>
        <View
          style={[
            styles.card,
            diffuseStyles.card,
            {
              backgroundColor: colors.bg,
              borderColor: colors.line,
              paddingBottom: (insets.bottom || spacing.md) + spacing.xs,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.line2 }]} />

          {title ? (
            <Text style={[styles.title, { color: colors.ink, fontFamily: diffuseFont.display }]}>{title}</Text>
          ) : null}
          {message ? (
            <Text style={[styles.message, { color: colors.ink3, fontFamily: diffuseFont.body }]}>{message}</Text>
          ) : null}

          <View style={diffuseStyles.rows}>
            {items.map((item, i) => {
              const fg = item.danger ? colors.error : colors.ink
              return (
                <Pressable
                  key={i}
                  onPress={() => handle(item)}
                  style={({ pressed }) => [
                    diffuseStyles.row,
                    { borderColor: colors.line, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  {item.icon ? <View style={styles.rowIcon}>{item.icon}</View> : null}
                  <Text style={[diffuseStyles.rowLabel, { color: fg }]}>{item.label}</Text>
                </Pressable>
              )
            })}
          </View>

          <Pressable
            onPress={onRequestClose}
            style={({ pressed }) => [diffuseStyles.cancelRow, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[diffuseStyles.rowLabel, { color: colors.ink3 }]}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#141313',
    opacity: 0.4,
  },
  anchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md - 2,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 14,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 26,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  rows: {
    marginTop: spacing.md,
    gap: 8,
  },
  row: {
    minHeight: 54,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  rowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    textAlign: 'center',
  },
  cancelRow: {
    minHeight: 54,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
})

const diffuseStyles = StyleSheet.create({
  card: {
    shadowColor: '#1A1916',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 10,
  },
  rows: {
    marginTop: spacing.md,
    gap: 2,
  },
  row: {
    minHeight: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  rowLabel: {
    fontFamily: diffuseFont.mono,
    fontSize: 12.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  cancelRow: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
})

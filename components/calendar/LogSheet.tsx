/**
 * LogSheet (Apr 2026 redesign) — bottom sheet shell used by every log form.
 *
 * Paper bg, drag handle, Fraunces serif title, paper close circle,
 * warm dark overlay.
 */

import { ReactNode, createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { View, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform, Text, ScrollView } from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, font, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { Display } from '../ui/Typography'
import { InkBackButton } from '../ui/InkBackButton'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { StickerEnter } from '../ui/Motion'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { SheetModal } from '../ui/SheetModal'
import { useTranslation } from '../../lib/i18n'

// Forms rendered inside a sheet hand their primary action to the sheet so it sits in a
// fixed footer — always visible, never scrolled away. Outside a sheet it renders inline.
// Each footer registers under its own owner. When a wizard swaps steps, the old step's cleanup
// runs after the new step registered, so it may only clear the slot if the slot is still its own
// (clearing unconditionally left the new step with no buttons until something re-rendered).
type SlotSetter = (owner: object, node: ReactNode | null) => void
const FooterSlot = createContext<SlotSetter | null>(null)

export function SheetFooterAction({ children }: { children: ReactNode }) {
  const set = useContext(FooterSlot)
  const owner = useRef({}).current
  useLayoutEffect(() => { set?.(owner, children) })
  useEffect(() => () => { set?.(owner, null) }, [set, owner])
  return set ? null : <>{children}</>
}

function useFooterSlot(): [ReactNode, SlotSetter] {
  const [slot, setSlotState] = useState<{ owner: object; node: ReactNode } | null>(null)
  const setSlot = useCallback<SlotSetter>((owner, node) => {
    setSlotState((prev) => (node === null ? (prev?.owner === owner ? null : prev) : { owner, node }))
  }, [])
  return [slot?.node ?? null, setSlot]
}

interface LogSheetProps {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Optional chip shown next to the title — e.g. child name pill */
  chip?: string
  chipColor?: string
  /** Replace default title with a custom node */
  titleRight?: ReactNode
  /** Optional pinned action bar rendered below the scroll area (not scrolled).
   *  Used by the quick-log pickers to keep SAVE always visible. */
  footer?: ReactNode
  /** Site look: a sticker beside the title. */
  sticker?: SiteStickerName
}

export function LogSheet(props: LogSheetProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseLogSheet {...props} /> : <CurrentLogSheet {...props} />
}

function CurrentLogSheet({ visible, title, onClose, children, chip, chipColor, titleRight, footer, sticker }: LogSheetProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const [slot, setSlot] = useFooterSlot()
  const footerNode = footer ?? slot
  const insets = useSafeAreaInsets()

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.borderStrong
  const ink = colors.text

  // Backdrop fades, sheet eases up, both play out on close (SheetModal); drag the handle/header down to close.
  return (
    <SheetModal visible={visible} onClose={onClose}>
      {(dragZone) => (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: bg,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 2.5,
              borderLeftWidth: 0,
              borderRightWidth: 0,
              borderColor: ink,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
            },
          ]}
        >
          <View {...dragZone}>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: ink, opacity: 0.25 }]} />
            </View>

            <View style={styles.header}>
              <View style={styles.titleRow}>
                {sticker ? <StickerEnter delay={180} tilt={-8}><SiteSticker name={sticker} size={34} cut /></StickerEnter> : null}
                <Display size={24} color={ink} style={{ textTransform: 'uppercase', letterSpacing: 0.2, flexShrink: 1 }}>{title}</Display>
                {chip ? (
                  <View style={[styles.chip, { backgroundColor: paper, borderColor: ink }]}>
                    <Text style={[styles.chipText, { color: ink }]}>{chip}</Text>
                  </View>
                ) : null}
                {titleRight}
              </View>
              <InkBackButton onPress={onClose} ink={ink} paper={paper} icon="close" label={t('common_close')} style={{ marginBottom: 0 }} />
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FooterSlot.Provider value={setSlot}>{children}</FooterSlot.Provider>
          </ScrollView>

          {footerNode ? (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {footerNode}
            </View>
          ) : null}
        </View>
      )}
    </SheetModal>
  )
}

// ─── Diffuse — softer sheet, serif title, hairline chip + close node ────────

function DiffuseLogSheet({ visible, title, onClose, children, chip, chipColor, titleRight, footer }: LogSheetProps) {
  const { colors } = useDiffuseTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.line2 }]} />
          </View>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 24, letterSpacing: -0.3, color: colors.ink }}>
                {title}
              </Text>
              {chip ? (
                <View style={[diffuseStyles.chip, { borderColor: chipColor ?? colors.line2 }]}>
                  <Text style={[diffuseStyles.chipText, { color: colors.ink3 }]}>{chip}</Text>
                </View>
              ) : null}
              {titleRight}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={[styles.closeBtn, { backgroundColor: 'transparent', borderColor: colors.hairline }]}>
                <X size={18} color={colors.ink} />
              </View>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View style={[styles.footer, { borderTopColor: colors.hairline }]}>
              {footer}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,19,19,0.55)',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '95%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 11,
    fontFamily: font.bodyBold,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: '100%',
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})

const diffuseStyles = StyleSheet.create({
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
})

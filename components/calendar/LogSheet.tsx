/**
 * LogSheet (Apr 2026 redesign) — bottom sheet shell used by every log form.
 *
 * Paper bg, drag handle, Fraunces serif title, paper close circle,
 * warm dark overlay.
 */

import { View, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Display } from '../ui/Typography'

interface LogSheetProps {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function LogSheet({ visible, title, onClose, children }: LogSheetProps) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: bg,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: paperBorder }]} />
          </View>

          <View style={styles.header}>
            <Display size={22} color={ink}>{title}</Display>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={[styles.closeBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Ionicons name="close" size={18} color={ink} />
              </View>
            </Pressable>
          </View>

          <View style={styles.content}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,8,6,0.55)',
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
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
})

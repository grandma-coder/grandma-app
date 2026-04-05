/**
 * FullScreenChart — modal overlay for expanded chart view.
 *
 * Shows chart at full width with title and share/export button.
 */

import { View, Text, Pressable, Modal, StyleSheet, Dimensions, Share } from 'react-native'
import { X, Share2 } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'

const SCREEN_WIDTH = Dimensions.get('window').width

interface FullScreenChartProps {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function FullScreenChart({ visible, title, onClose, children }: FullScreenChartProps) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  async function handleShare() {
    try {
      await Share.share({ message: `${title} — Shared from grandma.app` })
    } catch {}
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.iconBtn}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={handleShare} style={styles.iconBtn}>
            <Share2 size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Chart content — render at full width */}
        <View style={styles.chartArea}>{children}</View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  chartArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
})

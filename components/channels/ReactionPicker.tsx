/**
 * Reaction picker (Phase 3). A small floating row of the 4 reaction types,
 * shown on long-press of a message. The schema has always supported 4
 * (heart/like/celebrate/support) but the UI only exposed heart — this surfaces
 * them. Tapping the current reaction removes it; tapping another switches.
 *
 * Cream + diffuse. Rendered as a centered modal overlay (simple + reliable
 * across the message list without per-row positioning math).
 */

import { Modal, Pressable, View, Text, StyleSheet } from 'react-native'
import { MoreHorizontal } from 'lucide-react-native'
import { useTheme, useDiffuseTheme } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { REACTION_TYPES, type ReactionType } from '../../lib/channelPosts'

const EMOJI: Record<ReactionType, string> = {
  heart: '❤️',
  like: '👍',
  celebrate: '🎉',
  support: '🤗',
}

interface Props {
  visible: boolean
  current: ReactionType | null | undefined
  onPick: (type: ReactionType) => void
  onMore: () => void
  onClose: () => void
}

export function ReactionPicker({ visible, current, onPick, onMore, onClose }: Props) {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const barBg = diffuse ? dt.colors.surface : colors.surface
  const barBorder = diffuse ? dt.colors.line : colors.border
  const activeBg = diffuse ? dt.colors.surfaceRaised : colors.bgWarm
  const ink = diffuse ? dt.colors.ink3 : colors.textMuted

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.bar, { backgroundColor: barBg, borderColor: barBorder, borderRadius: radius.full }]}
          onPress={(e) => e.stopPropagation()}
        >
          {REACTION_TYPES.map((type) => {
            const isCurrent = current === type
            return (
              <Pressable
                key={type}
                onPress={() => onPick(type)}
                style={({ pressed }) => [
                  styles.emojiBtn,
                  isCurrent && { backgroundColor: activeBg, borderRadius: 999 },
                  pressed && { transform: [{ scale: 1.15 }] },
                ]}
              >
                <Text style={styles.emoji}>{EMOJI[type]}</Text>
              </Pressable>
            )
          })}
          {/* Divider + More (reply / delete / report / block) */}
          <View style={[styles.divider, { backgroundColor: barBorder }]} />
          <Pressable onPress={onMore} style={({ pressed }) => [styles.emojiBtn, pressed && { opacity: 0.6 }]}>
            <MoreHorizontal size={24} color={ink} strokeWidth={2} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,19,19,0.28)' },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  emojiBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30 },
  divider: { width: 1, height: 28, marginHorizontal: 2 },
})

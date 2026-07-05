import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getThreads, type Thread } from '../../lib/channels'
import { ThreadCard } from '../../components/channels/ThreadCard'
import { typography, spacing, useTheme, font } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'

export default function ChannelDetail() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      getThreads(id)
        .then(setThreads)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [id])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t('channelDetail_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {threads.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{t('channelDetail_emptyIcon')}</Text>
            <Text style={styles.emptyTitle}>{t('channelDetail_emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('channelDetail_emptySubtitle')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            renderItem={({ item }: { item: Thread }) => (
              <ThreadCard
                thread={item}
                onPress={() => router.push(`/channels/thread/${item.id}`)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    ...typography.title,
  },
  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 40,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12, fontFamily: font.display },
  emptyTitle: {
    ...typography.title,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})

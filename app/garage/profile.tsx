/**
 * Garage Profile — My Posts, Saved items, activity overview.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft,
  Grid3X3,
  Bookmark,
  ShoppingBag,
  Trash2,
  User,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { isIconAvatar } from '../../components/ui/AvatarPicker'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { PaperAlert } from '../../components/ui/PaperAlert'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'
import { deletePost, toggleSave, type GaragePost } from '../../lib/garagePosts'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../../components/ui/diffuse/DiffusePrimitives'
import { Character } from '../../components/characters/Characters'

const SCREEN_W = Dimensions.get('window').width
const THUMB_SIZE = (SCREEN_W - 4) / 3 // 3 columns, 2px gaps

type Tab = 'posts' | 'saved'

export default function GarageProfileScreen() {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const [tab, setTab] = useState<Tab>('posts')
  const [myPosts, setMyPosts] = useState<GaragePost[]>([])
  const [savedPosts, setSavedPosts] = useState<GaragePost[]>([])
  const [loading, setLoading] = useState(true)
  const [postCount, setPostCount] = useState(0)
  const [savedCount, setSavedCount] = useState(0)

  // User profile
  const [userName, setUserName] = useState<string | null>(null)
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  // Pending deletion — when set, the PaperAlert confirms before deletePost() runs.
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      setUserEmail(session.user.email ?? null)
      setMemberSince(
        new Date(session.user.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      )

      // Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, photo_url')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setUserName(profile.name ?? null)
        setUserPhoto(profile.photo_url ?? null)
      }

      // My posts
      const { data: posts } = await supabase
        .from('garage_posts')
        .select('*')
        .eq('author_id', session.user.id)
        .order('created_at', { ascending: false })

      const myData = (posts ?? []) as GaragePost[]
      setMyPosts(myData)
      setPostCount(myData.length)

      // Saved posts
      const { data: saves } = await supabase
        .from('garage_post_saves')
        .select('post_id')
        .eq('user_id', session.user.id)

      if (saves && saves.length > 0) {
        const savedIds = saves.map((s: any) => s.post_id)
        const { data: savedData } = await supabase
          .from('garage_posts')
          .select('*')
          .in('id', savedIds)
          .order('created_at', { ascending: false })

        const saved = (savedData ?? []) as GaragePost[]
        setSavedPosts(saved)
        setSavedCount(saved.length)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  function handleDelete(postId: string) {
    setPendingDelete(postId)
  }

  async function confirmDelete() {
    const postId = pendingDelete
    if (!postId) return
    setPendingDelete(null)
    setMyPosts((prev) => prev.filter((p) => p.id !== postId))
    setPostCount((c) => c - 1)
    try {
      await deletePost(postId)
    } catch {
      setErrorMsg(t('garage_profile_errorDeletePost'))
      load() // re-sync — the optimistic removal gets reversed
    }
  }

  function handleUnsave(postId: string) {
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId))
    setSavedCount((c) => c - 1)
    toggleSave(postId).catch(() => {
      setErrorMsg(t('garage_profile_errorUnsave'))
      load()
    })
  }

  const currentData = tab === 'posts' ? myPosts : savedPosts

  return (
    <View style={[s.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <ArrowLeft size={24} color={diffuse ? dt.colors.ink : colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, diffuse
          ? { color: dt.colors.ink, fontFamily: diffuseFont.display }
          : { color: colors.text }]}>{t('garage_profile_myVillage')}</Text>
        <View style={s.headerBtn} />
      </View>

      {/* User profile section */}
      <View style={s.profileSection}>
        {/* Avatar */}
        {userPhoto && !isIconAvatar(userPhoto) ? (
          <Image source={{ uri: userPhoto }} style={[s.profileAvatar, { borderColor: diffuse ? dt.colors.line2 : colors.primary }]} />
        ) : (
          <View style={[s.profileAvatarPlaceholder, diffuse
            ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
            : { backgroundColor: colors.surfaceRaised, borderColor: colors.primary }]}>
            <User size={32} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={1.5} />
          </View>
        )}

        {/* Stats */}
        <View style={s.profileStats}>
          <View style={s.statItem}>
            <Text style={[s.statNumber, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text }]}>{postCount}</Text>
            <Text style={[s.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.2 } : { color: colors.textMuted }]}>{t('garage_profile_posts')}</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statNumber, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text }]}>{savedCount}</Text>
            <Text style={[s.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.2 } : { color: colors.textMuted }]}>{t('garage_profile_saved')}</Text>
          </View>
        </View>
      </View>

      {/* Name & info */}
      <View style={s.profileInfo}>
        <Text style={[s.profileName, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.display } : { color: colors.text }]}>
          {userName || userEmail?.split('@')[0] || t('garage_profile_myProfile')}
        </Text>
        {memberSince && (
          <Text style={[s.profileMeta, diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }
            : { color: colors.textMuted }]}>
            {t('garage_profile_memberSince', { date: memberSince })}
          </Text>
        )}
      </View>


      {/* Tab bar */}
      <View style={[s.tabBar, { borderBottomColor: diffuse ? dt.colors.line : colors.borderLight }]}>
        <Pressable
          onPress={() => setTab('posts')}
          style={[s.tabBtn, tab === 'posts' && { borderBottomColor: diffuse ? dt.colors.hairline : colors.primary, borderBottomWidth: 2 }]}
        >
          <Grid3X3
            size={22}
            color={tab === 'posts' ? (diffuse ? dt.colors.ink : colors.primary) : (diffuse ? dt.colors.ink3 : colors.textMuted)}
            strokeWidth={2}
          />
        </Pressable>
        <Pressable
          onPress={() => setTab('saved')}
          style={[s.tabBtn, tab === 'saved' && { borderBottomColor: diffuse ? dt.colors.hairline : colors.primary, borderBottomWidth: 2 }]}
        >
          <Bookmark
            size={22}
            color={tab === 'saved' ? (diffuse ? dt.colors.ink : colors.primary) : (diffuse ? dt.colors.ink3 : colors.textMuted)}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <BrandedLoader />
        </View>
      ) : currentData.length === 0 ? (
        diffuse ? (
          tab === 'posts' ? (
            <DiffuseEmptyState
              icon={<DiffuseBloomIcon size={72} intensity={0.5}><Character name="marketplace" size={34} color={dt.colors.ink3} /></DiffuseBloomIcon>}
              title={t('garage_profile_emptyPostsTitle')}
              message={t('garage_profile_emptyPostsBody')}
              ctaLabel={t('garage_profile_createFirst')}
              onCta={() => router.push('/garage/create' as any)}
              style={s.emptyState}
            />
          ) : (
            <DiffuseEmptyState
              icon={<DiffuseBloomIcon size={72} intensity={0.5}><Bookmark size={34} color={dt.colors.ink3} strokeWidth={1.6} /></DiffuseBloomIcon>}
              title={t('garage_profile_emptySavedTitle')}
              message={t('garage_profile_emptySavedBody')}
              style={s.emptyState}
            />
          )
        ) : (
        <View style={s.emptyState}>
          {tab === 'posts' ? (
            <>
              <ShoppingBag size={40} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>{t('garage_profile_emptyPostsTitle')}</Text>
              <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
                {t('garage_profile_emptyPostsBody')}
              </Text>
              <Pressable
                onPress={() => router.push('/garage/create' as any)}
                style={[s.emptyBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
              >
                <Text style={s.emptyBtnText}>{t('garage_profile_createFirst')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Bookmark size={40} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>{t('garage_profile_emptySavedTitle')}</Text>
              <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
                {t('garage_profile_emptySavedBody')}
              </Text>
            </>
          )}
        </View>
        )
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <PostThumbnail
              post={item}
              isOwner={tab === 'posts'}
              onPress={() => router.push(`/garage/${item.id}` as any)}
              onDelete={() => tab === 'posts' ? handleDelete(item.id) : handleUnsave(item.id)}
            />
          )}
        />
      )}

      <PaperAlert
        visible={pendingDelete !== null}
        title={t('garage_profile_deleteTitle')}
        message={t('garage_profile_deleteMsg')}
        buttons={[
          { label: 'Cancel', variant: 'secondary' },
          { label: t('garage_profile_deletePost'), variant: 'danger', onPress: confirmDelete },
        ]}
        onRequestClose={() => setPendingDelete(null)}
      />

      <PaperAlert
        visible={errorMsg !== null}
        title={t('garage_profile_errorTitle')}
        message={errorMsg ?? undefined}
        onRequestClose={() => setErrorMsg(null)}
      />
    </View>
  )
}

// ─── Post Thumbnail (grid item) ───────────────────────────────────────────

function PostThumbnail({
  post,
  isOwner,
  onPress,
  onDelete,
}: {
  post: GaragePost
  isOwner: boolean
  onPress: () => void
  onDelete: () => void
}) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const hasMedia = post.media.length > 0
  const coverUrl = hasMedia ? post.media[0].url : null

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        Alert.alert(
          isOwner ? t('garage_profile_postOptions') : t('garage_profile_savedPost'),
          post.caption?.slice(0, 80) ?? '',
          [
            { text: isOwner ? t('garage_profile_deletePost') : t('garage_profile_unsave'), style: 'destructive', onPress: onDelete },
            { text: 'Cancel', style: 'cancel' },
          ]
        )
      }}
      style={s.thumbWrap}
    >
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={s.thumbImage} />
      ) : (
        <View style={[s.thumbPlaceholder, { backgroundColor: diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised }]}>
          <Text style={{ fontSize: 24 }}>{t('garage_profile_thumbPlaceholderIcon')}</Text>
        </View>
      )}
      {/* Multi-media indicator */}
      {post.media.length > 1 && (
        <View style={s.multiIndicator}>
          <Grid3X3 size={14} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      )}
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Profile section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 24,
  },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2 },
  profileAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Profile info
  profileInfo: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Thumbnails
  thumbWrap: { width: THUMB_SIZE, height: THUMB_SIZE, padding: 1 },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  multiIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
})

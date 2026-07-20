/**
 * Memories — Social-media-style photo gallery.
 *
 * Features: search bar, child/month filters, 3-col grid,
 * tap to preview full-screen with caption/date/child,
 * long-press for edit/delete actions.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
  FlatList,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useFocusEffect } from 'expo-router'
import {
  Plus,
  Camera,
  Image as ImageIcon,
  Calendar,
  X,
  Check,
  Baby,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { SignedImage, PHOTO_BUCKETS } from '../../lib/photoSigning'
import { toDateStr } from '../../lib/cycleLogic'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { PillButton } from '../../components/ui/PillButton'
import { PaperAlert } from '../../components/ui/PaperAlert'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import { Heart as HeartSticker, Flower as FlowerSticker, Star as StarSticker } from '../../components/ui/Stickers'
import { Character } from '../../components/characters/Characters'
import { ChildPill, childColor } from '../../components/ui/ChildPills'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../../components/ui/diffuse/DiffusePrimitives'

const SCREEN_W = Dimensions.get('window').width
const GRID_GAP = 3
const PHOTO_SIZE = (SCREEN_W - 40 - GRID_GAP * 2) / 3

interface MemoryPost {
  logId: string
  childId: string
  childName: string
  date: string
  photos: string[]  // all photos in this log
  notes: string
}

// Diffuse hairline child-selector pill (replaces the filled ChildPill under diffuse)
function MemoriesChoicePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const dt = useDiffuseTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choicePill,
        {
          borderColor: active ? dt.colors.hairline : dt.colors.line2,
          backgroundColor: active ? dt.colors.surface : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: active ? dt.colors.ink : dt.colors.ink3,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export default function MemoriesScreen() {
  const { colors, font, stickers, isDark, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const children = useChildStore((s) => s.children)
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border

  const [allPosts, setAllPosts] = useState<MemoryPost[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterChild, setFilterChild] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState<string | null>(null)

  // Add sheet
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [selectedChild, setSelectedChild] = useState('')
  const [memoryDate, setMemoryDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Viewer: which post + which photo inside it
  const [viewPost, setViewPost] = useState<MemoryPost | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MemoryPost | null>(null)
  const [viewPhotoIdx, setViewPhotoIdx] = useState(0)

  // Edit caption
  const [editingCaption, setEditingCaption] = useState(false)
  const [editCaptionText, setEditCaptionText] = useState('')

  useFocusEffect(useCallback(() => { loadMemories() }, []))

  async function loadMemories() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const childIds = children.map((c) => c.id)
    if (childIds.length === 0) { setAllPosts([]); setLoading(false); return }

    const { data } = await supabase
      .from('child_logs')
      .select('id, child_id, date, type, value, photos, notes, created_at')
      .in('child_id', childIds)
      .not('photos', 'eq', '{}')
      .order('created_at', { ascending: false })
      .limit(500)

    const posts: MemoryPost[] = ((data ?? []) as any[]).map((log) => {
      const child = children.find((c) => c.id === log.child_id)
      return {
        logId: log.id,
        childId: log.child_id,
        childName: child?.name ?? 'Child',
        date: log.date,
        photos: log.photos ?? [],
        notes: log.notes ?? log.value ?? '',
      }
    }).filter((p) => p.photos.length > 0)

    setAllPosts(posts)
    setLoading(false)
  }

  // Available months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    for (const p of allPosts) {
      const d = new Date(p.date)
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return Array.from(months).sort().reverse()
  }, [allPosts])

  function formatMonth(ym: string) {
    const [y, m] = ym.split('-')
    const d = new Date(Number(y), Number(m) - 1)
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
  }

  // Filtered posts
  const filtered = useMemo(() => {
    let result = allPosts
    if (filterChild) result = result.filter((p) => p.childId === filterChild)
    if (filterMonth) {
      result = result.filter((p) => {
        const d = new Date(p.date)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return ym === filterMonth
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        p.notes.toLowerCase().includes(q) ||
        p.childName.toLowerCase().includes(q) ||
        p.date.includes(q)
      )
    }
    return result
  }, [allPosts, filterChild, filterMonth, searchQuery])

  const totalPhotos = filtered.reduce((sum, p) => sum + p.photos.length, 0)

  // Group by month for section headers
  const sections = useMemo(() => {
    const grouped = new Map<string, MemoryPost[]>()
    for (const p of filtered) {
      const d = new Date(p.date)
      const key = `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`
      const arr = grouped.get(key) ?? []
      arr.push(p)
      grouped.set(key, arr)
    }
    return Array.from(grouped.entries())
  }, [filtered])

  // ─── Photo picker ───────────────────────────────────────────────
  async function pickPhotos() {
    if (children.length === 0) return Alert.alert(t('memories_noChildren'), t('memories_noChildrenMsg'))
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Permission needed')

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8, selectionLimit: 10,
    })
    if (result.canceled || result.assets.length === 0) return

    setPendingPhotos(result.assets.map((a) => a.uri))
    setCaption('')
    setMemoryDate(new Date())
    setShowDatePicker(false)
    setSelectedChild(children.length === 1 ? children[0].id : '')
    setShowAddSheet(true)
  }

  async function handleSave() {
    if (!selectedChild) return Alert.alert(t('memories_selectChild'))
    if (pendingPhotos.length === 0) return
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Memory photos go to the PRIVATE child-photos bucket keyed by
      // {childId}/ (storage RLS scopes them to the parent + accepted
      // caregivers). We store the storage PATH; it's signed at read time.
      const photoUrls: string[] = []
      for (const uri of pendingPhotos) {
        const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg'
        const path = `${selectedChild}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
        const res = await fetch(uri)
        const buf = await res.arrayBuffer()
        const { error } = await supabase.storage.from('child-photos').upload(path, buf, { contentType: `image/${ext}`, upsert: true })
        if (!error) {
          photoUrls.push(path)
        }
      }
      if (photoUrls.length === 0) throw new Error('Upload failed. Check storage bucket.')

      const dateStr = toDateStr(memoryDate)
      const { error } = await supabase.from('child_logs').insert({
        child_id: selectedChild, user_id: session.user.id,
        date: dateStr, type: 'photo',
        photos: photoUrls, value: caption.trim() || null,
        notes: caption.trim() || null, logged_by: session.user.id,
      })
      if (error) throw error

      setShowAddSheet(false); setPendingPhotos([])
      await loadMemories()
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setUploading(false) }
  }

  // ─── Delete single photo from a post ─────────────────────────────
  async function deletePhoto(post: MemoryPost, photoIdx: number) {
    const isOnlyPhoto = post.photos.length <= 1
    Alert.alert(
      isOnlyPhoto ? t('memories_deleteMemory') : t('memories_deletePhoto'),
      isOnlyPhoto ? 'This memory and its photo will be permanently removed.' : 'This photo will be removed from the memory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              if (isOnlyPhoto) {
                await supabase.from('child_logs').delete().eq('id', post.logId)
              } else {
                const remaining = post.photos.filter((_, i) => i !== photoIdx)
                await supabase.from('child_logs').update({ photos: remaining }).eq('id', post.logId)
              }
              setViewPost(null)
              await loadMemories()
            } catch (e: any) { Alert.alert('Error', e.message) }
          },
        },
      ]
    )
  }

  // ─── Delete entire post ─────────────────────────────────────────
  function deletePost(post: MemoryPost) {
    setPendingDelete(post)
  }

  async function confirmDeletePost() {
    const post = pendingDelete
    if (!post) return
    setPendingDelete(null)
    try {
      await supabase.from('child_logs').delete().eq('id', post.logId)
      setViewPost(null)
      await loadMemories()
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  // ─── Edit caption ───────────────────────────────────────────────
  async function saveCaption(post: MemoryPost) {
    try {
      await supabase.from('child_logs').update({
        notes: editCaptionText.trim() || null,
        value: editCaptionText.trim() || null,
      }).eq('id', post.logId)
      setEditingCaption(false)
      await loadMemories()
      // Update the viewPost in-place
      setViewPost({ ...post, notes: editCaptionText.trim() })
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader
          title={t('memories_headerTitle')}
          right={
            <Pressable onPress={pickPhotos} hitSlop={10}>
              <View style={[styles.headerAddBtn, { backgroundColor: diffuse ? 'transparent' : paper, borderColor: diffuse ? dt.colors.line2 : paperBorder }]}>
                <Ionicons name="add" size={20} color={diffuse ? dt.colors.ink : colors.text} />
              </View>
            </Pressable>
          }
        />
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: paper, borderColor: paperBorder, marginHorizontal: 20 }]}>
        <Search size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('memories_searchPlaceholder')}
          placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
          style={[styles.searchInput, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Filter row: children */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <Pressable
            onPress={() => setFilterChild(null)}
            style={[styles.chip, diffuse
              ? {
                  backgroundColor: !filterChild ? dt.colors.surface : 'transparent',
                  borderColor: !filterChild ? dt.colors.hairline : dt.colors.line2,
                }
              : {
                  backgroundColor: !filterChild ? stickers.lilac + (isDark ? '32' : '40') : paper,
                  borderColor: !filterChild ? (stickers.lilacInk) : paperBorder,
                }]}
          >
            <Text style={[styles.chipText, diffuse
              ? { color: !filterChild ? dt.colors.ink : dt.colors.ink3, fontFamily: !filterChild ? diffuseFont.monoBold : diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase' }
              : { color: !filterChild ? (stickers.lilacInk) : colors.text, fontFamily: font.bodySemiBold }]}>{t('memories_filterAllKids')}</Text>
          </Pressable>
          {children.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setFilterChild(filterChild === c.id ? null : c.id)}
              style={[styles.chip, diffuse
                ? {
                    backgroundColor: filterChild === c.id ? dt.colors.surface : 'transparent',
                    borderColor: filterChild === c.id ? dt.colors.hairline : dt.colors.line2,
                  }
                : {
                    backgroundColor: filterChild === c.id ? stickers.blue + (isDark ? '32' : '40') : paper,
                    borderColor: filterChild === c.id ? (stickers.blueInk) : paperBorder,
                  }]}
            >
              <Text style={[styles.chipText, diffuse
                ? { color: filterChild === c.id ? dt.colors.ink : dt.colors.ink3, fontFamily: filterChild === c.id ? diffuseFont.monoBold : diffuseFont.mono, letterSpacing: 1.4, textTransform: 'uppercase' }
                : { color: filterChild === c.id ? (stickers.blueInk) : colors.text, fontFamily: font.bodySemiBold }]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Month dropdown + Count */}
      <View style={styles.monthRow}>
        {availableMonths.length > 1 && (
          <Pressable
            onPress={() => {
              const options = [
                { text: t('memories_filterAllTime'), onPress: () => setFilterMonth(null) },
                ...availableMonths.map((ym) => ({
                  text: formatMonth(ym),
                  onPress: () => setFilterMonth(ym),
                })),
                { text: 'Cancel', style: 'cancel' as const },
              ]
              Alert.alert('Filter by Month', undefined, options)
            }}
            style={[styles.monthDropdown, diffuse
              ? {
                  backgroundColor: filterMonth ? dt.colors.surface : 'transparent',
                  borderColor: filterMonth ? dt.colors.hairline : dt.colors.line2,
                }
              : {
                  backgroundColor: filterMonth ? stickers.yellow + (isDark ? '28' : '40') : paper,
                  borderColor: filterMonth ? (stickers.yellowInk) : paperBorder,
                }]}
          >
            <Calendar size={14} color={diffuse ? (filterMonth ? dt.colors.ink : dt.colors.ink3) : (filterMonth ? (stickers.yellowInk) : colors.textMuted)} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[styles.monthDropdownText, diffuse
              ? { color: filterMonth ? dt.colors.ink : dt.colors.ink3, fontFamily: filterMonth ? diffuseFont.monoBold : diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 11 }
              : { color: filterMonth ? (stickers.yellowInk) : colors.text, fontFamily: font.bodySemiBold }]}>
              {filterMonth ? formatMonth(filterMonth) : t('memories_filterAllTime')}
            </Text>
            <ChevronRight size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} style={{ transform: [{ rotate: '90deg' }] }} />
          </Pressable>
        )}
        <Text style={[styles.countText, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, letterSpacing: diffuse ? 0.8 : 0, textTransform: diffuse ? 'uppercase' : 'none' }]}>
          {`${filtered.length === 1 ? t('memories_countOne', { count: filtered.length }) : t('memories_countMany', { count: filtered.length })} ${t('common_dotSeparator')} ${t('memories_photos', { count: totalPhotos })}`}
        </Text>
      </View>

      {/* Gallery */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!loading && filtered.length === 0 && diffuse && (
          <DiffuseEmptyState
            icon={<Character name="photo" size={30} />}
            title={t('memories_emptyTitle')}
            message={t('memories_emptySubtitle')}
            ctaLabel={t('memories_addFirst')}
            onCta={pickPhotos}
            style={{ marginTop: 24 }}
          />
        )}
        {!loading && filtered.length === 0 && !diffuse && (
          <View style={[styles.emptyCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <HeartSticker size={64} fill={stickers.pink} />
            <Display size={20} align="center" color={colors.text}>{t('memories_emptyTitle')}</Display>
            <Body size={14} align="center" color={colors.textSecondary}>
              {t('memories_emptySubtitle')}
            </Body>
            <PillButton
              label={t('memories_addFirst')}
              variant="ink"
              onPress={pickPhotos}
              leading={<Camera size={16} color={colors.bg} strokeWidth={2} />}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {sections.map(([month, posts]) => (
          <View key={month} style={styles.monthSection}>
            <Text style={[styles.monthTitle, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display, letterSpacing: diffuse ? -0.5 : -0.2 }]}>{month}</Text>
            <View style={styles.grid}>
              {posts.map((p) => (
                <Pressable
                  key={p.logId}
                  onPress={() => { setViewPost(p); setViewPhotoIdx(0); setEditingCaption(false) }}
                  onLongPress={() => deletePost(p)}
                  delayLongPress={500}
                  style={styles.gridItem}
                >
                  <SignedImage value={p.photos[0]} bucket={PHOTO_BUCKETS.child} style={styles.gridImage} resizeMode="cover" />
                  {/* Multi-photo badge */}
                  {p.photos.length > 1 && (
                    <View style={styles.carouselBadge}>
                      <ImageIcon size={10} color="#FFF" strokeWidth={2.5} />
                      <Text style={styles.carouselBadgeText}>{p.photos.length}</Text>
                    </View>
                  )}
                  {p.notes ? (
                    <View style={styles.gridCaption}>
                      <Text style={styles.gridCaptionText} numberOfLines={1}>{p.notes}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ─── Full-screen viewer with carousel ──────────────────────── */}
      {viewPost && (
        <Modal visible animationType="fade">
          <View style={[styles.viewerRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Photo */}
            <SignedImage value={viewPost.photos[viewPhotoIdx]} bucket={PHOTO_BUCKETS.child} style={styles.viewerImage} resizeMode="contain" />

            {/* Top bar */}
            <View style={[styles.viewerTop, { top: insets.top + 8 }]}>
              <Pressable onPress={() => { setViewPost(null); setEditingCaption(false) }} style={styles.viewerBtn}>
                <X size={22} color="#FFF" strokeWidth={2} />
              </Pressable>
              {/* Photo counter */}
              {viewPost.photos.length > 1 && (
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>{viewPhotoIdx + 1} / {viewPost.photos.length}</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => { setEditCaptionText(viewPost.notes); setEditingCaption(true) }} style={styles.viewerBtn}>
                <Pencil size={18} color="#FFF" strokeWidth={2} />
              </Pressable>
              <Pressable onPress={() => deletePhoto(viewPost, viewPhotoIdx)} style={styles.viewerBtn}>
                <Trash2 size={18} color="#FF6B6B" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Carousel dots */}
            {viewPost.photos.length > 1 && (
              <View style={styles.dotsRow}>
                {viewPost.photos.map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i === viewPhotoIdx ? '#FFF' : 'rgba(255,255,255,0.3)' }]} />
                ))}
              </View>
            )}

            {/* Bottom info */}
            <View style={[styles.viewerBottom, { bottom: insets.bottom + 16 }]}>
              {editingCaption ? (
                <View style={styles.editRow}>
                  <TextInput
                    value={editCaptionText}
                    onChangeText={setEditCaptionText}
                    placeholder={t('memories_editCaptionPlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.editInput}
                    autoFocus
                  />
                  <Pressable onPress={() => saveCaption(viewPost)} style={styles.editSave}>
                    <Check size={20} color="#FFF" strokeWidth={2.5} />
                  </Pressable>
                </View>
              ) : (
                <>
                  {viewPost.notes ? <Text style={styles.viewerCaption}>{viewPost.notes}</Text> : null}
                  <View style={styles.viewerMeta}>
                    <View style={styles.viewerChildBadge}>
                      <Baby size={12} color="#FFF" strokeWidth={2} />
                      <Text style={styles.viewerChildText}>{viewPost.childName}</Text>
                    </View>
                    <Text style={styles.viewerDate}>
                      {new Date(viewPost.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Nav arrows — swipe through photos in this post */}
            {viewPhotoIdx > 0 && (
              <Pressable onPress={() => { setViewPhotoIdx(viewPhotoIdx - 1); setEditingCaption(false) }} style={[styles.navBtn, styles.navLeft]}>
                <ChevronLeft size={28} color="#FFF" strokeWidth={2} />
              </Pressable>
            )}
            {viewPhotoIdx < viewPost.photos.length - 1 && (
              <Pressable onPress={() => { setViewPhotoIdx(viewPhotoIdx + 1); setEditingCaption(false) }} style={[styles.navBtn, styles.navRight]}>
                <ChevronRight size={28} color="#FFF" strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </Modal>
      )}

      {/* ─── Add Memory Sheet ──────────────────────────────────────── */}
      <Modal visible={showAddSheet} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.sheetRoot, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
          <View style={[styles.sheetHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => { setShowAddSheet(false); setPendingPhotos([]) }} hitSlop={10}>
              <View style={[styles.headerAddBtn, { backgroundColor: diffuse ? 'transparent' : paper, borderColor: diffuse ? dt.colors.line2 : paperBorder }]}>
                <Ionicons name="close" size={20} color={diffuse ? dt.colors.ink : colors.text} />
              </View>
            </Pressable>
            <Display size={20} color={colors.text}>{t('memories_sheetTitle')}</Display>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
              {pendingPhotos.map((uri, i) => (
                <View key={i} style={styles.previewItem}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <Pressable onPress={() => setPendingPhotos(pendingPhotos.filter((_, j) => j !== i))} style={styles.previewRemove}>
                    <X size={14} color="#FFF" strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={pickPhotos} style={[styles.previewAdd, { borderColor: diffuse ? dt.colors.line2 : paperBorder }]}>
                <Plus size={24} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} />
                <Text style={[styles.previewAddText, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, letterSpacing: diffuse ? 1 : 0, textTransform: diffuse ? 'uppercase' : 'none' }]}>{t('memories_addBtn')}</Text>
              </Pressable>
            </ScrollView>

            <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('memories_labelCaption')}</MonoCaps>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={t('memories_captionPlaceholder')}
              placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
              multiline
              style={[styles.captionInput, { color: diffuse ? dt.colors.ink : colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: diffuse ? diffuseFont.body : font.body }]}
            />

            <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('memories_labelDate')}</MonoCaps>
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={[styles.dateBtn, { backgroundColor: paper, borderColor: paperBorder }]}
            >
              <Calendar size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} />
              <Text style={[styles.dateBtnText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {memoryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={memoryDate}
                mode="date"
                maximumDate={new Date()}
                minimumDate={new Date(2015, 0, 1)}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={(diffuse ? dt.isDark : isDark) ? 'dark' : 'light'}
                onChange={(_, d) => {
                  if (Platform.OS === 'android') setShowDatePicker(false)
                  if (d) setMemoryDate(d)
                }}
              />
            )}

            <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('memories_labelWhichChild')}</MonoCaps>
            <View style={styles.childChips}>
              {diffuse
                ? children.map((c) => (
                    <MemoriesChoicePill
                      key={c.id}
                      label={c.name}
                      active={selectedChild === c.id}
                      onPress={() => setSelectedChild(c.id)}
                    />
                  ))
                : children.map((c, idx) => (
                    <ChildPill
                      key={c.id}
                      label={c.name}
                      active={selectedChild === c.id}
                      color={childColor(idx)}
                      onPress={() => setSelectedChild(c.id)}
                    />
                  ))}
            </View>

            <PillButton
              label={uploading ? t('memories_uploading') : t('memories_saveMemory')}
              variant="ink"
              onPress={handleSave}
              disabled={uploading || !selectedChild || pendingPhotos.length === 0}
              leading={uploading ? <ActivityIndicator size="small" color={colors.bg} /> : <Camera size={18} color={colors.bg} strokeWidth={2} />}
              style={{ marginTop: 8 }}
            />
          </ScrollView>
        </View>
      </Modal>

      <PaperAlert
        visible={pendingDelete !== null}
        title={t('memories_deleteTitle')}
        message={pendingDelete ? `This removes the entry and all ${pendingDelete.photos.length} photo${pendingDelete.photos.length > 1 ? 's' : ''}.` : ''}
        buttons={[
          { label: 'Cancel', variant: 'secondary' },
          { label: 'Delete', variant: 'danger', onPress: confirmDeletePost },
        ]}
        onRequestClose={() => setPendingDelete(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  filterRow: { height: 40, marginBottom: 6 },
  filterContent: { paddingHorizontal: 20, gap: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipText: { fontSize: 12 },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  monthDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
  },
  monthDropdownText: { fontSize: 13 },
  countText: { fontSize: 11 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
  },

  monthSection: { marginBottom: 16 },
  monthTitle: { fontSize: 18, marginBottom: 10, letterSpacing: -0.2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridItem: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 6, overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%' },
  carouselBadge: { position: 'absolute', top: 5, right: 5, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  carouselBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  gridCaption: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 5, paddingVertical: 2 },
  gridCaptionText: { fontSize: 9, fontWeight: '600', color: '#FFF' },

  // Full-screen viewer
  viewerRoot: { flex: 1, backgroundColor: '#000' },
  viewerImage: { flex: 1 },
  viewerTop: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, zIndex: 10 },
  photoCounter: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  photoCounterText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  dotsRow: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 6, bottom: '22%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  viewerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  viewerBottom: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 20 },
  viewerCaption: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 8 },
  viewerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerChildBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  viewerChildText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  viewerDate: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },

  // Edit caption inline
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingLeft: 16, paddingRight: 4, paddingVertical: 4 },
  editInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#FFF', paddingVertical: 8 },
  editSave: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Nav arrows
  navBtn: { position: 'absolute', top: '45%', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  navLeft: { left: 12 },
  navRight: { right: 12 },

  // Add sheet
  sheetRoot: { flex: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  sheetScroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  previewRow: { gap: 10, paddingBottom: 4 },
  previewItem: { width: 110, height: 110, overflow: 'hidden', borderRadius: 22 },
  previewImage: { width: '100%', height: '100%', borderRadius: 22 },
  previewRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(20,19,19,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  previewAdd: {
    width: 110,
    height: 110,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 22,
  },
  previewAddText: { fontSize: 12 },

  captionInput: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 90,
    fontSize: 15,
    textAlignVertical: 'top',
    borderRadius: 22,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderRadius: 18,
  },
  dateBtnText: { fontSize: 15 },

  childChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  childChipText: { fontSize: 14 },
})

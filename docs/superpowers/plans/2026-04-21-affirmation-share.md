# Affirmation Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users open a modal from the Daily Affirmation card that shows 6 visually distinct template cards of the same phrase; tap a template to copy as PNG to clipboard for pasting into Instagram Stories, long-press to save to Photos, or tap a header Share… button for the native share sheet.

**Architecture:** A new modal component renders 6 pure-view templates (background + stickers + typography) at a fixed 1080×1350 logical canvas; each template is wrapped in a `ViewShot` ref and a scaled-down preview tile. Tap captures the unscaled view via `react-native-view-shot` → base64 → `expo-clipboard` image. Long-press saves the same capture via `expo-media-library`. The header Share… button uses `expo-sharing` with a tmpfile URI.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript strict, `react-native-view-shot`, `expo-clipboard`, `expo-media-library`, `expo-sharing`, `expo-file-system`, existing `SavedToast` provider for toasts.

**Reference spec:** [docs/superpowers/specs/2026-04-21-affirmation-share-design.md](../specs/2026-04-21-affirmation-share-design.md)

---

## File Structure

- **Create:** `components/home/pregnancy/affirmationTemplates.tsx` — 6 template components + metadata array.
- **Create:** `components/home/pregnancy/AffirmationShareModal.tsx` — modal, grid, capture logic.
- **Modify:** `components/home/pregnancy/AffirmationRevealCard.tsx` — add Share ↗ button and modal state.

No tests in this project (no Jest/Vitest setup). Verification is manual on a real iOS device — see Task 9.

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the three new packages**

Run:
```bash
npx expo install react-native-view-shot expo-media-library expo-sharing
```

Expected: three packages resolved to Expo-SDK-54-compatible versions and added to `package.json`. `npx expo install` picks correct versions automatically — do not use plain `npm install`.

- [ ] **Step 2: Verify they appear in dependencies**

Run:
```bash
grep -E 'react-native-view-shot|expo-media-library|expo-sharing' package.json
```

Expected: three lines output.

- [ ] **Step 3: iOS pod install**

Run:
```bash
cd ios && pod install && cd ..
```

Expected: new pods (`RNViewShot`, `ExpoMediaLibrary`, `ExpoSharing`) installed. If you're using EAS Build or a managed workflow without `ios/`, skip this step — the next `eas build` or `expo run:ios` will handle native linking.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json ios/Podfile.lock
git commit -m "chore: add view-shot, media-library, sharing deps for affirmation share"
```

---

## Task 2: Create the 6 templates

**Files:**
- Create: `components/home/pregnancy/affirmationTemplates.tsx`

- [ ] **Step 1: Write the file with all 6 templates and the metadata export**

Create [components/home/pregnancy/affirmationTemplates.tsx](components/home/pregnancy/affirmationTemplates.tsx):

```tsx
/**
 * Affirmation share templates.
 *
 * Each template renders at a fixed 1080 × 1350 logical canvas and accepts a
 * single `phrase` string. Templates are rendered inside `<AffirmationShareModal>`
 * tiles (scaled down via transform) and captured at full resolution with
 * `react-native-view-shot`.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  Heart,
  Burst,
  Moon,
  Star,
  Flower,
} from '../../stickers/BrandStickers'

export const CANVAS_W = 1080
export const CANVAS_H = 1350

export interface TemplateProps {
  phrase: string
}

export interface TemplateMeta {
  id: string
  name: string
  Component: React.FC<TemplateProps>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Split a phrase into poetic lines. Used by the Midnight Poem template. */
function splitPoem(phrase: string): string[] {
  const lower = phrase.toLowerCase()
  const connectors = [' and ', ' but ']
  for (const c of connectors) {
    const idx = lower.indexOf(c)
    if (idx > 0) {
      return [phrase.slice(0, idx).trim(), phrase.slice(idx + 1).trim()]
    }
  }
  const commaIdx = phrase.indexOf(',')
  if (commaIdx > 0) {
    return [phrase.slice(0, commaIdx).trim(), phrase.slice(commaIdx + 1).trim()]
  }
  // Fallback: split on space nearest midpoint
  const mid = Math.floor(phrase.length / 2)
  let splitAt = phrase.indexOf(' ', mid)
  if (splitAt < 0) splitAt = phrase.lastIndexOf(' ', mid)
  if (splitAt < 0) return [phrase]
  return [phrase.slice(0, splitAt).trim(), phrase.slice(splitAt + 1).trim()]
}

const WATERMARK = 'grandma.app'

function Watermark({ color = 'rgba(20,19,19,0.4)' }: { color?: string }) {
  return <Text style={[styles.watermark, { color }]}>{WATERMARK}</Text>
}

// ─── 1. Cream Paper ──────────────────────────────────────────────────────────

const CreamPaperTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#FFFEF8' }]}>
    <View style={styles.centerBlock}>
      <Text style={styles.labelCharcoal}>DAILY AFFIRMATION</Text>
      <Text style={styles.fraunces48Charcoal}>{phrase}</Text>
    </View>
    <View style={{ position: 'absolute', right: -40, bottom: -40 }}>
      <Heart size={360} fill="#F9D8E2" />
    </View>
    <Watermark />
  </View>
)

// ─── 2. Lilac Dream ──────────────────────────────────────────────────────────

const LilacDreamTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#E3D8F2' }]}>
    <View style={{ position: 'absolute', top: 60, left: 60 }}>
      <Burst size={220} fill="#F5D652" />
    </View>
    <View style={{ position: 'absolute', bottom: 80, right: 40 }}>
      <Moon size={280} fill="#C8B6E8" />
    </View>
    <View style={styles.centerBlock}>
      <Text style={styles.instrumentItalic46Charcoal}>{phrase.toLowerCase()}</Text>
    </View>
    <Watermark />
  </View>
)

// ─── 3. Peach Sunset ─────────────────────────────────────────────────────────

const PeachSunsetTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#F5B896' }]}>
    <View style={{ position: 'absolute', top: 150, left: 280, opacity: 0.3 }}>
      <Burst size={820} fill="#F5D652" />
    </View>
    <View style={styles.centerBlock}>
      <Text style={styles.cabinet56Cream}>{phrase.toUpperCase()}</Text>
    </View>
    <Watermark color="rgba(20,19,19,0.35)" />
  </View>
)

// ─── 4. Lime Punch ───────────────────────────────────────────────────────────

const LimePunchTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#BDD48C' }]}>
    <View style={{ position: 'absolute', top: 70, right: 80 }}>
      <Flower size={260} fill="#F2B2C7" />
    </View>
    <View style={{ position: 'absolute', top: 520, left: 80 }}>
      <Star size={140} fill="#F5D652" />
    </View>
    <View style={{ position: 'absolute', bottom: 200, right: 120 }}>
      <Star size={100} fill="#F5D652" />
    </View>
    <View style={[styles.leftBlock]}>
      <Text style={styles.dmsans48Charcoal}>{phrase}</Text>
    </View>
    <Watermark />
  </View>
)

// ─── 5. Midnight Poem ────────────────────────────────────────────────────────

const MidnightPoemTemplate: React.FC<TemplateProps> = ({ phrase }) => {
  const lines = splitPoem(phrase)
  return (
    <View style={[styles.canvas, { backgroundColor: '#2A2624' }]}>
      <View style={{ position: 'absolute', top: 90, left: 120 }}>
        <Star size={120} fill="#F5D652" />
      </View>
      <View style={{ position: 'absolute', bottom: 100, right: 60 }}>
        <Moon size={240} fill="#C8B6E8" />
      </View>
      <View style={styles.centerBlock}>
        {lines.map((line, i) => (
          <Text key={i} style={styles.instrumentItalic44Cream}>
            {line}
          </Text>
        ))}
      </View>
      <Watermark color="rgba(255,254,248,0.4)" />
    </View>
  )
}

// ─── 6. Pink Blush ───────────────────────────────────────────────────────────

const PinkBlushTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#F2B2C7' }]}>
    <View style={{ position: 'absolute', top: 80, left: 60, transform: [{ rotate: '-14deg' }] }}>
      <Heart size={220} fill="#C8B6E8" />
    </View>
    <View style={{ position: 'absolute', top: 140, right: 100, transform: [{ rotate: '12deg' }] }}>
      <Heart size={150} fill="#FBEA9E" />
    </View>
    <View style={{ position: 'absolute', bottom: -30, left: 300 }}>
      <Heart size={300} fill="#F9D8E2" />
    </View>
    <View style={styles.centerBlock}>
      <Text style={styles.fraunces46Charcoal}>{phrase}</Text>
      <Text style={styles.signature}>— xo, Grandma</Text>
    </View>
    <Watermark />
  </View>
)

// ─── Metadata ────────────────────────────────────────────────────────────────

export const affirmationTemplates: TemplateMeta[] = [
  { id: 'cream',    name: 'Cream Paper',   Component: CreamPaperTemplate },
  { id: 'lilac',    name: 'Lilac Dream',   Component: LilacDreamTemplate },
  { id: 'peach',    name: 'Peach Sunset',  Component: PeachSunsetTemplate },
  { id: 'lime',     name: 'Lime Punch',    Component: LimePunchTemplate },
  { id: 'midnight', name: 'Midnight Poem', Component: MidnightPoemTemplate },
  { id: 'blush',    name: 'Pink Blush',    Component: PinkBlushTemplate },
]

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
    position: 'relative',
    overflow: 'hidden',
  },

  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 100,
    zIndex: 2,
  },

  leftBlock: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 100,
    zIndex: 2,
  },

  labelCharcoal: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 22,
    letterSpacing: 3,
    color: '#141313',
    marginBottom: 48,
    textAlign: 'center',
  },

  fraunces48Charcoal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 76,
    lineHeight: 88,
    color: '#141313',
    textAlign: 'center',
    letterSpacing: -0.6,
  },

  fraunces46Charcoal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 72,
    lineHeight: 84,
    color: '#141313',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  instrumentItalic46Charcoal: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 82,
    lineHeight: 94,
    color: '#141313',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  instrumentItalic44Cream: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 72,
    lineHeight: 96,
    color: '#FFFEF8',
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  cabinet56Cream: {
    fontFamily: 'CabinetGrotesk-Black',
    fontSize: 92,
    lineHeight: 96,
    color: '#FFFEF8',
    textAlign: 'center',
    letterSpacing: -1.5,
  },

  dmsans48Charcoal: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 76,
    lineHeight: 88,
    color: '#141313',
    textAlign: 'left',
    letterSpacing: -0.6,
  },

  signature: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 36,
    color: '#141313',
    marginTop: 40,
    textAlign: 'center',
    opacity: 0.7,
  },

  watermark: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 22,
    letterSpacing: 1.2,
    zIndex: 3,
  },
})
```

Note on font sizes: the canvas is 1080 px wide (roughly 3× a standard iPhone). So 76 px on the canvas renders as ~25 sp on a 390 pt wide screen. All sizes here are canvas-space.

- [ ] **Step 2: Run TypeScript check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors. If a sticker import fails, check exported names in `components/stickers/BrandStickers.tsx` (Heart, Burst, Moon, Star, Flower all exist there).

- [ ] **Step 3: Commit**

```bash
git add components/home/pregnancy/affirmationTemplates.tsx
git commit -m "feat(affirmation): add 6 share templates (cream, lilac, peach, lime, midnight, blush)"
```

---

## Task 3: Build AffirmationShareModal shell (no capture yet)

**Files:**
- Create: `components/home/pregnancy/AffirmationShareModal.tsx`

- [ ] **Step 1: Create the modal shell — header + instruction row + empty grid placeholder**

Create [components/home/pregnancy/AffirmationShareModal.tsx](components/home/pregnancy/AffirmationShareModal.tsx):

```tsx
/**
 * AffirmationShareModal — full-sheet modal that presents 6 visual template
 * cards for the daily affirmation. Tap a tile to copy the rendered PNG to the
 * clipboard, long-press to save to Photos, or use the header Share… button
 * for the native share sheet.
 */
import React, { useMemo, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  affirmationTemplates,
  CANVAS_W,
  CANVAS_H,
} from './affirmationTemplates'

interface Props {
  visible: boolean
  phrase: string
  onClose: () => void
}

const { width: SW } = Dimensions.get('window')
const OUTER_PADDING = 16
const GUTTER = 12
const TILE_W = (SW - OUTER_PADDING * 2 - GUTTER) / 2
const TILE_H = TILE_W * (CANVAS_H / CANVAS_W) // 4:5 aspect

export function AffirmationShareModal({ visible, phrase, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Text style={styles.closeX}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Share affirmation
          </Text>
          <Pressable hitSlop={12} style={styles.headerBtn} onPress={() => {}}>
            <Text style={styles.shareWord}>Share…</Text>
          </Pressable>
        </View>

        <Text style={styles.instructions}>Tap to copy · Hold to save</Text>

        <ScrollView contentContainerStyle={styles.grid}>
          {affirmationTemplates.map((t) => (
            <View
              key={t.id}
              style={{ width: TILE_W, height: TILE_H, marginBottom: GUTTER }}
            >
              <View style={styles.tilePlaceholder}>
                <Text style={styles.tileLabel}>{t.name}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0B1A',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    minWidth: 60,
    justifyContent: 'center',
  },
  closeX: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'DMSans_500Medium',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  shareWord: {
    color: '#C4A8F0',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'right',
  },
  instructions: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: OUTER_PADDING,
    paddingBottom: 40,
  },
  tilePlaceholder: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
  },
})
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/pregnancy/AffirmationShareModal.tsx
git commit -m "feat(affirmation): scaffold share modal shell with header and grid placeholder"
```

---

## Task 4: Render real templates inside tiles with scaled preview

**Files:**
- Modify: `components/home/pregnancy/AffirmationShareModal.tsx`

- [ ] **Step 1: Replace the placeholder tile with a scaled template preview**

Update the imports and the tile-render block of `AffirmationShareModal.tsx`. Show this replaced version in full for clarity:

```tsx
import React, { useMemo, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ViewShot from 'react-native-view-shot'
import {
  affirmationTemplates,
  CANVAS_W,
  CANVAS_H,
  TemplateMeta,
} from './affirmationTemplates'
```

Replace the `<ScrollView …>` block with:

```tsx
<ScrollView contentContainerStyle={styles.grid}>
  {affirmationTemplates.map((t) => (
    <TemplateTile key={t.id} meta={t} phrase={phrase} />
  ))}
</ScrollView>
```

Add a new `TemplateTile` component above the `styles` declaration:

```tsx
function TemplateTile({ meta, phrase }: { meta: TemplateMeta; phrase: string }) {
  const { Component } = meta
  const scale = TILE_W / CANVAS_W
  return (
    <View style={[styles.tile, { width: TILE_W, height: TILE_H }]}>
      <ViewShot
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: [{ scale }],
          transformOrigin: '0 0' as any,
        }}
      >
        <Component phrase={phrase} />
      </ViewShot>
    </View>
  )
}
```

Update the styles object: remove `tilePlaceholder` and `tileLabel`, add:

```ts
tile: {
  borderRadius: 18,
  overflow: 'hidden',
  marginBottom: GUTTER,
  backgroundColor: '#000',
},
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors. The `transformOrigin` prop needs the `as any` cast because RN's types for it in 0.81 are incomplete; it is supported at runtime.

- [ ] **Step 3: Visual sanity check**

Run: `npx expo start`
Expected: opening the modal (via whatever entry you wire up for testing — for this step, temporarily mount `<AffirmationShareModal visible phrase="You are stronger than you know and braver than you feel." onClose={() => {}} />` in a scratch screen) shows 6 distinct-looking tiles in a 2-column grid, each with its own background and stickers, none clipped, none overflowing.

If the transform-origin trick doesn't visually align (template appears offset or clipped), fallback pattern: wrap the ViewShot in an absolutely-positioned container offsetting by `-(CANVAS_W - TILE_W) / 2` and `-(CANVAS_H - TILE_H) / 2` combined with `scale` — but test the primary approach first.

Remove the scratch mount before committing.

- [ ] **Step 4: Commit**

```bash
git add components/home/pregnancy/AffirmationShareModal.tsx
git commit -m "feat(affirmation): render scaled template previews in share modal grid"
```

---

## Task 5: Tap a tile to copy PNG to clipboard

**Files:**
- Modify: `components/home/pregnancy/AffirmationShareModal.tsx`

- [ ] **Step 1: Add capture + clipboard logic**

Add imports at the top of the file:

```tsx
import * as Clipboard from 'expo-clipboard'
import { useSavedToast } from '../../ui/SavedToast'
```

Update `TemplateTile` to use a ref, a Pressable, and copy on press. Replace the component with:

```tsx
function TemplateTile({ meta, phrase }: { meta: TemplateMeta; phrase: string }) {
  const { Component } = meta
  const scale = TILE_W / CANVAS_W
  const shotRef = useRef<ViewShot>(null)
  const toast = useSavedToast()

  const handleCopy = async () => {
    if (!shotRef.current?.capture) return
    try {
      const base64 = await shotRef.current.capture({
        format: 'png',
        quality: 0.95,
        result: 'base64',
      })
      await Clipboard.setImageAsync(base64)
      toast.show({
        title: 'Copied!',
        message: 'Paste into your Story or a message.',
        autoDismiss: 1800,
      })
    } catch (err) {
      toast.show({
        title: 'Copy failed',
        message: "Couldn't create image. Try again.",
        autoDismiss: 1800,
      })
    }
  }

  return (
    <Pressable
      onPress={handleCopy}
      style={({ pressed }) => [
        styles.tile,
        { width: TILE_W, height: TILE_H, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <ViewShot
        ref={shotRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: [{ scale }],
          transformOrigin: '0 0' as any,
        }}
      >
        <Component phrase={phrase} />
      </ViewShot>
    </Pressable>
  )
}
```

Note: `ViewShot` exposes an imperative `.capture()` method on the ref (preferred over `captureRef(ref)` because it works on the instance directly and handles option passing consistently).

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Device test — tap-to-copy**

Run: `npx expo start` → open on a real iOS device (simulator's clipboard-image paste into Stories is unreliable).

Check:
- Tap a tile → `Copied!` toast appears.
- Open Instagram → new Story → long-press the canvas → "Paste" appears → paste → the exact visual tile you tapped renders (correct background, stickers, fonts, watermark).
- Repeat for all 6 tiles.

- [ ] **Step 4: Commit**

```bash
git add components/home/pregnancy/AffirmationShareModal.tsx
git commit -m "feat(affirmation): tap tile to copy PNG to clipboard"
```

---

## Task 6: Long-press to save to Photos

**Files:**
- Modify: `components/home/pregnancy/AffirmationShareModal.tsx`

- [ ] **Step 1: Add MediaLibrary import and onLongPress handler**

Add at the top:

```tsx
import * as MediaLibrary from 'expo-media-library'
```

Add the save handler and wire it to the Pressable. Inside `TemplateTile`, add alongside `handleCopy`:

```tsx
const handleSave = async () => {
  if (!shotRef.current?.capture) return
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync()
    if (status !== 'granted') {
      toast.show({
        title: 'Photos access needed',
        message: 'Enable Photos access in Settings to save templates.',
        autoDismiss: 2400,
      })
      return
    }
    const uri = await shotRef.current.capture({
      format: 'png',
      quality: 0.95,
    })
    await MediaLibrary.saveToLibraryAsync(uri)
    toast.show({
      title: 'Saved to Photos',
      message: 'Open Photos to share or edit.',
      autoDismiss: 1800,
    })
  } catch (err) {
    toast.show({
      title: 'Save failed',
      message: 'Please try again.',
      autoDismiss: 1800,
    })
  }
}
```

Update the `<Pressable>` to include `onLongPress`:

```tsx
<Pressable
  onPress={handleCopy}
  onLongPress={handleSave}
  delayLongPress={600}
  style={({ pressed }) => [
    styles.tile,
    { width: TILE_W, height: TILE_H, opacity: pressed ? 0.85 : 1 },
  ]}
>
```

- [ ] **Step 2: Add the NSPhotoLibraryAddUsageDescription Info.plist key (iOS)**

Open `app.json`. Under `ios.infoPlist`, add the "add photos" usage description. If the key exists already, leave existing entries and add:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryAddUsageDescription": "Save your daily affirmation as an image to share anywhere."
      }
    }
  }
}
```

If `app.json` already has an `ios.infoPlist` block, merge this key into it. Do not duplicate.

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Device test — long-press to save**

Run on a real iOS device (need to rebuild native after Info.plist change: `npx expo prebuild --clean && npx expo run:ios` if using bare workflow; for managed workflow you may need a new EAS dev build).

Check:
- Long-press a tile → first time, Photos permission prompt appears → grant.
- Toast "Saved to Photos" appears.
- Open Photos → most-recent item is the exact tile.
- Deny permission → repeat long-press → "Photos access needed" toast.

- [ ] **Step 5: Commit**

```bash
git add components/home/pregnancy/AffirmationShareModal.tsx app.json
git commit -m "feat(affirmation): long-press tile to save PNG to Photos"
```

---

## Task 7: Share… header button → native share sheet

**Files:**
- Modify: `components/home/pregnancy/AffirmationShareModal.tsx`

- [ ] **Step 1: Add Sharing import and header handler**

Add at the top:

```tsx
import * as Sharing from 'expo-sharing'
```

In the parent `AffirmationShareModal` component, collect a ref to the first tile's ViewShot so the header button can capture it. Refactor `TemplateTile` to optionally forward its shotRef outward, or — simpler — lift the refs into the parent:

Replace the map block with an imperative pattern that stores each ref in an array:

```tsx
export function AffirmationShareModal({ visible, phrase, onClose }: Props) {
  const shotRefs = useRef<(ViewShot | null)[]>([])
  const toast = useSavedToast()

  const handleHeaderShare = async () => {
    const first = shotRefs.current[0]
    if (!first?.capture) return
    try {
      const canShare = await Sharing.isAvailableAsync()
      if (!canShare) {
        toast.show({ title: 'Sharing unavailable', message: 'Your device cannot share right now.', autoDismiss: 1800 })
        return
      }
      const uri = await first.capture({ format: 'png', quality: 0.95 })
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share affirmation',
        UTI: 'public.png',
      })
    } catch (err) {
      toast.show({ title: 'Share failed', message: 'Please try again.', autoDismiss: 1800 })
    }
  }

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Text style={styles.closeX}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Share affirmation</Text>
          <Pressable hitSlop={12} style={styles.headerBtn} onPress={handleHeaderShare}>
            <Text style={styles.shareWord}>Share…</Text>
          </Pressable>
        </View>

        <Text style={styles.instructions}>Tap to copy · Hold to save</Text>

        <ScrollView contentContainerStyle={styles.grid}>
          {affirmationTemplates.map((t, i) => (
            <TemplateTile
              key={t.id}
              meta={t}
              phrase={phrase}
              registerRef={(r) => { shotRefs.current[i] = r }}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
```

Update `TemplateTile` to accept and register the ref. Its signature becomes:

```tsx
function TemplateTile({
  meta,
  phrase,
  registerRef,
}: {
  meta: TemplateMeta
  phrase: string
  registerRef: (r: ViewShot | null) => void
}) {
  const { Component } = meta
  const scale = TILE_W / CANVAS_W
  const shotRef = useRef<ViewShot>(null)
  const toast = useSavedToast()

  const setRef = (r: ViewShot | null) => {
    // @ts-expect-error — RefObject.current is writable at runtime
    shotRef.current = r
    registerRef(r)
  }

  // handleCopy and handleSave remain unchanged …

  return (
    <Pressable
      onPress={handleCopy}
      onLongPress={handleSave}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.tile,
        { width: TILE_W, height: TILE_H, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <ViewShot
        ref={setRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: [{ scale }],
          transformOrigin: '0 0' as any,
        }}
      >
        <Component phrase={phrase} />
      </ViewShot>
    </Pressable>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Device test — Share… button**

Run on a real device.

Check:
- Open modal → tap "Share…" in header → iOS share sheet opens.
- Select "Messages" → send to yourself → received image is the Cream Paper template (first in the list).
- On Android, select any app that accepts images (Gmail, Drive) and verify.

- [ ] **Step 4: Commit**

```bash
git add components/home/pregnancy/AffirmationShareModal.tsx
git commit -m "feat(affirmation): wire Share… header button to native share sheet"
```

---

## Task 8: Add Share button to AffirmationRevealCard and hook up modal

**Files:**
- Modify: `components/home/pregnancy/AffirmationRevealCard.tsx`

- [ ] **Step 1: Add state, button, and modal mount**

Open [components/home/pregnancy/AffirmationRevealCard.tsx](components/home/pregnancy/AffirmationRevealCard.tsx).

Add the import near the other component imports:

```tsx
import { AffirmationShareModal } from './AffirmationShareModal'
```

Add a `useState` at the top of `AffirmationRevealCard` alongside the existing `useState` hooks:

```tsx
const [shareOpen, setShareOpen] = useState(false)
```

Inside the revealed state `<Animated.View>` block (currently ending with the `Body` "Come back tomorrow…" line), append the Share button. Replace the existing revealed-state block:

```tsx
) : (
  <Animated.View style={[styles.revealedState, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
    <Text style={[styles.affirmationText, { color: inkText }]}>
      {text ?? '...'}
    </Text>
    <Body size={11} color={inkMuted} style={{ marginTop: 10 }}>
      Come back tomorrow for a new affirmation
    </Body>
  </Animated.View>
)}
```

with:

```tsx
) : (
  <Animated.View style={[styles.revealedState, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
    <Text style={[styles.affirmationText, { color: inkText }]}>
      {text ?? '...'}
    </Text>
    <Body size={11} color={inkMuted} style={{ marginTop: 10 }}>
      Come back tomorrow for a new affirmation
    </Body>
    {text ? (
      <Pressable
        onPress={() => setShareOpen(true)}
        style={({ pressed }) => [
          styles.shareBtn,
          { backgroundColor: lilacSoft, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[styles.shareBtnText, { color: inkText }]}>Share ↗</Text>
      </Pressable>
    ) : null}
  </Animated.View>
)}
```

Mount the modal as a sibling of the card, just before the final closing tag of the outer `<View>`. Replace the last-closing `</View>` of the card with:

```tsx
      )}
    </View>

    <AffirmationShareModal
      visible={shareOpen}
      phrase={text ?? ''}
      onClose={() => setShareOpen(false)}
    />
```

Wait — the current component returns a single `<View style={[styles.card …]}>`. To add a sibling `<AffirmationShareModal>`, wrap the return in a fragment. Change the return to:

```tsx
return (
  <>
    <View style={[styles.card, { backgroundColor: paperBg, borderColor: 'rgba(20,19,19,0.08)' }]}>
      {/* …existing card contents… */}
    </View>
    <AffirmationShareModal
      visible={shareOpen}
      phrase={text ?? ''}
      onClose={() => setShareOpen(false)}
    />
  </>
)
```

Add the new styles to the `StyleSheet.create(...)` block (append inside the object):

```ts
shareBtn: {
  alignSelf: 'flex-start',
  borderRadius: 999,
  paddingHorizontal: 18,
  paddingVertical: 9,
  marginTop: 14,
},
shareBtnText: {
  fontSize: 13,
  fontFamily: 'DMSans_600SemiBold',
},
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors. If the fragment import is missing, React's fragment `<>…</>` requires no explicit import.

- [ ] **Step 3: Visual check on device**

Run the app. Navigate to the pregnancy home. Reveal the affirmation. Verify:
- "Share ↗" pill button appears below "Come back tomorrow for a new affirmation".
- Tap it → modal slides up from bottom.
- Modal shows 6 distinct tiles.

- [ ] **Step 4: Commit**

```bash
git add components/home/pregnancy/AffirmationRevealCard.tsx
git commit -m "feat(affirmation): add Share button to affirmation card and mount share modal"
```

---

## Task 9: Manual QA sweep on real device

**Files:** none.

This task has no code — only verification. It must run on a real iOS device (simulator's Instagram Story paste is unreliable). Ideally also run on a real Android device.

- [ ] **Step 1: Golden-path flow**

On pregnancy home:
1. Reveal the affirmation.
2. Tap Share ↗.
3. Modal opens; 6 tiles render, none clipped, watermark visible on each.
4. Tap each tile in sequence:
   - Copied toast appears.
   - In Instagram → new Story → paste → correct tile renders at high quality.
5. Long-press each tile:
   - First time: permission prompt.
   - Subsequent: toast "Saved to Photos".
   - Open Photos: image is present and looks identical to the in-app preview.
6. Tap Share… header button:
   - Native share sheet opens.
   - Send to Messages → received image is Cream Paper template.
7. Tap ✕ and swipe down — both dismiss modal.

- [ ] **Step 2: Error paths**

1. Deny Photos permission → long-press a tile → toast "Photos access needed. Enable Photos access in Settings to save templates."
2. Toggle airplane mode → everything still works (no network dependency).

- [ ] **Step 3: Edge cases**

1. Very long affirmation (try editing `loadDailyAffirmation` fallbacks to a 25-word phrase) — check text does not overflow the canvas on any template. If it does, reduce the template's font size or add `adjustsFontSizeToFit numberOfLines={6}` to the `<Text>` in that template.
2. Very short affirmation (5 words) — check text remains centered and not lost in whitespace.
3. Android: tap-copy behavior — verify paste into WhatsApp image attachment works. (Android IG Story paste behavior differs across OEMs; accept that tap-copy may not paste into IG on some Android devices; long-press + save then share from Photos is the reliable Android path.)

- [ ] **Step 4: Performance**

1. Open modal → first render should be under 300 ms on a modern device.
2. Tap a tile → capture should complete under 500 ms.
3. Rapid tapping does not crash (each tap is independent).

- [ ] **Step 5: Done**

Once the above passes, no commit needed. The feature is shippable.

---

## Recap

- Task 1: Install deps — `react-native-view-shot`, `expo-media-library`, `expo-sharing`.
- Task 2: 6 template components + metadata at fixed 1080×1350 canvas.
- Task 3: Modal shell with header (X, title, Share…) and empty grid.
- Task 4: Wire real scaled-down template previews into the grid.
- Task 5: Tap → PNG → clipboard via `Clipboard.setImageAsync`.
- Task 6: Long-press → permission → `MediaLibrary.saveToLibraryAsync`; add `NSPhotoLibraryAddUsageDescription`.
- Task 7: Header Share… button → `Sharing.shareAsync` with tmpfile URI.
- Task 8: Hook the modal into `AffirmationRevealCard` via `setShareOpen` state and Share ↗ pill button.
- Task 9: Manual QA on real device covering golden path, error paths, edge cases, and performance.

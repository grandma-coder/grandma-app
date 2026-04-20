import React from 'react'
import { Text, TextProps, StyleProp, TextStyle, View, Platform } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import {
  Heart, Star, Moon, Sun, Cloud, Rainbow, Flower, Leaf,
  Drop, Bolt, Sparkle, Butterfly, Bee, Bear, Cherry, Mushroom,
  Apple, Cake, Gift, Balloon, Crown, Pacifier, Bottle, Eye,
  Smiley, Sad, Sleepy, Gem, Diamond, Key, Lips, Plane, Lungs, Wave, Pill,
  Foot,
} from './Stickers'
import { stickers as stickersLight } from '../../constants/theme'

interface EmojiProps extends Omit<TextProps, 'style'> {
  size?: number
  style?: StyleProp<TextStyle>
}

/**
 * Emoji / sticker renderer.
 *
 * For emojis we have a native sticker in the design system, renders the sticker
 * so the app looks on-brand (and doesn't fall back to tofu `?` on devices where
 * color-emoji cascades fail).
 *
 * For unknown emojis, falls back to a platform text stack that's most likely to
 * include Apple Color Emoji / Noto Color Emoji.
 */
export function Emoji({ size, style, children, ...rest }: EmojiProps) {
  const txt = typeof children === 'string' ? children : String(children ?? '')
  const first = extractEmojiKey(txt)
  const sticker = STICKER_MAP[first]

  if (sticker) {
    const resolved = size ?? 20
    return <View style={style as any}>{sticker(resolved)}</View>
  }

  // Fallback: platform text with emoji-capable font
  const emojiFont = Platform.select({
    ios: 'Apple Color Emoji',
    android: 'sans-serif',
    default: 'System',
  })

  return (
    <Text
      {...rest}
      style={[
        size !== undefined ? { fontSize: size, lineHeight: Math.round(size * 1.1) } : null,
        { fontFamily: emojiFont as string },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

// ─── Mapping ──────────────────────────────────────────────────────────────

function extractEmojiKey(text: string): string {
  // Strip variation selectors (U+FE0F) and zero-width joiners for lookup
  return text.replace(/\uFE0F/g, '').replace(/\u200D/g, '').trim()
}

type Renderer = (size: number) => React.ReactElement

const STICKER_MAP: Record<string, Renderer> = {
  // Nature
  '🌙': (s) => <Moon size={s} />,
  '⭐': (s) => <Star size={s} />,
  '🌟': (s) => <Sparkle size={s} />,
  '✨': (s) => <Sparkle size={s} />,
  '☀': (s) => <Sun size={s} />,
  '☀️': (s) => <Sun size={s} />,
  '🌞': (s) => <Sun size={s} />,
  '☁': (s) => <Cloud size={s} />,
  '☁️': (s) => <Cloud size={s} />,
  '🌈': (s) => <Rainbow size={s * 1.2} />,
  '🌸': (s) => <Flower size={s} />,
  '🌺': (s) => <Flower size={s} petal={stickersLight.coral} center={stickersLight.yellow} />,
  '🌻': (s) => <Flower size={s} petal={stickersLight.yellow} center={stickersLight.coral} />,
  '🌼': (s) => <Flower size={s} />,
  '🌱': (s) => <Leaf size={s} />,
  '🌿': (s) => <Leaf size={s} />,
  '🍀': (s) => <Leaf size={s} />,
  '💧': (s) => <Drop size={s} />,
  '🌊': (s) => <Drop size={s} />,
  '⚡': (s) => <Bolt size={s} />,
  '💪': (s) => <Bolt size={s} />,

  // Hearts / affection
  '❤': (s) => <Heart size={s} />,
  '❤️': (s) => <Heart size={s} />,
  '💗': (s) => <Heart size={s} />,
  '💖': (s) => <Heart size={s} />,
  '💕': (s) => <Heart size={s} />,
  '💓': (s) => <Heart size={s} />,
  '💜': (s) => <Heart size={s} fill={stickersLight.lilac} />,
  '💛': (s) => <Heart size={s} fill={stickersLight.yellow} />,
  '💙': (s) => <Heart size={s} fill={stickersLight.blue} />,
  '💚': (s) => <Heart size={s} fill={stickersLight.green} />,
  '🧡': (s) => <Heart size={s} fill={stickersLight.peach} />,
  '🤍': (s) => <Heart size={s} fill="#F5EDDC" />,

  // Creatures
  '🦋': (s) => <Butterfly size={s} />,
  '🐝': (s) => <Bee size={s} />,
  '🐻': (s) => <Bear size={s} />,
  '🧸': (s) => <Bear size={s} />,

  // Food
  '🍎': (s) => <Apple size={s} />,
  '🍒': (s) => <Cherry size={s} />,
  '🍄': (s) => <Mushroom size={s} />,
  '🎂': (s) => <Cake size={s} />,
  '🍰': (s) => <Cake size={s} />,
  '🥑': (s) => <Apple size={s} fill={stickersLight.green} />,
  '🥕': (s) => <Apple size={s} fill={stickersLight.peach} />,
  '🍊': (s) => <Apple size={s} fill={stickersLight.peach} />,
  '🍋': (s) => <Apple size={s} fill={stickersLight.yellow} />,
  '🍏': (s) => <Apple size={s} fill={stickersLight.green} />,
  '🍐': (s) => <Apple size={s} fill={stickersLight.yellow} />,
  '🍑': (s) => <Apple size={s} fill={stickersLight.pink} />,
  '🍓': (s) => <Apple size={s} fill={stickersLight.coral} />,
  '🍌': (s) => <Apple size={s} fill={stickersLight.yellow} />,
  '🥭': (s) => <Apple size={s} fill={stickersLight.peach} />,
  '🍇': (s) => <Cherry size={s} fill={stickersLight.lilac} />,
  '🫐': (s) => <Cherry size={s} fill={stickersLight.blue} />,
  '🍉': (s) => <Apple size={s} fill={stickersLight.coral} />,
  '🍈': (s) => <Apple size={s} fill={stickersLight.green} />,
  '🍍': (s) => <Apple size={s} fill={stickersLight.yellow} />,
  '🥥': (s) => <Apple size={s} fill={stickersLight.peach} />,
  '🎃': (s) => <Apple size={s} fill={stickersLight.coral} />,
  '🥬': (s) => <Leaf size={s} fill={stickersLight.green} />,
  '🥦': (s) => <Leaf size={s} fill={stickersLight.green} />,
  '🌰': (s) => <Cherry size={s} fill={stickersLight.peach} />,
  '🍆': (s) => <Apple size={s} fill={stickersLight.lilac} />,
  '🌽': (s) => <Apple size={s} fill={stickersLight.yellow} />,
  '🫘': (s) => <Cherry size={s} fill={stickersLight.coral} />,
  '🫛': (s) => <Leaf size={s} fill={stickersLight.green} />,
  '🫑': (s) => <Apple size={s} fill={stickersLight.green} />,
  '🫚': (s) => <Apple size={s} fill={stickersLight.peach} />,

  // Celebration
  '🎉': (s) => <Sparkle size={s} fill={stickersLight.yellow} />,
  '🎊': (s) => <Sparkle size={s} fill={stickersLight.pink} />,
  '🎁': (s) => <Gift size={s} />,
  '🎈': (s) => <Balloon size={s} />,
  '👑': (s) => <Crown size={s} />,

  // Baby / care
  '🚼': (s) => <Pacifier size={s} />,
  '🍼': (s) => <Bottle size={s} />,

  // Moods
  '😊': (s) => <Smiley size={s} />,
  '🙂': (s) => <Smiley size={s} />,
  '😃': (s) => <Smiley size={s} />,
  '😁': (s) => <Smiley size={s} />,
  '😄': (s) => <Smiley size={s} />,
  '😌': (s) => <Smiley size={s} fill={stickersLight.blue} />,
  '😴': (s) => <Sleepy size={s} />,
  '😢': (s) => <Sad size={s} />,
  '😞': (s) => <Sad size={s} />,
  '☹': (s) => <Sad size={s} />,
  '☹️': (s) => <Sad size={s} />,

  // Misc
  '👀': (s) => <Eye size={s} />,
  '👁': (s) => <Eye size={s} />,
  '👁️': (s) => <Eye size={s} />,
  '💡': (s) => <Bolt size={s} fill={stickersLight.yellow} />,

  // Diaper / body
  '💩': (s) => <Drop size={s} fill={stickersLight.peach} />,
  '🔄': (s) => <Bolt size={s} fill={stickersLight.yellow} />,
  '🧻': (s) => <Drop size={s} fill={stickersLight.blue} />,

  // Flowers / variants
  '🌷': (s) => <Flower size={s} petal={stickersLight.pink} center={stickersLight.yellow} />,
  '💐': (s) => <Flower size={s} />,

  // Pregnancy / baby faces — no exact sticker, use Smiley as closest
  '👶': (s) => <Smiley size={s} fill={stickersLight.pink} />,
  '🧒': (s) => <Smiley size={s} fill={stickersLight.yellow} />,
  '🤱': (s) => <Bottle size={s} />,
  '👵': (s) => <Smiley size={s} fill={stickersLight.peach} />,
  '👴': (s) => <Smiley size={s} fill={stickersLight.peach} />,
  '👩': (s) => <Smiley size={s} fill={stickersLight.pink} />,
  '👨': (s) => <Smiley size={s} fill={stickersLight.blue} />,
  '👩‍👦': (s) => <Heart size={s} fill={stickersLight.pink} />,
  '👨‍👩‍👦': (s) => <Heart size={s} fill={stickersLight.lilac} />,
  '🫂': (s) => <Heart size={s} fill={stickersLight.peach} />,

  // Stars / twinkle variants
  '💫': (s) => <Sparkle size={s} />,
  '🔥': (s) => <Bolt size={s} fill={stickersLight.coral} />,
  '🔮': (s) => <Gem size={s} fill={stickersLight.lilac} />,

  // Activity / play
  '🏃': (s) => <Bolt size={s} fill={stickersLight.coral} />,
  '🏃‍♀️': (s) => <Bolt size={s} fill={stickersLight.coral} />,
  '🏃‍♂️': (s) => <Bolt size={s} fill={stickersLight.coral} />,
  '🧘': (s) => <Flower size={s} petal={stickersLight.lilac} center={stickersLight.yellow} />,
  '🧘‍♀️': (s) => <Flower size={s} petal={stickersLight.lilac} center={stickersLight.yellow} />,
  '🌳': (s) => <Leaf size={s} fill={stickersLight.green} />,
  '🌲': (s) => <Leaf size={s} fill={stickersLight.green} />,
  '🎨': (s) => <Flower size={s} petal={stickersLight.pink} center={stickersLight.yellow} />,
  '🧩': (s) => <Gem size={s} />,
  '📖': (s) => <Leaf size={s} fill={stickersLight.peach} />,
  '📚': (s) => <Leaf size={s} fill={stickersLight.peach} />,
  '📝': (s) => <Leaf size={s} />,
  '🏠': (s) => <Bear size={s} />,
  '🏡': (s) => <Bear size={s} />,

  // Actions / symbols
  '✅': (s) => <Check size={s} />,
  '☑️': (s) => <Check size={s} />,
  '✔': (s) => <Check size={s} />,
  '✔️': (s) => <Check size={s} />,
  'ℹ️': (s) => <Bolt size={s} fill={stickersLight.blue} />,
  '⚠️': (s) => <Bolt size={s} fill={stickersLight.coral} />,
  '❗': (s) => <Bolt size={s} fill={stickersLight.coral} />,
  '❓': (s) => <Gem size={s} fill={stickersLight.lilac} />,

  // Moods fallback
  '😐': (s) => <Smiley size={s} fill={stickersLight.peach} />,
  '😟': (s) => <Sad size={s} fill={stickersLight.peach} />,
  '😠': (s) => <Sad size={s} fill={stickersLight.coral} />,
  '😍': (s) => <Smiley size={s} fill={stickersLight.pink} />,
  '🤩': (s) => <Smiley size={s} fill={stickersLight.yellow} />,
  '😰': (s) => <Sad size={s} fill={stickersLight.lilac} />,
  '🤢': (s) => <Smiley size={s} fill={stickersLight.green} />,

  // Time / travel
  '📅': (s) => <Cake size={s} fill={stickersLight.lilac} />,
  '⏰': (s) => <Sun size={s} />,
  '⏱️': (s) => <Sun size={s} fill={stickersLight.peach} />,
  '✈️': (s) => <Plane size={s} />,
  '🚗': (s) => <Plane size={s} fill={stickersLight.peach} />,

  // Body / face / misc
  '👣': (s) => <Foot size={s} />,
  '🦶': (s) => <Foot size={s} />,
  '🫁': (s) => <Lungs size={s} />,
  '💋': (s) => <Lips size={s} />,
  '👋': (s) => <Wave size={s} />,
  '🔑': (s) => <Key size={s} />,
  '💎': (s) => <Diamond size={s} />,
  '💊': (s) => <Pill size={s} />,

  // Growth leap / concept emojis (Wonder Weeks)
  '🔁': (s) => <Bolt size={s} fill={stickersLight.blue} />,
  '🎬': (s) => <Star size={s} fill={stickersLight.peach} />,
  '🔗': (s) => <Bolt size={s} fill={stickersLight.lilac} />,
  '🔢': (s) => <Diamond size={s} fill={stickersLight.yellow} />,
  '⚖️': (s) => <Diamond size={s} fill={stickersLight.peach} />,
  '⚖': (s) => <Diamond size={s} fill={stickersLight.peach} />,
  '🌍': (s) => <Sun size={s} fill={stickersLight.blue} />,
  '🌎': (s) => <Sun size={s} fill={stickersLight.blue} />,
  '🌏': (s) => <Sun size={s} fill={stickersLight.blue} />,

  // Weather / phase extras
  '🌧️': (s) => <Cloud size={s} fill={stickersLight.blue} />,
  '🌧': (s) => <Cloud size={s} fill={stickersLight.blue} />,
  '🚀': (s) => <Plane size={s} fill={stickersLight.coral} />,

  // Food extras
  '🥗': (s) => <Leaf size={s} fill={stickersLight.green} />,
  '🪺': (s) => <Leaf size={s} fill={stickersLight.peach} />,
  '🧘‍♂️': (s) => <Flower size={s} petal={stickersLight.lilac} center={stickersLight.yellow} />,

  // Medical / places
  '🏥': (s) => <Heart size={s} fill={stickersLight.coral} />,
  '💉': (s) => <Pill size={s} fill={stickersLight.blue} />,
  '🩺': (s) => <Heart size={s} fill={stickersLight.lilac} />,
  '🌡️': (s) => <Drop size={s} fill={stickersLight.coral} />,
  '🌡': (s) => <Drop size={s} fill={stickersLight.coral} />,

  // Targets / brain / progress
  '🎯': (s) => <Diamond size={s} fill={stickersLight.coral} />,
  '🧠': (s) => <Flower size={s} petal={stickersLight.pink} center={stickersLight.coral} />,
  '📊': (s) => <Diamond size={s} fill={stickersLight.blue} />,
  '📈': (s) => <Bolt size={s} fill={stickersLight.green} />,
  '📉': (s) => <Bolt size={s} fill={stickersLight.coral} />,
}

// Inline SVG check mark — independent of font fallback quirks.
function Check({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l4 4 10-10"
        stroke={stickersLight.green}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

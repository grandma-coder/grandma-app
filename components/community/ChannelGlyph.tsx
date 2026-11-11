/**
 * ChannelGlyph — a channel / person icon.
 *
 * Diffuse keeps the Character blob it always drew. The light (site) look swaps each blob
 * concept for the site sticker that means the same thing, so channels read like the rest
 * of the app instead of carrying the old blob family.
 */
import { Character, type CharacterName } from '../characters/Characters'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'

const BLOB_STICKER: Partial<Record<CharacterName, SiteStickerName>> = {
  ovulation: 'egg', nutrition: 'avocado', night: 'moon', heartbeat: 'heart', kick: 'foot',
  contraction: 'stopwatch', baby: 'baby', sleep: 'moon', feeding: 'bottle', growth: 'ruler',
  vaccine: 'syringe', community: 'globe', selfcare: 'leaf', health: 'stetho', star: 'star',
  heart: 'love', water: 'glass', sparkle: 'star', sun: 'sun', gem: 'plum', crown: 'star',
  photo: 'camera', chart: 'bars', chat: 'bubble', activity: 'sun',
}

export function blobSiteSticker(name: CharacterName): SiteStickerName {
  return BLOB_STICKER[name] ?? 'globe'
}

/** `site` overrides the light-look sticker when the blob concept is too broad (e.g. a person → `me`). */
export function ChannelGlyph({ name, size, bg, color, site }: { name: CharacterName; size: number; bg?: string; color?: string; site?: SiteStickerName }) {
  const diffuse = useIsDiffuse()
  if (diffuse) return <Character name={name} size={size} bg={bg} color={color} />
  return <SiteSticker name={site ?? blobSiteSticker(name)} size={Math.round(size * 1.15)} />
}

/**
 * Tests for the channel-sticker identity helpers in lib/channelSticker.ts.
 *
 * These cover the pure encode/parse round-trip for explicit sticker picks
 * (stored in avatar_url as `sticker://name/color`) and the deterministic
 * hash fallback that gives every channel/author a stable sticker even with
 * no explicit pick. Determinism matters: the same id must always map to the
 * same sticker across app launches, or a channel's avatar would flicker.
 */

import {
  encodeStickerUrl,
  parseStickerUrl,
  channelSticker,
  STICKER_PRESETS,
} from '../channelSticker'

describe('parseStickerUrl / encodeStickerUrl round-trip', () => {
  it('encodes a name/color pair into the sticker:// scheme', () => {
    expect(encodeStickerUrl('heart', 'pink')).toBe('sticker://heart/pink')
  })

  it('parses a valid sticker url back to its parts', () => {
    expect(parseStickerUrl('sticker://moon/lilac')).toEqual({ name: 'moon', color: 'lilac' })
  })

  it('round-trips every preset', () => {
    for (const preset of STICKER_PRESETS) {
      const url = encodeStickerUrl(preset.name, preset.color)
      expect(parseStickerUrl(url)).toEqual(preset)
    }
  })

  it('returns null for null / undefined / empty input', () => {
    expect(parseStickerUrl(null)).toBeNull()
    expect(parseStickerUrl(undefined)).toBeNull()
    expect(parseStickerUrl('')).toBeNull()
  })

  it('returns null for a non-sticker url (e.g. an uploaded photo)', () => {
    expect(parseStickerUrl('https://cdn.example.com/avatar.jpg')).toBeNull()
  })

  it('returns null for an unknown sticker name', () => {
    expect(parseStickerUrl('sticker://rocket/pink')).toBeNull()
  })

  it('returns null for an unknown color', () => {
    expect(parseStickerUrl('sticker://heart/teal')).toBeNull()
  })
})

describe('channelSticker deterministic fallback', () => {
  it('returns the same sticker for the same id across calls', () => {
    const a = channelSticker('channel-abc', false)
    const b = channelSticker('channel-abc', false)
    expect(a.fill).toBe(b.fill)
    expect(a.tint).toBe(b.tint)
    expect(a.Component).toBe(b.Component)
  })

  it('honors an explicit avatar pick over the hash fallback', () => {
    const explicit = channelSticker('channel-abc', false, encodeStickerUrl('star', 'yellow'))
    const direct = channelSticker('any-other-id', false, encodeStickerUrl('star', 'yellow'))
    // Same explicit pick → same fill/tint regardless of the id.
    expect(explicit.fill).toBe(direct.fill)
    expect(explicit.tint).toBe(direct.tint)
  })

  it('falls back to the hash when the avatar url is a non-sticker value', () => {
    const hashed = channelSticker('channel-abc', false)
    const withPhoto = channelSticker('channel-abc', false, 'https://cdn.example.com/x.jpg')
    expect(withPhoto.fill).toBe(hashed.fill)
  })

  it('always resolves a renderable sticker component + colors', () => {
    const s = channelSticker('some-id', true)
    expect(s.Component).toBeDefined()
    expect(typeof s.fill).toBe('string')
    expect(typeof s.tint).toBe('string')
  })
})

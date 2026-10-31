import { describe, expect, it } from 'vitest'
import { buildManifest, ICONS } from './manifest'

describe('web app manifest', () => {
  const m = buildManifest()
  it('has the install basics', () => {
    expect(m.name).toBe('grandma')
    expect(m.short_name).toBe('grandma')
    expect(m.display).toBe('standalone')
    expect(m.background_color).toBe('#F3F0E8')
    expect(m.theme_color).toBe('#F3F0E8')
  })
  it('starts at the root so the middleware picks the locale', () => {
    expect(m.start_url).toBe('/')
    expect(m.id).toBe(m.start_url)
    expect(m.scope).toBe('/')
  })
  it('lists 192, 512 and maskable icons that point at the icon route', () => {
    const icons = m.icons ?? []
    expect(icons.find((i) => i.sizes === '192x192' && i.purpose === 'any')).toBeTruthy()
    expect(icons.find((i) => i.sizes === '512x512' && i.purpose === 'any')).toBeTruthy()
    expect(icons.find((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBeTruthy()
    for (const i of icons) expect(i.src).toMatch(/^\/icons\/[\w.-]+\.png$/)
  })
  it('every listed icon has a drawable spec (size, safe-zone padding)', () => {
    for (const i of m.icons ?? []) expect(ICONS[i.src.replace('/icons/', '')]).toBeTruthy()
    expect(ICONS['apple-touch-icon.png'].size).toBe(180)
    expect(ICONS['icon-maskable-512.png'].pad).toBeGreaterThan(ICONS['icon-512.png'].pad)
  })
})

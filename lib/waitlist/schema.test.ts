import { describe, it, expect } from 'vitest'
import { waitlistSchema, formDataToObject } from './schema'

const base = { email: 'ana@example.com', mode: 'preg', locale: 'pt', country: 'BR' }

describe('waitlistSchema', () => {
  it('normalises email', () => expect(waitlistSchema.parse({ ...base, email: '  Ana@Example.COM ' }).email).toBe('ana@example.com'))
  it('maps empty name to null', () => {
    expect(waitlistSchema.parse({ ...base, name: '   ' }).name).toBeNull()
    expect(waitlistSchema.parse({ ...base, name: ' Ana ' }).name).toBe('Ana')
  })
  it('reads the checkbox', () => {
    expect(waitlistSchema.parse({ ...base, notify_launch: 'on' }).notifyLaunch).toBe(true)
    expect(waitlistSchema.parse(base).notifyLaunch).toBe(false)
  })
  it('falls back to en for unknown locale', () => expect(waitlistSchema.parse({ ...base, locale: 'de' }).locale).toBe('en'))
  it('accepts the three countries', () => {
    for (const c of ['BR', 'US', 'OTHER']) expect(waitlistSchema.parse({ ...base, country: c }).country).toBe(c)
  })
  it('drops oversized utm values', () => {
    const r = waitlistSchema.parse({ ...base, utm_source: 'x'.repeat(201), utm_medium: 'social' })
    expect(r.utmSource).toBeNull()
    expect(r.utmMedium).toBe('social')
  })
  it.each([
    [{ ...base, email: '' }, 'email', 'email_required'],
    [{ ...base, email: 'ana@' }, 'email', 'email_invalid'],
    [{ ...base, email: `${'a'.repeat(250)}@x.co` }, 'email', 'email_too_long'],
    [{ ...base, name: 'n'.repeat(81) }, 'name', 'name_too_long'],
    [{ ...base, mode: 'care' }, 'mode', 'mode_required'],
    [{ email: 'ana@example.com', locale: 'pt', country: 'BR' }, 'mode', 'mode_required'],
    [{ ...base, country: 'DE' }, 'country', 'country_required'],
    [{ email: 'ana@example.com', locale: 'pt', mode: 'preg' }, 'country', 'country_required'],
  ])('rejects %j (%s=%s)', (input, field, code) => {
    const r = waitlistSchema.safeParse(input)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors[field as 'email']?.[0]).toBe(code)
  })
})

describe('formDataToObject', () => {
  it('keeps string entries only', () => {
    const fd = new FormData()
    fd.set('email', 'a@b.co')
    fd.set('file', new Blob(['x']))
    expect(formDataToObject(fd)).toEqual({ email: 'a@b.co' })
  })
})

import { describe, it, expect } from 'vitest'
import { makeIpHasher } from './hash'

describe('makeIpHasher', () => {
  const h = makeIpHasher('salt-1')
  it('deterministic hex', () => { expect(h('1.2.3.4')).toBe(h('1.2.3.4')); expect(h('1.2.3.4')).toMatch(/^[0-9a-f]{64}$/) })
  it('salted, never the raw ip', () => { expect(makeIpHasher('salt-2')('1.2.3.4')).not.toBe(h('1.2.3.4')); expect(h('1.2.3.4')).not.toContain('1.2.3.4') })
  it('null for missing ip', () => { expect(h(null)).toBeNull(); expect(h('')).toBeNull() })
  it('refuses an empty salt', () => expect(() => makeIpHasher('')).toThrow())
})

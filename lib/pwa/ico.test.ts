import { describe, expect, it } from 'vitest'
import { pngToIco } from './ico'

describe('pngToIco', () => {
  it('writes a one-image ICO directory in front of the PNG', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    const ico = pngToIco(png, 48)
    expect(ico.readUInt16LE(2)).toBe(1) // icon
    expect(ico.readUInt16LE(4)).toBe(1) // one image
    expect(ico[6]).toBe(48)
    expect(ico.readUInt32LE(14)).toBe(png.length)
    expect(ico.readUInt32LE(18)).toBe(22)
    expect(ico.subarray(22).equals(png)).toBe(true)
  })
})

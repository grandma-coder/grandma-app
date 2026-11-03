/** Wrap one PNG in an ICO container (PNG-in-ICO, supported by every current browser). */
export function pngToIco(png: Buffer, size: number): Buffer {
  const head = Buffer.alloc(22)
  head.writeUInt16LE(0, 0) // reserved
  head.writeUInt16LE(1, 2) // type: icon
  head.writeUInt16LE(1, 4) // one image
  head.writeUInt8(size >= 256 ? 0 : size, 6) // width
  head.writeUInt8(size >= 256 ? 0 : size, 7) // height
  head.writeUInt8(0, 8) // palette
  head.writeUInt8(0, 9)
  head.writeUInt16LE(1, 10) // planes
  head.writeUInt16LE(32, 12) // bits per pixel
  head.writeUInt32LE(png.length, 14) // image size
  head.writeUInt32LE(22, 18) // image offset
  return Buffer.concat([head, png])
}

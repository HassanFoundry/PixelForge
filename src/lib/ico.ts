export interface IcoSource {
  size: number
  png: Blob
}

export async function buildIcoFile(sources: IcoSource[]): Promise<Blob> {
  const buffers = await Promise.all(sources.map((source) => source.png.arrayBuffer()))
  const header = new DataView(new ArrayBuffer(6))
  header.setUint16(2, 1, true)
  header.setUint16(4, sources.length, true)
  const directory = new DataView(new ArrayBuffer(sources.length * 16))
  let offset = 6 + sources.length * 16
  sources.forEach((source, index) => {
    const base = index * 16
    const size = source.size >= 256 ? 0 : source.size
    directory.setUint8(base, size)
    directory.setUint8(base + 1, size)
    directory.setUint16(base + 4, 1, true)
    directory.setUint16(base + 6, 32, true)
    directory.setUint32(base + 8, buffers[index].byteLength, true)
    directory.setUint32(base + 12, offset, true)
    offset += buffers[index].byteLength
  })
  return new Blob([header.buffer, directory.buffer, ...buffers], { type: 'image/x-icon' })
}

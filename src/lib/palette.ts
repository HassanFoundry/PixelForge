export interface ExtractedColor {
  red: number
  green: number
  blue: number
  share: number
}

interface ColorBox {
  indices: number[]
  redMin: number
  redMax: number
  greenMin: number
  greenMax: number
  blueMin: number
  blueMax: number
}

export function extractPalette(pixels: Uint8ClampedArray, requested: number): ExtractedColor[] {
  const totalSamples = Math.floor(pixels.length / 4)
  if (totalSamples === 0 || requested < 1) return []
  const stride = Math.max(1, Math.floor(totalSamples / 24000))
  const samples: number[] = []
  for (let i = 0; i < totalSamples; i += stride) {
    const offset = i * 4
    if (pixels[offset + 3] < 128) continue
    samples.push(pixels[offset], pixels[offset + 1], pixels[offset + 2])
  }
  const sampleCount = samples.length / 3
  if (sampleCount === 0) return []

  const allIndices: number[] = []
  for (let i = 0; i < sampleCount; i++) allIndices.push(i)
  const boxes: ColorBox[] = [makeBox(samples, allIndices)]

  const target = Math.max(1, Math.min(requested, Math.floor(sampleCount / 4)))
  while (boxes.length < target) {
    let splitIndex = -1
    let splitScore = 0
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]
      if (box.indices.length < 8) continue
      const score = box.indices.length * channelRange(box)
      if (score > splitScore) {
        splitScore = score
        splitIndex = i
      }
    }
    if (splitIndex === -1) break
    const box = boxes[splitIndex]
    const channel = widestChannel(box)
    box.indices.sort((a, b) => samples[a * 3 + channel] - samples[b * 3 + channel])
    const middle = Math.floor(box.indices.length / 2)
    const first = makeBox(samples, box.indices.slice(0, middle))
    const second = makeBox(samples, box.indices.slice(middle))
    boxes.splice(splitIndex, 1, first, second)
  }

  const colors: ExtractedColor[] = boxes.map((box) => {
    let red = 0
    let green = 0
    let blue = 0
    for (const index of box.indices) {
      red += samples[index * 3]
      green += samples[index * 3 + 1]
      blue += samples[index * 3 + 2]
    }
    const size = box.indices.length
    return {
      red: Math.round(red / size),
      green: Math.round(green / size),
      blue: Math.round(blue / size),
      share: size / sampleCount
    }
  })

  const merged: ExtractedColor[] = []
  for (const color of colors.sort((a, b) => b.share - a.share)) {
    const twin = merged.find(
      (existing) => colorDistance(existing, color) < 28
    )
    if (twin && merged.length > 1) {
      const combined = twin.share + color.share
      twin.red = Math.round((twin.red * twin.share + color.red * color.share) / combined)
      twin.green = Math.round((twin.green * twin.share + color.green * color.share) / combined)
      twin.blue = Math.round((twin.blue * twin.share + color.blue * color.share) / combined)
      twin.share = combined
    } else {
      merged.push(color)
    }
  }
  return merged.slice(0, requested)
}

function makeBox(samples: number[], indices: number[]): ColorBox {
  const box: ColorBox = {
    indices,
    redMin: 255,
    redMax: 0,
    greenMin: 255,
    greenMax: 0,
    blueMin: 255,
    blueMax: 0
  }
  for (const index of indices) {
    const red = samples[index * 3]
    const green = samples[index * 3 + 1]
    const blue = samples[index * 3 + 2]
    box.redMin = Math.min(box.redMin, red)
    box.redMax = Math.max(box.redMax, red)
    box.greenMin = Math.min(box.greenMin, green)
    box.greenMax = Math.max(box.greenMax, green)
    box.blueMin = Math.min(box.blueMin, blue)
    box.blueMax = Math.max(box.blueMax, blue)
  }
  return box
}

function channelRange(box: ColorBox): number {
  return Math.max(box.redMax - box.redMin, box.greenMax - box.greenMin, box.blueMax - box.blueMin)
}

function widestChannel(box: ColorBox): 0 | 1 | 2 {
  const redRange = box.redMax - box.redMin
  const greenRange = box.greenMax - box.greenMin
  const blueRange = box.blueMax - box.blueMin
  if (greenRange >= redRange && greenRange >= blueRange) return 1
  if (blueRange >= redRange) return 2
  return 0
}

function colorDistance(a: ExtractedColor, b: ExtractedColor): number {
  const red = a.red - b.red
  const green = a.green - b.green
  const blue = a.blue - b.blue
  return Math.sqrt(red * red + green * green + blue * blue)
}

export function toHex(color: ExtractedColor): string {
  const part = (value: number) => value.toString(16).padStart(2, '0')
  return `#${part(color.red)}${part(color.green)}${part(color.blue)}`
}

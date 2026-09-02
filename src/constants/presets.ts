export interface SizePreset {
  label: string
  width: number
  height: number
  group: string
}

export const sizePresets: SizePreset[] = [
  { label: 'Instagram square (1080 × 1080)', width: 1080, height: 1080, group: 'Social' },
  { label: 'Instagram portrait (1080 × 1350)', width: 1080, height: 1350, group: 'Social' },
  { label: 'Instagram story / Reels (1080 × 1920)', width: 1080, height: 1920, group: 'Social' },
  { label: 'YouTube thumbnail (1280 × 720)', width: 1280, height: 720, group: 'Social' },
  { label: 'X / Twitter post (1600 × 900)', width: 1600, height: 900, group: 'Social' },
  { label: 'Facebook post (1200 × 630)', width: 1200, height: 630, group: 'Social' },
  { label: 'Facebook page cover (820 × 312)', width: 820, height: 312, group: 'Social' },
  { label: 'LinkedIn post (1200 × 627)', width: 1200, height: 627, group: 'Social' },
  { label: 'LinkedIn banner (1584 × 396)', width: 1584, height: 396, group: 'Social' },
  { label: 'Profile picture (400 × 400)', width: 400, height: 400, group: 'Common' },
  { label: 'Website hero (1920 × 1080)', width: 1920, height: 1080, group: 'Web' },
  { label: 'Blog thumbnail (1200 × 630)', width: 1200, height: 630, group: 'Web' }
]

export const presetGroups = ['Social', 'Common', 'Web']

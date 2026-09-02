import { useEffect, useRef, useState } from 'react'

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { inlineSize, blockSize } = entry.contentBoxSize[0] ?? {
        inlineSize: element.clientWidth,
        blockSize: element.clientHeight
      }
      setSize({ width: Math.round(inlineSize), height: Math.round(blockSize) })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, size }
}

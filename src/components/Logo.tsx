import anvilJson from '../assets/anvil.json'

const anvil = anvilJson as {
  size: number
  palette: Record<string, number[]>
  rows: string[]
}

const cells: { x: number; y: number; fill: string }[] = []
anvil.rows.forEach((row, y) => {
  row.split('').forEach((code, x) => {
    const color = anvil.palette[code]
    if (color) cells.push({ x, y, fill: `rgb(${color[0]}, ${color[1]}, ${color[2]})` })
  })
})

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="-1 -1 18 18" className={className} aria-hidden="true" shapeRendering="crispEdges">
      {cells.map((cell) => (
        <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width={1} height={1} fill={cell.fill} />
      ))}
    </svg>
  )
}

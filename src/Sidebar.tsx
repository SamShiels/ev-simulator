import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RoadType } from './App'

interface Props {
  selectedRoadType: RoadType
  onSelect: (type: RoadType) => void
}

const ROAD_TYPES: { type: RoadType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'straight',
    label: 'Straight',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
        <rect width="32" height="32" fill="#3a6b2a" rx="3" />
        <rect x="11" y="0" width="10" height="32" fill="#555" />
        <line x1="16" y1="1" x2="16" y2="11" stroke="#ffcc00" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="16" y1="21" x2="16" y2="31" stroke="#ffcc00" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
    ),
  },
  {
    type: 'corner',
    label: 'Corner',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
        <rect width="32" height="32" fill="#3a6b2a" rx="3" />
        {/* Quarter-annulus: bottom edge → right edge */}
        <path d="M 11 32 A 21 21 0 0 1 32 11 L 32 21 A 11 11 0 0 0 21 32 Z" fill="#555" />
        <path
          d="M 16 32 A 16 16 0 0 1 32 16"
          fill="none"
          stroke="#ffcc00"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>
    ),
  },
]

export default function Sidebar({ selectedRoadType, onSelect }: Props) {
  return (
    <Card className="dark absolute right-4 top-1/2 -translate-y-1/2 w-36 bg-card/80 backdrop-blur-md border-border/50 shadow-2xl">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs tracking-widest text-muted-foreground uppercase">
          Road
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <div className="flex flex-col gap-2">
          {ROAD_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-sm w-full',
                selectedRoadType === type
                  ? 'bg-white/20 ring-1 ring-white text-white'
                  : 'text-muted-foreground hover:bg-white/10 hover:text-white',
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground text-center leading-tight">
          Right-click to rotate
        </p>
      </CardContent>
    </Card>
  )
}

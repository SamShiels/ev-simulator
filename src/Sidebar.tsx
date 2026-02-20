import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  colors: string[]
  selectedColor: string
  onSelect: (color: string) => void
}

export default function Sidebar({ colors, selectedColor, onSelect }: Props) {
  return (
    <Card className="dark absolute right-4 top-1/2 -translate-y-1/2 w-36 bg-card/80 backdrop-blur-md border-border/50 shadow-2xl">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs tracking-widest text-muted-foreground uppercase">
          Blocks
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {colors.map(color => (
            <Button
              key={color}
              variant="ghost"
              size="icon"
              onClick={() => onSelect(color)}
              className={cn(
                'w-8 h-8 rounded-md transition-all',
                selectedColor === color
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-card scale-110'
                  : 'hover:scale-105 opacity-70 hover:opacity-100',
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

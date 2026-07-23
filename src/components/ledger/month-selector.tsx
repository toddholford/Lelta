import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MONTH_NAMES } from '@/lib/format'

interface MonthSelectorProps {
  year: number
  month: number // 0-based
  onChange: (year: number, month: number) => void
}

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  function shift(delta: number) {
    const d = new Date(year, month + delta, 1)
    onChange(d.getFullYear(), d.getMonth())
  }

  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => shift(-1)}>
        <ChevronLeft />
      </Button>
      <span className="text-base font-semibold tabular-nums">
        {MONTH_NAMES[month]} {year}
      </span>
      <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => shift(1)}>
        <ChevronRight />
      </Button>
    </div>
  )
}

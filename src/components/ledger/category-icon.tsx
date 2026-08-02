import {
  Banknote,
  CircleDollarSign,
  CreditCard,
  Landmark,
  PartyPopper,
  PiggyBank,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIconStyle } from '@/hooks/use-icon-style'
import { categoryColor } from '@/lib/icon-style'

const iconByCategory: Record<string, LucideIcon> = {
  'credit card': CreditCard,
  loan: Landmark,
  utils: Zap,
  subs: Repeat,
  groceries: ShoppingCart,
  shopping: ShoppingBag,
  dining: UtensilsCrossed,
  maintenance: Wrench,
  fun: PartyPopper,
  paycheck: Banknote,
  other: PiggyBank,
}

export function CategoryIcon({ category, className }: { category?: string; className?: string }) {
  const { iconStyle } = useIconStyle()
  if (iconStyle === 'none') return null

  const base = 'flex size-10 shrink-0 items-center justify-center rounded-full'

  if (iconStyle === 'empty') {
    return <div className={cn(base, 'bg-secondary', className)} />
  }

  if (iconStyle === 'color') {
    return (
      <div className={cn(base, className)} style={{ backgroundColor: categoryColor(category) }} />
    )
  }

  const Icon = (category && iconByCategory[category]) || CircleDollarSign
  return (
    <div className={cn(base, 'bg-secondary text-secondary-foreground', className)}>
      <Icon className="size-5" />
    </div>
  )
}

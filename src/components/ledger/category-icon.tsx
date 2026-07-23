import {
  CircleDollarSign,
  CreditCard,
  Landmark,
  PartyPopper,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconByCategory: Record<string, LucideIcon> = {
  'credit card': CreditCard,
  loan: Landmark,
  debts: Receipt,
  utils: Zap,
  subs: Repeat,
  groceries: ShoppingCart,
  shopping: ShoppingBag,
  dining: UtensilsCrossed,
  maintenance: Wrench,
  fun: PartyPopper,
}

export function CategoryIcon({ category, className }: { category?: string; className?: string }) {
  const Icon = (category && iconByCategory[category]) || CircleDollarSign
  return (
    <div
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground',
        className,
      )}
    >
      <Icon className="size-5" />
    </div>
  )
}

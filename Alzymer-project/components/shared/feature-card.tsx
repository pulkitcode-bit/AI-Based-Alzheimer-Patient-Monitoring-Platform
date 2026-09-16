import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  colorVariant?: 'teal' | 'amber' | 'sage' | 'blue'
}

const colorStyles = {
  teal: 'bg-primary/15 text-primary border-primary/25',
  amber: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
  sage: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
  blue: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
}

export default function FeatureCard({ icon: Icon, title, description, colorVariant = 'teal' }: FeatureCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/70 p-7 sm:p-8 shadow-soft-xs hover:shadow-soft-lg hover:-translate-y-1.5 transition-all duration-300 group">
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <div className={cn(
          'p-3.5 rounded-2xl border flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-soft-xs',
          colorStyles[colorVariant]
        )}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed text-base">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

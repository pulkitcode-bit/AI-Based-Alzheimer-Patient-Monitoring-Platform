import FeatureCard from '@/components/shared/feature-card'
import { Gamepad2, LineChart, MessageSquare, Users } from 'lucide-react'

const features = [
  {
    icon: Gamepad2,
    title: 'Cognitive Games',
    description: 'Engaging games designed specifically to strengthen memory, pattern recognition, and object recall through regular, fun play.',
    colorVariant: 'teal' as const
  },
  {
    icon: LineChart,
    title: 'Progress Tracking',
    description: 'Comprehensive analytics and visual progression charts showing scores over time for both patients and healthcare providers.',
    colorVariant: 'amber' as const
  },
  {
    icon: MessageSquare,
    title: 'AI Companion Support',
    description: 'An empathetic, 24/7 digital assistant available for questions, daily reminders, and emotional support tailored to patient needs.',
    colorVariant: 'sage' as const
  },
  {
    icon: Users,
    title: 'Doctor Oversight',
    description: 'Physicians monitor performance trends in real-time, adjust targets, and issue direct guidance based on cognitive analytics.',
    colorVariant: 'blue' as const
  }
]

export default function FeaturesSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Comprehensive Cognitive Care Platform
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Everything required to evaluate, support, and monitor cognitive health in one cohesive interface.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  )
}

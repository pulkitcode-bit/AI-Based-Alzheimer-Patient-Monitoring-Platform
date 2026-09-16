import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-br from-primary-soft via-accent/40 to-background p-8 text-center shadow-soft-lg sm:p-16">
          {/* Decorative ambient background blur */}
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-[80px]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-warning/15 blur-[80px]" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-primary-muted">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span>Begin your journey</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight text-balance leading-tight">
              Start Your Cognitive Health Journey Today
            </h2>
            
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Join patients, families, and healthcare professionals using NeuroMind to improve cognitive health outcomes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link href="/patient-login" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-14 px-9 text-lg font-semibold rounded-2xl shadow-soft-md hover:shadow-soft-lg group"
                >
                  Get Started as Patient
                  <ArrowRight className="ml-2.5 w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200" />
                </Button>
              </Link>
              <Link href="/doctor-login" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto h-14 px-9 text-lg font-semibold rounded-2xl border-border/80 bg-background/80"
                >
                  Doctor Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

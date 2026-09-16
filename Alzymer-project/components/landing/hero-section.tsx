import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles, ShieldCheck, Activity, Award } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-background">
      {/* Decorative ambient background mesh blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/12 blur-[100px]" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[90px]" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Main Copy & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center">
              <Badge variant="default" className="gap-2 px-3.5 py-1 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>AI-Powered Cognitive Care Platform</span>
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.15] text-balance">
                Gentle Cognitive Care for <span className="text-primary underline decoration-primary/30 decoration-wavy decoration-2">Alzheimer's Patients</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                NeuroMind combines medically-informed games, real-time progress tracking, and dedicated doctor oversight to support brain health and enhance daily life.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
              <Link href="/patient-login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-13 px-8 text-lg font-semibold rounded-2xl shadow-soft-md hover:shadow-soft-lg group">
                  Start Playing
                  <ArrowRight className="ml-2.5 w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200" />
                </Button>
              </Link>
              <Link href="/doctor-login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-13 px-8 text-lg font-semibold rounded-2xl border-border/80">
                  Doctor Portal
                </Button>
              </Link>
            </div>

            {/* Trust Indicators / Stats */}
            <div className="pt-4 border-t border-border/50 grid grid-cols-3 gap-4 text-left max-w-lg mx-auto lg:mx-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary font-bold text-lg sm:text-xl">
                  <Activity className="w-5 h-5" />
                  <span>10+</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Cognitive Games</p>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary font-bold text-lg sm:text-xl">
                  <ShieldCheck className="w-5 h-5" />
                  <span>100%</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Doctor Monitored</p>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary font-bold text-lg sm:text-xl">
                  <Award className="w-5 h-5" />
                  <span>24/7</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">AI Support</p>
              </div>
            </div>
          </div>

          {/* Graphic / Abstract Brain Illustration & Interactive Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative Brain Node SVG Graphic backdrop */}
              <div className="absolute -top-6 -right-6 w-32 h-32 opacity-20 pointer-events-none">
                <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-primary">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  <circle cx="30" cy="30" r="6" fill="currentColor" />
                  <circle cx="70" cy="40" r="5" fill="currentColor" />
                  <circle cx="50" cy="70" r="7" fill="currentColor" />
                  <path d="M30 30 L70 40 L50 70 Z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Preview Glass Card */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-soft-xl relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between pb-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 animate-pulse" />
                    <span className="font-semibold text-base text-foreground">Patient Dashboard</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                    Active Session
                  </Badge>
                </div>

                <div className="space-y-5 pt-5">
                  {/* Score Indicator */}
                  <div className="p-4 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Weekly Cognitive Index</p>
                      <p className="text-2xl font-bold text-foreground mt-0.5">88.5 <span className="text-xs text-emerald-600 font-semibold">+4.2 pts</span></p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold text-lg">
                      A+
                    </div>
                  </div>

                  {/* Activity Bar Preview */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-foreground">Memory Matrix Game</span>
                      <span className="text-primary font-bold">92%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-[92%]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-foreground">Pattern Matcher</span>
                      <span className="text-primary font-bold">85%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                    </div>
                  </div>

                  {/* Doctor note snippet */}
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <strong className="font-semibold">Dr. Sarah Vance:</strong> "Great memory consistency this week! Keep playing daily."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

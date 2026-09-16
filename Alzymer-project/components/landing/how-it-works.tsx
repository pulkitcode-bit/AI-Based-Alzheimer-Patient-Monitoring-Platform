const steps = [
  {
    number: '1',
    title: 'Patient Signup',
    description: 'Create a secure account and personalize your cognitive care profile with basic medical details.'
  },
  {
    number: '2',
    title: 'Doctor Connection',
    description: 'Invite your doctor or care team to monitor your activities and provide personalized recommendations.'
  },
  {
    number: '3',
    title: 'Daily Cognitive Play',
    description: 'Play tailored memory and pattern games designed specifically for Alzheimer\'s care at your own pace.'
  },
  {
    number: '4',
    title: 'Track Improvement',
    description: 'Review clear progress charts of your consistency and share insights with family and doctors.'
  }
]

export default function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-muted/40 border-y border-border/40 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            How NeuroMind Works
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Four simple steps to start your structured cognitive health routine
          </p>
        </div>

        <div className="relative">
          {/* Connecting line between steps on desktop */}
          <div 
            aria-hidden="true"
            className="absolute left-[12%] right-[12%] top-12 z-0 hidden h-1 rounded-full bg-linear-to-r from-primary/30 via-primary to-primary/30 lg:block"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="bg-card rounded-2xl p-7 text-center border border-border/70 shadow-soft-xs hover:shadow-soft-md hover:-translate-y-1.5 transition-all duration-300 group flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-soft-sm group-hover:scale-110 transition-transform duration-300 mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

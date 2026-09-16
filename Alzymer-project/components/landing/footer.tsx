import Link from 'next/link'
import { Brain } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-foreground text-background py-14 px-4 sm:px-6 lg:px-8 border-t border-border/20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-background hover:opacity-90 transition-opacity">
              <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                <Brain className="w-5 h-5" />
              </div>
              <span className="tracking-tight">NeuroMind</span>
            </Link>
            <p className="text-sm opacity-80 leading-relaxed">
              Empowering cognitive health and improving daily quality of life for Alzheimer's patients and care teams.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-primary">Platform</h4>
            <ul className="space-y-2.5 text-sm opacity-80">
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">Cognitive Games</Link></li>
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">Doctor Dashboard</Link></li>
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">AI Companion</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-primary">Resources</h4>
            <ul className="space-y-2.5 text-sm opacity-80">
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">About Cognitive Care</Link></li>
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">Research & Efficacy</Link></li>
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">Help & Support</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-primary">Legal & Trust</h4>
            <ul className="space-y-2.5 text-sm opacity-80">
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">Terms of Service</Link></li>
              <li><Link href="#" className="hover:opacity-100 hover:underline transition-opacity">Security & HIPAA</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-background/15 pt-8 text-center text-sm opacity-75">
          <p>&copy; {currentYear} NeuroMind. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

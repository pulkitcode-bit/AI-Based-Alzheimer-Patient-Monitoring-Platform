'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export default function ChatbotPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace(ROUTES.PATIENT_DASHBOARD)
  }, [router])

  return null
}

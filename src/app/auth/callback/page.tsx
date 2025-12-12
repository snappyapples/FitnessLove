'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const hasHandled = useRef(false)

  useEffect(() => {
    if (hasHandled.current) return
    hasHandled.current = true

    // Listen for auth state change - this fires when Supabase processes the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/')
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Ignore these events
      }
    })

    // Also check if already signed in (in case event already fired)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/')
      }
    })

    // Timeout fallback - if nothing happens after 5 seconds, redirect to login
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          console.error('Auth callback timeout - no session established')
          router.push('/login?error=timeout')
        }
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Signing you in...</span>
      </div>
    </div>
  )
}

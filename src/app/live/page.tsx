'use client'

import { useEffect } from 'react'

export default function LivePage() {
  useEffect(() => {
    // Redirect to keeper-console.html which is the authoritative HaloGrid Classic
    window.location.href = '/keeper-console.html'
  }, [])

  return null
}

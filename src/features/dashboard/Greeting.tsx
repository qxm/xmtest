import { useEffect, useState } from 'react'
import { getGreeting } from '../../lib/greeting'

export function Greeting({ firstName }: { firstName?: string }) {
  const [greeting, setGreeting] = useState(() => getGreeting())
  useEffect(() => {
    const update = () => setGreeting(getGreeting())
    const timer = window.setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
    }
  }, [])
  return <h1>{greeting}{firstName ? `, ${firstName}` : ''}</h1>
}

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from './Button'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('taxi_theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('taxi_theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-10 w-10 p-0"
      onClick={() => setDark((value) => !value)}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

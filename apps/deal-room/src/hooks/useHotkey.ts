import { useEffect } from 'react'

/** Global keyboard shortcut. `combo` is e.g. "mod+k" (mod = Cmd on macOS,
 *  Ctrl elsewhere) or a bare key like "escape". */
export function useHotkey(combo: string, handler: () => void) {
  useEffect(() => {
    const parts = combo.toLowerCase().split('+')
    const needMod = parts.includes('mod')
    const key = parts[parts.length - 1]

    function onKey(e: KeyboardEvent) {
      const modActive = e.metaKey || e.ctrlKey
      if (needMod && !modActive) return
      if (!needMod && modActive) return
      if (e.key.toLowerCase() !== key) return
      e.preventDefault()
      handler()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [combo, handler])
}

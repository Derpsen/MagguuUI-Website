/**
 * Copy text to the clipboard: async Clipboard API first, then a hidden
 * textarea + execCommand('copy') for insecure contexts / older browsers.
 * Returns true only when one of the two actually worked. CSP-safe: no inline
 * style attributes (CSSOM property writes are allowed), no eval.
 */

export interface ClipboardEnv {
  navigator?: Pick<Navigator, 'clipboard'> | { clipboard?: { writeText?: (text: string) => Promise<void> } }
  document?: Document
}

export async function copyTextToClipboard(text: string, env: ClipboardEnv = {}): Promise<boolean> {
  const nav = env.navigator ?? (typeof navigator !== 'undefined' ? navigator : undefined)
  const doc = env.document ?? (typeof document !== 'undefined' ? document : undefined)

  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text)
      return true
    }
  }
  catch {
    // Permission denied / not focused / insecure context: use the fallback.
  }

  if (!doc?.body || typeof doc.execCommand !== 'function') return false

  const previous = doc.activeElement as HTMLElement | null
  const el = doc.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.setAttribute('aria-hidden', 'true')
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.left = '-9999px'
  el.style.opacity = '0'
  doc.body.appendChild(el)
  let ok: boolean
  try {
    el.focus()
    el.select()
    el.setSelectionRange(0, text.length)
    ok = doc.execCommand('copy')
  }
  catch {
    ok = false
  }
  finally {
    doc.body.removeChild(el)
    previous?.focus?.()
  }
  return ok
}

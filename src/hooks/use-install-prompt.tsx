import { useCallback, useEffect, useState } from 'react'

/**
 * The `beforeinstallprompt` event isn't in the standard DOM lib types.
 * Chromium fires it when the PWA is installable; we stash it and replay it
 * from a user gesture to show the native install sheet.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

/** Persisted so a dismissed banner stays dismissed across visits. */
const DISMISS_KEY = 'lelta-install-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari uses the legacy navigator.standalone flag; everyone else the
  // display-mode media query. Either means we're already the installed app.
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ reports as MacIntel, so fall back to touch-point sniffing.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export type InstallPlatform = 'android' | 'ios'

export interface InstallPromptState {
  /** Running as the installed standalone app. */
  installed: boolean
  /** True on iOS, where install is a manual "Add to Home Screen" flow. */
  ios: boolean
  /** A native install prompt has been captured and can be replayed. */
  canInstallNatively: boolean
  /** True when the auto notice bar should be shown (mobile, not yet dismissed). */
  bannerVisible: boolean
  /** Which install flow the banner should present. */
  platform: InstallPlatform | null
  /** Fires the native install sheet (Chromium only). Resolves once resolved. */
  promptInstall: () => Promise<void>
  /** Hide the auto notice bar for good (does not affect the Settings entry). */
  dismiss: () => void
}

/**
 * Decides whether to surface a "install this app" invitation and, on Chromium,
 * drives the native install prompt.
 *
 * - Android/Chromium: waits for `beforeinstallprompt`, then offers a one-tap
 *   install button backed by the captured event.
 * - iOS Safari: no such event exists, so we detect iOS and surface manual
 *   "Add to Home Screen" instructions instead.
 * - The auto notice bar hides when already installed, off mobile, or dismissed;
 *   the Settings entry uses the finer-grained flags and ignores dismissal.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => wasDismissed())
  const [installed, setInstalled] = useState(() => isStandalone())

  const ios = isIOS()
  const mobile = isMobile()

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      // Stop Chrome's mini-infobar; we present our own invitation instead.
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    // A used prompt can't be replayed; drop it either way. If accepted,
    // `appinstalled` also fires and pins the installed state.
    await deferred.userChoice
    setDeferred(null)
  }, [deferred])

  const canInstallNatively = deferred !== null
  const platform: InstallPlatform | null = canInstallNatively ? 'android' : ios ? 'ios' : null

  const bannerVisible =
    !installed &&
    !dismissed &&
    mobile &&
    // Android needs the captured event; iOS is UA-gated (no event exists).
    (platform === 'android' || platform === 'ios')

  return {
    installed,
    ios,
    canInstallNatively,
    bannerVisible,
    platform,
    promptInstall,
    dismiss,
  }
}

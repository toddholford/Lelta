import { Download, Share, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

/**
 * Mobile-only notice inviting first-time visitors to install Lelta to their
 * home screen as a PWA. Rendered at the app root so it appears over both the
 * sign-in screen and the app itself. Self-hides when already installed, on
 * desktop, or once dismissed (see {@link useInstallPrompt}).
 */
export function InstallBanner() {
  const { bannerVisible, platform, promptInstall, dismiss } = useInstallPrompt()

  if (!bannerVisible) return null

  return (
    <div className="relative z-50 flex items-center gap-3 border-b border-brand-teal/20 bg-brand-teal/10 px-4 py-2 pt-safe text-foreground md:hidden">
      <img
        src="/favicon_io/android-chrome-192x192.png"
        alt=""
        className="size-8 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">Install Lelta</p>
        {platform === 'ios' ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            Tap <Share className="inline size-3.5" aria-label="Share" /> then
            <span className="font-medium">“Add to Home Screen”</span>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add it to your home screen for a full-screen app.
          </p>
        )}
      </div>

      {platform === 'android' && (
        <Button size="sm" onClick={promptInstall} className="shrink-0">
          <Download className="size-4" />
          Install
        </Button>
      )}
      {platform === 'ios' && (
        <Smartphone className="size-5 shrink-0 text-brand-teal" aria-hidden />
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

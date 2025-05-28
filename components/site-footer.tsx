import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-primary/20 bg-background py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-sm text-secondary-300 md:text-base">© 2025 AutoDetailAI. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/terms" className="text-sm text-secondary-300 hover:text-primary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-sm text-secondary-300 hover:text-primary transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  )
}

import Link from "next/link"
import type { ReactNode } from "react"

interface SiteLayoutProps {
  children: ReactNode
}

export function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl font-bold">AutoDetailAI</span>
          </Link>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
              Dashboard
            </Link>
            <Link href="/chat" className="text-sm font-medium hover:underline underline-offset-4">
              AI Assistant
            </Link>
            <Link href="/analytics" className="text-sm font-medium hover:underline underline-offset-4">
              Analytics
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-sm text-gray-500 md:text-base">© 2025 AutoDetailAI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-gray-500 hover:underline underline-offset-4">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:underline underline-offset-4">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

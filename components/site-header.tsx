import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="border-b border-primary/20 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl font-bold gradient-text">AutoDetailAI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a href="#features" className="text-sm font-medium text-secondary-100 hover:text-primary transition-colors">
            Features
          </a>
          <a
            href="#testimonials"
            className="text-sm font-medium text-secondary-100 hover:text-primary transition-colors"
          >
            Testimonials
          </a>
          <a href="#pricing" className="text-sm font-medium text-secondary-100 hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="#faq" className="text-sm font-medium text-secondary-100 hover:text-primary transition-colors">
            FAQ
          </a>
        </nav>
      </div>
    </header>
  )
}

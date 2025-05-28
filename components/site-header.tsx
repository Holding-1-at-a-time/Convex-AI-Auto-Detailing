import { AuthButtons } from "@/components/auth/auth-buttons"

export default function SiteHeader() {
  return (
    <header className="bg-white py-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <a href="/" className="text-2xl font-bold text-gray-800">
          My App
        </a>
        <div className="flex items-center gap-4">
          <AuthButtons />
        </div>
      </div>
    </header>
  )
}

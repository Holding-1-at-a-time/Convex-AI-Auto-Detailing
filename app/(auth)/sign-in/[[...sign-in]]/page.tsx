import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-background/80">
      <div className="mx-auto w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">Welcome back to AutoDetailAI. Sign in to continue.</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-primary hover:bg-primary/90",
              footerActionLink: "text-primary hover:text-primary/90",
            },
          }}
        />
      </div>
    </div>
  )
}

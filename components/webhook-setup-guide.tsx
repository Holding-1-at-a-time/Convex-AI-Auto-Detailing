"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function WebhookSetupGuide() {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/clerk`
      : "https://your-domain.com/api/webhooks/clerk"

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Clerk Webhook Setup Guide</CardTitle>
        <CardDescription>
          Follow these steps to configure Clerk webhooks for automatic user data synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTitle>Prerequisites</AlertTitle>
          <AlertDescription>
            Make sure you have deployed your application and have access to your Clerk Dashboard.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Badge className="mt-1">1</Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Navigate to Webhooks</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Go to your Clerk Dashboard and click on "Webhooks" in the left sidebar.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer">
                  Open Clerk Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge className="mt-1">2</Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Add Endpoint</h3>
              <p className="text-sm text-muted-foreground mb-2">Click "Add Endpoint" and enter your webhook URL:</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <code className="text-sm flex-1">{webhookUrl}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(webhookUrl)}>
                  {copiedUrl ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge className="mt-1">3</Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Select Events</h3>
              <p className="text-sm text-muted-foreground mb-2">Enable the following webhook events:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <code className="text-sm">user.created</code>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <code className="text-sm">user.updated</code>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <code className="text-sm">user.deleted</code>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge className="mt-1">4</Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Copy Signing Secret</h3>
              <p className="text-sm text-muted-foreground mb-2">
                After creating the endpoint, copy the signing secret and add it to your environment variables:
              </p>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm">CLERK_WEBHOOK_SECRET=whsec_...</code>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge className="mt-1">5</Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Test the Webhook</h3>
              <p className="text-sm text-muted-foreground">
                Use Clerk's webhook testing feature to send a test event and verify everything is working correctly.
              </p>
            </div>
          </div>
        </div>

        <Alert>
          <AlertTitle>Important Notes</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>• The webhook endpoint must be publicly accessible (not localhost)</p>
            <p>• Make sure to add the signing secret to your production environment variables</p>
            <p>
              • User data will be automatically synced when users sign up, update their profile, or delete their account
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

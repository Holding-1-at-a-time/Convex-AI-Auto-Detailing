// Webhook configuration helper
export const CLERK_WEBHOOK_EVENTS = ["user.created", "user.updated", "user.deleted"] as const

export type ClerkWebhookEvent = (typeof CLERK_WEBHOOK_EVENTS)[number]

// Helper to validate webhook secret
export function validateWebhookSecret(secret: string | undefined): boolean {
  if (!secret) return false

  // Clerk webhook secrets start with "whsec_"
  return secret.startsWith("whsec_")
}

// Instructions for setting up webhooks in Clerk Dashboard
export const WEBHOOK_SETUP_INSTRUCTIONS = `
To set up Clerk webhooks:

1. Go to your Clerk Dashboard
2. Navigate to "Webhooks" in the left sidebar
3. Click "Add Endpoint"
4. Enter your webhook URL: https://your-domain.com/api/webhooks/clerk
5. Select the following events:
   - user.created
   - user.updated
   - user.deleted
6. Copy the signing secret
7. Add it to your .env.local as CLERK_WEBHOOK_SECRET
`

import { Webhook } from "svix"
import { headers } from "next/headers"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Initialize the Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt: WebhookEvent

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new Response("Error verifying webhook", {
      status: 400,
    })
  }

  // Handle the webhook event
  const eventType = evt.type

  try {
    switch (eventType) {
      // User events
      case "user.created":
        await handleUserCreated(evt.data)
        break
      case "user.updated":
        await handleUserUpdated(evt.data)
        break
      case "user.deleted":
        await handleUserDeleted(evt.data)
        break

      // Session events
      case "session.created":
        await handleSessionCreated(evt.data)
        break
      case "session.ended":
      case "session.removed":
      case "session.revoked":
        await handleSessionEnded(evt.data)
        break

      // Organization events
      case "organization.created":
        await handleOrganizationCreated(evt.data)
        break
      case "organization.updated":
        await handleOrganizationUpdated(evt.data)
        break
      case "organization.deleted":
        await handleOrganizationDeleted(evt.data)
        break

      // Organization membership events
      case "organizationMembership.created":
        await handleOrgMembershipCreated(evt.data)
        break
      case "organizationMembership.deleted":
        await handleOrgMembershipDeleted(evt.data)
        break
      case "organizationMembership.updated":
        await handleOrgMembershipUpdated(evt.data)
        break

      // Organization invitation events
      case "organizationInvitation.created":
      case "organizationInvitation.revoked":
      case "organizationInvitation.accepted":
        await handleOrgInvitationEvent(evt.data, eventType)
        break

      // Organization domain events
      case "organizationDomain.created":
      case "organizationDomain.deleted":
      case "organizationDomain.updated":
        await handleOrgDomainEvent(evt.data, eventType)
        break

      // Role and permission events
      case "role.created":
      case "role.updated":
      case "role.deleted":
        await handleRoleEvent(evt.data, eventType)
        break

      case "permission.created":
      case "permission.updated":
      case "permission.deleted":
        await handlePermissionEvent(evt.data, eventType)
        break

      // Email and SMS events
      case "email.created":
        await handleEmailCreated(evt.data)
        break

      case "sms.created":
        await handleSmsCreated(evt.data)
        break

      // Waitlist events
      case "waitlistEntry.created":
      case "waitlistEntry.updated":
        await handleWaitlistEvent(evt.data, eventType)
        break

      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ success: false, error: "Error processing webhook" }, { status: 500 })
  }
}

// Handler functions for different event types

async function handleUserCreated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url, created_at } = data

  // Get primary email
  const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id)
  const emailAddress = primaryEmail ? primaryEmail.email_address : ""

  // Create user in Convex
  await convex.mutation(api.webhooks.syncUser, {
    clerkId: id,
    email: emailAddress,
    firstName: first_name || "",
    lastName: last_name || "",
    imageUrl: image_url || "",
    createdAt: created_at,
    eventType: "created",
  })
}

async function handleUserUpdated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url, updated_at } = data

  // Get primary email
  const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id)
  const emailAddress = primaryEmail ? primaryEmail.email_address : ""

  // Update user in Convex
  await convex.mutation(api.webhooks.syncUser, {
    clerkId: id,
    email: emailAddress,
    firstName: first_name || "",
    lastName: last_name || "",
    imageUrl: image_url || "",
    updatedAt: updated_at,
    eventType: "updated",
  })
}

async function handleUserDeleted(data: any) {
  const { id, deleted } = data

  if (deleted) {
    // Delete user in Convex
    await convex.mutation(api.webhooks.deleteUser, {
      clerkId: id,
    })
  }
}

async function handleSessionCreated(data: any) {
  const { id, user_id, created_at } = data

  // Log session in Convex
  await convex.mutation(api.webhooks.logSession, {
    sessionId: id,
    clerkId: user_id,
    createdAt: created_at,
    status: "created",
  })
}

async function handleSessionEnded(data: any) {
  const { id, user_id, expired_at, revoked_at, abandoned_at } = data

  // Update session in Convex
  await convex.mutation(api.webhooks.logSession, {
    sessionId: id,
    clerkId: user_id,
    endedAt: expired_at || revoked_at || abandoned_at,
    status: "ended",
  })
}

async function handleOrganizationCreated(data: any) {
  const { id, name, slug, created_at } = data

  // Create organization in Convex
  await convex.mutation(api.webhooks.syncOrganization, {
    orgId: id,
    name,
    slug,
    createdAt: created_at,
    eventType: "created",
  })
}

async function handleOrganizationUpdated(data: any) {
  const { id, name, slug, updated_at } = data

  // Update organization in Convex
  await convex.mutation(api.webhooks.syncOrganization, {
    orgId: id,
    name,
    slug,
    updatedAt: updated_at,
    eventType: "updated",
  })
}

async function handleOrganizationDeleted(data: any) {
  const { id, deleted } = data

  if (deleted) {
    // Delete organization in Convex
    await convex.mutation(api.webhooks.deleteOrganization, {
      orgId: id,
    })
  }
}

async function handleOrgMembershipCreated(data: any) {
  const { id, organization, public_user_data, role, created_at } = data

  // Create membership in Convex
  await convex.mutation(api.webhooks.syncOrgMembership, {
    membershipId: id,
    orgId: organization.id,
    userId: public_user_data.user_id,
    role,
    createdAt: created_at,
    eventType: "created",
  })
}

async function handleOrgMembershipUpdated(data: any) {
  const { id, organization, public_user_data, role, updated_at } = data

  // Update membership in Convex
  await convex.mutation(api.webhooks.syncOrgMembership, {
    membershipId: id,
    orgId: organization.id,
    userId: public_user_data.user_id,
    role,
    updatedAt: updated_at,
    eventType: "updated",
  })
}

async function handleOrgMembershipDeleted(data: any) {
  const { id } = data

  // Delete membership in Convex
  await convex.mutation(api.webhooks.deleteOrgMembership, {
    membershipId: id,
  })
}

async function handleOrgInvitationEvent(data: any, eventType: string) {
  // Handle organization invitation events
  await convex.mutation(api.webhooks.logOrgInvitation, {
    invitationData: data,
    eventType,
  })
}

async function handleOrgDomainEvent(data: any, eventType: string) {
  // Handle organization domain events
  await convex.mutation(api.webhooks.logOrgDomain, {
    domainData: data,
    eventType,
  })
}

async function handleRoleEvent(data: any, eventType: string) {
  // Handle role events
  await convex.mutation(api.webhooks.logRoleEvent, {
    roleData: data,
    eventType,
  })
}

async function handlePermissionEvent(data: any, eventType: string) {
  // Handle permission events
  await convex.mutation(api.webhooks.logPermissionEvent, {
    permissionData: data,
    eventType,
  })
}

async function handleEmailCreated(data: any) {
  // Handle email created event
  await convex.mutation(api.webhooks.logEmailEvent, {
    emailData: data,
  })
}

async function handleSmsCreated(data: any) {
  // Handle SMS created event
  await convex.mutation(api.webhooks.logSmsEvent, {
    smsData: data,
  })
}

async function handleWaitlistEvent(data: any, eventType: string) {
  // Handle waitlist events
  await convex.mutation(api.webhooks.logWaitlistEvent, {
    waitlistData: data,
    eventType,
  })
}

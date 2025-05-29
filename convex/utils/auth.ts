import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server"

// User roles
export type UserRole = "admin" | "business" | "customer" | "staff"

// Function to get the current user from Clerk
export async function getUser(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  return {
    id: identity.subject,
    name: identity.name,
    email: identity.email,
    // Use tokenIdentifier as a stable ID
    tokenIdentifier: identity.tokenIdentifier,
  }
}

// Function to verify user role
export async function verifyUserRole(ctx: QueryCtx | MutationCtx | ActionCtx, allowedRoles: UserRole[]) {
  const user = await getUser(ctx)
  if (!user) {
    throw new Error("Unauthorized: User not authenticated")
  }

  // Get user from database to check role
  const dbUser = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", user.id))
    .first()

  if (!dbUser) {
    throw new Error("Unauthorized: User not found in database")
  }

  if (!dbUser.role || !allowedRoles.includes(dbUser.role as UserRole)) {
    throw new Error(`Unauthorized: User does not have required role (${allowedRoles.join(", ")})`)
  }

  return { user: dbUser, clerkUser: user }
}

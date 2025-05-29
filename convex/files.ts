import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Generate upload URL
export const generateUploadUrl = mutation({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error("Unauthorized: User not authenticated")
    }

    // Validate file type
    const allowedFileTypes = ["image", "document", "video"]
    if (!allowedFileTypes.includes(args.fileType)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedFileTypes.join(", ")}`)
    }

    // Generate upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl()

    return { uploadUrl }
  },
})

// Save file metadata
export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error("Unauthorized: User not authenticated")
    }

    // Create file record
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      contentType: args.contentType,
      fileSize: args.fileSize,
      description: args.description,
      tags: args.tags || [],
      vehicleId: args.vehicleId,
      userId: user.subject,
      uploadedAt: new Date().toISOString(),
    })

    return fileId
  },
})

// Get file URL
export const getFileUrl = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    // Get file record
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error("File not found")
    }

    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()
    if (!user || (user.subject !== file.userId && !(await isUserAuthorized(ctx, user.subject, file)))) {
      throw new Error("Unauthorized: You don't have access to this file")
    }

    // Generate URL
    const url = await ctx.storage.getUrl(file.storageId)

    return { url, file }
  },
})

// Get user files
export const getUserFiles = query({
  args: {
    userId: v.optional(v.string()),
    fileType: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    vehicleId: v.optional(v.id("vehicles")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error("Unauthorized: User not authenticated")
    }

    // If requesting another user's files, verify admin role
    const userId = args.userId || user.subject
    if (userId !== user.subject) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only view your own files")
      }
    }

    // Build query
    let query = ctx.db.query("files").withIndex("by_userId", (q) => q.eq("userId", userId))

    // Apply filters
    if (args.fileType) {
      query = query.filter((q) => q.eq(q.field("fileType"), args.fileType))
    }

    if (args.vehicleId) {
      query = query.withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
    }

    if (args.tags && args.tags.length > 0) {
      query = query.filter((q) => {
        let filter = q.eq(q.field("tags"), args.tags[0])
        for (let i = 1; i < args.tags.length; i++) {
          filter = q.or(filter, q.eq(q.field("tags"), args.tags[i]))
        }
        return filter
      })
    }

    // Apply pagination
    if (args.cursor) {
      query = query.filter((q) => q.gt(q.field("_id"), args.cursor))
    }

    // Get files
    const files = await query.take(args.limit || 20)

    // Get URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId)
        return { ...file, url }
      }),
    )

    // Get cursor for next page
    const cursor = files.length === (args.limit || 20) ? files[files.length - 1]._id : null

    return { files: filesWithUrls, cursor }
  },
})

// Delete file
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    // Get file record
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error("File not found")
    }

    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()
    if (!user || (user.subject !== file.userId && !(await isUserAuthorized(ctx, user.subject, file)))) {
      throw new Error("Unauthorized: You don't have permission to delete this file")
    }

    // Delete file from storage
    await ctx.storage.delete(file.storageId)

    // Delete file record
    await ctx.db.delete(args.fileId)

    return { success: true }
  },
})

// Update file metadata
export const updateFile = mutation({
  args: {
    fileId: v.id("files"),
    fileName: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { fileId, ...updates } = args

    // Get file record
    const file = await ctx.db.get(fileId)
    if (!file) {
      throw new Error("File not found")
    }

    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()
    if (!user || (user.subject !== file.userId && !(await isUserAuthorized(ctx, user.subject, file)))) {
      throw new Error("Unauthorized: You don't have permission to update this file")
    }

    // Update file record
    await ctx.db.patch(fileId, updates)

    return fileId
  },
})

// Helper function to check if user is authorized to access a file
async function isUserAuthorized(ctx: any, userId: string, file: any): Promise<boolean> {
  // Check if user is admin
  try {
    await verifyUserRole(ctx, ["admin"])
    return true
  } catch (error) {
    // Not an admin, continue checking
  }

  // Check if user is a business owner and the file is associated with their business
  if (file.businessId) {
    const business = await ctx.db.get(file.businessId)
    if (business && business.userId === userId) {
      return true
    }
  }

  // Check if user is a staff member and the file is associated with their business
  if (file.businessId) {
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.and(q.eq(q.field("userId"), userId), q.eq(q.field("businessId"), file.businessId)))
      .first()

    if (staff) {
      return true
    }
  }

  // Check if file is associated with a vehicle owned by the user
  if (file.vehicleId) {
    const vehicle = await ctx.db.get(file.vehicleId)
    if (vehicle && vehicle.userId === userId) {
      return true
    }
  }

  return false
}

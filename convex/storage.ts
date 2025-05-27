import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"
import { getCurrentTimestamp } from "./utils"

// Define file types
export type FileType = "image" | "document" | "other"

// Upload a file URL to the database
export const createFile = mutation({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    userId: v.optional(v.string()),
    vehicleId: v.optional(v.id("vehicles")),
    storageId: v.id("_storage"),
    contentType: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Validate file type
    const fileType = getFileType(args.fileType)

    // Create the file record
    const fileId = await ctx.db.insert("files", {
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      userId: args.userId,
      vehicleId: args.vehicleId,
      storageId: args.storageId,
      contentType: args.contentType,
      description: args.description || "",
      tags: args.tags || [],
      uploadedAt: getCurrentTimestamp(),
    })

    // If this is a vehicle image, update the vehicle's imageUrl
    if (args.vehicleId && fileType === "image") {
      const vehicle = await ctx.db.get(args.vehicleId)
      if (vehicle) {
        await ctx.db.patch(args.vehicleId, {
          imageUrl: fileId,
        })
      }
    }

    return { fileId }
  },
})

// Generate a URL to upload a file to storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

// Get a file by ID
export const getFile = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error("File not found")
    }

    const url = await ctx.storage.getUrl(file.storageId)

    return {
      ...file,
      url,
    }
  },
})

// Get files for a vehicle
export const getVehicleFiles = query({
  args: {
    vehicleId: v.id("vehicles"),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let filesQuery = ctx.db.query("files").withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))

    // Filter by file type if provided
    if (args.fileType) {
      filesQuery = filesQuery.filter((q) => q.eq(q.field("fileType"), args.fileType!))
    }

    const files = await filesQuery.collect()

    // Get URLs for all files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId)
        return {
          ...file,
          url,
        }
      }),
    )

    return filesWithUrls
  },
})

// Get files for a user
export const getUserFiles = query({
  args: {
    userId: v.string(),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let filesQuery = ctx.db.query("files").withIndex("by_userId", (q) => q.eq("userId", args.userId))

    // Filter by file type if provided
    if (args.fileType) {
      filesQuery = filesQuery.filter((q) => q.eq(q.field("fileType"), args.fileType!))
    }

    const files = await filesQuery.collect()

    // Get URLs for all files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId)
        return {
          ...file,
          url,
        }
      }),
    )

    return filesWithUrls
  },
})

// Delete a file
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error("File not found")
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId)

    // Delete from database
    await ctx.db.delete(args.fileId)

    // If this file was a vehicle image, update the vehicle
    if (file.vehicleId) {
      const vehicle = await ctx.db.get(file.vehicleId)
      if (vehicle && vehicle.imageUrl === args.fileId) {
        await ctx.db.patch(file.vehicleId, {
          imageUrl: null,
        })
      }
    }

    return { success: true }
  },
})

// Process an image for analysis
export const processVehicleImage = action({
  args: {
    fileId: v.id("files"),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error("File not found")
    }

    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Get the file URL
    const url = await ctx.storage.getUrl(file.storageId)

    // In a real implementation, this would send the image to a computer vision API
    // For now, we'll create a mock analysis

    // Create a condition assessment based on the "analysis"
    const assessmentId = await ctx.db.insert("conditionAssessments", {
      vehicleId: args.vehicleId,
      date: getCurrentTimestamp(),
      overallScore: 85,
      exteriorScore: 83,
      interiorScore: 87,
      notes: "Assessment based on uploaded image",
      createdAt: getCurrentTimestamp(),
      imageUrls: [url],
      aiAnalysisResults: {
        detectedIssues: [
          "Light scratches on driver's side door",
          "Minor water spots on windshield",
          "Slight wheel brake dust",
        ],
        recommendedActions: [
          "Apply scratch remover and polish to affected areas",
          "Use vinegar solution to remove water spots",
          "Clean wheels with dedicated wheel cleaner",
        ],
        confidenceScore: 0.85,
      },
    })

    return {
      assessmentId,
      analysis: {
        detectedIssues: [
          "Light scratches on driver's side door",
          "Minor water spots on windshield",
          "Slight wheel brake dust",
        ],
        recommendedActions: [
          "Apply scratch remover and polish to affected areas",
          "Use vinegar solution to remove water spots",
          "Clean wheels with dedicated wheel cleaner",
        ],
        confidenceScore: 0.85,
      },
    }
  },
})

// Helper function to determine file type
function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) {
    return "image"
  } else if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "text/plain"
  ) {
    return "document"
  } else {
    return "other"
  }
}

import { v } from "convex/values"
import { action, mutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { getCurrentTimestamp } from "./utils"

import type { CarModel, Product, DetailingTechnique } from "../lib/data-fetching"

/**
 * Seeds the database with car makes and models from external API
 */
export const seedVehicleData = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // This would be imported from lib/data-fetching in a real implementation
      // For the Convex action, we're simulating the API call
      const fetchCarMakes = async () => {
        const response = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json")
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
        const data = await response.json()
        return data.Results.map((make: any) => ({
          id: Number.parseInt(make.Make_ID),
          name: make.Make_Name,
        }))
      }

      // Log the start of the seeding process
      console.log("Starting vehicle data seeding process")

      // Fetch car makes from external API
      const allMakes = await fetchCarMakes()

      // Apply limit if specified
      const limit = args.limit || 20
      const popularMakes = [
        "Toyota",
        "Honda",
        "Ford",
        "Chevrolet",
        "Nissan",
        "BMW",
        "Mercedes-Benz",
        "Audi",
        "Lexus",
        "Tesla",
        "Hyundai",
        "Kia",
        "Subaru",
        "Mazda",
        "Volkswagen",
        "Jeep",
        "Dodge",
        "Chrysler",
        "Cadillac",
        "Buick",
      ]

      // Filter to popular makes and apply limit
      const makes = allMakes.filter((make) => popularMakes.includes(make.name)).slice(0, limit)

      console.log(`Processing ${makes.length} car makes`)

      // Track success and failures
      const results = {
        makes: { success: 0, failed: 0 },
        models: { success: 0, failed: 0 },
      }

      // Process each make
      for (const make of makes) {
        try {
          // Store the make in the database
          const makeId = await ctx.runMutation(internal.vehicles.storeMake, {
            externalId: make.id.toString(),
            name: make.name,
          })

          results.makes.success++

          // Fetch models for this make (simulated)
          // In a real implementation, we would call fetchCarModels from lib/data-fetching
          // For now, we'll generate some sample models
          const models: CarModel[] = [
            { id: 1000 + make.id, name: `${make.name} Sedan`, make_id: make.id, year_from: 2015, year_to: 2023 },
            { id: 2000 + make.id, name: `${make.name} SUV`, make_id: make.id, year_from: 2016, year_to: 2023 },
            { id: 3000 + make.id, name: `${make.name} Compact`, make_id: make.id, year_from: 2017, year_to: 2023 },
          ]

          // Store each model
          for (const model of models) {
            try {
              await ctx.runMutation(internal.vehicles.storeModel, {
                externalId: model.id.toString(),
                makeId,
                name: model.name,
                yearFrom: model.year_from,
                yearTo: model.year_to || new Date().getFullYear(),
              })

              results.models.success++
            } catch (modelError) {
              console.error(`Failed to store model ${model.name}:`, modelError)
              results.models.failed++
            }
          }
        } catch (makeError) {
          console.error(`Failed to process make ${make.name}:`, makeError)
          results.makes.failed++
        }
      }

      return {
        success: true,
        message: "Vehicle data seeding completed",
        results,
      }
    } catch (error) {
      console.error("Error in seedVehicleData:", error)
      return {
        success: false,
        message: `Error seeding vehicle data: ${error instanceof Error ? error.message : String(error)}`,
        error: String(error),
      }
    }
  },
})

/**
 * Seeds the database with detailing products
 */
export const seedProductData = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("Starting product data seeding process")

      // This would be imported from lib/data-fetching in a real implementation
      // For the Convex action, we're simulating the API call
      const products: Product[] = [
        {
          id: "p1",
          name: "Ultimate Compound",
          brand: "Meguiar's",
          category: "Polish",
          description: "Cuts as fast as harsh abrasives but without scratching, even on clear coat finishes.",
          price: 24.99,
          rating: 4.8,
          image_url: "https://m.media-amazon.com/images/I/71CxuLkQzQL._AC_SL1500_.jpg",
        },
        {
          id: "p2",
          name: "Gold Class Car Wash Shampoo & Conditioner",
          brand: "Meguiar's",
          category: "Wash",
          description: "Rich and luxurious car wash that gently foams away tough dirt, road grime and contaminants.",
          price: 13.99,
          rating: 4.7,
          image_url: "https://m.media-amazon.com/images/I/71CQX+xYWpL._AC_SL1500_.jpg",
        },
        {
          id: "p3",
          name: "Hybrid Ceramic Wax",
          brand: "Turtle Wax",
          category: "Wax",
          description:
            "SiO2 polymers deliver ceramic protection with water-repelling, water-sheeting, and chemical resistance.",
          price: 16.99,
          rating: 4.6,
          image_url: "https://m.media-amazon.com/images/I/71Nj5RtMQSL._AC_SL1500_.jpg",
        },
        {
          id: "p4",
          name: "Leather Cleaner",
          brand: "Chemical Guys",
          category: "Interior",
          description: "pH balanced leather cleaner that safely cleans all types of leather surfaces.",
          price: 19.99,
          rating: 4.5,
          image_url: "https://m.media-amazon.com/images/I/71E+Z1tn1QL._AC_SL1500_.jpg",
        },
        {
          id: "p5",
          name: "Iron X",
          brand: "CarPro",
          category: "Decontamination",
          description: "Iron remover that changes color when it reacts with iron particles embedded in paint.",
          price: 29.99,
          rating: 4.9,
          image_url: "https://m.media-amazon.com/images/I/61Uyh1VZGML._AC_SL1500_.jpg",
        },
      ]

      // Track success and failures
      let successCount = 0
      let failedCount = 0

      // Process each product
      for (const product of products) {
        try {
          // Transform product data to match our schema
          const recommendedFor = []

          // Add some sample recommendations based on category
          if (product.category === "Polish") recommendedFor.push("Swirl Marks", "Light Scratches")
          if (product.category === "Wash") recommendedFor.push("Regular Maintenance", "Weekly Cleaning")
          if (product.category === "Wax") recommendedFor.push("Paint Protection", "UV Protection")
          if (product.category === "Interior") recommendedFor.push("Leather Seats", "Dashboard")
          if (product.category === "Decontamination") recommendedFor.push("Paint Contamination", "Industrial Fallout")

          // Store the product in the database
          await ctx.runMutation(internal.products.addProduct, {
            name: product.name,
            category: product.category,
            description: product.description,
            recommendedFor: recommendedFor,
            imageUrl: product.image_url,
            price: product.price,
            brand: product.brand,
          })

          successCount++
        } catch (error) {
          console.error(`Failed to store product ${product.name}:`, error)
          failedCount++
        }
      }

      return {
        success: true,
        message: "Product data seeding completed",
        results: {
          success: successCount,
          failed: failedCount,
          total: products.length,
        },
      }
    } catch (error) {
      console.error("Error in seedProductData:", error)
      return {
        success: false,
        message: `Error seeding product data: ${error instanceof Error ? error.message : String(error)}`,
        error: String(error),
      }
    }
  },
})

/**
 * Seeds the database with detailing techniques
 */
export const seedTechniqueData = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("Starting technique data seeding process")

      // This would be imported from lib/data-fetching in a real implementation
      // For the Convex action, we're simulating the API call
      const techniques: DetailingTechnique[] = [
        {
          id: "t1",
          title: "Two Bucket Wash Method",
          description:
            "A safe washing technique that prevents swirl marks by using separate buckets for soap and rinse water.",
          difficulty: "Beginner",
          category: "Washing",
          steps: [
            "Fill one bucket with soap solution and another with clean water",
            "Wash from top to bottom, one section at a time",
            "Rinse mitt in clean water bucket before dipping back in soap",
            "Repeat until entire vehicle is clean",
          ],
        },
        {
          id: "t2",
          title: "Clay Bar Treatment",
          description: "Removes embedded contaminants from paint surfaces that washing alone cannot remove.",
          difficulty: "Intermediate",
          category: "Decontamination",
          steps: [
            "Wash and dry the vehicle thoroughly",
            "Spray clay lubricant on a small section",
            "Glide clay bar across surface with light pressure",
            "Wipe clean and move to next section",
            "Apply wax or sealant after completion",
          ],
        },
        {
          id: "t3",
          title: "Paint Correction",
          description: "Process of removing swirl marks, scratches, and other imperfections from paint.",
          difficulty: "Advanced",
          category: "Correction",
          steps: [
            "Wash, decontaminate, and clay the vehicle",
            "Mask off trim and sensitive areas",
            "Start with least aggressive pad/compound combination",
            "Work in small sections with proper technique",
            "Step down to finer polish for finishing",
            "Clean surface and apply protection",
          ],
        },
      ]

      // Track success and failures
      let successCount = 0
      let failedCount = 0

      // Process each technique
      for (const technique of techniques) {
        try {
          // Store the technique in the knowledge base
          await ctx.runMutation(internal.embeddings.batchImportKnowledge, {
            items: [
              {
                title: technique.title,
                content: `${technique.description}\n\nDifficulty: ${technique.difficulty}\n\nSteps:\n${technique.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
                category: "technique",
                tags: [technique.category.toLowerCase(), technique.difficulty.toLowerCase()],
              },
            ],
          })

          successCount++
        } catch (error) {
          console.error(`Failed to store technique ${technique.title}:`, error)
          failedCount++
        }
      }

      return {
        success: true,
        message: "Technique data seeding completed",
        results: {
          success: successCount,
          failed: failedCount,
          total: techniques.length,
        },
      }
    } catch (error) {
      console.error("Error in seedTechniqueData:", error)
      return {
        success: false,
        message: `Error seeding technique data: ${error instanceof Error ? error.message : String(error)}`,
        error: String(error),
      }
    }
  },
})

/**
 * Seeds all data types in sequence
 */
export const seedAllData = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("Starting complete data seeding process")

      // Seed vehicle data
      const vehicleResult = await ctx.runAction(internal.dataSeed.seedVehicleData, {
        limit: 10, // Limit to 10 makes for faster processing
      })

      // Seed product data
      const productResult = await ctx.runAction(internal.dataSeed.seedProductData, {})

      // Seed technique data
      const techniqueResult = await ctx.runAction(internal.dataSeed.seedTechniqueData, {})

      return {
        success: true,
        message: "Complete data seeding process finished",
        results: {
          vehicles: vehicleResult,
          products: productResult,
          techniques: techniqueResult,
        },
      }
    } catch (error) {
      console.error("Error in seedAllData:", error)
      return {
        success: false,
        message: `Error in complete data seeding: ${error instanceof Error ? error.message : String(error)}`,
        error: String(error),
      }
    }
  },
})

/**
 * Helper mutations for the seeding process
 */

/**
 * Stores a car make in the database
 */
export const storeMake = mutation({
  args: {
    externalId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if make already exists
    const existingMake = await ctx.db
      .query("carMakes")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first()

    if (existingMake) {
      return existingMake._id
    }

    // Create new make
    return await ctx.db.insert("carMakes", {
      externalId: args.externalId,
      name: args.name,
      createdAt: getCurrentTimestamp(),
    })
  },
})

/**
 * Stores a car model in the database
 */
export const storeModel = mutation({
  args: {
    externalId: v.string(),
    makeId: v.id("carMakes"),
    name: v.string(),
    yearFrom: v.number(),
    yearTo: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if model already exists
    const existingModel = await ctx.db
      .query("carModels")
      .filter((q) => q.and(q.eq(q.field("externalId"), args.externalId), q.eq(q.field("makeId"), args.makeId)))
      .first()

    if (existingModel) {
      return existingModel._id
    }

    // Create new model
    return await ctx.db.insert("carModels", {
      externalId: args.externalId,
      makeId: args.makeId,
      name: args.name,
      yearFrom: args.yearFrom,
      yearTo: args.yearTo,
      createdAt: getCurrentTimestamp(),
    })
  },
})

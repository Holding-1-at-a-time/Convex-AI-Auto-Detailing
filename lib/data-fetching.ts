/**
 * Utility functions for fetching data from external sources
 */

import { z } from "zod"

// Define schemas for external data validation
export const CarMakeSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const CarModelSchema = z.object({
  id: z.number(),
  name: z.string(),
  make_id: z.number(),
  year_from: z.number(),
  year_to: z.number().optional(),
})

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  description: z.string(),
  price: z.number().optional(),
  rating: z.number().optional(),
  image_url: z.string().optional(),
})

export const DetailingTechniqueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: z.string(),
  category: z.string(),
  steps: z.array(z.string()),
})

// Types based on schemas
export type CarMake = z.infer<typeof CarMakeSchema>
export type CarModel = z.infer<typeof CarModelSchema>
export type Product = z.infer<typeof ProductSchema>
export type DetailingTechnique = z.infer<typeof DetailingTechniqueSchema>

/**
 * Fetches car makes from NHTSA API
 * @returns Array of car makes
 */
export async function fetchCarMakes(): Promise<CarMake[]> {
  try {
    const response = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json")

    if (!response.ok) {
      throw new Error(`Failed to fetch car makes: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform the data to match our schema
    return data.Results.map((make: any) => ({
      id: Number.parseInt(make.Make_ID),
      name: make.Make_Name,
    }))
  } catch (error) {
    console.error("Error fetching car makes:", error)
    throw error
  }
}

/**
 * Fetches car models for a specific make from NHTSA API
 * @param makeId The make ID to fetch models for
 * @returns Array of car models
 */
export async function fetchCarModels(makeId: number): Promise<CarModel[]> {
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${makeId}?format=json`)

    if (!response.ok) {
      throw new Error(`Failed to fetch car models: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform the data to match our schema
    return data.Results.map((model: any) => ({
      id: Number.parseInt(model.Model_ID),
      name: model.Model_Name,
      make_id: Number.parseInt(model.Make_ID),
      year_from: 2000, // Default value as the API doesn't provide year info
      year_to: 2025, // Default value as the API doesn't provide year info
    }))
  } catch (error) {
    console.error(`Error fetching car models for make ${makeId}:`, error)
    throw error
  }
}

/**
 * Fetches detailing products from a mock API (simulated)
 * In a real implementation, this would connect to an actual product API
 * @returns Array of detailing products
 */
export async function fetchDetailingProducts(): Promise<Product[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Mock data for detailing products
  return [
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
    {
      id: "p6",
      name: "Clay Bar Kit",
      brand: "Adam's",
      category: "Decontamination",
      description: "Removes embedded contaminants from paint surfaces that washing alone cannot remove.",
      price: 24.99,
      rating: 4.7,
      image_url: "https://m.media-amazon.com/images/I/81Zt42EwHaL._AC_SL1500_.jpg",
    },
    {
      id: "p7",
      name: "Tire Shine",
      brand: "Chemical Guys",
      category: "Tires",
      description: "High gloss, protective tire shine that lasts for weeks.",
      price: 12.99,
      rating: 4.4,
      image_url: "https://m.media-amazon.com/images/I/71R8waYPVtL._AC_SL1500_.jpg",
    },
    {
      id: "p8",
      name: "Glass Cleaner",
      brand: "Invisible Glass",
      category: "Glass",
      description: "Streak-free glass cleaner that removes dirt, grime, and fingerprints.",
      price: 9.99,
      rating: 4.8,
      image_url: "https://m.media-amazon.com/images/I/81vu+NWtRvL._AC_SL1500_.jpg",
    },
    {
      id: "p9",
      name: "Ceramic Coating Kit",
      brand: "Gtechniq",
      category: "Protection",
      description: "Professional grade ceramic coating that provides up to 5 years of protection.",
      price: 69.99,
      rating: 4.9,
      image_url: "https://m.media-amazon.com/images/I/61Uyh1VZGML._AC_SL1500_.jpg",
    },
    {
      id: "p10",
      name: "All Purpose Cleaner",
      brand: "Simple Green",
      category: "Interior",
      description: "Concentrated all-purpose cleaner that can be diluted for various cleaning tasks.",
      price: 8.99,
      rating: 4.5,
      image_url: "https://m.media-amazon.com/images/I/81v+n8UvVKL._AC_SL1500_.jpg",
    },
  ]
}

/**
 * Fetches detailing techniques from a mock API (simulated)
 * In a real implementation, this would connect to an actual API or dataset
 * @returns Array of detailing techniques
 */
export async function fetchDetailingTechniques(): Promise<DetailingTechnique[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 700))

  // Mock data for detailing techniques
  return [
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
    {
      id: "t4",
      title: "Ceramic Coating Application",
      description: "Application of a liquid polymer that chemically bonds with factory paint for long-term protection.",
      difficulty: "Advanced",
      category: "Protection",
      steps: [
        "Perform full paint correction first",
        "Wipe surface with isopropyl alcohol solution",
        "Apply ceramic coating in small sections",
        "Level coating with microfiber cloth",
        "Allow proper curing time",
        "Avoid water contact for 24-48 hours",
      ],
    },
    {
      id: "t5",
      title: "Interior Deep Cleaning",
      description: "Thorough cleaning of all interior surfaces to remove dirt, stains, and odors.",
      difficulty: "Intermediate",
      category: "Interior",
      steps: [
        "Remove all items and vacuum thoroughly",
        "Clean air vents with brush and compressed air",
        "Clean dashboard and plastic surfaces with appropriate cleaner",
        "Treat leather surfaces with cleaner and conditioner",
        "Clean glass with streak-free cleaner",
        "Shampoo carpets and upholstery as needed",
      ],
    },
  ]
}

/**
 * Fetches vehicle maintenance data from a mock API (simulated)
 * @returns Array of maintenance records
 */
export async function fetchVehicleMaintenanceData() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 600))

  // This would be replaced with actual API call in production
  return [
    {
      vehicleType: "Sedan",
      recommendedServices: [
        { name: "Exterior Wash", frequencyDays: 14 },
        { name: "Interior Vacuum", frequencyDays: 30 },
        { name: "Wax Application", frequencyDays: 90 },
        { name: "Clay Bar Treatment", frequencyDays: 180 },
      ],
    },
    {
      vehicleType: "SUV",
      recommendedServices: [
        { name: "Exterior Wash", frequencyDays: 14 },
        { name: "Interior Vacuum", frequencyDays: 21 },
        { name: "Wax Application", frequencyDays: 90 },
        { name: "Undercarriage Wash", frequencyDays: 60 },
      ],
    },
    {
      vehicleType: "Truck",
      recommendedServices: [
        { name: "Exterior Wash", frequencyDays: 10 },
        { name: "Bed Cleaning", frequencyDays: 30 },
        { name: "Wax Application", frequencyDays: 120 },
        { name: "Undercarriage Wash", frequencyDays: 45 },
      ],
    },
  ]
}

/**
 * Data transformation utilities
 */

/**
 * Cleans and normalizes product data
 * @param products Raw product data
 * @returns Cleaned product data
 */
export function cleanProductData(products: Product[]): Product[] {
  return products.map((product) => ({
    ...product,
    name: product.name.trim(),
    brand: product.brand.trim(),
    category: product.category.trim(),
    description: product.description.trim(),
    // Set default image if none provided
    image_url: product.image_url || "/auto-detailing-product.png",
  }))
}

/**
 * Cleans and normalizes car model data
 * @param models Raw car model data
 * @returns Cleaned car model data
 */
export function cleanCarModelData(models: CarModel[]): CarModel[] {
  return models
    .filter((model) => model.name && model.name.length > 1) // Filter out invalid models
    .map((model) => ({
      ...model,
      name: model.name.trim().replace(/\s+/g, " "), // Normalize whitespace
    }))
}

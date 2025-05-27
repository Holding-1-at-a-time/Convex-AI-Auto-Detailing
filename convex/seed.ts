import { action } from "./_generated/server"
import { internal } from "./_generated/api"

// Seed the knowledge base with initial data
export const seedKnowledgeBase = action({
  args: {},
  handler: async (ctx) => {
    // Seed vehicle-specific recommendations
    const vehicleRecommendations = [
      {
        title: "Clay Bar Treatment",
        description:
          "Use a clay bar to remove embedded contaminants from the paint surface. This is especially important for vehicles parked outdoors.",
        make: "Toyota",
        model: "Camry",
        yearRange: [2018, 2023],
        priority: "medium",
      },
      {
        title: "Ceramic Coating",
        description:
          "Apply a ceramic coating for long-lasting protection. Toyota Camry's clear coat responds well to ceramic coatings, providing up to 2 years of protection.",
        make: "Toyota",
        model: "Camry",
        yearRange: [2018, 2023],
        priority: "high",
      },
      {
        title: "Headlight Restoration",
        description:
          "Restore foggy headlights using a headlight restoration kit. The 2018-2023 Camry models are prone to UV damage on headlights.",
        make: "Toyota",
        model: "Camry",
        yearRange: [2018, 2023],
        priority: "medium",
      },
      {
        title: "Interior Leather Treatment",
        description:
          "Apply leather conditioner to prevent cracking and fading, especially on the dashboard and seats which are prone to UV damage.",
        make: "Toyota",
        model: "Camry",
        yearRange: [2018, 2023],
        priority: "medium",
      },
      {
        title: "Wheel Cleaning",
        description:
          "Use a dedicated wheel cleaner for the Camry's alloy wheels. Brake dust can be particularly corrosive to these wheels.",
        make: "Toyota",
        model: "Camry",
        yearRange: [2018, 2023],
        priority: "high",
      },
      {
        title: "Paint Correction",
        description:
          "Perform paint correction to remove swirl marks and light scratches. The black and dark blue paint options on the Model 3 show scratches easily.",
        make: "Tesla",
        model: "Model 3",
        yearRange: [2017, 2023],
        priority: "high",
      },
      {
        title: "Glass Coating",
        description:
          "Apply a hydrophobic coating to all glass surfaces. This improves visibility in rain and makes cleaning easier.",
        make: "Tesla",
        model: "Model 3",
        yearRange: [2017, 2023],
        priority: "medium",
      },
      {
        title: "Interior Protection",
        description:
          "Apply UV protectant to the vegan leather interior to prevent cracking and fading, especially important for the minimalist dashboard.",
        make: "Tesla",
        model: "Model 3",
        yearRange: [2017, 2023],
        priority: "medium",
      },
      {
        title: "Undercarriage Cleaning",
        description:
          "Regularly clean the undercarriage to remove dirt and salt. The battery pack needs protection from corrosive elements.",
        make: "Tesla",
        model: "Model 3",
        yearRange: [2017, 2023],
        priority: "high",
      },
      {
        title: "Door Handle Lubrication",
        description: "Lubricate the recessed door handles to ensure smooth operation and prevent premature wear.",
        make: "Tesla",
        model: "Model 3",
        yearRange: [2017, 2023],
        priority: "low",
      },
    ]

    // Seed knowledge base with detailing techniques
    const detailingTechniques = [
      {
        title: "Two Bucket Wash Method",
        content:
          "Use two buckets when washing your car - one with soap solution and one with clean water for rinsing your wash mitt. This prevents swirl marks by keeping dirt from being reapplied to the paint.",
        category: "technique",
        tags: ["washing", "exterior", "beginner"],
      },
      {
        title: "Clay Bar Decontamination",
        content:
          "Use a clay bar with lubricant to remove embedded contaminants from your paint. Fold the clay after each section to expose a clean surface. Replace the clay when it becomes heavily contaminated.",
        category: "technique",
        tags: ["decontamination", "exterior", "intermediate"],
      },
      {
        title: "Paint Correction Process",
        content:
          "Start with the least aggressive method first. Begin with a fine polish before moving to more aggressive compounds. Work in small sections and use proper lighting to check your progress.",
        category: "technique",
        tags: ["correction", "exterior", "advanced"],
      },
      {
        title: "Interior Detailing Sequence",
        content:
          "Start from the top and work down. Begin with headliner, then dashboard, door panels, seats, and finally carpets. This prevents dirt from falling onto already cleaned surfaces.",
        category: "technique",
        tags: ["interior", "beginner"],
      },
      {
        title: "Proper Microfiber Towel Usage",
        content:
          "Use different colored microfiber towels for different tasks. Fold towels into quarters to provide 8 clean surfaces. Wash microfiber separately from other laundry and avoid fabric softener.",
        category: "technique",
        tags: ["tools", "beginner"],
      },
    ]

    // Seed knowledge base with product information
    const productInformation = [
      {
        title: "Ceramic Coatings",
        content:
          "Ceramic coatings provide long-lasting protection (1-5 years) by forming a chemical bond with your paint. They offer superior protection against UV rays, chemical stains, and make washing easier with their hydrophobic properties.",
        category: "product",
        tags: ["coating", "exterior", "advanced"],
      },
      {
        title: "All-Purpose Cleaners",
        content:
          "All-purpose cleaners can be diluted for different cleaning tasks. Use 10:1 for light interior cleaning, 5:1 for door jambs and exterior trim, and 3:1 for heavily soiled areas and engine bays.",
        category: "product",
        tags: ["cleaner", "versatile", "beginner"],
      },
      {
        title: "Foam Cannons",
        content:
          "Foam cannons attach to pressure washers and create thick foam that clings to the vehicle surface, loosening dirt before contact washing. This reduces the risk of scratching during the wash process.",
        category: "product",
        tags: ["washing", "tool", "beginner"],
      },
      {
        title: "Leather Conditioners",
        content:
          "Leather conditioners restore moisture to leather surfaces, preventing cracking and fading. Apply every 1-3 months depending on climate and sun exposure. Always clean leather before conditioning.",
        category: "product",
        tags: ["interior", "leather", "intermediate"],
      },
      {
        title: "Polishing Compounds",
        content:
          "Polishing compounds come in various levels of abrasiveness. Heavy compounds remove deep scratches but require follow-up with finer polish. Fine polishes remove light swirls and enhance gloss.",
        category: "product",
        tags: ["correction", "exterior", "advanced"],
      },
    ]

    // Seed knowledge base with detailing plans
    const detailingPlans = [
      {
        title: "Weekend Warrior Detail Plan",
        content:
          "Day 1: Wash exterior (30 min)\nDecontaminate with clay bar (45 min)\nPolish paint (2 hours)\nApply wax or sealant (30 min)\nDay 2: Vacuum interior (20 min)\nClean all interior surfaces (45 min)\nCondition leather/vinyl (20 min)\nClean glass (20 min)\nDress tires and trim (15 min)",
        category: "detailing_plan",
        tags: ["comprehensive", "weekend", "intermediate"],
      },
      {
        title: "Maintenance Wash Plan",
        content:
          "Pre-rinse vehicle (5 min)\nFoam vehicle and let dwell (5 min)\nRinse foam (5 min)\nTwo bucket wash (20 min)\nRinse vehicle (5 min)\nDry with microfiber towels (10 min)\nQuick detailer spray (5 min)\nClean glass (10 min)\nDress tires (5 min)",
        category: "detailing_plan",
        tags: ["quick", "maintenance", "beginner"],
      },
      {
        title: "Interior Deep Clean Plan",
        content:
          "Remove all items from interior (5 min)\nVacuum thoroughly including seats and trunk (20 min)\nClean air vents with brush (10 min)\nWipe down all surfaces with APC (30 min)\nClean leather/vinyl with dedicated cleaner (20 min)\nCondition leather/vinyl (15 min)\nClean carpets with carpet cleaner (30 min)\nClean glass (15 min)\nApply protectant to plastic surfaces (15 min)",
        category: "detailing_plan",
        tags: ["interior", "deep_clean", "intermediate"],
      },
      {
        title: "Express Detail Plan",
        content:
          "Quick rinse (5 min)\nSpray with rinseless wash solution (5 min)\nWipe down with microfiber towels (15 min)\nQuick vacuum of interior (10 min)\nWipe down interior surfaces (10 min)\nClean glass (10 min)\nSpray quick detailer on exterior (5 min)",
        category: "detailing_plan",
        tags: ["quick", "express", "beginner"],
      },
      {
        title: "New Car Protection Plan",
        content:
          "Wash with pH neutral soap (30 min)\nClay bar decontamination (45 min)\nLight polish to remove any dealer-induced swirls (1 hour)\nIPA wipedown to remove oils (15 min)\nApply ceramic coating (1-2 hours)\nCure according to manufacturer instructions (varies)\nInterior protection: fabric guard for upholstery (30 min)\nLeather protection for seats (30 min)\nGlass coating for all windows (30 min)",
        category: "detailing_plan",
        tags: ["new_car", "protection", "advanced"],
      },
    ]

    // Seed vehicle recommendations
    for (const rec of vehicleRecommendations) {
      await ctx.runMutation(internal.embeddings.storeVehicleRecommendation, rec)
    }

    // Seed detailing techniques
    await ctx.runMutation(internal.embeddings.batchImportKnowledge, {
      items: detailingTechniques,
    })

    // Seed product information
    await ctx.runMutation(internal.embeddings.batchImportKnowledge, {
      items: productInformation,
    })

    // Seed detailing plans
    await ctx.runMutation(internal.embeddings.batchImportKnowledge, {
      items: detailingPlans,
    })

    return {
      success: true,
      message: "Knowledge base seeded successfully",
      counts: {
        vehicleRecommendations: vehicleRecommendations.length,
        detailingTechniques: detailingTechniques.length,
        productInformation: productInformation.length,
        detailingPlans: detailingPlans.length,
      },
    }
  },
})

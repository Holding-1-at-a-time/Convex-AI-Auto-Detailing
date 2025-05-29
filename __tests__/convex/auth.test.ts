import { ConvexTestingHelper } from "convex/testing"
import { api } from "@/convex/_generated/api"
import schema from "@/convex/schema"

const t = new ConvexTestingHelper(schema)

describe("Convex Authentication & Authorization", () => {
  beforeEach(async () => {
    await t.clearAll()
  })

  describe("User Management", () => {
    it("creates or updates user successfully", async () => {
      const userId = await t.mutation(api.users.createOrUpdateUser, {
        clerkId: "user_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "customer",
      })

      expect(userId).toBeDefined()

      const user = await t.query(api.users.getUserByClerkId, {
        clerkId: "user_123",
      })

      expect(user).toBeDefined()
      expect(user.email).toBe("test@example.com")
      expect(user.role).toBe("customer")
    })

    it("updates existing user", async () => {
      // Create user first
      await t.mutation(api.users.createOrUpdateUser, {
        clerkId: "user_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "customer",
      })

      // Update user
      await t.mutation(api.users.createOrUpdateUser, {
        clerkId: "user_123",
        email: "updated@example.com",
        firstName: "John",
        lastName: "Smith",
        role: "business",
      })

      const user = await t.query(api.users.getUserByClerkId, {
        clerkId: "user_123",
      })

      expect(user.role).toBe("business")
      expect(user.name).toBe("John Smith")
    })
  })

  describe("Customer Profile Management", () => {
    it("creates customer profile with proper validation", async () => {
      const profileId = await t.mutation(api.customerProfiles.createOrUpdateCustomerProfile, {
        userId: "user_123",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        address: "123 Main St",
        city: "Anytown",
        state: "CA",
        zipCode: "12345",
      })

      expect(profileId).toBeDefined()

      const profile = await t.query(api.customerProfiles.getCustomerProfileByUserId, {
        userId: "user_123",
      })

      expect(profile).toBeDefined()
      expect(profile.name).toBe("John Doe")
      expect(profile.email).toBe("john@example.com")
    })

    it("validates email format", async () => {
      await expect(
        t.mutation(api.customerProfiles.createOrUpdateCustomerProfile, {
          userId: "user_123",
          name: "John Doe",
          email: "invalid-email",
          phone: "+1234567890",
        }),
      ).rejects.toThrow("Invalid email format")
    })

    it("validates phone format", async () => {
      await expect(
        t.mutation(api.customerProfiles.createOrUpdateCustomerProfile, {
          userId: "user_123",
          name: "John Doe",
          email: "john@example.com",
          phone: "invalid-phone",
        }),
      ).rejects.toThrow("Invalid phone number format")
    })
  })

  describe("Business Profile Management", () => {
    it("creates business profile with proper validation", async () => {
      const profileId = await t.mutation(api.businessProfiles.createBusinessProfile, {
        userId: "business_123",
        businessName: "Premium Auto Detailing",
        businessType: "mobile",
        city: "Business City",
        state: "CA",
        zipCode: "54321",
        phone: "+1987654321",
        email: "contact@premiumauto.com",
      })

      expect(profileId).toBeDefined()

      const profile = await t.query(api.businessProfiles.getBusinessProfileByUserId, {
        userId: "business_123",
      })

      expect(profile).toBeDefined()
      expect(profile.businessName).toBe("Premium Auto Detailing")
      expect(profile.businessType).toBe("mobile")
    })

    it("prevents duplicate business profiles", async () => {
      await t.mutation(api.businessProfiles.createBusinessProfile, {
        userId: "business_123",
        businessName: "Premium Auto Detailing",
        businessType: "mobile",
        city: "Business City",
        state: "CA",
        zipCode: "54321",
        phone: "+1987654321",
        email: "contact@premiumauto.com",
      })

      await expect(
        t.mutation(api.businessProfiles.createBusinessProfile, {
          userId: "business_123",
          businessName: "Another Business",
          businessType: "fixed_location",
          city: "Another City",
          state: "NY",
          zipCode: "12345",
          phone: "+1234567890",
          email: "contact@another.com",
        }),
      ).rejects.toThrow("A business profile already exists for this user")
    })
  })
})

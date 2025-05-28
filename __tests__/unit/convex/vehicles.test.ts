import { addVehicle, updateVehicle, getVehicleData } from "@/convex/vehicles"

// Mock the Convex database and context
const mockDb = {
  insert: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  query: jest.fn(() => ({
    withIndex: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          take: jest.fn(() => []),
          first: jest.fn(() => null),
          collect: jest.fn(() => []),
        })),
        collect: jest.fn(() => []),
        first: jest.fn(() => null),
      })),
    })),
    filter: jest.fn(() => ({
      first: jest.fn(() => null),
    })),
  })),
}

const mockCtx = {
  db: mockDb,
  runAction: jest.fn(),
  runMutation: jest.fn(),
  runQuery: jest.fn(),
  storage: {
    getUrl: jest.fn(),
    generateUploadUrl: jest.fn(),
    delete: jest.fn(),
  },
}

jest.mock("@/convex/utils", () => ({
  getCurrentTimestamp: jest.fn(() => "2025-01-01T00:00:00.000Z"),
  formatDate: jest.fn((date) => date.split("T")[0]),
  daysBetween: jest.fn(() => 7),
  parseTimestamp: jest.fn((timestamp) => new Date(timestamp)),
}))

jest.mock("@/convex/_generated/api", () => ({
  internal: {
    recommendations: {
      generateRecommendations: "recommendations:generateRecommendations",
    },
  },
}))

describe("Convex Vehicle Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("addVehicle", () => {
    it("creates a new vehicle", async () => {
      mockDb.insert.mockResolvedValueOnce("vehicle_123")

      const args = {
        userId: "user_123",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        color: "Silver",
        notes: "Test vehicle",
      }

      const result = await addVehicle.handler(mockCtx as any, args as any)

      expect(result).toBe("vehicle_123")
      expect(mockDb.insert).toHaveBeenCalledWith("vehicles", {
        userId: "user_123",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        color: "Silver",
        notes: "Test vehicle",
        vin: undefined,
        createdAt: "2025-01-01T00:00:00.000Z",
        lastDetailingDate: null,
        detailingScore: 100,
      })
    })

    it("validates year range", async () => {
      const args = {
        userId: "user_123",
        make: "Toyota",
        model: "Camry",
        year: 3000, // Invalid future year
        color: "Silver",
      }

      await expect(addVehicle.handler(mockCtx as any, args as any)).rejects.toThrow(/Year must be between/)
    })

    it("checks for duplicate VIN", async () => {
      mockDb.query().filter().first.mockResolvedValueOnce({ _id: "existing_vehicle" })

      const args = {
        userId: "user_123",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        vin: "12345678901234567",
      }

      await expect(addVehicle.handler(mockCtx as any, args as any)).rejects.toThrow(/already exists/)
    })
  })

  describe("updateVehicle", () => {
    it("updates an existing vehicle", async () => {
      mockDb.get.mockResolvedValueOnce({
        _id: "vehicle_123",
        make: "Toyota",
        model: "Camry",
        year: 2022,
      })

      const args = {
        vehicleId: "vehicle_123",
        color: "Black",
        notes: "Updated notes",
      }

      await updateVehicle.handler(mockCtx as any, args as any)

      expect(mockDb.patch).toHaveBeenCalledWith("vehicle_123", {
        color: "Black",
        notes: "Updated notes",
      })
    })

    it("throws error if vehicle not found", async () => {
      mockDb.get.mockResolvedValueOnce(null)

      const args = {
        vehicleId: "nonexistent_vehicle",
        color: "Black",
      }

      await expect(updateVehicle.handler(mockCtx as any, args as any)).rejects.toThrow(/Vehicle not found/)
    })
  })

  describe("getVehicleData", () => {
    it("returns vehicle data with history and recommendations", async () => {
      // Mock vehicle data
      mockDb.get.mockResolvedValueOnce({
        _id: "vehicle_123",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        lastDetailingDate: "2025-01-01T00:00:00.000Z",
        detailingScore: 85,
      })

      // Mock detailing history
      mockDb
        .query()
        .withIndex()
        .eq()
        .order()
        .collect.mockResolvedValueOnce([
          {
            _id: "record_1",
            date: "2025-01-01T00:00:00.000Z",
            service: "Full Detailing",
            notes: "Complete detailing",
          },
        ])

      // Mock condition assessment
      mockDb.query().withIndex().eq().order().first.mockResolvedValueOnce({
        overallScore: 85,
      })

      // Mock recommendations
      mockCtx.runAction.mockResolvedValueOnce([
        { id: 1, title: "Wax exterior", priority: "high", dueDate: "2025-05-30" },
      ])

      const args = {
        vehicleId: "vehicle_123",
      }

      const result = await getVehicleData.handler(mockCtx as any, args as any)

      expect(result).toMatchObject({
        make: "Toyota",
        model: "Camry",
        year: 2022,
        detailingScore: 85,
        lastDetailing: "2025-01-01",
        recommendations: [{ id: 1, title: "Wax exterior", priority: "high", dueDate: "2025-05-30" }],
        history: [{ id: "record_1", date: "2025-01-01", service: "Full Detailing", notes: "Complete detailing" }],
      })

      expect(mockCtx.runAction).toHaveBeenCalledWith("recommendations:generateRecommendations", {
        vehicleId: "vehicle_123",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        lastDetailingDate: "2025-01-01T00:00:00.000Z",
        currentScore: 85,
      })
    })

    it("returns mock data when no vehicle is found", async () => {
      const args = {
        vehicleId: undefined,
        userId: undefined,
      }

      const result = await getVehicleData.handler(mockCtx as any, args as any)

      expect(result).toMatchObject({
        make: "Toyota",
        model: "Camry",
        year: 2022,
        lastDetailing: "2025-04-15",
        detailingScore: 85,
        recommendations: expect.any(Array),
        history: expect.any(Array),
      })
    })
  })
})

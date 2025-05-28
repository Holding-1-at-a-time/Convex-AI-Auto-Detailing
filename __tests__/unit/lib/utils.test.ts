import { cn } from "@/lib/utils"

describe("Utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      const result = cn("class1", "class2")
      expect(result).toBe("class1 class2")
    })

    it("handles conditional class names", () => {
      const result = cn("class1", true && "class2", false && "class3")
      expect(result).toBe("class1 class2")
    })

    it("handles undefined and null values", () => {
      const result = cn("class1", undefined, null, "class2")
      expect(result).toBe("class1 class2")
    })

    it("handles empty strings", () => {
      const result = cn("class1", "", "class2")
      expect(result).toBe("class1 class2")
    })

    it("handles array of class names", () => {
      const result = cn("class1", ["class2", "class3"])
      expect(result).toBe("class1 class2 class3")
    })

    it("handles object notation", () => {
      const result = cn("class1", { class2: true, class3: false })
      expect(result).toBe("class1 class2")
    })

    it("handles complex combinations", () => {
      const result = cn("class1", { class2: true, class3: false }, ["class4", "class5"], undefined, null, "", "class6")
      expect(result).toBe("class1 class2 class4 class5 class6")
    })
  })
})

// This file contains the schema updates needed for the appointment management system
// Add these tables to your existing schema.ts file

export const schemaUpdates = {
  // Blocked time slots for businesses
  blockedTimeSlots: {
    businessId: "v.id('businessProfiles')",
    date: "v.string()",
    startTime: "v.string()",
    endTime: "v.string()",
    reason: "v.optional(v.string())",
    isRecurring: "v.boolean()",
    recurringPattern: "v.optional(v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly')))",
    originalId: "v.optional(v.id('blockedTimeSlots'))", // For recurring blocks
    createdBy: "v.string()",
    createdAt: "v.string()",
  },

  // Notifications table
  notifications: {
    userId: "v.string()",
    type: "v.string()",
    title: "v.string()",
    message: "v.string()",
    data: "v.optional(v.any())",
    read: "v.boolean()",
    readAt: "v.optional(v.string())",
    createdAt: "v.string()",
  },

  // Feedback table
  feedback: {
    appointmentId: "v.id('appointments')",
    customerId: "v.string()",
    businessId: "v.id('businessProfiles')",
    rating: "v.number()",
    comment: "v.optional(v.string())",
    serviceQuality: "v.optional(v.number())",
    timeliness: "v.optional(v.number())",
    professionalism: "v.optional(v.number())",
    valueForMoney: "v.optional(v.number())",
    wouldRecommend: "v.optional(v.boolean())",
    createdAt: "v.string()",
  },

  // Staff availability table
  staffAvailability: {
    staffId: "v.string()",
    date: "v.string()",
    isAvailable: "v.boolean()",
    startTime: "v.optional(v.string())",
    endTime: "v.optional(v.string())",
    reason: "v.optional(v.string())",
    createdAt: "v.string()",
  },

  // Add these fields to the existing appointments table
  appointmentsAdditionalFields: {
    rescheduleHistory: "v.optional(v.array(v.object({...})))",
    communicationLog: "v.optional(v.array(v.object({...})))",
  },

  // Add these indexes
  indexes: {
    blockedTimeSlots: ["by_businessId", "by_businessId_date"],
    notifications: ["by_userId", "by_type", "by_read"],
    feedback: ["by_appointmentId", "by_businessId", "by_customerId"],
    staffAvailability: ["by_staffId", "by_date"],
  },
}

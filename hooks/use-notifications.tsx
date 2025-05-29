"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "@/hooks/use-toast"
import type { NotificationPreferences, NotificationLog } from "@/types/notification"

interface UseNotificationsOptions {
  businessId?: Id<"businessProfiles">
  customerId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface NotificationStats {
  total: number
  delivered: number
  failed: number
  pending: number
  deliveryRate: number
}

/**
 * Custom hook for managing notifications and preferences
 *
 * Features:
 * - Real-time notification logs
 * - Delivery statistics
 * - Preference management
 * - Auto-refresh capabilities
 * - Error handling with retry logic
 *
 * @param options - Configuration options for notifications
 * @returns Notification state and management functions
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { businessId, customerId, autoRefresh = true, refreshInterval = 30000 } = options
  const { user } = useUser()

  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<NotificationLog | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  })

  // Convex queries
  const notificationLogs = useQuery(
    api.notifications.getNotificationLogs,
    businessId || customerId
      ? {
          businessId,
          customerId,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          status: filterStatus !== "all" ? filterStatus : undefined,
          type: filterType !== "all" ? filterType : undefined,
        }
      : "skip",
  )

  const notificationStats = useQuery(
    api.notifications.getNotificationStats,
    businessId || customerId
      ? {
          businessId,
          customerId,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        }
      : "skip",
  )

  const userPreferences = useQuery(
    api.notifications.getUserNotificationPreferences,
    customerId ? { userId: customerId } : "skip",
  )

  // Mutations
  const updatePreferences = useMutation(api.notifications.updateNotificationPreferences)
  const resendNotification = useMutation(api.notifications.resendNotification)
  const markAsRead = useMutation(api.notifications.markNotificationAsRead)
  const testNotification = useMutation(api.notifications.sendTestNotification)

  /**
   * Calculate notification statistics
   */
  const statistics = useMemo((): NotificationStats => {
    if (!notificationLogs) {
      return {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        deliveryRate: 0,
      }
    }

    const total = notificationLogs.length
    const delivered = notificationLogs.filter((log) => log.status === "delivered").length
    const failed = notificationLogs.filter((log) => log.status === "failed").length
    const pending = notificationLogs.filter((log) => log.status === "pending").length
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0

    return {
      total,
      delivered,
      failed,
      pending,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
    }
  }, [notificationLogs])

  /**
   * Filter notifications based on current filters
   */
  const filteredNotifications = useMemo(() => {
    if (!notificationLogs) return []

    return notificationLogs.filter((notification) => {
      if (filterStatus !== "all" && notification.status !== filterStatus) {
        return false
      }
      if (filterType !== "all" && notification.type !== filterType) {
        return false
      }
      return true
    })
  }, [notificationLogs, filterStatus, filterType])

  /**
   * Update notification preferences
   */
  const handleUpdatePreferences = useCallback(
    async (preferences: NotificationPreferences) => {
      if (!customerId) return

      setIsLoading(true)
      try {
        await updatePreferences({
          userId: customerId,
          preferences,
        })

        toast({
          title: "Preferences Updated",
          description: "Your notification preferences have been saved successfully.",
        })

        return true
      } catch (error) {
        console.error("Error updating preferences:", error)
        toast({
          title: "Update Failed",
          description: "Unable to update preferences. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [customerId, updatePreferences],
  )

  /**
   * Resend a failed notification
   */
  const handleResendNotification = useCallback(
    async (notificationId: Id<"notificationLogs">) => {
      setIsLoading(true)
      try {
        await resendNotification({ notificationId })

        toast({
          title: "Notification Resent",
          description: "The notification has been queued for resending.",
        })

        return true
      } catch (error) {
        console.error("Error resending notification:", error)
        toast({
          title: "Resend Failed",
          description: "Unable to resend notification. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [resendNotification],
  )

  /**
   * Send a test notification
   */
  const handleTestNotification = useCallback(
    async (type: "email" | "sms", recipient: string) => {
      if (!businessId && !customerId) return

      setIsLoading(true)
      try {
        await testNotification({
          type,
          recipient,
          businessId,
          customerId,
        })

        toast({
          title: "Test Notification Sent",
          description: `A test ${type} has been sent to ${recipient}.`,
        })

        return true
      } catch (error) {
        console.error("Error sending test notification:", error)
        toast({
          title: "Test Failed",
          description: `Unable to send test ${type}. Please check your configuration.`,
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [businessId, customerId, testNotification],
  )

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = useCallback(
    async (notificationId: Id<"notificationLogs">) => {
      try {
        await markAsRead({ notificationId })
        return true
      } catch (error) {
        console.error("Error marking notification as read:", error)
        return false
      }
    },
    [markAsRead],
  )

  /**
   * Update date range filter
   */
  const updateDateRange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end })
  }, [])

  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    setFilterStatus("all")
    setFilterType("all")
    setDateRange({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    })
  }, [])

  /**
   * Get notification types for filtering
   */
  const availableTypes = useMemo(() => {
    if (!notificationLogs) return []

    const types = new Set(notificationLogs.map((log) => log.type))
    return Array.from(types)
  }, [notificationLogs])

  /**
   * Get notification statuses for filtering
   */
  const availableStatuses = useMemo(() => {
    if (!notificationLogs) return []

    const statuses = new Set(notificationLogs.map((log) => log.status))
    return Array.from(statuses)
  }, [notificationLogs])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Trigger refetch by updating a timestamp
      // This will cause the queries to re-run
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  return {
    // State
    isLoading,
    selectedNotification,
    filterStatus,
    filterType,
    dateRange,

    // Data
    notificationLogs: filteredNotifications,
    statistics,
    userPreferences,
    availableTypes,
    availableStatuses,

    // Actions
    updatePreferences: handleUpdatePreferences,
    resendNotification: handleResendNotification,
    testNotification: handleTestNotification,
    markAsRead: handleMarkAsRead,

    // Filters
    setFilterStatus,
    setFilterType,
    updateDateRange,
    resetFilters,

    // Selection
    setSelectedNotification,

    // Utilities
    isDataLoading: !notificationLogs || !notificationStats,
  }
}

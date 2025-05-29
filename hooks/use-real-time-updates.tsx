"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "@/hooks/use-toast"

interface UpdateNotification {
  id: string
  type: "appointment" | "availability" | "notification"
  action: "created" | "updated" | "deleted"
  data: any
  timestamp: Date
}

interface UseRealTimeUpdatesOptions {
  businessId?: Id<"businessProfiles">
  customerId?: string
  onUpdate?: (notification: UpdateNotification) => void
  enableNotifications?: boolean
  enableSound?: boolean
}

/**
 * Custom hook to subscribe to real-time updates from Convex
 *
 * Features:
 * - Real-time data synchronization
 * - Update notifications
 * - Optimistic updates
 * - Connection status monitoring
 * - Update batching for performance
 *
 * @param options - Configuration options for real-time updates
 * @returns Real-time update state and utilities
 */
export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const { businessId, customerId, onUpdate, enableNotifications = true, enableSound = false } = options

  // State
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [updateQueue, setUpdateQueue] = useState<UpdateNotification[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousDataRef = useRef<Map<string, any>>(new Map())

  // Initialize audio for notifications
  useEffect(() => {
    if (enableSound && typeof window !== "undefined") {
      audioRef.current = new Audio("/notification-sound.mp3")
      audioRef.current.volume = 0.5
    }
  }, [enableSound])

  // Subscribe to appointments updates
  const appointments = useQuery(
    api.appointments.subscribeToAppointments,
    businessId || customerId ? { businessId, customerId } : "skip",
  )

  // Subscribe to availability updates
  const availability = useQuery(api.businessAvailability.subscribeToAvailability, businessId ? { businessId } : "skip")

  // Subscribe to notifications
  const notifications = useQuery(
    api.notifications.subscribeToNotifications,
    customerId || businessId ? { userId: customerId, businessId } : "skip",
  )

  /**
   * Play notification sound
   */
  const playNotificationSound = useCallback(() => {
    if (enableSound && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing notification sound:", error)
      })
    }
  }, [enableSound])

  /**
   * Show browser notification
   */
  const showBrowserNotification = useCallback(
    async (title: string, body: string) => {
      if (!enableNotifications || typeof window === "undefined") return

      // Check if notifications are supported
      if (!("Notification" in window)) return

      // Request permission if needed
      if (Notification.permission === "default") {
        await Notification.requestPermission()
      }

      // Show notification if permitted
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon-192x192.png",
          badge: "/icon-72x72.png",
          tag: "appointment-update",
          renotify: true,
        })
      }
    },
    [enableNotifications],
  )

  /**
   * Process update notification
   */
  const processUpdate = useCallback(
    (notification: UpdateNotification) => {
      // Add to queue
      setUpdateQueue((prev) => [...prev, notification])
      setLastUpdate(new Date())

      // Call custom handler
      onUpdate?.(notification)

      // Show toast notification
      if (enableNotifications) {
        let title = ""
        let description = ""

        switch (notification.type) {
          case "appointment":
            switch (notification.action) {
              case "created":
                title = "New Appointment"
                description = "A new appointment has been scheduled"
                break
              case "updated":
                title = "Appointment Updated"
                description = "An appointment has been modified"
                break
              case "deleted":
                title = "Appointment Cancelled"
                description = "An appointment has been cancelled"
                break
            }
            break
          case "availability":
            title = "Availability Changed"
            description = "Business availability has been updated"
            break
          case "notification":
            title = notification.data.title || "New Notification"
            description = notification.data.message || "You have a new notification"
            break
        }

        toast({
          title,
          description,
        })

        // Show browser notification for important updates
        if (notification.type === "appointment" && notification.action === "created") {
          showBrowserNotification(title, description)
          playNotificationSound()
        }
      }
    },
    [onUpdate, enableNotifications, showBrowserNotification, playNotificationSound],
  )

  /**
   * Detect changes in appointments
   */
  useEffect(() => {
    if (!appointments) return

    const previousAppointments = previousDataRef.current.get("appointments") || []
    const currentAppointments = appointments

    // Check for new appointments
    currentAppointments.forEach((current: any) => {
      const previous = previousAppointments.find((p: any) => p._id === current._id)

      if (!previous) {
        // New appointment
        processUpdate({
          id: current._id,
          type: "appointment",
          action: "created",
          data: current,
          timestamp: new Date(),
        })
      } else if (JSON.stringify(previous) !== JSON.stringify(current)) {
        // Updated appointment
        processUpdate({
          id: current._id,
          type: "appointment",
          action: "updated",
          data: { previous, current },
          timestamp: new Date(),
        })
      }
    })

    // Check for deleted appointments
    previousAppointments.forEach((previous: any) => {
      const exists = currentAppointments.find((c: any) => c._id === previous._id)
      if (!exists) {
        processUpdate({
          id: previous._id,
          type: "appointment",
          action: "deleted",
          data: previous,
          timestamp: new Date(),
        })
      }
    })

    // Update reference
    previousDataRef.current.set("appointments", currentAppointments)
  }, [appointments, processUpdate])

  /**
   * Detect changes in availability
   */
  useEffect(() => {
    if (!availability) return

    const previousAvailability = previousDataRef.current.get("availability")

    if (previousAvailability && JSON.stringify(previousAvailability) !== JSON.stringify(availability)) {
      processUpdate({
        id: businessId || "availability",
        type: "availability",
        action: "updated",
        data: availability,
        timestamp: new Date(),
      })
    }

    previousDataRef.current.set("availability", availability)
  }, [availability, businessId, processUpdate])

  /**
   * Process notification updates
   */
  useEffect(() => {
    if (!notifications) return

    const previousNotifications = previousDataRef.current.get("notifications") || []
    const newNotifications = notifications.filter((n: any) => !previousNotifications.find((p: any) => p._id === n._id))

    newNotifications.forEach((notification: any) => {
      processUpdate({
        id: notification._id,
        type: "notification",
        action: "created",
        data: notification,
        timestamp: new Date(),
      })
    })

    previousDataRef.current.set("notifications", notifications)
  }, [notifications, processUpdate])

  /**
   * Batch process updates
   */
  const processBatchedUpdates = useCallback(() => {
    if (updateQueue.length === 0 || isProcessing) return

    setIsProcessing(true)

    // Process all queued updates
    const updates = [...updateQueue]
    setUpdateQueue([])

    // Group updates by type
    const groupedUpdates = updates.reduce(
      (acc, update) => {
        if (!acc[update.type]) {
          acc[update.type] = []
        }
        acc[update.type].push(update)
        return acc
      },
      {} as Record<string, UpdateNotification[]>,
    )

    // Show summary notification for multiple updates
    const totalUpdates = updates.length
    if (totalUpdates > 3) {
      toast({
        title: "Multiple Updates",
        description: `${totalUpdates} items have been updated`,
      })
    }

    setIsProcessing(false)
  }, [updateQueue, isProcessing])

  // Batch updates every 2 seconds
  useEffect(() => {
    if (updateQueue.length > 0) {
      updateTimeoutRef.current = setTimeout(processBatchedUpdates, 2000)
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [updateQueue, processBatchedUpdates])

  /**
   * Clear update queue
   */
  const clearUpdateQueue = useCallback(() => {
    setUpdateQueue([])
  }, [])

  /**
   * Get update statistics
   */
  const statistics = {
    totalUpdates: updateQueue.length,
    appointmentUpdates: updateQueue.filter((u) => u.type === "appointment").length,
    availabilityUpdates: updateQueue.filter((u) => u.type === "availability").length,
    notificationUpdates: updateQueue.filter((u) => u.type === "notification").length,
  }

  return {
    // State
    isConnected,
    lastUpdate,
    updateQueue,
    isProcessing,

    // Data
    appointments,
    availability,
    notifications,
    statistics,

    // Functions
    clearUpdateQueue,
    processUpdate,

    // Utilities
    playNotificationSound,
    showBrowserNotification,
  }
}

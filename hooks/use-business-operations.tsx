"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "@/hooks/use-toast"
import { addDays, startOfDay, endOfDay, format } from "date-fns"

interface UseBusinessOperationsOptions {
  businessId: Id<"businessProfiles">
  autoRefresh?: boolean
  refreshInterval?: number
}

interface BusinessMetrics {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  totalRevenue: number
  averageRating: number
  completionRate: number
  cancellationRate: number
  revenueGrowth: number
}

interface DashboardData {
  todayAppointments: any[]
  upcomingAppointments: any[]
  recentFeedback: any[]
  metrics: BusinessMetrics
  popularServices: any[]
  busyHours: any[]
}

/**
 * Custom hook for managing business operations and dashboard data
 *
 * Features:
 * - Real-time business metrics
 * - Appointment management
 * - Revenue tracking
 * - Performance analytics
 * - Service popularity analysis
 *
 * @param options - Configuration options for business operations
 * @returns Business data and management functions
 */
export function useBusinessOperations(options: UseBusinessOperationsOptions) {
  const { businessId, autoRefresh = true, refreshInterval = 60000 } = options
  const { user } = useUser()

  // State management
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: Date
    end: Date
  }>({
    start: startOfDay(addDays(new Date(), -30)), // Last 30 days
    end: endOfDay(new Date()),
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<string>("revenue")

  // Convex queries
  const businessProfile = useQuery(api.businessProfiles.getById, { businessId })

  const todayAppointments = useQuery(api.appointments.getTodayAppointments, { businessId })

  const upcomingAppointments = useQuery(api.appointments.getUpcomingAppointments, { businessId, limit: 10 })

  const businessMetrics = useQuery(api.dashboard.getBusinessMetrics, {
    businessId,
    startDate: selectedDateRange.start.toISOString(),
    endDate: selectedDateRange.end.toISOString(),
  })

  const recentFeedback = useQuery(api.feedback.getBusinessFeedback, { businessId, limit: 5 })

  const serviceAnalytics = useQuery(api.analytics.getServiceAnalytics, {
    businessId,
    startDate: selectedDateRange.start.toISOString(),
    endDate: selectedDateRange.end.toISOString(),
  })

  const timeAnalytics = useQuery(api.analytics.getTimeAnalytics, {
    businessId,
    startDate: selectedDateRange.start.toISOString(),
    endDate: selectedDateRange.end.toISOString(),
  })

  // Mutations
  const updateBusinessStatus = useMutation(api.businessProfiles.updateBusinessStatus)
  const bulkUpdateAppointments = useMutation(api.appointments.bulkUpdateAppointments)
  const generateReport = useMutation(api.analytics.generateBusinessReport)

  /**
   * Calculate comprehensive business metrics
   */
  const metrics = useMemo((): BusinessMetrics => {
    if (!businessMetrics) {
      return {
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        totalRevenue: 0,
        averageRating: 0,
        completionRate: 0,
        cancellationRate: 0,
        revenueGrowth: 0,
      }
    }

    const {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
      averageRating,
      previousPeriodRevenue,
    } = businessMetrics

    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0

    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0

    const revenueGrowth =
      previousPeriodRevenue > 0 ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    }
  }, [businessMetrics])

  /**
   * Get popular services with analytics
   */
  const popularServices = useMemo(() => {
    if (!serviceAnalytics) return []

    return serviceAnalytics
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5)
      .map((service) => ({
        ...service,
        revenuePercentage: metrics.totalRevenue > 0 ? (service.totalRevenue / metrics.totalRevenue) * 100 : 0,
      }))
  }, [serviceAnalytics, metrics.totalRevenue])

  /**
   * Get busy hours analysis
   */
  const busyHours = useMemo(() => {
    if (!timeAnalytics) return []

    return timeAnalytics
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .map((hour) => ({
        ...hour,
        utilizationRate: hour.availableSlots > 0 ? (hour.appointmentCount / hour.availableSlots) * 100 : 0,
      }))
  }, [timeAnalytics])

  /**
   * Aggregate dashboard data
   */
  const dashboardData = useMemo(
    (): DashboardData => ({
      todayAppointments: todayAppointments || [],
      upcomingAppointments: upcomingAppointments || [],
      recentFeedback: recentFeedback || [],
      metrics,
      popularServices,
      busyHours,
    }),
    [todayAppointments, upcomingAppointments, recentFeedback, metrics, popularServices, busyHours],
  )

  /**
   * Update business operational status
   */
  const handleUpdateBusinessStatus = useCallback(
    async (status: "open" | "closed" | "busy") => {
      setIsLoading(true)
      try {
        await updateBusinessStatus({
          businessId,
          status,
          timestamp: new Date().toISOString(),
        })

        toast({
          title: "Status Updated",
          description: `Business status has been updated to ${status}.`,
        })

        return true
      } catch (error) {
        console.error("Error updating business status:", error)
        toast({
          title: "Update Failed",
          description: "Unable to update business status. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [businessId, updateBusinessStatus],
  )

  /**
   * Bulk update multiple appointments
   */
  const handleBulkUpdateAppointments = useCallback(
    async (appointmentIds: Id<"appointments">[], updates: any) => {
      setIsLoading(true)
      try {
        await bulkUpdateAppointments({
          appointmentIds,
          updates,
        })

        toast({
          title: "Appointments Updated",
          description: `${appointmentIds.length} appointments have been updated successfully.`,
        })

        return true
      } catch (error) {
        console.error("Error bulk updating appointments:", error)
        toast({
          title: "Update Failed",
          description: "Unable to update appointments. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [bulkUpdateAppointments],
  )

  /**
   * Generate business report
   */
  const handleGenerateReport = useCallback(
    async (reportType: "daily" | "weekly" | "monthly" | "custom") => {
      setIsLoading(true)
      try {
        const report = await generateReport({
          businessId,
          reportType,
          startDate: selectedDateRange.start.toISOString(),
          endDate: selectedDateRange.end.toISOString(),
        })

        toast({
          title: "Report Generated",
          description: "Your business report has been generated successfully.",
        })

        return report
      } catch (error) {
        console.error("Error generating report:", error)
        toast({
          title: "Report Generation Failed",
          description: "Unable to generate report. Please try again.",
          variant: "destructive",
        })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [businessId, selectedDateRange, generateReport],
  )

  /**
   * Update date range for analytics
   */
  const updateDateRange = useCallback((start: Date, end: Date) => {
    setSelectedDateRange({ start: startOfDay(start), end: endOfDay(end) })
  }, [])

  /**
   * Get quick date range presets
   */
  const getDateRangePreset = useCallback(
    (preset: string) => {
      const now = new Date()

      switch (preset) {
        case "today":
          return { start: startOfDay(now), end: endOfDay(now) }
        case "yesterday":
          const yesterday = addDays(now, -1)
          return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
        case "last7days":
          return { start: startOfDay(addDays(now, -7)), end: endOfDay(now) }
        case "last30days":
          return { start: startOfDay(addDays(now, -30)), end: endOfDay(now) }
        case "thisMonth":
          return {
            start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
            end: endOfDay(now),
          }
        case "lastMonth":
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
          return { start: startOfDay(lastMonth), end: endOfDay(lastMonthEnd) }
        default:
          return selectedDateRange
      }
    },
    [selectedDateRange],
  )

  /**
   * Apply date range preset
   */
  const applyDateRangePreset = useCallback(
    (preset: string) => {
      const range = getDateRangePreset(preset)
      setSelectedDateRange(range)
    },
    [getDateRangePreset],
  )

  /**
   * Get performance insights
   */
  const performanceInsights = useMemo(() => {
    const insights = []

    if (metrics.completionRate < 80) {
      insights.push({
        type: "warning",
        title: "Low Completion Rate",
        description: `Your completion rate is ${metrics.completionRate}%. Consider reviewing your booking process.`,
        action: "Review booking process",
      })
    }

    if (metrics.cancellationRate > 20) {
      insights.push({
        type: "error",
        title: "High Cancellation Rate",
        description: `Your cancellation rate is ${metrics.cancellationRate}%. This may indicate scheduling issues.`,
        action: "Improve scheduling",
      })
    }

    if (metrics.averageRating < 4.0) {
      insights.push({
        type: "warning",
        title: "Low Average Rating",
        description: `Your average rating is ${metrics.averageRating}. Focus on service quality improvements.`,
        action: "Improve service quality",
      })
    }

    if (metrics.revenueGrowth > 10) {
      insights.push({
        type: "success",
        title: "Strong Revenue Growth",
        description: `Your revenue has grown by ${metrics.revenueGrowth}% compared to the previous period.`,
        action: "Maintain momentum",
      })
    }

    return insights
  }, [metrics])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Queries will automatically refetch due to Convex's real-time nature
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  return {
    // State
    isLoading,
    selectedDateRange,
    selectedMetric,

    // Data
    businessProfile,
    dashboardData,
    metrics,
    popularServices,
    busyHours,
    performanceInsights,

    // Actions
    updateBusinessStatus: handleUpdateBusinessStatus,
    bulkUpdateAppointments: handleBulkUpdateAppointments,
    generateReport: handleGenerateReport,

    // Date range management
    updateDateRange,
    applyDateRangePreset,
    getDateRangePreset,

    // Selection
    setSelectedMetric,

    // Utilities
    isDataLoading: !businessProfile || !businessMetrics,
    dateRangeFormatted: `${format(selectedDateRange.start, "MMM d")} - ${format(selectedDateRange.end, "MMM d, yyyy")}`,
  }
}

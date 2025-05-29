"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Mail, MessageSquare, Bell, CheckCircle, XCircle, Clock, TrendingUp, Users, Calendar } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface NotificationDashboardProps {
  businessId: Id<"businessProfiles">
}

export function NotificationDashboard({ businessId }: NotificationDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d")

  const notificationStats = useQuery(api.notifications.getNotificationStats, {
    businessId,
    period: selectedPeriod,
  })

  const recentNotifications = useQuery(api.notifications.getRecentNotifications, {
    businessId,
    limit: 10,
  })

  const emailStatus = useQuery(api.businessProfiles.getGmailStatus, { businessId })

  if (!notificationStats || !recentNotifications) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const deliveryRate = notificationStats.total > 0 ? (notificationStats.delivered / notificationStats.total) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Dashboard</h2>
          <p className="text-gray-600">Monitor your notification delivery and engagement</p>
        </div>
        <div className="flex gap-2">
          {["24h", "7d", "30d", "90d"].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Email Service</p>
                <div className="flex items-center gap-2">
                  {emailStatus?.connected ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">Not Connected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">SMS Service</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{deliveryRate.toFixed(1)}%</span>
                  <Progress value={deliveryRate} className="w-16 h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Bell className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{notificationStats.total}</p>
            <p className="text-sm text-gray-600">Total Sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{notificationStats.delivered}</p>
            <p className="text-sm text-gray-600">Delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{notificationStats.sent - notificationStats.delivered}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{notificationStats.failed}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="by-channel">By Channel</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Performance</CardTitle>
              <CardDescription>Delivery rates and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Delivery Rate</span>
                  <span className="text-sm text-gray-600">{deliveryRate.toFixed(1)}%</span>
                </div>
                <Progress value={deliveryRate} className="h-2" />

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{notificationStats.delivered}</p>
                    <p className="text-sm text-green-700">Successfully Delivered</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{notificationStats.failed}</p>
                    <p className="text-sm text-red-700">Failed Deliveries</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-type" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications by Type</CardTitle>
              <CardDescription>Breakdown of notification types sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(notificationStats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{type.replace("_", " ")}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-channel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications by Channel</CardTitle>
              <CardDescription>Distribution across email and SMS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(notificationStats.byChannel).map(([channel, count]) => (
                  <div key={channel} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {channel === "email" ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      )}
                      <span className="text-sm font-medium capitalize">{channel}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>Latest notification activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <div key={notification._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {notification.type === "appointment_confirmation" && (
                        <Calendar className="h-4 w-4 text-blue-600" />
                      )}
                      {notification.type === "appointment_reminder" && <Clock className="h-4 w-4 text-yellow-600" />}
                      {notification.type === "appointment_cancelled" && <XCircle className="h-4 w-4 text-red-600" />}
                      {notification.type === "feedback_request" && <Users className="h-4 w-4 text-green-600" />}
                      <div>
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-600">{new Date(notification.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge variant={notification.read ? "secondary" : "default"}>
                      {notification.read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function WebhooksPage() {
  const [eventFilter, setEventFilter] = useState("")
  const [limit, setLimit] = useState(50)

  const webhookLogs = useQuery(api.webhooks.getWebhookLogs, {
    limit,
    eventType: eventFilter || undefined,
  })

  const eventTypes = useQuery(api.webhooks.getEventTypes)

  if (!webhookLogs || !eventTypes) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Webhook Logs</h1>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Webhook Statistics</CardTitle>
            <CardDescription>Overview of webhook events received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-medium">Total Events</h3>
                <p className="text-3xl font-bold">{webhookLogs.length}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-medium">Unique Event Types</h3>
                <p className="text-3xl font-bold">{eventTypes.length}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-medium">Success Rate</h3>
                <p className="text-3xl font-bold">
                  {webhookLogs.length > 0
                    ? `${Math.round(
                        (webhookLogs.filter((log) => log.status === "success").length / webhookLogs.length) * 100,
                      )}%`
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook Logs</CardTitle>
            <CardDescription>Recent webhook events received from Clerk</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex gap-2">
                  <Input
                    placeholder="Filter by event type..."
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="w-full md:w-64"
                  />
                  {eventFilter && (
                    <Button variant="ghost" onClick={() => setEventFilter("")}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="border rounded p-1"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No webhook logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      webhookLogs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell>
                            <Badge variant="outline">{log.eventType}</Badge>
                          </TableCell>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "success" ? "success" : "destructive"}>{log.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

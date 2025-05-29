"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, CheckCircle, AlertCircle, Unlink } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface GmailConnectionProps {
  businessId: Id<"businessProfiles">
}

export function GmailConnection({ businessId }: GmailConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const gmailStatus = useQuery(api.businessProfiles.getGmailStatus, { businessId })
  const disconnectGmail = useMutation(api.businessProfiles.disconnectGmail)

  const handleConnect = async () => {
    try {
      setIsConnecting(true)

      const response = await fetch("/api/auth/gmail/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      })

      const data = await response.json()

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error("Failed to get authorization URL")
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error)
      toast.error("Failed to connect Gmail. Please try again.")
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)

      await disconnectGmail({ businessId })

      toast.success("Gmail disconnected successfully")
    } catch (error) {
      console.error("Error disconnecting Gmail:", error)
      toast.error("Failed to disconnect Gmail. Please try again.")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (!gmailStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gmail Integration
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to send appointment confirmations and notifications from your business email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {gmailStatus.connected ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>

        {gmailStatus.connected && gmailStatus.email && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Connected Email:</span> {gmailStatus.email}
          </div>
        )}

        {gmailStatus.connected && gmailStatus.connectedAt && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Connected:</span> {new Date(gmailStatus.connectedAt).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-2">
          {gmailStatus.connected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-red-600 hover:text-red-700"
            >
              <Unlink className="h-4 w-4 mr-2" />
              {isDisconnecting ? "Disconnecting..." : "Disconnect Gmail"}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting}>
              <Mail className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Gmail"}
            </Button>
          )}
        </div>

        {!gmailStatus.connected && (
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
            <p className="font-medium mb-1">Why connect Gmail?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Send appointment confirmations from your business email</li>
              <li>Maintain professional communication with customers</li>
              <li>Keep all notifications in your Gmail sent folder</li>
              <li>Use your existing email reputation and deliverability</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

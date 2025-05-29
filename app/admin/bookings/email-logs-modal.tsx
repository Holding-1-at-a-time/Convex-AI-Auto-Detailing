"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mail, Clock, CheckCircle, XCircle } from "lucide-react"

interface EmailLogsModalProps {
  open: boolean
  onClose: () => void
  emailLogs: any[]
}

export function EmailLogsModal({ open, onClose, emailLogs }: EmailLogsModalProps) {
  const getEmailTypeBadge = (type: string) => {
    const variants = {
      booking_confirmation: "default",
      booking_reminder: "secondary",
      booking_cancelled: "destructive",
      booking_rescheduled: "outline",
    } as const

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Logs
          </DialogTitle>
          <DialogDescription>Recent email notifications sent to customers</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {emailLogs.map((log, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      {log.subject}
                    </CardTitle>
                    {getEmailTypeBadge(log.type)}
                  </div>
                  <CardDescription className="flex items-center gap-4">
                    <span>To: {log.to}</span>
                    <span>•</span>
                    <span>Sent: {new Date(log.sentAt).toLocaleString()}</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}

            {emailLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No email logs found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

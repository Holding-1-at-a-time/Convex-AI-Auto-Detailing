"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  id: string
  threadId?: string
  onFeedbackSubmitted?: (rating: number) => void
}

export function ChatMessage({ role, content, id, threadId, onFeedbackSubmitted }: ChatMessageProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)

  // Check if the API is available
  const apiAvailable = typeof api.agent?.saveUserFeedback !== "undefined"
  const saveUserFeedback = apiAvailable ? useMutation(api.agent.saveUserFeedback) : null

  const handleFeedback = async (rating: number) => {
    if (!threadId || role !== "assistant" || !apiAvailable) {
      // If API is not available, still show feedback UI response
      setFeedbackRating(rating)
      setFeedbackSubmitted(true)

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(rating)
      }
      return
    }

    try {
      await saveUserFeedback({
        threadId,
        messageId: id,
        rating,
      })

      setFeedbackRating(rating)
      setFeedbackSubmitted(true)

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(rating)
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
    }
  }

  return (
    <div className={cn("flex gap-3 p-4 rounded-lg", role === "user" ? "bg-muted ml-auto" : "bg-primary/5")} key={id}>
      <Avatar className="h-8 w-8">
        {role === "user" ? (
          <>
            <AvatarImage src="/abstract-geometric-shapes.png" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="/futuristic-helper-robot.png" alt="Assistant" />
            <AvatarFallback>AI</AvatarFallback>
          </>
        )}
      </Avatar>
      <div className="grid gap-1 w-full">
        <div className="flex justify-between items-center">
          <p className="font-medium text-sm leading-none">
            {role === "user"
              ? "You"
              : role === "assistant"
                ? "Auto Detailing Assistant"
                : role === "tool"
                  ? "Tool"
                  : "System"}
          </p>

          {role === "assistant" && threadId && (
            <div className="flex gap-1">
              {feedbackSubmitted ? (
                <span className="text-xs text-muted-foreground">
                  {feedbackRating === 5 ? "Thanks for the positive feedback!" : "Thanks for your feedback"}
                </span>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleFeedback(5)}
                    title="Helpful"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleFeedback(1)}
                    title="Not helpful"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <p className="text-sm">{content}</p>
      </div>
    </div>
  )
}

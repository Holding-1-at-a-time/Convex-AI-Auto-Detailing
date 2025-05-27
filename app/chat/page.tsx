"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatMessage } from "@/components/chat-message"
import { useToast } from "@/hooks/use-toast"

export default function ChatPage() {
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const createThread = useMutation(api.agent.createThread)
  const sendMessage = useMutation(api.agent.sendMessage)

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setIsLoading(true)

    try {
      // Add user message to UI immediately
      setMessages((prev) => [...prev, { role: "user", content: input, id: Date.now().toString() }])

      let currentThreadId = threadId

      // Create a new thread if we don't have one
      if (!currentThreadId) {
        const result = await createThread({ title: "Auto Detailing Assistance" })
        currentThreadId = result.threadId
        setThreadId(currentThreadId)
      }

      // Clear input
      setInput("")

      // Send message to agent
      const response = await sendMessage({
        threadId: currentThreadId,
        message: input,
      })

      // Add assistant response to UI
      setMessages((prev) => [...prev, { role: "assistant", content: response.text, id: response.messageId }])
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Auto Detailing Assistant</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <p>No messages yet. Start a conversation with your auto detailing assistant.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessage key={message.id} role={message.role} content={message.content} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            <CardFooter>
              <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                <Input
                  placeholder="Ask about auto detailing, maintenance, or product recommendations..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Vehicle Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid w-full gap-1.5">
                  <label htmlFor="vehicle-make" className="text-sm font-medium">
                    Vehicle Make
                  </label>
                  <Input id="vehicle-make" placeholder="e.g., Toyota" />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="vehicle-model" className="text-sm font-medium">
                    Vehicle Model
                  </label>
                  <Input id="vehicle-model" placeholder="e.g., Camry" />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="vehicle-year" className="text-sm font-medium">
                    Year
                  </label>
                  <Input id="vehicle-year" placeholder="e.g., 2022" />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Additional Notes
                  </label>
                  <Textarea id="notes" placeholder="Describe your vehicle's condition, specific issues, etc." />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="image-upload" className="text-sm font-medium">
                    Upload Images (Optional)
                  </label>
                  <Input id="image-upload" type="file" multiple accept="image/*" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Save Vehicle Data</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

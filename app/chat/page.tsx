"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatMessage } from "@/components/chat-message"
import { useToast } from "@/hooks/use-toast"

interface Message {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  id: string
}

export default function ChatPage() {
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [vehicleData, setVehicleData] = useState({
    make: "",
    model: "",
    year: "",
    notes: "",
    images: [] as File[],
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const createThread = useMutation(api.agent.createThread)
  const sendMessage = useMutation(api.agent.sendMessage)
  const addVehicle = useMutation(api.vehicles.addVehicle)
  const threadHistory = useQuery(api.agent.getThreadHistory, threadId ? { threadId } : "skip")

  // Load thread history when threadId changes
  useEffect(() => {
    if (threadHistory) {
      const formattedMessages = threadHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        id: msg.id,
      }))
      setMessages(formattedMessages)
    }
  }, [threadHistory])

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
      const userMessageId = Date.now().toString()
      setMessages((prev) => [...prev, { role: "user", content: input, id: userMessageId }])

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

  const handleVehicleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVehicleData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVehicleData((prev) => ({
        ...prev,
        images: [...prev.images, ...Array.from(e.target.files as FileList)],
      }))
    }
  }

  const handleSaveVehicleData = async () => {
    try {
      // Validate required fields
      if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
        toast({
          title: "Missing Information",
          description: "Please provide the make, model, and year of your vehicle.",
          variant: "destructive",
        })
        return
      }

      // Save vehicle data
      const vehicleId = await addVehicle({
        userId: "user123", // Replace with actual user ID in production
        make: vehicleData.make,
        model: vehicleData.model,
        year: Number.parseInt(vehicleData.year),
        notes: vehicleData.notes,
      })

      // TODO: Upload images if needed

      toast({
        title: "Success",
        description: "Vehicle data saved successfully.",
      })

      // Create a new thread with vehicle information
      let currentThreadId = threadId
      if (!currentThreadId) {
        const result = await createThread({
          title: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} Assistance`,
          userId: "user123", // Replace with actual user ID in production
        })
        currentThreadId = result.threadId
        setThreadId(currentThreadId)
      }

      // Send initial message with vehicle information
      const initialMessage = `I have a ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}. ${vehicleData.notes}`

      // Add user message to UI
      const userMessageId = Date.now().toString()
      setMessages((prev) => [...prev, { role: "user", content: initialMessage, id: userMessageId }])

      // Send message to agent
      const response = await sendMessage({
        threadId: currentThreadId,
        message: initialMessage,
      })

      // Add assistant response to UI
      setMessages((prev) => [...prev, { role: "assistant", content: response.text, id: response.messageId }])

      // Switch to chat tab
      document.querySelector('[data-value="chat"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    } catch (error) {
      console.error("Error saving vehicle data:", error)
      toast({
        title: "Error",
        description: "Failed to save vehicle data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFeedbackSubmitted = (rating: number) => {
    // Optionally show a toast or update UI based on feedback
    if (rating === 5) {
      toast({
        title: "Thank You",
        description: "We're glad you found this helpful!",
      })
    } else {
      toast({
        title: "Feedback Received",
        description: "We'll use your feedback to improve our assistant.",
      })
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" data-value="chat">
            Chat Assistant
          </TabsTrigger>
          <TabsTrigger value="upload" data-value="upload">
            Upload Data
          </TabsTrigger>
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
                    <ChatMessage
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      id={message.id}
                      threadId={threadId || undefined}
                      onFeedbackSubmitted={handleFeedbackSubmitted}
                    />
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
                  <Input
                    id="vehicle-make"
                    name="make"
                    value={vehicleData.make}
                    onChange={handleVehicleDataChange}
                    placeholder="e.g., Toyota"
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="vehicle-model" className="text-sm font-medium">
                    Vehicle Model
                  </label>
                  <Input
                    id="vehicle-model"
                    name="model"
                    value={vehicleData.model}
                    onChange={handleVehicleDataChange}
                    placeholder="e.g., Camry"
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="vehicle-year" className="text-sm font-medium">
                    Year
                  </label>
                  <Input
                    id="vehicle-year"
                    name="year"
                    value={vehicleData.year}
                    onChange={handleVehicleDataChange}
                    placeholder="e.g., 2022"
                    type="number"
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Additional Notes
                  </label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={vehicleData.notes}
                    onChange={handleVehicleDataChange}
                    placeholder="Describe your vehicle's condition, specific issues, etc."
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <label htmlFor="image-upload" className="text-sm font-medium">
                    Upload Images (Optional)
                  </label>
                  <Input id="image-upload" type="file" multiple accept="image/*" onChange={handleImageUpload} />
                  {vehicleData.images.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">{vehicleData.images.length} image(s) selected</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSaveVehicleData}>
                Save Vehicle Data
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

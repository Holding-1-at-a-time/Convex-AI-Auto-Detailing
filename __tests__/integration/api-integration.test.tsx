import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { useQuery, useMutation } from "convex/react"
import ChatPage from "@/app/chat/page"
import { server, rest } from "msw"

jest.mock("convex/react")

describe("API Integration", () => {
  const mockCreateThread = jest.fn()
  const mockSendMessage = jest.fn()
  const mockThreadHistory = jest.fn()

  beforeEach(() => {
    ;(useQuery as jest.Mock).mockImplementation((fn) => {
      if (fn.name === "getThreadHistory") return mockThreadHistory()
      return null
    })
    ;(useMutation as jest.Mock).mockImplementation((fn) => {
      if (fn.name === "createThread") return mockCreateThread
      if (fn.name === "sendMessage") return mockSendMessage
      return jest.fn()
    })

    mockCreateThread.mockResolvedValue({ threadId: "thread_123" })
    mockSendMessage.mockResolvedValue({
      text: "I can help you with that!",
      messageId: "msg_123",
    })
    mockThreadHistory.mockReturnValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("handles successful API responses", async () => {
    render(<ChatPage />)

    // Type and send a message
    const input = screen.getByPlaceholderText(/Ask about auto detailing/i)
    fireEvent.change(input, { target: { value: "How do I clean leather seats?" } })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))

    // Check that the message was sent
    expect(mockCreateThread).toHaveBeenCalled()
    expect(mockSendMessage).toHaveBeenCalledWith({
      threadId: "thread_123",
      message: "How do I clean leather seats?",
    })

    // Wait for the response to appear
    await waitFor(() => {
      expect(screen.getByText("How do I clean leather seats?")).toBeInTheDocument()
      expect(screen.getByText("I can help you with that!")).toBeInTheDocument()
    })
  })

  it("handles API errors gracefully", async () => {
    // Mock an API error
    mockSendMessage.mockRejectedValueOnce(new Error("API Error"))

    render(<ChatPage />)

    // Type and send a message
    const input = screen.getByPlaceholderText(/Ask about auto detailing/i)
    fireEvent.change(input, { target: { value: "Test message" } })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))

    // Check that error handling works
    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument()
    })
  })

  it("loads thread history when threadId is available", async () => {
    // Mock thread history
    mockThreadHistory.mockReturnValue([
      { id: "msg_1", role: "user", content: "Previous question" },
      { id: "msg_2", role: "assistant", content: "Previous answer" },
    ])

    render(<ChatPage />)

    // Check that history is displayed
    await waitFor(() => {
      expect(screen.getByText("Previous question")).toBeInTheDocument()
      expect(screen.getByText("Previous answer")).toBeInTheDocument()
    })
  })

  it("handles network errors", async () => {
    // Override MSW handler to simulate network error
    server.use(
      rest.post("https://test.convex.cloud/api/action", (req, res, ctx) => {
        return res.networkError("Failed to connect")
      }),
    )

    mockSendMessage.mockRejectedValueOnce(new Error("Network Error"))

    render(<ChatPage />)

    // Type and send a message
    const input = screen.getByPlaceholderText(/Ask about auto detailing/i)
    fireEvent.change(input, { target: { value: "Test message" } })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))

    // Check that error handling works
    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument()
    })
  })
})

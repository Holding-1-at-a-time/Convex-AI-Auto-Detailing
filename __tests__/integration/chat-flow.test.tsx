import { render, screen, fireEvent, waitFor } from "@/test-utils"
import ChatPage from "@/app/chat/page"
import { useQuery, useMutation } from "convex/react"

jest.mock("convex/react")

describe("Chat Flow Integration", () => {
  const mockCreateThread = jest.fn()
  const mockSendMessage = jest.fn()
  const mockAddVehicle = jest.fn()

  beforeEach(() => {
    ;(useQuery as jest.Mock)
      .mockReturnValue(null)(useMutation as jest.Mock)
      .mockImplementation((fn) => {
        if (fn.name === "createThread") return mockCreateThread
        if (fn.name === "sendMessage") return mockSendMessage
        if (fn.name === "addVehicle") return mockAddVehicle
        return jest.fn()
      })

    mockCreateThread.mockResolvedValue({ threadId: "thread_123" })
    mockSendMessage.mockResolvedValue({
      text: "Hello! I can help you with your auto detailing needs.",
      messageId: "msg_123",
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("completes a full chat interaction", async () => {
    render(<ChatPage />)

    // Check initial state
    expect(screen.getByText("Auto Detailing Assistant")).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask about auto detailing/i)).toBeInTheDocument()

    // Type a message
    const input = screen.getByPlaceholderText(/Ask about auto detailing/i)
    fireEvent.change(input, { target: { value: "How do I remove water spots?" } })

    // Submit the message
    const sendButton = screen.getByRole("button", { name: /send/i })
    fireEvent.click(sendButton)

    // Wait for the response
    await waitFor(() => {
      expect(mockCreateThread).toHaveBeenCalledWith({
        title: "Auto Detailing Assistance",
      })
      expect(mockSendMessage).toHaveBeenCalledWith({
        threadId: "thread_123",
        message: "How do I remove water spots?",
      })
    })

    // Check that messages appear
    await waitFor(() => {
      expect(screen.getByText("How do I remove water spots?")).toBeInTheDocument()
      expect(screen.getByText("Hello! I can help you with your auto detailing needs.")).toBeInTheDocument()
    })
  })

  it("handles vehicle data upload", async () => {
    render(<ChatPage />)

    // Switch to upload tab
    const uploadTab = screen.getByText("Upload Data")
    fireEvent.click(uploadTab)

    // Fill in vehicle data
    fireEvent.change(screen.getByLabelText("Vehicle Make"), {
      target: { value: "Toyota" },
    })
    fireEvent.change(screen.getByLabelText("Vehicle Model"), {
      target: { value: "Camry" },
    })
    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2022" },
    })
    fireEvent.change(screen.getByLabelText("Additional Notes"), {
      target: { value: "Black exterior, leather interior" },
    })

    // Save vehicle data
    const saveButton = screen.getByText("Save Vehicle Data")
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockAddVehicle).toHaveBeenCalledWith({
        userId: "user123",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        notes: "Black exterior, leather interior",
      })
    })
  })

  it("handles errors gracefully", async () => {
    mockSendMessage.mockRejectedValueOnce(new Error("Network error"))

    render(<ChatPage />)

    const input = screen.getByPlaceholderText(/Ask about auto detailing/i)
    fireEvent.change(input, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument()
    })
  })
})

import { render, screen, fireEvent } from "@/test-utils"
import { ChatMessage } from "@/components/chat-message"
import { useMutation } from "convex/react"

jest.mock("convex/react")

describe("ChatMessage", () => {
  const mockSaveUserFeedback = jest.fn()

  beforeEach(() => {
    ;(useMutation as jest.Mock).mockReturnValue(mockSaveUserFeedback)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("renders user message correctly", () => {
    render(<ChatMessage role="user" content="Hello, I need help with my car" id="msg_1" />)

    expect(screen.getByText("You")).toBeInTheDocument()
    expect(screen.getByText("Hello, I need help with my car")).toBeInTheDocument()
  })

  it("renders assistant message correctly", () => {
    render(<ChatMessage role="assistant" content="I can help you with that!" id="msg_2" threadId="thread_1" />)

    expect(screen.getByText("Auto Detailing Assistant")).toBeInTheDocument()
    expect(screen.getByText("I can help you with that!")).toBeInTheDocument()
  })

  it("shows feedback buttons for assistant messages with threadId", () => {
    render(<ChatMessage role="assistant" content="Test message" id="msg_3" threadId="thread_1" />)

    expect(screen.getByTitle("Helpful")).toBeInTheDocument()
    expect(screen.getByTitle("Not helpful")).toBeInTheDocument()
  })

  it("handles positive feedback click", async () => {
    const onFeedbackSubmitted = jest.fn()

    render(
      <ChatMessage
        role="assistant"
        content="Test message"
        id="msg_4"
        threadId="thread_1"
        onFeedbackSubmitted={onFeedbackSubmitted}
      />,
    )

    const helpfulButton = screen.getByTitle("Helpful")
    fireEvent.click(helpfulButton)

    expect(onFeedbackSubmitted).toHaveBeenCalledWith(5)
    expect(screen.getByText("Thanks for the positive feedback!")).toBeInTheDocument()
  })

  it("handles negative feedback click", async () => {
    const onFeedbackSubmitted = jest.fn()

    render(
      <ChatMessage
        role="assistant"
        content="Test message"
        id="msg_5"
        threadId="thread_1"
        onFeedbackSubmitted={onFeedbackSubmitted}
      />,
    )

    const notHelpfulButton = screen.getByTitle("Not helpful")
    fireEvent.click(notHelpfulButton)

    expect(onFeedbackSubmitted).toHaveBeenCalledWith(1)
    expect(screen.getByText("Thanks for your feedback")).toBeInTheDocument()
  })

  it("does not show feedback buttons for user messages", () => {
    render(<ChatMessage role="user" content="Test message" id="msg_6" threadId="thread_1" />)

    expect(screen.queryByTitle("Helpful")).not.toBeInTheDocument()
    expect(screen.queryByTitle("Not helpful")).not.toBeInTheDocument()
  })

  it("applies correct styling for user messages", () => {
    const { container } = render(<ChatMessage role="user" content="Test message" id="msg_7" />)

    const messageContainer = container.firstChild
    expect(messageContainer).toHaveClass("bg-muted", "ml-auto")
  })

  it("applies correct styling for assistant messages", () => {
    const { container } = render(<ChatMessage role="assistant" content="Test message" id="msg_8" />)

    const messageContainer = container.firstChild
    expect(messageContainer).toHaveClass("bg-primary/5")
  })
})

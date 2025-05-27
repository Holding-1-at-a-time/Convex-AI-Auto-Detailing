import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  role: "user" | "assistant" | "system"
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={cn("flex gap-3 p-4 rounded-lg", role === "user" ? "bg-muted ml-auto" : "bg-primary/5")}>
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
      <div className="grid gap-1">
        <p className="font-medium text-sm leading-none">{role === "user" ? "You" : "Auto Detailing Assistant"}</p>
        <p className="text-sm">{content}</p>
      </div>
    </div>
  )
}

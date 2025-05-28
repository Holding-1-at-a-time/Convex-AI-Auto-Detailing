"use client"

import { cn } from "@/lib/utils"
import { useInView } from "@/hooks/use-in-view"
import type { ReactNode } from "react"

interface ScrollAnimationProps {
  children: ReactNode
  className?: string
  animation?:
    | "fade-in"
    | "fade-in-up"
    | "fade-in-down"
    | "fade-in-left"
    | "fade-in-right"
    | "scale-in"
    | "rotate-in"
    | "slide-in-bottom"
  delay?: number
  threshold?: number
  stagger?: boolean
}

export function ScrollAnimation({
  children,
  className,
  animation = "fade-in-up",
  delay = 0,
  threshold = 0.1,
  stagger = false,
}: ScrollAnimationProps) {
  const { ref, isInView } = useInView({ threshold })

  return (
    <div
      ref={ref as any}
      className={cn(
        "scroll-animate",
        isInView && `in-view animate-${animation}`,
        stagger && isInView && "animate-stagger",
        className,
      )}
      style={{
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

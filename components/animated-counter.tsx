"use client"

import { useState, useEffect, useRef } from "react"
import { useInView } from "@/hooks/use-in-view"

interface AnimatedCounterProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  decimalPlaces?: number
}

export function AnimatedCounter({
  end,
  duration = 2000,
  prefix = "",
  suffix = "",
  decimalPlaces = 0,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const countRef = useRef<HTMLSpanElement>(null)
  const { ref, isInView } = useInView({ threshold: 0.3, triggerOnce: true })
  const startTime = useRef<number | null>(null)
  const animationFrameId = useRef<number | null>(null)

  useEffect(() => {
    if (!isInView) return

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = timestamp - startTime.current

      // Calculate the current count based on progress
      const progressRatio = Math.min(progress / duration, 1)
      // Use easeOutQuad for smoother animation
      const easedProgress = 1 - (1 - progressRatio) * (1 - progressRatio)
      const currentCount = easedProgress * end

      setCount(currentCount)

      if (progress < duration) {
        animationFrameId.current = requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    animationFrameId.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [isInView, end, duration])

  const formattedCount = count.toFixed(decimalPlaces)

  return (
    <span ref={ref as any} className="inline-block">
      <span ref={countRef} className="tabular-nums">
        {prefix}
        {formattedCount}
        {suffix}
      </span>
    </span>
  )
}

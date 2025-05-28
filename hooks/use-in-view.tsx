"use client"

import { useState, useEffect, useRef } from "react"

interface UseInViewOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useInView({ threshold = 0.1, rootMargin = "0px", triggerOnce = false }: UseInViewOptions = {}) {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<Element | null>(null)
  const enteredView = useRef(false)

  useEffect(() => {
    const currentRef = ref.current
    if (!currentRef) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (triggerOnce && enteredView.current) return
          const inView = entry.isIntersecting
          setIsInView(inView)
          if (inView) enteredView.current = true
        })
      },
      { threshold, rootMargin },
    )

    observer.observe(currentRef)

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [threshold, rootMargin, triggerOnce])

  return { ref, isInView }
}

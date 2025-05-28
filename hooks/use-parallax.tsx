"use client"

import { useEffect, useState } from "react"

export function useParallax() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll, { passive: true })

    // Initial call
    handleScroll()

    // Clean up
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return scrollY
}

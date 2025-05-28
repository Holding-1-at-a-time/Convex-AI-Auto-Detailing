"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useThreeScene } from "@/hooks/use-three-scene"
import { useFallbackScene } from "@/hooks/use-fallback-scene"
import { LoadingAnimation } from "@/components/loading-animation"

interface UseThreeSceneProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  modelUrl: string
  onProgress?: (progress: number) => void
  onLoaded?: () => void
  // ...
}

export default function SplashPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showEnterButton, setShowEnterButton] = useState(false)
  const [modelError, setModelError] = useState(false)
  const [useMainScene, setUseMainScene] = useState(true)

  // Try to use the duck model first
  const carModelUrl = "app/assets/free_bmw_m3_e30.glb"

  const handleProgress = (progress: number) => {
    setLoadingProgress(progress)
  }

  const handleLoaded = () => {
    setLoading(false)
    setTimeout(() => setShowEnterButton(true), 1000)
  }

  const handleError = () => {
    console.log("Model loading failed, switching to fallback scene")
    setUseMainScene(false)
    setModelError(true)
  }

  // Try to use the main scene first
  useThreeScene({
    containerRef: containerRef?.current,
    modelUrl: carModelUrl,
    onProgress: handleProgress,
    onLoaded: useMainScene ? handleLoaded : undefined,
  })
  // Use fallback scene if main scene fails
  if (containerRef.current !== null) {
    useFallbackScene({
      containerRef: containerRef,
      onLoaded: !useMainScene ? handleLoaded : undefined,
    });
  }

  // If model loading takes too long, switch to fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && useMainScene) {
        console.log("Model loading timeout, switching to fallback scene")
        setUseMainScene(false)
        setModelError(true)
      }
    }, 10000) // 10 seconds timeout

    return () => clearTimeout(timeout)
  }, [loading, useMainScene])

  const handleEnter = () => {
    router.push("/home")
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      {/* 3D container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Overlay content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {loading ? (
          <LoadingAnimation progress={loadingProgress} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.h1
              className="text-5xl font-bold mb-2 text-gray-900"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              AutoDetailAI
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Your AI-powered detailing assistant
            </motion.p>

            {showEnterButton && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <Button
                  size="lg"
                  onClick={handleEnter}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  Enter Experience
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

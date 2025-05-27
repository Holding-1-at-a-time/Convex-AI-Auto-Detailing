"use client"

import { motion } from "framer-motion"

interface LoadingAnimationProps {
  progress: number
}

export function LoadingAnimation({ progress }: LoadingAnimationProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <motion.div
          className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex items-center">
        <motion.div
          className="text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Loading experience... {progress}%
        </motion.div>

        <motion.div
          className="ml-2 w-5 h-5 border-t-2 border-r-2 border-blue-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      </div>
    </div>
  )
}

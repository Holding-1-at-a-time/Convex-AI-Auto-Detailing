"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"

interface UseThreeSceneProps {
  containerRef: React.RefObject<HTMLDivElement>
  modelUrl: string
  onProgress?: (progress: number) => void
  onLoaded?: () => void
}

export function useThreeScene({ containerRef, modelUrl, onProgress, onLoaded }: UseThreeSceneProps) {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    // Initialize scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#f5f5f7")
    sceneRef.current = scene

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(5, 3, 5)
    cameraRef.current = camera

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Initialize controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 1
    controls.enableZoom = false
    controlsRef.current = controls

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 7.5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0x3b82f6, 1, 100)
    pointLight.position.set(0, 5, 0)
    scene.add(pointLight)

    // Add platform
    const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.1, 32)
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.8,
      roughness: 0.2,
    })
    const platform = new THREE.Mesh(platformGeometry, platformMaterial)
    platform.position.y = -0.5
    platform.receiveShadow = true
    scene.add(platform)

    // Add particles
    const particlesGeometry = new THREE.BufferGeometry()
    const particlesCount = 1000
    const posArray = new Float32Array(particlesCount * 3)

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 20
    }

    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.8,
    })

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial)
    scene.add(particlesMesh)

    // Load model
    const loader = new GLTFLoader()

    // Set up Draco loader
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/")
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene
        model.scale.set(0.02, 0.02, 0.02)
        model.position.set(0, 0, 0)
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        scene.add(model)
        modelRef.current = model

        if (onLoaded) onLoaded()
      },
      (xhr) => {
        if (onProgress && xhr.total > 0) {
          onProgress(Math.floor((xhr.loaded / xhr.total) * 100))
        } else if (onProgress) {
          // If total is 0, we can't calculate percentage, so just update with indeterminate progress
          onProgress(50)
        }
      },
      (error) => {
        console.error("An error occurred loading the model:", error)
        // Still call onLoaded to allow the UI to proceed even if model loading failed
        if (onLoaded) onLoaded()
      },
    )

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return

      animationFrameRef.current = requestAnimationFrame(animate)

      if (controlsRef.current) controlsRef.current.update()

      // Animate model
      if (modelRef.current) {
        const time = Date.now() * 0.001
        modelRef.current.position.y = -0.5 + Math.sin(time) * 0.1
        modelRef.current.rotation.y = time * 0.3
      }

      // Animate particles
      if (particlesMesh) {
        particlesMesh.rotation.y += 0.001
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

    animate()
    setIsInitialized(true)

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return

      cameraRef.current.aspect = window.innerWidth / window.innerHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }

      // Clean up Draco loader
      dracoLoader.dispose()
    }
  }, [containerRef, isInitialized, modelUrl, onLoaded, onProgress])

  return { isInitialized }
}

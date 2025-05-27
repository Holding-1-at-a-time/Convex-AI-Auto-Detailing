"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface UseFallbackSceneProps {
  containerRef: React.RefObject<HTMLDivElement>
  onLoaded?: () => void
}

export function useFallbackScene({ containerRef, onLoaded }: UseFallbackSceneProps) {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
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

    // Create a car-like shape using basic geometries
    const carGroup = new THREE.Group()

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 4)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.8,
      roughness: 0.2,
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.5
    body.castShadow = true
    carGroup.add(body)

    // Car top
    const topGeometry = new THREE.BoxGeometry(1.5, 0.5, 2)
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.8,
      roughness: 0.2,
    })
    const top = new THREE.Mesh(topGeometry, topMaterial)
    top.position.y = 1
    top.position.z = -0.5
    top.castShadow = true
    carGroup.add(top)

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32)
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.5,
      roughness: 0.7,
    })

    // Front left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheelFL.rotation.z = Math.PI / 2
    wheelFL.position.set(-1.1, 0.4, -1.3)
    wheelFL.castShadow = true
    carGroup.add(wheelFL)

    // Front right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheelFR.rotation.z = Math.PI / 2
    wheelFR.position.set(1.1, 0.4, -1.3)
    wheelFR.castShadow = true
    carGroup.add(wheelFR)

    // Rear left wheel
    const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheelRL.rotation.z = Math.PI / 2
    wheelRL.position.set(-1.1, 0.4, 1.3)
    wheelRL.castShadow = true
    carGroup.add(wheelRL)

    // Rear right wheel
    const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheelRR.rotation.z = Math.PI / 2
    wheelRR.position.set(1.1, 0.4, 1.3)
    wheelRR.castShadow = true
    carGroup.add(wheelRR)

    // Headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16)
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
    })

    // Left headlight
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial)
    headlightL.position.set(-0.7, 0.5, -2)
    carGroup.add(headlightL)

    // Right headlight
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial)
    headlightR.position.set(0.7, 0.5, -2)
    carGroup.add(headlightR)

    // Add car to scene
    carGroup.position.y = -0.4
    scene.add(carGroup)

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

    // Notify that the scene is loaded
    if (onLoaded) {
      setTimeout(onLoaded, 500) // Small delay to make it feel like loading
    }

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return

      animationFrameRef.current = requestAnimationFrame(animate)

      if (controlsRef.current) controlsRef.current.update()

      // Animate car
      const time = Date.now() * 0.001
      carGroup.position.y = -0.4 + Math.sin(time) * 0.1
      carGroup.rotation.y = time * 0.3

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
    }
  }, [containerRef, isInitialized, onLoaded])

  return { isInitialized }
}

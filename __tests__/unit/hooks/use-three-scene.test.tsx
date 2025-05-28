import { renderHook } from "@testing-library/react"
import { useThreeScene } from "@/hooks/use-three-scene"
import * as THREE from "three"

// Mock Three.js
jest.mock("three", () => {
  const actualThree = jest.requireActual("three")
  return {
    ...actualThree,
    Scene: jest.fn().mockImplementation(() => ({
      background: null,
      add: jest.fn(),
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      shadowMap: { enabled: false },
      render: jest.fn(),
      domElement: document.createElement("canvas"),
      dispose: jest.fn(),
    })),
    Color: jest.fn().mockImplementation(() => "#f5f5f7"),
    AmbientLight: jest.fn().mockImplementation(() => ({})),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      castShadow: false,
    })),
    PointLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
    CylinderGeometry: jest.fn(),
    MeshStandardMaterial: jest.fn(),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { y: 0 },
      receiveShadow: false,
      castShadow: false,
      traverse: jest.fn((fn) => fn({ isMesh: true })),
    })),
    BufferGeometry: jest.fn(),
    BufferAttribute: jest.fn(),
    PointsMaterial: jest.fn(),
    Points: jest.fn().mockImplementation(() => ({
      rotation: { y: 0 },
    })),
    Group: jest.fn().mockImplementation(() => ({
      scale: { set: jest.fn() },
      position: { set: jest.fn(), y: 0 },
      rotation: { y: 0 },
      traverse: jest.fn((fn) => fn({ isMesh: true })),
    })),
  }
})

// Mock OrbitControls
jest.mock("three/examples/jsm/controls/OrbitControls", () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    autoRotate: false,
    autoRotateSpeed: 0,
    enableZoom: true,
    update: jest.fn(),
    dispose: jest.fn(),
  })),
}))

// Mock GLTFLoader
jest.mock("three/examples/jsm/loaders/GLTFLoader", () => ({
  GLTFLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn((url, onLoad, onProgress, onError) => {
      // Simulate successful loading
      onLoad({
        scene: new (jest.requireActual("three").Group)(),
      })
    }),
    setDRACOLoader: jest.fn(),
  })),
}))

// Mock DRACOLoader
jest.mock("three/examples/jsm/loaders/DRACOLoader", () => ({
  DRACOLoader: jest.fn().mockImplementation(() => ({
    setDecoderPath: jest.fn(),
    dispose: jest.fn(),
  })),
}))

describe("useThreeScene", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("initializes the scene when containerRef is provided", () => {
    const containerRef = { current: document.createElement("div") }
    const modelUrl = "/assets/3d/model.glb"
    const onProgress = jest.fn()
    const onLoaded = jest.fn()

    renderHook(() =>
      useThreeScene({
        containerRef,
        modelUrl,
        onProgress,
        onLoaded,
      }),
    )

    // Check if scene was initialized
    expect(THREE.Scene).toHaveBeenCalled()
    expect(THREE.PerspectiveCamera).toHaveBeenCalled()
    expect(THREE.WebGLRenderer).toHaveBeenCalled()

    // Check if lights were added
    expect(THREE.AmbientLight).toHaveBeenCalled()
    expect(THREE.DirectionalLight).toHaveBeenCalled()
    expect(THREE.PointLight).toHaveBeenCalled()

    // Check if platform was created
    expect(THREE.CylinderGeometry).toHaveBeenCalled()
    expect(THREE.MeshStandardMaterial).toHaveBeenCalled()
    expect(THREE.Mesh).toHaveBeenCalled()

    // Check if particles were created
    expect(THREE.BufferGeometry).toHaveBeenCalled()
    expect(THREE.BufferAttribute).toHaveBeenCalled()
    expect(THREE.PointsMaterial).toHaveBeenCalled()
    expect(THREE.Points).toHaveBeenCalled()

    // Check if callbacks were called
    expect(onProgress).toHaveBeenCalled()
    expect(onLoaded).toHaveBeenCalled()
  })

  it("does not initialize when containerRef is null", () => {
    const containerRef = { current: null }
    const modelUrl = "/assets/3d/model.glb"

    renderHook(() =>
      useThreeScene({
        containerRef,
        modelUrl,
      }),
    )

    // Scene should not be initialized
    expect(THREE.Scene).not.toHaveBeenCalled()
    expect(THREE.PerspectiveCamera).not.toHaveBeenCalled()
    expect(THREE.WebGLRenderer).not.toHaveBeenCalled()
  })

  it("cleans up resources on unmount", () => {
    const containerRef = { current: document.createElement("div") }
    const modelUrl = "/assets/3d/model.glb"

    const { unmount } = renderHook(() =>
      useThreeScene({
        containerRef,
        modelUrl,
      }),
    )

    // Unmount the hook
    unmount()

    // Check if cleanup was performed
    const renderer = new THREE.WebGLRenderer()
    expect(renderer.dispose).toHaveBeenCalled()
  })
})

"use client"

import { renderHook, act } from "@testing-library/react"
import { useToast } from "@/hooks/use-toast"

describe("useToast", () => {
  it("should add a toast", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: "Test Toast",
        description: "This is a test toast",
      })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]).toMatchObject({
      title: "Test Toast",
      description: "This is a test toast",
    })
  })

  it("should dismiss a toast", () => {
    const { result } = renderHook(() => useToast())

    let toastId: string

    act(() => {
      const { id } = result.current.toast({
        title: "Test Toast",
      })
      toastId = id
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss(toastId!)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it("should handle multiple toasts", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: "Toast 1" })
      result.current.toast({ title: "Toast 2" })
      result.current.toast({ title: "Toast 3" })
    })

    expect(result.current.toasts).toHaveLength(3)
    expect(result.current.toasts[0].title).toBe("Toast 1")
    expect(result.current.toasts[1].title).toBe("Toast 2")
    expect(result.current.toasts[2].title).toBe("Toast 3")
  })

  it("should update a toast", () => {
    const { result } = renderHook(() => useToast())

    let toastId: string

    act(() => {
      const { id, update } = result.current.toast({
        title: "Original Title",
      })
      toastId = id
    })

    act(() => {
      const toast = result.current.toasts.find((t) => t.id === toastId)
      toast?.update({
        title: "Updated Title",
        description: "New description",
      })
    })

    expect(result.current.toasts[0]).toMatchObject({
      title: "Updated Title",
      description: "New description",
    })
  })
})

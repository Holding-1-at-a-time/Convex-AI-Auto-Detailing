"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface UseUIStateOptions {
  persistToUrl?: boolean
  storageKey?: string
  defaultView?: string
  enableKeyboardShortcuts?: boolean
}

interface UIState {
  activeView: string
  sidebarOpen: boolean
  modalOpen: boolean
  selectedItems: Set<string>
  searchQuery: string
  sortBy: string
  sortOrder: "asc" | "desc"
  filters: Record<string, any>
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

/**
 * Custom hook for managing UI state and interactions
 *
 * Features:
 * - View state management
 * - Modal and sidebar controls
 * - Selection management
 * - Search and filtering
 * - Sorting and pagination
 * - URL persistence
 * - Keyboard shortcuts
 * - Local storage persistence
 *
 * @param options - Configuration options for UI state
 * @returns UI state and management functions
 */
export function useUIState(options: UseUIStateOptions = {}) {
  const { persistToUrl = false, storageKey, defaultView = "grid", enableKeyboardShortcuts = true } = options

  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL or localStorage
  const getInitialState = useCallback((): UIState => {
    const defaultState: UIState = {
      activeView: defaultView,
      sidebarOpen: true,
      modalOpen: false,
      selectedItems: new Set(),
      searchQuery: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      filters: {},
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
      },
    }

    // Load from URL if enabled
    if (persistToUrl) {
      return {
        ...defaultState,
        activeView: searchParams.get("view") || defaultState.activeView,
        searchQuery: searchParams.get("search") || defaultState.searchQuery,
        sortBy: searchParams.get("sortBy") || defaultState.sortBy,
        sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || defaultState.sortOrder,
        pagination: {
          ...defaultState.pagination,
          page: Number.parseInt(searchParams.get("page") || "1"),
          pageSize: Number.parseInt(searchParams.get("pageSize") || "20"),
        },
      }
    }

    // Load from localStorage if enabled
    if (storageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedState = JSON.parse(stored)
          return {
            ...defaultState,
            ...parsedState,
            selectedItems: new Set(parsedState.selectedItems || []),
          }
        }
      } catch (error) {
        console.error("Error loading UI state from localStorage:", error)
      }
    }

    return defaultState
  }, [defaultView, persistToUrl, searchParams, storageKey])

  const [uiState, setUIState] = useState<UIState>(getInitialState)

  /**
   * Update URL parameters when state changes
   */
  const updateURL = useCallback(
    (newState: Partial<UIState>) => {
      if (!persistToUrl) return

      const params = new URLSearchParams(searchParams.toString())

      if (newState.activeView) params.set("view", newState.activeView)
      if (newState.searchQuery !== undefined) {
        if (newState.searchQuery) {
          params.set("search", newState.searchQuery)
        } else {
          params.delete("search")
        }
      }
      if (newState.sortBy) params.set("sortBy", newState.sortBy)
      if (newState.sortOrder) params.set("sortOrder", newState.sortOrder)
      if (newState.pagination?.page) params.set("page", newState.pagination.page.toString())
      if (newState.pagination?.pageSize) params.set("pageSize", newState.pagination.pageSize.toString())

      const newURL = `${window.location.pathname}?${params.toString()}`
      router.replace(newURL, { scroll: false })
    },
    [persistToUrl, searchParams, router],
  )

  /**
   * Save state to localStorage
   */
  const saveToStorage = useCallback(
    (newState: UIState) => {
      if (!storageKey || typeof window === "undefined") return

      try {
        const stateToSave = {
          ...newState,
          selectedItems: Array.from(newState.selectedItems),
          modalOpen: false, // Don't persist modal state
        }
        localStorage.setItem(storageKey, JSON.stringify(stateToSave))
      } catch (error) {
        console.error("Error saving UI state to localStorage:", error)
      }
    },
    [storageKey],
  )

  /**
   * Update UI state with persistence
   */
  const updateUIState = useCallback(
    (updates: Partial<UIState>) => {
      setUIState((prevState) => {
        const newState = { ...prevState, ...updates }
        updateURL(updates)
        saveToStorage(newState)
        return newState
      })
    },
    [updateURL, saveToStorage],
  )

  /**
   * Set active view
   */
  const setActiveView = useCallback(
    (view: string) => {
      updateUIState({ activeView: view })
    },
    [updateUIState],
  )

  /**
   * Toggle sidebar
   */
  const toggleSidebar = useCallback(() => {
    updateUIState({ sidebarOpen: !uiState.sidebarOpen })
  }, [uiState.sidebarOpen, updateUIState])

  /**
   * Open/close modal
   */
  const setModalOpen = useCallback(
    (open: boolean) => {
      updateUIState({ modalOpen: open })
    },
    [updateUIState],
  )

  /**
   * Toggle item selection
   */
  const toggleItemSelection = useCallback(
    (itemId: string) => {
      const newSelectedItems = new Set(uiState.selectedItems)
      if (newSelectedItems.has(itemId)) {
        newSelectedItems.delete(itemId)
      } else {
        newSelectedItems.add(itemId)
      }
      updateUIState({ selectedItems: newSelectedItems })
    },
    [uiState.selectedItems, updateUIState],
  )

  /**
   * Select all items
   */
  const selectAllItems = useCallback(
    (itemIds: string[]) => {
      updateUIState({ selectedItems: new Set(itemIds) })
    },
    [updateUIState],
  )

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    updateUIState({ selectedItems: new Set() })
  }, [updateUIState])

  /**
   * Update search query
   */
  const setSearchQuery = useCallback(
    (query: string) => {
      updateUIState({
        searchQuery: query,
        pagination: { ...uiState.pagination, page: 1 }, // Reset to first page
      })
    },
    [uiState.pagination, updateUIState],
  )

  /**
   * Update sorting
   */
  const setSorting = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc" = "asc") => {
      updateUIState({ sortBy, sortOrder })
    },
    [updateUIState],
  )

  /**
   * Toggle sort order
   */
  const toggleSortOrder = useCallback(() => {
    const newOrder = uiState.sortOrder === "asc" ? "desc" : "asc"
    updateUIState({ sortOrder: newOrder })
  }, [uiState.sortOrder, updateUIState])

  /**
   * Update filters
   */
  const setFilters = useCallback(
    (filters: Record<string, any>) => {
      updateUIState({
        filters,
        pagination: { ...uiState.pagination, page: 1 }, // Reset to first page
      })
    },
    [uiState.pagination, updateUIState],
  )

  /**
   * Update single filter
   */
  const setFilter = useCallback(
    (key: string, value: any) => {
      const newFilters = { ...uiState.filters, [key]: value }
      setFilters(newFilters)
    },
    [uiState.filters, setFilters],
  )

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    updateUIState({
      filters: {},
      pagination: { ...uiState.pagination, page: 1 },
    })
  }, [uiState.pagination, updateUIState])

  /**
   * Update pagination
   */
  const setPagination = useCallback(
    (pagination: Partial<UIState["pagination"]>) => {
      updateUIState({
        pagination: { ...uiState.pagination, ...pagination },
      })
    },
    [uiState.pagination, updateUIState],
  )

  /**
   * Go to specific page
   */
  const goToPage = useCallback(
    (page: number) => {
      setPagination({ page })
    },
    [setPagination],
  )

  /**
   * Change page size
   */
  const setPageSize = useCallback(
    (pageSize: number) => {
      setPagination({ pageSize, page: 1 })
    },
    [setPagination],
  )

  /**
   * Reset all UI state
   */
  const resetUIState = useCallback(() => {
    const initialState = getInitialState()
    setUIState(initialState)
    updateURL(initialState)
    saveToStorage(initialState)
  }, [getInitialState, updateURL, saveToStorage])

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (event.key) {
        case "Escape":
          if (uiState.modalOpen) {
            setModalOpen(false)
          } else if (uiState.selectedItems.size > 0) {
            clearSelection()
          }
          break
        case "/":
          event.preventDefault()
          // Focus search input if available
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
          searchInput?.focus()
          break
        case "a":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            // This would need item IDs passed from parent component
          }
          break
        case "s":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            toggleSidebar()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    enableKeyboardShortcuts,
    uiState.modalOpen,
    uiState.selectedItems.size,
    setModalOpen,
    clearSelection,
    toggleSidebar,
  ])

  /**
   * Computed values
   */
  const computedValues = useMemo(
    () => ({
      hasSelection: uiState.selectedItems.size > 0,
      selectionCount: uiState.selectedItems.size,
      hasFilters: Object.keys(uiState.filters).length > 0,
      hasSearch: uiState.searchQuery.length > 0,
      totalPages: Math.ceil(uiState.pagination.total / uiState.pagination.pageSize),
      canGoNext: uiState.pagination.page < Math.ceil(uiState.pagination.total / uiState.pagination.pageSize),
      canGoPrevious: uiState.pagination.page > 1,
    }),
    [uiState],
  )

  return {
    // State
    uiState,
    ...computedValues,

    // View management
    activeView: uiState.activeView,
    setActiveView,

    // Layout controls
    sidebarOpen: uiState.sidebarOpen,
    toggleSidebar,
    modalOpen: uiState.modalOpen,
    setModalOpen,

    // Selection management
    selectedItems: uiState.selectedItems,
    toggleItemSelection,
    selectAllItems,
    clearSelection,

    // Search and filtering
    searchQuery: uiState.searchQuery,
    setSearchQuery,
    filters: uiState.filters,
    setFilters,
    setFilter,
    clearFilters,

    // Sorting
    sortBy: uiState.sortBy,
    sortOrder: uiState.sortOrder,
    setSorting,
    toggleSortOrder,

    // Pagination
    pagination: uiState.pagination,
    setPagination,
    goToPage,
    setPageSize,

    // Utilities
    resetUIState,
    updateUIState,
  }
}

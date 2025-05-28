"use client"

import { useState, useEffect } from "react"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Search, Filter, X, Clock } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function SemanticSearch({
  type = "services",
  placeholder = "Search...",
  onResultsChange = null,
  showFilters = true,
  limit = 10,
  className = "",
}) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState([])
  const [filters, setFilters] = useState({
    category: "",
    minPrice: 0,
    maxPrice: 500,
    duration: 240,
    city: "",
    state: "",
    businessType: "",
    service: "",
    tags: [],
  })
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Get search actions based on type
  const searchServices = useAction(api.search.searchServices)
  const searchBusinesses = useAction(api.search.searchBusinesses)
  const searchKnowledgeBase = useAction(api.search.searchKnowledgeBase)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      if (onResultsChange) onResultsChange([])
      return
    }

    performSearch()
  }, [debouncedQuery, filters])

  // Notify parent component when results change
  useEffect(() => {
    if (onResultsChange) onResultsChange(results)
  }, [results, onResultsChange])

  // Perform search based on type
  const performSearch = async () => {
    if (!debouncedQuery.trim()) return

    setIsSearching(true)
    try {
      let searchResults

      if (type === "services") {
        searchResults = await searchServices({
          query: debouncedQuery,
          filters: {
            category: filters.category || undefined,
            minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
            maxPrice: filters.maxPrice < 500 ? filters.maxPrice : undefined,
            duration: filters.duration < 240 ? filters.duration : undefined,
          },
          limit,
        })
      } else if (type === "businesses") {
        searchResults = await searchBusinesses({
          query: debouncedQuery,
          filters: {
            city: filters.city || undefined,
            state: filters.state || undefined,
            businessType: filters.businessType || undefined,
            service: filters.service || undefined,
          },
          limit,
        })
      } else if (type === "knowledge") {
        searchResults = await searchKnowledgeBase({
          query: debouncedQuery,
          filters: {
            category: filters.category || undefined,
            tags: filters.tags.length > 0 ? filters.tags : undefined,
          },
          limit,
        })
      }

      setResults(searchResults || [])
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Clear search
  const clearSearch = () => {
    setQuery("")
    setDebouncedQuery("")
    setResults([])
    if (onResultsChange) onResultsChange([])
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({
      category: "",
      minPrice: 0,
      maxPrice: 500,
      duration: 240,
      city: "",
      state: "",
      businessType: "",
      service: "",
      tags: [],
    })
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-9 pr-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Search Filters</SheetTitle>
                <SheetDescription>Refine your search results with these filters.</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {type === "services" && (
                  <>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={filters.category}
                        onValueChange={(value) => setFilters({ ...filters, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Price Range</Label>
                        <span className="text-sm text-muted-foreground">
                          ${filters.minPrice} - ${filters.maxPrice}
                        </span>
                      </div>
                      <div className="pt-4">
                        <Slider
                          min={0}
                          max={500}
                          step={10}
                          value={[filters.minPrice, filters.maxPrice]}
                          onValueChange={([min, max]) => setFilters({ ...filters, minPrice: min, maxPrice: max })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Maximum Duration (minutes)</Label>
                        <span className="text-sm text-muted-foreground">{filters.duration} min</span>
                      </div>
                      <Slider
                        min={30}
                        max={240}
                        step={15}
                        value={[filters.duration]}
                        onValueChange={([value]) => setFilters({ ...filters, duration: value })}
                      />
                    </div>
                  </>
                )}

                {type === "businesses" && (
                  <>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        placeholder="Enter city"
                        value={filters.city}
                        onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        placeholder="Enter state"
                        value={filters.state}
                        onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Business Type</Label>
                      <Select
                        value={filters.businessType}
                        onValueChange={(value) => setFilters({ ...filters, businessType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="detailing">Detailing Shop</SelectItem>
                          <SelectItem value="mobile">Mobile Detailing</SelectItem>
                          <SelectItem value="carwash">Car Wash</SelectItem>
                          <SelectItem value="specialty">Specialty Shop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {type === "knowledge" && (
                  <>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={filters.category}
                        onValueChange={(value) => setFilters({ ...filters, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="howto">How-To Guides</SelectItem>
                          <SelectItem value="faq">FAQs</SelectItem>
                          <SelectItem value="tips">Tips & Tricks</SelectItem>
                          <SelectItem value="products">Product Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="mt-2 space-y-2">
                        {["interior", "exterior", "paint", "ceramic", "maintenance", "diy"].map((tag) => (
                          <div key={tag} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${tag}`}
                              checked={filters.tags.includes(tag)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters({ ...filters, tags: [...filters.tags, tag] })
                                } else {
                                  setFilters({ ...filters, tags: filters.tags.filter((t) => t !== tag) })
                                }
                              }}
                            />
                            <label
                              htmlFor={`tag-${tag}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <SheetFooter className="mt-6 flex-row justify-between sm:justify-between">
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
                <SheetClose asChild>
                  <Button>Apply Filters</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {isSearching && (
        <div className="mt-4 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="mt-4 space-y-2">
          {type === "services" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((service) => (
                <Card key={service._id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{service.name}</h3>
                        <Badge variant={getBadgeVariant(service.category)}>{service.category}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                        <span className="font-semibold">${service.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {type === "businesses" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((business) => (
                <Card key={business._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{business.businessName}</h3>
                      <Badge variant="outline">{business.businessType}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{business.description}</p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {business.city}, {business.state}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {type === "knowledge" && (
            <div className="space-y-4">
              {results.map((article) => (
                <Card key={article._id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{article.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {article.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!isSearching && debouncedQuery && results.length === 0 && (
        <div className="mt-4 text-center">
          <p className="text-muted-foreground">No results found for "{debouncedQuery}"</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getBadgeVariant(category) {
  switch (category) {
    case "basic":
      return "secondary"
    case "standard":
      return "default"
    case "premium":
      return "destructive"
    case "custom":
      return "outline"
    default:
      return "default"
  }
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
}

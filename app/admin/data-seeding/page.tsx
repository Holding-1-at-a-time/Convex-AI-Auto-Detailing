"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, AlertCircle, Database, Car, SprayCanIcon as Spray, Book, RefreshCw } from "lucide-react"

export default function DataSeedingPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [seedingStatus, setSeedingStatus] = useState<{
    isLoading: boolean
    result: any | null
    error: string | null
  }>({
    isLoading: false,
    result: null,
    error: null,
  })

  // Convex mutations for seeding data
  const seedAllData = useMutation(api.dataSeed.seedAllData)
  const seedVehicleData = useMutation(api.dataSeed.seedVehicleData)
  const seedProductData = useMutation(api.dataSeed.seedProductData)
  const seedTechniqueData = useMutation(api.dataSeed.seedTechniqueData)

  // Handle seeding all data
  const handleSeedAll = async () => {
    setSeedingStatus({
      isLoading: true,
      result: null,
      error: null,
    })

    try {
      const result = await seedAllData({})
      setSeedingStatus({
        isLoading: false,
        result,
        error: null,
      })
    } catch (error) {
      setSeedingStatus({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      })
    }
  }

  // Handle seeding vehicle data
  const handleSeedVehicles = async () => {
    setSeedingStatus({
      isLoading: true,
      result: null,
      error: null,
    })

    try {
      const result = await seedVehicleData({ limit: 10 })
      setSeedingStatus({
        isLoading: false,
        result,
        error: null,
      })
    } catch (error) {
      setSeedingStatus({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      })
    }
  }

  // Handle seeding product data
  const handleSeedProducts = async () => {
    setSeedingStatus({
      isLoading: true,
      result: null,
      error: null,
    })

    try {
      const result = await seedProductData({})
      setSeedingStatus({
        isLoading: false,
        result,
        error: null,
      })
    } catch (error) {
      setSeedingStatus({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      })
    }
  }

  // Handle seeding technique data
  const handleSeedTechniques = async () => {
    setSeedingStatus({
      isLoading: true,
      result: null,
      error: null,
    })

    try {
      const result = await seedTechniqueData({})
      setSeedingStatus({
        isLoading: false,
        result,
        error: null,
      })
    } catch (error) {
      setSeedingStatus({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      })
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Data Seeding Dashboard</h1>
      <p className="text-gray-500 mb-8">
        Populate your database with real-world auto detailing data from external sources.
      </p>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="all">
            <Database className="mr-2 h-4 w-4" />
            All Data
          </TabsTrigger>
          <TabsTrigger value="vehicles">
            <Car className="mr-2 h-4 w-4" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="products">
            <Spray className="mr-2 h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="techniques">
            <Book className="mr-2 h-4 w-4" />
            Techniques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Seed All Data</CardTitle>
              <CardDescription>
                Populate your database with vehicles, products, and detailing techniques in a single operation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center p-4 border rounded-lg">
                    <Car className="h-8 w-8 mr-4 text-blue-500" />
                    <div>
                      <h3 className="font-medium">Vehicle Data</h3>
                      <p className="text-sm text-gray-500">Car makes and models</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 border rounded-lg">
                    <Spray className="h-8 w-8 mr-4 text-green-500" />
                    <div>
                      <h3 className="font-medium">Product Data</h3>
                      <p className="text-sm text-gray-500">Detailing products and supplies</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 border rounded-lg">
                    <Book className="h-8 w-8 mr-4 text-purple-500" />
                    <div>
                      <h3 className="font-medium">Technique Data</h3>
                      <p className="text-sm text-gray-500">Detailing methods and guides</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Data Sources</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Vehicle data: NHTSA Vehicle API</li>
                    <li>• Product data: Curated detailing product database</li>
                    <li>• Technique data: Professional detailing knowledge base</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSeedAll} disabled={seedingStatus.isLoading} className="w-full">
                {seedingStatus.isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Data...
                  </>
                ) : (
                  <>Seed All Data</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Seed Vehicle Data</CardTitle>
              <CardDescription>Import car makes and models from the NHTSA Vehicle API.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Data Source</h3>
                  <p className="text-sm text-gray-600">
                    Vehicle data is sourced from the National Highway Traffic Safety Administration (NHTSA) Vehicle API,
                    which provides comprehensive information about car makes and models.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Data Processing</h3>
                  <p className="text-sm text-gray-600">
                    The seeding process will fetch popular car makes and their models, clean and normalize the data, and
                    store it in your database for use in vehicle selection.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSeedVehicles} disabled={seedingStatus.isLoading} className="w-full">
                {seedingStatus.isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Vehicle Data...
                  </>
                ) : (
                  <>Seed Vehicle Data</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Seed Product Data</CardTitle>
              <CardDescription>Import detailing products, supplies, and their specifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Data Source</h3>
                  <p className="text-sm text-gray-600">
                    Product data is sourced from a curated database of auto detailing products, including
                    specifications, usage recommendations, and pricing information.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Data Processing</h3>
                  <p className="text-sm text-gray-600">
                    The seeding process will import product information, categorize products by type and use case, and
                    generate embeddings for semantic search capabilities.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSeedProducts} disabled={seedingStatus.isLoading} className="w-full">
                {seedingStatus.isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Product Data...
                  </>
                ) : (
                  <>Seed Product Data</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="techniques">
          <Card>
            <CardHeader>
              <CardTitle>Seed Technique Data</CardTitle>
              <CardDescription>Import detailing techniques, guides, and best practices.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Data Source</h3>
                  <p className="text-sm text-gray-600">
                    Technique data is sourced from professional detailing knowledge bases, including step-by-step
                    guides, difficulty ratings, and application scenarios.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Data Processing</h3>
                  <p className="text-sm text-gray-600">
                    The seeding process will import detailing techniques, categorize them by difficulty and type, and
                    store them in the knowledge base with vector embeddings for AI-powered recommendations.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSeedTechniques} disabled={seedingStatus.isLoading} className="w-full">
                {seedingStatus.isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Technique Data...
                  </>
                ) : (
                  <>Seed Technique Data</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Section */}
      {(seedingStatus.result || seedingStatus.error) && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Seeding Results</h2>

          {seedingStatus.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{seedingStatus.error}</AlertDescription>
            </Alert>
          )}

          {seedingStatus.result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {seedingStatus.result.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      Success
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      Failed
                    </>
                  )}
                </CardTitle>
                <CardDescription>{seedingStatus.result.message}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTab === "all" && seedingStatus.result.results && (
                    <>
                      {/* Vehicles Results */}
                      {seedingStatus.result.results.vehicles && (
                        <div>
                          <div className="flex items-center mb-2">
                            <Car className="h-4 w-4 mr-2 text-blue-500" />
                            <h3 className="font-medium">Vehicle Data</h3>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg text-sm">
                            <div className="flex justify-between mb-1">
                              <span>Makes:</span>
                              <span>
                                {seedingStatus.result.results.vehicles.results?.makes?.success || 0} successful,
                                {seedingStatus.result.results.vehicles.results?.makes?.failed || 0} failed
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Models:</span>
                              <span>
                                {seedingStatus.result.results.vehicles.results?.models?.success || 0} successful,
                                {seedingStatus.result.results.vehicles.results?.models?.failed || 0} failed
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Products Results */}
                      {seedingStatus.result.results.products && (
                        <div>
                          <div className="flex items-center mb-2">
                            <Spray className="h-4 w-4 mr-2 text-green-500" />
                            <h3 className="font-medium">Product Data</h3>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg text-sm">
                            <div className="flex justify-between">
                              <span>Products:</span>
                              <span>
                                {seedingStatus.result.results.products.results?.success || 0} successful,
                                {seedingStatus.result.results.products.results?.failed || 0} failed
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Techniques Results */}
                      {seedingStatus.result.results.techniques && (
                        <div>
                          <div className="flex items-center mb-2">
                            <Book className="h-4 w-4 mr-2 text-purple-500" />
                            <h3 className="font-medium">Technique Data</h3>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg text-sm">
                            <div className="flex justify-between">
                              <span>Techniques:</span>
                              <span>
                                {seedingStatus.result.results.techniques.results?.success || 0} successful,
                                {seedingStatus.result.results.techniques.results?.failed || 0} failed
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "vehicles" && seedingStatus.result.results && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between mb-1">
                        <span>Makes:</span>
                        <span>
                          {seedingStatus.result.results?.makes?.success || 0} successful,
                          {seedingStatus.result.results?.makes?.failed || 0} failed
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Models:</span>
                        <span>
                          {seedingStatus.result.results?.models?.success || 0} successful,
                          {seedingStatus.result.results?.models?.failed || 0} failed
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === "products" && seedingStatus.result.results && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span>Products:</span>
                        <span>
                          {seedingStatus.result.results?.success || 0} successful,
                          {seedingStatus.result.results?.failed || 0} failed
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="block mb-1">Processing Progress:</span>
                        <Progress
                          value={(seedingStatus.result.results?.success / seedingStatus.result.results?.total) * 100}
                        />
                        <div className="flex justify-between text-xs mt-1">
                          <span>
                            Processed: {seedingStatus.result.results?.success + seedingStatus.result.results?.failed}/
                            {seedingStatus.result.results?.total}
                          </span>
                          <span>
                            {Math.round(
                              (seedingStatus.result.results?.success / seedingStatus.result.results?.total) * 100,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "techniques" && seedingStatus.result.results && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span>Techniques:</span>
                        <span>
                          {seedingStatus.result.results?.success || 0} successful,
                          {seedingStatus.result.results?.failed || 0} failed
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="block mb-1">Processing Progress:</span>
                        <Progress
                          value={(seedingStatus.result.results?.success / seedingStatus.result.results?.total) * 100}
                        />
                        <div className="flex justify-between text-xs mt-1">
                          <span>
                            Processed: {seedingStatus.result.results?.success + seedingStatus.result.results?.failed}/
                            {seedingStatus.result.results?.total}
                          </span>
                          <span>
                            {Math.round(
                              (seedingStatus.result.results?.success / seedingStatus.result.results?.total) * 100,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Documentation Section */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Data Seeding Documentation</h2>

        <Card>
          <CardHeader>
            <CardTitle>Data Sources and Processing</CardTitle>
            <CardDescription>Information about the data sources used and how the data is processed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Vehicle Data</h3>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Source</h4>
                    <p className="text-sm text-gray-600">
                      National Highway Traffic Safety Administration (NHTSA) Vehicle API
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Transformation Steps</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Fetch car makes from NHTSA API</li>
                      <li>• Filter to popular makes for better user experience</li>
                      <li>• Fetch models for each make</li>
                      <li>• Clean and normalize model names</li>
                      <li>• Add year ranges for each model</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Product Data</h3>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Source</h4>
                    <p className="text-sm text-gray-600">
                      Curated database of auto detailing products from industry-leading manufacturers
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Transformation Steps</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Fetch product data from database</li>
                      <li>• Clean and normalize product names and descriptions</li>
                      <li>• Categorize products by type and use case</li>
                      <li>• Generate product recommendations based on vehicle types</li>
                      <li>• Create vector embeddings for semantic search capabilities</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Technique Data</h3>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Source</h4>
                    <p className="text-sm text-gray-600">
                      Professional detailing knowledge bases and expert-curated guides
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Transformation Steps</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Collect detailing techniques from professional sources</li>
                      <li>• Structure techniques with step-by-step instructions</li>
                      <li>• Categorize by difficulty level and application type</li>
                      <li>• Generate vector embeddings for AI-powered recommendations</li>
                      <li>• Link techniques to relevant products and vehicle types</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Error Handling</h3>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Strategies</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Graceful failure with detailed error logging</li>
                      <li>• Partial success handling (continue with available data)</li>
                      <li>• Retry mechanisms for transient network failures</li>
                      <li>• Data validation before insertion to maintain integrity</li>
                      <li>• Transaction-based operations to prevent partial updates</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Performance Considerations</h3>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Optimizations</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Batch processing to reduce database operations</li>
                      <li>• Parallel fetching where appropriate</li>
                      <li>• Incremental updates to avoid full reseeding</li>
                      <li>• Caching of external API responses</li>
                      <li>• Background processing for large data sets</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

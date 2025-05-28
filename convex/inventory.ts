import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Add a new product
export const addProduct = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.string(),
    price: v.optional(v.number()),
    cost: v.optional(v.number()),
    sku: v.optional(v.string()),
    supplier: v.optional(v.string()),
    recommendedFor: v.array(v.string()),
    stockQuantity: v.optional(v.number()),
    reorderThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if product with this name already exists
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first()

    if (existingProduct) {
      throw new Error("A product with this name already exists")
    }

    // Create the product
    const productId = await ctx.db.insert("products", {
      name: args.name,
      category: args.category,
      description: args.description,
      price: args.price,
      cost: args.cost,
      sku: args.sku,
      supplier: args.supplier,
      recommendedFor: args.recommendedFor,
      inStock: (args.stockQuantity || 0) > 0,
      stockQuantity: args.stockQuantity || 0,
      reorderThreshold: args.reorderThreshold || 5,
      createdAt: new Date().toISOString(),
    })

    // If initial stock is provided, create an inventory transaction
    if (args.stockQuantity && args.stockQuantity > 0) {
      await ctx.db.insert("inventoryTransactions", {
        productId,
        type: "purchase",
        quantity: args.stockQuantity,
        date: new Date().toISOString().split("T")[0],
        cost: args.cost ? args.cost * args.stockQuantity : null,
        notes: "Initial inventory",
        createdAt: new Date().toISOString(),
      })
    }

    return productId
  },
})

// Update a product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    cost: v.optional(v.number()),
    sku: v.optional(v.string()),
    supplier: v.optional(v.string()),
    recommendedFor: v.optional(v.array(v.string())),
    reorderThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { productId, ...updates } = args

    // Check if product exists
    const product = await ctx.db.get(productId)
    if (!product) {
      throw new Error("Product not found")
    }

    // If name is being updated, check for duplicates
    if (updates.name && updates.name !== product.name) {
      const existingProduct = await ctx.db
        .query("products")
        .withIndex("by_name", (q) => q.eq("name", updates.name))
        .first()

      if (existingProduct) {
        throw new Error("A product with this name already exists")
      }
    }

    // Add updatedAt timestamp
    const updatedFields = {
      ...updates,
      lastUpdated: new Date().toISOString(),
    }

    // Update the product
    await ctx.db.patch(productId, updatedFields)

    return productId
  },
})

// Get all products
export const getAllProducts = query({
  args: {
    category: v.optional(v.string()),
    inStockOnly: v.optional(v.boolean()),
    lowStockOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("products")

    // Filter by category if provided
    if (args.category) {
      query = query.withIndex("by_category", (q) => q.eq("category", args.category))
    }

    let products = await query.collect()

    // Apply additional filters
    if (args.inStockOnly) {
      products = products.filter((product) => product.inStock)
    }

    if (args.lowStockOnly) {
      products = products.filter(
        (product) =>
          product.stockQuantity !== undefined &&
          product.reorderThreshold !== undefined &&
          product.stockQuantity <= product.reorderThreshold,
      )
    }

    return products
  },
})

// Get a specific product
export const getProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error("Product not found")
    }

    // Get usage statistics
    const usageRecords = await ctx.db
      .query("productUsage")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect()

    // Get transaction history
    const transactions = await ctx.db
      .query("inventoryTransactions")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(10)

    return {
      ...product,
      usageCount: usageRecords.length,
      recentTransactions: transactions,
    }
  },
})

// Record inventory transaction
export const recordInventoryTransaction = mutation({
  args: {
    productId: v.id("products"),
    type: v.string(), // "purchase", "use", "adjustment", "return", "write-off"
    quantity: v.number(), // Positive for additions, negative for removals
    date: v.string(),
    staffId: v.optional(v.string()),
    appointmentId: v.optional(v.id("appointments")),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if product exists
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error("Product not found")
    }

    // Create the transaction
    const transactionId = await ctx.db.insert("inventoryTransactions", {
      productId: args.productId,
      type: args.type,
      quantity: args.quantity,
      date: args.date,
      staffId: args.staffId,
      appointmentId: args.appointmentId,
      cost: args.cost,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    })

    // Update product stock quantity
    const newQuantity = (product.stockQuantity || 0) + args.quantity
    await ctx.db.patch(args.productId, {
      stockQuantity: newQuantity,
      inStock: newQuantity > 0,
      lastUpdated: new Date().toISOString(),
    })

    return {
      transactionId,
      newQuantity,
    }
  },
})

// Get inventory transactions
export const getInventoryTransactions = query({
  args: {
    productId: v.optional(v.id("products")),
    type: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("inventoryTransactions")

    // Filter by product if provided
    if (args.productId) {
      query = query.withIndex("by_productId", (q) => q.eq("productId", args.productId))
    }

    // Filter by type if provided
    if (args.type) {
      query = query.withIndex("by_type", (q) => q.eq("type", args.type))
    }

    // Apply date range filter if provided
    if (args.startDate && args.endDate) {
      query = query.filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate)))
    } else if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("date"), args.startDate))
    } else if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("date"), args.endDate))
    }

    // Order by date (newest first)
    query = query.order("desc")

    // Apply limit if provided
    const transactions = await query.take(args.limit || 100)

    // Fetch product details for each transaction
    const transactionsWithDetails = await Promise.all(
      transactions.map(async (transaction) => {
        const product = await ctx.db.get(transaction.productId)

        let staffName = null
        if (transaction.staffId) {
          const staff = await ctx.db
            .query("staff")
            .filter((q) => q.eq(q.field("userId"), transaction.staffId))
            .first()

          if (staff) {
            staffName = staff.name
          }
        }

        return {
          ...transaction,
          productName: product ? product.name : "Unknown Product",
          staffName,
        }
      }),
    )

    return transactionsWithDetails
  },
})

// Get low stock products
export const getLowStockProducts = query({
  args: {
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect()

    // Filter products that are below their reorder threshold
    const lowStockProducts = products.filter((product) => {
      if (args.threshold) {
        return product.stockQuantity !== undefined && product.stockQuantity <= args.threshold
      } else {
        return (
          product.stockQuantity !== undefined &&
          product.reorderThreshold !== undefined &&
          product.stockQuantity <= product.reorderThreshold
        )
      }
    })

    // Sort by stock level (lowest first)
    lowStockProducts.sort((a, b) => {
      const aRatio = a.stockQuantity / (a.reorderThreshold || 1)
      const bRatio = b.stockQuantity / (b.reorderThreshold || 1)
      return aRatio - bRatio
    })

    return lowStockProducts
  },
})

// Add a supplier
export const addSupplier = mutation({
  args: {
    name: v.string(),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    terms: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if supplier with this name already exists
    const existingSupplier = await ctx.db
      .query("suppliers")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first()

    if (existingSupplier) {
      throw new Error("A supplier with this name already exists")
    }

    // Create the supplier
    const supplierId = await ctx.db.insert("suppliers", {
      name: args.name,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      address: args.address,
      website: args.website,
      terms: args.terms,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    })

    return supplierId
  },
})

// Get all suppliers
export const getAllSuppliers = query({
  args: {},
  handler: async (ctx, args) => {
    const suppliers = await ctx.db.query("suppliers").collect()
    return suppliers
  },
})

// Create a purchase order
export const createPurchaseOrder = mutation({
  args: {
    supplierId: v.id("suppliers"),
    orderDate: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPrice: v.number(),
      }),
    ),
    expectedDelivery: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if supplier exists
    const supplier = await ctx.db.get(args.supplierId)
    if (!supplier) {
      throw new Error("Supplier not found")
    }

    // Validate items
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId)
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`)
      }
    }

    // Calculate total amount
    const totalAmount = args.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    // Create the purchase order
    const purchaseOrderId = await ctx.db.insert("purchaseOrders", {
      supplierId: args.supplierId,
      orderDate: args.orderDate,
      status: "draft",
      items: args.items,
      totalAmount,
      expectedDelivery: args.expectedDelivery,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    })

    return purchaseOrderId
  },
})

// Update purchase order status
export const updatePurchaseOrderStatus = mutation({
  args: {
    purchaseOrderId: v.id("purchaseOrders"),
    status: v.string(), // "draft", "submitted", "received", "cancelled"
    actualDelivery: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if purchase order exists
    const purchaseOrder = await ctx.db.get(args.purchaseOrderId)
    if (!purchaseOrder) {
      throw new Error("Purchase order not found")
    }

    // Update fields
    const updates: any = {
      status: args.status,
      updatedAt: new Date().toISOString(),
    }

    if (args.actualDelivery) {
      updates.actualDelivery = args.actualDelivery
    }

    if (args.notes) {
      updates.notes = args.notes
    }

    // Update the purchase order
    await ctx.db.patch(args.purchaseOrderId, updates)

    // If status is "received", update inventory
    if (args.status === "received") {
      for (const item of purchaseOrder.items) {
        await ctx.db.insert("inventoryTransactions", {
          productId: item.productId,
          type: "purchase",
          quantity: item.quantity,
          date: args.actualDelivery || new Date().toISOString().split("T")[0],
          cost: item.quantity * item.unitPrice,
          notes: `Received from PO #${args.purchaseOrderId}`,
          createdAt: new Date().toISOString(),
        })

        // Update product stock
        const product = await ctx.db.get(item.productId)
        if (product) {
          const newQuantity = (product.stockQuantity || 0) + item.quantity
          await ctx.db.patch(item.productId, {
            stockQuantity: newQuantity,
            inStock: newQuantity > 0,
            lastUpdated: new Date().toISOString(),
          })
        }
      }
    }

    return { success: true }
  },
})

// Get purchase orders
export const getPurchaseOrders = query({
  args: {
    supplierId: v.optional(v.id("suppliers")),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("purchaseOrders")

    // Filter by supplier if provided
    if (args.supplierId) {
      query = query.withIndex("by_supplierId", (q) => q.eq("supplierId", args.supplierId))
    }

    // Filter by status if provided
    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status))
    }

    // Apply date range filter if provided
    if (args.startDate && args.endDate) {
      query = query.filter((q) =>
        q.and(q.gte(q.field("orderDate"), args.startDate), q.lte(q.field("orderDate"), args.endDate)),
      )
    } else if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("orderDate"), args.startDate))
    } else if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("orderDate"), args.endDate))
    }

    // Order by date (newest first)
    query = query.order("desc")

    const purchaseOrders = await query.collect()

    // Fetch supplier details for each purchase order
    const ordersWithDetails = await Promise.all(
      purchaseOrders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId)

        // Fetch product details for each item
        const itemsWithDetails = await Promise.all(
          order.items.map(async (item) => {
            const product = await ctx.db.get(item.productId)
            return {
              ...item,
              productName: product ? product.name : "Unknown Product",
              totalPrice: item.quantity * item.unitPrice,
            }
          }),
        )

        return {
          ...order,
          supplierName: supplier ? supplier.name : "Unknown Supplier",
          items: itemsWithDetails,
        }
      }),
    )

    return ordersWithDetails
  },
})

// Get inventory value report
export const getInventoryValueReport = query({
  args: {},
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect()

    let totalValue = 0
    let totalItems = 0
    const categories: Record<string, { count: number; value: number }> = {}

    const productsWithValue = products.map((product) => {
      const quantity = product.stockQuantity || 0
      const cost = product.cost || 0
      const value = quantity * cost

      // Update totals
      totalValue += value
      totalItems += quantity

      // Update category totals
      if (!categories[product.category]) {
        categories[product.category] = { count: 0, value: 0 }
      }
      categories[product.category].count += quantity
      categories[product.category].value += value

      return {
        ...product,
        quantity,
        value,
      }
    })

    // Sort products by value (highest first)
    productsWithValue.sort((a, b) => b.value - a.value)

    // Format category data
    const categoryBreakdown = Object.entries(categories).map(([category, data]) => ({
      category,
      itemCount: data.count,
      value: data.value,
      percentage: (data.value / totalValue) * 100,
    }))

    // Sort categories by value
    categoryBreakdown.sort((a, b) => b.value - a.value)

    return {
      totalValue,
      totalItems,
      categoryBreakdown,
      products: productsWithValue,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Get product usage report
export const getProductUsageReport = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Set default date range if not provided (last 30 days)
    const endDate = args.endDate || new Date().toISOString().split("T")[0]
    const startDate =
      args.startDate ||
      (() => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date.toISOString().split("T")[0]
      })()

    // Get all products
    let productsQuery = ctx.db.query("products")
    if (args.category) {
      productsQuery = productsQuery.withIndex("by_category", (q) => q.eq("category", args.category))
    }
    const products = await productsQuery.collect()

    // Get usage records in date range
    const usageRecords = await ctx.db
      .query("productUsage")
      .filter((q) => q.and(q.gte(q.field("date"), startDate), q.lte(q.field("date"), endDate)))
      .collect()

    // Group usage by product
    const usageByProduct: Record<string, number> = {}
    for (const record of usageRecords) {
      const productId = record.productId
      usageByProduct[productId] = (usageByProduct[productId] || 0) + (record.quantity || 1)
    }

    // Calculate usage statistics
    const productUsage = products.map((product) => {
      const usageCount = usageByProduct[product._id] || 0
      const usageValue = usageCount * (product.cost || 0)

      return {
        productId: product._id,
        name: product.name,
        category: product.category,
        usageCount,
        usageValue,
        currentStock: product.stockQuantity || 0,
      }
    })

    // Sort by usage count (highest first)
    productUsage.sort((a, b) => b.usageCount - a.usageCount)

    // Calculate totals
    const totalUsageCount = productUsage.reduce((sum, p) => sum + p.usageCount, 0)
    const totalUsageValue = productUsage.reduce((sum, p) => sum + p.usageValue, 0)

    // Group by category
    const categoryUsage: Record<string, { count: number; value: number }> = {}
    for (const product of productUsage) {
      if (!categoryUsage[product.category]) {
        categoryUsage[product.category] = { count: 0, value: 0 }
      }
      categoryUsage[product.category].count += product.usageCount
      categoryUsage[product.category].value += product.usageValue
    }

    // Format category data
    const categoryBreakdown = Object.entries(categoryUsage).map(([category, data]) => ({
      category,
      usageCount: data.count,
      usageValue: data.value,
      percentage: totalUsageCount > 0 ? (data.count / totalUsageCount) * 100 : 0,
    }))

    // Sort categories by usage
    categoryBreakdown.sort((a, b) => b.usageCount - a.usageCount)

    return {
      startDate,
      endDate,
      totalUsageCount,
      totalUsageValue,
      categoryBreakdown,
      products: productUsage,
      generatedAt: new Date().toISOString(),
    }
  },
})

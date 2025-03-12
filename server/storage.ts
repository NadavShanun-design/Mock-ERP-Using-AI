import createMemoryStore from "memorystore";
import session from "express-session";
import {
  Product,
  InsertProduct,
  Location,
  InsertLocation,
  Inventory,
  InsertInventory,
  InventoryMovement,
  InsertInventoryMovement,
  User,
  InsertUser,
} from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export class MemStorage {
  products: Map<number, Product>;
  locations: Map<number, Location>;
  inventory: Map<number, Inventory>;
  inventoryMovements: Map<number, InventoryMovement>;
  users: Map<number, User>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.products = new Map();
    this.locations = new Map();
    this.inventory = new Map();
    this.inventoryMovements = new Map();
    this.users = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize default warehouse
    this.createLocation({
      name: "Main Warehouse",
      address: "123 Main St",
      type: "warehouse",
      isActive: true,
      capacity: 1000,
    });
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(data: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Product Management
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const now = new Date();

    const product: Product = {
      ...data,
      id,
      price: typeof data.price === 'string' ? data.price : data.price.toString(),
      createdAt: now,
      updatedAt: now,
      description: data.description || null,
      category: data.category || null,
      brand: data.brand || null,
      unit: data.unit || "piece",
      dimensions: data.dimensions || {},
      reorderPoint: data.reorderPoint || 10,
      maximumStock: data.maximumStock || null,
      minimumStock: data.minimumStock || null,
    };

    this.products.set(id, product);

    // Initialize inventory if initial quantity provided
    if (data.initialQuantity && data.initialQuantity > 0) {
      const defaultLocation = Array.from(this.locations.values())[0];
      if (defaultLocation) {
        await this.createInventory({
          productId: id,
          locationId: defaultLocation.id,
          quantity: data.initialQuantity,
          reservedQuantity: 0,
          batchNumber: null,
          expiryDate: null
        });
      }
    }

    return product;
  }

  // Location Management
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(data: InsertLocation): Promise<Location> {
    const id = this.currentId++;
    const location = { ...data, id };
    this.locations.set(id, location);
    return location;
  }

  // Inventory Management
  async getAllInventory(): Promise<Inventory[]> {
    return Array.from(this.inventory.values());
  }

  async getInventory(productId: number, locationId: number): Promise<Inventory | undefined> {
    return Array.from(this.inventory.values()).find(
      inv => inv.productId === productId && inv.locationId === locationId
    );
  }

  async createInventory(data: InsertInventory): Promise<Inventory> {
    const id = this.currentId++;
    const inventory: Inventory = {
      ...data,
      id,
      lastUpdated: new Date(),
      batchNumber: data.batchNumber || null,
      expiryDate: data.expiryDate || null,
      reservedQuantity: data.reservedQuantity || 0,
    };
    this.inventory.set(id, inventory);
    return inventory;
  }

  async updateInventory(
    productId: number,
    locationId: number,
    quantity: number,
    options: {
      batchNumber?: string;
      expiryDate?: Date;
    } = {}
  ): Promise<void> {
    const existingInventory = await this.getInventory(productId, locationId);

    if (existingInventory) {
      const newQuantity = Math.max(0, existingInventory.quantity + quantity);
      const updatedInventory = {
        ...existingInventory,
        quantity: newQuantity,
        lastUpdated: new Date(),
        ...options,
      };
      this.inventory.set(existingInventory.id, updatedInventory);
    } else if (quantity > 0) {
      await this.createInventory({
        productId,
        locationId,
        quantity,
        batchNumber: options.batchNumber,
        expiryDate: options.expiryDate,
        reservedQuantity: 0,
      });
    }
  }

  async createInventoryMovement(data: InsertInventoryMovement): Promise<InventoryMovement> {
    const id = this.currentId++;
    const movement: InventoryMovement = {
      ...data,
      id,
      timestamp: new Date(),
    };

    // Update inventory levels
    if (data.fromLocationId) {
      await this.updateInventory(data.productId, data.fromLocationId, -data.quantity, {
        batchNumber: data.batchNumber
      });
    }
    if (data.toLocationId) {
      await this.updateInventory(data.productId, data.toLocationId, data.quantity, {
        batchNumber: data.batchNumber
      });
    }

    this.inventoryMovements.set(id, movement);
    return movement;
  }

  private calculateInventoryTurnover(): number {
    const inventory = Array.from(this.inventory.values());
    const products = Array.from(this.products.values());

    if (inventory.length === 0 || products.length === 0) return 0;

    // Calculate average inventory value
    const averageInventoryValue = inventory.reduce((sum, inv) => {
      const product = this.products.get(inv.productId);
      if (!product) return sum;
      return sum + (parseFloat(product.price.toString()) * inv.quantity);
    }, 0) / 2;

    // For demo purposes, assume cost of goods sold is 70% of inventory value
    const costOfGoodsSold = averageInventoryValue * 0.7;

    return averageInventoryValue === 0 ? 0 : Number((costOfGoodsSold / averageInventoryValue).toFixed(2));
  }

  private calculateStockoutRisk(): number {
    const inventory = Array.from(this.inventory.values());
    const products = Array.from(this.products.values());

    if (inventory.length === 0) return 0;

    let totalRisk = 0;
    let itemsWithRisk = 0;

    for (const product of products) {
      const productInventory = inventory.filter(inv => inv.productId === product.id);
      const totalStock = productInventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const reorderPoint = product.reorderPoint || 10;

      if (totalStock <= reorderPoint) {
        // Calculate risk based on current stock level vs reorder point
        const risk = ((reorderPoint - totalStock) / reorderPoint) * 100;
        totalRisk += risk;
        itemsWithRisk++;
      }
    }

    return itemsWithRisk === 0 ? 0 : Number((totalRisk / itemsWithRisk).toFixed(1));
  }

  private analyzeSeasonalTrends(): any {
    const currentDate = new Date();
    const month = currentDate.getMonth();

    // Define seasonal periods and their impact factors
    const seasonalPeriods = {
      holiday: {
        months: [10, 11], // November, December
        demand: 1.5,
        message: "🎄 Prepare for holiday season surge"
      },
      summer: {
        months: [5, 6, 7], // June, July, August
        demand: 1.2,
        message: "☀️ Summer season approaching"
      },
      backToSchool: {
        months: [7, 8], // August, September
        demand: 1.3,
        message: "📚 Back to school season"
      },
      spring: {
        months: [2, 3, 4], // March, April, May
        demand: 1.1,
        message: "🌸 Spring season preparation"
      }
    };

    // Get current and upcoming seasonal trends
    const trends = [];
    for (const [season, data] of Object.entries(seasonalPeriods)) {
      if (data.months.includes(month) || data.months.includes((month + 1) % 12)) {
        trends.push({
          season,
          impact: data.demand,
          message: data.message,
          timeframe: data.months.includes(month) ? "current" : "upcoming"
        });
      }
    }

    return {
      trends,
      recommendations: trends.map(t => ({
        message: t.message,
        adjustment: `Adjust inventory levels by ${((t.impact - 1) * 100).toFixed(0)}%`
      }))
    };
  }

  async getDashboardStats() {
    const products = await this.getAllProducts();
    const inventory = await this.getAllInventory();

    let totalValue = 0;
    let lowStockProducts = 0;
    let expiringProducts = 0;

    // Create a map for quick product lookups
    const productMap = new Map(products.map(p => [p.id, p]));

    // Create a map to aggregate inventory by product
    const productInventoryMap = new Map<number, {
      totalQuantity: number;
      hasExpired: boolean;
      isLowStock: boolean;
      value: number
    }>();

    // Process all inventory records
    for (const inv of inventory) {
      const product = productMap.get(inv.productId);
      if (!product) continue;

      const availableQuantity = inv.quantity - (inv.reservedQuantity || 0);
      const price = parseFloat(product.price.toString());

      // Get or initialize product inventory stats
      let productStats = productInventoryMap.get(inv.productId);
      if (!productStats) {
        productStats = {
          totalQuantity: 0,
          hasExpired: false,
          isLowStock: false,
          value: 0
        };
        productInventoryMap.set(inv.productId, productStats);
      }

      // Update product stats
      productStats.totalQuantity += availableQuantity;
      productStats.value += price * availableQuantity;

      // Check expiry
      if (inv.expiryDate && new Date(inv.expiryDate) <= new Date()) {
        productStats.hasExpired = true;
      }

      // Check low stock against reorder point
      const reorderPoint = product.reorderPoint || 10;
      if (productStats.totalQuantity <= reorderPoint) {
        productStats.isLowStock = true;
      }
    }

    // Calculate totals
    for (const stats of productInventoryMap.values()) {
      totalValue += stats.value;
      if (stats.isLowStock) lowStockProducts++;
      if (stats.hasExpired) expiringProducts++;
    }

    return {
      totalProducts: products.length,
      lowStockProducts,
      expiringProducts,
      totalInventoryValue: Number(totalValue.toFixed(2)),
      // Advanced analytics
      inventoryTurnover: this.calculateInventoryTurnover(),
      stockoutRisk: this.calculateStockoutRisk(),
      seasonalTrends: this.analyzeSeasonalTrends(),
    };
  }
}

export const storage = new MemStorage();
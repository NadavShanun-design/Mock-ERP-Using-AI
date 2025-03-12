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

  async getDashboardStats() {
    const products = await this.getAllProducts();
    const inventory = await this.getAllInventory();

    let totalValue = 0;
    const lowStockProducts = new Set<number>();
    const expiringProducts = new Set<number>();

    for (const inv of inventory) {
      const product = this.products.get(inv.productId);
      if (product) {
        const availableQuantity = inv.quantity - (inv.reservedQuantity || 0);
        totalValue += Number(product.price) * availableQuantity;

        if (availableQuantity <= (product.reorderPoint || 10)) {
          lowStockProducts.add(product.id);
        }

        if (inv.expiryDate && new Date(inv.expiryDate) <= new Date()) {
          expiringProducts.add(product.id);
        }
      }
    }

    return {
      totalProducts: products.length,
      lowStockProducts: lowStockProducts.size,
      expiringProducts: expiringProducts.size,
      totalInventoryValue: totalValue,
    };
  }
}

export const storage = new MemStorage();
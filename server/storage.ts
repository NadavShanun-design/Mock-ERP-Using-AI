import { IStorage } from "./storage";
import createMemoryStore from "memorystore";
import session from "express-session";
import {
  InsertProduct,
  Product,
  InsertOrder,
  Order,
  User,
  InsertUser,
  Location,
  InsertLocation,
  ProductInventory,
  InsertProductInventory,
  InventoryMovement,
  InsertInventoryMovement
} from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private locations: Map<number, Location>;
  private productInventory: Map<number, ProductInventory>;
  private inventoryMovements: Map<number, InventoryMovement>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.locations = new Map();
    this.productInventory = new Map();
    this.inventoryMovements = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize default warehouse location
    this.createLocation({
      name: "Main Warehouse",
      address: "123 Main St",
      type: "warehouse",
      isActive: true
    });
  }

  // Location Management
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const id = this.currentId++;
    const newLocation = { ...location, id };
    this.locations.set(id, newLocation);
    return newLocation;
  }

  // Enhanced Product Management
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const now = new Date();
    const newProduct = {
      ...product,
      id,
      price: product.price.toString(),
      dimensions: product.dimensions || {},
      createdAt: now,
      updatedAt: now,
      description: product.description || null
    };
    this.products.set(id, newProduct);

    // Initialize inventory in default location with the specified quantity
    const defaultLocation = Array.from(this.locations.values())[0];
    if (defaultLocation) {
      await this.createProductInventory({
        productId: id,
        locationId: defaultLocation.id,
        quantity: product.quantity || 0,
        reservedQuantity: 0,
      });
    }

    return newProduct;
  }

  // Inventory Management
  async getProductInventory(productId: number, locationId: number): Promise<ProductInventory | undefined> {
    return Array.from(this.productInventory.values()).find(
      inv => inv.productId === productId && inv.locationId === locationId
    );
  }

  async createProductInventory(inventory: InsertProductInventory): Promise<ProductInventory> {
    const id = this.currentId++;
    const newInventory = {
      ...inventory,
      id,
      lastUpdated: new Date(),
      batchNumber: inventory.batchNumber || null,
      expiryDate: inventory.expiryDate || null
    };
    this.productInventory.set(id, newInventory);
    return newInventory;
  }

  async updateProductInventory(
    productId: number,
    locationId: number,
    quantity: number,
    type: string,
    userId: number
  ): Promise<void> {
    const inventory = await this.getProductInventory(productId, locationId);
    if (!inventory) {
      throw new Error("Inventory not found");
    }

    // Create inventory movement record
    const movement: InsertInventoryMovement = {
      productId,
      toLocationId: locationId,
      quantity,
      type,
      userId,
    };
    await this.createInventoryMovement(movement);

    // Update inventory
    const updatedInventory = {
      ...inventory,
      quantity: inventory.quantity + quantity,
      lastUpdated: new Date()
    };
    this.productInventory.set(inventory.id, updatedInventory);
  }

  async createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
    const id = this.currentId++;
    const newMovement = {
      ...movement,
      id,
      timestamp: new Date(),
      reference: movement.reference || null,
      reason: movement.reason || null,
      fromLocationId: movement.fromLocationId || null
    };
    this.inventoryMovements.set(id, newMovement);
    return newMovement;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id, role: "user" };
    this.users.set(id, user);
    return user;
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentId++;
    const newOrder = { ...order, id, createdAt: new Date() };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async getDashboardStats() {
    const products = await this.getAllProducts();
    const orders = await this.getAllOrders();
    const inventory = Array.from(this.productInventory.values());

    const lowStockProducts = inventory.filter(inv => {
      const product = this.products.get(inv.productId);
      return product && inv.quantity <= (product.minimumStock || 10);
    });

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      lowStockProducts: lowStockProducts.length,
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.total), 0),
      inventoryValue: inventory.reduce((sum, inv) => {
        const product = this.products.get(inv.productId);
        return sum + (product ? Number(product.price) * inv.quantity : 0);
      }, 0)
    };
  }
}

export const storage = new MemStorage();
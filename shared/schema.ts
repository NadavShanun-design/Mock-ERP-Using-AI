import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Warehouse Locations schema
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull().default("warehouse"), // warehouse, store, distribution_center
  isActive: boolean("is_active").notNull().default(true),
});

// Enhanced Product schema with multi-location support
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  price: decimal("price").notNull(),
  category: text("category"),
  brand: text("brand"),
  unit: text("unit").notNull().default("piece"), // piece, kg, liter, etc.
  dimensions: json("dimensions").notNull().default({}), // {length, width, height, weight}
  reorderPoint: integer("reorder_point").notNull().default(10),
  maximumStock: integer("maximum_stock"),
  minimumStock: integer("minimum_stock"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Inventory by Location
export const productInventory = pgTable("product_inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  locationId: integer("location_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Inventory Movements
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  fromLocationId: integer("from_location_id"),
  toLocationId: integer("to_location_id"),
  quantity: integer("quantity").notNull(),
  type: text("type").notNull(), // transfer, adjustment, receipt, shipment
  reference: text("reference"), // PO number, SO number, batch number
  reason: text("reason"),
  expiryDate: timestamp("expiry_date"),
  timestamp: timestamp("timestamp").defaultNow(),
  userId: integer("user_id").notNull(),
});

// Export the insert schemas
export const insertLocationSchema = createInsertSchema(locations);
export const insertProductSchema = createInsertSchema(products, {
  price: z.string().or(z.number()).transform(val =>
    typeof val === 'string' ? parseFloat(val) : val
  ),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    weight: z.number().optional(),
  }).optional().default({}),
}).omit({ createdAt: true, updatedAt: true });

export const insertProductInventorySchema = createInsertSchema(productInventory, {
  quantity: z.number().or(z.string()).transform(val =>
    typeof val === 'string' ? parseInt(val) : val
  ),
}).omit({ lastUpdated: true });

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).extend({
  productId: z.number(),
  fromLocationId: z.number().optional(),
  toLocationId: z.number().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  type: z.string(),
  reference: z.string().optional(),
  expiryDate: z.string().optional(),
  userId: z.number().optional() // This will be set by the server
}).omit({ 
  id: true,
  timestamp: true 
});

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
});

// Product schema (original remains largely unchanged, but the above `products` table is the enhanced version)


// Order schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  status: text("status").notNull().default("pending"),
  total: decimal("total").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price").notNull(),
});

// Schema for inserting users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Schema for inserting products (original remains largely unchanged, but the above `insertProductSchema` is the enhanced version)


// Schema for inserting orders
export const insertOrderSchema = createInsertSchema(orders).pick({
  customerId: true,
  status: true,
  total: true,
});

// Schema for inserting order items
export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  productId: true,
  quantity: true,
  price: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type ProductInventory = typeof productInventory.$inferSelect;
export type InsertProductInventory = z.infer<typeof insertProductInventorySchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
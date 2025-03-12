import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Products table - core product information only
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  price: decimal("price").notNull(),
  category: text("category"),
  brand: text("brand"),
  unit: text("unit").notNull().default("piece"),
  dimensions: json("dimensions").notNull().default({}),
  reorderPoint: integer("reorder_point").notNull().default(10),
  maximumStock: integer("maximum_stock"),
  minimumStock: integer("minimum_stock"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Inventory table - tracks stock levels per location
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  locationId: integer("location_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Inventory Movement History
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  fromLocationId: integer("from_location_id"),
  toLocationId: integer("to_location_id"),
  quantity: integer("quantity").notNull(),
  type: text("type").notNull(),
  reference: text("reference"),
  timestamp: timestamp("timestamp").defaultNow(),
  userId: integer("user_id"),
});

// Schema for product creation/update
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
  quantity: z.number().min(0).optional(), // For initial stock setup
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for location operations
export const insertLocationSchema = createInsertSchema(locations);

// Schema for inventory operations
export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  lastUpdated: true,
});

// Schema for inventory movements
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).extend({
  quantity: z.number().min(1, "Quantity must be at least 1"),
}).omit({
  id: true,
  timestamp: true,
});

// Export types
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
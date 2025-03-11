import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertProductSchema,
  insertOrderSchema,
  insertLocationSchema,
  insertInventoryMovementSchema,
  insertProductInventorySchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Location Management API
  app.get("/api/locations", async (req, res) => {
    const locations = await storage.getAllLocations();
    res.json(locations);
  });

  app.post("/api/locations", async (req, res) => {
    const location = insertLocationSchema.parse(req.body);
    const newLocation = await storage.createLocation(location);
    res.status(201).json(newLocation);
  });

  // Enhanced Product API with inventory tracking
  app.get("/api/products", async (req, res) => {
    const products = await storage.getAllProducts();
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    const product = insertProductSchema.parse(req.body);
    const newProduct = await storage.createProduct(product);
    res.status(201).json(newProduct);
  });

  // Inventory Management API
  app.get("/api/inventory", async (req, res) => {
    const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;

    const inventory = Array.from(storage.productInventory.values()).filter(inv => {
      if (productId && inv.productId !== productId) return false;
      if (locationId && inv.locationId !== locationId) return false;
      return true;
    });

    res.json(inventory);
  });

  app.post("/api/inventory", async (req, res) => {
    const inventory = insertProductInventorySchema.parse(req.body);
    const newInventory = await storage.createProductInventory(inventory);
    res.status(201).json(newInventory);
  });

  app.post("/api/inventory/transfer", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const movement = insertInventoryMovementSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      // Validate the transfer
      if (!movement.fromLocationId && !movement.toLocationId) {
        return res.status(400).json({ message: "Must specify at least one location" });
      }

      // Handle inventory decrease at source location
      if (movement.fromLocationId) {
        await storage.updateProductInventory(
          movement.productId,
          movement.fromLocationId,
          -movement.quantity,
          "transfer_out",
          req.user.id
        );
      }

      // Handle inventory increase at destination location
      if (movement.toLocationId) {
        await storage.updateProductInventory(
          movement.productId,
          movement.toLocationId,
          movement.quantity,
          "transfer_in",
          req.user.id
        );
      }

      res.status(200).json({ message: "Inventory transferred successfully" });
    } catch (error) {
      console.error("Transfer error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to transfer inventory" 
      });
    }
  });

  // Orders API
  app.get("/api/orders", async (req, res) => {
    const orders = await storage.getAllOrders();
    res.json(orders);
  });

  app.post("/api/orders", async (req, res) => {
    const order = insertOrderSchema.parse(req.body);
    const newOrder = await storage.createOrder(order);
    res.status(201).json(newOrder);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrder(parseInt(req.params.id));
    if (!order) return res.status(404).send("Order not found");
    res.json(order);
  });

  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  const httpServer = createServer(app);
  return httpServer;
}
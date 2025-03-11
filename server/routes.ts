import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertProductSchema,
  insertOrderSchema,
  insertLocationSchema,
  insertInventoryMovementSchema
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

  app.get("/api/locations/:id", async (req, res) => {
    const location = await storage.getLocation(parseInt(req.params.id));
    if (!location) return res.status(404).send("Location not found");
    res.json(location);
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

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.status(404).send("Product not found");
    res.json(product);
  });

  // Inventory Movement API
  app.post("/api/inventory/transfer", async (req, res) => {
    const movement = insertInventoryMovementSchema.parse(req.body);
    if (!req.user) return res.status(401).send("Unauthorized");

    try {
      await storage.updateProductInventory(
        movement.productId,
        movement.toLocationId!,
        movement.quantity,
        movement.type,
        req.user.id
      );
      res.status(200).json({ message: "Inventory updated successfully" });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message }); //Improved error handling
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
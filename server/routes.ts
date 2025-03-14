import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertProductSchema,
  insertLocationSchema,
  insertInventorySchema,
  insertInventoryMovementSchema,
} from "@shared/schema";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Location Management API
  app.get("/api/locations", async (req, res) => {
    const locations = await storage.getAllLocations();
    res.json(locations);
  });

  app.post("/api/locations", async (req, res) => {
    try {
      const location = insertLocationSchema.parse(req.body);
      const newLocation = await storage.createLocation(location);
      res.status(201).json(newLocation);
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Failed to create location"
      });
    }
  });

  // Enhanced Product API with inventory tracking
  app.get("/api/products", async (req, res) => {
    const products = await storage.getAllProducts();
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    try {
      const product = insertProductSchema.parse(req.body);
      const newProduct = await storage.createProduct(product);
      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Failed to create product"
      });
    }
  });

  // Inventory Management API
  app.get("/api/inventory", async (req, res) => {
    const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;

    const inventory = Array.from(storage.inventory.values()).filter(inv => {
      if (productId && inv.productId !== productId) return false;
      if (locationId && inv.locationId !== locationId) return false;
      return true;
    });

    res.json(inventory);
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const inventory = insertInventorySchema.parse(req.body);
      const newInventory = await storage.createInventory(inventory);
      res.status(201).json(newInventory);
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Failed to create inventory"
      });
    }
  });

  app.post("/api/inventory/transfer", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const movement = insertInventoryMovementSchema.parse({
        ...req.body,
        userId: req.user.id,
        type: "transfer"
      });

      // Validate the transfer
      if (!movement.fromLocationId && !movement.toLocationId) {
        return res.status(400).json({ message: "Must specify at least one location" });
      }

      // Check if source location has enough stock
      if (movement.fromLocationId) {
        const sourceInventory = await storage.getInventory(movement.productId, movement.fromLocationId);
        if (!sourceInventory || sourceInventory.quantity < movement.quantity) {
          return res.status(400).json({ message: "Insufficient stock at source location" });
        }
      }

      const newMovement = await storage.createInventoryMovement(movement);
      res.status(200).json({ 
        message: "Inventory transferred successfully", 
        movement: newMovement,
        inventory: await storage.getInventory(movement.productId, movement.fromLocationId || movement.toLocationId!)
      });
    } catch (error) {
      console.error("Transfer error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to transfer inventory" 
      });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  app.post("/api/consultant/advice", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { query } = req.body;

      // Gather comprehensive business context
      const stats = await storage.getDashboardStats();
      const orders = await storage.getAllOrders();
      const locations = await storage.getAllLocations();
      const inventory = Array.from(storage.inventory.values());

      const businessContext = {
        stats,
        locations: locations.map(loc => ({
          name: loc.name,
          type: loc.type,
          capacity: loc.capacity
        })),
        inventoryStatus: inventory.map(inv => ({
          quantity: inv.quantity,
          location: locations.find(l => l.id === inv.locationId)?.name,
          reserved: inv.reservedQuantity
        })),
        recentOrders: orders?.slice(0, 5).map(order => ({
          status: order.status,
          items: order.items,
          created: order.createdAt
        }))
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an AI inventory management consultant with expertise in:
- Lean Six Sigma principles
- Supply chain optimization
- Inventory forecasting
- Seasonal trend analysis
- Multi-location inventory management
- Order fulfillment optimization

Analyze the business context and provide specific, actionable advice tailored to their current situation.
Include specific metrics and references to their data when relevant.`
          },
          {
            role: "user",
            content: `Business Context: ${JSON.stringify(businessContext)}\n\nUser Query: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      res.json({ advice: completion.choices[0].message.content });
    } catch (error) {
      console.error("OpenAI API error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get AI advice" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Products API
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

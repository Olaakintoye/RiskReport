import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertBankSchema, 
  insertCdProductSchema, 
  insertInvestmentSchema, 
  insertTransactionSchema,
  insertNotificationSchema,
  insertUserPreferencesSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { addMonths } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // Handle Zod validation errors
  const validateRequest = (schema: any, body: any) => {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        throw new Error(validationError.message);
      }
      throw error;
    }
  };

  // User routes
  apiRouter.post("/users", async (req: Request, res: Response) => {
    try {
      const userData = validateRequest(insertUserSchema, req.body);
      const user = await storage.createUser(userData);
      
      // Create default preferences for the new user
      await storage.createUserPreferences({
        userId: user.id,
        darkMode: false,
        pushNotifications: true,
        emailNotifications: true,
        maturityPreference: 'notify'
      });
      
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.get("/users/:id", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  });

  // Bank routes
  apiRouter.get("/banks", async (_req: Request, res: Response) => {
    const banks = await storage.getAllBanks();
    res.json(banks);
  });

  apiRouter.get("/banks/:id", async (req: Request, res: Response) => {
    const bankId = parseInt(req.params.id);
    if (isNaN(bankId)) {
      return res.status(400).json({ message: "Invalid bank ID" });
    }
    
    const bank = await storage.getBank(bankId);
    if (!bank) {
      return res.status(404).json({ message: "Bank not found" });
    }
    
    res.json(bank);
  });

  // CD Product routes
  apiRouter.get("/cd-products", async (_req: Request, res: Response) => {
    const products = await storage.getAllCdProducts();
    res.json(products);
  });

  apiRouter.get("/cd-products/featured", async (_req: Request, res: Response) => {
    const featuredProduct = await storage.getFeaturedCdProduct();
    if (!featuredProduct) {
      return res.status(404).json({ message: "No featured CD product found" });
    }
    
    // Get the bank details for the featured product
    const bank = await storage.getBank(featuredProduct.bankId);
    
    res.json({ ...featuredProduct, bank });
  });

  apiRouter.get("/cd-products/top", async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 3;
    const topProducts = await storage.getTopCdProducts(limit);
    
    // Get bank details for each product
    const productsWithBanks = await Promise.all(
      topProducts.map(async (product) => {
        const bank = await storage.getBank(product.bankId);
        return { ...product, bank };
      })
    );
    
    res.json(productsWithBanks);
  });

  apiRouter.get("/cd-products/:id", async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    
    const product = await storage.getCdProduct(productId);
    if (!product) {
      return res.status(404).json({ message: "CD product not found" });
    }
    
    // Get the bank details
    const bank = await storage.getBank(product.bankId);
    
    res.json({ ...product, bank });
  });

  // Investment routes
  apiRouter.get("/users/:userId/investments", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const investments = await storage.getInvestmentsByUser(userId);
    
    // Get CD product and bank details for each investment
    const investmentsWithDetails = await Promise.all(
      investments.map(async (investment) => {
        const cdProduct = await storage.getCdProduct(investment.cdProductId);
        const bank = cdProduct ? await storage.getBank(cdProduct.bankId) : null;
        
        return {
          ...investment,
          cdProduct,
          bank
        };
      })
    );
    
    res.json(investmentsWithDetails);
  });

  apiRouter.get("/users/:userId/active-investments", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const investments = await storage.getActiveInvestmentsByUser(userId);
    
    // Get CD product and bank details for each investment
    const investmentsWithDetails = await Promise.all(
      investments.map(async (investment) => {
        const cdProduct = await storage.getCdProduct(investment.cdProductId);
        const bank = cdProduct ? await storage.getBank(cdProduct.bankId) : null;
        
        return {
          ...investment,
          cdProduct,
          bank
        };
      })
    );
    
    res.json(investmentsWithDetails);
  });

  apiRouter.post("/users/:userId/investments", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    try {
      // Validate the request body
      const { cdProductId, amount } = req.body;
      
      if (!cdProductId || !amount) {
        return res.status(400).json({ message: "CD Product ID and amount are required" });
      }
      
      // Get the CD product to determine term length for maturity calculation
      const cdProduct = await storage.getCdProduct(cdProductId);
      if (!cdProduct) {
        return res.status(404).json({ message: "CD product not found" });
      }
      
      // Calculate maturity date
      const startDate = new Date();
      const maturityDate = addMonths(startDate, cdProduct.termMonths);
      
      // Create the investment
      const investment = await storage.createInvestment({
        userId,
        cdProductId,
        amount,
        startDate,
        maturityDate
      });
      
      // Record the transaction
      await storage.createTransaction({
        userId,
        type: 'deposit',
        amount,
        description: `Initial deposit for ${cdProduct.name}`,
        relatedInvestmentId: investment.id
      });
      
      // Get the bank details
      const bank = await storage.getBank(cdProduct.bankId);
      
      res.status(201).json({
        ...investment,
        cdProduct,
        bank
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Transaction routes
  apiRouter.get("/users/:userId/transactions", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const transactions = await storage.getAllTransactionsByUser(userId);
    res.json(transactions);
  });

  // Notification routes
  apiRouter.get("/users/:userId/notifications", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const notifications = await storage.getNotificationsByUser(userId);
    res.json(notifications);
  });

  apiRouter.get("/users/:userId/unread-notifications", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const notifications = await storage.getUnreadNotificationsByUser(userId);
    res.json(notifications);
  });

  apiRouter.post("/notifications/:id/read", async (req: Request, res: Response) => {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    
    const notification = await storage.markNotificationAsRead(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.json(notification);
  });

  // User Preferences routes
  apiRouter.get("/users/:userId/preferences", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const preferences = await storage.getUserPreferences(userId);
    if (!preferences) {
      return res.status(404).json({ message: "User preferences not found" });
    }
    
    res.json(preferences);
  });

  apiRouter.patch("/users/:userId/preferences", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    try {
      const updates = req.body;
      const updatedPreferences = await storage.updateUserPreferences(userId, updates);
      
      if (!updatedPreferences) {
        return res.status(404).json({ message: "User preferences not found" });
      }
      
      res.json(updatedPreferences);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Portfolio summary route
  apiRouter.get("/users/:userId/portfolio-summary", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const summary = await storage.getUserPortfolioSummary(userId);
    res.json(summary);
  });

  // For demo purposes, add a route to get current user
  apiRouter.get("/current-user", async (_req: Request, res: Response) => {
    // Always return the first user (Alex) for the demo
    const user = await storage.getUser(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  });

  const httpServer = createServer(app);
  return httpServer;
}

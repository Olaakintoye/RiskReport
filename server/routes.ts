import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
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
import { setupAuth } from "./auth";
import { log } from "./vite";
const stressTestRouter = require("./api/stress-test-api");

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for all routes
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:19006', 'http://localhost:8081'],
    credentials: true
  }));
  
  // Setup Authentication
  setupAuth(app);
  log("Authentication routes registered", "express");
  
  // API Routes
  const apiRouter = express.Router();
  app.use("/api", apiRouter);
  
  // Stress Test API Routes
  app.use("/api/stress-test", stressTestRouter);

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

  // VaR Analysis endpoints (added to fix network error)
  apiRouter.post("/run-var", async (req: Request, res: Response) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      
      const params = req.body;
      console.log('Received VaR parameters:', params);
      
      // Extract parameters with default values for missing ones
      const confidenceLevel = params.confidenceLevels || params.confidenceLevel || '0.95'; 
      const timeHorizon = params.timeHorizon || 1;
      const numSimulations = params.numSimulations || 10000;
      const contractSize = params.contractSize || 50;
      const numContracts = params.numContracts || 10;
      const lookbackPeriod = params.lookbackPeriod || 5;
      const varMethod = params.varMethod || 'monte-carlo';
      
      console.log('Running VaR analysis with validated params:', {
        confidenceLevel,
        timeHorizon,
        numSimulations,
        contractSize,
        numContracts,
        lookbackPeriod,
        varMethod
      });
      
      // Path to Python script
      const pythonScript = path.join(__dirname, 'var_analysis.py');
      
      // Output file for the chart - make unique for each method
      const methodPrefix = varMethod.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const outputFile = `${methodPrefix}_var_${Date.now()}.png`;
      
      // Command-line arguments for the Python script, ensuring all are strings
      const args = [
        '--confidence', String(confidenceLevel),
        '--horizon', String(timeHorizon),
        '--simulations', String(numSimulations),
        '--contract-size', String(contractSize),
        '--contracts', String(numContracts),
        '--output', outputFile,
        '--method', varMethod,
        '--lookback', String(lookbackPeriod)
      ];
      
      console.log(`Using ${lookbackPeriod} years of historical data for VaR calculation`);
      
      // Use Python from virtual environment
      const pythonPath = path.join(__dirname, '..', 'var_env', 'bin', 'python');
      console.log('Full Python command:', `${pythonPath} ${pythonScript} ${args.join(' ')}`);
      
      // Spawn Python process with 60 second timeout
      const python = spawn(pythonPath, [pythonScript, ...args]);
      
      let dataString = '';
      let errorString = '';
      
      // Set timeout for Python process
      const timeout = setTimeout(() => {
        python.kill('SIGTERM');
        console.error('Python process timed out after 60 seconds');
        if (!res.headersSent) {
          res.status(408).json({ 
            error: 'VaR analysis timed out', 
            details: 'Python process exceeded 60 second limit' 
          });
        }
      }, 60000);
      
             // Collect data from script
       python.stdout.on('data', function (data: any) {
         dataString += data.toString();
         console.log('Python stdout:', data.toString());
       });
       
       // Collect error data from script
       python.stderr.on('data', function (data: any) {
         errorString += data.toString();
         console.error('Python stderr:', data.toString());
       });
       
       // Handle script completion
       python.on('close', (code: number) => {
        clearTimeout(timeout);
        
        // Check if response already sent
        if (res.headersSent) {
          return;
        }
        
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error(`Error: ${errorString}`);
          return res.status(500).json({ 
            error: 'Error running VaR analysis', 
            details: errorString 
          });
        }
        
        try {
          // Check if image was generated
          const outputFilePath = path.join(__dirname, outputFile);
          const imageUrl = `/${outputFile}`;
          
          // Ensure public directory exists
          const publicDir = path.join(__dirname, 'public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          
          // Copy to public folder if it exists
          if (fs.existsSync(outputFilePath)) {
            const destPath = path.join(publicDir, outputFile);
            fs.copyFileSync(outputFilePath, destPath);
            fs.unlinkSync(outputFilePath); // Remove original
          }
          
          // Check for JSON output
          const jsonOutputFile = outputFile.replace('.png', '.json');
          const jsonOutputPath = path.join(__dirname, jsonOutputFile);
          
          if (fs.existsSync(jsonOutputPath)) {
            // Read the JSON data
            const jsonData = fs.readFileSync(jsonOutputPath, 'utf8');
            const results = JSON.parse(jsonData);
            
            // Copy JSON to public dir
            fs.copyFileSync(jsonOutputPath, path.join(publicDir, jsonOutputFile));
            fs.unlinkSync(jsonOutputPath); // Remove original
            
            return res.json({
              success: true,
              results: results,
              chartUrl: imageUrl,
              jsonUrl: `/${jsonOutputFile}`
            });
          }
          
          // Fallback response if no JSON output
          res.json({
            success: true,
            message: 'VaR analysis completed',
            chartUrl: imageUrl
          });
          
                 } catch (parseError: any) {
           console.error('Error processing VaR results:', parseError);
           res.status(500).json({ 
             error: 'Error processing VaR results', 
             details: parseError.message 
           });
         }
      });
      
                          // Handle Python process errors
       python.on('error', (error: any) => {
        clearTimeout(timeout);
        console.error('Python process error:', error);
        
        // Check if response already sent
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to start Python process', 
            details: error.message
          });
        }
       });
      
    } catch (error: any) {
      console.error('Error in VaR analysis endpoint:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal server error', 
          details: error.message 
        });
      }
    }
  });

  // Static file serving for VaR charts
  apiRouter.get("/charts", (req: Request, res: Response) => {
    const fs = require('fs');
    const path = require('path');
    
    const publicDir = path.join(__dirname, 'public');
    
    if (!fs.existsSync(publicDir)) {
      return res.json({ success: true, charts: [] });
    }
    
    fs.readdir(publicDir, (err: any, files: string[]) => {
      if (err) {
        console.error('Error reading public directory:', err);
        return res.status(500).json({ error: 'Failed to read charts directory' });
      }
      
      // Filter for image files
      const imageFiles = files.filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
      );
      
      // Return the list of image files with full URLs
      const imageUrls = imageFiles.map(file => `http://localhost:3001/${file}`);
      
      res.json({
        success: true,
        charts: imageUrls
      });
    });
  });

  // File existence check endpoint
  apiRouter.get("/file-exists/:filename", (req: Request, res: Response) => {
    const fs = require('fs');
    const path = require('path');
    
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public', filename);
    
    fs.access(filePath, fs.constants.F_OK, (err: any) => {
      if (err) {
        return res.json({ exists: false, path: filePath });
      }
      res.json({ exists: true, path: filePath });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

import { 
  users, type User, type InsertUser,
  banks, type Bank, type InsertBank,
  cdProducts, type CdProduct, type InsertCdProduct,
  investments, type Investment, type InsertInvestment,
  transactions, type Transaction, type InsertTransaction,
  notifications, type Notification, type InsertNotification,
  userPreferences, type UserPreference, type InsertUserPreference
} from "@shared/schema";
import { addMonths, format } from "date-fns";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bank operations
  getAllBanks(): Promise<Bank[]>;
  getBank(id: number): Promise<Bank | undefined>;
  createBank(bank: InsertBank): Promise<Bank>;
  
  // CD Product operations
  getAllCdProducts(): Promise<CdProduct[]>;
  getCdProduct(id: number): Promise<CdProduct | undefined>;
  getFeaturedCdProduct(): Promise<CdProduct | undefined>;
  getTopCdProducts(limit: number): Promise<CdProduct[]>;
  getCdProductsByBank(bankId: number): Promise<CdProduct[]>;
  createCdProduct(product: InsertCdProduct): Promise<CdProduct>;
  
  // Investment operations
  getInvestment(id: number): Promise<Investment | undefined>;
  getInvestmentsByUser(userId: number): Promise<Investment[]>;
  getActiveInvestmentsByUser(userId: number): Promise<Investment[]>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, updates: Partial<Investment>): Promise<Investment | undefined>;
  
  // Transaction operations
  getAllTransactionsByUser(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Notification operations
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  
  // User Preferences operations
  getUserPreferences(userId: number): Promise<UserPreference | undefined>;
  createUserPreferences(prefs: InsertUserPreference): Promise<UserPreference>;
  updateUserPreferences(userId: number, updates: Partial<UserPreference>): Promise<UserPreference | undefined>;
  
  // Portfolio operations
  getUserPortfolioSummary(userId: number): Promise<{
    totalInvested: number;
    interestEarned: number;
    avgApy: number;
    projectedAnnualEarnings: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private banks: Map<number, Bank>;
  private cdProducts: Map<number, CdProduct>;
  private investments: Map<number, Investment>;
  private transactions: Map<number, Transaction>;
  private notifications: Map<number, Notification>;
  private userPreferences: Map<number, UserPreference>;
  
  // Auto-incrementing IDs
  private userId: number;
  private bankId: number;
  private cdProductId: number;
  private investmentId: number;
  private transactionId: number;
  private notificationId: number;
  private userPrefId: number;
  
  constructor() {
    this.users = new Map();
    this.banks = new Map();
    this.cdProducts = new Map();
    this.investments = new Map();
    this.transactions = new Map();
    this.notifications = new Map();
    this.userPreferences = new Map();
    
    this.userId = 1;
    this.bankId = 1;
    this.cdProductId = 1;
    this.investmentId = 1;
    this.transactionId = 1;
    this.notificationId = 1;
    this.userPrefId = 1;
    
    // Initialize with some mock data for testing
    this.initializeMockData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { 
      ...insertUser, 
      id, 
      isVerified: false,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Bank operations
  async getAllBanks(): Promise<Bank[]> {
    return Array.from(this.banks.values());
  }
  
  async getBank(id: number): Promise<Bank | undefined> {
    return this.banks.get(id);
  }
  
  async createBank(bank: InsertBank): Promise<Bank> {
    const id = this.bankId++;
    const newBank: Bank = { ...bank, id };
    this.banks.set(id, newBank);
    return newBank;
  }
  
  // CD Product operations
  async getAllCdProducts(): Promise<CdProduct[]> {
    return Array.from(this.cdProducts.values());
  }
  
  async getCdProduct(id: number): Promise<CdProduct | undefined> {
    return this.cdProducts.get(id);
  }
  
  async getFeaturedCdProduct(): Promise<CdProduct | undefined> {
    return Array.from(this.cdProducts.values()).find(product => product.isFeatured);
  }
  
  async getTopCdProducts(limit: number): Promise<CdProduct[]> {
    return Array.from(this.cdProducts.values())
      .sort((a, b) => Number(b.apy) - Number(a.apy))
      .slice(0, limit);
  }
  
  async getCdProductsByBank(bankId: number): Promise<CdProduct[]> {
    return Array.from(this.cdProducts.values())
      .filter(product => product.bankId === bankId);
  }
  
  async createCdProduct(product: InsertCdProduct): Promise<CdProduct> {
    const id = this.cdProductId++;
    const newProduct: CdProduct = { ...product, id };
    this.cdProducts.set(id, newProduct);
    return newProduct;
  }
  
  // Investment operations
  async getInvestment(id: number): Promise<Investment | undefined> {
    return this.investments.get(id);
  }
  
  async getInvestmentsByUser(userId: number): Promise<Investment[]> {
    return Array.from(this.investments.values())
      .filter(investment => investment.userId === userId);
  }
  
  async getActiveInvestmentsByUser(userId: number): Promise<Investment[]> {
    return Array.from(this.investments.values())
      .filter(investment => investment.userId === userId && investment.status === 'active');
  }
  
  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const id = this.investmentId++;
    const newInvestment: Investment = { 
      ...investment, 
      id, 
      interestEarned: 0,
      status: 'active'
    };
    this.investments.set(id, newInvestment);
    return newInvestment;
  }
  
  async updateInvestment(id: number, updates: Partial<Investment>): Promise<Investment | undefined> {
    const investment = this.investments.get(id);
    if (!investment) return undefined;
    
    const updatedInvestment = { ...investment, ...updates };
    this.investments.set(id, updatedInvestment);
    return updatedInvestment;
  }
  
  // Transaction operations
  async getAllTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    const newTransaction: Transaction = { 
      ...transaction, 
      id,
      createdAt: new Date()
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  // Notification operations
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notif => notif.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notif => notif.userId === userId && !notif.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const newNotification: Notification = { 
      ...notification, 
      id,
      isRead: false,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  // User Preferences operations
  async getUserPreferences(userId: number): Promise<UserPreference | undefined> {
    return Array.from(this.userPreferences.values())
      .find(pref => pref.userId === userId);
  }
  
  async createUserPreferences(prefs: InsertUserPreference): Promise<UserPreference> {
    const id = this.userPrefId++;
    const newPrefs: UserPreference = { ...prefs, id };
    this.userPreferences.set(id, newPrefs);
    return newPrefs;
  }
  
  async updateUserPreferences(userId: number, updates: Partial<UserPreference>): Promise<UserPreference | undefined> {
    const prefs = Array.from(this.userPreferences.values())
      .find(pref => pref.userId === userId);
      
    if (!prefs) return undefined;
    
    const updatedPrefs = { ...prefs, ...updates };
    this.userPreferences.set(prefs.id, updatedPrefs);
    return updatedPrefs;
  }
  
  // Portfolio operations
  async getUserPortfolioSummary(userId: number): Promise<{
    totalInvested: number;
    interestEarned: number;
    avgApy: number;
    projectedAnnualEarnings: number;
  }> {
    const userInvestments = await this.getActiveInvestmentsByUser(userId);
    
    if (userInvestments.length === 0) {
      return {
        totalInvested: 0,
        interestEarned: 0,
        avgApy: 0,
        projectedAnnualEarnings: 0
      };
    }
    
    const totalInvested = userInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const interestEarned = userInvestments.reduce((sum, inv) => sum + Number(inv.interestEarned), 0);
    
    // Calculate weighted average APY
    let weightedApySum = 0;
    
    for (const investment of userInvestments) {
      const cdProduct = await this.getCdProduct(investment.cdProductId);
      if (cdProduct) {
        weightedApySum += Number(investment.amount) * Number(cdProduct.apy);
      }
    }
    
    const avgApy = weightedApySum / totalInvested;
    const projectedAnnualEarnings = totalInvested * (avgApy / 100);
    
    return {
      totalInvested,
      interestEarned,
      avgApy,
      projectedAnnualEarnings
    };
  }
  
  // Initialize mock data for testing
  private initializeMockData() {
    // Create a test user
    const user: InsertUser = {
      username: 'alex',
      password: 'password123',
      email: 'alex.thompson@example.com',
      fullName: 'Alex Thompson'
    };
    this.createUser(user).then(createdUser => {
      // Create user preferences
      const userPrefs: InsertUserPreference = {
        userId: createdUser.id,
        darkMode: false,
        pushNotifications: true,
        emailNotifications: true,
        maturityPreference: 'notify'
      };
      this.createUserPreferences(userPrefs);
      
      // Create banks
      const bankData: InsertBank[] = [
        { 
          name: 'First National Bank', 
          rating: 4.75, 
          fdic_insured: true, 
          logo_type: 'landmark', 
          color: 'primary' 
        },
        { 
          name: 'Coastal Credit Union', 
          rating: 4.0, 
          fdic_insured: true, 
          logo_type: 'landmark', 
          color: 'secondary' 
        },
        { 
          name: 'Capital One', 
          rating: 4.8, 
          fdic_insured: true, 
          logo_type: 'landmark', 
          color: 'primary' 
        },
        { 
          name: 'Ally Bank', 
          rating: 4.5, 
          fdic_insured: true, 
          logo_type: 'landmark', 
          color: 'primary' 
        },
        { 
          name: 'Synchrony', 
          rating: 4.0, 
          fdic_insured: true, 
          logo_type: 'landmark', 
          color: 'secondary' 
        },
        { 
          name: 'Marcus by Goldman', 
          rating: 4.8, 
          fdic_insured: true, 
          logo_type: 'landmark', 
          color: 'accent' 
        }
      ];
      
      // Create all banks then continue with other data
      Promise.all(bankData.map(bank => this.createBank(bank)))
        .then(banks => {
          // Create CD Products
          const cdProductData: InsertCdProduct[] = [
            {
              bankId: banks[0].id, // First National Bank
              name: '12-Month Fixed CD',
              termMonths: 12,
              apy: 4.75,
              minimumDeposit: 1000,
              earlyWithdrawalPenalty: 'Penalty',
              description: 'A 12-month certificate of deposit with a competitive rate',
              isFeatured: false
            },
            {
              bankId: banks[1].id, // Coastal Credit Union
              name: '6-Month CD',
              termMonths: 6,
              apy: 4.25,
              minimumDeposit: 500,
              earlyWithdrawalPenalty: 'Penalty',
              description: 'A short-term CD with good returns',
              isFeatured: false
            },
            {
              bankId: banks[2].id, // Capital One
              name: '12 Month CD Special',
              termMonths: 12,
              apy: 5.00,
              minimumDeposit: 500,
              earlyWithdrawalPenalty: 'Penalty',
              description: 'Our best rate CD with flexible terms',
              isFeatured: true
            },
            {
              bankId: banks[3].id, // Ally Bank
              name: '18-Month CD',
              termMonths: 18,
              apy: 4.85,
              minimumDeposit: 0,
              earlyWithdrawalPenalty: 'Penalty',
              description: 'No minimum deposit required',
              isFeatured: false
            },
            {
              bankId: banks[4].id, // Synchrony
              name: '24-Month CD',
              termMonths: 24,
              apy: 4.75,
              minimumDeposit: 2000,
              earlyWithdrawalPenalty: 'Penalty',
              description: 'Long-term savings with competitive rates',
              isFeatured: false
            },
            {
              bankId: banks[5].id, // Marcus by Goldman
              name: '12-Month CD',
              termMonths: 12,
              apy: 4.50,
              minimumDeposit: 500,
              earlyWithdrawalPenalty: 'Flexible',
              description: 'Flexible withdrawal options available',
              isFeatured: false
            },
            {
              bankId: banks[5].id, // Marcus by Goldman
              name: '18-Month CD',
              termMonths: 18,
              apy: 4.50,
              minimumDeposit: 500,
              earlyWithdrawalPenalty: 'Flexible',
              description: 'Extended savings with competitive rates',
              isFeatured: false
            }
          ];
          
          return Promise.all(cdProductData.map(product => this.createCdProduct(product)));
        })
        .then(cdProducts => {
          // Create investments for the user
          const now = new Date();
          
          // First investment - First National Bank 12-Month CD
          const firstMaturity = addMonths(now, 12);
          const firstStartDate = addMonths(firstMaturity, -3); // 3 months ago (9 months remaining)
          
          const investment1: InsertInvestment = {
            userId: createdUser.id,
            cdProductId: cdProducts[0].id,
            amount: 10000,
            startDate: firstStartDate,
            maturityDate: firstMaturity
          };
          
          // Second investment - Coastal Credit Union 6-Month CD
          const secondMaturity = addMonths(now, 1); // Matures in 1 month
          const secondStartDate = addMonths(secondMaturity, -5); // 5 months ago (1 month remaining)
          
          const investment2: InsertInvestment = {
            userId: createdUser.id,
            cdProductId: cdProducts[1].id,
            amount: 15000,
            startDate: secondStartDate,
            maturityDate: secondMaturity
          };
          
          // Third investment - Marcus by Goldman 18-Month CD
          const thirdMaturity = addMonths(now, 15); // Matures in 15 months
          const thirdStartDate = addMonths(thirdMaturity, -3); // 3 months ago (15 months remaining)
          
          const investment3: InsertInvestment = {
            userId: createdUser.id,
            cdProductId: cdProducts[6].id,
            amount: 12250,
            startDate: thirdStartDate,
            maturityDate: thirdMaturity
          };
          
          return Promise.all([
            this.createInvestment(investment1),
            this.createInvestment(investment2),
            this.createInvestment(investment3)
          ]);
        })
        .then(investments => {
          // Update investments with some earned interest
          this.updateInvestment(investments[0].id, { interestEarned: 118.75 });
          this.updateInvestment(investments[1].id, { interestEarned: 265.63 });
          this.updateInvestment(investments[2].id, { interestEarned: 45.94 });
          
          // Create transactions for the user
          const transactions: InsertTransaction[] = [
            {
              userId: createdUser.id,
              type: 'deposit',
              amount: 10000,
              description: 'Initial deposit for First National Bank CD',
              relatedInvestmentId: investments[0].id
            },
            {
              userId: createdUser.id,
              type: 'deposit',
              amount: 15000,
              description: 'Initial deposit for Coastal Credit Union CD',
              relatedInvestmentId: investments[1].id
            },
            {
              userId: createdUser.id,
              type: 'interest',
              amount: 118.75,
              description: 'Interest accrual for First National Bank CD',
              relatedInvestmentId: investments[0].id
            },
            {
              userId: createdUser.id,
              type: 'deposit',
              amount: 12250,
              description: 'Initial deposit for Marcus by Goldman CD',
              relatedInvestmentId: investments[2].id
            },
            {
              userId: createdUser.id,
              type: 'interest',
              amount: 265.63,
              description: 'Interest accrual for Coastal Credit Union CD',
              relatedInvestmentId: investments[1].id
            },
            {
              userId: createdUser.id,
              type: 'interest',
              amount: 45.94,
              description: 'Interest accrual for Marcus by Goldman CD',
              relatedInvestmentId: investments[2].id
            }
          ];
          
          return Promise.all(transactions.map(tx => this.createTransaction(tx)));
        })
        .then(() => {
          // Create a notification for upcoming maturity
          const notification: InsertNotification = {
            userId: createdUser.id,
            type: 'maturity',
            message: 'Your 6-month CD of $15,000 will mature on Feb 15, 2024',
            relatedInvestmentId: 2, // The Coastal Credit Union investment
            relatedCdProductId: 2
          };
          
          return this.createNotification(notification);
        });
    });
  }
}

export const storage = new MemStorage();

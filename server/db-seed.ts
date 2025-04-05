import { db } from "./db";
import { 
  users, banks, cdProducts, investments, transactions, 
  notifications, userPreferences, 
  type InsertUser, type InsertBank, type InsertCdProduct, 
  type InsertInvestment, type InsertTransaction, 
  type InsertNotification, type InsertUserPreference 
} from "../shared/schema";
import { addMonths, format } from "date-fns";
import { log } from "./vite";

/**
 * Seeds the database with initial data for development
 */
export async function seedDatabase() {
  try {
    log("Starting database seeding...", "db-seed");
    
    // Create a test user
    const [user] = await db.insert(users).values({
      username: 'alex',
      password: 'password123',
      email: 'alex.thompson@example.com',
      fullName: 'Alex Thompson',
      isVerified: false,
      createdAt: new Date()
    }).returning();
    
    log(`Created test user with ID: ${user.id}`, "db-seed");
    
    // Create user preferences
    await db.insert(userPreferences).values({
      userId: user.id,
      darkMode: false,
      pushNotifications: true,
      emailNotifications: true,
      maturityPreference: 'notify'
    });
    
    // Create banks
    const bankData = [
      { 
        name: 'First National Bank', 
        rating: "4.75", 
        fdic_insured: true, 
        logo_type: 'landmark', 
        color: 'primary' 
      },
      { 
        name: 'Coastal Credit Union', 
        rating: "4.0", 
        fdic_insured: true, 
        logo_type: 'landmark', 
        color: 'secondary' 
      },
      { 
        name: 'Capital One', 
        rating: "4.8", 
        fdic_insured: true, 
        logo_type: 'landmark', 
        color: 'primary' 
      },
      { 
        name: 'Ally Bank', 
        rating: "4.5", 
        fdic_insured: true, 
        logo_type: 'landmark', 
        color: 'primary' 
      },
      { 
        name: 'Synchrony', 
        rating: "4.0", 
        fdic_insured: true, 
        logo_type: 'landmark', 
        color: 'secondary' 
      },
      { 
        name: 'Marcus by Goldman', 
        rating: "4.8", 
        fdic_insured: true, 
        logo_type: 'landmark', 
        color: 'accent' 
      }
    ];
    
    const banks1 = await db.insert(banks).values(bankData).returning();
    log(`Created ${banks1.length} banks`, "db-seed");
    
    // Create CD Products
    const cdProductData = [
      {
        bankId: banks1[0].id,
        name: '12-Month Fixed CD',
        termMonths: 12,
        apy: "4.75",
        minimumDeposit: "1000",
        earlyWithdrawalPenalty: 'Penalty',
        description: 'A 12-month certificate of deposit with a competitive rate',
        isFeatured: false
      },
      {
        bankId: banks1[1].id,
        name: '6-Month CD',
        termMonths: 6,
        apy: "4.25",
        minimumDeposit: "500",
        earlyWithdrawalPenalty: 'Penalty',
        description: 'A short-term CD with good returns',
        isFeatured: false
      },
      {
        bankId: banks1[2].id,
        name: '12 Month CD Special',
        termMonths: 12,
        apy: "5.00",
        minimumDeposit: "500",
        earlyWithdrawalPenalty: 'Penalty',
        description: 'Our best rate CD with flexible terms',
        isFeatured: true
      },
      {
        bankId: banks1[3].id,
        name: '18-Month CD',
        termMonths: 18,
        apy: "4.85",
        minimumDeposit: "0",
        earlyWithdrawalPenalty: 'Penalty',
        description: 'No minimum deposit required',
        isFeatured: false
      },
      {
        bankId: banks1[4].id,
        name: '24-Month CD',
        termMonths: 24,
        apy: "4.75",
        minimumDeposit: "2000",
        earlyWithdrawalPenalty: 'Penalty',
        description: 'Long-term savings with competitive rates',
        isFeatured: false
      },
      {
        bankId: banks1[5].id,
        name: '12-Month CD',
        termMonths: 12,
        apy: "4.50",
        minimumDeposit: "500",
        earlyWithdrawalPenalty: 'Flexible',
        description: 'Flexible withdrawal options available',
        isFeatured: false
      },
      {
        bankId: banks1[5].id,
        name: '18-Month CD',
        termMonths: 18,
        apy: "4.50",
        minimumDeposit: "500",
        earlyWithdrawalPenalty: 'Flexible',
        description: 'Extended savings with competitive rates',
        isFeatured: false
      }
    ];
    
    const cdProducts1 = await db.insert(cdProducts).values(cdProductData).returning();
    log(`Created ${cdProducts1.length} CD products`, "db-seed");
    
    // Create investments for the user
    const now = new Date();
    
    // First investment
    const firstMaturity = addMonths(now, 12);
    const firstStartDate = addMonths(firstMaturity, -3); // 3 months ago
    
    const investment1 = await db.insert(investments).values({
      userId: user.id,
      cdProductId: cdProducts1[0].id,
      amount: "10000",
      startDate: firstStartDate,
      maturityDate: firstMaturity,
      interestEarned: "107.81",
      status: 'active'
    }).returning();
    
    // Second investment
    const secondMaturity = addMonths(now, 3); // 3 months from now
    const secondStartDate = addMonths(secondMaturity, -3); // Start date was 3 months ago
    
    const investment2 = await db.insert(investments).values({
      userId: user.id,
      cdProductId: cdProducts1[1].id,
      amount: "15000",
      startDate: secondStartDate,
      maturityDate: secondMaturity,
      interestEarned: "265.63",
      status: 'active'
    }).returning();
    
    // Third investment
    const thirdMaturity = addMonths(now, 12);
    const thirdStartDate = addMonths(now, -1); // 1 month ago
    
    const investment3 = await db.insert(investments).values({
      userId: user.id,
      cdProductId: cdProducts1[5].id,
      amount: "12250",
      startDate: thirdStartDate,
      maturityDate: thirdMaturity,
      interestEarned: "45.94",
      status: 'active'
    }).returning();
    
    log(`Created 3 investments for user`, "db-seed");
    
    // Create transactions
    const transactions1 = await db.insert(transactions).values([
      {
        userId: user.id,
        type: 'deposit',
        amount: "10000",
        description: 'Initial deposit for First National Bank CD',
        relatedInvestmentId: investment1[0].id,
        createdAt: firstStartDate
      },
      {
        userId: user.id,
        type: 'deposit',
        amount: "15000",
        description: 'Initial deposit for Coastal Credit Union CD',
        relatedInvestmentId: investment2[0].id,
        createdAt: secondStartDate
      },
      {
        userId: user.id,
        type: 'deposit',
        amount: "12250",
        description: 'Initial deposit for Marcus by Goldman CD',
        relatedInvestmentId: investment3[0].id,
        createdAt: thirdStartDate
      },
      {
        userId: user.id,
        type: 'interest',
        amount: "265.63",
        description: 'Interest accrual for Coastal Credit Union CD',
        relatedInvestmentId: investment2[0].id,
        createdAt: new Date()
      },
      {
        userId: user.id,
        type: 'interest',
        amount: "45.94",
        description: 'Interest accrual for Marcus by Goldman CD',
        relatedInvestmentId: investment3[0].id,
        createdAt: new Date()
      }
    ]).returning();
    
    log(`Created ${transactions1.length} transactions`, "db-seed");
    
    // Create notification for upcoming maturity
    const notification = await db.insert(notifications).values({
      userId: user.id,
      type: 'maturity',
      message: 'Your 6-month CD will mature soon',
      relatedInvestmentId: investment2[0].id,
      relatedCdProductId: cdProducts1[1].id,
      isRead: false,
      createdAt: new Date()
    }).returning();
    
    log(`Created notification about upcoming maturity`, "db-seed");
    log("Database seeding completed successfully", "db-seed");
    
  } catch (error) {
    log(`Error seeding database: ${error}`, "db-seed");
    console.error(error);
  }
}
import { Transaction, TransactionStatus } from '../types';

const MERCHANTS = [
  'Amazon', 'Apple Store', 'Starbucks', 'Walmart', 'Target', 'Netflix', 
  'Uber', 'Airbnb', 'Steam', 'Best Buy', 'Whole Foods', 'Shell Gas',
  'Unknown Merchant', 'Suspicious LLC', 'Global Transfer'
];

const CATEGORIES = [
  'Retail', 'Electronics', 'Food & Drink', 'Travel', 'Entertainment', 
  'Transportation', 'Utilities', 'Services', 'Finance'
];

const LOCATIONS = [
  'New York, NY', 'San Francisco, CA', 'London, UK', 'Tokyo, JP', 
  'Berlin, DE', 'Paris, FR', 'Sydney, AU', 'Toronto, CA', 'Unknown'
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];

export const generateTransaction = (overrides: Partial<Transaction> = {}): Transaction => {
  const isAnomaly = Math.random() < 0.05; // 5% chance of being a natural anomaly
  const amount = isAnomaly 
    ? Math.floor(Math.random() * 5000) + 1000 
    : Math.floor(Math.random() * 200) + 5;

  const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];

  return {
    id: Math.random().toString(36).substring(2, 15),
    timestamp: Date.now(),
    amount,
    currency,
    merchant,
    category,
    location,
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    status: 'completed',
    riskScore: isAnomaly ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 20),
    ...overrides
  };
};

export const createTransactionStream = (callback: (tx: Transaction) => void, interval = 2000) => {
  const timer = setInterval(() => {
    callback(generateTransaction());
  }, interval);

  return () => clearInterval(timer);
};

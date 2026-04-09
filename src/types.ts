export type TransactionStatus = 'pending' | 'completed' | 'flagged' | 'blocked';

export interface FeatureVector {
  amount: number;
  transactionFrequency: number;
  avgAmount: number;
  timeSinceLast: number;
  amountDeviation: number;
  locationChange: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  location: string;
  userId: string;
  status: TransactionStatus;
  riskScore: number; // 0 to 100
  metadata?: Record<string, any>;
}

export interface Anomaly {
  id: string;
  transactionId: string;
  type: 'high_amount' | 'rapid_frequency' | 'unusual_location' | 'category_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
}

export interface DashboardStats {
  totalVolume: number;
  transactionCount: number;
  anomalyCount: number;
  averageRiskScore: number;
  activeAlerts: number;
}

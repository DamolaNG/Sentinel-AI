import { Transaction, Anomaly } from '../types';

export const detectAnomalies = (transaction: Transaction, history: Transaction[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  // 1. High Amount Check
  if (transaction.amount > 1000) {
    anomalies.push({
      id: `anom_${Math.random().toString(36).substring(2, 9)}`,
      transactionId: transaction.id,
      type: 'high_amount',
      severity: transaction.amount > 4000 ? 'critical' : 'high',
      description: `Transaction amount $${transaction.amount} exceeds normal threshold.`,
      timestamp: Date.now()
    });
  }

  // 2. Rapid Frequency Check (Velocity)
  const userHistory = history.filter(tx => tx.userId === transaction.userId);
  const recentTx = userHistory.filter(tx => (Date.now() - tx.timestamp) < 60000); // last 1 minute
  
  if (recentTx.length > 3) {
    anomalies.push({
      id: `anom_${Math.random().toString(36).substring(2, 9)}`,
      transactionId: transaction.id,
      type: 'rapid_frequency',
      severity: 'medium',
      description: `User has ${recentTx.length} transactions in the last minute.`,
      timestamp: Date.now()
    });
  }

  // 3. Unusual Merchant
  if (transaction.merchant === 'Unknown Merchant' || transaction.merchant === 'Suspicious LLC') {
    anomalies.push({
      id: `anom_${Math.random().toString(36).substring(2, 9)}`,
      transactionId: transaction.id,
      type: 'category_mismatch',
      severity: 'medium',
      description: `Transaction with high-risk merchant: ${transaction.merchant}`,
      timestamp: Date.now()
    });
  }

  return anomalies;
};

export const calculateRiskScore = (anomalies: Anomaly[]): number => {
  if (anomalies.length === 0) return Math.floor(Math.random() * 10);
  
  const severityWeights = {
    low: 10,
    medium: 30,
    high: 60,
    critical: 90
  };

  const maxSeverity = anomalies.reduce((max, curr) => {
    return severityWeights[curr.severity] > severityWeights[max] ? curr.severity : max;
  }, 'low' as Anomaly['severity']);

  return severityWeights[maxSeverity] + (anomalies.length * 2);
};

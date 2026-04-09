import { Transaction, FeatureVector } from '../types';
import * as ss from 'simple-statistics';

export class FeatureEngineering {
  static extractFeatures(transaction: Transaction, history: Transaction[]): FeatureVector {
    const userHistory = history.filter(tx => tx.userId === transaction.userId);
    
    // 1. Transaction Frequency (last 10 minutes)
    const tenMinsAgo = Date.now() - 10 * 60 * 1000;
    const frequency = userHistory.filter(tx => tx.timestamp > tenMinsAgo).length;

    // 2. Average Amount
    const amounts = userHistory.map(tx => tx.amount);
    const avgAmount = amounts.length > 0 ? ss.mean(amounts) : transaction.amount;

    // 3. Time Since Last Transaction
    const lastTx = userHistory.length > 0 ? userHistory[0] : null; // History is usually sorted desc
    const timeSinceLast = lastTx ? (transaction.timestamp - lastTx.timestamp) / 1000 : 3600; // default 1 hour in seconds

    // 4. Amount Deviation (Z-Score approximation)
    const stdDev = amounts.length > 1 ? ss.standardDeviation(amounts) : 10;
    const amountDeviation = Math.abs(transaction.amount - avgAmount) / (stdDev || 1);

    // 5. Location Change (Sequential Pattern)
    const locationChange = lastTx && lastTx.location !== transaction.location ? 1 : 0;

    return {
      amount: transaction.amount,
      transactionFrequency: frequency,
      avgAmount,
      timeSinceLast,
      amountDeviation,
      locationChange
    };
  }

  static toArray(features: FeatureVector): number[] {
    return [
      features.amount,
      features.transactionFrequency,
      features.avgAmount,
      features.timeSinceLast,
      features.amountDeviation,
      features.locationChange
    ];
  }
}

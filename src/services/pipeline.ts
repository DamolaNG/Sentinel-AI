import EventEmitter from 'eventemitter3';
import { Transaction, Anomaly } from '../types';
import { FeatureEngineering } from './features';
import { FraudModel } from './ml';
import { detectAnomalies } from './detector';

export class DataPipeline extends EventEmitter {
  private history: Map<string, Transaction[]> = new Map();
  private model: FraudModel;
  private processedCount: number = 0;

  constructor() {
    super();
    this.model = new FraudModel();
    this.model.trainInitial();
  }

  /**
   * Ingests a new transaction into the pipeline.
   * This mimics a Kafka consumer receiving a message.
   */
  async ingest(transaction: Transaction) {
    this.processedCount++;
    
    // 1. Feature Engineering
    const userHistory = this.history.get(transaction.userId) || [];
    const features = FeatureEngineering.extractFeatures(transaction, userHistory);

    // 2. ML Inference
    const fraudScore = this.model.predict(features);
    transaction.riskScore = Math.round(fraudScore * 100);

    // 3. Rule-based Anomaly Detection (Heuristics)
    const anomalies = detectAnomalies(transaction, userHistory);

    // 4. Update History (State Management)
    userHistory.unshift(transaction);
    this.history.set(transaction.userId, userHistory.slice(0, 50));

    // 5. Emit processed event
    this.emit('processed', {
      transaction,
      features,
      anomalies,
      timestamp: Date.now()
    });
  }

  getStats() {
    return {
      processedCount: this.processedCount,
      activeUsers: this.history.size
    };
  }
}

export const pipeline = new DataPipeline();

import { RandomForestClassifier } from 'ml-random-forest';
import { FeatureVector, Transaction } from '../types';
import { FeatureEngineering } from './features';

export class FraudModel {
  private model: RandomForestClassifier;
  private isTrained: boolean = false;

  constructor() {
    this.model = new RandomForestClassifier({
      nEstimators: 50,
      seed: 42,
      treeOptions: {
        maxDepth: 10
      }
    });
  }

  // Pre-train with some synthetic data to avoid cold start
  async trainInitial() {
    const trainingData: number[][] = [];
    const labels: number[] = [];

    // Generate synthetic "normal" data
    for (let i = 0; i < 100; i++) {
      trainingData.push([
        Math.random() * 100, // amount
        Math.random() * 2,   // freq
        50,                  // avg
        3600,                // time
        0.5,                 // dev
        0                    // loc
      ]);
      labels.push(0); // Normal
    }

    // Generate synthetic "fraud" data
    for (let i = 0; i < 20; i++) {
      trainingData.push([
        Math.random() * 5000 + 1000, // high amount
        Math.random() * 10 + 5,      // high freq
        50,                          // low avg
        10,                          // low time
        5.0,                         // high dev
        1                            // loc change
      ]);
      labels.push(1); // Fraud
    }

    this.model.train(trainingData, labels);
    this.isTrained = true;
    console.log('ML Model trained with synthetic data');
  }

  predict(features: FeatureVector): number {
    if (!this.isTrained) return 0.1;
    
    const input = FeatureEngineering.toArray(features);
    const prediction = this.model.predict([input])[0];
    
    // Random Forest in this lib returns the class label. 
    // We can approximate probability by looking at the trees if the lib supported it, 
    // but here we'll just return the class with a bit of noise for "score" feel.
    return prediction === 1 ? 0.85 + Math.random() * 0.1 : 0.05 + Math.random() * 0.1;
  }
}

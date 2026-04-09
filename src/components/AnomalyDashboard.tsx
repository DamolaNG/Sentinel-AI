import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Activity, AlertTriangle, Shield, TrendingUp, 
  Clock, DollarSign, MapPin, User, Search,
  Filter, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Transaction, Anomaly, DashboardStats, FeatureVector } from '../types';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from "@google/genai";

const AnomalyDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [features, setFeatures] = useState<Record<string, FeatureVector>>({});
  const [isLive, setIsLive] = useState(true);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [analyzingTx, setAnalyzingTx] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, string>>({});

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);

  const analyzeWithAI = async (tx: Transaction, anomaly: Anomaly) => {
    if (!process.env.GEMINI_API_KEY) return;
    
    setAnalyzingTx(tx.id);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this suspicious transaction for fraud potential:
        Merchant: ${tx.merchant}
        Amount: ${tx.amount} ${tx.currency}
        Category: ${tx.category}
        Location: ${tx.location}
        Anomaly Type: ${anomaly.type}
        Description: ${anomaly.description}
        
        Provide a concise 2-sentence risk assessment and recommendation.`,
      });
      
      setAnalysisResult(prev => ({ ...prev, [tx.id]: response.text || "Analysis unavailable." }));
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setAnalyzingTx(null);
    }
  };

  useEffect(() => {
    if (!isLive) return;

    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { transaction, features: txFeatures, anomalies: txAnomalies } = data;

      setTransactions(prev => [transaction, ...prev].slice(0, 100));
      setFeatures(prev => ({ ...prev, [transaction.id]: txFeatures }));
      
      if (txAnomalies.length > 0) {
        setAnomalies(prev => [...txAnomalies, ...prev].slice(0, 50));
      }
    };

    return () => eventSource.close();
  }, [isLive]);

  const stats: DashboardStats = useMemo(() => {
    const volume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const avgRisk = transactions.length > 0 
      ? transactions.reduce((sum, tx) => sum + tx.riskScore, 0) / transactions.length 
      : 0;
    
    return {
      totalVolume: volume,
      transactionCount: transactions.length,
      anomalyCount: anomalies.length,
      averageRiskScore: Math.round(avgRisk),
      activeAlerts: anomalies.filter(a => (Date.now() - a.timestamp) < 300000).length // last 5 mins
    };
  }, [transactions, anomalies]);

  const chartData = useMemo(() => {
    return transactions.slice().reverse().map(tx => ({
      time: new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      amount: tx.amount,
      risk: tx.riskScore
    }));
  }, [transactions]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(tx => {
      counts[tx.category] = (counts[tx.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 font-sans text-slate-900">
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-indigo-600" />
            Sentinel AI
          </h1>
          <p className="text-slate-500">Real-time Fraud & Anomaly Detection System</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isLive ? "default" : "secondary"} className={cn("px-3 py-1", isLive && "bg-green-500 hover:bg-green-600")}>
            {isLive ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Live Monitoring
              </span>
            ) : "Paused"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsLive(!isLive)}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLive && "animate-spin-slow")} />
            {isLive ? "Pause Stream" : "Resume Stream"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Volume" 
          value={`$${stats.totalVolume.toLocaleString()}`} 
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          trend="+12.5%"
          description="Last 100 transactions"
        />
        <StatCard 
          title="Avg Risk Score" 
          value={stats.averageRiskScore.toString()} 
          icon={<Activity className="h-5 w-5 text-orange-600" />}
          trend={stats.averageRiskScore > 50 ? "High" : "Normal"}
          description="Real-time probability"
          progress={stats.averageRiskScore}
        />
        <StatCard 
          title="Detected Anomalies" 
          value={stats.anomalyCount.toString()} 
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          trend={`${stats.activeAlerts} active`}
          description="System flagged events"
        />
        <StatCard 
          title="Processed" 
          value={stats.transactionCount.toString()} 
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          trend="Stable"
          description="Throughput: 20 tx/min"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transaction Stream</CardTitle>
                <CardDescription>Real-time volume and risk analysis</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">Amount ($)</Badge>
                <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-600">Risk Score</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="time" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748B' }}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748B' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  dot={false} 
                  activeDot={{ r: 4 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="risk" 
                  stroke="#6366F1" 
                  strokeWidth={2} 
                  dot={false} 
                  activeDot={{ r: 4 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Feed</CardTitle>
            <CardDescription>Recent suspicious activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {anomalies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <CheckCircle2 className="h-12 w-12 mb-2 opacity-20" />
                      <p>No anomalies detected</p>
                    </div>
                  ) : (
                    anomalies.map((anomaly) => {
                      const tx = transactions.find(t => t.id === anomaly.transactionId);
                      return (
                        <motion.div
                          key={anomaly.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex flex-col gap-2 border-l-2 border-rose-500 bg-rose-50/50 p-3 rounded-r-lg"
                        >
                          <div className="flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-rose-900 capitalize">
                                    {anomaly.type.replace('_', ' ')}
                                  </span>
                                  <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                    {anomaly.severity}
                                  </Badge>
                                </div>
                                <span className="text-[10px] text-rose-400">
                                  {new Date(anomaly.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-xs text-rose-700 mt-1">{anomaly.description}</p>
                            </div>
                          </div>
                          
                          {tx && (
                            <div className="mt-2 border-t border-rose-100 pt-2">
                              {analysisResult[tx.id] ? (
                                <div className="text-[11px] text-slate-600 italic bg-white/50 p-2 rounded border border-rose-100">
                                  <span className="font-bold text-indigo-600 mr-1">AI Analysis:</span>
                                  {analysisResult[tx.id]}
                                </div>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 w-full justify-start gap-1.5 px-2"
                                  onClick={() => analyzeWithAI(tx, anomaly)}
                                  disabled={analyzingTx === tx.id}
                                >
                                  <Activity className={cn("h-3 w-3", analyzingTx === tx.id && "animate-pulse")} />
                                  {analyzingTx === tx.id ? "Analyzing..." : "Analyze with Gemini"}
                                </Button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
              <TabsTrigger value="features">Feature Engineering</TabsTrigger>
            </TabsList>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Search transactions..." 
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className="group hover:bg-slate-50 transition-colors">
                      <TableCell className="font-mono text-xs text-slate-500">{tx.id}</TableCell>
                      <TableCell className="font-medium">{tx.merchant}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-slate-600">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {tx.currency} {tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                tx.riskScore > 70 ? "bg-rose-500" : tx.riskScore > 30 ? "bg-orange-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${tx.riskScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-500">{tx.riskScore}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="text-right text-slate-400 text-xs">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          <TabsContent value="features" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Vectors</CardTitle>
                  <CardDescription>Engineered inputs for ML Model</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>TX ID</TableHead>
                          <TableHead>Freq</TableHead>
                          <TableHead>Dev</TableHead>
                          <TableHead>Time Δ</TableHead>
                          <TableHead>Loc Δ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => {
                          const f = features[tx.id];
                          if (!f) return null;
                          return (
                            <TableRow 
                              key={tx.id} 
                              className={cn("cursor-pointer hover:bg-slate-50", selectedTxId === tx.id && "bg-indigo-50")}
                              onClick={() => setSelectedTxId(tx.id)}
                            >
                              <TableCell className="font-mono text-[10px]">{tx.id.slice(0, 8)}</TableCell>
                              <TableCell>{f.transactionFrequency}</TableCell>
                              <TableCell className={cn(f.amountDeviation > 3 ? "text-rose-600 font-bold" : "")}>
                                {f.amountDeviation.toFixed(2)}
                              </TableCell>
                              <TableCell>{Math.round(f.timeSinceLast)}s</TableCell>
                              <TableCell>{f.locationChange ? "Yes" : "No"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ML Inference Details</CardTitle>
                  <CardDescription>
                    {selectedTxId ? `Analysis for ${selectedTxId}` : "Select a transaction to see details"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTxId && features[selectedTxId] ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 uppercase font-bold">Risk Probability</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {transactions.find(t => t.id === selectedTxId)?.riskScore}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 uppercase font-bold">Model Type</p>
                          <p className="text-lg font-medium">Random Forest</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Feature Importance Visualization</h4>
                        <div className="space-y-3">
                          <FeatureBar label="Amount Deviation" value={features[selectedTxId].amountDeviation * 20} color="bg-rose-500" />
                          <FeatureBar label="Frequency" value={features[selectedTxId].transactionFrequency * 10} color="bg-orange-500" />
                          <FeatureBar label="Time Since Last" value={Math.max(0, 100 - features[selectedTxId].timeSinceLast / 10)} color="bg-blue-500" />
                          <FeatureBar label="Location Change" value={features[selectedTxId].locationChange ? 100 : 0} color="bg-indigo-500" />
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-4 text-slate-100 font-mono text-xs">
                        <p className="text-indigo-400 mb-2">// Feature Vector Input</p>
                        <pre>{JSON.stringify(features[selectedTxId], null, 2)}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center py-20 text-slate-400 italic">
                      No transaction selected
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, description, progress }: any) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-slate-50 p-2.5">
          {icon}
        </div>
        <div className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          trend.includes('+') ? "bg-emerald-50 text-emerald-600" : 
          trend === "High" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
        )}>
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
      </div>
      <p className="text-xs text-slate-400 mt-4">{description}</p>
      {progress !== undefined && (
        <Progress value={progress} className="h-1 mt-3" />
      )}
    </CardContent>
  </Card>
);

const FeatureBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
      <span>{label}</span>
      <span>{Math.min(100, Math.round(value))}%</span>
    </div>
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        className={cn("h-full", color)}
      />
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: Transaction['status'] }) => {
  const styles = {
    pending: "bg-slate-100 text-slate-600 border-slate-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    flagged: "bg-rose-50 text-rose-700 border-rose-100",
    blocked: "bg-slate-900 text-white border-slate-900"
  };

  return (
    <Badge variant="outline" className={cn("capitalize font-medium", styles[status])}>
      {status === 'completed' && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {status === 'flagged' && <AlertTriangle className="mr-1 h-3 w-3" />}
      {status === 'blocked' && <XCircle className="mr-1 h-3 w-3" />}
      {status}
    </Badge>
  );
};

export default AnomalyDashboard;

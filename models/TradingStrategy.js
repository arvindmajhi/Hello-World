const mongoose = require('mongoose');

const tradingStrategySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['momentum', 'mean_reversion', 'arbitrage', 'scalping', 'swing', 'custom'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'stopped', 'error'],
    default: 'stopped'
  },
  parameters: {
    symbol: {
      type: String,
      required: true,
      uppercase: true
    },
    timeframe: {
      type: String,
      enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
      default: '1h'
    },
    capital: {
      type: Number,
      required: true,
      min: 0
    },
    riskPerTrade: {
      type: Number,
      default: 2, // percentage
      min: 0,
      max: 100
    },
    stopLoss: {
      type: Number,
      min: 0,
      max: 100
    },
    takeProfit: {
      type: Number,
      min: 0
    },
    maxDailyTrades: {
      type: Number,
      default: 10,
      min: 1
    }
  },
  performance: {
    totalTrades: {
      type: Number,
      default: 0
    },
    winningTrades: {
      type: Number,
      default: 0
    },
    losingTrades: {
      type: Number,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    totalLoss: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    profitFactor: {
      type: Number,
      default: 0
    },
    maxDrawdown: {
      type: Number,
      default: 0
    },
    sharpeRatio: {
      type: Number,
      default: 0
    }
  },
  trades: [{
    entryTime: Date,
    exitTime: Date,
    symbol: String,
    side: {
      type: String,
      enum: ['buy', 'sell']
    },
    entryPrice: Number,
    exitPrice: Number,
    quantity: Number,
    profit: Number,
    commission: Number,
    status: {
      type: String,
      enum: ['open', 'closed', 'cancelled']
    }
  }],
  executionLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'debug'],
      default: 'info'
    },
    message: String,
    data: mongoose.Schema.Types.Mixed
  }],
  startedAt: {
    type: Date,
    default: null
  },
  stoppedAt: {
    type: Date,
    default: null
  },
  lastExecuted: {
    type: Date,
    default: null
  },
  executionInterval: {
    type: Number,
    default: 60000, // milliseconds
    min: 1000
  },
  isBacktested: {
    type: Boolean,
    default: false
  },
  backtestResults: {
    startDate: Date,
    endDate: Date,
    initialCapital: Number,
    finalCapital: Number,
    totalReturn: Number,
    annualizedReturn: Number,
    volatility: Number,
    maxDrawdown: Number,
    sharpeRatio: Number,
    trades: Number
  },
  notifications: {
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    webhook: {
      type: String,
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
tradingStrategySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to start strategy execution
tradingStrategySchema.methods.start = function() {
  this.status = 'active';
  this.startedAt = new Date();
  this.stoppedAt = null;
  return this.save();
};

// Method to stop strategy execution
tradingStrategySchema.methods.stop = function() {
  this.status = 'stopped';
  this.stoppedAt = new Date();
  return this.save();
};

// Method to pause strategy execution
tradingStrategySchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

// Method to add a trade
tradingStrategySchema.methods.addTrade = function(tradeData) {
  this.trades.push(tradeData);
  this.performance.totalTrades++;
  
  if (tradeData.profit > 0) {
    this.performance.winningTrades++;
    this.performance.totalProfit += tradeData.profit;
  } else {
    this.performance.losingTrades++;
    this.performance.totalLoss += Math.abs(tradeData.profit);
  }
  
  // Update performance metrics
  this.updatePerformanceMetrics();
  return this.save();
};

// Method to update performance metrics
tradingStrategySchema.methods.updatePerformanceMetrics = function() {
  if (this.performance.totalTrades > 0) {
    this.performance.winRate = (this.performance.winningTrades / this.performance.totalTrades) * 100;
  }
  
  if (this.performance.totalLoss > 0) {
    this.performance.profitFactor = this.performance.totalProfit / this.performance.totalLoss;
  }
};

// Method to add execution log
tradingStrategySchema.methods.addLog = function(level, message, data = null) {
  this.executionLogs.push({
    level,
    message,
    data,
    timestamp: new Date()
  });
  
  // Keep only last 1000 logs
  if (this.executionLogs.length > 1000) {
    this.executionLogs = this.executionLogs.slice(-1000);
  }
  
  return this.save();
};

// Method to check if strategy can be executed (based on subscription)
tradingStrategySchema.methods.canExecute = async function() {
  await this.populate('user');
  return await this.user.hasActiveSubscription();
};

// Virtual for net profit
tradingStrategySchema.virtual('netProfit').get(function() {
  return this.performance.totalProfit - this.performance.totalLoss;
});

// Virtual for strategy uptime
tradingStrategySchema.virtual('uptime').get(function() {
  if (!this.startedAt) return 0;
  const endTime = this.stoppedAt || new Date();
  return endTime - this.startedAt;
});

// Include virtuals when converting to JSON
tradingStrategySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('TradingStrategy', tradingStrategySchema);
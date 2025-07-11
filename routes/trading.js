const express = require('express');
const TradingStrategy = require('../models/TradingStrategy');
const { 
  verifyToken, 
  requireActiveSubscription, 
  checkStrategyLimit,
  requirePlan 
} = require('../middleware/auth');

const router = express.Router();

// Get all user strategies
router.get('/strategies', verifyToken, async (req, res) => {
  try {
    const strategies = await TradingStrategy.find({ 
      user: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({ strategies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// Get single strategy by ID
router.get('/strategies/:id', verifyToken, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({ strategy });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
});

// Create new trading strategy
router.post('/strategies', verifyToken, requireActiveSubscription, checkStrategyLimit, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      parameters
    } = req.body;

    // Validate required fields
    if (!name || !type || !parameters?.symbol || !parameters?.capital) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, type, symbol, and capital are required' 
      });
    }

    // Validate strategy type
    const validTypes = ['momentum', 'mean_reversion', 'arbitrage', 'scalping', 'swing', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid strategy type' });
    }

    // Check if user has permission for advanced features
    if (type === 'arbitrage' && !req.user.subscription.features.advancedAnalytics) {
      return res.status(403).json({ 
        error: 'Arbitrage strategies require Pro plan or higher' 
      });
    }

    const strategy = new TradingStrategy({
      user: req.user._id,
      name,
      description,
      type,
      parameters: {
        symbol: parameters.symbol.toUpperCase(),
        timeframe: parameters.timeframe || '1h',
        capital: parameters.capital,
        riskPerTrade: parameters.riskPerTrade || 2,
        stopLoss: parameters.stopLoss,
        takeProfit: parameters.takeProfit,
        maxDailyTrades: parameters.maxDailyTrades || 10
      }
    });

    await strategy.save();
    await strategy.addLog('info', 'Strategy created successfully');

    res.status(201).json({ 
      message: 'Strategy created successfully',
      strategy 
    });

  } catch (error) {
    console.error('Strategy creation error:', error);
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

// Update trading strategy
router.put('/strategies/:id', verifyToken, requireActiveSubscription, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Don't allow updates while strategy is running
    if (strategy.status === 'active') {
      return res.status(400).json({ 
        error: 'Cannot update strategy while it is running. Please stop the strategy first.' 
      });
    }

    const { name, description, parameters } = req.body;

    if (name) strategy.name = name;
    if (description) strategy.description = description;
    if (parameters) {
      Object.keys(parameters).forEach(key => {
        if (parameters[key] !== undefined) {
          strategy.parameters[key] = parameters[key];
        }
      });
    }

    await strategy.save();
    await strategy.addLog('info', 'Strategy updated successfully');

    res.json({ 
      message: 'Strategy updated successfully',
      strategy 
    });

  } catch (error) {
    console.error('Strategy update error:', error);
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

// Start trading strategy
router.post('/strategies/:id/start', verifyToken, requireActiveSubscription, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (strategy.status === 'active') {
      return res.status(400).json({ error: 'Strategy is already running' });
    }

    // Check if user can execute this strategy based on subscription
    const canExecute = await strategy.canExecute();
    if (!canExecute) {
      return res.status(403).json({ 
        error: 'Active subscription required to execute strategies' 
      });
    }

    // Check running strategies limit based on plan
    const runningStrategies = await TradingStrategy.countDocuments({
      user: req.user._id,
      status: 'active'
    });

    const maxRunningStrategies = req.user.subscription.features.maxStrategies === -1 
      ? Infinity 
      : req.user.subscription.features.maxStrategies;

    if (runningStrategies >= maxRunningStrategies) {
      return res.status(403).json({
        error: 'Strategy limit reached',
        message: `Your ${req.user.subscription.plan} plan allows up to ${maxRunningStrategies} running strategies.`
      });
    }

    await strategy.start();
    await strategy.addLog('info', 'Strategy started by user');

    // Here you would typically start the actual trading logic
    // For now, we'll just mark it as started
    console.log(`Strategy ${strategy.name} started for user ${req.user.email}`);

    res.json({ 
      message: 'Strategy started successfully',
      strategy 
    });

  } catch (error) {
    console.error('Strategy start error:', error);
    res.status(500).json({ error: 'Failed to start strategy' });
  }
});

// Stop trading strategy
router.post('/strategies/:id/stop', verifyToken, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (strategy.status === 'stopped') {
      return res.status(400).json({ error: 'Strategy is already stopped' });
    }

    await strategy.stop();
    await strategy.addLog('info', 'Strategy stopped by user');

    // Here you would typically stop the actual trading logic
    console.log(`Strategy ${strategy.name} stopped for user ${req.user.email}`);

    res.json({ 
      message: 'Strategy stopped successfully',
      strategy 
    });

  } catch (error) {
    console.error('Strategy stop error:', error);
    res.status(500).json({ error: 'Failed to stop strategy' });
  }
});

// Pause trading strategy
router.post('/strategies/:id/pause', verifyToken, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (strategy.status !== 'active') {
      return res.status(400).json({ error: 'Can only pause active strategies' });
    }

    await strategy.pause();
    await strategy.addLog('info', 'Strategy paused by user');

    res.json({ 
      message: 'Strategy paused successfully',
      strategy 
    });

  } catch (error) {
    console.error('Strategy pause error:', error);
    res.status(500).json({ error: 'Failed to pause strategy' });
  }
});

// Delete trading strategy
router.delete('/strategies/:id', verifyToken, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Stop strategy if it's running
    if (strategy.status === 'active') {
      await strategy.stop();
    }

    // Soft delete by marking as inactive
    strategy.isActive = false;
    await strategy.save();
    await strategy.addLog('info', 'Strategy deleted by user');

    res.json({ message: 'Strategy deleted successfully' });

  } catch (error) {
    console.error('Strategy deletion error:', error);
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

// Get strategy performance
router.get('/strategies/:id/performance', verifyToken, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const performance = {
      ...strategy.performance.toObject(),
      netProfit: strategy.netProfit,
      uptime: strategy.uptime,
      recentTrades: strategy.trades.slice(-10) // Last 10 trades
    };

    res.json({ performance });

  } catch (error) {
    console.error('Performance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Get strategy execution logs
router.get('/strategies/:id/logs', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    
    const logs = strategy.executionLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(startIndex, endIndex);

    res.json({ 
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: strategy.executionLogs.length
      }
    });

  } catch (error) {
    console.error('Logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch execution logs' });
  }
});

// Backtest strategy (Pro feature)
router.post('/strategies/:id/backtest', verifyToken, requireActiveSubscription, requirePlan('pro'), async (req, res) => {
  try {
    const { startDate, endDate, initialCapital } = req.body;
    
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Basic backtest simulation (in real implementation, this would be more complex)
    const backtestResults = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital: initialCapital,
      finalCapital: initialCapital * (1 + Math.random() * 0.4 - 0.1), // Random result for demo
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: Math.random() * 0.2,
      maxDrawdown: Math.random() * 0.15,
      sharpeRatio: Math.random() * 2,
      trades: Math.floor(Math.random() * 100) + 10
    };

    backtestResults.totalReturn = (backtestResults.finalCapital - backtestResults.initialCapital) / backtestResults.initialCapital;
    backtestResults.annualizedReturn = backtestResults.totalReturn * (365 / 
      Math.max(1, (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));

    strategy.backtestResults = backtestResults;
    strategy.isBacktested = true;
    await strategy.save();
    await strategy.addLog('info', 'Backtest completed');

    res.json({ 
      message: 'Backtest completed successfully',
      results: backtestResults 
    });

  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({ error: 'Failed to perform backtest' });
  }
});

// Get market data (Premium feature for real-time data)
router.get('/market/:symbol', verifyToken, requireActiveSubscription, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Check if user has real-time data access
    const hasRealTimeData = req.user.subscription.features.realTimeData;
    
    // Mock market data (in real implementation, you'd fetch from market data provider)
    const marketData = {
      symbol: symbol.toUpperCase(),
      price: Math.random() * 1000 + 100,
      change: Math.random() * 20 - 10,
      changePercent: Math.random() * 4 - 2,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date(),
      isRealTime: hasRealTimeData
    };

    if (!hasRealTimeData) {
      // Add 15-minute delay for basic plans
      marketData.timestamp = new Date(Date.now() - 15 * 60 * 1000);
      marketData.delayed = true;
    }

    res.json({ marketData });

  } catch (error) {
    console.error('Market data error:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Get user's strategy limits and usage
router.get('/limits', verifyToken, async (req, res) => {
  try {
    if (!req.user.subscription) {
      return res.json({
        hasSubscription: false,
        message: 'No active subscription'
      });
    }

    const totalStrategies = await TradingStrategy.countDocuments({
      user: req.user._id,
      isActive: true
    });

    const activeStrategies = await TradingStrategy.countDocuments({
      user: req.user._id,
      status: 'active'
    });

    const limits = {
      hasSubscription: true,
      plan: req.user.subscription.plan,
      features: req.user.subscription.features,
      usage: {
        totalStrategies,
        activeStrategies,
        maxStrategies: req.user.subscription.features.maxStrategies
      },
      subscriptionStatus: {
        status: req.user.subscription.status,
        endDate: req.user.subscription.endDate,
        daysUntilExpiration: req.user.subscription.daysUntilExpiration
      }
    };

    res.json({ limits });

  } catch (error) {
    console.error('Limits fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

module.exports = router;
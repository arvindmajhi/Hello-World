const express = require('express');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const TradingStrategy = require('../models/TradingStrategy');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get user dashboard data
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Get user's strategies
    const strategies = await TradingStrategy.find({ 
      user: req.user._id,
      isActive: true 
    });

    // Calculate strategy statistics
    const strategyStats = {
      total: strategies.length,
      active: strategies.filter(s => s.status === 'active').length,
      paused: strategies.filter(s => s.status === 'paused').length,
      stopped: strategies.filter(s => s.status === 'stopped').length
    };

    // Calculate performance statistics
    const performanceStats = strategies.reduce((acc, strategy) => {
      acc.totalTrades += strategy.performance.totalTrades;
      acc.totalProfit += strategy.performance.totalProfit;
      acc.totalLoss += strategy.performance.totalLoss;
      acc.winningTrades += strategy.performance.winningTrades;
      acc.losingTrades += strategy.performance.losingTrades;
      return acc;
    }, {
      totalTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      winningTrades: 0,
      losingTrades: 0,
      netProfit: 0,
      winRate: 0
    });

    performanceStats.netProfit = performanceStats.totalProfit - performanceStats.totalLoss;
    performanceStats.winRate = performanceStats.totalTrades > 0 
      ? (performanceStats.winningTrades / performanceStats.totalTrades) * 100 
      : 0;

    // Get subscription info
    const subscription = req.user.subscription ? {
      plan: req.user.subscription.plan,
      status: req.user.subscription.status,
      endDate: req.user.subscription.endDate,
      daysUntilExpiration: req.user.subscription.daysUntilExpiration,
      features: req.user.subscription.features
    } : null;

    // Get recent activity (last 5 strategy logs)
    const recentActivity = [];
    strategies.forEach(strategy => {
      const recentLogs = strategy.executionLogs
        .slice(-5)
        .map(log => ({
          strategyName: strategy.name,
          strategyId: strategy._id,
          level: log.level,
          message: log.message,
          timestamp: log.timestamp
        }));
      recentActivity.push(...recentLogs);
    });

    recentActivity.sort((a, b) => b.timestamp - a.timestamp);
    const limitedActivity = recentActivity.slice(0, 10);

    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName,
        lastLogin: req.user.lastLogin
      },
      subscription,
      strategies: strategyStats,
      performance: performanceStats,
      recentActivity: limitedActivity
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get user statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get strategies created in the period
    const strategies = await TradingStrategy.find({
      user: req.user._id,
      isActive: true,
      createdAt: { $gte: startDate }
    });

    // Calculate daily performance data
    const dailyData = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.ceil((now - startDate) / msPerDay);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * msPerDay);
      const dayEnd = new Date(date.getTime() + msPerDay);

      let dayProfit = 0;
      let dayTrades = 0;

      strategies.forEach(strategy => {
        const dayTrades = strategy.trades.filter(trade => 
          trade.entryTime >= date && trade.entryTime < dayEnd
        );
        
        dayTrades.forEach(trade => {
          dayProfit += trade.profit || 0;
          dayTrades++;
        });
      });

      dailyData.push({
        date: date.toISOString().split('T')[0],
        profit: dayProfit,
        trades: dayTrades
      });
    }

    // Strategy type distribution
    const strategyTypes = {};
    strategies.forEach(strategy => {
      strategyTypes[strategy.type] = (strategyTypes[strategy.type] || 0) + 1;
    });

    // Performance by strategy
    const strategyPerformance = strategies.map(strategy => ({
      id: strategy._id,
      name: strategy.name,
      type: strategy.type,
      status: strategy.status,
      netProfit: strategy.netProfit,
      winRate: strategy.performance.winRate,
      totalTrades: strategy.performance.totalTrades,
      uptime: strategy.uptime
    }));

    res.json({
      period,
      dateRange: { start: startDate, end: now },
      dailyPerformance: dailyData,
      strategyTypes,
      strategyPerformance,
      summary: {
        totalStrategies: strategies.length,
        totalProfit: strategies.reduce((sum, s) => sum + s.netProfit, 0),
        totalTrades: strategies.reduce((sum, s) => sum + s.performance.totalTrades, 0),
        averageWinRate: strategies.length > 0 
          ? strategies.reduce((sum, s) => sum + s.performance.winRate, 0) / strategies.length 
          : 0
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get user account activity
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get all user's strategies to collect logs
    const strategies = await TradingStrategy.find({
      user: req.user._id,
      isActive: true
    });

    // Collect all logs
    const allLogs = [];
    strategies.forEach(strategy => {
      strategy.executionLogs.forEach(log => {
        allLogs.push({
          ...log.toObject(),
          strategyName: strategy.name,
          strategyId: strategy._id,
          type: 'strategy'
        });
      });
    });

    // Add subscription activity if available
    if (req.user.subscription) {
      req.user.subscription.paymentHistory.forEach(payment => {
        allLogs.push({
          timestamp: payment.date,
          level: payment.status === 'succeeded' ? 'info' : 'error',
          message: `Payment ${payment.status}: $${payment.amount}`,
          type: 'subscription',
          data: payment
        });
      });
    }

    // Sort by timestamp (newest first)
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const paginatedLogs = allLogs.slice(skip, skip + parseInt(limit));
    const total = allLogs.length;

    res.json({
      activity: paginatedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get user preferences
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    // For now, return default preferences
    // In a real app, you'd store these in the user model
    const preferences = {
      notifications: {
        email: true,
        sms: false,
        push: true,
        tradingAlerts: true,
        subscriptionAlerts: true
      },
      trading: {
        defaultTimeframe: '1h',
        defaultRiskPerTrade: 2,
        autoStopOnLoss: false,
        maxDailyLoss: 1000
      },
      ui: {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC'
      }
    };

    res.json({ preferences });

  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const { preferences } = req.body;

    // In a real app, you'd save these to the user model
    // For now, just return success
    console.log('User preferences updated:', preferences);

    res.json({ 
      message: 'Preferences updated successfully',
      preferences 
    });

  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Delete user account
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ 
        error: 'Please provide confirmation text: DELETE_MY_ACCOUNT' 
      });
    }

    // Stop all active strategies
    await TradingStrategy.updateMany(
      { user: req.user._id, status: 'active' },
      { status: 'stopped', stoppedAt: new Date() }
    );

    // Cancel subscription if active
    if (req.user.subscription) {
      const subscription = await Subscription.findById(req.user.subscription);
      if (subscription && subscription.status === 'active') {
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = 'Account deletion';
        await subscription.save();
      }
    }

    // Deactivate user account (soft delete)
    await User.findByIdAndUpdate(req.user._id, {
      isActive: false,
      email: `deleted_${Date.now()}@deleted.com`,
      username: `deleted_${Date.now()}`
    });

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Export user data (GDPR compliance)
router.get('/export', verifyToken, async (req, res) => {
  try {
    // Get user data
    const user = await User.findById(req.user._id)
      .populate('subscription')
      .select('-password');

    // Get user's strategies
    const strategies = await TradingStrategy.find({
      user: req.user._id
    });

    const exportData = {
      user: user.toObject(),
      strategies: strategies.map(s => s.toObject()),
      exportDate: new Date(),
      exportVersion: '1.0'
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="trading-data-${user.username}-${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json(exportData);

  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
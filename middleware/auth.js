const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).populate('subscription');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Check if user has active subscription
const requireActiveSubscription = async (req, res, next) => {
  try {
    const hasActiveSubscription = await req.user.hasActiveSubscription();
    
    if (!hasActiveSubscription) {
      return res.status(403).json({ 
        error: 'Active subscription required',
        message: 'You need an active subscription to access this feature.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking subscription status.' });
  }
};

// Check subscription plan level
const requirePlan = (requiredPlan) => {
  const planHierarchy = ['basic', 'premium', 'pro', 'enterprise'];
  
  return async (req, res, next) => {
    try {
      if (!req.user.subscription) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: 'You need a subscription to access this feature.'
        });
      }

      const userPlanIndex = planHierarchy.indexOf(req.user.subscription.plan);
      const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);

      if (userPlanIndex < requiredPlanIndex) {
        return res.status(403).json({ 
          error: 'Plan upgrade required',
          message: `You need at least a ${requiredPlan} plan to access this feature.`,
          currentPlan: req.user.subscription.plan,
          requiredPlan
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error checking plan requirements.' });
    }
  };
};

// Check if user can create more strategies based on plan
const checkStrategyLimit = async (req, res, next) => {
  try {
    if (!req.user.subscription) {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'You need a subscription to create trading strategies.'
      });
    }

    const TradingStrategy = require('../models/TradingStrategy');
    const userStrategies = await TradingStrategy.countDocuments({ 
      user: req.user._id, 
      isActive: true 
    });

    const maxStrategies = req.user.subscription.features.maxStrategies;
    
    // -1 means unlimited (enterprise plan)
    if (maxStrategies !== -1 && userStrategies >= maxStrategies) {
      return res.status(403).json({ 
        error: 'Strategy limit reached',
        message: `Your ${req.user.subscription.plan} plan allows up to ${maxStrategies} strategies.`,
        currentCount: userStrategies,
        maxAllowed: maxStrategies
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking strategy limits.' });
  }
};

// Optional authentication - don't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).populate('subscription');
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  verifyToken,
  requireActiveSubscription,
  requirePlan,
  checkStrategyLimit,
  optionalAuth
};
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['basic', 'premium', 'pro', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due', 'trialing'],
    default: 'active'
  },
  stripeSubscriptionId: {
    type: String,
    required: false
  },
  stripePriceId: {
    type: String,
    required: false
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  features: {
    maxStrategies: {
      type: Number,
      default: 1
    },
    realTimeData: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    }
  },
  paymentHistory: [{
    date: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'pending']
    },
    stripePaymentIntentId: String
  }],
  renewalAttempts: {
    type: Number,
    default: 0
  },
  lastRenewalAttempt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
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
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if subscription is currently active
subscriptionSchema.methods.isCurrentlyActive = function() {
  return this.status === 'active' && this.endDate > new Date();
};

// Method to check if subscription is expired
subscriptionSchema.methods.isExpired = function() {
  return this.endDate <= new Date();
};

// Method to calculate renewal date
subscriptionSchema.methods.calculateRenewalDate = function() {
  const currentEnd = new Date(this.endDate);
  if (this.billingCycle === 'yearly') {
    currentEnd.setFullYear(currentEnd.getFullYear() + 1);
  } else {
    currentEnd.setMonth(currentEnd.getMonth() + 1);
  }
  return currentEnd;
};

// Method to get plan features by plan type
subscriptionSchema.statics.getPlanFeatures = function(planType) {
  const planFeatures = {
    basic: {
      maxStrategies: 1,
      realTimeData: false,
      advancedAnalytics: false,
      apiAccess: false,
      prioritySupport: false
    },
    premium: {
      maxStrategies: 3,
      realTimeData: true,
      advancedAnalytics: false,
      apiAccess: false,
      prioritySupport: false
    },
    pro: {
      maxStrategies: 10,
      realTimeData: true,
      advancedAnalytics: true,
      apiAccess: true,
      prioritySupport: false
    },
    enterprise: {
      maxStrategies: -1, // unlimited
      realTimeData: true,
      advancedAnalytics: true,
      apiAccess: true,
      prioritySupport: true
    }
  };
  
  return planFeatures[planType] || planFeatures.basic;
};

// Method to get plan pricing
subscriptionSchema.statics.getPlanPricing = function(planType, billingCycle = 'monthly') {
  const pricing = {
    basic: { monthly: 9.99, yearly: 99.99 },
    premium: { monthly: 19.99, yearly: 199.99 },
    pro: { monthly: 49.99, yearly: 499.99 },
    enterprise: { monthly: 99.99, yearly: 999.99 }
  };
  
  return pricing[planType]?.[billingCycle] || pricing.basic.monthly;
};

// Virtual to check days until expiration
subscriptionSchema.virtual('daysUntilExpiration').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Include virtuals when converting to JSON
subscriptionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
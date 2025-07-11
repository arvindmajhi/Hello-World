const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { verifyToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get subscription plans and pricing
router.get('/plans', optionalAuth, async (req, res) => {
  try {
    const plans = [
      {
        id: 'basic',
        name: 'Basic',
        description: 'Perfect for beginners',
        features: Subscription.getPlanFeatures('basic'),
        pricing: {
          monthly: Subscription.getPlanPricing('basic', 'monthly'),
          yearly: Subscription.getPlanPricing('basic', 'yearly')
        }
      },
      {
        id: 'premium',
        name: 'Premium', 
        description: 'For active traders',
        features: Subscription.getPlanFeatures('premium'),
        pricing: {
          monthly: Subscription.getPlanPricing('premium', 'monthly'),
          yearly: Subscription.getPlanPricing('premium', 'yearly')
        }
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'Advanced trading tools',
        features: Subscription.getPlanFeatures('pro'),
        pricing: {
          monthly: Subscription.getPlanPricing('pro', 'monthly'),
          yearly: Subscription.getPlanPricing('pro', 'yearly')
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Full platform access',
        features: Subscription.getPlanFeatures('enterprise'),
        pricing: {
          monthly: Subscription.getPlanPricing('enterprise', 'monthly'),
          yearly: Subscription.getPlanPricing('enterprise', 'yearly')
        }
      }
    ];

    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Get current user subscription
router.get('/current', verifyToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      user: req.user._id 
    }).populate('user', '-password');

    if (!subscription) {
      return res.json({ subscription: null });
    }

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create new subscription
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly', paymentMethodId } = req.body;

    // Validate plan
    const validPlans = ['basic', 'premium', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    // Check if user already has active subscription
    const existingSubscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (existingSubscription) {
      return res.status(400).json({ error: 'User already has an active subscription' });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = req.user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.fullName,
        metadata: {
          userId: req.user._id.toString()
        }
      });
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(req.user._id, {
        stripeCustomerId: stripeCustomerId
      });
    }

    // Get pricing
    const price = Subscription.getPlanPricing(plan, billingCycle);
    
    // Create subscription in Stripe
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            description: `${plan} subscription plan`
          },
          unit_amount: Math.round(price * 100), // Convert to cents
          recurring: {
            interval: billingCycle === 'yearly' ? 'year' : 'month'
          }
        }
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: req.user._id.toString(),
        plan: plan
      }
    });

    // Calculate end date
    const endDate = new Date();
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription in database
    const subscription = new Subscription({
      user: req.user._id,
      plan,
      billingCycle,
      price,
      endDate,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0].price.id,
      features: Subscription.getPlanFeatures(plan),
      status: 'active'
    });

    await subscription.save();

    // Update user subscription reference
    await User.findByIdAndUpdate(req.user._id, {
      subscription: subscription._id
    });

    res.json({
      subscription,
      clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret
    });

  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Cancel subscription
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const { immediate = false } = req.body;

    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (immediate) {
      // Cancel immediately
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.del(subscription.stripeSubscriptionId);
      }
      
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.endDate = new Date(); // End immediately
    } else {
      // Cancel at period end
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }
      
      subscription.autoRenew = false;
      subscription.cancelledAt = new Date();
    }

    await subscription.save();

    res.json({ 
      message: immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end',
      subscription 
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Renew subscription manually
router.post('/renew', verifyToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (subscription.status === 'active' && !subscription.isExpired()) {
      return res.status(400).json({ error: 'Subscription is already active' });
    }

    // Calculate new end date
    const newEndDate = subscription.calculateRenewalDate();
    
    // Create payment intent for renewal
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(subscription.price * 100),
      currency: 'usd',
      customer: req.user.stripeCustomerId,
      metadata: {
        subscriptionId: subscription._id.toString(),
        userId: req.user._id.toString(),
        type: 'renewal'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      subscription,
      newEndDate
    });

  } catch (error) {
    console.error('Subscription renewal error:', error);
    res.status(500).json({ error: 'Failed to renew subscription' });
  }
});

// Update subscription plan
router.put('/upgrade', verifyToken, async (req, res) => {
  try {
    const { newPlan } = req.body;

    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const validPlans = ['basic', 'premium', 'pro', 'enterprise'];
    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    // Check if it's actually an upgrade
    const planHierarchy = ['basic', 'premium', 'pro', 'enterprise'];
    const currentPlanIndex = planHierarchy.indexOf(subscription.plan);
    const newPlanIndex = planHierarchy.indexOf(newPlan);

    if (newPlanIndex <= currentPlanIndex) {
      return res.status(400).json({ error: 'Can only upgrade to higher tier plans' });
    }

    // Update subscription in Stripe
    if (subscription.stripeSubscriptionId) {
      const newPrice = Subscription.getPlanPricing(newPlan, subscription.billingCycle);
      
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
          id: subscription.stripePriceId,
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)} Plan`
            },
            unit_amount: Math.round(newPrice * 100),
            recurring: {
              interval: subscription.billingCycle === 'yearly' ? 'year' : 'month'
            }
          }
        }],
        proration_behavior: 'create_prorations'
      });
    }

    // Update subscription in database
    subscription.plan = newPlan;
    subscription.price = Subscription.getPlanPricing(newPlan, subscription.billingCycle);
    subscription.features = Subscription.getPlanFeatures(newPlan);
    
    await subscription.save();

    res.json({ 
      message: 'Subscription upgraded successfully',
      subscription 
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Webhook for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Helper functions for webhook handlers
async function handleSuccessfulPayment(invoice) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription
  });

  if (subscription) {
    subscription.status = 'active';
    subscription.paymentHistory.push({
      date: new Date(),
      amount: invoice.amount_paid / 100,
      status: 'succeeded',
      stripePaymentIntentId: invoice.payment_intent
    });
    
    // Reset renewal attempts on successful payment
    subscription.renewalAttempts = 0;
    
    await subscription.save();
  }
}

async function handleFailedPayment(invoice) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription
  });

  if (subscription) {
    subscription.status = 'past_due';
    subscription.renewalAttempts += 1;
    subscription.lastRenewalAttempt = new Date();
    
    subscription.paymentHistory.push({
      date: new Date(),
      amount: invoice.amount_due / 100,
      status: 'failed',
      stripePaymentIntentId: invoice.payment_intent
    });

    await subscription.save();
  }
}

async function handleSubscriptionDeleted(stripeSubscription) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id
  });

  if (subscription) {
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();
  }
}

module.exports = router;
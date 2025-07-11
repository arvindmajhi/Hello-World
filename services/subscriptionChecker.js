const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const TradingStrategy = require('../models/TradingStrategy');
const User = require('../models/User');

class SubscriptionChecker {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Subscription checker is already running');
      return;
    }

    console.log('Starting subscription checker service...');
    
    // Run every hour
    this.hourlyCheck = cron.schedule('0 * * * *', async () => {
      await this.checkExpiredSubscriptions();
    });

    // Run every day at midnight to check for renewals
    this.dailyCheck = cron.schedule('0 0 * * *', async () => {
      await this.checkRenewalReminders();
      await this.cleanupExpiredSubscriptions();
    });

    // Run every 5 minutes to check for failed payments
    this.paymentCheck = cron.schedule('*/5 * * * *', async () => {
      await this.checkFailedPayments();
    });

    this.isRunning = true;
    console.log('Subscription checker service started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Subscription checker is not running');
      return;
    }

    console.log('Stopping subscription checker service...');
    
    if (this.hourlyCheck) this.hourlyCheck.stop();
    if (this.dailyCheck) this.dailyCheck.stop();
    if (this.paymentCheck) this.paymentCheck.stop();

    this.isRunning = false;
    console.log('Subscription checker service stopped');
  }

  async checkExpiredSubscriptions() {
    try {
      console.log('Checking for expired subscriptions...');
      
      const now = new Date();
      const expiredSubscriptions = await Subscription.find({
        endDate: { $lt: now },
        status: { $in: ['active', 'past_due'] }
      }).populate('user');

      for (const subscription of expiredSubscriptions) {
        console.log(`Processing expired subscription: ${subscription._id} for user: ${subscription.user.email}`);
        
        // Mark subscription as expired
        subscription.status = 'expired';
        await subscription.save();

        // Stop all active strategies for this user
        const activeStrategies = await TradingStrategy.find({
          user: subscription.user._id,
          status: 'active'
        });

        for (const strategy of activeStrategies) {
          await strategy.stop();
          await strategy.addLog('warning', 'Strategy stopped due to expired subscription');
          console.log(`Stopped strategy: ${strategy.name} for user: ${subscription.user.email}`);
        }

        // Log the expiration
        console.log(`Subscription expired for user: ${subscription.user.email}, stopped ${activeStrategies.length} strategies`);
        
        // In a real application, you would send an email notification here
        await this.sendExpirationNotification(subscription.user, subscription);
      }

      if (expiredSubscriptions.length > 0) {
        console.log(`Processed ${expiredSubscriptions.length} expired subscriptions`);
      }

    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
    }
  }

  async checkRenewalReminders() {
    try {
      console.log('Checking for renewal reminders...');
      
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Find subscriptions expiring in 3 days
      const expiringSoon = await Subscription.find({
        endDate: { 
          $gte: new Date(),
          $lte: threeDaysFromNow 
        },
        status: 'active',
        autoRenew: false // Only for manual renewals
      }).populate('user');

      // Find subscriptions expiring in 7 days
      const expiringInWeek = await Subscription.find({
        endDate: { 
          $gte: threeDaysFromNow,
          $lte: sevenDaysFromNow 
        },
        status: 'active',
        autoRenew: false
      }).populate('user');

      // Send 3-day reminders
      for (const subscription of expiringSoon) {
        await this.sendRenewalReminder(subscription.user, subscription, 3);
        console.log(`Sent 3-day renewal reminder to: ${subscription.user.email}`);
      }

      // Send 7-day reminders
      for (const subscription of expiringInWeek) {
        await this.sendRenewalReminder(subscription.user, subscription, 7);
        console.log(`Sent 7-day renewal reminder to: ${subscription.user.email}`);
      }

      const totalReminders = expiringSoon.length + expiringInWeek.length;
      if (totalReminders > 0) {
        console.log(`Sent ${totalReminders} renewal reminders`);
      }

    } catch (error) {
      console.error('Error checking renewal reminders:', error);
    }
  }

  async checkFailedPayments() {
    try {
      const subscriptionsWithFailedPayments = await Subscription.find({
        status: 'past_due',
        renewalAttempts: { $lt: 3 } // Max 3 retry attempts
      }).populate('user');

      for (const subscription of subscriptionsWithFailedPayments) {
        const lastAttempt = subscription.lastRenewalAttempt;
        const now = new Date();
        
        // Retry every 24 hours
        if (!lastAttempt || (now - lastAttempt) >= 24 * 60 * 60 * 1000) {
          await this.retryPayment(subscription);
        }
      }

      // Cancel subscriptions that failed after 3 attempts
      const failedSubscriptions = await Subscription.find({
        status: 'past_due',
        renewalAttempts: { $gte: 3 }
      }).populate('user');

      for (const subscription of failedSubscriptions) {
        console.log(`Cancelling subscription after 3 failed payment attempts: ${subscription.user.email}`);
        
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = 'Failed payments';
        await subscription.save();

        // Stop all active strategies
        await this.stopUserStrategies(subscription.user._id);
        
        // Send cancellation notification
        await this.sendCancellationNotification(subscription.user, subscription);
      }

    } catch (error) {
      console.error('Error checking failed payments:', error);
    }
  }

  async retryPayment(subscription) {
    try {
      console.log(`Retrying payment for subscription: ${subscription._id}`);
      
      // In a real implementation, you would use Stripe to retry the payment
      // For now, we'll simulate a payment attempt
      const paymentSuccessful = Math.random() > 0.5; // 50% success rate for demo
      
      subscription.renewalAttempts += 1;
      subscription.lastRenewalAttempt = new Date();

      if (paymentSuccessful) {
        console.log(`Payment retry successful for subscription: ${subscription._id}`);
        
        subscription.status = 'active';
        subscription.renewalAttempts = 0;
        subscription.endDate = subscription.calculateRenewalDate();
        
        subscription.paymentHistory.push({
          date: new Date(),
          amount: subscription.price,
          status: 'succeeded'
        });
        
        console.log(`Subscription renewed successfully for user: ${subscription.user.email}`);
      } else {
        console.log(`Payment retry failed for subscription: ${subscription._id}, attempt ${subscription.renewalAttempts}`);
        
        subscription.paymentHistory.push({
          date: new Date(),
          amount: subscription.price,
          status: 'failed'
        });
      }

      await subscription.save();

    } catch (error) {
      console.error('Error retrying payment:', error);
    }
  }

  async stopUserStrategies(userId) {
    try {
      const activeStrategies = await TradingStrategy.find({
        user: userId,
        status: 'active'
      });

      for (const strategy of activeStrategies) {
        await strategy.stop();
        await strategy.addLog('warning', 'Strategy stopped due to subscription cancellation');
      }

      console.log(`Stopped ${activeStrategies.length} strategies for user: ${userId}`);
    } catch (error) {
      console.error('Error stopping user strategies:', error);
    }
  }

  async cleanupExpiredSubscriptions() {
    try {
      console.log('Cleaning up old expired subscriptions...');
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Archive subscriptions that have been expired for more than 6 months
      const oldExpiredSubscriptions = await Subscription.find({
        status: 'expired',
        endDate: { $lt: sixMonthsAgo }
      });

      console.log(`Found ${oldExpiredSubscriptions.length} old expired subscriptions to archive`);

      // In a real application, you might move these to an archive collection
      // For now, we'll just log the cleanup
      for (const subscription of oldExpiredSubscriptions) {
        console.log(`Archiving old subscription: ${subscription._id}`);
        // subscription.archived = true;
        // await subscription.save();
      }

    } catch (error) {
      console.error('Error cleaning up expired subscriptions:', error);
    }
  }

  async sendExpirationNotification(user, subscription) {
    try {
      // In a real application, you would send an actual email
      console.log(`[EMAIL] Subscription expired notification sent to: ${user.email}`);
      console.log(`Subject: Your ${subscription.plan} subscription has expired`);
      console.log(`Plan: ${subscription.plan}`);
      console.log(`Expired on: ${subscription.endDate}`);
      
      // You would integrate with an email service like SendGrid, Mailgun, etc.
    } catch (error) {
      console.error('Error sending expiration notification:', error);
    }
  }

  async sendRenewalReminder(user, subscription, daysUntilExpiration) {
    try {
      console.log(`[EMAIL] Renewal reminder sent to: ${user.email}`);
      console.log(`Subject: Your ${subscription.plan} subscription expires in ${daysUntilExpiration} days`);
      console.log(`Plan: ${subscription.plan}`);
      console.log(`Expires on: ${subscription.endDate}`);
      console.log(`Price: $${subscription.price}`);
      
      // You would integrate with an email service here
    } catch (error) {
      console.error('Error sending renewal reminder:', error);
    }
  }

  async sendCancellationNotification(user, subscription) {
    try {
      console.log(`[EMAIL] Subscription cancelled notification sent to: ${user.email}`);
      console.log(`Subject: Your ${subscription.plan} subscription has been cancelled`);
      console.log(`Reason: ${subscription.cancellationReason}`);
      console.log(`Cancelled on: ${subscription.cancelledAt}`);
      
      // You would integrate with an email service here
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checks: {
        hourly: this.hourlyCheck ? 'running' : 'stopped',
        daily: this.dailyCheck ? 'running' : 'stopped',
        payment: this.paymentCheck ? 'running' : 'stopped'
      }
    };
  }
}

// Create singleton instance
const subscriptionChecker = new SubscriptionChecker();

module.exports = subscriptionChecker;
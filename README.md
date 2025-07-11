# Trading Platform with Subscription Management

A comprehensive trading platform with subscription-based access control, strategy execution, and automated billing management.

## Features

### 🔐 Subscription Management
- **Multiple Plan Tiers**: Basic, Premium, Pro, Enterprise
- **Flexible Billing**: Monthly and yearly billing cycles
- **Stripe Integration**: Secure payment processing and webhooks
- **Automatic Renewal**: Background service for subscription monitoring
- **Grace Period**: Handle failed payments with retry logic

### 📈 Trading Strategy Execution
- **Strategy Types**: Momentum, Mean Reversion, Arbitrage, Scalping, Swing, Custom
- **Real-time Control**: Start, stop, and pause strategies based on subscription status
- **Performance Tracking**: Comprehensive analytics and trade history
- **Plan-based Limits**: Strategy count and feature access based on subscription tier
- **Backtest Support**: Historical strategy testing (Pro+ feature)

### 🚫 Access Control
- **Subscription-based Access**: Features locked behind subscription tiers
- **Automatic Strategy Stopping**: Strategies halt when subscriptions expire
- **Plan Enforcement**: Real-time validation of feature access
- **Grace Period**: Temporary access during payment issues

### 📊 Analytics & Monitoring
- **Performance Metrics**: Win rate, profit factor, Sharpe ratio
- **Real-time Monitoring**: Live strategy execution logs
- **Dashboard**: Comprehensive user dashboard with statistics
- **Export Data**: GDPR-compliant data export functionality

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Stripe Account (for payments)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd trading-platform
   npm run install-all
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Start MongoDB
   mongod
   ```

4. **Start the Application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Subscription Management
- `GET /api/subscription/plans` - Get available plans
- `GET /api/subscription/current` - Get current subscription
- `POST /api/subscription/create` - Create new subscription
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/renew` - Manual renewal
- `PUT /api/subscription/upgrade` - Upgrade plan

### Trading Strategies
- `GET /api/trading/strategies` - List user strategies
- `POST /api/trading/strategies` - Create new strategy
- `POST /api/trading/strategies/:id/start` - Start strategy execution
- `POST /api/trading/strategies/:id/stop` - Stop strategy execution
- `POST /api/trading/strategies/:id/pause` - Pause strategy
- `DELETE /api/trading/strategies/:id` - Delete strategy
- `GET /api/trading/strategies/:id/performance` - Get performance data
- `GET /api/trading/strategies/:id/logs` - Get execution logs
- `POST /api/trading/strategies/:id/backtest` - Run backtest (Pro+)

### User Dashboard
- `GET /api/user/dashboard` - Dashboard data
- `GET /api/user/stats` - User statistics
- `GET /api/user/activity` - Account activity
- `GET /api/user/limits` - Current limits and usage

## Subscription Plans

| Feature | Basic | Premium | Pro | Enterprise |
|---------|-------|---------|-----|------------|
| **Price (Monthly)** | $9.99 | $19.99 | $49.99 | $99.99 |
| **Price (Yearly)** | $99.99 | $199.99 | $499.99 | $999.99 |
| **Max Strategies** | 1 | 3 | 10 | Unlimited |
| **Real-time Data** | ❌ | ✅ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ❌ | ✅ |
| **Backtesting** | ❌ | ❌ | ✅ | ✅ |

## Key Components

### Subscription Checker Service
Automated background service that:
- Monitors subscription expiration
- Stops strategies for expired users
- Handles failed payment retries
- Sends renewal reminders
- Manages subscription lifecycle

### Strategy Execution Control
- **Subscription Validation**: Real-time checks before strategy execution
- **Plan Limits**: Enforces strategy count and feature limits
- **Automatic Stopping**: Halts strategies when subscriptions expire
- **Performance Tracking**: Monitors and logs all trading activity

### Payment Processing
- **Stripe Integration**: Secure payment processing
- **Webhook Handling**: Real-time payment status updates
- **Retry Logic**: Automatic retry for failed payments
- **Prorated Billing**: Handle plan upgrades and downgrades

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting protection
- **CORS Configuration**: Secure cross-origin resource sharing

## Monitoring & Logging

### Strategy Logs
- Execution events and errors
- Performance metrics updates
- Subscription status changes
- System notifications

### Subscription Events
- Payment successes and failures
- Plan changes and upgrades
- Cancellations and renewals
- Expiration notifications

## Development

### Project Structure
```
├── models/           # Database models
├── routes/           # API route handlers
├── middleware/       # Authentication & validation
├── services/         # Background services
├── client/           # Frontend application
└── server.js         # Main server file
```

### Database Models
- **User**: Authentication and profile data
- **Subscription**: Billing and plan information
- **TradingStrategy**: Strategy configuration and performance

### Background Services
- **Subscription Checker**: Monitors and manages subscriptions
- **Strategy Executor**: Handles strategy execution (placeholder)
- **Notification Service**: Sends emails and alerts

## Deployment

### Environment Variables
Configure all required environment variables:
- Database connection
- Stripe API keys
- JWT secrets
- Email service credentials

### Production Considerations
- Use MongoDB Atlas or similar managed database
- Configure proper Stripe webhooks
- Set up email service (SendGrid, Mailgun)
- Implement proper logging and monitoring
- Use Redis for session management and caching

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

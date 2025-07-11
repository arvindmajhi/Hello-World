# Auth & Trial Website

A modern website built with Vite, React, and TypeScript featuring user authentication and a 7-day free trial system.

## 🚀 Features

- **User Authentication**
  - User registration with email validation
  - Login/logout functionality
  - Form validation and error handling
  - Secure credential management

- **Free Trial System**
  - 7-day free trial period for new users
  - Real-time trial status tracking
  - Trial progress visualization
  - Expiration notifications
  - Automatic trial status updates

- **Modern UI/UX**
  - Beautiful, responsive design with Tailwind CSS
  - Gradient backgrounds and modern components
  - Loading states and animations
  - Interactive trial dashboard
  - Mobile-friendly interface

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Storage**: Local Storage (for demo purposes)

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vite-auth-trial-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🎯 Usage

### Registration
1. Navigate to the registration page
2. Fill in your name, email, and password
3. Confirm your password
4. Click "Start free trial" to create your account
5. You'll be automatically logged in and redirected to the dashboard

### Login
1. Go to the login page
2. Enter your email and password
3. Click "Sign in" to access your dashboard

### Dashboard Features
- **Trial Status**: View your current trial status (Active/Expired)
- **Time Remaining**: See how many days are left in your trial
- **Account Information**: View your account details and join date
- **Trial Details**: Complete overview of trial period and dates
- **Upgrade Prompts**: Notifications when trial is ending or expired

## 🔧 Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard component
│   ├── LoginPage.tsx    # Login form and page
│   ├── RegisterPage.tsx # Registration form and page
│   └── LoadingSpinner.tsx # Loading spinner component
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication hook
├── types/              # TypeScript type definitions
│   └── auth.ts         # Auth-related types
├── utils/              # Utility functions
│   └── auth.ts         # Authentication utilities
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles with Tailwind
```

## 📱 Features Overview

### Authentication System
- **Registration**: New users can create an account with email validation
- **Login**: Existing users can sign in with their credentials
- **Session Management**: User sessions persist across browser sessions
- **Security**: Password validation and secure storage practices

### Trial Management
- **Automatic Trial Start**: 7-day trial begins immediately upon registration
- **Real-time Updates**: Trial status updates automatically based on current date
- **Progress Tracking**: Visual progress bar showing trial completion percentage
- **Expiration Handling**: Clear notifications and calls-to-action for trial expiration

### User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Loading States**: Smooth loading indicators during async operations
- **Error Handling**: User-friendly error messages and validation
- **Intuitive Navigation**: Clear routing and navigation between pages

## 🎨 Styling

The application uses Tailwind CSS for styling with:
- Custom gradient backgrounds
- Modern card-based layouts
- Responsive grid systems
- Interactive hover states
- Consistent color schemes
- Beautiful form designs

## 🔄 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🚀 Deployment

To deploy this application:

1. Build the project:
```bash
npm run build
```

2. The `dist/` folder contains the production-ready files
3. Deploy the contents of `dist/` to your hosting provider

## 🔒 Security Notes

**Important**: This is a demo application using localStorage for data persistence. In a production environment, you should:

- Implement proper backend authentication
- Use secure password hashing (bcrypt, Argon2)
- Store user data in a secure database
- Implement JWT tokens or session-based authentication
- Add HTTPS encryption
- Implement proper CORS policies
- Add rate limiting and security headers

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

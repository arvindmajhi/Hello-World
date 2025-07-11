import React from 'react';
import { 
  Calendar, 
  Clock, 
  LogOut, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Gift
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const daysRemaining = Math.ceil(
    (user.trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const trialProgress = Math.max(0, Math.min(100, 
    ((new Date().getTime() - user.trialStartDate.getTime()) / 
     (user.trialEndDate.getTime() - user.trialStartDate.getTime())) * 100
  ));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Trial Dashboard</h1>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-gray-600">
            Here's an overview of your free trial status.
          </p>
        </div>

        {/* Trial Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Trial Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              {user.isTrialActive ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Trial Status</h3>
                <p className={`text-sm font-medium ${
                  user.isTrialActive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {user.isTrialActive ? 'Active' : 'Expired'}
                </p>
              </div>
            </div>
            {user.isTrialActive && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{Math.round(trialProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${trialProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Days Remaining */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Time Remaining</h3>
                <p className="text-sm text-gray-600">Until trial expires</p>
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                daysRemaining > 3 ? 'text-green-600' : 
                daysRemaining > 1 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.max(0, daysRemaining)}
              </div>
              <p className="text-sm text-gray-600">
                {daysRemaining === 1 ? 'day' : 'days'} left
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <User className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account</h3>
                <p className="text-sm text-gray-600">Member since</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Joined:</strong> {formatDistanceToNow(user.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Trial Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Trial Details</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Trial Period</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <strong>Started:</strong> {format(user.trialStartDate, 'PPP')}
                </p>
                <p>
                  <strong>Ends:</strong> {format(user.trialEndDate, 'PPP')}
                </p>
                <p>
                  <strong>Duration:</strong> 7 days
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">What's Next?</h4>
              <div className="text-sm text-gray-600 space-y-2">
                {user.isTrialActive ? (
                  <>
                    <p>• Explore all features during your trial</p>
                    <p>• Upgrade before expiration to continue</p>
                    <p>• Contact support if you have questions</p>
                  </>
                ) : (
                  <>
                    <p>• Your trial has expired</p>
                    <p>• Upgrade to a paid plan to continue</p>
                    <p>• Contact support for assistance</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        {user.isTrialActive && daysRemaining <= 3 && (
          <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Your trial is ending soon!
                </h3>
                <p className="text-blue-100">
                  Upgrade now to continue enjoying all features without interruption.
                </p>
              </div>
              <button className="bg-white text-blue-600 px-6 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        )}
        
        {user.isTrialExpired && (
          <div className="mt-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Trial Expired
                </h3>
                <p className="text-red-100">
                  Your free trial has ended. Upgrade to a paid plan to continue.
                </p>
              </div>
              <button className="bg-white text-red-600 px-6 py-2 rounded-md font-medium hover:bg-red-50 transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
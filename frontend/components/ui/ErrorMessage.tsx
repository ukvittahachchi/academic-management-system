'use client';

import { useState } from 'react';

interface ErrorMessageProps {
  error: string | null;
  title?: string;
  onRetry?: () => void;
  onClose?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title = 'Something went wrong',
  onRetry,
  onClose,
  showDetails = false,
  className = ''
}) => {
  const [showMore, setShowMore] = useState(false);

  if (!error) return null;

  // Common error messages with better user-friendly versions
  const friendlyErrors: Record<string, string> = {
    'Network Error': 'Unable to connect to the server. Please check your internet connection.',
    'Request failed with status code 401': 'Your session has expired. Please log in again.',
    'Request failed with status code 403': 'You don\'t have permission to access this resource.',
    'Request failed with status code 404': 'The requested resource was not found.',
    'Request failed with status code 500': 'Server error. Please try again later.',
    'TokenExpiredError': 'Your session has expired. Please log in again.',
    'JsonWebTokenError': 'Invalid session. Please log in again.',
    'No authentication token provided': 'Please log in to access this page.',
    'Invalid username or password': 'The username or password you entered is incorrect.',
  };

  const friendlyError = friendlyErrors[error] || error;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-xl p-6 relative ${className}`}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-red-500 hover:text-red-700"
          aria-label="Close"
        >
          <span className="text-xl">×</span>
        </button>
      )}
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="bg-red-100 p-3 rounded-full">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            {title}
          </h3>
          <p className="text-red-700 mb-4">
            {friendlyError}
          </p>

          <div className="flex space-x-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition"
              >
                Try Again
              </button>
            )}

            {showDetails && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg text-sm transition"
              >
                {showMore ? 'Hide Details' : 'Show Details'}
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg text-sm transition"
            >
              Refresh Page
            </button>
          </div>

          {showMore && showDetails && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <p className="text-sm text-red-600 font-mono bg-red-100 p-3 rounded">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Success Message Component
export const SuccessMessage: React.FC<{
  message: string;
  title?: string;
  onDismiss?: () => void;
}> = ({ message, title = 'Success!', onDismiss }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="bg-green-100 p-3 rounded-full">
            <span className="text-green-600 text-xl">✅</span>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-green-800 mb-1">
            {title}
          </h3>
          <p className="text-green-700 mb-4">
            {message}
          </p>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Info Message Component
export const InfoMessage: React.FC<{
  message: string;
  title?: string;
  icon?: string;
}> = ({ message, title = 'Information', icon = 'ℹ️' }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="bg-blue-100 p-3 rounded-full">
            <span className="text-blue-600 text-xl">{icon}</span>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-blue-800 mb-1">
            {title}
          </h3>
          <p className="text-blue-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

// Empty State Component
export const EmptyState: React.FC<{
  title: string;
  message: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ title, message, icon = '📭', action }) => {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-6 text-gray-400">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">
        {title}
      </h3>
      <p className="text-gray-600 max-w-md mx-auto mb-8">
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
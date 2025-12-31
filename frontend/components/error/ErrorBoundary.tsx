'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to your error tracking service
    this.logError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  logError(error: Error, errorInfo: ErrorInfo): void {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to Sentry, LogRocket, etc.
      console.log('Would send to error tracking service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleGoBack = (): void => {
    window.history.back();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                  <span className="text-4xl">💥</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-3">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600">
                  We apologize for the inconvenience. The error has been logged and our team has been notified.
                </p>
              </div>

              {/* Error Details (Collapsed by default) */}
              <div className="mb-8">
                <details className="border border-gray-200 rounded-lg">
                  <summary className="px-4 py-3 bg-gray-50 cursor-pointer font-medium text-gray-700">
                    Technical Details
                  </summary>
                  <div className="p-4 bg-gray-900 text-gray-100 font-mono text-sm overflow-auto">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error?.message}
                    </div>
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={this.handleReset}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoBack}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
                >
                  ← Go Back
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition"
                >
                  Go to Home Page
                </button>
              </div>

              {/* Support Information */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Still having issues?
                </p>
                <div className="flex justify-center space-x-4">
                  <a
                    href="mailto:support@yourschool.edu"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Contact Support
                  </a>
                  <span className="text-gray-400">•</span>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundary in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    ErrorDisplay: error ? (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error.message}</p>
        <button
          onClick={clearError}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Dismiss
        </button>
      </div>
    ) : null
  };
};

export default ErrorBoundary;
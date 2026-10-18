import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary — catches unhandled rendering exceptions
 * anywhere in the React component tree and prevents the entire app
 * from crashing to the OS home screen. Displays a branded fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console in development — in production, replace with Sentry/Crashlytics
    console.error('[ErrorBoundary] Uncaught render error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning-outline" size={48} color="#EF4444" />
            </View>
          </View>

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app encountered an unexpected error. Your data has been saved.
          </Text>

          {/* Show error message in development only */}
          {__DEV__ && this.state.error && (
            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>DEBUG INFO</Text>
              <Text style={styles.debugText} numberOfLines={6}>
                {this.state.error.message}
              </Text>
              {this.state.errorInfo?.componentStack && (
                <Text style={styles.debugText} numberOfLines={4}>
                  {this.state.errorInfo.componentStack.trim().split('\n').slice(0, 3).join('\n')}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={this.handleReset}
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={18} color="#0F172A" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            If this keeps happening, try closing and reopening the app.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#02040A',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  debugBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
    maxWidth: 400,
  },
  debugLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#EF4444',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#FCA5A5',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  retryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  helpText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
});

'use client';

import { useState, useEffect } from 'react';
import { LogoLoading } from './Logo';

/**
 * Professional Loading Component with BookedBarber Logo Animation
 * 
 * Features:
 * - Smooth logo animations (pulse, rotate, glow)
 * - Multiple loading states and messages
 * - Theme-aware with brand colors
 * - Customizable duration and styling
 */

const LoadingLogo = ({ 
  message = 'Loading...', 
  size = 'large',
  variant = 'pulse',
  showProgress = false,
  progress = 0,
  className = '',
  fullScreen = false
}) => {
  const [currentMessage, setCurrentMessage] = useState(message);
  const [animationClass, setAnimationClass] = useState('');

  // Loading messages for different states
  const loadingMessages = [
    'Initializing BookedBarber...',
    'Loading your dashboard...',
    'Preparing AI insights...',
    'Almost ready...'
  ];

  useEffect(() => {
    // Cycle through loading messages if no specific message provided
    if (message === 'Loading...') {
      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setCurrentMessage(loadingMessages[messageIndex]);
      }, 2000);

      return () => clearInterval(messageInterval);
    }
  }, [message]);

  // Animation variants
  const getAnimationClass = () => {
    switch (variant) {
      case 'pulse':
        return 'animate-pulse';
      case 'spin':
        return 'animate-spin';
      case 'bounce':
        return 'animate-bounce';
      case 'glow':
        return 'animate-pulse drop-shadow-lg';
      default:
        return 'animate-pulse';
    }
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Logo with Animation */}
      <div className={`relative ${getAnimationClass()}`}>
        <LogoLoading 
          size={size} 
          showText={false}
          className="drop-shadow-lg"
        />
        
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
      </div>

      {/* Loading Message */}
      <div className="mt-6 text-center">
        <p className="text-lg font-medium text-foreground mb-2">
          {currentMessage}
        </p>
        
        {/* Progress Bar */}
        {showProgress && (
          <div className="w-64 bg-muted rounded-full h-2 mt-4">
            <div 
              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
        )}
        
        {/* Loading Dots Animation */}
        <div className="flex justify-center space-x-1 mt-4">
          {[0, 1, 2].map((dot) => (
            <div
              key={dot}
              className="w-2 h-2 bg-primary rounded-full animate-pulse"
              style={{
                animationDelay: `${dot * 0.2}s`,
                animationDuration: '1.4s'
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Convenience components for different use cases
export const LoadingScreen = (props) => (
  <LoadingLogo {...props} fullScreen size="hero" variant="glow" />
);

export const LoadingCard = (props) => (
  <LoadingLogo {...props} size="large" variant="pulse" className="min-h-48" />
);

export const LoadingInline = (props) => (
  <LoadingLogo {...props} size="small" variant="spin" className="py-4" />
);

// Page-specific loading components
export const DashboardLoading = () => (
  <LoadingScreen 
    message="Loading your dashboard..."
    showProgress
    progress={75}
  />
);

export const AILoading = () => (
  <LoadingScreen 
    message="Initializing AI agents..."
    variant="glow"
  />
);

export const BookingLoading = () => (
  <LoadingScreen 
    message="Loading booking calendar..."
    showProgress
    progress={60}
  />
);

export default LoadingLogo;
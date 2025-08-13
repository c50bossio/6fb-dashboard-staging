'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

/**
 * BookedBarber Logo Component
 * 
 * Professional responsive logo component with theme-aware variant switching
 * Supports all 4 logo variants: olive-primary, gold-secondary, outline-minimal, dark-charcoal
 * 
 * Features:
 * - Automatic theme detection and logo variant switching
 * - Responsive sizing from mobile (24px) to desktop (120px+)
 * - Loading states and error handling
 * - Optimized for performance and accessibility
 */

const Logo = ({ 
  size = 'medium', 
  variant = 'auto', 
  className = '', 
  priority = false,
  animated = false,
  onClick = null,
  showText = true 
}) => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Size configurations for responsive design - optimized for new logo
  const sizeConfig = {
    small: { width: 120, height: 40, textClass: 'text-sm' },
    medium: { width: 180, height: 60, textClass: 'text-base' },
    large: { width: 240, height: 80, textClass: 'text-lg' },
    xlarge: { width: 300, height: 100, textClass: 'text-xl' },
    hero: { width: 360, height: 120, textClass: 'text-2xl' }
  };

  // Logo variant mapping based on theme and preferences
  const getLogoVariant = () => {
    // Use the new professional olive green logo
    // This logo works well on both light and dark backgrounds
    return 'bookedbarber-logo-new.png';
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const logoSrc = `/assets/logos/${getLogoVariant()}`;

  // Loading fallback component
  const LoadingLogo = () => (
    <div 
      className={`
        bg-gradient-to-br from-olive-500 to-olive-600 
        rounded-lg animate-pulse
        flex items-center justify-center
        ${className}
      `}
      style={{ width: config.width, height: config.height }}
    >
      <div className="w-6 h-6 bg-white/30 rounded"></div>
    </div>
  );

  // Error fallback component with barber pole design
  const ErrorLogo = () => (
    <div 
      className={`
        bg-gradient-to-br from-olive-500 to-gold-500 
        rounded-lg border border-olive-300
        flex items-center justify-center text-white font-bold
        ${config.textClass} ${className}
      `}
      style={{ width: showText === false || size === 'small' ? 40 : 180, height: showText === false || size === 'small' ? 40 : 60 }}
    >
      {showText === false || size === 'small' ? (
        // Icon only - show barber pole stripes
        <div className="w-6 h-8 bg-white/20 rounded relative overflow-hidden">
          <div className="absolute inset-0 bg-repeating-linear-gradient(45deg, #C5A35B 0px, #C5A35B 4px, white 4px, white 8px)"></div>
        </div>
      ) : (
        // Full text fallback
        <span>BookedBarber</span>
      )}
    </div>
  );

  // Show loading state during SSR/hydration
  if (!mounted) {
    return <LoadingLogo />;
  }

  // Show error fallback if image failed to load
  if (imageError) {
    return <ErrorLogo />;
  }

  return (
    <div 
      className={`
        flex items-center space-x-3
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Logo Image */}
      <div className="relative">
        <Image
          src={logoSrc}
          alt="BookedBarber - Professional Barbershop Management Platform"
          width={config.width}
          height={config.height}
          priority={priority}
          className="object-contain"
          onError={() => setImageError(true)}
          onLoadingComplete={() => setImageError(false)}
        />
        
      </div>

      {/* Logo already contains text, no need for additional text */}
    </div>
  );
};

// Convenience components for common use cases
export const LogoIcon = (props) => (
  <Logo {...props} showText={false} size={props.size || 'medium'} />
);

export const LogoHeader = (props) => (
  <Logo {...props} size="medium" animated priority />
);

export const LogoHero = (props) => (
  <Logo {...props} size="hero" animated priority />
);

export const LogoNavigation = (props) => (
  <Logo {...props} size="small" showText={false} />
);

export const LogoLoading = (props) => (
  <Logo {...props} size="medium" animated={false} priority />
);

export default Logo;
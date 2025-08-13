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

  // Size configurations for responsive design
  const sizeConfig = {
    small: { width: 32, height: 32, textClass: 'text-sm' },
    medium: { width: 48, height: 48, textClass: 'text-base' },
    large: { width: 64, height: 64, textClass: 'text-lg' },
    xlarge: { width: 96, height: 96, textClass: 'text-xl' },
    hero: { width: 128, height: 128, textClass: 'text-2xl' }
  };

  // Logo variant mapping based on theme and preferences
  const getLogoVariant = () => {
    if (!mounted) return 'bookedbarber-olive-primary'; // Default for SSR
    
    if (variant !== 'auto') {
      const variantMap = {
        'primary': 'bookedbarber-olive-primary',
        'secondary': 'bookedbarber-gold-secondary', 
        'outline': 'bookedbarber-outline-minimal',
        'dark': 'bookedbarber-dark-charcoal',
        'olive': 'bookedbarber-olive-primary',
        'gold': 'bookedbarber-gold-secondary',
        'minimal': 'bookedbarber-outline-minimal',
        'charcoal': 'bookedbarber-dark-charcoal'
      };
      return variantMap[variant] || 'bookedbarber-olive-primary';
    }

    // Auto theme detection
    const currentTheme = resolvedTheme || theme;
    
    if (currentTheme === 'dark') {
      return 'bookedbarber-gold-secondary'; // Gold on dark backgrounds
    } else {
      return 'bookedbarber-olive-primary'; // Olive on light backgrounds  
    }
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const logoSrc = `/assets/logos/${getLogoVariant()}.png`;

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

  // Error fallback component
  const ErrorLogo = () => (
    <div 
      className={`
        bg-gradient-to-br from-olive-500 to-gold-500 
        rounded-lg border border-olive-300
        flex items-center justify-center text-white font-bold
        ${config.textClass} ${className}
      `}
      style={{ width: config.width, height: config.height }}
    >
      BB
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
        flex items-center space-x-3 cursor-pointer group
        ${onClick ? 'hover:opacity-80 transition-opacity duration-200' : ''}
        ${animated ? 'hover:scale-105 transition-transform duration-200' : ''}
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
          className={`
            object-contain
            ${animated ? 'group-hover:rotate-1 transition-transform duration-300' : ''}
          `}
          onError={() => setImageError(true)}
          onLoadingComplete={() => setImageError(false)}
        />
        
        {/* Subtle glow effect for premium feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-olive-500/20 to-gold-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`
            font-bold tracking-tight text-foreground
            ${config.textClass}
            group-hover:text-olive-600 dark:group-hover:text-gold-400
            transition-colors duration-200
          `}>
            BookedBarber
          </span>
          {(size === 'large' || size === 'xlarge' || size === 'hero') && (
            <span className="text-xs text-muted-foreground font-medium">
              Professional SaaS Platform
            </span>
          )}
        </div>
      )}
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
'use client';

import { useState } from 'react';
import Image from 'next/image';

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
  const [imageError, setImageError] = useState(false);

  const sizeConfig = {
    xsmall: { width: 100, height: 24, textClass: 'text-xs' }, // Mobile header/sidebar
    small: { width: 120, height: 32, textClass: 'text-sm' },   // Compact navigation
    medium: { width: 160, height: 40, textClass: 'text-base' }, // Website header
    large: { width: 200, height: 50, textClass: 'text-lg' },   // Large displays
    xlarge: { width: 240, height: 60, textClass: 'text-xl' },  // Hero sections
    hero: { width: 300, height: 75, textClass: 'text-2xl' }    // Landing pages
  };

  const getLogoVariant = () => {
    return 'bookedbarber-transparent.png';
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const logoSrc = `/assets/logos/${getLogoVariant()}`;

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

  const ErrorLogo = () => (
    <div 
      className={`
        bg-gradient-to-br from-olive-500 to-gold-500 
        rounded-lg border border-olive-300
        flex items-center justify-center text-white font-bold
        ${config.textClass} ${className}
      `}
      style={{ width: showText === false || size === 'small' || size === 'xsmall' ? config.width : 180, height: showText === false || size === 'small' || size === 'xsmall' ? config.height : 60 }}
    >
      {showText === false || size === 'small' || size === 'xsmall' ? (
        <div className="w-6 h-8 bg-white/20 rounded relative overflow-hidden">
          <div className="absolute inset-0 bg-repeating-linear-gradient(45deg, #C5A35B 0px, #C5A35B 4px, white 4px, white 8px)"></div>
        </div>
      ) : (
        <span>BookedBarber</span>
      )}
    </div>
  );

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
          onLoad={() => setImageError(false)}
          placeholder="empty" // Prevent blur placeholder
        />
        
      </div>

      {/* Logo already contains text, no need for additional text */}
    </div>
  );
};

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
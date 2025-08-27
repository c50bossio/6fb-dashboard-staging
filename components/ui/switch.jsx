'use client';

import React from 'react';

const Switch = React.forwardRef(({ 
  checked = false, 
  onCheckedChange, 
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const handleChange = (e) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <label className={`relative inline-flex h-6 w-11 items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      <span
        className={`${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        } inline-block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out`}
      >
        <span
          className={`${
            checked ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out mt-1`}
        />
      </span>
    </label>
  );
});

Switch.displayName = 'Switch';

export { Switch };
import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ 
  className, 
  value = [0], 
  onValueChange, 
  max = 100, 
  min = 0, 
  step = 1, 
  disabled = false,
  ...props 
}, ref) => {
  const [internalValue, setInternalValue] = React.useState(value)

  // Update internal state when external value changes
  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (index, newValue) => {
    const updatedValue = [...internalValue]
    updatedValue[index] = Number(newValue)
    setInternalValue(updatedValue)
    onValueChange?.(updatedValue)
  }

  return (
    <div
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div 
          className="absolute h-full bg-primary"
          style={{
            left: `${((internalValue[0] - min) / (max - min)) * 100}%`,
            width: internalValue.length > 1 
              ? `${((internalValue[1] - internalValue[0]) / (max - min)) * 100}%`
              : `${((internalValue[0] - min) / (max - min)) * 100}%`
          }}
        />
      </div>
      
      {/* Render thumbs for each value */}
      {internalValue.map((val, index) => (
        <input
          key={index}
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => handleChange(index, e.target.value)}
          disabled={disabled}
          className="absolute h-2 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-colors hover:[&::-webkit-slider-thumb]:bg-primary/90 focus-visible:[&::-webkit-slider-thumb]:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring focus-visible:[&::-webkit-slider-thumb]:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{
            left: internalValue.length > 1 && index === 1 
              ? `${((val - min) / (max - min)) * 100}%` 
              : '0%',
            width: internalValue.length > 1 && index === 1 
              ? `${100 - ((val - min) / (max - min)) * 100}%` 
              : '100%'
          }}
        />
      ))}
    </div>
  )
})

Slider.displayName = "Slider"

export { Slider }
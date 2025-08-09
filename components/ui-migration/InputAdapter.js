'use client'

/**
 * InputAdapter - Migration wrapper from custom Input to shadcn Input
 * Maps existing Input API to shadcn/ui input component
 */

import { Input as ShadcnInput } from '@/components/ui/input'
import { Label as ShadcnLabel } from '@/components/ui/label'
import { Textarea as ShadcnTextarea } from '@/components/ui/textarea'
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Input wrapper that maintains compatibility
export const Input = ({ className, ...props }) => {
  return (
    <ShadcnInput
      className={cn(className)}
      {...props}
    />
  )
}

// Label wrapper
export const Label = ({ className, ...props }) => {
  return (
    <ShadcnLabel
      className={cn(className)}
      {...props}
    />
  )
}

// Textarea wrapper
export const Textarea = ({ className, ...props }) => {
  return (
    <ShadcnTextarea
      className={cn(className)}
      {...props}
    />
  )
}

// Select wrapper with custom API
export const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <ShadcnSelect
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      {...props}
    >
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const optionValue = typeof option === 'object' ? option.value : option
          const optionLabel = typeof option === 'object' ? option.label : option
          
          return (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          )
        })}
      </SelectContent>
    </ShadcnSelect>
  )
}

// FormInput component that combines Label and Input
export const FormInput = ({
  label,
  error,
  className = '',
  inputClassName = '',
  ...props
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={props.id || props.name}>
          {label}
        </Label>
      )}
      <Input
        className={cn(
          error && 'border-red-500 focus:ring-red-500',
          inputClassName
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}

// FormTextarea component
export const FormTextarea = ({
  label,
  error,
  className = '',
  textareaClassName = '',
  ...props
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={props.id || props.name}>
          {label}
        </Label>
      )}
      <Textarea
        className={cn(
          error && 'border-red-500 focus:ring-red-500',
          textareaClassName
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}

// FormSelect component
export const FormSelect = ({
  label,
  error,
  className = '',
  selectClassName = '',
  ...props
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={props.id || props.name}>
          {label}
        </Label>
      )}
      <Select
        className={cn(
          error && 'border-red-500 focus:ring-red-500',
          selectClassName
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}

export default Input
'use client'

/**
 * Input Migration Adapters - Backward Compatibility Layer
 * 
 * This file provides adapters to maintain backward compatibility
 * while the codebase transitions to the unified input component.
 * 
 * All original component APIs are preserved exactly as they were.
 */

import { 
  FormInput as UnifiedFormInputWrapper,
  FormSelect,
  FormTextarea,
  FormCheckbox 
} from '../ui/FormInput'
import { 
  UnifiedInput,
  NuclearInput as UnifiedNuclearInput,
  BulletproofInput as UnifiedBulletproofInput,
  StableInput as UnifiedStableInput,
  UncontrolledInput as UnifiedUncontrolledInput,
  Input as UnifiedInputBase,
  FormInput as UnifiedFormInput
} from '../ui/UnifiedInput'


// Legacy component adapters with exact same APIs
export { UnifiedNuclearInput as NuclearInput }
export { UnifiedBulletproofInput as BulletproofInput }
export { UnifiedStableInput as StableInput }
export { UnifiedUncontrolledInput as UncontrolledInput }
export { UnifiedInputBase as Input }

// Form components maintained for compatibility
export { FormSelect, FormTextarea, FormCheckbox }

// Legacy FormInput adapter that combines both patterns
export const FormInput = (props) => {
  // If it has form wrapper props, use the full form wrapper
  if (props.label || props.error || props.helper) {
    return <UnifiedFormInputWrapper {...props} />
  }
  
  // Otherwise use the unified input with form capabilities
  return <UnifiedFormInput {...props} />
}

FormInput.displayName = 'FormInput'

// Default exports for easier migration
export default {
  UnifiedInput,
  NuclearInput: UnifiedNuclearInput,
  BulletproofInput: UnifiedBulletproofInput,
  StableInput: UnifiedStableInput,
  UncontrolledInput: UnifiedUncontrolledInput,
  Input: UnifiedInputBase,
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox
}
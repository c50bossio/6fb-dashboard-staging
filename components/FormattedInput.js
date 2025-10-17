import { NuclearInput } from './ui/UnifiedInput'

/**
 * FORMATTED INPUT COMPONENTS
 * 
 * Pre-configured UnifiedInput components for common use cases
 * Provides consistent formatting across the entire application
 */

export const PhoneInput = ({ ...props }) => (
  <NuclearInput
    type="tel"
    autoFormatting={true}
    validation={true}
    placeholder="(555) 123-4567"
    {...props}
  />
)

export const EmailInput = ({ ...props }) => (
  <NuclearInput
    type="email"
    autoFormatting={true}
    validation={true}
    placeholder="your@email.com"
    {...props}
  />
)

export const CurrencyInput = ({ ...props }) => (
  <NuclearInput
    type="text"
    autoFormatting={true}
    validation={false}
    placeholder="$0.00"
    name="currency"
    {...props}
  />
)

export const ZipInput = ({ ...props }) => (
  <NuclearInput
    type="text"
    autoFormatting={true}
    validation={true}
    placeholder="12345 or 12345-6789"
    name="zip"
    maxLength={10}
    {...props}
  />
)

export const CreditCardInput = ({ ...props }) => (
  <NuclearInput
    type="text"
    autoFormatting={true}
    validation={true}
    placeholder="1234 5678 9012 3456"
    name="card"
    maxLength={19}
    {...props}
  />
)

export const SSNInput = ({ ...props }) => (
  <NuclearInput
    type="text"
    autoFormatting={true}
    validation={true}
    placeholder="123-45-6789"
    name="ssn"
    maxLength={11}
    {...props}
  />
)

export const TimeInput = ({ ...props }) => (
  <NuclearInput
    type="text"
    autoFormatting={true}
    validation={false}
    placeholder="9:00 AM"
    name="time"
    {...props}
  />
)

export const InternationalPhoneInput = ({ ...props }) => (
  <NuclearInput
    type="tel"
    autoFormatting={true}
    validation={true}
    placeholder="+1 (555) 123-4567"
    name="international_phone"
    {...props}
  />
)

export default {
  PhoneInput,
  EmailInput,
  CurrencyInput,
  ZipInput,
  CreditCardInput,
  SSNInput,
  TimeInput,
  InternationalPhoneInput
}
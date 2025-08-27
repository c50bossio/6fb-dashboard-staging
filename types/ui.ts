import { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, HTMLAttributes } from 'react'
import { VariantProps } from 'class-variance-authority'
import { LucideIcon } from 'lucide-react'

/**
 * Common component size options
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Common component variants based on brand colors
 */
export type Variant = 
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost'
  | 'link'
  | 'outline'

/**
 * Loading state props
 */
export interface LoadingProps {
  loading?: boolean
  loadingText?: string
}

/**
 * Icon props for components
 */
export interface IconProps {
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  iconClassName?: string
}

/**
 * Base props that all components share
 */
export interface BaseComponentProps {
  className?: string
  id?: string
  'data-testid'?: string
}

/**
 * Form field props
 */
export interface FormFieldProps {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Button component props
 */
export interface ButtonProps 
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    BaseComponentProps,
    LoadingProps,
    IconProps,
    VariantProps<typeof buttonVariants> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  asChild?: boolean
}

/**
 * Input component props
 */
export interface InputProps 
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseComponentProps,
    FormFieldProps {
  size?: Size
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  onRightIconClick?: () => void
}

/**
 * Textarea component props
 */
export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseComponentProps,
    FormFieldProps {
  size?: Size
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

/**
 * Card component props
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement>, BaseComponentProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive'
  padding?: Size
  rounded?: Size | 'none' | 'full'
}

/**
 * Card header props
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement>, BaseComponentProps {
  title?: string
  description?: string
  action?: React.ReactNode
}

/**
 * Badge component props
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, BaseComponentProps {
  variant?: Variant
  size?: Extract<Size, 'sm' | 'md' | 'lg'>
  rounded?: boolean
  dot?: boolean
  removable?: boolean
  onRemove?: () => void
}

/**
 * Alert component props
 */
export interface AlertProps extends HTMLAttributes<HTMLDivElement>, BaseComponentProps {
  variant?: Extract<Variant, 'default' | 'success' | 'warning' | 'danger'>
  title?: string
  description?: string
  icon?: LucideIcon
  closable?: boolean
  onClose?: () => void
}

/**
 * Modal/Dialog props
 */
export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: Size
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

/**
 * Select/Dropdown props
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: LucideIcon
}

export interface SelectProps extends BaseComponentProps, FormFieldProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  size?: Size
  multiple?: boolean
}

/**
 * Toast notification props
 */
export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: Extract<Variant, 'default' | 'success' | 'warning' | 'danger'>
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Tooltip props
 */
export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  skipDelayDuration?: number
}

/**
 * Avatar props
 */
export interface AvatarProps extends BaseComponentProps {
  src?: string
  alt?: string
  fallback?: string
  size?: Size
  status?: 'online' | 'offline' | 'away' | 'busy'
  shape?: 'circle' | 'square'
}

/**
 * Progress props
 */
export interface ProgressProps extends BaseComponentProps {
  value: number
  max?: number
  size?: Extract<Size, 'sm' | 'md' | 'lg'>
  variant?: Extract<Variant, 'default' | 'primary' | 'success' | 'warning' | 'danger'>
  showValue?: boolean
  animated?: boolean
}

/**
 * Skeleton loader props
 */
export interface SkeletonProps extends BaseComponentProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Tab props
 */
export interface TabItem {
  value: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  badge?: string | number
}

export interface TabsProps extends BaseComponentProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: Size
}

/**
 * Switch/Toggle props
 */
export interface SwitchProps extends BaseComponentProps, FormFieldProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: Extract<Size, 'sm' | 'md' | 'lg'>
}

/**
 * Dropdown menu props
 */
export interface DropdownMenuItem {
  label: string
  icon?: LucideIcon
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
  separator?: boolean
}

export interface DropdownMenuProps extends BaseComponentProps {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * Table props
 */
export interface TableColumn<T = any> {
  key: keyof T | string
  header: string
  accessor?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
}

export interface TableProps<T = any> extends BaseComponentProps {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  selectable?: boolean
  selectedRows?: T[]
  onSelectionChange?: (rows: T[]) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
  }
}

// Export buttonVariants for use with cva
export { buttonVariants } from '../components/ui/button'
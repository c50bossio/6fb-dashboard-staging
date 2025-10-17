/**
 * TypeScript declarations for UI components
 * This file provides type definitions for JavaScript/JSX components
 */

declare module '@/components/ui/Button' {
  import { ReactNode, ButtonHTMLAttributes } from 'react'
  
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    className?: string
    children?: ReactNode
  }
  
  declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>
  export { Button }
  export default Button
}

declare module '@/components/ui/Input' {
  import { InputHTMLAttributes } from 'react'
  
  export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    className?: string
  }
  
  declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>
  export { Input }
  export default Input
}

declare module '@/components/ui/Textarea' {
  import { TextareaHTMLAttributes } from 'react'
  
  export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    className?: string
  }
  
  declare const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>
  export { Textarea }
  export default Textarea
}

declare module '@/components/ui/select' {
  import { ReactNode } from 'react'
  
  export interface SelectProps {
    value?: string
    onValueChange?: (value: string) => void
    children?: ReactNode
    className?: string
  }
  
  export interface SelectContentProps {
    className?: string
    children?: ReactNode
  }
  
  export interface SelectItemProps {
    value: string
    className?: string
    children?: ReactNode
  }
  
  export interface SelectTriggerProps {
    className?: string
    children?: ReactNode
  }
  
  export interface SelectValueProps {
    placeholder?: string
    className?: string
  }
  
  export const Select: React.FC<SelectProps>
  export const SelectContent: React.FC<SelectContentProps>
  export const SelectItem: React.FC<SelectItemProps>
  export const SelectTrigger: React.FC<SelectTriggerProps>
  export const SelectValue: React.FC<SelectValueProps>
}

declare module '@/components/ui/tabs' {
  import { ReactNode } from 'react'
  
  export interface TabsProps {
    value?: string
    onValueChange?: (value: string) => void
    orientation?: 'horizontal' | 'vertical'
    className?: string
    children?: ReactNode
  }
  
  export interface TabsContentProps {
    value: string
    className?: string
    children?: ReactNode
  }
  
  export interface TabsListProps {
    className?: string
    children?: ReactNode
  }
  
  export interface TabsTriggerProps {
    value: string
    className?: string
    children?: ReactNode
    disabled?: boolean
  }
  
  export const Tabs: React.FC<TabsProps>
  export const TabsContent: React.FC<TabsContentProps>
  export const TabsList: React.FC<TabsListProps>
  export const TabsTrigger: React.FC<TabsTriggerProps>
}

declare module '@/components/ui/badge' {
  import { ReactNode } from 'react'
  
  export interface BadgeProps {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
    children?: ReactNode
  }
  
  export const Badge: React.FC<BadgeProps>
}

declare module '@/components/ui/progress' {
  export interface ProgressProps {
    value?: number
    className?: string
    max?: number
  }
  
  export const Progress: React.FC<ProgressProps>
}

declare module '@/components/ui/label' {
  import { ReactNode, LabelHTMLAttributes } from 'react'
  
  export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    className?: string
    children?: ReactNode
  }
  
  export const Label: React.FC<LabelProps>
}

declare module '@/components/ui/switch' {
  export interface SwitchProps {
    className?: string
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
  
  export const Switch: React.FC<SwitchProps>
}

declare module '@/components/ui/alert' {
  import { ReactNode } from 'react'
  
  export interface AlertProps {
    variant?: 'default' | 'destructive'
    className?: string
    children?: ReactNode
  }
  
  export interface AlertDescriptionProps {
    className?: string
    children?: ReactNode
  }
  
  export interface AlertTitleProps {
    className?: string
    children?: ReactNode
  }
  
  export const Alert: React.FC<AlertProps>
  export const AlertDescription: React.FC<AlertDescriptionProps>
  export const AlertTitle: React.FC<AlertTitleProps>
}
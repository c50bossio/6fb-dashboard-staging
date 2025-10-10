import React from 'react'
import { render, screen } from '@/test-utils/test-utils'
import Button from '../../../components/Button'

describe('Button Component', () => {
  it('renders button with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
    expect(button).toHaveClass('bg-gradient-to-r', 'from-olive-600', 'to-gold-600')
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gradient-to-r', 'from-olive-600', 'to-gold-600')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200', 'text-gray-800')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-2', 'border-olive-600', 'text-olive-600')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-gray-600')

    rerender(<Button variant="cta">CTA</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gradient-to-r', 'from-yellow-400', 'to-orange-400')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600', 'text-white')
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-3', 'text-sm', 'min-h-[44px]')

    rerender(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2.5', 'text-base', 'min-h-[44px]')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg', 'min-h-[48px]')

    rerender(<Button size="xl">Extra Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-8', 'py-4', 'text-xl', 'min-h-[52px]')
  })

  it('handles loading state correctly', () => {
    render(<Button loading>Loading Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    // In the actual implementation, children are replaced with loadingText, not hidden with opacity
    expect(screen.queryByText('Loading Button')).not.toBeInTheDocument()
  })

  it('handles custom loading text', () => {
    render(<Button loading loadingText="Please wait...">Custom Loading</Button>)
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('handles disabled state correctly', () => {
    render(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const { user } = render(<Button onClick={handleClick}>Clickable</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not trigger click when disabled', async () => {
    const handleClick = jest.fn()
    const { user } = render(<Button disabled onClick={handleClick}>Disabled</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('does not trigger click when loading', async () => {
    const handleClick = jest.fn()
    const { user } = render(<Button loading onClick={handleClick}>Loading</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('forwards ref correctly', () => {
    let buttonRef
    const TestComponent = () => {
      buttonRef = React.createRef()
      return <Button ref={buttonRef}>Ref Button</Button>
    }
    
    render(<TestComponent />)
    expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('passes through other props', () => {
    render(<Button data-testid="custom-button" aria-label="Custom button">Test</Button>)
    
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveAttribute('aria-label', 'Custom button')
  })

  it('has proper accessibility attributes', () => {
    render(<Button>Accessible Button</Button>)
    
    const button = screen.getByRole('button', { name: /accessible button/i })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('renders loading spinner with correct styling', () => {
    render(<Button loading>Loading</Button>)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('w-4', 'h-4', 'mr-2', 'animate-spin')
    // The actual implementation uses ArrowPathIcon from heroicons, not a custom spinner
  })
})
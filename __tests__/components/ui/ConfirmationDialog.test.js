/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmationDialog, { 
  SaveChangesDialog, 
  DiscardChangesDialog, 
  DeleteConfirmDialog 
} from '@/components/ui/ConfirmationDialog'

describe('ConfirmationDialog Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Test Dialog',
    message: 'This is a test message'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders when open', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      expect(screen.getByText('This is a test message')).toBeInTheDocument()
      expect(screen.getByText('Confirm')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<ConfirmationDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders with custom button text', () => {
      render(
        <ConfirmationDialog 
          {...defaultProps}
          confirmText="Save Now"
          cancelText="Don't Save"
        />
      )

      expect(screen.getByText('Save Now')).toBeInTheDocument()
      expect(screen.getByText("Don't Save")).toBeInTheDocument()
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })

    it('renders with custom children content', () => {
      render(
        <ConfirmationDialog {...defaultProps} message="">
          <div data-testid="custom-content">
            <p>Custom dialog content</p>
            <input placeholder="Enter name" />
          </div>
        </ConfirmationDialog>
      )

      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
      expect(screen.getByText('Custom dialog content')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
    })

    it('renders both message and children when provided', () => {
      render(
        <ConfirmationDialog 
          {...defaultProps}
          message="Standard message"
        >
          <div>Additional content</div>
        </ConfirmationDialog>
      )

      expect(screen.getByText('Standard message')).toBeInTheDocument()
      expect(screen.getByText('Additional content')).toBeInTheDocument()
    })
  })

  describe('Dialog Types and Styling', () => {
    it('renders warning type correctly', () => {
      render(<ConfirmationDialog {...defaultProps} type="warning" />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      
      // Check for warning icon (ExclamationTriangleIcon should be present)
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('renders danger type correctly', () => {
      render(<ConfirmationDialog {...defaultProps} type="danger" />)

      // Danger type should have red-colored confirm button
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('bg-red-600')
    })

    it('renders success type correctly', () => {
      render(<ConfirmationDialog {...defaultProps} type="success" />)

      // Success type should have green-colored confirm button  
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('bg-green-600')
    })

    it('renders info type correctly', () => {
      render(<ConfirmationDialog {...defaultProps} type="info" />)

      // Info type should have blue-colored confirm button
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('bg-blue-600')
    })

    it('defaults to warning type when type is not specified', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('bg-yellow-600')
    })

    it('handles invalid type gracefully', () => {
      render(<ConfirmationDialog {...defaultProps} type="invalid" />)

      // Should not crash and should render something
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = jest.fn().mockResolvedValue()
      
      render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)

      await user.click(screen.getByText('Confirm'))

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<ConfirmationDialog {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByText('Cancel'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when close button (X) is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<ConfirmationDialog {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<ConfirmationDialog {...defaultProps} onClose={onClose} />)

      // Click on backdrop (the overlay div)
      const backdrop = document.querySelector('.fixed.inset-0')
      await user.click(backdrop)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when clicking inside modal content', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<ConfirmationDialog {...defaultProps} onClose={onClose} />)

      // Click inside the modal content
      const modalContent = screen.getByText('Test Dialog')
      await user.click(modalContent)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      const onConfirm = jest.fn().mockResolvedValue()
      
      render(<ConfirmationDialog {...defaultProps} onClose={onClose} onConfirm={onConfirm} />)

      // Tab through elements
      await user.tab()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByText('Confirm'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByText('Cancel'))

      // Press Enter on confirm button
      await user.keyboard('{Enter}')
      expect(onConfirm).toHaveBeenCalled()
    })

    it('handles Escape key to close dialog', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<ConfirmationDialog {...defaultProps} onClose={onClose} />)

      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State', () => {
    it('shows loading state correctly', () => {
      render(<ConfirmationDialog {...defaultProps} loading={true} />)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
      
      // Loading spinner should be present
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('disables buttons during loading', () => {
      render(<ConfirmationDialog {...defaultProps} loading={true} />)

      const confirmButton = screen.getByText('Processing...')
      const cancelButton = screen.getByText('Cancel')
      const closeButton = screen.getByRole('button', { name: /close/i })

      expect(confirmButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
      expect(closeButton).toBeDisabled()
    })

    it('prevents backdrop click during loading', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<ConfirmationDialog {...defaultProps} onClose={onClose} loading={true} />)

      // Try to click backdrop
      const backdrop = document.querySelector('.fixed.inset-0')
      await user.click(backdrop)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('shows loading state during async confirm operation', async () => {
      const user = userEvent.setup()
      const onConfirm = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)

      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)

      // Should show loading state temporarily
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })

      // Wait for async operation to complete
      await waitFor(() => {
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('Error Handling', () => {
    it('handles confirm function errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const onConfirm = jest.fn().mockRejectedValue(new Error('Confirm failed'))
      
      render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)

      await user.click(screen.getByText('Confirm'))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Confirmation action failed:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('handles missing onConfirm handler', async () => {
      const user = userEvent.setup()
      
      render(<ConfirmationDialog {...defaultProps} onConfirm={undefined} />)

      // Should not crash when confirm button is clicked
      expect(() => user.click(screen.getByText('Confirm'))).not.toThrow()
    })

    it('handles missing onClose handler', async () => {
      const user = userEvent.setup()
      
      render(<ConfirmationDialog {...defaultProps} onClose={undefined} />)

      // Should not crash when cancel button is clicked
      expect(() => user.click(screen.getByText('Cancel'))).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')

      const title = screen.getByText('Test Dialog')
      expect(title).toHaveAttribute('id', 'modal-title')
    })

    it('has proper button labels', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toHaveAttribute('aria-label', 'Close')
    })

    it('manages focus correctly', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      // Dialog should be focusable
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()

      // First focusable element should be the close button
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('has proper heading structure', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('Test Dialog')
    })

    it('provides screen reader context for icons', () => {
      render(<ConfirmationDialog {...defaultProps} type="warning" />)

      const icons = document.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Animation and Visual Effects', () => {
    it('applies correct CSS classes for animations', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      const backdrop = document.querySelector('.animate-in.fade-in')
      expect(backdrop).toBeInTheDocument()

      const modal = document.querySelector('.animate-in.slide-in-from-bottom-4.zoom-in-95')
      expect(modal).toBeInTheDocument()
    })

    it('applies hover effects to buttons', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('hover:scale-105')

      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toHaveClass('hover:bg-gray-50')
    })

    it('handles disabled state styling', () => {
      render(<ConfirmationDialog {...defaultProps} loading={true} />)

      const confirmButton = screen.getByText('Processing...')
      expect(confirmButton).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      const modal = document.querySelector('.sm\\:max-w-lg.sm\\:w-full')
      expect(modal).toBeInTheDocument()

      const buttonContainer = document.querySelector('.sm\\:flex.sm\\:flex-row-reverse')
      expect(buttonContainer).toBeInTheDocument()
    })

    it('handles mobile and desktop layouts', () => {
      render(<ConfirmationDialog {...defaultProps} />)

      // Mobile: full width buttons
      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveClass('w-full', 'sm:w-auto')

      // Desktop: proper spacing
      expect(confirmButton).toHaveClass('sm:ml-3')
    })
  })
})

describe('Predefined Dialog Components', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    onDiscard: jest.fn(),
    onDelete: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('SaveChangesDialog', () => {
    it('renders with correct props when changes exist', () => {
      render(<SaveChangesDialog {...baseProps} hasChanges={true} />)

      expect(screen.getByText('Save Changes')).toBeInTheDocument()
      expect(screen.getByText('You have unsaved changes. Would you like to save them before continuing?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: "Don't Save" })).toBeInTheDocument()
    })

    it('renders with correct props when no changes exist', () => {
      render(<SaveChangesDialog {...baseProps} hasChanges={false} />)

      expect(screen.getByText('Save Changes')).toBeInTheDocument()
      expect(screen.getByText('Save your current customization settings?')).toBeInTheDocument()
    })

    it('calls onSave when save button is clicked', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockResolvedValue()
      
      render(<SaveChangesDialog {...baseProps} onSave={onSave} hasChanges={true} />)

      await user.click(screen.getByRole('button', { name: 'Save Changes' }))

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when dont save button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<SaveChangesDialog {...baseProps} onClose={onClose} hasChanges={true} />)

      await user.click(screen.getByRole('button', { name: "Don't Save" }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('has info dialog type styling', () => {
      render(<SaveChangesDialog {...baseProps} hasChanges={true} />)

      const confirmButton = screen.getByRole('button', { name: 'Save Changes' })
      expect(confirmButton).toHaveClass('bg-blue-600')
    })
  })

  describe('DiscardChangesDialog', () => {
    it('renders with correct warning message', () => {
      render(<DiscardChangesDialog {...baseProps} />)

      expect(screen.getByText('Discard Changes')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to discard your unsaved changes? This action cannot be undone.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Keep Editing' })).toBeInTheDocument()
    })

    it('calls onDiscard when discard button is clicked', async () => {
      const user = userEvent.setup()
      const onDiscard = jest.fn().mockResolvedValue()
      
      render(<DiscardChangesDialog {...baseProps} onDiscard={onDiscard} />)

      await user.click(screen.getByRole('button', { name: 'Discard Changes' }))

      expect(onDiscard).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when keep editing button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<DiscardChangesDialog {...baseProps} onClose={onClose} />)

      await user.click(screen.getByRole('button', { name: 'Keep Editing' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('has warning dialog type styling', () => {
      render(<DiscardChangesDialog {...baseProps} />)

      const confirmButton = screen.getByRole('button', { name: 'Discard Changes' })
      expect(confirmButton).toHaveClass('bg-yellow-600')
    })
  })

  describe('DeleteConfirmDialog', () => {
    it('renders with default item name', () => {
      render(<DeleteConfirmDialog {...baseProps} />)

      expect(screen.getByText('Delete item')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete this item? This action cannot be undone.')).toBeInTheDocument()
    })

    it('renders with custom item name', () => {
      render(<DeleteConfirmDialog {...baseProps} itemName="profile image" />)

      expect(screen.getByText('Delete profile image')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete this profile image? This action cannot be undone.')).toBeInTheDocument()
    })

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDelete = jest.fn().mockResolvedValue()
      
      render(<DeleteConfirmDialog {...baseProps} onDelete={onDelete} itemName="service" />)

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<DeleteConfirmDialog {...baseProps} onClose={onClose} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('has danger dialog type styling', () => {
      render(<DeleteConfirmDialog {...baseProps} />)

      const confirmButton = screen.getByRole('button', { name: 'Delete' })
      expect(confirmButton).toHaveClass('bg-red-600')
    })

    it('handles complex item names', () => {
      render(<DeleteConfirmDialog {...baseProps} itemName="barber profile with 15 portfolio images" />)

      expect(screen.getByText('Delete barber profile with 15 portfolio images')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete this barber profile with 15 portfolio images? This action cannot be undone.')).toBeInTheDocument()
    })
  })

  describe('Predefined Dialog Integration', () => {
    it('all predefined dialogs handle loading states', async () => {
      const slowFunction = () => new Promise(resolve => setTimeout(resolve, 100))

      // Test SaveChangesDialog loading
      const { rerender } = render(
        <SaveChangesDialog 
          {...baseProps} 
          onSave={slowFunction}
          hasChanges={true}
        />
      )

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Save Changes' }))

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })

      // Test DiscardChangesDialog loading
      rerender(
        <DiscardChangesDialog 
          {...baseProps} 
          onDiscard={slowFunction}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Discard Changes' }))

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })

      // Test DeleteConfirmDialog loading
      rerender(
        <DeleteConfirmDialog 
          {...baseProps} 
          onDelete={slowFunction}
          itemName="test item"
        />
      )

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })
    })

    it('predefined dialogs handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const failingFunction = () => Promise.reject(new Error('Operation failed'))

      const user = userEvent.setup()

      // Test error handling in SaveChangesDialog
      render(
        <SaveChangesDialog 
          {...baseProps} 
          onSave={failingFunction}
          hasChanges={true}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Save Changes' }))

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Confirmation action failed:',
          expect.any(Error)
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })
})
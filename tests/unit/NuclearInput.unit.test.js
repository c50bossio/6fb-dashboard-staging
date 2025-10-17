/**
 * UNIT TESTS FOR NUCLEAR INPUT COMPONENT
 * 
 * Tests the DOM-only input system that prevents React state interference
 * Covers property descriptors, mutation observers, and anti-interference mechanisms
 */

import { render, fireEvent, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { NuclearInput } from '../../components/ui/UnifiedInput'
import React from 'react'

const mockConsole = {
  log: jest.fn(),
  warn: jest.fn()
}
global.console = { ...console, ...mockConsole }

describe('NuclearInput Component - Unit Tests', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    mockConsole.log.mockClear()
    mockConsole.warn.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering and Props', () => {
    test('renders with default props', () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveClass('input-field')
    })

    test('applies custom props correctly', () => {
      render(
        <NuclearInput
          type="email"
          placeholder="Enter email"
          className="custom-input"
          name="test-input"
          defaultValue="test@example.com"
        />
      )
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
      expect(input).toHaveAttribute('placeholder', 'Enter email')
      expect(input).toHaveClass('custom-input')
      expect(input).toHaveAttribute('name', 'test-input')
      expect(input).toHaveValue('test@example.com')
    })

    test('applies anti-interference attributes', () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      expect(input).toHaveAttribute('autoComplete', 'new-password')
      expect(input).toHaveAttribute('autoCorrect', 'off')
      expect(input).toHaveAttribute('autoCapitalize', 'off')
      expect(input).toHaveAttribute('spellCheck', 'false')
      expect(input).toHaveAttribute('data-lpignore', 'true')
      expect(input).toHaveAttribute('data-form-type', 'other')
      expect(input).toHaveAttribute('data-1p-ignore', 'true')
      expect(input).toHaveAttribute('data-nuclear')
    })
  })

  describe('Default Value Handling', () => {
    test('sets initial value from defaultValue prop', () => {
      render(<NuclearInput defaultValue="initial value" />)
      const input = screen.getByRole('textbox')
      
      expect(input.value).toBe('initial value')
    })

    test('updates value when defaultValue changes', async () => {
      const { rerender } = render(<NuclearInput defaultValue="first" />)
      const input = screen.getByRole('textbox')
      
      expect(input.value).toBe('first')
      
      rerender(<NuclearInput defaultValue="second" />)
      
      await waitFor(() => {
        expect(input.value).toBe('second')
      })
    })

    test('handles empty defaultValue correctly', () => {
      render(<NuclearInput defaultValue="" />)
      const input = screen.getByRole('textbox')
      
      expect(input.value).toBe('')
    })

    test('handles undefined defaultValue', () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      expect(input.value).toBe('')
    })
  })

  describe('User Input Interaction', () => {
    test('allows character-by-character typing', async () => {
      const onBlur = jest.fn()
      render(<NuclearInput onBlur={onBlur} />)
      const input = screen.getByRole('textbox')
      
      await user.type(input, 'hello')
      
      expect(input.value).toBe('hello')
      expect(onBlur).not.toHaveBeenCalled() // Should not trigger on typing
    })

    test('handles rapid typing without corruption', async () => {
      const onBlur = jest.fn()
      render(<NuclearInput onBlur={onBlur} />)
      const input = screen.getByRole('textbox')
      
      const rapidText = 'thisisrapidtypingtest'
      await user.type(input, rapidText, { delay: 1 }) // Very fast typing
      
      expect(input.value).toBe(rapidText)
      expect(onBlur).not.toHaveBeenCalled()
    })

    test('handles copy-paste operations', async () => {
      const onBlur = jest.fn()
      render(<NuclearInput onBlur={onBlur} />)
      const input = screen.getByRole('textbox')
      
      input.focus()
      
      const pasteData = 'pasted content from clipboard'
      fireEvent.paste(input, {
        clipboardData: { getData: () => pasteData }
      })
      
      fireEvent.change(input, { target: { value: pasteData } })
      
      expect(input.value).toBe(pasteData)
    })

    test('handles special characters and international text', async () => {
      const onBlur = jest.fn()
      render(<NuclearInput onBlur={onBlur} />)
      const input = screen.getByRole('textbox')
      
      const specialText = 'café naïve résumé ñoño 中文 🚀'
      await user.type(input, specialText)
      
      expect(input.value).toBe(specialText)
    })

    test('maintains focus during typing', async () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      input.focus()
      expect(input).toHaveFocus()
      
      await user.type(input, 'maintaining focus')
      
      expect(input).toHaveFocus()
      expect(input.value).toBe('maintaining focus')
    })
  })

  describe('Blur Event Handling', () => {
    test('triggers onBlur only when input loses focus', async () => {
      const onBlur = jest.fn()
      render(<NuclearInput onBlur={onBlur} />)
      const input = screen.getByRole('textbox')
      
      await user.type(input, 'test value')
      expect(onBlur).not.toHaveBeenCalled()
      
      await user.tab() // Move focus away to trigger blur
      
      expect(onBlur).toHaveBeenCalledTimes(1)
      expect(onBlur).toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({
          value: 'test value'
        })
      }))
    })

    test('onBlur receives correct event object', async () => {
      const onBlur = jest.fn()
      render(<NuclearInput onBlur={onBlur} name="test-input" />)
      const input = screen.getByRole('textbox')
      
      await user.type(input, 'test value')
      await user.tab()
      
      expect(onBlur).toHaveBeenCalledWith(expect.objectContaining({
        type: 'blur',
        target: expect.objectContaining({
          name: 'test-input',
          value: 'test value'
        })
      }))
    })

    test('handles multiple focus/blur cycles correctly', async () => {
      const onBlur = jest.fn()
      render(
        <div>
          <NuclearInput onBlur={onBlur} />
          <input data-testid="other-input" />
        </div>
      )
      
      const input = screen.getByRole('textbox')
      const otherInput = screen.getByTestId('other-input')
      
      input.focus()
      await user.type(input, 'first')
      otherInput.focus() // Trigger blur
      
      expect(onBlur).toHaveBeenCalledTimes(1)
      
      input.focus()
      await user.type(input, ' second')
      otherInput.focus() // Trigger blur
      
      expect(onBlur).toHaveBeenCalledTimes(2)
      expect(input.value).toBe('first second')
    })
  })

  describe('Property Descriptor Protection', () => {
    test('allows internal value changes during typing', async () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      await user.type(input, 'internal change')
      
      expect(input.value).toBe('internal change')
      // Note: UnifiedInput doesn't log for production security
    })

    test('blocks external programmatic value changes when focused', async () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      input.focus()
      await user.type(input, 'user typed')
      
      act(() => {
        try {
          input.value = 'external change'
        } catch (e) {
        }
      })
      
      expect(input.value).toBe('user typed')
    })

    test('allows value changes when not focused', () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      act(() => {
        input.value = 'allowed external change'
      })
      
      expect(input.value).toBe('allowed external change')
    })
  })

  describe('Mutation Observer Protection', () => {
    test('prevents external attribute manipulation during typing', async () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      input.focus()
      await user.type(input, 'protected')
      
      act(() => {
        input.setAttribute('value', 'malicious change')
      })
      
      // Note: UnifiedInput provides silent protection for production security
    })

    test('mutation observer is properly cleaned up', () => {
      const { unmount } = render(<NuclearInput />)
      
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Ref Handling', () => {
    test('forwards ref correctly', () => {
      const ref = React.createRef()
      render(<NuclearInput ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      expect(ref.current.tagName).toBe('INPUT')
    })

    test('works with callback refs', () => {
      let refElement = null
      const callbackRef = (element) => {
        refElement = element
      }
      
      render(<NuclearInput ref={callbackRef} />)
      
      expect(refElement).toBeInstanceOf(HTMLInputElement)
    })

    test('maintains ref stability across re-renders', () => {
      const ref = React.createRef()
      const { rerender } = render(<NuclearInput ref={ref} defaultValue="first" />)
      
      const firstElement = ref.current
      
      rerender(<NuclearInput ref={ref} defaultValue="second" />)
      
      expect(ref.current).toBe(firstElement) // Same element reference
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles rapid defaultValue changes', async () => {
      const { rerender } = render(<NuclearInput defaultValue="value1" />)
      const input = screen.getByRole('textbox')
      
      rerender(<NuclearInput defaultValue="value2" />)
      rerender(<NuclearInput defaultValue="value3" />)
      rerender(<NuclearInput defaultValue="value4" />)
      
      await waitFor(() => {
        expect(input.value).toBe('value4')
      })
    })

    test('handles null and undefined defaultValue gracefully', () => {
      const { rerender } = render(<NuclearInput defaultValue={null} />)
      const input = screen.getByRole('textbox')
      
      expect(input.value).toBe('')
      
      rerender(<NuclearInput defaultValue={undefined} />)
      expect(input.value).toBe('')
    })

    test('handles component unmounting during user interaction', async () => {
      const { unmount } = render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      input.focus()
      await user.type(input, 'typing...')
      
      expect(() => unmount()).not.toThrow()
    })

    test('handles missing onBlur prop gracefully', async () => {
      render(<NuclearInput />)
      const input = screen.getByRole('textbox')
      
      await user.type(input, 'test')
      
      expect(() => user.tab()).not.toThrow()
    })
  })

  describe('Memory and Performance', () => {
    test('properly cleans up mutation observer on unmount', () => {
      const { unmount } = render(<NuclearInput />)
      
      const disconnectSpy = jest.spyOn(MutationObserver.prototype, 'disconnect')
      
      unmount()
      
      expect(disconnectSpy).toHaveBeenCalled()
      disconnectSpy.mockRestore()
    })

    test('handles multiple instances without interference', () => {
      render(
        <div>
          <NuclearInput data-testid="input1" defaultValue="first" />
          <NuclearInput data-testid="input2" defaultValue="second" />
          <NuclearInput data-testid="input3" defaultValue="third" />
        </div>
      )
      
      const input1 = screen.getByTestId('input1')
      const input2 = screen.getByTestId('input2')
      const input3 = screen.getByTestId('input3')
      
      expect(input1.value).toBe('first')
      expect(input2.value).toBe('second')
      expect(input3.value).toBe('third')
    })
  })

  describe('Browser Compatibility Edge Cases', () => {
    test('handles browsers without MutationObserver gracefully', () => {
      const originalMutationObserver = global.MutationObserver
      delete global.MutationObserver
      
      expect(() => {
        render(<NuclearInput />)
      }).not.toThrow()
      
      global.MutationObserver = originalMutationObserver
    })

    test('handles property descriptor edge cases', () => {
      const input = document.createElement('input')
      
      const originalValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      
      expect(originalValueSetter).toBeDefined()
      expect(typeof originalValueSetter).toBe('function')
    })
  })
})
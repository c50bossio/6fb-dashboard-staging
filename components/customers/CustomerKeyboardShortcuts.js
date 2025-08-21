/**
 * Customer Keyboard Shortcuts Component
 * 
 * Provides power user keyboard shortcuts for efficient customer management
 * Includes command palette, hotkeys, and accessibility features
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  CommandLineIcon,
  UserPlusIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

/**
 * Keyboard shortcut hook
 */
export function useKeyboardShortcut(key, callback, options = {}) {
  const { ctrl = false, alt = false, shift = false, meta = false, preventDefault = true } = options

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isCtrlPressed = event.ctrlKey || event.metaKey
      const isAltPressed = event.altKey
      const isShiftPressed = event.shiftKey
      const isMetaPressed = event.metaKey

      const keyMatch = event.key.toLowerCase() === key.toLowerCase()
      const modifiersMatch = (
        (!ctrl || isCtrlPressed) &&
        (!alt || isAltPressed) &&
        (!shift || isShiftPressed) &&
        (!meta || isMetaPressed)
      )

      if (keyMatch && modifiersMatch) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback(event)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [key, callback, ctrl, alt, shift, meta, preventDefault])
}

/**
 * Command palette for quick actions
 */
export function CustomerCommandPalette({
  isOpen,
  onClose,
  customers = [],
  onSelectCustomer,
  onExecuteAction,
  className = ''
}) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Available commands
  const commands = [
    {
      id: 'add-customer',
      title: 'Add Customer',
      subtitle: 'Create a new customer profile',
      icon: UserPlusIcon,
      action: () => onExecuteAction?.('add-customer'),
      keywords: ['add', 'new', 'create', 'customer']
    },
    {
      id: 'search-customers',
      title: 'Search Customers',
      subtitle: 'Find customers by name, email, or phone',
      icon: MagnifyingGlassIcon,
      action: () => onExecuteAction?.('search'),
      keywords: ['search', 'find', 'lookup']
    },
    {
      id: 'filter-vip',
      title: 'Filter VIP Customers',
      subtitle: 'Show only VIP customers',
      icon: StarIcon,
      action: () => onExecuteAction?.('filter-vip'),
      keywords: ['vip', 'filter', 'premium']
    },
    {
      id: 'filter-new',
      title: 'Filter New Customers',
      subtitle: 'Show only new customers',
      icon: FunnelIcon,
      action: () => onExecuteAction?.('filter-new'),
      keywords: ['new', 'filter', 'recent']
    },
    {
      id: 'refresh',
      title: 'Refresh Data',
      subtitle: 'Reload customer information',
      icon: ArrowPathIcon,
      action: () => onExecuteAction?.('refresh'),
      keywords: ['refresh', 'reload', 'update']
    },
    {
      id: 'export',
      title: 'Export Customers',
      subtitle: 'Download customer data as CSV',
      icon: DocumentDuplicateIcon,
      action: () => onExecuteAction?.('export'),
      keywords: ['export', 'download', 'csv']
    }
  ]

  // Filter commands based on query
  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(query.toLowerCase()) ||
    command.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    command.keywords.some(keyword => keyword.includes(query.toLowerCase()))
  )

  // Filter customers based on query
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(query.toLowerCase()) ||
    customer.email.toLowerCase().includes(query.toLowerCase()) ||
    customer.phone.includes(query)
  ).slice(0, 5) // Limit to 5 results

  const allResults = [
    ...filteredCommands.map(cmd => ({ ...cmd, type: 'command' })),
    ...filteredCustomers.map(customer => ({
      id: `customer-${customer.id}`,
      title: customer.name,
      subtitle: customer.email || customer.phone,
      icon: UserPlusIcon,
      type: 'customer',
      customer
    }))
  ]

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % allResults.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev === 0 ? allResults.length - 1 : prev - 1)
          break
        case 'Enter':
          e.preventDefault()
          if (allResults[selectedIndex]) {
            handleSelect(allResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, allResults])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  const handleSelect = (item) => {
    if (item.type === 'customer') {
      onSelectCustomer?.(item.customer)
    } else {
      item.action?.()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Command palette */}
      <div className={`
        relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden
        animate-in fade-in-0 zoom-in-95 slide-in-from-top-4
        ${className}
      `}>
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customers or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-base text-gray-900 placeholder-gray-500 border-none outline-none bg-transparent"
          />
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <kbd className="px-2 py-1 bg-gray-100 rounded">↑↓</kbd>
            <span>navigate</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded">↵</kbd>
            <span>select</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded">esc</kbd>
            <span>close</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {allResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <CommandLineIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found</p>
              <p className="text-sm mt-1">Try searching for customers or commands</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Commands section */}
              {filteredCommands.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Commands
                  </div>
                  {filteredCommands.map((command, index) => {
                    const Icon = command.icon
                    const isSelected = allResults.findIndex(r => r.id === command.id) === selectedIndex
                    
                    return (
                      <button
                        key={command.id}
                        onClick={() => handleSelect({ ...command, type: 'command' })}
                        className={`
                          w-full px-4 py-3 flex items-center space-x-3 text-left transition-colors
                          ${isSelected ? 'bg-olive-50 border-r-2 border-olive-500' : 'hover:bg-gray-50'}
                        `}
                      >
                        <div className={`
                          p-2 rounded-lg
                          ${isSelected ? 'bg-olive-100' : 'bg-gray-100'}
                        `}>
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-olive-600' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{command.title}</p>
                          <p className="text-xs text-gray-500 truncate">{command.subtitle}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Customers section */}
              {filteredCustomers.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Customers
                  </div>
                  {filteredCustomers.map((customer, index) => {
                    const resultIndex = allResults.findIndex(r => r.id === `customer-${customer.id}`)
                    const isSelected = resultIndex === selectedIndex
                    
                    return (
                      <button
                        key={customer.id}
                        onClick={() => handleSelect({ customer, type: 'customer' })}
                        className={`
                          w-full px-4 py-3 flex items-center space-x-3 text-left transition-colors
                          ${isSelected ? 'bg-olive-50 border-r-2 border-olive-500' : 'hover:bg-gray-50'}
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                          ${isSelected ? 'bg-olive-200 text-olive-800' : 'bg-gray-200 text-gray-700'}
                        `}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {customer.email || customer.phone}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {customer.segment && (
                            <span className={`
                              inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                              ${customer.segment === 'vip' ? 'bg-gold-100 text-gold-800' :
                                customer.segment === 'new' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'}
                            `}>
                              {customer.segment.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Keyboard shortcuts help modal
 */
export function KeyboardShortcutsHelp({ isOpen, onClose, className = '' }) {
  const shortcuts = [
    {
      category: 'General',
      shortcuts: [
        { key: '⌘ K', description: 'Open command palette' },
        { key: '⌘ /', description: 'Show keyboard shortcuts' },
        { key: 'ESC', description: 'Close modal or cancel action' },
        { key: '⌘ R', description: 'Refresh data' }
      ]
    },
    {
      category: 'Navigation',
      shortcuts: [
        { key: '↑ ↓', description: 'Navigate through items' },
        { key: '⌘ ↑', description: 'Go to first item' },
        { key: '⌘ ↓', description: 'Go to last item' },
        { key: 'ENTER', description: 'Select item' }
      ]
    },
    {
      category: 'Customer Actions',
      shortcuts: [
        { key: '⌘ N', description: 'Add new customer' },
        { key: '⌘ F', description: 'Focus search' },
        { key: '⌘ E', description: 'Export customers' },
        { key: 'V', description: 'View customer details (when selected)' },
        { key: 'E', description: 'Edit customer (when selected)' },
        { key: 'C', description: 'Call customer (when selected)' },
        { key: 'M', description: 'Email customer (when selected)' }
      ]
    },
    {
      category: 'Filters',
      shortcuts: [
        { key: '⌘ 1', description: 'Show all customers' },
        { key: '⌘ 2', description: 'Show VIP customers' },
        { key: '⌘ 3', description: 'Show new customers' },
        { key: '⌘ 4', description: 'Show regular customers' },
        { key: '⌘ 5', description: 'Show lapsed customers' }
      ]
    }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden
        animate-in fade-in-0 zoom-in-95
        ${className}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          <div className="p-6 space-y-8">
            {shortcuts.map((category) => (
              <div key={category.category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {category.category}
                </h3>
                <div className="grid gap-3">
                  {category.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-gray-700">{shortcut.description}</span>
                      <kbd className="px-3 py-1 text-sm font-mono bg-gray-100 border border-gray-300 rounded-md">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">⌘ /</kbd> anytime to view these shortcuts
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Global keyboard shortcuts provider
 */
export function CustomerKeyboardProvider({
  children,
  onOpenCommandPalette,
  onOpenHelp,
  onAddCustomer,
  onRefresh,
  onFocusSearch,
  onExport,
  onFilterChange,
  selectedCustomer,
  onCustomerAction
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // Global shortcuts
  useKeyboardShortcut('k', () => setCommandPaletteOpen(true), { ctrl: true })
  useKeyboardShortcut('/', () => setHelpOpen(true), { ctrl: true })
  useKeyboardShortcut('n', onAddCustomer, { ctrl: true })
  useKeyboardShortcut('r', onRefresh, { ctrl: true })
  useKeyboardShortcut('f', onFocusSearch, { ctrl: true })
  useKeyboardShortcut('e', onExport, { ctrl: true })

  // Filter shortcuts
  useKeyboardShortcut('1', () => onFilterChange?.('all'), { ctrl: true })
  useKeyboardShortcut('2', () => onFilterChange?.('vip'), { ctrl: true })
  useKeyboardShortcut('3', () => onFilterChange?.('new'), { ctrl: true })
  useKeyboardShortcut('4', () => onFilterChange?.('regular'), { ctrl: true })
  useKeyboardShortcut('5', () => onFilterChange?.('lapsed'), { ctrl: true })

  // Customer-specific shortcuts (when a customer is selected)
  useKeyboardShortcut('v', () => {
    if (selectedCustomer) onCustomerAction?.('view', selectedCustomer)
  }, { preventDefault: true })
  
  useKeyboardShortcut('e', () => {
    if (selectedCustomer) onCustomerAction?.('edit', selectedCustomer)
  }, { preventDefault: true })
  
  useKeyboardShortcut('c', () => {
    if (selectedCustomer) onCustomerAction?.('call', selectedCustomer)
  }, { preventDefault: true })
  
  useKeyboardShortcut('m', () => {
    if (selectedCustomer) onCustomerAction?.('email', selectedCustomer)
  }, { preventDefault: true })

  const handleCommandPaletteAction = (action) => {
    switch (action) {
      case 'add-customer':
        onAddCustomer?.()
        break
      case 'search':
        onFocusSearch?.()
        break
      case 'refresh':
        onRefresh?.()
        break
      case 'export':
        onExport?.()
        break
      case 'filter-vip':
        onFilterChange?.('vip')
        break
      case 'filter-new':
        onFilterChange?.('new')
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  return (
    <>
      {children}
      
      <CustomerCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onExecuteAction={handleCommandPaletteAction}
        onSelectCustomer={(customer) => onCustomerAction?.('view', customer)}
      />
      
      <KeyboardShortcutsHelp
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  )
}

export default {
  useKeyboardShortcut,
  CustomerCommandPalette,
  KeyboardShortcutsHelp,
  CustomerKeyboardProvider
}
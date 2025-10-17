'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  const menuItems = [
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/demo', label: 'Demo' },
    { href: '/login', label: 'Login' },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden">
        <button 
          onClick={toggleMenu}
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg transition-colors duration-200"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

      {/* Mobile menu panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 max-w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gradient-to-br from-olive-600 to-gold-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">6FB</span>
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">AI Agent System</span>
          </div>
          <button
            onClick={closeMenu}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
            aria-label="Close navigation menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  onClick={closeMenu}
                  className="block px-4 py-3 text-gray-700 hover:text-olive-600 hover:bg-olive-50 rounded-lg transition-all duration-200 font-medium"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link 
              href="/subscribe"
              onClick={closeMenu}
              className="block w-full bg-gradient-to-r from-olive-600 to-gold-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-olive-700 hover:to-gold-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-center"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Footer links in mobile menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/about" onClick={closeMenu} className="text-gray-500 hover:text-olive-600 py-2">About</Link>
            <Link href="/contact" onClick={closeMenu} className="text-gray-500 hover:text-olive-600 py-2">Contact</Link>
            <Link href="/support" onClick={closeMenu} className="text-gray-500 hover:text-olive-600 py-2">Support</Link>
            <Link href="/docs" onClick={closeMenu} className="text-gray-500 hover:text-olive-600 py-2">Docs</Link>
          </div>
        </div>
      </div>
    </>
  )
}
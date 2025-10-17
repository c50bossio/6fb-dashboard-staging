'use client'

import { Fragment, useRef, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useResponsiveCalendar } from '../../hooks/useResponsiveCalendar'

/**
 * Mobile-optimized bottom sheet component with swipe-to-dismiss
 * Automatically switches between bottom sheet (mobile) and side drawer (desktop/tablet)
 *
 * Features:
 * - Native touch gesture support (swipe down to dismiss)
 * - Responsive: bottom sheet on mobile, side drawer on tablet/desktop
 * - Velocity-based dismissal for natural feel
 * - Drag resistance for over-scroll effect
 * - Safe area insets for notched devices (iPhone)
 * - Touch-friendly close button (44px minimum)
 *
 * @param {boolean} open - Whether the sheet is open
 * @param {function} onClose - Callback when sheet should close
 * @param {string} title - Sheet title (optional)
 * @param {React.ReactNode} children - Sheet content
 * @param {string} size - 'sm' | 'md' | 'lg' | 'full' (default: 'md')
 * @param {boolean} enableSwipeToDismiss - Enable swipe gesture (default: true)
 */
export default function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  enableSwipeToDismiss = true,
}) {
  const { isMobile, isTablet } = useResponsiveCalendar()
  const sheetRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartY = useRef(0)
  const dragStartTime = useRef(0)

  // Size configurations
  const sizeClasses = {
    sm: 'max-h-[40vh]',
    md: 'max-h-[60vh]',
    lg: 'max-h-[80vh]',
    full: 'h-[calc(100vh-4rem)]', // Leave space for status bar
  }

  // Reset drag state when sheet closes
  useEffect(() => {
    if (!open) {
      setDragOffset(0)
      setIsDragging(false)
    }
  }, [open])

  // Touch event handlers for swipe-to-dismiss
  const handleTouchStart = (e) => {
    if (!enableSwipeToDismiss || !isMobile) return

    // Only start drag if touching the header area or drag handle
    const target = e.target
    const isHeaderArea = target.closest('[data-drag-handle]') || target.closest('[data-sheet-header]')

    if (!isHeaderArea) return

    dragStartY.current = e.touches[0].clientY
    dragStartTime.current = Date.now()
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || !enableSwipeToDismiss || !isMobile) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - dragStartY.current

    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      // Add resistance when dragging too far
      if (deltaY > 200) {
        setDragOffset(200 + (deltaY - 200) * 0.3) // Stronger resistance
      } else {
        setDragOffset(deltaY)
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging || !enableSwipeToDismiss || !isMobile) return

    const dragDuration = Date.now() - dragStartTime.current
    const dragVelocity = dragOffset / (dragDuration || 1) // pixels per ms

    // Dismiss if:
    // 1. Dragged more than 100px down, OR
    // 2. Fast swipe (velocity > 0.5 px/ms) with at least 50px drag
    const shouldDismiss = dragOffset > 100 || (dragVelocity > 0.5 && dragOffset > 50)

    if (shouldDismiss) {
      onClose()
    }

    // Reset drag state
    setDragOffset(0)
    setIsDragging(false)
  }

  // Determine if we should use bottom sheet (mobile) or side drawer (tablet/desktop)
  const useBottomSheet = isMobile

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop with blur effect */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className={`flex min-h-full ${useBottomSheet ? 'items-end' : 'items-center justify-end'}`}>
            <Transition.Child
              as={Fragment}
              enter={useBottomSheet ? "transform transition ease-out duration-300" : "transform transition ease-in-out duration-500"}
              enterFrom={useBottomSheet ? "translate-y-full" : "translate-x-full"}
              enterTo={useBottomSheet ? "translate-y-0" : "translate-x-0"}
              leave={useBottomSheet ? "transform transition ease-in duration-200" : "transform transition ease-in-out duration-500"}
              leaveFrom={useBottomSheet ? "translate-y-0" : "translate-x-0"}
              leaveTo={useBottomSheet ? "translate-y-full" : "translate-x-full"}
            >
              <Dialog.Panel
                ref={sheetRef}
                className={`
                  pointer-events-auto overflow-hidden bg-white shadow-xl
                  ${useBottomSheet
                    ? `w-screen ${sizeClasses[size]} rounded-t-3xl`
                    : 'w-screen max-w-md h-screen'
                  }
                `}
                style={
                  isDragging && useBottomSheet
                    ? {
                        transform: `translateY(${dragOffset}px)`,
                        transition: 'none',
                      }
                    : undefined
                }
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex h-full flex-col overflow-y-scroll bg-white">
                  {/* Drag handle (mobile only) */}
                  {useBottomSheet && (
                    <div
                      data-drag-handle
                      className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
                    >
                      <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>
                  )}

                  {/* Header */}
                  {(title || showCloseButton) && (
                    <div
                      data-sheet-header
                      className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10"
                    >
                      {title && (
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                          {title}
                        </Dialog.Title>
                      )}
                      {!title && <div />} {/* Spacer for layout */}
                      {showCloseButton && (
                        <button
                          type="button"
                          className="rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#546355] focus:ring-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          onClick={onClose}
                          aria-label="Close"
                        >
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    {children}
                  </div>

                  {/* Safe area padding for notched devices (iPhone) */}
                  {useBottomSheet && (
                    <div className="h-[env(safe-area-inset-bottom)] bg-white" />
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

/**
 * Hook to detect if bottom sheet should be used (mobile) vs side drawer (desktop/tablet)
 * Useful for parent components to conditionally render different modal types
 */
export function useBottomSheet() {
  const { isMobile } = useResponsiveCalendar()
  return {
    shouldUseBottomSheet: isMobile,
    isMobile,
  }
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use MobileBottomSheet with enableSwipeToDismiss prop instead
 */
export function SwipeableBottomSheet(props) {
  return <MobileBottomSheet {...props} enableSwipeToDismiss={true} />
}

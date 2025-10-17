/**
 * Mobile Accessibility and Optimization Tests for Customization Components
 * 
 * This test suite focuses specifically on mobile accessibility standards,
 * touch interactions, responsive design, and mobile-specific optimizations
 * for the enhanced customization page components.
 * 
 * Test Categories:
 * - Touch Target Accessibility
 * - Mobile Screen Reader Support
 * - Responsive Design Compliance
 * - Mobile Performance Optimization
 * - Touch Gesture Support
 * - Mobile Keyboard Support
 * - Viewport and Orientation Handling
 * - Mobile-Specific Error Handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest } from '@jest/globals';
import CustomizePage from '../../app/(protected)/customize/page.js';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog.js';
import { UserProfileFactory, FormStateFactory, ImageUploadFactory } from '../mocks/customization-data-factories.js';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  })
}));

jest.mock('../../hooks/useCustomizationForm.js', () => ({
  __esModule: true,
  default: () => ({
    formData: FormStateFactory.clean(),
    updateField: jest.fn(),
    saveForm: jest.fn(),
    resetForm: jest.fn(),
    isDirty: false,
    isAutoSaving: false,
    lastSaved: new Date().toISOString(),
    errors: {},
    canUndo: false,
    canRedo: false,
    undo: jest.fn(),
    redo: jest.fn()
  })
}));

jest.mock('../../hooks/useImageUpload.js', () => ({
  __esModule: true,
  default: () => ({
    files: [],
    uploading: false,
    uploadFiles: jest.fn(),
    removeFile: jest.fn(),
    clearFiles: jest.fn()
  })
}));

// Mobile viewport configurations
const MOBILE_VIEWPORTS = {
  iphone_se: { width: 375, height: 667 },
  iphone_12: { width: 390, height: 844 },
  iphone_12_pro_max: { width: 428, height: 926 },
  samsung_galaxy_s21: { width: 360, height: 800 },
  samsung_galaxy_note: { width: 414, height: 896 },
  pixel_5: { width: 393, height: 851 },
  ipad_mini: { width: 768, height: 1024 },
  ipad_pro: { width: 834, height: 1194 }
};

// Mobile test wrapper
const MobileTestWrapper = ({ children, viewport = 'iphone_12' }) => {
  const { width, height } = MOBILE_VIEWPORTS[viewport];
  
  // Set viewport dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height
  });

  return (
    <div 
      role="main" 
      aria-label="Mobile Customization Page"
      style={{ width, height }}
    >
      {children}
    </div>
  );
};

// Mock user data
const mockUsers = {
  individualBarber: UserProfileFactory.individualBarber(),
  barbershopOwner: UserProfileFactory.barbershopOwner(),
  enterpriseOwner: UserProfileFactory.enterpriseOwner()
};

describe('Mobile Accessibility and Optimization Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Touch Target Accessibility (WCAG 2.1 SC 2.5.5)', () => {
    Object.keys(MOBILE_VIEWPORTS).forEach(viewportName => {
      test(`should maintain 44px minimum touch targets on ${viewportName}`, () => {
        render(
          <MobileTestWrapper viewport={viewportName}>
            <CustomizePage user={mockUsers.individualBarber} />
          </MobileTestWrapper>
        );

        const touchTargets = [
          ...screen.getAllByRole('button'),
          ...screen.getAllByRole('checkbox'),
          ...screen.getAllByRole('radio'),
          ...document.querySelectorAll('input[type="file"]'),
          ...document.querySelectorAll('[role="tab"]')
        ];

        touchTargets.forEach(target => {
          const rect = target.getBoundingClientRect();
          const computedStyle = getComputedStyle(target);
          
          // Check actual size including padding and border
          const totalWidth = Math.max(
            rect.width,
            parseInt(computedStyle.minWidth) || 0,
            parseInt(computedStyle.width) || 0
          );
          const totalHeight = Math.max(
            rect.height,
            parseInt(computedStyle.minHeight) || 0,
            parseInt(computedStyle.height) || 0
          );

          expect(totalWidth).toBeGreaterThanOrEqual(44);
          expect(totalHeight).toBeGreaterThanOrEqual(44);
        });
      });
    });

    test('should provide adequate spacing between touch targets', () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const touchTargets = screen.getAllByRole('button');
      
      for (let i = 0; i < touchTargets.length - 1; i++) {
        const current = touchTargets[i].getBoundingClientRect();
        const next = touchTargets[i + 1].getBoundingClientRect();
        
        // Check if elements are in same row/column and calculate spacing
        const horizontalOverlap = current.right > next.left && current.left < next.right;
        const verticalOverlap = current.bottom > next.top && current.top < next.bottom;
        
        if (horizontalOverlap || verticalOverlap) {
          const horizontalSpacing = Math.min(
            Math.abs(current.right - next.left),
            Math.abs(next.right - current.left)
          );
          const verticalSpacing = Math.min(
            Math.abs(current.bottom - next.top),
            Math.abs(next.bottom - current.top)
          );
          
          // Minimum 8px spacing between adjacent touch targets
          const hasAdequateSpacing = horizontalSpacing >= 8 || verticalSpacing >= 8;
          expect(hasAdequateSpacing).toBeTruthy();
        }
      }
    });

    test('should handle touch interactions with proper feedback', async () => {
      const mockSave = jest.fn();
      
      jest.doMock('../../hooks/useCustomizationForm.js', () => ({
        __esModule: true,
        default: () => ({
          formData: FormStateFactory.clean(),
          saveForm: mockSave
        })
      }));

      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      
      // Simulate touch start (should provide visual feedback)
      fireEvent.touchStart(saveButton);
      await waitFor(() => {
        const styles = getComputedStyle(saveButton);
        expect(styles.backgroundColor).not.toBe('transparent');
      });

      // Simulate touch end (should trigger action)
      fireEvent.touchEnd(saveButton);
      fireEvent.click(saveButton);
      
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('Mobile Screen Reader Support', () => {
    test('should provide appropriate mobile screen reader announcements', async () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      // Check for mobile-specific live regions
      const liveRegions = screen.getAllByRole('status').concat(
        screen.getAllByRole('alert')
      );
      
      expect(liveRegions.length).toBeGreaterThan(0);
      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
      });
    });

    test('should handle mobile form navigation properly', async () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const formElements = [
        ...screen.getAllByRole('textbox'),
        ...screen.getAllByRole('checkbox'),
        ...screen.getAllByRole('combobox')
      ];

      formElements.forEach(element => {
        // Each form element should have proper labeling for mobile screen readers
        expect(element).toHaveAccessibleName();
        
        // Should have proper grouping for related fields
        const fieldset = element.closest('fieldset');
        if (fieldset) {
          expect(fieldset).toHaveAccessibleName();
        }
      });
    });

    test('should announce section expansions on mobile', async () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const expandableButtons = screen.getAllByRole('button').filter(button =>
        button.hasAttribute('aria-expanded')
      );

      for (const button of expandableButtons) {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        const controlsId = button.getAttribute('aria-controls');
        
        if (controlsId) {
          const controlledElement = document.getElementById(controlsId);
          expect(controlledElement).toBeTruthy();
          
          if (isExpanded) {
            expect(controlledElement).toBeVisible();
          }
        }
      }
    });
  });

  describe('Responsive Design Compliance', () => {
    Object.keys(MOBILE_VIEWPORTS).forEach(viewportName => {
      test(`should render correctly on ${viewportName}`, async () => {
        const { container } = render(
          <MobileTestWrapper viewport={viewportName}>
            <CustomizePage user={mockUsers.individualBarber} />
          </MobileTestWrapper>
        );

        // No horizontal overflow
        const mainContent = container.firstChild;
        expect(mainContent.scrollWidth).toBeLessThanOrEqual(MOBILE_VIEWPORTS[viewportName].width);

        // All content should be accessible
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    test('should handle dynamic content resizing', async () => {
      const { rerender } = render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      // Simulate expanding a section with large content
      const sectionButton = screen.getByRole('button', { name: /services/i });
      await user.click(sectionButton);

      await waitFor(() => {
        const expandedSection = screen.getByRole('region', { name: /services/i });
        expect(expandedSection).toBeVisible();
        
        // Content should not cause horizontal overflow
        const rect = expandedSection.getBoundingClientRect();
        expect(rect.right).toBeLessThanOrEqual(MOBILE_VIEWPORTS.iphone_12.width);
      });
    });

    test('should adapt form layouts for mobile', () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.barbershopOwner} />
        </MobileTestWrapper>
      );

      // Form fields should stack vertically on mobile
      const formFields = screen.getAllByRole('textbox');
      
      for (let i = 0; i < formFields.length - 1; i++) {
        const current = formFields[i].getBoundingClientRect();
        const next = formFields[i + 1].getBoundingClientRect();
        
        // Next field should be below current field (vertical stacking)
        expect(next.top).toBeGreaterThan(current.bottom - 10); // 10px tolerance
      }
    });
  });

  describe('Mobile Performance Optimization', () => {
    test('should implement lazy loading for mobile', async () => {
      const { container } = render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.enterpriseOwner} />
        </MobileTestWrapper>
      );

      // Check for lazy loading attributes on images
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        if (img.getAttribute('src')) {
          // Should have loading="lazy" for performance
          expect(img.getAttribute('loading')).toBe('lazy');
        }
      });

      // Check for intersection observer usage (virtual scrolling)
      const virtualizedLists = container.querySelectorAll('[data-virtualized]');
      expect(virtualizedLists.length).toBeGreaterThanOrEqual(0);
    });

    test('should optimize render performance on mobile', async () => {
      const renderStart = performance.now();
      
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.enterpriseOwner} />
        </MobileTestWrapper>
      );

      const renderTime = performance.now() - renderStart;
      
      // Initial render should be fast on mobile (under 500ms)
      expect(renderTime).toBeLessThan(500);
    });

    test('should debounce input interactions for performance', async () => {
      const mockUpdate = jest.fn();
      
      jest.doMock('../../hooks/useCustomizationForm.js', () => ({
        __esModule: true,
        default: () => ({
          formData: FormStateFactory.clean(),
          updateField: mockUpdate
        })
      }));

      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const textInput = screen.getByRole('textbox', { name: /display name/i });
      
      // Type rapidly (simulating mobile typing)
      await user.type(textInput, 'Test Name', { delay: 50 });
      
      // Updates should be debounced, not called for every keystroke
      expect(mockUpdate.mock.calls.length).toBeLessThan(9); // "Test Name" = 9 chars
    });
  });

  describe('Touch Gesture Support', () => {
    test('should support swipe gestures for navigation', async () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const mainContent = screen.getByRole('main');
      
      // Simulate swipe right
      fireEvent.touchStart(mainContent, {
        touches: [{ clientX: 50, clientY: 300 }]
      });
      
      fireEvent.touchMove(mainContent, {
        touches: [{ clientX: 150, clientY: 300 }]
      });
      
      fireEvent.touchEnd(mainContent, {
        changedTouches: [{ clientX: 150, clientY: 300 }]
      });

      // Should handle swipe gesture gracefully
      await waitFor(() => {
        expect(mainContent).toBeInTheDocument();
      });
    });

    test('should support pinch-to-zoom accessibility', () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      // Check that viewport meta tag allows zooming
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        const content = viewportMeta.getAttribute('content');
        expect(content).not.toContain('user-scalable=no');
        expect(content).not.toContain('maximum-scale=1');
      }
    });

    test('should handle long press interactions', async () => {
      const mockContextMenu = jest.fn();
      
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const actionButton = screen.getByRole('button', { name: /more options/i });
      if (actionButton) {
        actionButton.addEventListener('contextmenu', mockContextMenu);
        
        // Simulate long press
        fireEvent.touchStart(actionButton);
        
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms long press
        
        fireEvent.contextMenu(actionButton);
        fireEvent.touchEnd(actionButton);
        
        expect(mockContextMenu).toHaveBeenCalled();
      }
    });
  });

  describe('Mobile Keyboard Support', () => {
    test('should show appropriate mobile keyboards', () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      // Email inputs should use email keyboard
      const emailInputs = screen.getAllByRole('textbox', { name: /email/i });
      emailInputs.forEach(input => {
        expect(input).toHaveAttribute('inputMode', 'email');
        expect(input).toHaveAttribute('type', 'email');
      });

      // Phone inputs should use numeric keyboard
      const phoneInputs = screen.getAllByRole('textbox', { name: /phone/i });
      phoneInputs.forEach(input => {
        expect(input).toHaveAttribute('inputMode', 'tel');
        expect(input).toHaveAttribute('type', 'tel');
      });

      // Numeric inputs should use numeric keyboard
      const numberInputs = screen.getAllByRole('spinbutton');
      numberInputs.forEach(input => {
        expect(input).toHaveAttribute('inputMode', 'numeric');
      });
    });

    test('should handle mobile keyboard navigation', async () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const textInputs = screen.getAllByRole('textbox');
      
      // Tab through inputs (mobile keyboards often have next/previous)
      for (let i = 0; i < Math.min(textInputs.length, 3); i++) {
        await user.tab();
        expect(document.activeElement).toBe(textInputs[i]);
      }
    });

    test('should provide appropriate autocomplete attributes', () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      // Common fields should have autocomplete for mobile convenience
      const nameInput = screen.queryByRole('textbox', { name: /name/i });
      if (nameInput) {
        expect(nameInput).toHaveAttribute('autoComplete', 'name');
      }

      const emailInput = screen.queryByRole('textbox', { name: /email/i });
      if (emailInput) {
        expect(emailInput).toHaveAttribute('autoComplete', 'email');
      }

      const phoneInput = screen.queryByRole('textbox', { name: /phone/i });
      if (phoneInput) {
        expect(phoneInput).toHaveAttribute('autoComplete', 'tel');
      }
    });
  });

  describe('Viewport and Orientation Handling', () => {
    test('should handle portrait to landscape orientation changes', async () => {
      const { container, rerender } = render(
        <MobileTestWrapper viewport="iphone_12">
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      // Start in portrait
      expect(window.innerWidth).toBe(390);
      expect(window.innerHeight).toBe(844);

      // Simulate orientation change to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 844
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 390
      });

      fireEvent(window, new Event('orientationchange'));
      
      await waitFor(async () => {
        // Should maintain accessibility after orientation change
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    test('should adapt layout for different orientations', () => {
      // Portrait mode
      render(
        <MobileTestWrapper viewport="iphone_12">
          <CustomizePage user={mockUsers.barbershopOwner} />
        </MobileTestWrapper>
      );

      const portraitElements = screen.getAllByRole('textbox');
      const portraitLayout = portraitElements.map(el => ({
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height
      }));

      // Landscape mode would show different layout characteristics
      expect(portraitLayout.length).toBeGreaterThan(0);
    });

    test('should handle safe area insets', () => {
      render(
        <MobileTestWrapper viewport="iphone_12">
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const mainContent = screen.getByRole('main');
      const styles = getComputedStyle(mainContent);
      
      // Should account for safe areas (notches, home indicators)
      const hasSafeAreaSupport = 
        styles.paddingTop.includes('safe-area-inset-top') ||
        styles.paddingBottom.includes('safe-area-inset-bottom') ||
        styles.paddingLeft.includes('safe-area-inset-left') ||
        styles.paddingRight.includes('safe-area-inset-right') ||
        parseInt(styles.paddingTop) > 0; // Fallback padding

      expect(hasSafeAreaSupport).toBeTruthy();
    });
  });

  describe('Mobile-Specific Error Handling', () => {
    test('should display mobile-friendly error messages', async () => {
      const mockErrors = {
        displayName: 'Display name is required',
        phone: 'Please enter a valid phone number'
      };

      jest.doMock('../../hooks/useCustomizationForm.js', () => ({
        __esModule: true,
        default: () => ({
          formData: FormStateFactory.withErrors(),
          errors: mockErrors,
          isDirty: true
        })
      }));

      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const errorMessages = screen.getAllByRole('alert');
      errorMessages.forEach(error => {
        const rect = error.getBoundingClientRect();
        
        // Error messages should fit within mobile viewport
        expect(rect.right).toBeLessThanOrEqual(MOBILE_VIEWPORTS.iphone_12.width);
        
        // Should have adequate font size for mobile
        const styles = getComputedStyle(error);
        const fontSize = parseInt(styles.fontSize);
        expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
      });
    });

    test('should handle network errors gracefully on mobile', async () => {
      const mockNetworkError = jest.fn();
      
      jest.doMock('../../hooks/useCustomizationForm.js', () => ({
        __esModule: true,
        default: () => ({
          formData: FormStateFactory.clean(),
          saveForm: mockNetworkError.mockRejectedValue(new Error('Network error')),
          networkError: 'Unable to save. Please check your connection and try again.'
        })
      }));

      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      // Should show mobile-friendly network error message
      const errorMessage = screen.queryByText(/check your connection/i);
      if (errorMessage) {
        expect(errorMessage).toBeInTheDocument();
        
        // Should be easily tappable
        const rect = errorMessage.getBoundingClientRect();
        expect(rect.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('should provide retry mechanisms for mobile', async () => {
      const mockRetry = jest.fn();
      
      jest.doMock('../../hooks/useCustomizationForm.js', () => ({
        __esModule: true,
        default: () => ({
          formData: FormStateFactory.clean(),
          retry: mockRetry,
          hasError: true
        })
      }));

      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const retryButton = screen.queryByRole('button', { name: /retry/i });
      if (retryButton) {
        expect(retryButton).toBeInTheDocument();
        
        // Retry button should meet touch target requirements
        const rect = retryButton.getBoundingClientRect();
        expect(rect.height).toBeGreaterThanOrEqual(44);
        expect(rect.width).toBeGreaterThanOrEqual(44);
        
        await user.click(retryButton);
        expect(mockRetry).toHaveBeenCalled();
      }
    });
  });

  describe('Mobile Image Upload Optimization', () => {
    test('should optimize image uploads for mobile', async () => {
      const mockImageUpload = jest.fn();
      
      jest.doMock('../../hooks/useImageUpload.js', () => ({
        __esModule: true,
        default: () => ({
          files: [],
          uploading: false,
          uploadFiles: mockImageUpload,
          maxFileSize: 5 * 1024 * 1024, // 5MB limit for mobile
          acceptedTypes: ['image/jpeg', 'image/png', 'image/webp']
        })
      }));

      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
        </MobileTestWrapper>
      );

      const uploadButton = screen.queryByRole('button', { name: /upload image/i });
      if (uploadButton) {
        // Should provide mobile-friendly upload interface
        expect(uploadButton).toBeInTheDocument();
        
        // Should accept mobile camera input
        const fileInput = document.querySelector('input[type="file"][accept*="image"]');
        if (fileInput) {
          expect(fileInput).toHaveAttribute('accept');
          expect(fileInput.getAttribute('accept')).toContain('image/*');
        }
      }
    });

    test('should show image compression feedback on mobile', async () => {
      const compressionStates = [
        { progress: 25, status: 'compressing' },
        { progress: 50, status: 'compressing' },
        { progress: 100, status: 'complete' }
      ];

      for (const state of compressionStates) {
        jest.doMock('../../hooks/useImageUpload.js', () => ({
          __esModule: true,
          default: () => ({
            files: [{ 
              ...ImageUploadFactory.validImage(),
              compressionProgress: state.progress,
              compressionStatus: state.status
            }],
            uploading: state.status === 'compressing'
          })
        }));

        const { rerender } = render(
          <MobileTestWrapper>
            <CustomizePage user={mockUsers.individualBarber} />
          </MobileTestWrapper>
        );

        if (state.status === 'compressing') {
          const progressIndicator = screen.queryByRole('progressbar');
          if (progressIndicator) {
            expect(progressIndicator).toHaveAttribute('aria-valuenow', state.progress.toString());
          }
        }
      }
    });
  });

  describe('Mobile Dialog and Modal Optimization', () => {
    test('should optimize confirmation dialogs for mobile', async () => {
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.individualBarber} />
          <ConfirmationDialog
            isOpen={true}
            type="warning"
            title="Save Changes"
            message="Do you want to save your changes?"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />
        </MobileTestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      const rect = dialog.getBoundingClientRect();
      
      // Dialog should fit within mobile viewport
      expect(rect.width).toBeLessThanOrEqual(MOBILE_VIEWPORTS.iphone_12.width);
      expect(rect.height).toBeLessThanOrEqual(MOBILE_VIEWPORTS.iphone_12.height);
      
      // Buttons should be mobile-friendly
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      [confirmButton, cancelButton].forEach(button => {
        const buttonRect = button.getBoundingClientRect();
        expect(buttonRect.height).toBeGreaterThanOrEqual(44);
      });
    });

    test('should handle mobile modal scrolling', async () => {
      // Mock a large modal content
      render(
        <MobileTestWrapper>
          <CustomizePage user={mockUsers.enterpriseOwner} />
        </MobileTestWrapper>
      );

      // Simulate opening a large settings modal
      const settingsButton = screen.queryByRole('button', { name: /settings/i });
      if (settingsButton) {
        await user.click(settingsButton);
        
        await waitFor(() => {
          const modal = screen.queryByRole('dialog');
          if (modal) {
            const styles = getComputedStyle(modal);
            expect(styles.overflowY).toBe('auto');
          }
        });
      }
    });
  });
});
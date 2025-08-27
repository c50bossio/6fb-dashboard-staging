/**
 * Quick Mobile Compatibility Validation Script
 * Run this in browser console on localhost:9999/shop/products with modal open
 * 
 * Usage:
 * 1. Navigate to localhost:9999 
 * 2. Go to shop/products page
 * 3. Open appointment checkout modal
 * 4. Paste this script in browser console
 * 5. Run: validateMobileCompatibility()
 */

function validateMobileCompatibility() {

    const results = {
        viewport: getViewportInfo(),
        modal: validateModalResponsiveness(),
        touchTargets: validateTouchTargets(),
        autoSelection: validateAutoSelection(),
        usability: validateUsability(),
        accessibility: validateAccessibility()
    };
    
    // Generate report
    generateValidationReport(results);
    
    return results;
}

function getViewportInfo() {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        category: getDeviceCategory(window.innerWidth)
    };
}

function getDeviceCategory(width) {
    if (width >= 1024) return 'tablet-landscape';
    if (width >= 768) return 'tablet-portrait';
    if (width >= 414) return 'large-phone';
    return 'phone';
}

function validateModalResponsiveness() {
    const modal = document.querySelector('.fixed.inset-0 .bg-white.rounded-xl');
    if (!modal) {
        return { error: 'Modal not found - please open the appointment checkout modal' };
    }
    
    const rect = modal.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(modal);
    
    const viewportWidth = window.innerWidth;
    const modalWidth = rect.width;
    const utilization = (modalWidth / (viewportWidth - 32)) * 100; // Account for padding
    
    return {
        modalWidth: Math.round(modalWidth),
        viewportWidth: viewportWidth,
        utilization: Math.round(utilization) + '%',
        maxWidth: computedStyle.maxWidth,
        fitsViewport: modalWidth <= viewportWidth - 32,
        utilizationGood: utilization >= 70, // Target 70%+ for tablets
        responsive: computedStyle.maxWidth === '28rem', // max-w-md
        scrollable: computedStyle.maxHeight === '90vh' && computedStyle.overflowY === 'auto'
    };
}

function validateTouchTargets() {
    const targets = [
        // Barber selection cards
        ...document.querySelectorAll('[class*="cursor-pointer"][class*="p-3"]'),
        // Change barber button
        document.querySelector('button:has(svg) + button, button[class*="text-emerald"]'),
        // Payment method labels
        ...document.querySelectorAll('label:has(input[type="radio"])'),
        // Action buttons
        ...document.querySelectorAll('.flex.space-x-3 button, button:contains("Complete"), button:contains("Cancel")')
    ].filter(Boolean);
    
    const results = targets.map((target, index) => {
        const rect = target.getBoundingClientRect();
        const minSize = 44; // WCAG AA minimum
        const preferredSize = 48; // Better for barbershop use
        
        return {
            element: getElementDescription(target),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            meetsMinimum: rect.width >= minSize && rect.height >= minSize,
            meetsPreferred: rect.width >= preferredSize && rect.height >= preferredSize,
            touchArea: Math.round(rect.width * rect.height)
        };
    });
    
    return {
        totalTargets: results.length,
        targets: results,
        meetsMinimum: results.filter(t => t.meetsMinimum).length,
        meetsPreferred: results.filter(t => t.meetsPreferred).length,
        passRate: Math.round((results.filter(t => t.meetsMinimum).length / results.length) * 100)
    };
}

function validateAutoSelection() {
    const notification = document.querySelector('.bg-emerald-50.border-emerald-200, [class*="bg-emerald-50"]');
    const changeButton = notification?.querySelector('button');
    
    if (!notification) {
        return { visible: false, reason: 'Auto-selection notification not found' };
    }
    
    const notificationRect = notification.getBoundingClientRect();
    const changeButtonRect = changeButton?.getBoundingClientRect();
    
    return {
        visible: notificationRect.height > 0,
        notification: {
            width: Math.round(notificationRect.width),
            height: Math.round(notificationRect.height),
            hasIcon: !!notification.querySelector('svg'),
            hasChangeButton: !!changeButton
        },
        changeButton: changeButton ? {
            width: Math.round(changeButtonRect.width),
            height: Math.round(changeButtonRect.height),
            meetsTouch: changeButtonRect.height >= 44,
            text: changeButton.textContent.trim()
        } : null
    };
}

function validateUsability() {
    const modal = document.querySelector('.fixed.inset-0 .bg-white');
    if (!modal) return { error: 'Modal not found' };
    
    // Check scroll behavior
    const scrollContainer = modal.querySelector('[class*="overflow-y-auto"]');
    const isScrollable = scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight;
    
    // Check form elements
    const tipInput = modal.querySelector('input[type="number"]');
    const radioButtons = modal.querySelectorAll('input[type="radio"]');
    
    return {
        scrollable: isScrollable,
        formElements: {
            tipInput: tipInput ? {
                width: Math.round(tipInput.getBoundingClientRect().width),
                height: Math.round(tipInput.getBoundingClientRect().height),
                fontSize: window.getComputedStyle(tipInput).fontSize
            } : null,
            radioButtons: radioButtons.length
        },
        visualFeedback: {
            selectedStates: modal.querySelectorAll('.border-emerald-500, .bg-emerald-50').length,
            hoverStates: true // Assume CSS hover states exist
        }
    };
}

function validateAccessibility() {
    const modal = document.querySelector('.fixed.inset-0 .bg-white');
    if (!modal) return { error: 'Modal not found' };
    
    return {
        focusManagement: {
            hasTabIndex: modal.hasAttribute('tabindex'),
            focusableElements: modal.querySelectorAll('button, input, select, [tabindex]').length
        },
        labels: {
            inputLabels: modal.querySelectorAll('label').length,
            radioLabels: modal.querySelectorAll('label:has(input[type="radio"])').length
        },
        aria: {
            ariaLabels: modal.querySelectorAll('[aria-label]').length,
            ariaDescribedBy: modal.querySelectorAll('[aria-describedby]').length
        }
    };
}

function getElementDescription(element) {
    if (element.tagName === 'BUTTON') {
        const text = element.textContent.trim().substring(0, 20);
        return `button: "${text}"`;
    }
    if (element.tagName === 'LABEL') {
        const text = element.textContent.trim().substring(0, 20);
        return `label: "${text}"`;
    }
    if (element.classList.contains('cursor-pointer')) {
        return 'barber-card';
    }
    return element.tagName.toLowerCase();
}

function generateValidationReport(results) {

    // Viewport Info
    `);

    // Modal Responsiveness
    if (results.modal.error) {
        
    } else {
        
        `);
        
        `);
        
    }
    
    // Touch Targets
    `);
    : ${results.touchTargets.meetsMinimum}/${results.touchTargets.totalTargets} (${results.touchTargets.passRate}%)`);
    : ${results.touchTargets.meetsPreferred}/${results.touchTargets.totalTargets}`);
    
    if (results.touchTargets.passRate < 100) {
        
        results.touchTargets.targets.forEach(target => {
            if (!target.meetsMinimum) {
                
            }
        });
    }
    
    // Auto-selection
    
    if (results.autoSelection.visible) {

        `);
    } else {
        
    }
    
    // Usability

    // Overall Score
    const scores = [
        results.modal.fitsViewport ? 1 : 0,
        results.modal.utilizationGood ? 1 : 0,
        results.touchTargets.passRate >= 90 ? 1 : 0,
        results.autoSelection.visible ? 1 : 0
    ];
    const overallScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);

    // Recommendations
    if (overallScore < 80) {

        if (!results.modal.fitsViewport) {
            
        }
        if (!results.modal.utilizationGood) {
            `);
        }
        if (results.touchTargets.passRate < 90) {
            
        }
        if (!results.autoSelection.visible) {
            
        }
    }

}

// Auto-run if modal is already open
window.addEventListener('load', () => {
    setTimeout(() => {
        const modal = document.querySelector('.fixed.inset-0 .bg-white.rounded-xl');
        if (modal) {
             now');
        } else {
            
        }
    }, 1000);
});

// Expose function globally
window.validateMobileCompatibility = validateMobileCompatibility;

For different viewports:
- F12 → Toggle device toolbar → Select iPad/tablet
- Or resize browser window to test different sizes

Target viewports:
- iPad Portrait: 768×1024
- iPad Landscape: 1024×768  
- iPad Air: 820×1180 / 1180×820
`);
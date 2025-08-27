/**
 * Mobile/Tablet UI Improvements Validation Script
 * Tests the enhanced AppointmentCheckoutModal for barbershop iPad compatibility
 * 
 * Run this in browser console on localhost:9999/shop/products with modal open
 */

function testMobileUIImprovements() {

    const results = {
        timestamp: new Date().toISOString(),
        viewport: getViewportInfo(),
        modalWidth: testModalResponsiveness(),
        touchTargets: testTouchTargets(),
        autoSelection: testAutoSelectionUI(),
        paymentMethods: testPaymentMethodTargets(),
        actionButtons: testActionButtons(),
        overallScore: 0
    };
    
    // Calculate overall score
    results.overallScore = calculateOverallScore(results);
    
    // Generate detailed report
    generateReport(results);
    
    return results;
}

function getViewportInfo() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
        width: width,
        height: height,
        devicePixelRatio: window.devicePixelRatio,
        orientation: width > height ? 'landscape' : 'portrait',
        category: getDeviceCategory(width),
        isTablet: width >= 768,
        isIPadLandscape: width >= 1024 && height <= 820
    };
}

function getDeviceCategory(width) {
    if (width >= 1180) return 'ipad-air-landscape';
    if (width >= 1024) return 'ipad-landscape';
    if (width >= 820) return 'ipad-air-portrait';
    if (width >= 768) return 'ipad-portrait';
    if (width >= 414) return 'large-phone';
    return 'phone';
}

function testModalResponsiveness() {
    const modal = document.querySelector('.fixed.inset-0 .bg-white.rounded-xl');
    
    if (!modal) {
        return { error: 'Modal not found - please open the appointment checkout modal first' };
    }
    
    const rect = modal.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(modal);
    const viewportWidth = window.innerWidth;
    const modalWidth = rect.width;
    const utilization = (modalWidth / (viewportWidth - 32)) * 100;
    
    // Check for our responsive classes
    const hasResponsiveClasses = modal.className.includes('sm:max-w-lg') && 
                                 modal.className.includes('md:max-w-xl') &&
                                 modal.className.includes('lg:max-w-2xl');
    
    // Test actual max-width at current viewport
    let effectiveMaxWidth = computedStyle.maxWidth;
    let expectedMaxWidth = 'max-w-md'; // default
    
    if (viewportWidth >= 1024) {
        expectedMaxWidth = 'max-w-2xl'; // should be 672px
    } else if (viewportWidth >= 768) {
        expectedMaxWidth = 'max-w-xl'; // should be 576px
    } else if (viewportWidth >= 640) {
        expectedMaxWidth = 'max-w-lg'; // should be 512px
    }
    
    return {
        modalWidth: Math.round(modalWidth),
        viewportWidth: viewportWidth,
        utilization: Math.round(utilization) + '%',
        effectiveMaxWidth: effectiveMaxWidth,
        expectedMaxWidth: expectedMaxWidth,
        hasResponsiveClasses: hasResponsiveClasses,
        fitsViewport: modalWidth <= viewportWidth - 32,
        utilizationGood: utilization >= 70,
        isOptimized: hasResponsiveClasses && utilization >= 70
    };
}

function testTouchTargets() {
    const touchElements = {
        barberCards: document.querySelectorAll('.cursor-pointer.min-h-\\[48px\\]'),
        changeBarberButton: document.querySelector('button.min-h-\\[44px\\]'),
        paymentRadios: document.querySelectorAll('label.min-h-\\[48px\\]'),
        actionButtons: document.querySelectorAll('button.min-h-\\[48px\\]')
    };
    
    const results = {
        barberCards: [],
        changeButton: null,
        paymentMethods: [],
        actionButtons: [],
        summary: {
            total: 0,
            meetsStandard: 0,
            meetsPreferred: 0
        }
    };
    
    // Test barber selection cards
    touchElements.barberCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const passes = rect.height >= 48;
        results.barberCards.push({
            index: index,
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            passes: passes,
            hasMinHeight: card.className.includes('min-h-[48px]'),
            hasTouchManipulation: card.className.includes('touch-manipulation')
        });
        results.summary.total++;
        if (passes) results.summary.meetsStandard++;
        if (rect.height >= 48) results.summary.meetsPreferred++;
    });
    
    // Test change barber button
    if (touchElements.changeBarberButton) {
        const rect = touchElements.changeBarberButton.getBoundingClientRect();
        results.changeButton = {
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            passes: rect.height >= 44,
            hasMinHeight: touchElements.changeBarberButton.className.includes('min-h-[44px]')
        };
        results.summary.total++;
        if (rect.height >= 44) results.summary.meetsStandard++;
        if (rect.height >= 48) results.summary.meetsPreferred++;
    }
    
    // Test payment method labels
    touchElements.paymentRadios.forEach((label, index) => {
        const rect = label.getBoundingClientRect();
        const passes = rect.height >= 48;
        results.paymentMethods.push({
            index: index,
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            passes: passes,
            hasMinHeight: label.className.includes('min-h-[48px]')
        });
        results.summary.total++;
        if (passes) results.summary.meetsStandard++;
        if (rect.height >= 48) results.summary.meetsPreferred++;
    });
    
    // Test action buttons
    touchElements.actionButtons.forEach((button, index) => {
        const rect = button.getBoundingClientRect();
        const passes = rect.height >= 48;
        results.actionButtons.push({
            text: button.textContent.trim(),
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            passes: passes,
            hasMinHeight: button.className.includes('min-h-[48px]')
        });
        results.summary.total++;
        if (passes) results.summary.meetsStandard++;
        if (rect.height >= 48) results.summary.meetsPreferred++;
    });
    
    results.summary.passRate = results.summary.total > 0 
        ? Math.round((results.summary.meetsStandard / results.summary.total) * 100)
        : 0;
    
    return results;
}

function testAutoSelectionUI() {
    const notification = document.querySelector('.bg-emerald-50.border-emerald-200');
    
    if (!notification) {
        return { 
            found: false,
            reason: 'Auto-selection notification not visible (may need to trigger auto-selection)'
        };
    }
    
    const rect = notification.getBoundingClientRect();
    const icon = notification.querySelector('.w-8.h-8.bg-emerald-100');
    const changeButton = notification.querySelector('button');
    
    return {
        found: true,
        dimensions: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            padding: window.getComputedStyle(notification).padding
        },
        hasEnhancedIcon: !!icon,
        iconSize: icon ? icon.getBoundingClientRect().width : 0,
        changeButton: changeButton ? {
            height: Math.round(changeButton.getBoundingClientRect().height),
            hasMinHeight: changeButton.className.includes('min-h-[44px]'),
            hasBorder: changeButton.className.includes('border'),
            passes: changeButton.getBoundingClientRect().height >= 44
        } : null,
        visualHierarchy: {
            hasCheckmark: notification.textContent.includes('✓'),
            hasBoldText: !!notification.querySelector('.font-semibold'),
            hasColoredBackground: notification.className.includes('bg-emerald-50')
        }
    };
}

function testPaymentMethodTargets() {
    const paymentLabels = document.querySelectorAll('label.min-h-\\[48px\\]');
    const results = [];
    
    paymentLabels.forEach((label) => {
        const text = label.textContent.trim();
        if (text.includes('Cash') || text.includes('Card') || text.includes('House Account')) {
            const rect = label.getBoundingClientRect();
            const input = label.querySelector('input');
            const inputSize = input ? input.getBoundingClientRect() : null;
            
            results.push({
                type: text,
                labelHeight: Math.round(rect.height),
                labelWidth: Math.round(rect.width),
                inputSize: inputSize ? Math.round(inputSize.height) : 0,
                hasMinHeight: label.className.includes('min-h-[48px]'),
                hasBorder: label.className.includes('border'),
                hasHoverState: label.className.includes('hover:bg-gray-50'),
                passes: rect.height >= 48
            });
        }
    });
    
    return results;
}

function testActionButtons() {
    const buttons = document.querySelectorAll('.flex.gap-3 button');
    const results = [];
    
    buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        const text = button.textContent.trim();
        
        results.push({
            text: text,
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            hasMinHeight: button.className.includes('min-h-[48px]'),
            hasTouchManipulation: button.className.includes('touch-manipulation'),
            isVisible: rect.height > 0 && rect.width > 0,
            passes: rect.height >= 48
        });
    });
    
    return results;
}

function calculateOverallScore(results) {
    let score = 0;
    let maxScore = 0;
    
    // Modal responsiveness (30 points)
    maxScore += 30;
    if (!results.modalWidth.error) {
        if (results.modalWidth.hasResponsiveClasses) score += 10;
        if (results.modalWidth.utilizationGood) score += 10;
        if (results.modalWidth.fitsViewport) score += 10;
    }
    
    // Touch targets (40 points)
    maxScore += 40;
    if (results.touchTargets.summary.passRate >= 100) {
        score += 40;
    } else if (results.touchTargets.summary.passRate >= 90) {
        score += 30;
    } else if (results.touchTargets.summary.passRate >= 80) {
        score += 20;
    } else if (results.touchTargets.summary.passRate >= 70) {
        score += 10;
    }
    
    // Auto-selection UI (15 points)
    maxScore += 15;
    if (results.autoSelection.found) {
        if (results.autoSelection.hasEnhancedIcon) score += 5;
        if (results.autoSelection.changeButton?.passes) score += 5;
        if (results.autoSelection.visualHierarchy.hasBoldText) score += 5;
    }
    
    // Action buttons (15 points)
    maxScore += 15;
    const allButtonsPass = results.actionButtons.every(btn => btn.passes);
    if (allButtonsPass) score += 15;
    else if (results.actionButtons.some(btn => btn.passes)) score += 7;
    
    return Math.round((score / maxScore) * 100);
}

function generateReport(results) {

    // Viewport Info

    // Modal Responsiveness
    
    if (results.modalWidth.error) {
        
    } else {
        `);

        ' : '⚠️ Low (<70%)'}`);
        
    }
    
    // Touch Targets
    `);

    if (results.touchTargets.barberCards.length > 0) {
        const failing = results.touchTargets.barberCards.filter(c => !c.passes);
        if (failing.length > 0) {
            .join(', '));
        } else {
            
        }
    }
    
    if (results.touchTargets.changeButton) {
        
    }
    
    // Auto-Selection UI
    
    if (results.autoSelection.found) {

    } else {
        
    }
    
    // Payment Methods
    if (results.paymentMethods.length > 0) {
        
        results.paymentMethods.forEach(method => {
            
        });
    }
    
    // Action Buttons
    
    results.actionButtons.forEach(button => {
        
    });
    
    // Overall Score

    if (results.overallScore >= 90) {
        
    } else if (results.overallScore >= 75) {
        
    } else if (results.overallScore >= 60) {
        
    } else {
        
    }
    
    // Recommendations
    if (results.overallScore < 90) {

        if (!results.modalWidth.hasResponsiveClasses) {
            
        }
        if (!results.modalWidth.utilizationGood) {
            
        }
        if (results.touchTargets.summary.passRate < 100) {
            
        }
        if (!results.autoSelection.found || !results.autoSelection.changeButton?.passes) {
            
        }
    }

}

// Auto-detect and run
window.addEventListener('load', () => {
    setTimeout(() => {
        const modal = document.querySelector('.fixed.inset-0 .bg-white.rounded-xl');
        if (modal) {
             to test');
        } else {
            
        }
    }, 1000);
});

// Export for global use
window.testMobileUIImprovements = testMobileUIImprovements;

For different viewports:
- Use Chrome DevTools device mode
- Test iPad (768×1024) and iPad Landscape (1024×768)
- Test iPad Air (820×1180) and iPad Air Landscape (1180×820)

Target score: 90%+ for production readiness
`);
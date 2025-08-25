/**
 * Mobile/Tablet UI Improvements Validation Script
 * Tests the enhanced AppointmentCheckoutModal for barbershop iPad compatibility
 * 
 * Run this in browser console on localhost:9999/shop/products with modal open
 */

function testMobileUIImprovements() {
    console.log('🔍 TESTING MOBILE/TABLET UI IMPROVEMENTS');
    console.log('=========================================');
    
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
    console.log('\n📊 MOBILE UI IMPROVEMENTS TEST RESULTS');
    console.log('======================================');
    
    // Viewport Info
    console.log(`\n📱 VIEWPORT: ${results.viewport.width}×${results.viewport.height}`);
    console.log(`   Device: ${results.viewport.category}`);
    console.log(`   Orientation: ${results.viewport.orientation}`);
    console.log(`   Is Tablet: ${results.viewport.isTablet ? '✅ Yes' : '❌ No'}`);
    
    // Modal Responsiveness
    console.log('\n🖼️ MODAL RESPONSIVENESS');
    if (results.modalWidth.error) {
        console.log(`   ❌ ${results.modalWidth.error}`);
    } else {
        console.log(`   Width: ${results.modalWidth.modalWidth}px (${results.modalWidth.utilization} utilization)`);
        console.log(`   Responsive Classes: ${results.modalWidth.hasResponsiveClasses ? '✅ Applied' : '❌ Missing'}`);
        console.log(`   Viewport Fit: ${results.modalWidth.fitsViewport ? '✅ Good' : '❌ Overflow'}`);
        console.log(`   Utilization: ${results.modalWidth.utilizationGood ? '✅ Optimal (≥70%)' : '⚠️ Low (<70%)'}`);
        console.log(`   Status: ${results.modalWidth.isOptimized ? '✅ OPTIMIZED' : '❌ NEEDS WORK'}`);
    }
    
    // Touch Targets
    console.log(`\n👆 TOUCH TARGETS (${results.touchTargets.summary.total} elements)`);
    console.log(`   Pass Rate: ${results.touchTargets.summary.passRate}%`);
    console.log(`   Meet 44px Standard: ${results.touchTargets.summary.meetsStandard}/${results.touchTargets.summary.total}`);
    console.log(`   Meet 48px Preferred: ${results.touchTargets.summary.meetsPreferred}/${results.touchTargets.summary.total}`);
    
    if (results.touchTargets.barberCards.length > 0) {
        const failing = results.touchTargets.barberCards.filter(c => !c.passes);
        if (failing.length > 0) {
            console.log('   ⚠️ Barber cards below 48px:', failing.map(c => c.height + 'px').join(', '));
        } else {
            console.log('   ✅ All barber cards meet 48px standard');
        }
    }
    
    if (results.touchTargets.changeButton) {
        console.log(`   Change Button: ${results.touchTargets.changeButton.passes ? '✅' : '❌'} ${results.touchTargets.changeButton.height}px`);
    }
    
    // Auto-Selection UI
    console.log('\n💡 AUTO-SELECTION UI');
    if (results.autoSelection.found) {
        console.log(`   Enhanced Icon: ${results.autoSelection.hasEnhancedIcon ? '✅ Yes' : '❌ No'}`);
        console.log(`   Change Button: ${results.autoSelection.changeButton?.passes ? '✅ Passes' : '❌ Too small'}`);
        console.log(`   Visual Hierarchy: ${results.autoSelection.visualHierarchy.hasBoldText ? '✅ Good' : '⚠️ Needs improvement'}`);
    } else {
        console.log(`   ⚠️ ${results.autoSelection.reason}`);
    }
    
    // Payment Methods
    if (results.paymentMethods.length > 0) {
        console.log('\n💳 PAYMENT METHOD TARGETS');
        results.paymentMethods.forEach(method => {
            console.log(`   ${method.type}: ${method.passes ? '✅' : '❌'} ${method.labelHeight}px`);
        });
    }
    
    // Action Buttons
    console.log('\n🎯 ACTION BUTTONS');
    results.actionButtons.forEach(button => {
        console.log(`   ${button.text}: ${button.passes ? '✅' : '❌'} ${button.height}px`);
    });
    
    // Overall Score
    console.log(`\n🏆 OVERALL SCORE: ${results.overallScore}%`);
    
    if (results.overallScore >= 90) {
        console.log('   ✅ EXCELLENT - Ready for production barbershop use');
    } else if (results.overallScore >= 75) {
        console.log('   🟡 GOOD - Minor improvements recommended');
    } else if (results.overallScore >= 60) {
        console.log('   ⚠️ NEEDS WORK - Several issues to address');
    } else {
        console.log('   ❌ POOR - Significant improvements required');
    }
    
    // Recommendations
    if (results.overallScore < 90) {
        console.log('\n🔧 RECOMMENDATIONS:');
        
        if (!results.modalWidth.hasResponsiveClasses) {
            console.log('   1. Add responsive width classes to modal');
        }
        if (!results.modalWidth.utilizationGood) {
            console.log('   2. Increase modal width utilization for tablets');
        }
        if (results.touchTargets.summary.passRate < 100) {
            console.log('   3. Ensure all touch targets meet 44px minimum');
        }
        if (!results.autoSelection.found || !results.autoSelection.changeButton?.passes) {
            console.log('   4. Enhance auto-selection UI with proper touch targets');
        }
    }
    
    console.log('\n📋 Test complete. Run again after making changes to verify improvements.');
}

// Auto-detect and run
window.addEventListener('load', () => {
    setTimeout(() => {
        const modal = document.querySelector('.fixed.inset-0 .bg-white.rounded-xl');
        if (modal) {
            console.log('🎯 Modal detected - run testMobileUIImprovements() to test');
        } else {
            console.log('⚠️ Please open the appointment checkout modal first');
        }
    }, 1000);
});

// Export for global use
window.testMobileUIImprovements = testMobileUIImprovements;

console.log(`
🧪 MOBILE UI IMPROVEMENTS TEST SCRIPT LOADED

To test the improvements:
1. Open appointment checkout modal
2. Run: testMobileUIImprovements()

For different viewports:
- Use Chrome DevTools device mode
- Test iPad (768×1024) and iPad Landscape (1024×768)
- Test iPad Air (820×1180) and iPad Air Landscape (1180×820)

Target score: 90%+ for production readiness
`);
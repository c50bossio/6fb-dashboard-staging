# Everboarding System Integration Guide

## Quick Start

### 1. Wrap your app with EverboardingProvider

```jsx
// In your main layout or App.js
import EverboardingProvider from '@/components/onboarding/EverboardingProvider'

export default function RootLayout({ children }) {
  return (
    <EverboardingProvider>
      {children}
    </EverboardingProvider>
  )
}
```

### 2. That's it! 

The everboarding system will automatically:
- Track user behavior across pages
- Show contextual feature discoveries
- Celebrate milestones 
- Remember user preferences

## Advanced Usage

### Custom Page Integration

```jsx
// In a specific page component
import { EverboardingWrapper, useEverboarding } from '@/components/onboarding/EverboardingProvider'

export default function CustomersPage() {
  const { userBehavior } = useEverboarding()
  
  return (
    <EverboardingWrapper
      pageContext={{ 
        pageType: 'customers',
        hasData: userBehavior.customersCount > 0 
      }}
      customBehavior={{
        customersCount: 25,
        segmentationEnabled: true
      }}
    >
      <div>Your page content</div>
    </EverboardingWrapper>
  )
}
```

### Manual Triggers

```jsx
// Manually trigger feature discovery or milestones
import { useEverboardingTrigger } from '@/components/onboarding/EverboardingProvider'

function CustomButton() {
  const { triggerFeatureDiscovery, triggerMilestone } = useEverboardingTrigger()
  
  const handleSpecialAction = () => {
    // Show a custom feature discovery
    triggerFeatureDiscovery('advanced_reports', {
      title: 'Advanced Reports Unlocked!',
      description: 'You can now generate detailed business reports.',
      action: 'reports/advanced'
    })
    
    // Or celebrate a milestone
    triggerMilestone('power_user', {
      title: 'Power User Achievement!',
      description: 'You\'ve mastered the advanced features.'
    })
  }
  
  return <button onClick={handleSpecialAction}>Special Action</button>
}
```

### Settings Integration

```jsx
// Add everboarding settings to your settings page
import { EverboardingSettings } from '@/components/onboarding/EverboardingProvider'

export default function SettingsPage() {
  return (
    <div>
      <h2>Preferences</h2>
      <EverboardingSettings />
    </div>
  )
}
```

## Feature Discovery Configuration

The system automatically shows features based on:

### User Behavior Triggers
- `appointmentsCount > 5` → Show Analytics
- `customersCount > 20` → Show Segmentation  
- `daysActive > 7` → Show AI Recommendations
- `repeatCustomers > 3` → Show Loyalty Program
- `staffCount > 1` → Show Staff Management
- `noShowRate > 10` → Show Automated Reminders

### Page Context
- `/dashboard` → Business insights and AI features
- `/dashboard/customers` → Customer management features  
- `/dashboard/calendar` → Advanced scheduling features
- `/dashboard/settings` → Automation and payment features

### User Levels
- **Beginner** (0-3 features) → Basic automations
- **Intermediate** (4-7 features) → Advanced scheduling & analytics
- **Advanced** (8-11 features) → AI insights & segmentation
- **Expert** (12+ features) → All advanced features

## Customization

### Adding New Features

```jsx
// Add to featureDiscoveryMap in EverboardingSystem.js
'/dashboard/new-page': [
  {
    id: 'new_feature',
    title: 'Amazing New Feature',
    description: 'This feature will help you...',
    condition: () => userBehavior.someMetric > threshold,
    action: 'new-page/feature',
    actionText: 'Try It Now',
    category: 'productivity',
    difficulty: 'intermediate'
  }
]
```

### Custom Categories & Colors

```jsx
// Add to getCategoryColor() in EverboardingSystem.js
productivity: 'from-violet-500 to-purple-600',
integration: 'from-rose-500 to-pink-600'
```

## Analytics Integration

The system automatically tracks:
- `feature_discovered` events
- `feature_completed` events  
- User progression levels
- Feature adoption rates

Events include:
- `feature_id`
- `user_level` 
- `page_context`
- `user_behavior_data`

## Best Practices

1. **Contextual Timing**: Show features when users need them
2. **Progressive Disclosure**: Start with basic features, advance gradually  
3. **Celebrate Success**: Acknowledge user achievements
4. **Respect Choice**: Allow users to dismiss or disable
5. **Track Adoption**: Monitor which features users discover vs. use

## Troubleshooting

### Features Not Showing
- Check user behavior conditions are met
- Ensure page is not in excluded pages list
- Verify everboarding is enabled in settings
- Check browser localStorage for dismissed prompts

### Performance Concerns
- System uses localStorage for state persistence
- Behavior tracking is async and non-blocking
- Feature discovery runs on page load only
- Minimal DOM impact with single overlay element
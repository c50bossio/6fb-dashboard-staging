# Registration Flow Debug

## Issue: Registration triggering on plan selection instead of "Create Account" click

## Debug Steps:

1. **Open browser Developer Tools (F12)**
2. **Go to Console tab**
3. **Navigate to http://localhost:9999/register**
4. **Complete steps 1 and 2**
5. **When you reach step 3 (plan selection), watch the console**

## What to Look For:

When you click on a plan card, you should see:
```
Form field changed: selectedPlan = professional
```

But if you see this, it means registration is being triggered:
```
Form submitted - Current step: 3
Final submission - creating account
```

## Expected Behavior:
- Clicking plan card → Only logs "Form field changed"
- Clicking "Create account" button → Logs "Form submitted" AND "Final submission"

## If Registration Triggers on Plan Selection:
This means there's a form submission event being triggered when clicking the plan cards, possibly due to:
1. Event bubbling from the hidden radio input
2. Form submission on input change
3. Missing preventDefault on plan selection

## Fix Strategy:
If plan selection triggers registration, we need to modify the plan selection to prevent form submission.
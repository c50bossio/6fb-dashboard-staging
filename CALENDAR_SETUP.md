# Calendar Setup Guide

## FullCalendar Premium Configuration

This project uses **FullCalendar Premium** for the booking calendar system.

### License Setup

1. **Add your license key** to `.env.local`:
   ```
   NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY=your-actual-license-key-here
   ```

2. **Restart the Docker container**:
   ```bash
   docker compose restart frontend
   ```

### Main Calendar Location

The stable calendar implementation is at:
- **URL**: `/dashboard/calendar`
- **File**: `/app/(protected)/dashboard/calendar/page.js`

### Features

- Resource view (multiple barbers)
- Drag & drop appointments
- Day/Week/Month views
- Business hours highlighting
- Current time indicator
- Interactive appointment creation

### Troubleshooting

If you see a license warning:
1. Ensure your license key is in `.env.local`
2. Restart the Docker container
3. Clear browser cache if needed

### Why One Calendar?

We consolidated to ONE stable calendar implementation to:
- Avoid confusion with multiple versions
- Ensure stability and consistency
- Simplify maintenance
- Use your paid FullCalendar license properly

All other calendar pages (`/dashboard/bookings`) redirect to the main calendar.
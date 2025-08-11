# Force Refresh Supabase Real-time Replication

The REPLICA IDENTITY FULL has been set, but DELETE events still don't include full data. 

## To force the change to take effect:

1. **Go to Supabase Dashboard**: 
   https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/database/replication

2. **Find the "bookings" table** in the list

3. **Toggle it OFF** (uncheck the checkbox)

4. **Click "Save"** 

5. **Wait 5 seconds**

6. **Toggle it back ON** (check the checkbox)

7. **Click "Save"** again

This will restart the real-time replication with the new REPLICA IDENTITY FULL setting.

## Alternative: Use Soft Deletes (More Reliable)

If DELETE events still don't include full data, use soft deletes instead:

```javascript
// Instead of DELETE
await supabase
  .from('bookings')
  .delete()
  .eq('id', appointmentId)

// Use UPDATE to mark as deleted
await supabase
  .from('bookings')
  .update({ 
    status: 'cancelled',
    deleted_at: new Date().toISOString()
  })
  .eq('id', appointmentId)
```

This triggers UPDATE events which always include full data and work reliably.
-- Booking Notification Triggers for 6FB AI Agent System
-- These triggers automatically queue notifications for booking lifecycle events

-- Function to queue booking notifications
CREATE OR REPLACE FUNCTION queue_booking_notification(
    p_notification_type text,
    p_booking_id uuid,
    p_user_id uuid,
    p_priority integer DEFAULT 2,
    p_schedule_at timestamp with time zone DEFAULT null
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    notification_id uuid;
    booking_record record;
    barbershop_record record;
    barber_record record;
    service_record record;
    user_record record;
BEGIN
    -- Generate notification ID
    notification_id := gen_random_uuid();
    
    -- Get booking details
    SELECT b.*, a.appointment_date, a.duration, a.total_price, a.status as booking_status
    INTO booking_record
    FROM bookings b
    LEFT JOIN appointments a ON a.booking_id = b.id
    WHERE b.id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;
    
    -- Get barbershop details
    SELECT name, email, phone
    INTO barbershop_record
    FROM barbershops
    WHERE id = booking_record.barbershop_id;
    
    -- Get barber details
    SELECT u.full_name as name, u.email, u.phone
    INTO barber_record
    FROM profiles u
    WHERE u.id = booking_record.barber_id;
    
    -- Get service details
    SELECT name, duration, price
    INTO service_record
    FROM services
    WHERE id = booking_record.service_id;
    
    -- Get customer details
    SELECT u.full_name as name, u.email, u.phone
    INTO user_record
    FROM profiles u
    WHERE u.id = p_user_id;
    
    -- Create notification content
    INSERT INTO notifications (
        id,
        user_id,
        type,
        channel,
        template_id,
        subject,
        content,
        metadata,
        status,
        created_at
    ) VALUES (
        notification_id,
        p_user_id,
        p_notification_type,
        'email,in_app',
        p_notification_type,
        CASE p_notification_type
            WHEN 'booking_confirmation' THEN 'Booking Confirmed - ' || barbershop_record.name
            WHEN 'payment_confirmation' THEN 'Payment Received - ' || barbershop_record.name
            WHEN 'appointment_reminder_24h' THEN 'Appointment Reminder - Tomorrow at ' || barbershop_record.name
            WHEN 'appointment_reminder_2h' THEN 'Appointment Today - ' || barbershop_record.name
            WHEN 'cancellation_notice' THEN 'Appointment Cancelled - ' || barbershop_record.name
            ELSE 'Booking Notification - ' || barbershop_record.name
        END,
        'Notification for booking ' || p_booking_id::text,
        jsonb_build_object(
            'booking_id', p_booking_id,
            'notification_type', p_notification_type,
            'priority', p_priority,
            'booking_data', jsonb_build_object(
                'customer_name', COALESCE(user_record.name, 'Valued Customer'),
                'customer_email', COALESCE(user_record.email, ''),
                'customer_phone', user_record.phone,
                'barbershop_name', COALESCE(barbershop_record.name, 'Barbershop'),
                'barber_name', COALESCE(barber_record.name, 'Your Barber'),
                'service_name', COALESCE(service_record.name, 'Service'),
                'appointment_date', booking_record.appointment_date,
                'appointment_duration', COALESCE(booking_record.duration, service_record.duration, 30),
                'total_price', COALESCE(booking_record.total_price, service_record.price, 0),
                'booking_status', booking_record.booking_status,
                'payment_status', booking_record.payment_status,
                'payment_method', booking_record.payment_method
            ),
            'schedule_at', p_schedule_at
        ),
        CASE 
            WHEN p_schedule_at IS NOT NULL AND p_schedule_at > NOW() THEN 'scheduled'
            ELSE 'pending'
        END,
        NOW()
    );
    
    RETURN notification_id;
END;
$$;

-- Function to handle booking confirmation notifications
CREATE OR REPLACE FUNCTION handle_booking_confirmed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only send notification if booking status changed to confirmed
    IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'confirmed' THEN
        -- Queue booking confirmation notification
        PERFORM queue_booking_notification(
            'booking_confirmation',
            NEW.id,
            NEW.user_id,
            3 -- High priority
        );
        
        -- Schedule appointment reminders
        IF NEW.appointment_date IS NOT NULL THEN
            -- Schedule 24-hour reminder
            IF NEW.appointment_date - INTERVAL '24 hours' > NOW() THEN
                PERFORM queue_booking_notification(
                    'appointment_reminder_24h',
                    NEW.id,
                    NEW.user_id,
                    2, -- Normal priority
                    NEW.appointment_date - INTERVAL '24 hours'
                );
            END IF;
            
            -- Schedule 2-hour reminder
            IF NEW.appointment_date - INTERVAL '2 hours' > NOW() THEN
                PERFORM queue_booking_notification(
                    'appointment_reminder_2h',
                    NEW.id,
                    NEW.user_id,
                    3, -- High priority
                    NEW.appointment_date - INTERVAL '2 hours'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to handle payment confirmation notifications
CREATE OR REPLACE FUNCTION handle_payment_confirmed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only send notification if payment status changed to succeeded/completed
    IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status) 
       AND NEW.payment_status IN ('succeeded', 'completed', 'paid') THEN
        
        -- Queue payment confirmation notification
        PERFORM queue_booking_notification(
            'payment_confirmation',
            NEW.id,
            NEW.user_id,
            3 -- High priority
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to handle booking cancellation notifications
CREATE OR REPLACE FUNCTION handle_booking_cancelled()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only send notification if booking status changed to cancelled
    IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'cancelled' THEN
        -- Queue cancellation notification
        PERFORM queue_booking_notification(
            'cancellation_notice',
            NEW.id,
            NEW.user_id,
            4 -- Urgent priority
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to handle appointment modifications
CREATE OR REPLACE FUNCTION handle_appointment_modified()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if appointment date/time changed significantly
    IF OLD.appointment_date IS DISTINCT FROM NEW.appointment_date
       AND ABS(EXTRACT(EPOCH FROM (OLD.appointment_date - NEW.appointment_date))) > 3600 THEN -- 1 hour difference
        
        -- Queue modification notification
        PERFORM queue_booking_notification(
            'booking_modified',
            NEW.booking_id,
            (SELECT user_id FROM bookings WHERE id = NEW.booking_id),
            3 -- High priority
        );
        
        -- Reschedule reminders for new appointment time
        -- Cancel existing scheduled reminders first
        UPDATE notifications 
        SET status = 'cancelled'
        WHERE metadata->>'booking_id' = NEW.booking_id::text
        AND type IN ('appointment_reminder_24h', 'appointment_reminder_2h')
        AND status = 'scheduled';
        
        -- Schedule new reminders
        IF NEW.appointment_date - INTERVAL '24 hours' > NOW() THEN
            PERFORM queue_booking_notification(
                'appointment_reminder_24h',
                NEW.booking_id,
                (SELECT user_id FROM bookings WHERE id = NEW.booking_id),
                2, -- Normal priority
                NEW.appointment_date - INTERVAL '24 hours'
            );
        END IF;
        
        IF NEW.appointment_date - INTERVAL '2 hours' > NOW() THEN
            PERFORM queue_booking_notification(
                'appointment_reminder_2h',
                NEW.booking_id,
                (SELECT user_id FROM bookings WHERE id = NEW.booking_id),
                3, -- High priority
                NEW.appointment_date - INTERVAL '2 hours'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers for bookings table
DROP TRIGGER IF EXISTS trigger_booking_confirmed ON bookings;
CREATE TRIGGER trigger_booking_confirmed
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_booking_confirmed();

DROP TRIGGER IF EXISTS trigger_payment_confirmed ON bookings;
CREATE TRIGGER trigger_payment_confirmed
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_payment_confirmed();

DROP TRIGGER IF EXISTS trigger_booking_cancelled ON bookings;
CREATE TRIGGER trigger_booking_cancelled
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_booking_cancelled();

-- Create triggers for appointments table (if it exists separately)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        DROP TRIGGER IF EXISTS trigger_appointment_modified ON appointments;
        CREATE TRIGGER trigger_appointment_modified
            AFTER UPDATE ON appointments
            FOR EACH ROW
            EXECUTE FUNCTION handle_appointment_modified();
    END IF;
END
$$;

-- Function to process scheduled notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    notification_record record;
    processed_count integer := 0;
BEGIN
    -- Process notifications that are scheduled and due
    FOR notification_record IN
        SELECT id, metadata
        FROM notifications
        WHERE status = 'scheduled'
        AND (metadata->>'schedule_at')::timestamp <= NOW()
        ORDER BY created_at
        LIMIT 100
    LOOP
        -- Update status to pending for processing
        UPDATE notifications
        SET status = 'pending',
            updated_at = NOW()
        WHERE id = notification_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete old notifications that are completed, failed, or cancelled
    DELETE FROM notifications
    WHERE status IN ('sent', 'failed', 'cancelled')
    AND created_at < NOW() - (retention_days || ' days')::interval;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_status_schedule 
    ON notifications(status, (metadata->>'schedule_at')) 
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_notifications_booking_id 
    ON notifications((metadata->>'booking_id'));

CREATE INDEX IF NOT EXISTS idx_notifications_pending 
    ON notifications(created_at) 
    WHERE status = 'pending';

-- Grant permissions
GRANT EXECUTE ON FUNCTION queue_booking_notification TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO authenticated;

-- Example usage:
-- To manually queue a booking confirmation:
-- SELECT queue_booking_notification('booking_confirmation', 'booking-uuid', 'user-uuid', 3);

-- To process scheduled notifications (run this periodically):
-- SELECT process_scheduled_notifications();

-- To clean up old notifications:
-- SELECT cleanup_old_notifications(90); -- Keep 90 days

"""
Waitlist Queue Manager
Handles queue position calculations, wait time estimates, and barber assignment logic.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta


class WaitlistQueueManager:
    """
    Manages waitlist queue operations including position calculation,
    wait time estimation, and barber preference matching.
    """

    def __init__(self):
        self.default_service_duration_minutes = 30  # Default if service duration not specified

    def calculate_position(self, current_queue: List[Dict]) -> int:
        """
        Calculate next available position in queue.

        Args:
            current_queue: List of current waitlist entries with status='waiting' or 'notified'

        Returns:
            int: Next position number (1-based index)
        """
        if not current_queue:
            return 1

        # Count active entries (waiting or notified)
        active_entries = [e for e in current_queue if e.get('status') in ['waiting', 'notified']]
        return len(active_entries) + 1

    def calculate_estimated_wait_minutes(
        self,
        position: int,
        service_duration_minutes: int,
        current_queue: List[Dict],
        barber_count: int = 1
    ) -> int:
        """
        Calculate estimated wait time based on queue position and service durations.

        Args:
            position: Customer's position in queue (1 = next)
            service_duration_minutes: Duration of requested service
            current_queue: List of customers ahead in queue
            barber_count: Number of available barbers

        Returns:
            int: Estimated wait time in minutes
        """
        if position == 1:
            return 0  # Next customer, no wait

        # Get customers ahead in queue
        customers_ahead = [e for e in current_queue if e.get('position', 999) < position]

        if not customers_ahead:
            return 0

        # Simple calculation: Average all service durations ahead and divide by barber count
        total_duration_ahead = sum(
            e.get('service_duration', self.default_service_duration_minutes)
            for e in customers_ahead
        )

        # Account for multiple barbers serving in parallel
        estimated_wait = total_duration_ahead // max(1, barber_count)

        return max(0, estimated_wait)

    def calculate_wait_time_for_barber(
        self,
        barber_id: str,
        current_queue: List[Dict],
        scheduled_appointments: List[Dict] = None
    ) -> int:
        """
        Calculate wait time if customer requests a specific barber.

        Args:
            barber_id: ID of preferred barber
            current_queue: Current waitlist entries
            scheduled_appointments: List of scheduled appointments for this barber

        Returns:
            int: Estimated wait time in minutes for this specific barber
        """
        # Filter queue to only customers assigned to or preferring this barber
        barber_queue = [
            e for e in current_queue
            if e.get('barber_preference_id') == barber_id or e.get('assigned_barber_id') == barber_id
        ]

        # Sum service durations
        queue_duration = sum(
            e.get('service_duration', self.default_service_duration_minutes)
            for e in barber_queue
        )

        # Add scheduled appointment durations if provided
        if scheduled_appointments:
            now = datetime.now()
            upcoming_appointments = [
                apt for apt in scheduled_appointments
                if datetime.fromisoformat(apt.get('start_time', '')) > now
            ]
            appointment_duration = sum(
                apt.get('duration_minutes', self.default_service_duration_minutes)
                for apt in upcoming_appointments
            )
            queue_duration += appointment_duration

        return queue_duration

    def calculate_next_available_wait_time(
        self,
        barbershop_id: str,
        current_queue: List[Dict],
        barber_list: List[Dict]
    ) -> int:
        """
        Calculate wait time for next available barber (shortest queue).

        Args:
            barbershop_id: ID of barbershop
            current_queue: Current waitlist
            barber_list: List of all barbers with their queues

        Returns:
            int: Shortest wait time across all barbers
        """
        if not barber_list:
            # No barber data, use simple queue calculation
            return self.calculate_estimated_wait_minutes(
                position=len(current_queue) + 1,
                service_duration_minutes=self.default_service_duration_minutes,
                current_queue=current_queue,
                barber_count=1
            )

        # Calculate wait time for each barber
        wait_times = []
        for barber in barber_list:
            barber_wait = self.calculate_wait_time_for_barber(
                barber_id=barber.get('id'),
                current_queue=current_queue
            )
            wait_times.append(barber_wait)

        # Return shortest wait time
        return min(wait_times) if wait_times else 0

    def get_next_customer_for_barber(
        self,
        barber_id: str,
        current_queue: List[Dict],
        prioritize_preferences: bool = True
    ) -> Optional[Dict]:
        """
        Get the next customer who should be served by a specific barber.

        Args:
            barber_id: ID of barber who is ready for next customer
            current_queue: Current waitlist in order
            prioritize_preferences: Whether to prioritize customers who requested this barber

        Returns:
            Dict: Next customer entry, or None if no customers waiting
        """
        if not current_queue:
            return None

        # Filter to only waiting customers
        waiting_customers = [e for e in current_queue if e.get('status') == 'waiting']

        if not waiting_customers:
            return None

        if prioritize_preferences:
            # First, look for customers who specifically requested this barber
            preferred_customers = [
                e for e in waiting_customers
                if e.get('barber_preference_id') == barber_id
            ]
            if preferred_customers:
                # Return the customer who's been waiting longest (earliest check_in_time)
                return min(
                    preferred_customers,
                    key=lambda e: datetime.fromisoformat(e.get('check_in_time', datetime.now().isoformat()))
                )

        # No preference matches, return next customer in queue (lowest position)
        return min(waiting_customers, key=lambda e: e.get('position', 999))

    def recalculate_queue_positions(self, current_queue: List[Dict]) -> List[Dict]:
        """
        Recalculate positions for all active waitlist entries after a removal.

        Args:
            current_queue: Current waitlist entries

        Returns:
            List[Dict]: Updated queue with recalculated positions
        """
        # Filter to active entries only
        active_entries = [e for e in current_queue if e.get('status') in ['waiting', 'notified']]

        # Sort by original position
        active_entries.sort(key=lambda e: e.get('position', 999))

        # Reassign positions sequentially
        for i, entry in enumerate(active_entries, start=1):
            entry['position'] = i

        return active_entries

    def should_send_almost_ready_notification(
        self,
        customer_entry: Dict,
        current_position: int,
        previous_position: Optional[int] = None
    ) -> bool:
        """
        Determine if customer should receive "almost ready" SMS (when they become 2nd in line).

        Args:
            customer_entry: Customer's waitlist entry
            current_position: Customer's current position
            previous_position: Customer's previous position (if position changed)

        Returns:
            bool: True if should send "almost ready" notification
        """
        # Send notification when customer moves to position 2
        if current_position == 2:
            # Only send if this is a new position (not already notified)
            if previous_position is None or previous_position > 2:
                # Check if we haven't sent this notification type recently
                last_sms = customer_entry.get('last_sms_sent')
                if last_sms:
                    last_sms_time = datetime.fromisoformat(last_sms)
                    # Don't resend within 5 minutes
                    if datetime.now() - last_sms_time < timedelta(minutes=5):
                        return False
                return True

        return False

    def should_send_ready_now_notification(
        self,
        customer_entry: Dict,
        current_position: int,
        previous_position: Optional[int] = None
    ) -> bool:
        """
        Determine if customer should receive "ready now" SMS (when they become 1st in line).

        Args:
            customer_entry: Customer's waitlist entry
            current_position: Customer's current position
            previous_position: Customer's previous position (if position changed)

        Returns:
            bool: True if should send "ready now" notification
        """
        # Send notification when customer moves to position 1
        if current_position == 1:
            # Only send if this is a new position
            if previous_position is None or previous_position > 1:
                # Check debounce (don't resend within 5 minutes)
                last_sms = customer_entry.get('last_sms_sent')
                if last_sms:
                    last_sms_time = datetime.fromisoformat(last_sms)
                    if datetime.now() - last_sms_time < timedelta(minutes=5):
                        return False
                return True

        return False


# Global instance
queue_manager = WaitlistQueueManager()

import BookingWizard from '@/components/booking/BookingWizard';
import BookingErrorBoundary from '@/components/booking/BookingErrorBoundary';

export const metadata = {
  title: 'Book Appointment | 6FB AI Agent System',
  description: 'Book your next barbershop appointment online',
};

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BookingErrorBoundary>
        <BookingWizard />
      </BookingErrorBoundary>
    </div>
  );
}
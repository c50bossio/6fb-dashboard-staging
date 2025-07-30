'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PublicBookingPage() {
  const params = useParams();
  const barbershopId = params.barbershopId;
  
  const [barbershop, setBarbershop] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState(1); // 1: Barber, 2: Service, 3: Time, 4: Details, 5: Confirmation
  
  // Customer details form
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    loadBarbershopData();
  }, [barbershopId]);

  const loadBarbershopData = async () => {
    try {
      setLoading(true);
      
      // Load barbershop details (public endpoint - no auth needed)
      const barbershopResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/barbershops/${barbershopId}`);
      if (barbershopResponse.ok) {
        const barbershopData = await barbershopResponse.json();
        setBarbershop(barbershopData);
      }
      
      // Load barbers with their services for this barbershop
      const barbersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/barbershops/${barbershopId}/barbers`);
      if (barbersResponse.ok) {
        const barbersData = await barbersResponse.json();
        setBarbers(barbersData);
      }
      
    } catch (error) {
      console.error('Error loading barbershop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!selectedBarber || !selectedService) return;
    
    try {
      setLoading(true);
      
      // Get availability for the next 7 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/barbers/${selectedBarber.id}/availability?` +
        `start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&` +
        `service_duration_minutes=${selectedService.duration_minutes}`,
        {
          headers: {
            'Content-Type': 'application/json',
            // For now, we'll need a temp auth token for testing
            // TODO: Create public availability endpoint or guest token system
          }
        }
      );
      
      if (response.ok) {
        const availabilityData = await response.json();
        setAvailableSlots(availabilityData.availability_slots || []);
      } else {
        // Mock availability data for demo
        const mockSlots = generateMockAvailability();
        setAvailableSlots(mockSlots);
      }
      
    } catch (error) {
      console.error('Error loading availability:', error);
      // Fallback to mock data
      const mockSlots = generateMockAvailability();
      setAvailableSlots(mockSlots);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAvailability = () => {
    const slots = [];
    const today = new Date();
    
    for (let day = 1; day <= 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      
      // Skip Sundays
      if (date.getDay() === 0) continue;
      
      // Generate slots for business hours (9 AM - 6 PM)
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = new Date(date);
          slotTime.setHours(hour, minute, 0, 0);
          
          // Randomly skip some slots to simulate bookings
          if (Math.random() > 0.3) {
            slots.push({
              start_time: slotTime.toISOString(),
              end_time: new Date(slotTime.getTime() + (selectedService?.duration_minutes || 30) * 60000).toISOString(),
              duration_minutes: selectedService?.duration_minutes || 30,
              available: true
            });
          }
        }
      }
    }
    
    return slots.slice(0, 20); // Limit to first 20 slots
  };

  const handleBarberSelect = (barber) => {
    setSelectedBarber(barber);
    setSelectedService(null); // Reset service selection
    setBookingStep(2);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setBookingStep(3);
    loadAvailability();
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setBookingStep(4);
  };

  const handleBookingSubmit = async () => {
    try {
      setLoading(true);
      
      const bookingData = {
        barbershop_id: barbershopId,
        barber_id: selectedBarber.id,
        service_id: selectedService.service_id, // Use the base service ID
        barber_service_id: selectedService.id, // Include the barber-specific service ID
        client_name: customerDetails.name,
        client_email: customerDetails.email,
        client_phone: customerDetails.phone,
        scheduled_at: selectedSlot.start_time,
        client_notes: customerDetails.notes
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      
      if (result.success) {
        setBookingStep(5);
      } else {
        alert(result.message || 'Failed to create booking. Please try again.');
      }
      
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading && bookingStep === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading barbershop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {barbershop?.name || 'Book Appointment'}
              </h1>
              <p className="text-gray-600">
                {barbershop?.address && `${barbershop.address}, ${barbershop.city}, ${barbershop.state}`}
              </p>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= bookingStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Barber Selection */}
        {bookingStep === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Choose Your Barber</h2>
            <div className="grid gap-4">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  onClick={() => handleBarberSelect(barber)}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
                      {barber.avatar_url ? (
                        <img src={barber.avatar_url} alt={barber.name} className="w-12 h-12 rounded-full" />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {barber.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{barber.name}</h3>
                      <p className="text-gray-600 text-sm">{barber.specialty}</p>
                      <p className="text-gray-500 text-sm">{barber.experience}</p>
                      {barber.bio && <p className="text-gray-500 text-sm mt-1">{barber.bio}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600">
                        {barber.services?.length || 0} services
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Service Selection */}
        {bookingStep === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setBookingStep(1)}
                className="text-blue-600 hover:text-blue-700 mr-4"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold">Select a Service</h2>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-medium">Selected Barber: {selectedBarber?.name}</p>
              <p className="text-sm text-gray-600">{selectedBarber?.specialty} • {selectedBarber?.experience}</p>
            </div>

            <div className="grid gap-4">
              {selectedBarber?.services?.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{service.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-gray-500">
                          {service.duration_minutes} minutes
                        </p>
                        {service.skill_level && (
                          <p className="text-sm text-blue-600 capitalize">
                            {service.skill_level} level
                          </p>
                        )}
                      </div>
                      {service.specialty_notes && (
                        <p className="text-sm text-gray-500 mt-1 italic">
                          {service.specialty_notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${service.price}</p>
                      {service.category && (
                        <p className="text-sm text-gray-500 capitalize">{service.category}</p>
                      )}
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-center text-gray-500 py-8">
                  No services available for this barber.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Time Selection */}
        {bookingStep === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setBookingStep(2)}
                className="text-blue-600 hover:text-blue-700 mr-4"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold">Select Date & Time</h2>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-medium">
                {selectedService?.name} with {selectedBarber?.name}
              </p>
              <p className="text-sm text-gray-600">
                {selectedService?.duration_minutes} min • ${selectedService?.price}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading available times...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableSlots.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No available slots found. Please try selecting a different barber or check back later.
                  </p>
                ) : (
                  availableSlots.map((slot, index) => (
                    <div
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{formatDate(slot.start_time)}</p>
                          <p className="text-gray-600">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </p>
                        </div>
                        <div className="text-blue-600">
                          Book Now →
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Customer Details */}
        {bookingStep === 4 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setBookingStep(3)}
                className="text-blue-600 hover:text-blue-700 mr-4"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold">Your Information</h2>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="font-medium">Booking Summary</p>
              <p className="text-sm text-gray-600">
                {selectedService?.name} with {selectedBarber?.name}
              </p>
              <p className="text-sm text-gray-600">
                {formatDate(selectedSlot?.start_time)} at {formatTime(selectedSlot?.start_time)}
              </p>
              <p className="text-sm font-medium mt-2">Total: ${selectedService?.price}</p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customerDetails.notes}
                  onChange={(e) => setCustomerDetails({...customerDetails, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any specific requests or notes for your barber..."
                />
              </div>

              <button
                type="button"
                onClick={handleBookingSubmit}
                disabled={!customerDetails.name || !customerDetails.email || loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Booking...
                  </span>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {bookingStep === 5 && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully booked. You'll receive a confirmation email shortly.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium mb-3">Appointment Details</h3>
              <div className="text-left space-y-2 max-w-md mx-auto">
                <p><span className="font-medium">Service:</span> {selectedService?.name}</p>
                <p><span className="font-medium">Barber:</span> {selectedBarber?.name}</p>
                <p><span className="font-medium">Date:</span> {formatDate(selectedSlot?.start_time)}</p>
                <p><span className="font-medium">Time:</span> {formatTime(selectedSlot?.start_time)}</p>
                <p><span className="font-medium">Duration:</span> {selectedService?.duration_minutes} minutes</p>
                <p><span className="font-medium">Total:</span> ${selectedService?.price}</p>
              </div>
            </div>

            <button
              onClick={() => {
                // Reset for new booking
                setBookingStep(1);
                setSelectedService(null);
                setSelectedBarber(null);
                setSelectedSlot(null);
                setCustomerDetails({ name: '', email: '', phone: '', notes: '' });
              }}
              className="bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700"
            >
              Book Another Appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
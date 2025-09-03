"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Plus,
  ChevronLeft, 
  ChevronRight,
  Edit,
  Trash2,
  CheckCircle
} from 'lucide-react';

// Booking Calendar Interface for Single Barbershop MVP
export default function BookingCalendarInterface({ barbershopId, staffId, viewMode = 'day' }) {
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Booking Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Business hours configuration (can be made dynamic later)
  const businessHours = {
    start: 9, // 9 AM
    end: 18,  // 6 PM
    slotDuration: 30, // 30 minutes
  };

  // Load data on component mount and date change
  useEffect(() => {
    loadAppointments();
    loadServices();
    generateTimeSlots();
  }, [currentDate, barbershopId, staffId]);

  const loadAppointments = async () => {
    try {
      const dateStr = currentDate.toISOString().split('T')[0];
      const response = await fetch(
        `/api/appointments?barbershop_id=${barbershopId}&date=${dateStr}${staffId ? `&staff_id=${staffId}` : ''}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAppointments(data || []);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch(`/api/services?barbershop_id=${barbershopId}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
      for (let minute = 0; minute < 60; minute += businessHours.slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const dateTime = new Date(currentDate);
        dateTime.setHours(hour, minute, 0, 0);
        
        slots.push({
          time: timeString,
          dateTime: dateTime,
          available: !isSlotBooked(dateTime)
        });
      }
    }
    setTimeSlots(slots);
  };

  const isSlotBooked = (slotDateTime) => {
    return appointments.some(appointment => {
      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);
      return slotDateTime >= appointmentStart && slotDateTime < appointmentEnd;
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const openBookingModal = (slot = null, appointment = null) => {
    if (appointment) {
      // Editing existing appointment
      setEditingAppointment(appointment);
      setCustomerName(appointment.customer?.name || '');
      setCustomerPhone(appointment.customer?.phone || '');
      setCustomerEmail(appointment.customer?.email || '');
      setSelectedService(appointment.service_id?.toString() || '');
      setAppointmentNotes(appointment.notes || '');
    } else {
      // Creating new appointment
      setEditingAppointment(null);
      setSelectedSlot(slot);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setSelectedService('');
      setAppointmentNotes('');
    }
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    setEditingAppointment(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setSelectedService('');
    setAppointmentNotes('');
  };

  const submitBooking = async () => {
    if (!customerName.trim() || !selectedService) {
      toast.error('Please fill in customer name and service');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedServiceData = services.find(s => s.id.toString() === selectedService);
      if (!selectedServiceData) {
        toast.error('Invalid service selected');
        return;
      }

      const startTime = editingAppointment 
        ? new Date(editingAppointment.start_time)
        : selectedSlot.dateTime;
        
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + (selectedServiceData.duration_minutes || 30));

      const appointmentData = {
        barbershop_id: barbershopId,
        staff_id: staffId,
        service_id: parseInt(selectedService),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: appointmentNotes.trim() || null,
        status: 'scheduled'
      };

      const url = editingAppointment 
        ? `/api/appointments/${editingAppointment.id}`
        : '/api/appointments';
        
      const method = editingAppointment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(editingAppointment ? 'Appointment updated successfully' : 'Appointment booked successfully');
        closeBookingModal();
        loadAppointments(); // Reload appointments
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      toast.error('Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success(`Appointment marked as ${status}`);
        loadAppointments();
      } else {
        toast.error('Failed to update appointment');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update appointment');
    }
  };

  const deleteAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Appointment deleted');
        loadAppointments();
      } else {
        toast.error('Failed to delete appointment');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete appointment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <h2 className="text-xl font-semibold">{formatDate(currentDate)}</h2>
                <p className="text-sm text-gray-600">
                  {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Time Slots Grid */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {timeSlots.map((slot, index) => {
              const appointment = appointments.find(apt => {
                const appointmentStart = new Date(apt.start_time);
                return appointmentStart.getHours() === slot.dateTime.getHours() &&
                       appointmentStart.getMinutes() === slot.dateTime.getMinutes();
              });

              return (
                <div key={index} className="relative">
                  {appointment ? (
                    <Card className="cursor-pointer hover:shadow-md transition-shadow bg-blue-50 border-blue-200">
                      <div 
                        className="p-3 text-center"
                        onClick={() => openBookingModal(null, appointment)}
                      >
                        <p className="font-medium text-blue-800">{slot.time}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          {appointment.customer?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appointment.service?.name || 'Service'}
                        </p>
                        <div className="flex justify-center gap-1 mt-2">
                          <Badge 
                            variant={
                              appointment.status === 'completed' ? 'success' :
                              appointment.status === 'cancelled' ? 'destructive' :
                              'default'
                            }
                            className="text-xs"
                          >
                            {appointment.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ) : slot.available ? (
                    <Card 
                      className="cursor-pointer hover:shadow-md hover:bg-gray-50 transition-all border-dashed"
                      onClick={() => openBookingModal(slot)}
                    >
                      <div className="p-3 text-center">
                        <p className="font-medium text-gray-700">{slot.time}</p>
                        <p className="text-xs text-gray-500 mt-1">Available</p>
                        <Plus className="h-4 w-4 mx-auto mt-2 text-gray-400" />
                      </div>
                    </Card>
                  ) : (
                    <Card className="bg-gray-100 border-gray-200">
                      <div className="p-3 text-center">
                        <p className="font-medium text-gray-400">{slot.time}</p>
                        <p className="text-xs text-gray-400 mt-1">Unavailable</p>
                      </div>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>

          {timeSlots.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No time slots available</p>
            </div>
          )}
        </div>
      </Card>

      {/* Today's Appointments Summary */}
      {appointments.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Today's Appointments</h3>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">
                      {new Date(appointment.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                    <div>
                      <p className="font-medium">{appointment.customer?.name || 'Customer'}</p>
                      <p className="text-sm text-gray-600">{appointment.service?.name || 'Service'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        appointment.status === 'completed' ? 'success' :
                        appointment.status === 'cancelled' ? 'destructive' :
                        'default'
                      }
                    >
                      {appointment.status}
                    </Badge>
                    
                    <div className="flex gap-1">
                      {appointment.status === 'scheduled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBookingModal(null, appointment)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAppointment(appointment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={closeBookingModal}
        title={editingAppointment ? 'Edit Appointment' : 'New Appointment'}
      >
        <div className="p-6 space-y-4">
          {/* Time Display */}
          {(selectedSlot || editingAppointment) && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">
                  {editingAppointment 
                    ? new Date(editingAppointment.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })
                    : selectedSlot?.time
                  }
                </span>
                <span className="text-gray-600">on {formatDate(currentDate)}</span>
              </div>
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Service *</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id.toString()}>
                  {service.name} - ${parseFloat(service.price || 0).toFixed(2)} ({service.duration_minutes}min)
                </option>
              ))}
            </select>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Customer Name *
              </label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone Number
              </label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={appointmentNotes}
              onChange={(e) => setAppointmentNotes(e.target.value)}
              placeholder="Any special requests or notes..."
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={closeBookingModal}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submitBooking}
              disabled={isSubmitting || !customerName.trim() || !selectedService}
              className="flex-1"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingAppointment ? 'Updating...' : 'Booking...'}
                </div>
              ) : (
                editingAppointment ? 'Update Appointment' : 'Book Appointment'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
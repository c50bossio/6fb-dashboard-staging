"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { toast } from 'sonner';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Clock,
  DollarSign,
  History,
  Star,
  MessageSquare
} from 'lucide-react';

// Customer Management Interface for Single Barbershop MVP
export default function CustomerManagementInterface({ barbershopId, staffId }) {
  // State Management
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAppointmentHistory, setShowAppointmentHistory] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [customerBirthday, setCustomerBirthday] = useState('');

  // Customer History State
  const [customerAppointments, setCustomerAppointments] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, [barbershopId]);

  // Filter customers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers?barbershop_id=${barbershopId}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data || []);
      } else {
        toast.error('Failed to load customers');
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const openCustomerModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerName(customer.name || '');
      setCustomerPhone(customer.phone || '');
      setCustomerEmail(customer.email || '');
      setCustomerNotes(customer.notes || '');
      setCustomerBirthday(customer.birthday || '');
    } else {
      setEditingCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerNotes('');
      setCustomerBirthday('');
    }
    setShowCustomerModal(true);
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
    setEditingCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerNotes('');
    setCustomerBirthday('');
  };

  const submitCustomer = async () => {
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const customerData = {
        barbershop_id: barbershopId,
        name: customerName.trim(),
        phone: customerPhone.trim() || null,
        email: customerEmail.trim() || null,
        notes: customerNotes.trim() || null,
        birthday: customerBirthday || null
      };

      const url = editingCustomer 
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers';
        
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData)
      });

      if (response.ok) {
        toast.success(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
        closeCustomerModal();
        loadCustomers(); // Reload customer list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Customer submission error:', error);
      toast.error('Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCustomer = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer? This will also delete all their appointment history.')) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Customer deleted successfully');
        loadCustomers();
      } else {
        toast.error('Failed to delete customer');
      }
    } catch (error) {
      console.error('Delete customer error:', error);
      toast.error('Failed to delete customer');
    }
  };

  const viewCustomerHistory = async (customer) => {
    setSelectedCustomer(customer);
    setShowAppointmentHistory(true);
    
    try {
      // Load customer appointment history
      const response = await fetch(`/api/appointments?barbershop_id=${barbershopId}&customer_id=${customer.id}`);
      if (response.ok) {
        const appointments = await response.json();
        setCustomerAppointments(appointments || []);
        
        // Calculate customer stats
        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter(apt => apt.status === 'completed');
        const totalSpent = completedAppointments.reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0);
        const averageSpent = totalSpent / (completedAppointments.length || 1);
        const lastVisit = completedAppointments.length > 0 
          ? new Date(Math.max(...completedAppointments.map(apt => new Date(apt.start_time))))
          : null;

        setCustomerStats({
          totalAppointments,
          completedAppointments: completedAppointments.length,
          totalSpent,
          averageSpent,
          lastVisit
        });
      }
    } catch (error) {
      console.error('Failed to load customer history:', error);
      toast.error('Failed to load customer history');
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Table columns configuration
  const customerColumns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email || 'No email'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Phone',
      accessor: 'phone',
      cell: ({ row }) => formatPhoneNumber(row.phone)
    },
    {
      header: 'Last Visit',
      accessor: 'last_appointment_date',
      cell: ({ row }) => formatDate(row.last_appointment_date)
    },
    {
      header: 'Total Visits',
      accessor: 'appointment_count',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.appointment_count || 0} visits
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => viewCustomerHistory(row)}
          >
            <History className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openCustomerModal(row)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteCustomer(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Customer Management</h2>
              <p className="text-gray-600 mt-1">
                Manage your customer database and view appointment history
              </p>
            </div>
            <Button onClick={() => openCustomerModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search customers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-xl font-semibold">{customers.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Customers</p>
                  <p className="text-xl font-semibold">
                    {customers.filter(c => c.last_appointment_date).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">New This Month</p>
                  <p className="text-xl font-semibold">
                    {customers.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const now = new Date();
                      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Customer List */}
      <Card>
        <div className="p-6">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? `No customers match "${searchQuery}"`
                  : 'Add your first customer to get started'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => openCustomerModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              data={filteredCustomers}
              columns={customerColumns}
              searchable={false}
              pagination={true}
            />
          )}
        </div>
      </Card>

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={closeCustomerModal}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
      >
        <div className="p-6 space-y-4">
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
              Email Address
            </label>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Birthday (Optional)
            </label>
            <Input
              type="date"
              value={customerBirthday}
              onChange={(e) => setCustomerBirthday(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <MessageSquare className="h-4 w-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Any special notes about this customer..."
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={closeCustomerModal}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submitCustomer}
              disabled={isSubmitting || !customerName.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingCustomer ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                editingCustomer ? 'Update Customer' : 'Add Customer'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Customer History Modal */}
      <Modal
        isOpen={showAppointmentHistory}
        onClose={() => setShowAppointmentHistory(false)}
        title={`${selectedCustomer?.name || 'Customer'} History`}
        size="lg"
      >
        <div className="p-6 space-y-6">
          {customerStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{customerStats.totalAppointments}</p>
                <p className="text-xs text-gray-600">Total Appointments</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{customerStats.completedAppointments}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(customerStats.totalSpent)}</p>
                <p className="text-xs text-gray-600">Total Spent</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(customerStats.averageSpent)}</p>
                <p className="text-xs text-gray-600">Average Visit</p>
              </div>
            </div>
          )}

          {customerAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No appointment history</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium">Appointment History</h3>
              {customerAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {formatDate(appointment.start_time)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appointment.service?.name || 'Service'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(appointment.price)}</p>
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
              ))}
            </div>
          )}

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAppointmentHistory(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
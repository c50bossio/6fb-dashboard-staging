'use client';

import React, { useState, useEffect } from 'react';

import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from "../ui/card"';

const WaitlistJoinModal = ({ 
    isOpen, 
    onClose, 
    service, 
    barbershop,
    onSuccess 
}) => {
    const [formData, setFormData] = useState({
        priority: 'medium',
        preferred_dates: [],
        preferred_times: [],
        max_wait_days: 14,
        notes: '',
        notification_preferences: {
            email: true,
            sms: true,
            push: true,
            immediate_notify: true,
            daily_updates: false
        }
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [step, setStep] = useState(1);
    
    const priorities = [
        { value: 'urgent', label: 'Urgent', description: 'Need appointment ASAP', color: 'text-red-600' },
        { value: 'high', label: 'High Priority', description: 'Important but flexible', color: 'text-orange-600' },
        { value: 'medium', label: 'Medium Priority', description: 'Standard priority', color: 'text-olive-600' },
        { value: 'low', label: 'Low Priority', description: 'Very flexible timing', color: 'text-green-600' }
    ];
    
    const timeRanges = [
        '09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00',
        '09:00-15:00', '15:00-21:00', '09:00-21:00'
    ];
    
    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/api/waitlist/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_id: 'customer_demo', // In real app, get from auth context
                    barbershop_id: barbershop?.id || 'demo_barbershop',
                    service_id: service?.id || service?.service_id,
                    ...formData,
                    preferred_dates: formData.preferred_dates.length > 0 ? 
                        formData.preferred_dates.map(date => new Date(date).toISOString()) : 
                        null
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                setSuccess(`Successfully added to waitlist at position ${result.position}!`);
                if (onSuccess) {
                    onSuccess(result);
                }
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setError(result.error || 'Failed to join waitlist');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Error joining waitlist:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDateChange = (e) => {
        const value = e.target.value;
        if (value && !formData.preferred_dates.includes(value)) {
            setFormData(prev => ({
                ...prev,
                preferred_dates: [...prev.preferred_dates, value].sort()
            }));
        }
    };
    
    const removePrefDate = (dateToRemove) => {
        setFormData(prev => ({
            ...prev,
            preferred_dates: prev.preferred_dates.filter(date => date !== dateToRemove)
        }));
    };
    
    const toggleTimeRange = (timeRange) => {
        setFormData(prev => ({
            ...prev,
            preferred_times: prev.preferred_times.includes(timeRange)
                ? prev.preferred_times.filter(t => t !== timeRange)
                : [...prev.preferred_times, timeRange]
        }));
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Join Waitlist
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Service Info */}
                    <Card className="mb-6">
                        <div className="p-4">
                            <h3 className="font-semibold text-lg">{service?.name}</h3>
                            <div className="text-sm text-gray-600 mt-1">
                                <span>${service?.base_price}</span>
                                <span className="mx-2">•</span>
                                <span>{service?.duration_minutes} minutes</span>
                                {barbershop?.name && (
                                    <>
                                        <span className="mx-2">•</span>
                                        <span>{barbershop.name}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>
                    
                    {error && (
                        <Alert variant="error" className="mb-4">
                            {error}
                        </Alert>
                    )}
                    
                    {success && (
                        <Alert variant="success" className="mb-4">
                            {success}
                        </Alert>
                    )}
                    
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Priority Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Priority Level
                                </label>
                                <div className="space-y-2">
                                    {priorities.map(priority => (
                                        <div key={priority.value} className="flex items-center">
                                            <input
                                                type="radio"
                                                id={priority.value}
                                                name="priority"
                                                value={priority.value}
                                                checked={formData.priority === priority.value}
                                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                                className="mr-3"
                                            />
                                            <label htmlFor={priority.value} className="flex-1 cursor-pointer">
                                                <div className={`font-medium ${priority.color}`}>
                                                    {priority.label}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {priority.description}
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Max Wait Days */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Maximum days willing to wait
                                </label>
                                <select
                                    value={formData.max_wait_days}
                                    onChange={(e) => setFormData(prev => ({ ...prev, max_wait_days: parseInt(e.target.value) }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value={7}>1 week</option>
                                    <option value={14}>2 weeks</option>
                                    <option value={21}>3 weeks</option>
                                    <option value={30}>1 month</option>
                                </select>
                            </div>
                            
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                >
                                    Next: Preferences
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Preferred Dates */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred Dates (Optional)
                                </label>
                                <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    max={new Date(Date.now() + formData.max_wait_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                    onChange={handleDateChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {formData.preferred_dates.map(date => (
                                        <span 
                                            key={date}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-olive-100 text-olive-800"
                                        >
                                            {new Date(date).toLocaleDateString()}
                                            <button
                                                onClick={() => removePrefDate(date)}
                                                className="ml-1 text-olive-600 hover:text-olive-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Preferred Time Ranges */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Preferred Time Ranges
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {timeRanges.map(timeRange => (
                                        <button
                                            key={timeRange}
                                            type="button"
                                            onClick={() => toggleTimeRange(timeRange)}
                                            className={`px-3 py-2 text-sm rounded-md border ${
                                                formData.preferred_times.includes(timeRange)
                                                    ? 'bg-olive-100 border-olive-300 text-olive-700'
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {timeRange}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Any special requests or preferences..."
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    rows={3}
                                />
                            </div>
                            
                            <div className="flex justify-between">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(3)}
                                >
                                    Next: Notifications
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Notification Preferences */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Notification Preferences
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">Email Notifications</div>
                                            <div className="text-sm text-gray-600">Get updates via email</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.notification_preferences.email}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                notification_preferences: {
                                                    ...prev.notification_preferences,
                                                    email: e.target.checked
                                                }
                                            }))}
                                            className="h-4 w-4"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">SMS Notifications</div>
                                            <div className="text-sm text-gray-600">Get text messages for urgent updates</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.notification_preferences.sms}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                notification_preferences: {
                                                    ...prev.notification_preferences,
                                                    sms: e.target.checked
                                                }
                                            }))}
                                            className="h-4 w-4"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">Push Notifications</div>
                                            <div className="text-sm text-gray-600">Get browser notifications</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.notification_preferences.push}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                notification_preferences: {
                                                    ...prev.notification_preferences,
                                                    push: e.target.checked
                                                }
                                            }))}
                                            className="h-4 w-4"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">Immediate Alerts</div>
                                            <div className="text-sm text-gray-600">Notify instantly when slots become available</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.notification_preferences.immediate_notify}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                notification_preferences: {
                                                    ...prev.notification_preferences,
                                                    immediate_notify: e.target.checked
                                                }
                                            }))}
                                            className="h-4 w-4"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="bg-olive-600 text-white px-6 py-2 rounded-md hover:bg-olive-700 disabled:opacity-50"
                                >
                                    {loading ? 'Joining...' : 'Join Waitlist'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WaitlistJoinModal;
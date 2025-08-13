'use client';

import React, { useState, useEffect } from 'react';

import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const CancellationModal = ({ 
    isOpen, 
    onClose, 
    booking, 
    onSuccess 
}) => {
    const [step, setStep] = useState(1); // 1: reason, 2: confirmation, 3: result
    const [reason, setReason] = useState('customer_request');
    const [notes, setNotes] = useState('');
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    
    const reasons = [
        { 
            value: 'customer_request', 
            label: 'Personal Decision', 
            description: 'I need to cancel for personal reasons',
            icon: '👤'
        },
        { 
            value: 'emergency', 
            label: 'Emergency', 
            description: 'Unexpected emergency situation',
            icon: '🚨'
        },
        { 
            value: 'illness', 
            label: 'Illness', 
            description: 'I am feeling unwell',
            icon: '🤒'
        },
        { 
            value: 'schedule_conflict', 
            label: 'Schedule Conflict', 
            description: 'Found a conflicting appointment',
            icon: '📅'
        },
        { 
            value: 'weather', 
            label: 'Weather Conditions', 
            description: 'Severe weather preventing travel',
            icon: '🌧️'
        }
    ];
    
    useEffect(() => {
        if (isOpen && booking?.service_id) {
            fetchCancellationPolicy();
        }
    }, [isOpen, booking]);
    
    const fetchCancellationPolicy = async () => {
        try {
            const response = await fetch(`/api/cancellations/policy?service_id=${booking.service_id}&booking_id=${booking.id}`);
            const data = await response.json();
            
            if (data.success) {
                setPolicy(data);
            }
        } catch (err) {
            console.error('Error fetching cancellation policy:', err);
        }
    };
    
    const handleCancellation = async () => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/api/cancellations/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    booking_id: booking.id,
                    reason: reason,
                    notes: notes.trim() || undefined,
                    cancelled_by: 'customer_demo' // In real app, get from auth context
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setResult(data);
                setStep(3);
                if (onSuccess) {
                    onSuccess(data);
                }
            } else {
                setError(data.error || 'Failed to process cancellation');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Error processing cancellation:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const resetModal = () => {
        setStep(1);
        setReason('customer_request');
        setNotes('');
        setError('');
        setResult(null);
        setLoading(false);
    };
    
    const handleClose = () => {
        resetModal();
        onClose();
    };
    
    if (!isOpen || !booking) return null;
    
    const currentRefund = policy?.current_refund;
    const policyType = policy?.policy?.policy_type || 'standard';
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {step === 3 ? 'Cancellation Complete' : 'Cancel Appointment'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Booking Info */}
                    <Card className="mb-6">
                        <div className="p-4">
                            <h3 className="font-semibold text-lg">{booking.service_name || 'Appointment'}</h3>
                            <div className="text-sm text-gray-600 mt-1 space-y-1">
                                <div>📅 {new Date(booking.scheduled_at || booking.date).toLocaleDateString()} at {new Date(booking.scheduled_at || `${booking.date} ${booking.time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                <div>💰 ${booking.total_amount || booking.price}</div>
                                {booking.barber_name && <div>✂️ with {booking.barber_name}</div>}
                            </div>
                        </div>
                    </Card>
                    
                    {error && (
                        <Alert variant="error" className="mb-4">
                            {error}
                        </Alert>
                    )}
                    
                    {/* Step 1: Reason Selection */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Why are you cancelling?</h3>
                                <div className="space-y-3">
                                    {reasons.map(reasonOption => (
                                        <div key={reasonOption.value} className="flex items-center">
                                            <input
                                                type="radio"
                                                id={reasonOption.value}
                                                name="reason"
                                                value={reasonOption.value}
                                                checked={reason === reasonOption.value}
                                                onChange={(e) => setReason(e.target.value)}
                                                className="mr-3"
                                            />
                                            <label htmlFor={reasonOption.value} className="flex-1 cursor-pointer">
                                                <div className="flex items-center">
                                                    <span className="text-xl mr-2">{reasonOption.icon}</span>
                                                    <div>
                                                        <div className="font-medium">{reasonOption.label}</div>
                                                        <div className="text-sm text-gray-600">{reasonOption.description}</div>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional notes (optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Please provide any additional details..."
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    rows={3}
                                />
                            </div>
                            
                            <div className="flex justify-end">
                                <Button
                                    onClick={() => setStep(2)}
                                    className="bg-olive-600 text-white px-6 py-2 rounded-md hover:bg-olive-700"
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {/* Step 2: Refund Information & Confirmation */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Refund Information</h3>
                                
                                {currentRefund ? (
                                    <Card>
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span>Original amount:</span>
                                                <span className="font-semibold">${currentRefund.original_amount.toFixed(2)}</span>
                                            </div>
                                            
                                            {currentRefund.cancellation_fee > 0 && (
                                                <div className="flex justify-between items-center text-red-600">
                                                    <span>Cancellation fee:</span>
                                                    <span>-${currentRefund.cancellation_fee.toFixed(2)}</span>
                                                </div>
                                            )}
                                            
                                            <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
                                                <span>Refund amount:</span>
                                                <span className={currentRefund.refund_amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    ${currentRefund.refund_amount.toFixed(2)}
                                                </span>
                                            </div>
                                            
                                            <div className="text-sm text-gray-600 mt-2">
                                                <div className="font-medium mb-1">Policy Details:</div>
                                                <div>{currentRefund.reason}</div>
                                                <div className="mt-1">Time until appointment: {currentRefund.hours_until_appointment} hours</div>
                                                {currentRefund.refund_amount > 0 && (
                                                    <div className="mt-2 text-olive-600">
                                                        💳 Refund will appear in your account within 3-5 business days
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-olive-600 mx-auto"></div>
                                        <div className="mt-2 text-gray-600">Calculating refund...</div>
                                    </div>
                                )}
                            </div>
                            
                            {policy?.policy_summary && (
                                <div>
                                    <h4 className="font-semibold mb-2">Cancellation Policy ({policy.policy_summary.type})</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        {policy.policy_summary.key_points.map((point, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="text-olive-600 mr-2">•</span>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            <Alert variant="warning">
                                <div className="font-medium">Please confirm:</div>
                                <div className="mt-1">
                                    This action cannot be undone. Your appointment will be cancelled and 
                                    {currentRefund?.refund_amount > 0 ? 
                                        ` you will receive a refund of $${currentRefund.refund_amount.toFixed(2)}` :
                                        ' no refund will be issued'
                                    }.
                                </div>
                            </Alert>
                            
                            <div className="flex justify-between space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleCancellation}
                                    disabled={loading || !currentRefund}
                                    className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                                >
                                    {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {/* Step 3: Cancellation Result */}
                    {step === 3 && result && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="mb-4">
                                    <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-green-700 mb-2">
                                    Appointment Cancelled Successfully
                                </h3>
                                <p className="text-gray-600">
                                    {result.message}
                                </p>
                            </div>
                            
                            <Card>
                                <div className="p-4 space-y-3">
                                    <h4 className="font-semibold">Cancellation Details</h4>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Cancellation ID:</span>
                                            <span className="font-mono">{result.cancellation_id}</span>
                                        </div>
                                        
                                        <div className="flex justify-between">
                                            <span>Refund Amount:</span>
                                            <span className="font-semibold text-green-600">
                                                ${result.refund_amount.toFixed(2)}
                                            </span>
                                        </div>
                                        
                                        {result.refund_processed && result.refund_details && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Refund ID:</span>
                                                    <span className="font-mono">{result.refund_details.refund_id}</span>
                                                </div>
                                                
                                                <div className="flex justify-between">
                                                    <span>Expected in account:</span>
                                                    <span>{new Date(result.refund_details.expected_arrival).toLocaleDateString()}</span>
                                                </div>
                                            </>
                                        )}
                                        
                                        {result.waitlist_notifications_sent > 0 && (
                                            <div className="flex justify-between text-olive-600">
                                                <span>Waitlist notified:</span>
                                                <span>{result.waitlist_notifications_sent} customer{result.waitlist_notifications_sent !== 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                            
                            {result.next_steps && result.next_steps.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">What happens next:</h4>
                                    <div className="space-y-2">
                                        {result.next_steps.map((step, index) => (
                                            <div key={index} className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 w-6 h-6 bg-olive-100 rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-semibold text-olive-600">{index + 1}</span>
                                                </div>
                                                <div className="text-sm">
                                                    <div className="font-medium">{step.description}</div>
                                                    {step.automatic && (
                                                        <div className="text-gray-500">✅ Automatic</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-center">
                                <Button
                                    onClick={handleClose}
                                    className="bg-olive-600 text-white px-8 py-2 rounded-md hover:bg-olive-700"
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CancellationModal;
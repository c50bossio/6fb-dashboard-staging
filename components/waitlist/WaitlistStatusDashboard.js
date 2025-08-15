'use client';

import React, { useState, useEffect } from 'react';

import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const WaitlistStatusDashboard = ({ customerId }) => {
    const [waitlistEntries, setWaitlistEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    
    const fetchWaitlistStatus = async () => {
        try {
            setRefreshing(true);
            const response = await fetch(`/api/waitlist/status?customer_id=${customerId || 'customer_demo'}`);
            const data = await response.json();
            
            if (data.success) {
                setWaitlistEntries(data.waitlist_entries || []);
                setError('');
            } else {
                setError(data.error || 'Failed to load waitlist status');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Error fetching waitlist status:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    useEffect(() => {
        fetchWaitlistStatus();
        
        const interval = setInterval(fetchWaitlistStatus, 30000);
        return () => clearInterval(interval);
    }, [customerId]);
    
    const handleRemoveFromWaitlist = async (waitlistId) => {
        if (!confirm('Are you sure you want to remove this waitlist entry?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/waitlist/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ waitlist_id: waitlistId })
            });
            
            const result = await response.json();
            
            if (result.success) {
                setWaitlistEntries(prev => prev.filter(entry => entry.waitlist_id !== waitlistId));
                setSelectedEntry(null);
            } else {
                setError(result.error || 'Failed to remove from waitlist');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Error removing from waitlist:', err);
        }
    };
    
    const formatTimeLeft = (estimatedAvailable) => {
        if (!estimatedAvailable) return 'TBD';
        
        const now = new Date();
        const available = new Date(estimatedAvailable);
        const diffMs = available - now;
        
        if (diffMs <= 0) return 'Available soon';
        
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (diffDays >= 1) {
            return `~${Math.floor(diffDays)} day${Math.floor(diffDays) !== 1 ? 's' : ''}`;
        } else {
            return `~${Math.floor(diffHours)} hour${Math.floor(diffHours) !== 1 ? 's' : ''}`;
        }
    };
    
    const getPriorityBadge = (position) => {
        if (position === 1) return { text: 'Next', color: 'bg-moss-100 text-moss-900' };
        if (position <= 3) return { text: 'Soon', color: 'bg-amber-100 text-amber-900' };
        if (position <= 5) return { text: 'Queue', color: 'bg-olive-100 text-olive-800' };
        return { text: 'Waiting', color: 'bg-gray-100 text-gray-800' };
    };
    
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">My Waitlists</h2>
                </div>
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
                    <span className="ml-2 text-gray-600">Loading waitlist status...</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">My Waitlists</h2>
                <Button
                    variant="outline"
                    onClick={fetchWaitlistStatus}
                    disabled={refreshing}
                    className="flex items-center space-x-2"
                >
                    <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                </Button>
            </div>
            
            {error && (
                <Alert variant="error">
                    {error}
                </Alert>
            )}
            
            {waitlistEntries.length === 0 ? (
                <Card>
                    <div className="p-8 text-center">
                        <div className="mb-4">
                            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Waitlists</h3>
                        <p className="text-gray-600">You don't have any active waitlist entries. Join a waitlist to get notified when appointments become available!</p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {waitlistEntries.map((entry) => {
                        const priorityBadge = getPriorityBadge(entry.position);
                        const timeLeft = formatTimeLeft(entry.estimated_available);
                        
                        return (
                            <Card key={entry.waitlist_id}>
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {entry.service_name}
                                                </h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityBadge.color}`}>
                                                    {priorityBadge.text}
                                                </span>
                                            </div>
                                            
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div>Barber: {entry.barber_name}</div>
                                                <div>Position in queue: #{entry.position}</div>
                                                <div>Estimated time: {timeLeft}</div>
                                                {entry.notification_count > 0 && (
                                                    <div className="text-olive-600">
                                                        {entry.notification_count} notification{entry.notification_count !== 1 ? 's' : ''} sent
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mt-4 flex items-center space-x-2 text-xs text-gray-500">
                                                <span>Joined: {new Date(entry.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>Expires: {new Date(entry.expires_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col space-y-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedEntry(entry)}
                                            >
                                                Details
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRemoveFromWaitlist(entry.waitlist_id)}
                                                className="text-red-600 border-red-300 hover:bg-red-50"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Progress bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                                            <span>Queue Progress</span>
                                            <span>Position {entry.position}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-olive-600 h-2 rounded-full transition-all duration-300"
                                                style={{ 
                                                    width: `${Math.max(10, 100 - (entry.position * 10))}%` 
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            
            {/* Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">Waitlist Details</h3>
                                <button
                                    onClick={() => setSelectedEntry(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold">{selectedEntry.service_name}</h4>
                                    <p className="text-sm text-gray-600">with {selectedEntry.barber_name}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">Position:</span>
                                        <div>#{selectedEntry.position}</div>
                                    </div>
                                    <div>
                                        <span className="font-medium">Estimated wait:</span>
                                        <div>{formatTimeLeft(selectedEntry.estimated_available)}</div>
                                    </div>
                                    <div>
                                        <span className="font-medium">Joined:</span>
                                        <div>{new Date(selectedEntry.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        <span className="font-medium">Expires:</span>
                                        <div>{new Date(selectedEntry.expires_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                
                                <div>
                                    <span className="font-medium text-sm">Notifications:</span>
                                    <div className="text-sm text-gray-600">
                                        {selectedEntry.notification_count || 0} sent so far
                                    </div>
                                </div>
                                
                                <div className="flex space-x-2 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedEntry(null)}
                                        className="flex-1"
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleRemoveFromWaitlist(selectedEntry.waitlist_id);
                                            setSelectedEntry(null);
                                        }}
                                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaitlistStatusDashboard;
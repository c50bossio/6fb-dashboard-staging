"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import UnifiedBarbershopDashboard from '@/components/dashboard/UnifiedBarbershopDashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, LogIn } from 'lucide-react';

export default function MVPDashboardPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [barbershopId, setBarbershopId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        setError('Please log in to access the dashboard');
        setLoading(false);
        return;
      }
      
      setUser(user);

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Failed to load user profile');
        setLoading(false);
        return;
      }

      setProfile(profile);

      // Determine barbershop ID using the same logic as the backend
      let shopId = profile.shop_id || profile.barbershop_id;

      // If no direct shop_id, check barbershop_staff table
      if (!shopId) {
        const { data: staffAccess, error: staffError } = await supabase
          .from('barbershop_staff')
          .select('barbershop_id')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .single();

        if (!staffError && staffAccess) {
          shopId = staffAccess.barbershop_id;
        }
      }

      // Fallback for development/testing
      if (!shopId) {
        // Create a default barbershop for MVP testing
        const { data: defaultShop, error: shopError } = await supabase
          .from('barbershops')
          .select('id')
          .limit(1)
          .single();

        if (!shopError && defaultShop) {
          shopId = defaultShop.id;
        }
      }

      if (!shopId) {
        setError('No barbershop access found. Please contact your administrator.');
        setLoading(false);
        return;
      }

      setBarbershopId(shopId);

    } catch (error) {
      console.error('Initialization error:', error);
      setError('Failed to initialize dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/mvp-dashboard`
      }
    });
    
    if (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setBarbershopId(null);
    setError('Please log in to access the dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MVP dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !profile || !barbershopId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              MVP Dashboard Access Required
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'Authentication required to access the MVP dashboard'}
            </p>
            
            {!user ? (
              <Button onClick={handleSignIn} className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In with Google
              </Button>
            ) : (
              <div className="space-y-3">
                <Button onClick={initializeUser} variant="outline" className="w-full">
                  Retry
                </Button>
                <Button onClick={handleSignOut} variant="outline" className="w-full">
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <UnifiedBarbershopDashboard
          barbershopId={barbershopId}
          staffId={profile.id}
          userProfile={profile}
        />
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-6 p-4 border-dashed">
            <div className="text-xs text-gray-500">
              <p><strong>MVP Debug Info:</strong></p>
              <p>User ID: {user.id}</p>
              <p>Profile ID: {profile.id}</p>
              <p>Barbershop ID: {barbershopId}</p>
              <p>User Email: {user.email}</p>
              <div className="mt-2 space-x-2">
                <Button onClick={handleSignOut} size="sm" variant="outline">
                  Sign Out
                </Button>
                <Button 
                  onClick={() => window.location.href = '/dashboard'} 
                  size="sm" 
                  variant="outline"
                >
                  Full Dashboard
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
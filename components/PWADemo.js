'use client';

import { useState, useEffect } from 'react';
import { usePWA } from './PWAProvider';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { queueAction, getSyncStats } from '../utils/backgroundSync';
import { 
  WifiIcon, 
  WifiOffIcon, 
  DownloadIcon, 
  CloudIcon,
  ActivityIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from 'lucide-react';

export default function PWADemo() {
  const pwa = usePWA();
  const { isInstalled, canInstall, install } = usePWAInstall();
  const { isOnline, connectionQuality, isConnectionFast } = useNetworkStatus();
  const [syncStats, setSyncStats] = useState(null);
  const [demoForm, setDemoForm] = useState({ name: '', email: '' });

  useEffect(() => {
    // Load sync stats
    getSyncStats().then(setSyncStats);
  }, []);

  const handleInstall = async () => {
    const result = await install();
    if (result.success) {
      alert('App installed successfully!');
    } else {
      alert('Installation failed or cancelled');
    }
  };

  const handleOfflineFormSubmit = async (e) => {
    e.preventDefault();
    
    if (isOnline) {
      // Online - submit normally
      try {
        const response = await fetch('/api/demo-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(demoForm)
        });
        
        if (response.ok) {
          alert('Form submitted successfully!');
          setDemoForm({ name: '', email: '' });
        }
      } catch (error) {
        alert('Submission failed: ' + error.message);
      }
    } else {
      // Offline - queue for later
      await queueAction({
        type: 'form-submission',
        url: '/api/demo-form',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: demoForm
      });
      
      alert('You\'re offline! Form queued for submission when connection is restored.');
      setDemoForm({ name: '', email: '' });
    }
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOffIcon size={20} className="text-red-500" />;
    if (connectionQuality === 'poor') return <WifiIcon size={20} className="text-yellow-500" />;
    return <WifiIcon size={20} className="text-green-500" />;
  };

  const getConnectionText = () => {
    if (!isOnline) return 'Offline';
    return `Online (${connectionQuality})`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* PWA Status Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <ActivityIcon size={24} className="mr-3 text-blue-600" />
          PWA Status Dashboard
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Installation Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Installation</span>
              {isInstalled ? (
                <CheckCircleIcon size={16} className="text-green-500" />
              ) : canInstall ? (
                <DownloadIcon size={16} className="text-blue-500" />
              ) : (
                <AlertCircleIcon size={16} className="text-yellow-500" />
              )}
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {isInstalled ? 'Installed' : canInstall ? 'Ready to Install' : 'Not Available'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {isInstalled 
                ? 'App is installed and ready to use' 
                : canInstall 
                ? 'Click button below to install'
                : 'Installation not supported or criteria not met'
              }
            </p>
          </div>

          {/* Network Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Connection</span>
              {getConnectionIcon()}
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {getConnectionText()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {isOnline 
                ? `Speed: ${isConnectionFast ? 'Fast' : 'Slow'} connection`
                : 'Some features may be limited'
              }
            </p>
          </div>

          {/* Cache Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Cache</span>
              <CloudIcon size={16} className="text-purple-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {pwa.cacheSize || 0} items
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cached resources for offline use
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-4">
          {canInstall && (
            <button
              onClick={handleInstall}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <DownloadIcon size={16} className="mr-2" />
              Install App
            </button>
          )}
          
          {pwa.updateAvailable && (
            <button
              onClick={pwa.updateServiceWorker}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircleIcon size={16} className="mr-2" />
              Update Available
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ActivityIcon size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Offline Form Demo */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Offline Form Demo
        </h3>
        <p className="text-gray-600 mb-6">
          This form works both online and offline. When offline, submissions are queued 
          and automatically sent when the connection is restored.
        </p>
        
        <form onSubmit={handleOfflineFormSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={demoForm.name}
              onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={demoForm.email}
              onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isOnline
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            {isOnline ? 'Submit Form' : 'Queue for Later (Offline)'}
          </button>
        </form>
      </div>

      {/* Sync Statistics */}
      {syncStats && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Background Sync Statistics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{syncStats.total}</p>
              <p className="text-sm text-gray-600">Total Actions</p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{syncStats.pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{syncStats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{syncStats.failed}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>
        </div>
      )}

      {/* PWA Features List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Available PWA Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { feature: 'Offline Functionality', status: true, desc: 'App works without internet' },
            { feature: 'App Installation', status: canInstall || isInstalled, desc: 'Install as native app' },
            { feature: 'Background Sync', status: 'sync' in window.ServiceWorkerRegistration.prototype, desc: 'Queue actions when offline' },
            { feature: 'Push Notifications', status: 'Notification' in window, desc: 'Receive notifications' },
            { feature: 'Service Worker', status: 'serviceWorker' in navigator, desc: 'Caching and offline support' },
            { feature: 'Local Storage', status: 'localStorage' in window, desc: 'Store data locally' }
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{item.feature}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                item.status ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
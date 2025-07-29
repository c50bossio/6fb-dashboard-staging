'use client';

import { useState, useEffect } from 'react';
import { XIcon, DownloadIcon, SmartphoneIcon, MonitorIcon, CheckCircleIcon } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [userEngagement, setUserEngagement] = useState(0);
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const installed = localStorage.getItem('pwa-installed');
    
    if (dismissed || installed) {
      setPromptDismissed(true);
      return;
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone;
    setIsStandalone(standalone);

    // Listen for beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Track user engagement
    let interactions = 0;
    const trackEngagement = () => {
      interactions++;
      setUserEngagement(interactions);
      
      // Show prompt after sufficient engagement (3+ interactions)
      if (interactions >= 3 && deferredPrompt && !promptDismissed) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    // Add engagement listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('click', trackEngagement);
    window.addEventListener('scroll', trackEngagement);
    window.addEventListener('keydown', trackEngagement);

    // For iOS, show prompt after engagement
    if (iOS && !standalone && !promptDismissed) {
      setTimeout(() => {
        if (userEngagement >= 2) {
          setShowPrompt(true);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('click', trackEngagement);
      window.removeEventListener('scroll', trackEngagement);
      window.removeEventListener('keydown', trackEngagement);
    };
  }, [deferredPrompt, userEngagement, promptDismissed]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Edge installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true');
        setShowPrompt(false);
      }
      
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Show iOS installation instructions
      setShowPrompt(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setPromptDismissed(true);
  };

  const handleNotNow = () => {
    setShowPrompt(false);
    // Set temporary dismissal (24 hours)
    localStorage.setItem('pwa-prompt-temp-dismissed', Date.now().toString());
  };

  // Don't show if already installed or permanently dismissed
  if (isStandalone || promptDismissed || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
        
        {/* Install Prompt Modal */}
        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md transform transition-all duration-300 ease-out">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <DownloadIcon size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Install 6FB AI</h3>
                <p className="text-sm text-gray-500">Get the full app experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XIcon size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Benefits */}
          <div className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Why install the app?</h4>
            <div className="space-y-3">
              {[
                {
                  icon: SmartphoneIcon,
                  title: 'Works Offline',
                  description: 'Access your dashboard and data even without internet'
                },
                {
                  icon: MonitorIcon,
                  title: 'Full Screen Experience',
                  description: 'Native app feel without browser chrome'
                },
                {
                  icon: CheckCircleIcon,
                  title: 'Instant Access',
                  description: 'Launch directly from your home screen'
                }
              ].map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconComponent size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{benefit.title}</p>
                      <p className="text-xs text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* iOS Instructions */}
          {isIOS && (
            <div className="px-6 pb-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <h5 className="font-semibold text-blue-900 mb-2 text-sm">How to install on iOS:</h5>
                <ol className="text-xs text-blue-800 space-y-1">
                  <li>1. Tap the Share icon at the bottom of your screen</li>
                  <li>2. Scroll down and tap "Add to Home Screen"</li>
                  <li>3. Tap "Add" to install the app</li>
                </ol>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 p-6 pt-0">
            <button
              onClick={handleNotNow}
              className="flex-1 px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <DownloadIcon size={18} />
              <span>{isIOS ? 'Show Instructions' : 'Install App'}</span>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 pb-4">
            <div className="text-center">
              <p className="text-xs text-gray-400">
                Trusted by thousands of barbershops worldwide
              </p>
              <div className="flex justify-center space-x-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
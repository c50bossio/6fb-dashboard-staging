'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon,
  CodeBracketIcon,
  AdjustmentsHorizontalIcon,
  ClipboardIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CursorArrowRaysIcon,
  PaintBrushIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

export default function EmbedCodeModal({ isOpen, onClose, bookingLink }) {
  const [activeTab, setActiveTab] = useState('iframe')
  const [copiedType, setCopiedType] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [embedOptions, setEmbedOptions] = useState({
    width: '100%',
    height: '600',
    theme: 'light',
    hideHeader: false,
    hideFooter: false,
    autoResize: true,
    primaryColor: '#3B82F6',
    borderRadius: '8',
    shadow: true,
    preSelectedServices: bookingLink?.services?.map(s => s.id) || [],
    allowedDomains: []
  })
  const [previewDevice, setPreviewDevice] = useState('desktop')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'
  const embedUrl = `${baseUrl}/book/${bookingLink?.barberId || 'demo-barber'}/embed`

  const generateIframeCode = () => {
    const params = new URLSearchParams()
    
    if (embedOptions.theme !== 'light') params.append('theme', embedOptions.theme)
    if (embedOptions.hideHeader) params.append('hideHeader', 'true')
    if (embedOptions.hideFooter) params.append('hideFooter', 'true')
    if (embedOptions.primaryColor !== '#3B82F6') params.append('color', embedOptions.primaryColor.replace('#', ''))
    if (embedOptions.preSelectedServices.length > 0) {
      params.append('services', embedOptions.preSelectedServices.join(','))
    }
    if (bookingLink?.timeSlots?.length > 0) {
      params.append('timeSlots', bookingLink.timeSlots.join(','))
    }
    if (bookingLink?.discount) {
      params.append('discount', bookingLink.discount)
    }
    
    const fullUrl = params.toString() ? `${embedUrl}?${params.toString()}` : embedUrl
    
    if (embedOptions.autoResize) {
      return `<!-- Responsive Booking Widget -->
<div style="position: relative; width: ${embedOptions.width}; padding-bottom: 75%; height: 0; overflow: hidden;">
  <iframe 
    src="${fullUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; ${embedOptions.shadow ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);' : ''} border-radius: ${embedOptions.borderRadius}px;"
    frameborder="0"
    allowfullscreen>
  </iframe>
</div>`
    } else {
      return `<!-- Booking Widget -->
<iframe 
  src="${fullUrl}"
  width="${embedOptions.width}"
  height="${embedOptions.height}"
  style="border: 0; ${embedOptions.shadow ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);' : ''} border-radius: ${embedOptions.borderRadius}px;"
  frameborder="0">
</iframe>`
    }
  }

  const generateJavaScriptCode = () => {
    const config = {
      barberId: bookingLink?.barberId || 'your-id',
      services: embedOptions.preSelectedServices,
      theme: embedOptions.theme,
      primaryColor: embedOptions.primaryColor,
      width: embedOptions.width,
      height: embedOptions.height,
      hideHeader: embedOptions.hideHeader,
      hideFooter: embedOptions.hideFooter,
      autoResize: embedOptions.autoResize
    }
    
    return `<!-- Booking Widget Script -->
<div id="booking-widget-container"></div>
<script>
  (function() {
    var config = ${JSON.stringify(config, null, 2)};
    var script = document.createElement('script');
    script.src = '${baseUrl}/booking-widget.js';
    script.setAttribute('data-config', JSON.stringify(config));
    script.async = true;
    document.getElementById('booking-widget-container').appendChild(script);
  })();
</script>`
  }

  const generateButtonCode = () => {
    const buttonStyle = `
      background-color: ${embedOptions.primaryColor};
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: ${embedOptions.borderRadius}px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    `.replace(/\s+/g, ' ').trim()
    
    const params = new URLSearchParams()
    if (embedOptions.preSelectedServices.length > 0) {
      params.append('services', embedOptions.preSelectedServices.join(','))
    }
    const urlParams = params.toString() ? `?${params.toString()}` : ''
    
    return `<!-- Booking Button -->
<button 
  onclick="window.open('${baseUrl}/book/${bookingLink?.barberId || 'your-id'}${urlParams}', 'booking', 'width=600,height=800,scrollbars=yes,resizable=yes')"
  style="${buttonStyle}"
  onmouseover="this.style.opacity='0.9'"
  onmouseout="this.style.opacity='1'">
  Book Appointment
</button>`
  }

  const generateLinkCode = () => {
    const params = new URLSearchParams()
    if (embedOptions.preSelectedServices.length > 0) {
      params.append('services', embedOptions.preSelectedServices.join(','))
    }
    const urlParams = params.toString() ? `?${params.toString()}` : ''
    
    return `<!-- Direct Booking Link -->
<a href="${baseUrl}/book/${bookingLink?.barberId || 'your-id'}${urlParams}" 
   target="_blank"
   style="color: ${embedOptions.primaryColor}; text-decoration: none; font-weight: 600;">
  Book an Appointment →
</a>`
  }

  const copyToClipboard = async (code, type) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedType(type)
      
      const typeNames = {
        iframe: 'iFrame embed code',
        javascript: 'JavaScript widget code',
        button: 'Button embed code',
        link: 'Link embed code'
      }
      setToastMessage(`${typeNames[type]} copied to clipboard!`)
      setShowToast(true)
      
      setTimeout(() => {
        setCopiedType(null)
        setShowToast(false)
      }, 3000)
    } catch (error) {
      console.error('Failed to copy:', error)
      setToastMessage('Failed to copy code. Please try again.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const selectCodeText = (event) => {
    if (window.getSelection) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(event.target)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  const notifyParentOfHeight = () => {
  }

  const getEmbedCode = () => {
    switch (activeTab) {
      case 'iframe':
        return generateIframeCode()
      case 'javascript':
        return generateJavaScriptCode()
      case 'button':
        return generateButtonCode()
      case 'link':
        return generateLinkCode()
      default:
        return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Embed Booking Widget</h2>
            <p className="text-sm text-gray-600">{bookingLink?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-3 hover:bg-gray-100 rounded-lg transition-all flex items-center justify-center"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('iframe')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-all min-h-[44px] ${
                activeTab === 'iframe'
                  ? 'text-olive-600 border-olive-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <CodeBracketIcon className="inline h-4 w-4 mr-2" />
              iFrame
            </button>
            <button
              onClick={() => setActiveTab('javascript')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-all min-h-[44px] ${
                activeTab === 'javascript'
                  ? 'text-olive-600 border-olive-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <CodeBracketIcon className="inline h-4 w-4 mr-2" />
              JavaScript
            </button>
            <button
              onClick={() => setActiveTab('button')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-all min-h-[44px] ${
                activeTab === 'button'
                  ? 'text-olive-600 border-olive-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <CursorArrowRaysIcon className="inline h-4 w-4 mr-2" />
              Button
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-all min-h-[44px] ${
                activeTab === 'link'
                  ? 'text-olive-600 border-olive-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <CodeBracketIcon className="inline h-4 w-4 mr-2" />
              Link
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-200px)]">
          {/* Left Panel - Options */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <AdjustmentsHorizontalIcon className="inline h-5 w-5 mr-2" />
              Customization
            </h3>

            {/* Dimensions */}
            {(activeTab === 'iframe' || activeTab === 'javascript') && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width
                  </label>
                  <input
                    type="text"
                    value={embedOptions.width}
                    onChange={(e) => setEmbedOptions(prev => ({ ...prev, width: e.target.value }))}
                    placeholder="100% or 600px"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                  />
                </div>
                
                {!embedOptions.autoResize && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={embedOptions.height}
                      onChange={(e) => setEmbedOptions(prev => ({ ...prev, height: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                    />
                  </div>
                )}

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={embedOptions.autoResize}
                    onChange={(e) => setEmbedOptions(prev => ({ ...prev, autoResize: e.target.checked }))}
                    className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-resize height</span>
                </label>
              </div>
            )}

            {/* Appearance */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={embedOptions.theme}
                  onChange={(e) => setEmbedOptions(prev => ({ ...prev, theme: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (match website)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={embedOptions.primaryColor}
                    onChange={(e) => setEmbedOptions(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={embedOptions.primaryColor}
                    onChange={(e) => setEmbedOptions(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                  />
                </div>
              </div>

              {(activeTab === 'iframe' || activeTab === 'javascript') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Border Radius (px)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={embedOptions.borderRadius}
                      onChange={(e) => setEmbedOptions(prev => ({ ...prev, borderRadius: e.target.value }))}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-600">{embedOptions.borderRadius}px</span>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={embedOptions.shadow}
                      onChange={(e) => setEmbedOptions(prev => ({ ...prev, shadow: e.target.checked }))}
                      className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show shadow</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={embedOptions.hideHeader}
                      onChange={(e) => setEmbedOptions(prev => ({ ...prev, hideHeader: e.target.checked }))}
                      className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Hide header</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={embedOptions.hideFooter}
                      onChange={(e) => setEmbedOptions(prev => ({ ...prev, hideFooter: e.target.checked }))}
                      className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Hide footer</span>
                  </label>
                </>
              )}
            </div>

            {/* Pre-selected Services */}
            {bookingLink?.services?.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pre-select Services
                </label>
                <div className="space-y-2">
                  {bookingLink.services.map(service => (
                    <label key={service.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={embedOptions.preSelectedServices.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEmbedOptions(prev => ({
                              ...prev,
                              preSelectedServices: [...prev.preSelectedServices, service.id]
                            }))
                          } else {
                            setEmbedOptions(prev => ({
                              ...prev,
                              preSelectedServices: prev.preSelectedServices.filter(id => id !== service.id)
                            }))
                          }
                        }}
                        className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Code & Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Preview Device Selector */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <EyeIcon className="inline h-5 w-5 mr-2" />
                Preview & Code
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded-lg transition-all ${
                    previewDevice === 'desktop' 
                      ? 'bg-olive-100 text-olive-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Desktop preview"
                >
                  <ComputerDesktopIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded-lg transition-all ${
                    previewDevice === 'mobile' 
                      ? 'bg-olive-100 text-olive-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Mobile preview"
                >
                  <DevicePhoneMobileIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className={`bg-gray-100 rounded-lg p-4 mb-6 ${
              previewDevice === 'mobile' ? 'max-w-sm mx-auto' : ''
            }`}>
              <div className="bg-white rounded-lg overflow-hidden" style={{
                boxShadow: embedOptions.shadow ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
                borderRadius: `${embedOptions.borderRadius}px`
              }}>
                {activeTab === 'button' ? (
                  <div className="p-8 text-center">
                    <button 
                      style={{
                        backgroundColor: embedOptions.primaryColor,
                        borderRadius: `${embedOptions.borderRadius}px`,
                        padding: '12px 24px',
                        color: 'white',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Book Appointment
                    </button>
                  </div>
                ) : activeTab === 'link' ? (
                  <div className="p-8 text-center">
                    <a 
                      href="#" 
                      style={{ 
                        color: embedOptions.primaryColor,
                        textDecoration: 'none',
                        fontWeight: '600'
                      }}
                    >
                      Book an Appointment →
                    </a>
                  </div>
                ) : (
                  <div className="relative bg-gray-50 rounded-lg p-4" style={{ 
                    height: previewDevice === 'mobile' ? '400px' : '500px',
                    borderRadius: `${embedOptions.borderRadius}px`,
                    boxShadow: embedOptions.shadow ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                  }}>
                    {/* Header (if enabled) */}
                    {!embedOptions.hideHeader && (
                      <div className="mb-4 pb-3 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Book Appointment</h2>
                        <p className="text-sm text-gray-600">Step 1 of 3</p>
                      </div>
                    )}
                    
                    {/* Mock booking form content */}
                    <div className="space-y-3 flex-1">
                      <h3 className="font-medium text-gray-900 mb-3">Select Services</h3>
                      
                      {/* Service options */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:border-gray-300">
                          <div>
                            <div className="font-medium text-gray-900">Classic Cut</div>
                            <div className="text-sm text-gray-600">Haircuts • 30 min</div>
                          </div>
                          <div className="font-semibold" style={{ color: embedOptions.primaryColor }}>$35</div>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:border-gray-300">
                          <div>
                            <div className="font-medium text-gray-900">Fade Cut</div>
                            <div className="text-sm text-gray-600">Haircuts • 45 min</div>
                          </div>
                          <div className="font-semibold" style={{ color: embedOptions.primaryColor }}>$45</div>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:border-gray-300">
                          <div>
                            <div className="font-medium text-gray-900">Beard Trim</div>
                            <div className="text-sm text-gray-600">Beard Services • 20 min</div>
                          </div>
                          <div className="font-semibold" style={{ color: embedOptions.primaryColor }}>$20</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer (if enabled) */}
                    {!embedOptions.hideFooter && (
                      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between">
                        <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
                          ← Back
                        </button>
                        <button 
                          className="px-6 py-2 text-white font-medium rounded-lg"
                          style={{ 
                            backgroundColor: embedOptions.primaryColor,
                            borderRadius: `${Math.min(embedOptions.borderRadius, 8)}px`
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                    
                    {/* Theme indicator */}
                    <div className="absolute top-2 right-2 text-xs text-gray-400">
                      {embedOptions.theme} theme
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Code Display */}
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-300">Embed Code</h4>
                <button
                  onClick={() => copyToClipboard(getEmbedCode(), activeTab)}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-all"
                >
                  {copiedType === activeTab ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs text-gray-300 overflow-x-auto cursor-pointer hover:bg-gray-800 p-2 rounded transition-all" 
                   onClick={selectCodeText}
                   title="Click to select all code">
                <code>{getEmbedCode()}</code>
              </pre>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-olive-50 rounded-lg p-4">
              <h4 className="font-medium text-olive-900 mb-2">How to use:</h4>
              <ol className="list-decimal list-inside text-sm text-olive-800 space-y-1">
                {activeTab === 'iframe' && (
                  <>
                    <li>Copy the embed code above</li>
                    <li>Paste it into your website's HTML where you want the booking widget to appear</li>
                    <li>Adjust width and height as needed for your layout</li>
                  </>
                )}
                {activeTab === 'javascript' && (
                  <>
                    <li>Copy the JavaScript code above</li>
                    <li>Paste it into your website where you want the widget</li>
                    <li>The widget will load automatically and resize to fit</li>
                  </>
                )}
                {activeTab === 'button' && (
                  <>
                    <li>Copy the button code above</li>
                    <li>Paste it anywhere on your website</li>
                    <li>Clicking the button will open the booking form in a popup</li>
                  </>
                )}
                {activeTab === 'link' && (
                  <>
                    <li>Copy the link code above</li>
                    <li>Paste it into your website content</li>
                    <li>Customers will be taken to the booking page when clicked</li>
                  </>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-moss-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce z-60">
          <CheckCircleIcon className="h-5 w-5" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
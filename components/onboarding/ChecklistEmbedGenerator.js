'use client'

import { useState } from 'react'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function ChecklistEmbedGenerator({
  baseUrl = 'https://your-domain.com',
  className = ''
}) {
  const [embedOptions, setEmbedOptions] = useState({
    theme: 'light',
    compact: false,
    hideHeader: false,
    autoResize: true,
    width: 400,
    height: 600
  })
  
  const [copied, setCopied] = useState(false)

  // Generate embed URL
  const embedUrl = new URL(`${baseUrl}/onboarding-checklist/embed`)
  if (embedOptions.theme !== 'light') embedUrl.searchParams.set('theme', embedOptions.theme)
  if (embedOptions.compact) embedUrl.searchParams.set('compact', 'true')
  if (embedOptions.hideHeader) embedUrl.searchParams.set('hideHeader', 'true')
  if (!embedOptions.autoResize) embedUrl.searchParams.set('autoResize', 'false')

  // Generate iframe code
  const iframeCode = `<iframe 
  src="${embedUrl.toString()}"
  width="${embedOptions.width}"
  height="${embedOptions.autoResize ? 'auto' : embedOptions.height}"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
  scrolling="no"
  ${embedOptions.autoResize ? 'onload="this.style.height = this.contentWindow.document.body.scrollHeight + \'px\'"' : ''}
></iframe>`

  // Generate JavaScript code for auto-resize
  const jsCode = embedOptions.autoResize ? `
<script>
// Auto-resize iframe based on content
window.addEventListener('message', function(event) {
  if (event.data.type === 'onboarding-checklist-resize') {
    const iframe = document.querySelector('iframe[src*="onboarding-checklist/embed"]');
    if (iframe) {
      iframe.style.height = event.data.height + 'px';
    }
  }
});
</script>` : ''

  const fullEmbedCode = iframeCode + jsCode

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullEmbedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Embed Onboarding Checklist
        </h3>
        <p className="text-sm text-gray-600">
          Generate embed code to add the onboarding checklist to your website or dashboard.
        </p>
      </div>

      {/* Configuration Options */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              value={embedOptions.theme}
              onChange={(e) => setEmbedOptions(prev => ({ ...prev, theme: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Width (px)
            </label>
            <input
              type="number"
              value={embedOptions.width}
              onChange={(e) => setEmbedOptions(prev => ({ ...prev, width: parseInt(e.target.value) || 400 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="300"
              max="800"
            />
          </div>

          {/* Height (only if auto-resize is disabled) */}
          {!embedOptions.autoResize && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height (px)
              </label>
              <input
                type="number"
                value={embedOptions.height}
                onChange={(e) => setEmbedOptions(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="400"
                max="1200"
              />
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={embedOptions.compact}
              onChange={(e) => setEmbedOptions(prev => ({ ...prev, compact: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Compact mode</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={embedOptions.hideHeader}
              onChange={(e) => setEmbedOptions(prev => ({ ...prev, hideHeader: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Hide header</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={embedOptions.autoResize}
              onChange={(e) => setEmbedOptions(prev => ({ ...prev, autoResize: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-resize</span>
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preview
        </label>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div 
            className="mx-auto bg-white rounded-lg shadow-sm overflow-hidden"
            style={{ 
              width: `${Math.min(embedOptions.width, 350)}px`,
              height: embedOptions.autoResize ? 'auto' : `${Math.min(embedOptions.height, 300)}px`
            }}
          >
            <iframe
              src={embedUrl.toString()}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 'none', minHeight: '250px' }}
              scrolling="no"
            />
          </div>
        </div>
      </div>

      {/* Generated Code */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Embed Code
          </label>
          <button
            onClick={copyToClipboard}
            className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                Copy Code
              </>
            )}
          </button>
        </div>
        <textarea
          value={fullEmbedCode}
          readOnly
          className="w-full h-40 px-3 py-2 text-sm font-mono bg-gray-50 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={(e) => e.target.select()}
        />
      </div>

      {/* Usage Instructions */}
      <div className="text-sm text-gray-600">
        <h4 className="font-medium text-gray-700 mb-2">Usage Instructions:</h4>
        <ul className="space-y-1">
          <li>• Copy the embed code above and paste it into your HTML</li>
          <li>• The checklist will automatically track user progress</li>
          <li>• Users must be logged in for progress to be saved</li>
          <li>• The widget will adapt to your chosen theme and size settings</li>
          {embedOptions.autoResize && (
            <li>• Auto-resize requires JavaScript to be enabled</li>
          )}
        </ul>
      </div>
    </div>
  )
}
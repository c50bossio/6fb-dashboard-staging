'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, LinkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { Fragment, useState } from 'react'
import { useAuth } from '../SupabaseAuthProvider'

export default function Cin7ConnectionModal({ isOpen, onClose, onConnect }) {
  const [accountId, setAccountId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const handleConnect = async (e) => {
    e.preventDefault()
    setError('')
    setIsConnecting(true)

    try {
      const token = await user?.access_token
      
      const response = await fetch('/api/cin7/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accountId, apiKey })
      })

      const data = await response.json()

      if (data.success) {
        onConnect(data)
        setAccountId('')
        setApiKey('')
        onClose()
      } else {
        setError(data.error || 'Failed to connect to Cin7')
      }
    } catch (err) {
      console.error('Connection error:', err)
      setError('Failed to connect. Please check your credentials.')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                    <LinkIcon className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Connect to Cin7
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Connect your Cin7 account to sync inventory with your warehouse system.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleConnect} className="mt-5 space-y-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="account-id" className="block text-sm font-medium text-gray-700">
                      Account ID
                    </label>
                    <input
                      type="text"
                      id="account-id"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                      placeholder="Your Cin7 Account ID"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
                      API Application Key
                    </label>
                    <input
                      type="password"
                      id="api-key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                      placeholder="Your API Key"
                      required
                    />
                  </div>

                  <div className="rounded-md bg-blue-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Where to find these?</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Log into Cin7 at inventory.dearsystems.com</li>
                            <li>Go to Settings → Integrations & API → API v1</li>
                            <li>Copy your Account ID and create an API Application Key</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isConnecting}
                      className="inline-flex w-full justify-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
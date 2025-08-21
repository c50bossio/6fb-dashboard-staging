import Link from 'next/link'
import { ArrowPathIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'

export default function SystemSettingsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System & Maintenance</h1>
        <p className="mt-2 text-sm text-gray-600">
          Administrative tools for system management
        </p>
      </div>

      <div className="grid gap-4">
        <Link href="/shop/settings/system/cache">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-500 transition-colors cursor-pointer">
            <div className="flex items-start">
              <ArrowPathIcon className="h-6 w-6 text-gray-400 mr-3 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900">Cache Management</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Fix issues with updates not appearing after deployment
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
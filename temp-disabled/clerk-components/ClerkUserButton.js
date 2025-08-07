'use client'

import { UserButton, useUser, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'

export default function ClerkUserButton() {
  const { user } = useUser()

  return (
    <div className="flex items-center gap-4">
      <SignedIn>
        {/* Show user info when signed in */}
        <span className="text-sm text-gray-700">
          {user?.firstName || user?.emailAddresses[0]?.emailAddress}
        </span>
        <UserButton 
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'w-10 h-10',
            },
          }}
        />
      </SignedIn>
      
      <SignedOut>
        {/* Show sign in button when signed out */}
        <SignInButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  )
}
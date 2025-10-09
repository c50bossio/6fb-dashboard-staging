'use client'

import { UserCircleIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline'

/**
 * Staff Profile Card
 * Displays staff member's profile information
 * Can be used in compact mode (header) or full mode (standalone)
 */
export default function StaffProfileCard({ staff, barbershop, compact = false }) {
  const fullName = `${staff.first_name} ${staff.last_name}`

  if (compact) {
    return (
      <div className="flex items-center space-x-4">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          {staff.image ? (
            <img
              src={staff.image}
              alt={fullName}
              className="h-16 w-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <UserCircleIcon className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Name & Location */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
          {barbershop && (
            <p className="text-sm text-muted-foreground flex items-center mt-1">
              <MapPinIcon className="h-4 w-4 mr-1" />
              {barbershop.name}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Full profile card
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-8">
      <div className="flex items-start space-x-6">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          {staff.image ? (
            <img
              src={staff.image}
              alt={fullName}
              className="h-32 w-32 rounded-full object-cover border-4 border-border"
            />
          ) : (
            <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
              <UserCircleIcon className="h-20 w-20 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">{fullName}</h1>

          {/* Specialties */}
          {staff.specialties && staff.specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {staff.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-olive-100 dark:bg-olive-900/30 text-olive-800 dark:text-olive-200 font-medium"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {staff.bio && (
            <p className="text-muted-foreground mb-4 leading-relaxed">{staff.bio}</p>
          )}

          {/* Contact & Location */}
          <div className="space-y-2 text-sm">
            {barbershop && (
              <div className="flex items-center text-muted-foreground">
                <MapPinIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{barbershop.name}</span>
                {barbershop.address && (
                  <span className="ml-1">- {barbershop.address}</span>
                )}
              </div>
            )}

            {(staff.phone || barbershop?.phone) && (
              <div className="flex items-center text-muted-foreground">
                <PhoneIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <a
                  href={`tel:${staff.phone || barbershop.phone}`}
                  className="hover:text-olive-600 dark:hover:text-olive-400"
                >
                  {staff.phone || barbershop.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

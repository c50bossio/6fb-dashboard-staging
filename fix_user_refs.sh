#!/bin/bash

# Files with user: _user pattern
files=(
  "app/(protected)/shop/settings/general/page.js"
  "app/(protected)/shop/settings/location/page.js"
  "app/(protected)/shop/settings/tax/page.js"
  "app/(protected)/shop/settings/integrations/page.js"
  "app/(protected)/shop/settings/hours/page.js"
  "app/(protected)/shop/settings/notifications/page.js"
  "app/(protected)/shop/barbers/add/page.js"
  "app/(protected)/shop/website/page.js"
  "app/(protected)/barber/clients/page.js"
  "app/(protected)/barber/schedule/page.js"
  "app/(protected)/barber/[barbershopId]/settings/page.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Replace user with _user except in destructuring statement
    sed -i '' -E '
      /const.*user: _user.*useAuth/!{
        s/\buser\.id\b/_user.id/g
        s/\buser\.email\b/_user.email/g
        s/\buser\?\./\_user?./g
        s/if \(!user\)/if (!_user)/g
        s/}, \[user\]/}, [_user]/g
      }
    ' "$file"
  fi
done

echo "Done fixing user references"

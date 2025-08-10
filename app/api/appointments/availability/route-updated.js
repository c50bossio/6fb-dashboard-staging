/**
 * Main availability endpoint - automatically switches between dev and production modes
 */

import { GET as flexibleGET, POST as flexiblePOST } from './route-flexible'

// Export the flexible handlers that work in both environments
export const GET = flexibleGET
export const POST = flexiblePOST
/**
 * Main availability endpoint - automatically switches between dev and production modes
 */

import { GET as flexibleGET, POST as flexiblePOST } from './route-flexible'
export const runtime = 'nodejs'

export const GET = flexibleGET
export const POST = flexiblePOST
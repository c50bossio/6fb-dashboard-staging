/**
 * Custom App component for performance monitoring
 */

import { reportWebVitals as reportToAnalytics } from '@/lib/performance-monitor'

export function reportWebVitals(metric) {
  reportToAnalytics(metric)
}

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}
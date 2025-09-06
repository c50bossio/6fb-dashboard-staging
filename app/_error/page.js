export default function Error({ statusCode, hasGetInitialPropsRun, err }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {statusCode ? `An error ${statusCode} occurred on server` : 'An error occurred on client'}
        </h1>
        <p className="text-gray-600 mb-4">
          We apologize for the inconvenience. Please try refreshing the page.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}
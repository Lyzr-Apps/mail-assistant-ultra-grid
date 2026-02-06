'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Something went wrong!</h2>
        <p className="text-sm text-slate-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

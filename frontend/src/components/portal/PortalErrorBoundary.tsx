import React from 'react'

interface PortalErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class PortalErrorBoundary extends React.Component<React.PropsWithChildren, PortalErrorBoundaryState> {
  state: PortalErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): PortalErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Portal page render failed:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section role="alert" className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">This portal page could not load</h1>
          <p className="mt-2 text-sm text-slate-600">
            {this.state.error?.message || 'An unexpected page error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Reload portal
          </button>
        </section>
      )
    }

    return this.props.children
  }
}

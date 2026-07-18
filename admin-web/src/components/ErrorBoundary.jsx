import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/Button'

/** Last resort: keeps a render crash in one page from blanking the whole app. */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    const { error } = this.state

    if (!error) return this.props.children

    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-50">
            <AlertTriangle aria-hidden="true" className="size-6 text-red-500" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Something broke</h1>
          <p className="mt-1 text-sm text-slate-500">
            This page hit an unexpected error and stopped rendering.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-600">
            {error.message}
          </pre>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        </div>
      </div>
    )
  }
}

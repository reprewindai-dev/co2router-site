'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

import { RecoveredCommandCenterShell } from './recovered/RecoveredCommandCenterShell'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class CommandCenterErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Command center shell crashed, falling back to recovered shell.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <RecoveredCommandCenterShell />
    }

    return this.props.children
  }
}

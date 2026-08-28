"use client";

import * as React from "react";

interface Props {
  children: React.ReactNode;
  /** UI pengganti saat subtree gagal render. `reset` mencoba render ulang. */
  fallback: (args: { error: Error; reset: () => void }) => React.ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Error boundary React. Menangkap error saat render/lifecycle di subtree
 * supaya satu bagian yang gagal tidak menjatuhkan seluruh aplikasi.
 *
 * Batasnya penting: boundary TIDAK menangkap error asinkron (promise reject,
 * event handler). Untuk itu pemanggilnya tetap perlu try/catch sendiri —
 * lihat `lib/privy/galat-masuk.ts`.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[error-boundary${this.props.label ? ` · ${this.props.label}` : ""}]`,
      error.message,
      info.componentStack,
    );
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) return this.props.fallback({ error, reset: this.reset });
    return this.props.children;
  }
}

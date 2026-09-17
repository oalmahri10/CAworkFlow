"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

/**
 * Catches WebGL initialization/render errors from the Canvas subtree and
 * swaps in a functional 2D alternative, per the requirement that "WebGL
 * failure/context loss" must degrade to "a functional 2D board/table"
 * rather than a blank or broken panel.
 */
export class WebglErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D scene failed, falling back to 2D:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

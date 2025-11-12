import React, { Component, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="p-12 max-w-2xl">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
              <p className="text-muted-foreground mb-6">
                Ocorreu um erro inesperado. Por favor, tente novamente.
              </p>
              {this.state.error && (
                <details className="mb-6 text-left w-full">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Detalhes técnicos
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-40">
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <Button onClick={this.handleReset}>
                  Tentar Novamente
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                >
                  Voltar para Início
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

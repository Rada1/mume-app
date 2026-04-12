import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in boundary "${this.props.name || 'Unknown'}":`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="modal-overlay" style={{ zIndex: 999999 }}>
                    <div className="modal" style={{ textAlign: 'center', padding: '30px' }}>
                        <div style={{ color: '#ef4444', marginBottom: '20px' }}>
                            <AlertTriangle size={64} style={{ margin: '0 auto' }} />
                        </div>
                        <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Something went wrong</h2>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '20px' }}>
                            An error occurred in the <strong>{this.props.name || 'interface'}</strong>. 
                            We've logged the details and you can try resetting this section or reloading the app.
                        </p>
                        
                        {this.state.error && (
                            <div style={{ 
                                background: 'rgba(0,0,0,0.3)', 
                                padding: '10px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontFamily: 'monospace',
                                color: '#fca5a5',
                                marginBottom: '20px',
                                textAlign: 'left',
                                overflow: 'auto',
                                maxHeight: '100px'
                            }}>
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                            <button className="btn-primary" onClick={this.handleReset}>
                                <RefreshCcw size={16} /> Try Resetting Section
                            </button>
                            <button className="btn-secondary" onClick={this.handleReload}>
                                <Home size={16} /> Reload Application
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

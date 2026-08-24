import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CipherLog Uncaught Component Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-cyber-950 text-slate-200 font-mono p-6">
          <div className="p-6 max-w-lg w-full bg-cyber-900 border border-rose-500/40 rounded-2xl shadow-glow-rose text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-slate-100">Application Error Detected</h2>
              <p className="text-xs text-slate-400 mt-1">
                A visual render issue occurred. Click reload to refresh the dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-cyber-950 border border-cyber-border text-left text-xs text-rose-300 font-mono overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 mx-auto transition-colors cursor-pointer shadow-glow-cyan"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

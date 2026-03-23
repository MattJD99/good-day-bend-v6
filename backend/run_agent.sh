#!/bin/bash
# run_agent.sh - Securely run Python agents with MacOS compatibility fixes

# 1. Environment fixes for Google Cloud SDK on Apple Silicon
export PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
export GRPC_ENABLE_FORK_SUPPORT=0

# 2. Pathing
export PYTHONPATH=$(pwd)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 3. Load Project .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "📄 Loading project environment..."
    # Export variables from .env (basic export format)
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# 4. Run the requested agent
echo "🚀 Running agent: $@"
"$SCRIPT_DIR/venv/bin/python3" "$@"

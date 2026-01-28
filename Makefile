.PHONY: start stop ollama llm orchestrator ascii-install install clean

# Start everything
start: ollama llm orchestrator

# Stop all services
stop:
	@echo "Stopping services..."
	@pkill -f "ollama serve" 2>/dev/null || true
	@pkill -f "node.*llm-service" 2>/dev/null || true
	@pkill -f "Electron.*orchestrator" 2>/dev/null || true
	@echo "All services stopped."

# Start Ollama and ensure model is ready
ollama:
	@echo "Starting Ollama..."
	@pgrep -x ollama > /dev/null || (ollama serve &)
	@sleep 2
	@echo "Pulling model if needed..."
	@ollama pull llama3.2:3b
	@echo "Ollama ready."

# Start LLM service
llm:
	@echo "Starting LLM service..."
	@cd llm-service && npm install --silent && npm start &
	@sleep 2
	@echo "LLM service ready at http://localhost:3001"

# Start Orchestrator
orchestrator:
	@echo "Starting Orchestrator..."
	@cd orchestrator && npm install --silent && npm start &
	@echo "Orchestrator launched."

# Setup ASCII CLI Python environment
ascii-install:
	@echo "Setting up ASCII CLI..."
	@cd ascii-service && python3 -m venv venv
	@cd ascii-service && ./venv/bin/pip install -r requirements.txt
	@echo "ASCII CLI installed."

# Install all dependencies
install: ascii-install
	@echo "Installing dependencies..."
	@cd llm-service && npm install
	@cd orchestrator && npm install
	@echo "Dependencies installed."

# Clean up
clean: stop
	@echo "Cleaning up..."
	@rm -rf llm-service/node_modules orchestrator/node_modules ascii-service/venv
	@echo "Clean complete."

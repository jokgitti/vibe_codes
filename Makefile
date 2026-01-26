.PHONY: start stop ollama llm orchestrator ascii ascii-install install clean

# Start everything
start: ollama llm ascii orchestrator

# Stop all services
stop:
	@echo "Stopping services..."
	@pkill -f "ollama serve" 2>/dev/null || true
	@pkill -f "node.*llm-service" 2>/dev/null || true
	@pkill -f "uvicorn main:app" 2>/dev/null || true
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

# Start ASCII art service
ascii:
	@echo "Starting ASCII service..."
	@if [ ! -d "ascii-service/venv" ]; then \
		echo "Virtual environment not found. Run 'make ascii-install' first."; \
		exit 1; \
	fi
	@cd ascii-service && ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 3002 &
	@sleep 2
	@echo "ASCII service ready at http://localhost:3002"

# Setup ASCII service Python environment
ascii-install:
	@echo "Setting up ASCII service..."
	@cd ascii-service && python3 -m venv venv
	@cd ascii-service && ./venv/bin/pip install -r requirements.txt
	@echo "ASCII service installed."

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

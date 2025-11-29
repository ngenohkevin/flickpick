# ==========================================================================
# FlickPick Makefile
# Common development and deployment commands
# ==========================================================================

.PHONY: help dev build start lint format typecheck test docker-build docker-up docker-down docker-dev clean

# Default target
help:
	@echo "FlickPick Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development server"
	@echo "  make build        - Build for production"
	@echo "  make start        - Start production server"
	@echo "  make lint         - Run ESLint"
	@echo "  make format       - Format code with Prettier"
	@echo "  make typecheck    - Run TypeScript type checking"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-up    - Start production containers"
	@echo "  make docker-down  - Stop containers"
	@echo "  make docker-dev   - Start development containers"
	@echo "  make docker-logs  - View container logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make redis-cli    - Connect to Redis CLI"

# --------------------------------------------------------------------------
# Development Commands
# --------------------------------------------------------------------------

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

format:
	npm run format

typecheck:
	npm run typecheck

# --------------------------------------------------------------------------
# Docker Commands
# --------------------------------------------------------------------------

docker-build:
	docker build -t flickpick:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-dev:
	docker-compose -f docker-compose.dev.yml up

docker-dev-build:
	docker-compose -f docker-compose.dev.yml up --build

docker-logs:
	docker-compose logs -f

docker-logs-app:
	docker-compose logs -f app

# Start with Redis Commander for debugging
docker-dev-debug:
	docker-compose -f docker-compose.dev.yml --profile debug up

# --------------------------------------------------------------------------
# Redis Commands
# --------------------------------------------------------------------------

redis-cli:
	docker-compose exec redis redis-cli

redis-flush:
	docker-compose exec redis redis-cli FLUSHALL

# --------------------------------------------------------------------------
# Utility Commands
# --------------------------------------------------------------------------

clean:
	rm -rf .next
	rm -rf node_modules
	rm -rf out
	rm -rf build

# Install dependencies
install:
	npm install

# Reinstall all dependencies
reinstall: clean install

# Check all (lint, typecheck, build)
check: lint typecheck build
	@echo "All checks passed!"

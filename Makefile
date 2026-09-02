# Advibe Database Management Makefile

.PHONY: help db-up db-down db-reset db-shell db-logs db-status

help:
	@echo "Advibe Database Commands:"
	@echo "  make db-up       Start PostgreSQL container in background"
	@echo "  make db-down     Stop PostgreSQL container"
	@echo "  make db-reset    Wipe volume and re-run migration + seed from scratch"
	@echo "  make db-shell    Open interactive psql session in container"
	@echo "  make db-logs     View PostgreSQL container logs"
	@echo "  make db-status   Check health status of database"

db-up:
	docker compose up -d

db-down:
	docker compose down

db-reset:
	docker compose down -v
	docker compose up -d

db-shell:
	docker exec -it advibe-db psql -U advibe_user -d advibe

db-logs:
	docker compose logs -f db

db-status:
	docker compose ps

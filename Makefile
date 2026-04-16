format-frontend:
	cd frontend && npx prettier --write .

format-backend:
	cd backend && black .

lint-frontend:
	cd frontend && npx eslint .

lint-backend:
	cd backend && ruff check .

format-all:
	make format-frontend && make format-backend
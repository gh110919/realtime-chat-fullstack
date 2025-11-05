bash cmd/prune.sh
docker compose --env-file ".env" -f 'application.docker-compose.yml' up -d --build

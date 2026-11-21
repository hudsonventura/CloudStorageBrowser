#!/bin/bash

COMPOSE_FILES=(-f docker-compose-common.yml)

if [[ -f docker-compose.volumes.yml ]]; then
    COMPOSE_FILES+=(-f docker-compose.volumes.yml)
elif [[ -f docker-compose-volumes.yml ]]; then
    COMPOSE_FILES+=(-f docker-compose-volumes.yml)
fi

docker compose "${COMPOSE_FILES[@]}" down

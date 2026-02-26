#!/bin/bash

# Load .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found"
  echo "Copy .env.example to .env and fill in your credentials:"
  echo "  cp .env.example .env"
  exit 1
fi

# Run the converter
node index.js "$@"

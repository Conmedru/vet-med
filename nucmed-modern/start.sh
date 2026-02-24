#!/bin/sh

# Apply database schema (creates tables if missing)
echo "[Start] Applying database schema..."
npx prisma db push --skip-generate 2>&1
if [ $? -eq 0 ]; then
  echo "[Start] Database schema applied successfully"
else
  echo "[Start] WARNING: prisma db push failed, continuing anyway..."
fi

# Start Next.js server in background
echo "[Start] Starting Next.js server..."
node server.js &
SERVER_PID=$!

# Start Cron worker in background
echo "[Start] Starting Internal Cron worker..."
node cron.js &
CRON_PID=$!

# Function to handle shutdown
cleanup() {
    echo "[Start] Stopping processes..."
    kill $SERVER_PID
    kill $CRON_PID
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT

# Wait for processes to exit
wait $SERVER_PID $CRON_PID

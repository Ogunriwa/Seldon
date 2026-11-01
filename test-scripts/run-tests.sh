#!/bin/bash
export OLLAMA_HOST=http://127.0.0.1:11434

echo "Starting Next.js..."
npx next dev -p 3000 > test-scripts/next.log 2>&1 &
NEXT_PID=$!

echo "Waiting for server to start..."
while ! grep -q "Ready in" test-scripts/next.log; do
  if grep -q "EADDRINUSE" test-scripts/next.log; then
     echo "Port 3000 is still in use."
     kill $NEXT_PID
     exit 1
  fi
  sleep 1
done
echo "Server ready."

echo "--- Testing Scenario A (Project with memories and attachments) ---"
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{
  "conversationId": "conv_test_A",
  "model": "gemma4:e4b",
  "messages": [{"id": "msg_1", "role": "user", "content": "Hello A"}]
}' | head -c 200
echo -e "\n"

echo "--- Testing Scenario B (Chat without project) ---"
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{
  "conversationId": "conv_test_B",
  "model": "gemma4:e4b",
  "messages": [{"id": "msg_2", "role": "user", "content": "Hello B"}]
}' | head -c 200
echo -e "\n"

echo "--- Testing Scenario C (Vision model) ---"
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{
  "conversationId": "conv_test_C",
  "model": "gemma4:e4b",
  "messages": [{"id": "msg_3", "role": "user", "content": "Hello C"}],
  "pendingAttachmentIds": ["att_test_C1"]
}' | head -c 200
echo -e "\n"

kill $NEXT_PID
wait $NEXT_PID 2>/dev/null
echo "Tests completed."

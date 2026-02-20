#!/bin/bash

# Check if duration argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./analyze-traces.sh <min_duration_ms>"
  exit 1
fi

MIN_DURATION_MS=$1
# Convert ms to microseconds for Jaeger API (it uses microseconds for duration)
MIN_DURATION_US=$((MIN_DURATION_MS * 1000))

# Query Jaeger API for traces from api-gateway
# We fetch traces and then use jq to filter by duration.
# Note: Jaeger's search endpoint allows filtering by duration directly:
# /api/traces?service=api-gateway&minDuration=100ms
# But the requirement says "use jq to parse the JSON response and output a list of Trace IDs"

curl -s "http://localhost:16686/api/traces?service=api-gateway&limit=100" | \
jq -r ".data[] | select(.spans[] | select(.parentSpanId == null or .parentSpanId == \"\") | .duration >= $MIN_DURATION_US) | .traceID" | \
sort -u

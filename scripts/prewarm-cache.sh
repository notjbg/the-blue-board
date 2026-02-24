#!/bin/bash
# Prewarm Vercel CDN cache for schedule data
# Run every 4-6 hours via cron to keep schedule endpoints hot
# This ensures real users always hit CDN cache, never cold serverless functions

BASE="https://theblueboard.co/api"
HUBS=("ORD" "DEN" "IAH" "EWR" "SFO" "LAX" "IAD" "NRT" "GUM")
DIRS=("departures" "arrivals")

# Get today's start-of-day timestamp (UTC)
TODAY_TS=$(date -u -j -f "%Y-%m-%d %H:%M:%S" "$(date -u +%Y-%m-%d) 00:00:00" "+%s" 2>/dev/null || date -d "$(date -u +%Y-%m-%d)" "+%s")

echo "$(date) — Prewarming Blue Board CDN cache"
echo "Timestamp: $TODAY_TS"

WARMED=0
FAILED=0

for hub in "${HUBS[@]}"; do
  for dir in "${DIRS[@]}"; do
    URL="${BASE}/schedule?hub=${hub}&dir=${dir}&timestamp=${TODAY_TS}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$URL")
    if [ "$STATUS" = "200" ]; then
      echo "  ✅ ${hub} ${dir} — 200"
      ((WARMED++))
    else
      echo "  ❌ ${hub} ${dir} — ${STATUS}"
      ((FAILED++))
    fi
    sleep 3  # respect rate limits
  done
done

# Also warm IRROPS and METAR
curl -s -o /dev/null -w "  ✅ IRROPS — %{http_code}\n" --max-time 60 "${BASE}/irrops"
curl -s -o /dev/null -w "  ✅ METAR — %{http_code}\n" --max-time 10 "${BASE}/metar?ids=KORD,KDEN,KIAH,KEWR,KSFO,KLAX,KIAD,RJAA,PGUM"
curl -s -o /dev/null -w "  ✅ FAA — %{http_code}\n" --max-time 10 "${BASE}/faa"

echo "Done: ${WARMED} warmed, ${FAILED} failed"

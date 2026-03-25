#!/usr/bin/env bash
# create-n8n-ops-workflows.sh
# ─────────────────────────────────────────────────────────────────────────────
# Creates and activates the 4 daily ops n8n workflows that call the
# HomeField Hub API routes on schedule.
#
# Run this ONCE after n8n is healthy:
#   bash scripts/create-n8n-ops-workflows.sh
#
# Prerequisites:
#   - n8n must be reachable and DB ready
#   - CRON_SECRET env var must be set in Vercel (add to n8n too as an env var
#     OR hardcode it below — see NOTE below)
#
# NOTE: The HTTP Request nodes use `={{ $env.CRON_SECRET }}` to read the
# secret from n8n's environment. Go to n8n Settings > Environment Variables
# and add CRON_SECRET=<your_secret> to match your Vercel env var.
# ─────────────────────────────────────────────────────────────────────────────

N8N_URL="${N8N_URL:-https://n8n-production-1286.up.railway.app}"
API_KEY="${N8N_API_KEY:?ERROR: Set N8N_API_KEY env var before running this script}"
APP_URL="${APP_URL:-https://homefieldhub.com}"

echo "Checking n8n connectivity..."
HEALTH=$(curl -s "$N8N_URL/healthz")
if [ "$HEALTH" != '{"status":"ok"}' ]; then
  echo "ERROR: n8n not healthy. Got: $HEALTH"
  exit 1
fi

# Test API access
API_TEST=$(curl -s "$N8N_URL/api/v1/workflows?limit=1" -H "X-N8N-API-KEY: $API_KEY")
if echo "$API_TEST" | grep -q '"code":503'; then
  echo "ERROR: n8n API returned 503 — DB not ready. Wait and retry."
  echo "Response: $API_TEST"
  exit 1
fi

echo "n8n is ready. Creating workflows..."

# ─── Helper function ──────────────────────────────────────────────────────────

create_workflow() {
  local NAME="$1"
  local CRON_EXPR="$2"
  local ROUTE="$3"

  local PAYLOAD=$(cat <<EOF
{
  "name": "$NAME",
  "nodes": [
    {
      "id": "trigger-node",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 300],
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "$CRON_EXPR"
            }
          ]
        },
        "timezone": "America/New_York"
      }
    },
    {
      "id": "http-node",
      "name": "Call API Route",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [500, 300],
      "parameters": {
        "method": "POST",
        "url": "$APP_URL$ROUTE",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-cron-secret",
              "value": "={{ \$env.CRON_SECRET }}"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Call API Route",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "timezone": "America/New_York"
  }
}
EOF
)

  RESPONSE=$(curl -s -X POST "$N8N_URL/api/v1/workflows" \
    -H "X-N8N-API-KEY: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  WF_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id','ERROR'))" 2>/dev/null)

  if [ "$WF_ID" = "ERROR" ] || [ -z "$WF_ID" ]; then
    echo "  FAILED to create '$NAME'"
    echo "  Response: $RESPONSE"
    return 1
  fi

  echo "  Created '$NAME' with ID: $WF_ID"

  # Activate the workflow
  ACTIVATE=$(curl -s -X POST "$N8N_URL/api/v1/workflows/$WF_ID/activate" \
    -H "X-N8N-API-KEY: $API_KEY")

  if echo "$ACTIVATE" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('active') else 1)" 2>/dev/null; then
    echo "  Activated '$NAME' (ID: $WF_ID)"
  else
    echo "  WARNING: Activation may have failed for '$NAME'"
    echo "  Activate response: $ACTIVATE"
  fi

  echo "$WF_ID"
}

# ─── Create the 4 workflows ───────────────────────────────────────────────────

echo ""
echo "1/4 Creating Morning Brief workflow (7:00 AM ET)..."
WF1=$(create_workflow \
  "Daily Ops — Morning Brief (7:00 AM ET)" \
  "0 7 * * *" \
  "/api/ops/morning-brief")

echo ""
echo "2/4 Creating Post Morning Brief workflow (7:15 AM ET)..."
WF2=$(create_workflow \
  "Daily Ops — Post Morning Brief to Slack (7:15 AM ET)" \
  "15 7 * * *" \
  "/api/ops/post-morning-brief")

echo ""
echo "3/4 Creating Evening Wrap workflow (6:00 PM ET)..."
WF3=$(create_workflow \
  "Daily Ops — Evening Wrap (6:00 PM ET)" \
  "0 18 * * *" \
  "/api/ops/evening-wrap")

echo ""
echo "4/4 Creating Nightly Call Analysis workflow (11:00 PM ET)..."
WF4=$(create_workflow \
  "Daily Ops — Nightly Call Analysis (11:00 PM ET)" \
  "0 23 * * *" \
  "/api/ops/nightly-analysis")

echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo "All done! Workflow IDs:"
echo "  Morning Brief:        $WF1"
echo "  Post Morning Brief:   $WF2"
echo "  Evening Wrap:         $WF3"
echo "  Nightly Analysis:     $WF4"
echo ""
echo "IMPORTANT: Make sure CRON_SECRET is set in:"
echo "  1. Vercel env vars (for homefieldhub.com)"
echo "  2. n8n Settings > Environment Variables"
echo "─────────────────────────────────────────────────────────────────────────────"

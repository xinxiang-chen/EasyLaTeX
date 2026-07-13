#!/usr/bin/env bash
# deploy/cloudrun.sh — build + push + deploy the EasyLaTeX render backend to Cloud Run.
#
# Prerequisites:
#   brew install google-cloud-sdk          # or https://cloud.google.com/sdk/docs/install
#   gcloud auth login
#   gcloud auth configure-docker us-central1-docker.pkg.dev
#
# First-time setup (run once):
#   gcloud projects create <YOUR_PROJECT_ID>     # or pick an existing project
#   gcloud config set project <YOUR_PROJECT_ID>
#   gcloud services enable run.googleapis.com artifactregistry.googleapis.com
#   gcloud artifacts repositories create easylatex \
#       --repository-format=docker \
#       --location=us-central1 \
#       --description="EasyLaTeX render backend images"
#
# Usage:
#   bash deploy/cloudrun.sh                        # uses defaults below
#   SERVICE=my-render REGION=us-east1 bash deploy/cloudrun.sh

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
PROJECT="${GCLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-easylatex-render}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/easylatex"
IMAGE="${REGISTRY}/${SERVICE}:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

# Your Vercel frontend URL — sets the CORS Allow-Origin header on the backend.
# Override with: FRONTEND_URL=https://myapp.vercel.app bash deploy/cloudrun.sh
FRONTEND_URL="${FRONTEND_URL:-}"

# ── Preflight ─────────────────────────────────────────────────────────────────
if [[ -z "$PROJECT" ]]; then
  echo "ERROR: no GCP project set. Run: gcloud config set project <YOUR_PROJECT_ID>" >&2
  exit 1
fi

echo "==> Project : $PROJECT"
echo "==> Region  : $REGION"
echo "==> Service : $SERVICE"
echo "==> Image   : $IMAGE"
[[ -n "$FRONTEND_URL" ]] && echo "==> CORS    : $FRONTEND_URL" || echo "==> CORS    : * (set FRONTEND_URL to restrict)"

# ── Build + push ──────────────────────────────────────────────────────────────
# Run from the repo root (one directory up from deploy/).
cd "$(dirname "$0")/.."

echo "==> Building image..."
docker build --platform linux/amd64 -t "$IMAGE" .

echo "==> Pushing to Artifact Registry..."
docker push "$IMAGE"

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────
echo "==> Deploying to Cloud Run..."

ALLOW_ORIGIN_ENV="${FRONTEND_URL:-*}"

gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 4 \
  --timeout 30 \
  --set-env-vars "ALLOW_ORIGIN=${ALLOW_ORIGIN_ENV}" \
  --quiet

# ── Print the service URL ─────────────────────────────────────────────────────
SERVICE_URL=$(gcloud run services describe "$SERVICE" \
  --platform managed --region "$REGION" \
  --format "value(status.url)")

echo ""
echo "✓ Deployed: ${SERVICE_URL}"
echo ""
echo "Next steps:"
echo "  1. Test:  curl -s -X POST ${SERVICE_URL}/api/render \\"
echo "            -H 'Content-Type: application/json' \\"
echo "            -d '{\"latex\":\"\\\\begin{table}[h]\\\\centering\\\\begin{tabular}{ll}\\\\hline A & B\\\\\\\\\\\\hline\\\\end{tabular}\\\\end{table}\"}' \\"
echo "            | head -c 200"
echo ""
echo "  2. Set VITE_RENDER_API on Vercel:"
echo "     vercel env add VITE_RENDER_API production  # paste: ${SERVICE_URL}/api/render"
echo "     vercel redeploy --prod"

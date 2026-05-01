#!/bin/bash
set -e

VERSION="v1.2.9.9"
IMAGE="abdulabdullah1000/ccp-backend:${VERSION}"

echo "Building Docker image: ${IMAGE}"
docker build -t ${IMAGE} .

echo "Pushing Docker image: ${IMAGE}"
docker push ${IMAGE}

echo "✅ Done! Image: ${IMAGE}"
echo ""
echo "Update your Cloud Run service with:"
echo "gcloud run services update ccp-backend-api --image ${IMAGE} --region YOUR_REGION"

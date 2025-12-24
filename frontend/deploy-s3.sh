#!/bin/bash
# Bash script to deploy frontend to S3
# Usage: ./deploy-s3.sh [BUCKET_NAME] [DISTRIBUTION_ID]

BUCKET_NAME=${1:-"assistly-frontend"}
DISTRIBUTION_ID=${2:-""}
API_BASE_URL=${3:-"https://assistly-13m6.onrender.com"}

echo "Building frontend..."
cd frontend

VITE_API_BASE_URL=$API_BASE_URL npm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Uploading to S3..."
aws s3 sync dist s3://$BUCKET_NAME --delete --acl public-read

if [ $? -ne 0 ]; then
    echo "S3 upload failed!"
    exit 1
fi

if [ -n "$DISTRIBUTION_ID" ]; then
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
fi

echo "Deployment complete!"
cd ..


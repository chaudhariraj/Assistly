# PowerShell script to deploy frontend to S3
# Usage: .\deploy-s3.ps1

param(
    [string]$BucketName = "assistly-frontend",
    [string]$DistributionId = "",
    [string]$ApiBaseUrl = "https://assistly-13m6.onrender.com"
)

Write-Host "Building frontend..." -ForegroundColor Green
Set-Location frontend

# Set environment variable and build
$env:VITE_API_BASE_URL = $ApiBaseUrl
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading to S3..." -ForegroundColor Green
aws s3 sync dist s3://$BucketName --delete --acl public-read

if ($LASTEXITCODE -ne 0) {
    Write-Host "S3 upload failed!" -ForegroundColor Red
    exit 1
}

if ($DistributionId -ne "") {
    Write-Host "Invalidating CloudFront cache..." -ForegroundColor Green
    aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
}

Write-Host "Deployment complete!" -ForegroundColor Green
Set-Location ..



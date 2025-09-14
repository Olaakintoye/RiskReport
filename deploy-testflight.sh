#!/bin/bash

# CDInvestmentPro TestFlight Deployment Script
# Run this script after completing the Apple Developer setup

set -e

echo "🚀 Starting CDInvestmentPro TestFlight deployment process..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in to EAS
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "Please log in to EAS:"
    eas login
fi

echo "✅ EAS CLI ready"

# Check if Apple Developer credentials are configured
echo "🍎 Checking Apple Developer credentials..."
echo "If prompted, please enter your Apple Developer credentials"

# Setup iOS credentials for production
eas credentials --platform ios --profile production

echo "📱 Building iOS app for production..."
eas build --platform ios --profile production --wait

echo "📤 Submitting to TestFlight..."
eas submit --platform ios --profile production

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check App Store Connect for the build status"
echo "2. Add testers in TestFlight"
echo "3. Submit for review when ready"
echo ""
echo "App Store Connect: https://appstoreconnect.apple.com"


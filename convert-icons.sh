#!/bin/bash

# App Icon Conversion Script
# This script converts the SVG icon to PNG files for iOS and Android

echo "🚀 Starting app icon conversion..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed. Please install it first:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    echo "   Or use an online converter to convert app-icon.svg to PNG files"
    exit 1
fi

# Create output directories if they don't exist
mkdir -p ios/CDInvestmentPro/Images.xcassets/AppIcon.appiconset
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Convert for iOS (1024x1024)
echo "📱 Converting for iOS..."
convert app-icon.svg -resize 1024x1024 ios/CDInvestmentPro/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png

# Convert for Android
echo "🤖 Converting for Android..."

# MDPI (48x48)
convert app-icon.svg -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert app-icon.svg -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png

# HDPI (72x72)
convert app-icon.svg -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert app-icon.svg -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png

# XHDPI (96x96)
convert app-icon.svg -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert app-icon.svg -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png

# XXHDPI (144x144)
convert app-icon.svg -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert app-icon.svg -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png

# XXXHDPI (192x192)
convert app-icon.svg -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
convert app-icon.svg -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

echo "✅ Icon conversion complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open icon-preview.html in your browser to preview the icon"
echo "2. Build and run your app to see the new icon:"
echo "   - iOS: npx expo run:ios"
echo "   - Android: npx expo run:android"
echo ""
echo "🎯 The new shield with Sigma symbol icon is now ready!" 
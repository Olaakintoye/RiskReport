#!/bin/bash

# Script to generate all required iOS app icon sizes from a 1024x1024 source
SOURCE_ICON="/Users/ola/Downloads/RiskReport.1/assets/app-icon-1024-padded.png"
OUTPUT_DIR="/Users/ola/Downloads/RiskReport.1/ios/CDInvestmentPro/Images.xcassets/AppIcon.appiconset"

# Check if source exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Source icon not found: $SOURCE_ICON"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Generating iOS app icons from: $SOURCE_ICON"
echo "Output directory: $OUTPUT_DIR"

# Generate all required icon sizes
# iPhone icons
sips -z 40 40 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-20x20@2x.png"
sips -z 60 60 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-20x20@3x.png"
sips -z 29 29 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-29x29@1x.png"
sips -z 58 58 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-29x29@2x.png"
sips -z 87 87 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-29x29@3x.png"
sips -z 80 80 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-40x40@2x.png"
sips -z 120 120 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-40x40@3x.png"
sips -z 120 120 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-60x60@2x.png"
sips -z 180 180 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-60x60@3x.png"

# iPad icons
sips -z 20 20 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-20x20@1x.png"
sips -z 40 40 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-20x20@2x.png"
sips -z 29 29 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-29x29@1x.png"
sips -z 58 58 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-29x29@2x.png"
sips -z 40 40 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-40x40@1x.png"
sips -z 80 80 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-40x40@2x.png"
sips -z 76 76 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-76x76@1x.png"
sips -z 152 152 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-76x76@2x.png"
sips -z 167 167 "$SOURCE_ICON" --out "$OUTPUT_DIR/App-Icon-83.5x83.5@2x.png"

# Marketing icon (App Store)
cp "$SOURCE_ICON" "$OUTPUT_DIR/App-Icon-1024x1024@1x.png"

echo "✅ All iOS app icons generated successfully!"
echo "Generated icons:"
ls -la "$OUTPUT_DIR"/*.png

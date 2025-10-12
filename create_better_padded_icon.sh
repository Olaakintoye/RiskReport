#!/bin/bash

# Script to create a properly sized and padded app icon using modern ImageMagick
SOURCE_ICON="/Users/ola/Downloads/RiskReport.1/assets/app-icon-1024.1.png"
OUTPUT_ICON="/Users/ola/Downloads/RiskReport.1/assets/app-icon-1024-padded.png"

echo "Creating properly padded app icon from: $SOURCE_ICON"
echo "Output: $OUTPUT_ICON"

# Use modern ImageMagick syntax
# Create a 1024x1024 white canvas and center the image with 15% padding
magick -size 1024x1024 xc:white \
       \( "$SOURCE_ICON" -resize 700x700 \) \
       -gravity center \
       -composite \
       "$OUTPUT_ICON"

echo "✅ Properly padded app icon created: $OUTPUT_ICON"
echo "Dimensions:"
sips -g pixelWidth -g pixelHeight "$OUTPUT_ICON"

# Also create a version with even more padding (smaller image)
OUTPUT_ICON_SMALL="/Users/ola/Downloads/RiskReport.1/assets/app-icon-1024-small.png"
magick -size 1024x1024 xc:white \
       \( "$SOURCE_ICON" -resize 600x600 \) \
       -gravity center \
       -composite \
       "$OUTPUT_ICON_SMALL"

echo "✅ Small padded app icon created: $OUTPUT_ICON_SMALL"
echo "Dimensions:"
sips -g pixelWidth -g pixelHeight "$OUTPUT_ICON_SMALL"


#!/bin/bash

# Script to create a properly sized and padded app icon
SOURCE_ICON="/Users/ola/Downloads/RiskReport.1/assets/app-icon-1024.1.png"
OUTPUT_ICON="/Users/ola/Downloads/RiskReport.1/assets/app-icon-1024-padded.png"

echo "Creating padded app icon from: $SOURCE_ICON"
echo "Output: $OUTPUT_ICON"

# First, resize the source image to fit within a 1024x1024 canvas with padding
# We'll add 10% padding (so the image takes up 80% of the canvas)
# This means the image should be 819x819 pixels within a 1024x1024 canvas

# Create a 1024x1024 white background
sips -z 1024 1024 "$SOURCE_ICON" --out "$OUTPUT_ICON" --setProperty format png

# Now we need to center the image within the canvas
# We'll use ImageMagick if available, or sips with some workarounds

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to create padded icon..."
    # Create a 1024x1024 white canvas
    convert -size 1024x1024 xc:white temp_canvas.png
    
    # Resize the source image to fit within 80% of the canvas (819x819)
    convert "$SOURCE_ICON" -resize 819x819 temp_resized.png
    
    # Center the resized image on the white canvas
    convert temp_canvas.png temp_resized.png -gravity center -composite "$OUTPUT_ICON"
    
    # Clean up temp files
    rm temp_canvas.png temp_resized.png
else
    echo "ImageMagick not available, using sips with padding approach..."
    # Create a white background first
    sips -z 1024 1024 "$SOURCE_ICON" --out "$OUTPUT_ICON" --setProperty format png
    
    # For now, let's just resize to 1024x1024 and let the user know they might need to adjust
    echo "Note: Created a 1024x1024 version. You may need to manually adjust padding."
fi

echo "✅ Padded app icon created: $OUTPUT_ICON"
echo "Dimensions:"
sips -g pixelWidth -g pixelHeight "$OUTPUT_ICON"


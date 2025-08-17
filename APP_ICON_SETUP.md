# App Icon Setup Guide

## 🎯 Overview
This guide will help you set up the shield with Sigma symbol as your app icon for both iOS and Android platforms.

## 📁 Files Created
- `app-icon.svg` - The source SVG file with the shield and Sigma design
- `icon-preview.html` - Preview the icon in your browser
- `convert-icons.sh` - Shell script for automatic conversion (requires ImageMagick)
- `convert-icons.js` - Node.js script with conversion options
- `generate-app-icons.js` - Lists all required icon sizes

## 🚀 Quick Start

### Option 1: Browser Preview (Easiest)
1. Open `icon-preview.html` in your browser
2. Take screenshots of the icon at different sizes
3. Save as PNG files in the correct directories

### Option 2: Online Converter
1. Go to an online SVG to PNG converter (e.g., https://convertio.co/svg-png/)
2. Upload `app-icon.svg`
3. Download the PNG and resize for each required size

### Option 3: Install ImageMagick (Command Line)
```bash
# Install ImageMagick
brew install imagemagick

# Run the conversion script
./convert-icons.sh
```

### Option 4: Use Inkscape
```bash
# Install Inkscape
brew install --cask inkscape

# Convert SVG to PNG
inkscape app-icon.svg --export-png=output.png -w 1024 -h 1024
```

## 📱 Required Icon Sizes

### iOS
- `ios/CDInvestmentPro/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` (1024x1024px)

### Android
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48px)
- `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png` (48x48px)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72px)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png` (72x72px)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96px)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png` (96x96px)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144px)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png` (144x144px)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192px)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` (192x192px)

## 🎨 Icon Design
The app icon features:
- **White shield** with classic heraldic shape
- **Black Sigma (Σ) cutout** in the center
- **Black background** for contrast
- **3D effects** with subtle shadows and highlights
- **Clean, modern appearance** suitable for financial/risk analysis apps

## 🧪 Testing the Icon

### iOS Simulator
```bash
npx expo run:ios
```

### Android Emulator
```bash
npx expo run:android
```

## 🔧 Troubleshooting

### Icon Not Showing
1. Make sure PNG files are in the correct directories
2. Clean and rebuild the project:
   ```bash
   npx expo start --clear
   ```

### Wrong Icon Size
- Ensure PNG files match the exact dimensions required
- Use the preview HTML to verify sizes before placing files

### Build Errors
- Check that all required icon files exist
- Verify file permissions are correct
- Try cleaning the build cache

## 📋 Checklist
- [ ] Convert SVG to PNG files
- [ ] Place iOS icon in correct directory
- [ ] Place Android icons in correct directories
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Verify icon appears correctly on device home screen

## 🎯 Next Steps
Once the icon is set up:
1. Test the app on both platforms
2. Verify the icon appears correctly
3. Consider creating adaptive icons for Android (if needed)
4. Update app store listings with the new icon

---

**Note:** The shield with Sigma symbol represents protection and mathematical analysis, perfect for a risk management and investment app! 
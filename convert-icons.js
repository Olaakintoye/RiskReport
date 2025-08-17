const fs = require('fs');
const path = require('path');

console.log('🎨 App Icon Conversion Tool');
console.log('');

// Check if the SVG file exists
if (!fs.existsSync('app-icon.svg')) {
    console.log('❌ app-icon.svg not found!');
    console.log('Please make sure the SVG file exists in the current directory.');
    process.exit(1);
}

console.log('📋 Icon files that need to be created:');
console.log('');

console.log('📱 iOS:');
console.log('  - ios/CDInvestmentPro/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png (1024x1024px)');
console.log('');

console.log('🤖 Android:');
console.log('  - android/app/src/main/res/mipmap-mdpi/ic_launcher.png (48x48px)');
console.log('  - android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png (48x48px)');
console.log('  - android/app/src/main/res/mipmap-hdpi/ic_launcher.png (72x72px)');
console.log('  - android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png (72x72px)');
console.log('  - android/app/src/main/res/mipmap-xhdpi/ic_launcher.png (96x96px)');
console.log('  - android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png (96x96px)');
console.log('  - android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png (144x144px)');
console.log('  - android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png (144x144px)');
console.log('  - android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png (192x192px)');
console.log('  - android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png (192x192px)');
console.log('');

console.log('🛠️  Conversion Options:');
console.log('');
console.log('1. 📱 Online Converter:');
console.log('   - Go to https://convertio.co/svg-png/ or similar');
console.log('   - Upload app-icon.svg');
console.log('   - Download the PNG and resize for each size needed');
console.log('');
console.log('2. 🎨 Design Tools:');
console.log('   - Figma: Import SVG and export as PNG');
console.log('   - Sketch: Import SVG and export as PNG');
console.log('   - Adobe Illustrator: Open SVG and export as PNG');
console.log('');
console.log('3. 🌐 Browser Method:');
console.log('   - Open icon-preview.html in your browser');
console.log('   - Take screenshots of the icon at different sizes');
console.log('   - Save as PNG files');
console.log('');
console.log('4. 🖥️  Install ImageMagick:');
console.log('   - macOS: brew install imagemagick');
console.log('   - Then run: ./convert-icons.sh');
console.log('');
console.log('5. 📦 Use a different tool:');
console.log('   - Install Inkscape: brew install --cask inkscape');
console.log('   - Use command line: inkscape app-icon.svg --export-png=output.png -w 1024 -h 1024');
console.log('');

console.log('✅ Once you have the PNG files, place them in the correct directories and rebuild your app!');
console.log('');
console.log('🚀 To test the new icon:');
console.log('   - iOS: npx expo run:ios');
console.log('   - Android: npx expo run:android'); 
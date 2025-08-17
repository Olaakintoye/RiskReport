const fs = require('fs');
const path = require('path');

// This script will generate the app icon files
// You'll need to create the actual PNG files with the shield and Sigma design

const iconSizes = {
  ios: {
    'App-Icon-1024x1024@1x.png': 1024
  },
  android: {
    'mipmap-mdpi/ic_launcher.png': 48,
    'mipmap-mdpi/ic_launcher_round.png': 48,
    'mipmap-hdpi/ic_launcher.png': 72,
    'mipmap-hdpi/ic_launcher_round.png': 72,
    'mipmap-xhdpi/ic_launcher.png': 96,
    'mipmap-xhdpi/ic_launcher_round.png': 96,
    'mipmap-xxhdpi/ic_launcher.png': 144,
    'mipmap-xxhdpi/ic_launcher_round.png': 144,
    'mipmap-xxxhdpi/ic_launcher.png': 192,
    'mipmap-xxxhdpi/ic_launcher_round.png': 192
  }
};

console.log('App icon generation script created!');
console.log('You need to create the following icon files:');
console.log('\niOS:');
Object.keys(iconSizes.ios).forEach(file => {
  console.log(`- ios/CDInvestmentPro/Images.xcassets/AppIcon.appiconset/${file} (${iconSizes.ios[file]}x${iconSizes.ios[file]}px)`);
});

console.log('\nAndroid:');
Object.keys(iconSizes.android).forEach(file => {
  console.log(`- android/app/src/main/res/${file} (${iconSizes.android[file]}x${iconSizes.android[file]}px)`);
});

console.log('\nDesign specifications:');
console.log('- White shield with classic heraldic shape');
console.log('- Black Sigma (Σ) cutout in the center');
console.log('- Black background');
console.log('- Clean, modern, 3D appearance');
console.log('- Subtle shadows and highlights for depth'); 
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if ImageMagick is available
function checkImageMagick() {
  try {
    execSync('convert -version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.log('ImageMagick not found, installing via Homebrew...');
    try {
      execSync('brew install imagemagick', { stdio: 'inherit' });
      return true;
    } catch (installError) {
      console.error('Failed to install ImageMagick. Please install it manually:');
      console.error('brew install imagemagick');
      return false;
    }
  }
}

// Generate PNG from SVG
function generatePNG(svgPath, outputPath, size) {
  try {
    const command = `convert -background transparent "${svgPath}" -resize ${size}x${size} "${outputPath}"`;
    execSync(command, { stdio: 'pipe' });
    console.log(`✅ Generated: ${outputPath} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to generate ${outputPath}:`, error.message);
    return false;
  }
}

// Main function
function generateIcons() {
  console.log('🚀 Generating Shield Sigma App Icons...\n');

  if (!checkImageMagick()) {
    process.exit(1);
  }

  const svgPath = path.join(__dirname, 'app-icon-shield-sigma.svg');
  
  if (!fs.existsSync(svgPath)) {
    console.error(`❌ SVG file not found: ${svgPath}`);
    process.exit(1);
  }

  // Ensure directories exist
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Generate main app icons
  const icons = [
    { name: 'app-icon-1024.png', size: 1024, path: 'assets/app-icon-1024.png' },
    { name: 'icon.png', size: 1024, path: 'assets/icon.png' },
    { name: 'adaptive-icon.png', size: 1024, path: 'assets/adaptive-icon.png' },
    { name: 'favicon.png', size: 32, path: 'assets/favicon.png' }
  ];

  let successCount = 0;
  
  icons.forEach(icon => {
    const outputPath = path.join(__dirname, icon.path);
    if (generatePNG(svgPath, outputPath, icon.size)) {
      successCount++;
    }
  });

  console.log(`\n🎉 Generated ${successCount}/${icons.length} icons successfully!`);
  
  if (successCount === icons.length) {
    console.log('\n✅ All icons generated! You can now:');
    console.log('1. Run: npx expo prebuild --clean');
    console.log('2. Open Xcode and rebuild the project');
    console.log('3. Your new shield sigma icon will be active!');
  }
}

generateIcons();

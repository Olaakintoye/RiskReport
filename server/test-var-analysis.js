const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create test directories if they don't exist
const testDir = path.join(__dirname, 'test');
fs.mkdirSync(testDir, { recursive: true });

// Sample portfolio data
const sampleData = {
  confidenceLevel: 0.95,
  timeHorizon: 1,
  numSimulations: 1000, // Smaller number for quick test
  varMethod: 'monte-carlo',
  portfolio: {
    id: 'test-portfolio',
    name: 'Test Portfolio',
    assets: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 10,
        price: 150.0,
        assetClass: 'equity'
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        quantity: 15,
        price: 280.0,
        assetClass: 'equity'
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        quantity: 5,
        price: 125.0,
        assetClass: 'equity'
      }
    ]
  },
  chartOutputPath: path.join(testDir, 'test_chart.png')
};

// Write sample data to input file
const inputFilePath = path.join(testDir, 'test_input.json');
fs.writeFileSync(inputFilePath, JSON.stringify(sampleData, null, 2));
console.log(`Wrote test input to ${inputFilePath}`);

// Set up output file path
const outputFilePath = path.join(testDir, 'test_output.json');

// Set Python script path
const pythonScriptPath = path.join(__dirname, '../VAR Model/portfolio_var.py');

// Check if Python script exists
if (!fs.existsSync(pythonScriptPath)) {
  console.error(`ERROR: Python script not found at ${pythonScriptPath}`);
  process.exit(1);
}

// Determine Python command
const pythonCommand = process.platform === 'win32' ? 'python' : 
                      fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';

console.log(`Using Python command: ${pythonCommand}`);
console.log(`Python script path: ${pythonScriptPath}`);
console.log(`Input file: ${inputFilePath}`);
console.log(`Output file: ${outputFilePath}`);

// Spawn Python process
console.log(`Running Python process: ${pythonCommand} ${pythonScriptPath} --input ${inputFilePath} --output ${outputFilePath}`);

const pythonProcess = spawn(pythonCommand, [
  pythonScriptPath,
  '--input', inputFilePath,
  '--output', outputFilePath
]);

// Collect output
pythonProcess.stdout.on('data', (data) => {
  console.log(`Python stdout: ${data.toString()}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`Python stderr: ${data.toString()}`);
});

// Handle process completion
pythonProcess.on('close', (code) => {
  console.log(`Python process exited with code ${code}`);
  
  if (code !== 0) {
    console.error('Python script failed');
    process.exit(1);
  }
  
  try {
    // Check if output file exists
    if (!fs.existsSync(outputFilePath)) {
      console.error(`Output file not found: ${outputFilePath}`);
      process.exit(1);
    }
    
    // Read results
    const resultsText = fs.readFileSync(outputFilePath, 'utf8');
    const results = JSON.parse(resultsText);
    
    console.log('Analysis results:');
    console.log(JSON.stringify(results, null, 2));
    
    // Check if chart was generated
    const chartExists = fs.existsSync(sampleData.chartOutputPath);
    console.log(`Chart generated: ${chartExists}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error processing results:', error);
    process.exit(1);
  }
}); 
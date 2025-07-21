const { exec } = require('child_process');
const http = require('http');

console.log('Attempting to stop the current server process...');

// Try to shut down the server gracefully by making a request to the stop endpoint
try {
  http.get('http://localhost:3001/api/stop', (res) => {
    console.log(`Server shutdown attempt returned status: ${res.statusCode}`);
    
    // Give the server a moment to shut down
    setTimeout(() => {
      startNewServer();
    }, 1000);
  }).on('error', (e) => {
    console.log(`Server shutdown attempt failed: ${e.message}`);
    console.log('Server may not be running or does not have a stop endpoint. Starting new server...');
    startNewServer();
  });
} catch (error) {
  console.log('Error attempting to stop server:', error);
  startNewServer();
}

function startNewServer() {
  console.log('Starting new server process with verbose logging...');
  
  // Use the exec function to start the server in a new process
  const serverProcess = exec('DEBUG=* node var-api.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Server process error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Server stderr: ${stderr}`);
    }
    console.log(`Server stdout: ${stdout}`);
  });
  
  // Forward the server's stdout and stderr to the console in real-time
  serverProcess.stdout.on('data', (data) => {
    console.log(`SERVER: ${data}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`SERVER ERROR: ${data}`);
  });
  
  // Handle server process exit
  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  console.log('Server restart initiated. The server should be running with verbose logging now.');
  console.log('Press Ctrl+C to stop this process when you want to end the server.');
  
  // Keep the process running
  process.stdin.resume();
} 
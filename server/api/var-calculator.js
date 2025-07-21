const express = require('express');
const router = express.Router();

// Simple endpoint to check if the API is working
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Export the router
module.exports = router; 
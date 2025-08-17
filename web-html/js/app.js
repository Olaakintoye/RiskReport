import { router } from './router.js';
import { setApiBase } from './services/api.js';

// Initialize
const API_BASE = localStorage.getItem('RR_API_BASE') || 'http://localhost:3001';
setApiBase(API_BASE);

document.getElementById('api-base').textContent = API_BASE;
document.getElementById('year').textContent = new Date().getFullYear();

// Mount router
router.start();



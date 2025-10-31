import './style.css';
import { createApp } from './app.js';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  const app = createApp(appContainer);
  app.init();
});


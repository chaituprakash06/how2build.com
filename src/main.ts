import './style.css';
import { ModelViewer } from './components/ModelViewer';
import { ChatInterface } from './components/ChatInterface';
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject();

// Initialize the app
function initApp() {
  console.log('Initializing application...');
  
  // Get existing app div from index.html
  const appDiv = document.getElementById('app');
  
  if (!appDiv) {
    console.error('App container not found');
    return;
  }
  
  // Set app layout styles
  appDiv.className = 'app-container';
  
  // Create a container for 3D view
  const modelContainer = document.createElement('div');
  modelContainer.id = 'model-container';
  modelContainer.className = 'model-container';
  appDiv.appendChild(modelContainer);
  
  // Create a container for chat interface
  const chatContainer = document.createElement('div');
  chatContainer.id = 'chat-container';
  chatContainer.className = 'chat-container';
  appDiv.appendChild(chatContainer);
  
  // Initialize 3D viewer
  const modelViewer = new ModelViewer(modelContainer);
  
  // Initialize chat interface - we need to create it even if we don't store the reference
  new ChatInterface(chatContainer, modelViewer);
  
  console.log('Application initialized');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
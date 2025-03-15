import './style.css';
import { ModelViewer } from './components/ModelViewer';
import { ChatInterface } from './components/ChatInterface';

// Initialize the app
function initApp() {
  // Create app container if it doesn't exist
  if (!document.getElementById('app')) {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
  }
  
  // Initialize 3D viewer first
  const modelViewer = new ModelViewer(document.body);
  
  // Then create chat interface with reference to the app element
  const appContainer = document.getElementById('app')!;
  const chatInterface = new ChatInterface(appContainer, modelViewer);
  
  console.log('Application initialized');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
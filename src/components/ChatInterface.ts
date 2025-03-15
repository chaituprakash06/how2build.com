import { ModelViewer } from './ModelViewer';
import { sendChatRequest } from '../services/api';

export class ChatInterface {
  private container: HTMLElement;
  private modelViewer: ModelViewer;
  private chatPanel: HTMLElement;
  private currentStep: number = 0;
  private steps: any[] = [];
  
  // Add missing property declarations
  private chatMessages: HTMLElement;
  private messageInput: HTMLInputElement;
  private stepsContainer: HTMLElement;
  private prevButton: HTMLElement | null = null;
  private nextButton: HTMLElement | null = null;
  
  constructor(container: HTMLElement, modelViewer: ModelViewer) {
    this.container = container;
    this.modelViewer = modelViewer;
    
    // Create chat panel element
    this.chatPanel = document.createElement('div');
    this.chatPanel.id = 'chat-panel';
    this.chatPanel.className = 'chat-panel';
    this.chatPanel.innerHTML = `
      <h1>How2Build Assistant</h1>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input">
        <input type="text" id="message-input" placeholder="Describe your home repair issue...">
        <button id="send-btn">Send</button>
      </div>
    `;
    
    // Add chat panel to container
    this.container.appendChild(this.chatPanel);
    
    // Initialize properties to prevent TypeScript errors
    this.chatMessages = document.createElement('div');
    this.messageInput = document.createElement('input') as HTMLInputElement;
    this.stepsContainer = document.createElement('div');
    
    // Important: Wait for DOM to update before getting references
    setTimeout(() => {
      // Cache DOM references
      const chatMessagesElement = document.getElementById('chat-messages');
      const messageInputElement = document.getElementById('message-input');
      
      if (chatMessagesElement) {
        this.chatMessages = chatMessagesElement as HTMLElement;
      } else {
        console.error('Failed to find chat-messages element');
      }
      
      if (messageInputElement) {
        this.messageInput = messageInputElement as HTMLInputElement;
      } else {
        console.error('Failed to find message-input element');
      }
      
      // Set up event listeners
      const sendButton = document.getElementById('send-btn');
      if (sendButton) {
        sendButton.addEventListener('click', () => this.sendMessage());
      }
      
      if (this.messageInput) {
        this.messageInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.sendMessage();
        });
      }
      
      // Add welcome message
      this.addMessage('assistant', 'Hello! What home repair issue can I help you with today?');
    }, 0);
  }
  
  private async sendMessage(): Promise<void> {
    if (!this.messageInput) {
      console.error('Message input element not found');
      return;
    }
    
    const message = this.messageInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    this.addMessage('user', message);
    this.messageInput.value = '';
    
    // Show loading indicator
    const loadingId = this.addMessage('assistant', '...', 'loading-message');
    
    try {
      // Call API
      const response = await this.callChatApi(message);
      
      // Remove loading message
      this.removeMessage(loadingId);
      
      // Add response to chat
      this.addMessage('assistant', response.message);
      
      // Check if we have an error
      if (response.error) {
        console.error('Error response from API:', response);
        return; // Don't proceed with model/steps if there's an error
      }
      
      // Update model if model data is provided
      if (response.modelData) {
        this.modelViewer.loadModel(response.modelData);
      }
      
      // Update repair steps if provided
      if (response.steps && response.steps.length) {
        this.updateRepairSteps(response.steps);
      }
    } catch (error) {
      console.error('Error:', error);
      this.removeMessage(loadingId);
      this.addMessage('assistant', 'Sorry, I had trouble processing that. Please try again.');
    }
  }
  
  private addMessage(sender: string, content: string, className: string = ''): string {
    if (!this.chatMessages) {
      console.error('Chat messages container not found');
      return '';
    }
    
    const id = 'msg-' + Date.now();
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message ${className}`;
    messageElement.id = id;
    messageElement.innerHTML = `<p>${content}</p>`;
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    return id;
  }
  
  private removeMessage(id: string): void {
    const element = document.getElementById(id);
    if (element) element.remove();
  }
  
  private async callChatApi(message: string): Promise<any> {
    return await sendChatRequest(message);
  }
  
  private updateRepairSteps(steps: any[]): void {
    this.steps = steps;
    
    // Create steps container if it doesn't exist
    if (!this.stepsContainer || !this.stepsContainer.parentElement) {
      this.stepsContainer = document.createElement('div');
      this.stepsContainer.id = 'steps-container';
      this.stepsContainer.className = 'steps-container';
      const chatPanel = document.getElementById('chat-panel');
      if (chatPanel) {
        chatPanel.appendChild(this.stepsContainer);
        
        // Create navigation buttons
        const navContainer = document.createElement('div');
        navContainer.className = 'step-navigation';
        navContainer.innerHTML = `
          <button id="prev-btn" disabled>Previous</button>
          <button id="next-btn">Next</button>
        `;
        chatPanel.appendChild(navContainer);
        
        // Wait for DOM to update before getting button references
        setTimeout(() => {
          this.prevButton = document.getElementById('prev-btn');
          this.nextButton = document.getElementById('next-btn');
          
          if (this.prevButton) {
            this.prevButton.addEventListener('click', () => {
              if (this.currentStep > 0) this.setActiveStep(this.currentStep - 1);
            });
          }
          
          if (this.nextButton) {
            this.nextButton.addEventListener('click', () => {
              if (this.currentStep < this.steps.length - 1) this.setActiveStep(this.currentStep + 1);
            });
          }
          
          // Now that we have buttons set up, add the steps
          this.populateSteps();
        }, 0);
      } else {
        console.error('Chat panel not found');
      }
    } else {
      // Steps container already exists, just update the content
      this.populateSteps();
    }
  }
  
  private populateSteps(): void {
    if (!this.stepsContainer) {
      console.error('Steps container not found');
      return;
    }
    
    // Clear existing steps
    this.stepsContainer.innerHTML = '';
    
    // Add new steps
    this.steps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.className = `step ${index === 0 ? 'active' : ''}`;
      stepElement.dataset.step = index.toString();
      stepElement.innerHTML = `
        <div class="step-number">${index + 1}</div>
        <div class="step-content">
          <h3>${step.title}</h3>
          <p>${step.description}</p>
        </div>
      `;
      stepElement.addEventListener('click', () => this.setActiveStep(index));
      this.stepsContainer.appendChild(stepElement);
    });
    
    // Set initial step
    this.setActiveStep(0);
  }
  
  private setActiveStep(step: number): void {
    if (!this.steps || !this.steps[step]) return;
    
    // Update UI
    document.querySelectorAll('.step').forEach((el, idx) => {
      el.classList.toggle('active', idx === step);
    });
    
    // Update buttons
    if (this.prevButton) this.prevButton.disabled = step === 0;
    if (this.nextButton) this.nextButton.disabled = step === this.steps.length - 1;
    
    this.currentStep = step;
    
    // Update model state
    if (this.steps[step].modelState && this.modelViewer) {
      try {
        this.modelViewer.updateModelState(this.steps[step].modelState);
      } catch (error) {
        console.error('Error updating model state:', error);
      }
    }
  }
}
import { ModelViewer } from './ModelViewer';

export class ChatInterface {
  private container: HTMLElement;
  private modelViewer: ModelViewer;
  private chatPanel: HTMLElement;
  private currentStep: number = 0;
  private steps: any[] = [];
  
  constructor(container: HTMLElement, modelViewer: ModelViewer) {
    this.container = container;
    this.modelViewer = modelViewer;
    
    // Create chat panel element
    this.chatPanel = document.createElement('div');
    this.chatPanel.id = 'chat-panel';
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
    
    // Set up event listeners
    document.getElementById('send-btn')?.addEventListener('click', () => this.sendMessage());
    document.getElementById('message-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
    
    // Add welcome message
    this.addMessage('assistant', 'Hello! What home repair issue can I help you with today?');
  }
  
  private async sendMessage(): Promise<void> {
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    return await response.json();
  }
  
  private updateRepairSteps(steps: any[]): void {
    this.steps = steps;
    
    // Create steps container if it doesn't exist
    if (!this.stepsContainer) {
      this.stepsContainer = document.createElement('div');
      this.stepsContainer.id = 'steps-container';
      this.stepsContainer.className = 'steps-container';
      const chatPanel = document.getElementById('chat-panel');
      if (chatPanel) chatPanel.appendChild(this.stepsContainer);
      
      // Create navigation buttons
      const navContainer = document.createElement('div');
      navContainer.className = 'step-navigation';
      navContainer.innerHTML = `
        <button id="prev-btn" disabled>Previous</button>
        <button id="next-btn">Next</button>
      `;
      chatPanel?.appendChild(navContainer);
      
      this.prevButton = document.getElementById('prev-btn');
      this.nextButton = document.getElementById('next-btn');
      
      this.prevButton?.addEventListener('click', () => {
        if (this.currentStep > 0) this.setActiveStep(this.currentStep - 1);
      });
      
      this.nextButton?.addEventListener('click', () => {
        if (this.currentStep < this.steps.length - 1) this.setActiveStep(this.currentStep + 1);
      });
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
      this.stepsContainer?.appendChild(stepElement);
    });
    
    // Set initial step
    this.setActiveStep(0);
  }
  
  private setActiveStep(step: number): void {
    if (!this.steps[step]) return;
    
    // Update UI
    document.querySelectorAll('.step').forEach((el, idx) => {
      el.classList.toggle('active', idx === step);
    });
    
    // Update buttons
    if (this.prevButton) this.prevButton.disabled = step === 0;
    if (this.nextButton) this.nextButton.disabled = step === this.steps.length - 1;
    
    this.currentStep = step;
    
    // Update model state
    if (this.steps[step].modelState) {
      this.modelViewer.updateModelState(this.steps[step].modelState);
    }
  }
}
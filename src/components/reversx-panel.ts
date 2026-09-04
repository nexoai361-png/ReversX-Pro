import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  agentName?: string;
  codeSnippet?: string;
  timestamp?: string;
}

const KNOWN_AGENTS = [
  { name: '/CoderAgent', desc: 'Code expert' },
  { name: '/DebugAgent', desc: 'Fix bugs' },
  { name: '/ExplainAgent', desc: 'Break down topics' },
  { name: '/SearchAgent', desc: 'Research' }
];

@customElement('reversx-panel')
export class ReversXPanel extends LitElement {
  createRenderRoot() {
    return this;
  }

  @state() messages: ChatMessage[] = [];
  @state() inputQuery: string = '';
  @state() isGenerating: boolean = false;
  @state() isUploadPopupActive: boolean = false;
  @state() isAutocompleteActive: boolean = false;
  @state() autocompleteQuery: string = '';
  @state() isExpandVisible: boolean = false;
  @state() isFullscreenActive: boolean = false;
  @state() fullscreenQuery: string = '';
  @state() expandedMessageIds: Set<string> = new Set();

  private handleOutsideClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const uploadPopup = this.querySelector('#upload-popup');
    const plusBtn = this.querySelector('#plus-btn');
    if (this.isUploadPopupActive && uploadPopup && !path.includes(uploadPopup) && plusBtn && !path.includes(plusBtn)) {
      this.isUploadPopupActive = false;
    }

    const autocompletePopup = this.querySelector('#autocomplete-popup');
    const userInput = this.querySelector('#user-input');
    if (this.isAutocompleteActive && autocompletePopup && !path.includes(autocompletePopup) && userInput && !path.includes(userInput)) {
      this.isAutocompleteActive = false;
    }
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('click', this.handleOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.handleOutsideClick);
  }

  private togglePopup(e: Event) {
    e.stopPropagation();
    this.isUploadPopupActive = !this.isUploadPopupActive;
  }

  private selectOption(option: string) {
    this.isUploadPopupActive = false;
    
    if (option === 'File') {
      const fileInput = this.querySelector('#reversx-file-input') as HTMLInputElement;
      if (fileInput) { fileInput.click(); return; }
    } else if (option === 'Image') {
      const imageInput = this.querySelector('#reversx-image-input') as HTMLInputElement;
      if (imageInput) { imageInput.click(); return; }
    } else if (option === 'Camera') {
      const cameraInput = this.querySelector('#reversx-camera-input') as HTMLInputElement;
      if (cameraInput) { cameraInput.click(); return; }
    }

    this.appendUserMessage(`Selected option: ${option}`);
  }

  private handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fileName = input.files[0].name;
      this.appendUserMessage(`[File Attached: ${fileName}]`);
      input.value = '';
    }
  }

  private handleImageChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fileName = input.files[0].name;
      this.appendUserMessage(`[Image Attached: ${fileName}]`);
      input.value = '';
    }
  }

  private handleCameraChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fileName = input.files[0].name;
      this.appendUserMessage(`[Photo Taken: ${fileName}]`);
      input.value = '';
    }
  }

  private handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    this.inputQuery = el.value;

    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';

    if (el.scrollHeight > 70 || el.value.length > 70) {
      this.isExpandVisible = true;
    } else {
      this.isExpandVisible = false;
    }

    const val = el.value;
    if (val.startsWith('/') && !val.includes(' ')) {
      this.autocompleteQuery = val;
      this.isAutocompleteActive = true;
    } else {
      this.isAutocompleteActive = false;
    }
  }

  private selectAgent(agentName: string) {
    this.inputQuery = agentName + ' ';
    this.isAutocompleteActive = false;
    const userInput = this.querySelector('#user-input') as HTMLTextAreaElement;
    if (userInput) {
      userInput.focus();
      userInput.style.height = 'auto';
      userInput.style.height = userInput.scrollHeight + 'px';
    }
  }

  private openFullscreen() {
    this.fullscreenQuery = this.inputQuery;
    this.isFullscreenActive = true;
    setTimeout(() => {
      const fsInput = this.querySelector('#fullscreen-input') as HTMLTextAreaElement;
      if (fsInput) fsInput.focus();
    }, 50);
  }

  private closeFullscreen() {
    this.inputQuery = this.fullscreenQuery;
    this.isFullscreenActive = false;
    const userInput = this.querySelector('#user-input') as HTMLTextAreaElement;
    if (userInput) {
      userInput.focus();
      userInput.style.height = 'auto';
      userInput.style.height = userInput.scrollHeight + 'px';
      this.isExpandVisible = userInput.scrollHeight > 70 || userInput.value.length > 70;
    }
  }

  private handleFullscreenInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    this.fullscreenQuery = el.value;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  private sendMessage() {
    const text = this.inputQuery.trim();
    if (!text || this.isGenerating) return;

    this.appendUserMessage(text);
    this.inputQuery = '';
    
    const userInput = this.querySelector('#user-input') as HTMLTextAreaElement;
    if (userInput) {
      userInput.style.height = 'auto';
    }
    this.isExpandVisible = false;

    this.isGenerating = true;

    setTimeout(() => {
      let responseText = "I have received your message. How else can I assist you today?";
      let codeSnippet: string | undefined = undefined;

      const lower = text.toLowerCase();
      if (lower.includes('code') || lower.includes('/coderagent') || lower.includes('script') || lower.includes('ssh')) {
        responseText = "Here is a code snippet tailored for your request:";
        codeSnippet = `#!/data/data/com.termux/files/usr/bin/bash\n# ReversX AI - Automated Terminal Task\nsshd -p 8022\necho "SSH Daemon Active on port 8022!"`;
      } else if (lower.includes('debug') || lower.includes('/debugagent') || lower.includes('error')) {
        responseText = "Checking for issues... No syntax errors found in your current configuration.";
      } else if (lower.includes('explain') || lower.includes('/explainagent')) {
        responseText = "ReversX AI breaks down complex tasks into clean, executable terminal commands.";
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        codeSnippet: codeSnippet,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      this.messages = [...this.messages, aiMsg];
      this.isGenerating = false;
      this.scrollToBottom();
    }, 500);
  }

  private appendUserMessage(text: string) {
    let agentName = '';
    let messageContent = text;

    const agentMatch = text.match(/^(\/[a-zA-Z]+)(\s+[\s\S]*)?$/);
    const knownAgentNames = KNOWN_AGENTS.map(a => a.name.toLowerCase());

    if (agentMatch && knownAgentNames.includes(agentMatch[1].toLowerCase())) {
      agentName = agentMatch[1];
      messageContent = agentMatch[2] ? agentMatch[2].trim() : '';
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageContent,
      agentName: agentName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.messages = [...this.messages, userMsg];
    this.scrollToBottom();
  }

  private toggleExpand(msgId: string) {
    const next = new Set(this.expandedMessageIds);
    if (next.has(msgId)) {
      next.delete(msgId);
    } else {
      next.add(msgId);
    }
    this.expandedMessageIds = next;
    this.scrollToBottom();
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatMessages = this.querySelector('#chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 50);
  }

  private renderUserContent(msg: ChatMessage) {
    const messageContent = msg.text;
    if (!messageContent) return html``;

    let items = messageContent.split('\n').map(i => i.trim()).filter(i => i.length > 0);

    if (items.length <= 1 && messageContent.length > 90) {
      const rawSentences = messageContent.split(/(?<=[.!?])\s+/);
      items = [];
      rawSentences.forEach(s => {
        s = s.trim();
        if (s.length > 0) {
          if (s.length > 85 && s.includes(',')) {
            const subParts = s.split(',').map(p => p.trim()).filter(p => p.length > 0);
            items.push(...subParts);
          } else {
            items.push(s);
          }
        }
      });
    }

    const maxVisibleItems = 3;

    if (items.length > 1) {
      const isExpanded = this.expandedMessageIds.has(msg.id);
      const limit = isExpanded ? items.length : Math.min(items.length, maxVisibleItems);
      const visibleItems = items.slice(0, limit);

      return html`
        <ul>
          ${visibleItems.map(item => {
            let cleanItem = item;
            if (!/[.!?]$/.test(cleanItem) && cleanItem.length > 0) {
              cleanItem += '.';
            }
            return html`<li>${cleanItem}</li>`;
          })}
        </ul>
        ${items.length > maxVisibleItems ? html`
          <button class="toggle-read-more" @click="${() => this.toggleExpand(msg.id)}">
            ${isExpanded ? 'Show Less' : `Show More (${items.length - maxVisibleItems} more)`}
          </button>
        ` : ''}
      `;
    }

    return html`<div>${messageContent}</div>`;
  }

  render() {
    const filteredAgents = KNOWN_AGENTS.filter(a =>
      a.name.toLowerCase().includes(this.autocompleteQuery.toLowerCase())
    );

    return html`
      <div class="ai-container">
        <!-- Header -->
        <div class="ai-header">
          <div class="brand">
            <span class="bot-symbol">&lt;&gt;</span>
            <span>ReversX</span>
          </div>
          <span class="status">● ONLINE</span>
        </div>

        <!-- Chat Messages -->
        <div class="ai-messages" id="chat-messages">
          ${this.messages.length === 0
            ? html`<div class="message ai initial-message" id="initial-message">Start a Conversation</div>`
            : this.messages.map(msg => html`
                ${msg.sender === 'user'
                  ? html`
                      <div class="message user">
                        ${msg.agentName ? html`<div class="agent-tag-box">${msg.agentName}</div>` : ''}
                        ${this.renderUserContent(msg)}
                      </div>
                    `
                  : html`
                      <div class="message ai">
                        <div>${msg.text}</div>
                        ${msg.codeSnippet ? html`<pre><code>${msg.codeSnippet}</code></pre>` : ''}
                      </div>
                    `
                }
              `)
          }
        </div>

        <!-- Inputs for Upload Menu -->
        <input type="file" id="reversx-file-input" style="display:none;" @change="${this.handleFileChange}" />
        <input type="file" id="reversx-image-input" accept="image/*" style="display:none;" @change="${this.handleImageChange}" />
        <input type="file" id="reversx-camera-input" accept="image/*" capture="environment" style="display:none;" @change="${this.handleCameraChange}" />

        <!-- Input Container (VS Code Copilot Chat Style) -->
        <div class="ai-input-container">
          <!-- Upload Popup Menu -->
          <div class="upload-popup ${this.isUploadPopupActive ? 'active' : ''}" id="upload-popup">
            <div class="popup-item" @click="${() => this.selectOption('File')}">
              <svg class="popup-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>File</span>
            </div>
            <div class="popup-item" @click="${() => this.selectOption('Image')}">
              <svg class="popup-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Image</span>
            </div>
            <div class="popup-item" @click="${() => this.selectOption('Camera')}">
              <svg class="popup-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Camera</span>
            </div>
            <div class="popup-item" @click="${() => this.selectOption('Plugins')}">
              <svg class="popup-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>Plugins</span>
            </div>
          </div>

          <!-- Agent Auto-complete Popup Menu (VS Code QuickPick Style) -->
          <div class="autocomplete-popup ${this.isAutocompleteActive && filteredAgents.length > 0 ? 'active' : ''}" id="autocomplete-popup">
            <div class="popup-header">@ AGENT COMMANDS</div>
            ${filteredAgents.map(agent => html`
              <div class="autocomplete-item" data-agent="${agent.name}" @click="${() => this.selectAgent(agent.name)}">
                <span class="agent-tag">@${agent.name}</span>
                <span class="agent-desc">${agent.desc}</span>
              </div>
            `)}
          </div>

          <div class="vscode-chat-card">
            <textarea
              id="user-input"
              placeholder="Ask Copilot or type '/' for agents..."
              .value="${this.inputQuery}"
              @input="${this.handleInput}"
              @keydown="${this.handleKeyDown}"
              rows="1"
            ></textarea>

            <div class="vscode-chat-toolbar">
              <div class="toolbar-left">
                <button
                  class="vscode-btn-icon btn-attach ${this.isUploadPopupActive ? 'active' : ''}"
                  id="plus-btn"
                  @click="${this.togglePopup}"
                  title="Add Context / Attach File (+)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>

              <div class="toolbar-right">
                ${this.isExpandVisible ? html`
                  <button class="vscode-btn-icon btn-expand" id="expand-btn" @click="${this.openFullscreen}" title="Open Full Editor">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  </button>
                ` : ''}

                <button class="vscode-btn-send" id="send-btn" @click="${() => this.sendMessage()}" title="Send (Enter)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Full Screen Vertical Screen Editor Overlay -->
      <div class="fullscreen-overlay ${this.isFullscreenActive ? 'active' : ''}" id="fullscreen-overlay">
        <div class="fullscreen-header">
          <span>Expanded Message Editor</span>
          <button class="fullscreen-close" @click="${this.closeFullscreen}">Done</button>
        </div>
        <textarea
          class="fullscreen-textarea"
          id="fullscreen-input"
          placeholder="Type a message..."
          .value="${this.fullscreenQuery}"
          @input="${this.handleFullscreenInput}"
        ></textarea>
      </div>
    `;
  }
}

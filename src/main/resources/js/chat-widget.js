window.JurixChat = (function() {
    'use strict';
    
    let isOpen = false;
    let conversationId = null;
    let chatWindow = null;
    let messageContainer = null;
    let inputField = null;
    let isTyping = false;
    let isConnected = false;
    let isExpanded = false;
    let currentRequest = null;
    
    const API_BASE = AJS.contextPath() + '/rest/jurix-api/1.0';
    
    function init() {
        conversationId = 'jira-chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        createChatButton();
        createChatWindow();
        checkBackendConnection();
    }
    
    function checkBackendConnection() {
        AJS.$.ajax({
            url: API_BASE + '/health',
            type: 'GET',
            success: function(response) {
                isConnected = response.backend_connected || false;
                if (isConnected) {
                    console.log('✅ Connected to JURIX AI backend');
                    updateConnectionStatus(true);
                } else {
                    console.warn('⚠️ Backend not connected, using fallback mode');
                    updateConnectionStatus(false);
                }
            },
            error: function() {
                isConnected = false;
                updateConnectionStatus(false);
            }
        });
    }
    
    function updateConnectionStatus(connected) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        if (statusDot && statusText) {
            statusDot.classList.add('online');
            statusDot.classList.remove('offline');
            statusText.textContent = 'Connected';
            statusText.style.color = '#00875A';
        }
    }
    
    function createChatButton() {
        const button = document.createElement('div');
        button.className = 'jurix-chat-button';
        button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
        `;
        button.onclick = toggleChat;
        
        const widget = document.createElement('div');
        widget.className = 'jurix-chat-widget';
        widget.appendChild(button);
        
        document.body.appendChild(widget);
    }
    
    function createChatWindow() {
        chatWindow = document.createElement('div');
        chatWindow.className = 'jurix-chat-window';
        chatWindow.innerHTML = `
            <div class="chat-container">
                <!-- Clean Header -->
                <div class="chat-header">
                    <div class="header-left">
                        <div class="header-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                            </svg>
                        </div>
                        <div class="header-info">
                            <div class="header-title">JURIX Assistant</div>
                            <div class="header-status">
                                <span class="status-dot online"></span>
                                <span class="status-text">Connected</span>
                                <span class="status-separator">•</span>
                                <span class="response-time">Typically replies instantly</span>
                            </div>
                        </div>
                    </div>
                    <button class="close-button" onclick="JurixChat.toggleChat()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Messages Area -->
                <div class="chat-messages" id="chatMessages">
                    <!-- Initial greeting message -->
                    <div class="message assistant">
                        <div class="message-bubble">
                            <p>Hi there! 👋</p>
                            <p>I'm your AI assistant connected to your Jira instance. I can help you with:</p>
                            <ul class="features-list">
                                <li>Answering questions about your projects</li>
                                <li>Providing insights and recommendations</li>
                                <li>Analyzing your team's productivity</li>
                                <li>General Agile and development best practices</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="quick-actions">
                        <button class="action-chip" onclick="JurixChat.sendQuickMessage('What is my team\\'s current velocity?')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12h18m-9-9v18"/>
                            </svg>
                            Team velocity
                        </button>
                        <button class="action-chip" onclick="JurixChat.sendQuickMessage('Show me productivity insights')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            Productivity
                        </button>
                        <button class="action-chip" onclick="JurixChat.sendQuickMessage('Any blockers I should know about?')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                            </svg>
                            Blockers
                        </button>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="chat-input-area">
                    <div class="resize-handle" onclick="JurixChat.toggleSize()" title="Click to resize">
                        <div class="resize-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="input-wrapper">
                        <input 
                            type="text" 
                            id="chatInput" 
                            class="chat-input" 
                            placeholder="Ask me anything..." 
                            onkeypress="JurixChat.handleKeyPress(event)"
                        >
                        <button class="send-button" id="sendButton" onclick="JurixChat.sendMessage()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="input-hint">
                        Press <kbd>Enter</kbd> to send • <kbd>Shift + Enter</kbd> for new line
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('.jurix-chat-widget').appendChild(chatWindow);
        
        messageContainer = document.getElementById('chatMessages');
        inputField = document.getElementById('chatInput');

        addEnhancedStyles();
    }
    
    function addEnhancedStyles() {
        const styleId = 'jurix-chat-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Chat Widget */
            .jurix-chat-widget {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
            }
            
            /* Modern Floating Button */
            .jurix-chat-button {
                width: 56px;
                height: 56px;
                background: #0052CC;
                border-radius: 28px;
                cursor: pointer;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .jurix-chat-button:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            }
            
            .jurix-chat-button:active {
                transform: scale(0.98);
            }
            
            /* Chat Window */
            .jurix-chat-window {
                position: fixed;
                bottom: 88px;
                right: 24px;
                width: 380px;
                height: 600px;
                max-height: calc(100vh - 120px);
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .jurix-chat-window.open {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }
            
            .jurix-chat-window.expanded {
                width: 480px;
            }
            
            .chat-container {
                width: 100%;
                height: 100%;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            /* Clean Header */
            .chat-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e4e7eb;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: white;
            }
            
            .header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .header-icon {
                width: 36px;
                height: 36px;
                background: #f4f5f7;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #0052CC;
            }
            
            .header-info {
                flex: 1;
            }
            
            .header-title {
                font-size: 15px;
                font-weight: 600;
                color: #172B4D;
                margin-bottom: 2px;
            }
            
            .header-status {
                font-size: 12px;
                color: #6B778C;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .status-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }
            
            .status-dot.online {
                background: #00875A;
                box-shadow: 0 0 0 2px rgba(0, 135, 90, 0.2);
            }
            
            .status-dot.offline {
                background: #97A0AF;
            }
            
            .status-text {
                font-weight: 500;
                transition: color 0.3s ease;
            }
            
            .status-separator {
                opacity: 0.3;
            }
            
            .response-time {
                color: #6B778C;
            }
            
            .header-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .resize-button,
            .close-button {
                width: 36px;
                height: 36px;
                border: none;
                background: transparent;
                color: #6B778C;
                cursor: pointer;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .resize-button {
                background: #F4F5F7;
                margin-right: 4px;
            }
            
            .resize-button:hover,
            .close-button:hover {
                background: #E4E7EB;
                color: #172B4D;
            }
            
            .resize-button:hover {
                transform: scale(1.1);
            }
            
            /* Messages Area */
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                scroll-behavior: smooth;
                background: #fafbfc;
            }
            
            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .chat-messages::-webkit-scrollbar-thumb {
                background: #dfe1e6;
                border-radius: 3px;
            }
            
            /* Messages */
            .message {
                margin-bottom: 16px;
                display: flex;
                animation: messageSlide 0.3s ease;
            }
            
            @keyframes messageSlide {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message.user {
                justify-content: flex-end;
            }
            
            .message-bubble {
                max-width: 75%;
                padding: 12px 16px;
                border-radius: 12px;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .message.assistant .message-bubble {
                background: white;
                color: #172B4D;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            
            .message.user .message-bubble {
                background: #0052CC;
                color: white;
            }
            
            .message-bubble p {
                margin: 0;
                padding: 0;
            }
            
            .message-bubble p + p {
                margin-top: 8px;
            }
            
            .features-list {
                list-style: none;
                padding: 0;
                margin: 12px 0 0 0;
            }
            
            .features-list li {
                padding: 6px 0;
                padding-left: 20px;
                position: relative;
                color: #42526E;
                font-size: 13px;
            }
            
            .features-list li::before {
                content: '✓';
                position: absolute;
                left: 0;
                color: #00875A;
                font-weight: 600;
            }
            
            /* Quick Actions */
            .quick-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 16px;
                padding: 0 8px;
            }
            
            .action-chip {
                padding: 8px 14px;
                background: white;
                border: 1px solid #dfe1e6;
                border-radius: 20px;
                font-size: 13px;
                color: #42526E;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .action-chip:hover {
                background: #f4f5f7;
                border-color: #0052CC;
                color: #0052CC;
            }
            
            /* Typing Indicator */
            .typing-indicator {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 12px 16px;
                background: white;
                border-radius: 12px;
                width: fit-content;
                margin-bottom: 16px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            
            .typing-dot {
                width: 8px;
                height: 8px;
                background: #C1C7D0;
                border-radius: 50%;
                animation: typingAnimation 1.4s infinite;
            }
            
            .typing-dot:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .typing-dot:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes typingAnimation {
                0%, 60%, 100% {
                    transform: scale(1);
                    opacity: 0.5;
                }
                30% {
                    transform: scale(1.2);
                    opacity: 1;
                }
            }
            
            /* Resize Handle */
            .resize-handle {
                display: flex;
                justify-content: center;
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .resize-dots {
                display: flex;
                gap: 4px;
                padding: 4px 12px;
                background: #F4F5F7;
                border-radius: 12px;
                transition: all 0.2s ease;
            }
            
            .resize-dots span {
                width: 4px;
                height: 4px;
                background: #97A0AF;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .resize-handle:hover .resize-dots {
                background: #E4E7EB;
            }
            
            .resize-handle:hover .resize-dots span {
                background: #6B778C;
            }
            
            /* Input Area */
            .chat-input-area {
                padding: 0 16px 16px;
                background: white;
                border-top: 1px solid #e4e7eb;
            }
            
            .input-wrapper {
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
            }
            
            .chat-input {
                flex: 1;
                padding: 12px 16px;
                border: 1px solid #dfe1e6;
                border-radius: 24px;
                font-size: 14px;
                outline: none;
                transition: all 0.2s ease;
                background: #f4f5f7;
            }
            
            .chat-input:focus {
                border-color: #0052CC;
                background: white;
            }
            
            .chat-input::placeholder {
                color: #97A0AF;
            }
            
            .send-button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #0052CC;
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .send-button:hover {
                background: #0747A6;
                transform: scale(1.05);
            }
            
            .send-button:active {
                transform: scale(0.95);
            }
            
            .input-hint {
                font-size: 11px;
                color: #97A0AF;
                text-align: center;
                margin-top: 8px;
            }
            
            .input-hint kbd {
                padding: 2px 6px;
                background: #f4f5f7;
                border-radius: 4px;
                font-family: monospace;
                font-size: 10px;
                color: #42526E;
                box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
            }
            
            /* Article Summary */
            .article-summary {
                background: #f4f5f7;
                border-radius: 8px;
                padding: 12px;
                margin: 8px 0;
            }
            
            .article-summary-header {
                font-size: 13px;
                font-weight: 600;
                color: #172B4D;
                margin-bottom: 8px;
            }
            
            .article-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .article-item {
                padding: 8px 0;
                font-size: 13px;
                border-bottom: 1px solid #e4e7eb;
            }
            
            .article-item:last-child {
                border-bottom: none;
            }
            
            .article-link {
                color: #0052CC;
                text-decoration: none;
                font-weight: 500;
                transition: all 0.2s ease;
                display: block;
            }
            
            .article-link:hover {
                color: #0747A6;
                text-decoration: underline;
            }
            
            /* Insights */
            .insights-card {
                background: #e9f2ff;
                border-radius: 8px;
                padding: 12px;
                margin: 8px 0;
            }
            
            .insights-header {
                font-size: 13px;
                font-weight: 600;
                color: #0747A6;
                margin-bottom: 8px;
            }
            
            .insight-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
                font-size: 13px;
            }
            
            .insight-label {
                color: #42526E;
            }
            
            .insight-value {
                font-weight: 600;
                color: #0052CC;
            }
            
            .send-button.stop-button {
                background: #0052CC;
            }
            
            .send-button.stop-button:hover {
                background: #0747A6;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .jurix-chat-window,
                .jurix-chat-window.expanded {
                    width: 100%;
                    height: 100%;
                    bottom: 0;
                    right: 0;
                    max-height: 100vh;
                }
                
                .chat-container {
                    border-radius: 0;
                }
                
                .jurix-chat-widget {
                    bottom: 16px;
                    right: 16px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    function toggleChat() {
        isOpen = !isOpen;
        
        if (isOpen) {
            chatWindow.classList.add('open');
            inputField.focus();
            scrollToBottom();
            checkBackendConnection();
        } else {
            chatWindow.classList.remove('open');
        }
    }
    
    function sendMessage() {
        const message = inputField.value.trim();
        if (!message) return;
        addMessage(message, 'user');
        inputField.value = '';
        showTypingIndicator();
        updateSendButton(true);
        
        currentRequest = AJS.$.ajax({
            url: AJS.contextPath() + '/rest/jurix/1.0/chat',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                query: message,
                conversationId: conversationId
            }),
            timeout: 120000,
            success: function(response) {
                hideTypingIndicator();
                updateSendButton(false);
                currentRequest = null;
                
                if (response.response) {
                    addMessage(response.response, 'assistant');
                }
                
                if (response.articles && response.articles.length > 0) {
                    addArticlesSummary(response.articles);
                }
                
                if (response.recommendations && response.recommendations.length > 0) {
                    addQuickActions(response.recommendations);
                }
                
                if (response.predictions && Object.keys(response.predictions).length > 0) {
                    addPredictiveInsights(response.predictions);
                }
            },
            error: function(xhr, status, error) {
                hideTypingIndicator();
                updateSendButton(false);
                currentRequest = null;
                
                if (status !== 'abort') {
                    console.error('Chat error:', error);
                    
                    let errorMessage = 'Sorry, I encountered an error. Please try again.';
                    
                    if (status === 'timeout') {
                        errorMessage = 'The request took too long. Please try a simpler query.';
                    } else if (xhr.status === 0) {
                        errorMessage = 'Unable to connect. Please check your connection.';
                    } else if (xhr.status >= 500) {
                        errorMessage = 'Server error. Please try again later.';
                    }
                    
                    addMessage(errorMessage, 'assistant');
                }
            }
        });
    }
    
    function sendQuickMessage(text) {
        inputField.value = text;
        sendMessage();
    }
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
        
        messageDiv.appendChild(bubbleDiv);
        const quickActions = messageContainer.querySelector('.quick-actions');
        if (quickActions) {
            messageContainer.insertBefore(messageDiv, quickActions);
        } else {
            messageContainer.appendChild(messageDiv);
        }
        
        scrollToBottom();
    }
    
    function addArticlesSummary(articles) {
        if (!articles || articles.length === 0) return;
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'article-summary';
        
        let html = '<div class="article-summary-header">Related Articles</div>';
        html += '<ul class="article-list">';
        
        articles.forEach((article, index) => {
            const articleId = article.id || index;
            html += `<li class="article-item">
                <a href="#" class="article-link" data-article-id="${articleId}" onclick="JurixChat.openArticle('${articleId}'); return false;">
                    ${article.title || 'Untitled'}
                </a>
            </li>`;
        });
        
        html += '</ul>';
        summaryDiv.innerHTML = html;
        
        const quickActions = messageContainer.querySelector('.quick-actions');
        if (quickActions) {
            messageContainer.insertBefore(summaryDiv, quickActions);
        } else {
            messageContainer.appendChild(summaryDiv);
        }
        
        scrollToBottom();
    }
    
    function addPredictiveInsights(predictions) {
        if (!predictions || Object.keys(predictions).length === 0) return;
        
        const insightsDiv = document.createElement('div');
        insightsDiv.className = 'insights-card';
        
        if (predictions.sprint_completion) {
            const sprint = predictions.sprint_completion;
            insightsDiv.innerHTML = `
                <div class="insights-header">📊 Predictive Insights</div>
                <div class="insight-row">
                    <span class="insight-label">Sprint Completion:</span>
                    <span class="insight-value">${(sprint.probability * 100).toFixed(0)}%</span>
                </div>
                <div class="insight-row">
                    <span class="insight-label">Risk Level:</span>
                    <span class="insight-value">${sprint.risk_level}</span>
                </div>
            `;
        }
        
        const quickActions = messageContainer.querySelector('.quick-actions');
        if (quickActions) {
            messageContainer.insertBefore(insightsDiv, quickActions);
        } else {
            messageContainer.appendChild(insightsDiv);
        }
        
        scrollToBottom();
    }
    
    function addQuickActions(recommendations) {
        const existing = messageContainer.querySelector('.quick-actions');
        if (existing) existing.remove();
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'quick-actions';
        
        recommendations.slice(0, 3).forEach(rec => {
            const btn = document.createElement('button');
            btn.className = 'action-chip';
            btn.textContent = rec.substring(0, 40) + (rec.length > 40 ? '...' : '');
            btn.onclick = function() {
                inputField.value = `Tell me more about: ${rec}`;
                sendMessage();
            };
            actionsDiv.appendChild(btn);
        });
        
        messageContainer.appendChild(actionsDiv);
        scrollToBottom();
    }
    
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        const quickActions = messageContainer.querySelector('.quick-actions');
        if (quickActions) {
            messageContainer.insertBefore(indicator, quickActions);
        } else {
            messageContainer.appendChild(indicator);
        }
        
        scrollToBottom();
    }
    
    function hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
    
    function scrollToBottom() {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function stopGeneration() {
        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
            hideTypingIndicator();
            updateSendButton(false);
            addMessage('Generation stopped.', 'assistant');
        }
    }
    
    function updateSendButton(isGenerating) {
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            if (isGenerating) {
                sendButton.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="6" width="12" height="12"/>
                    </svg>
                `;
                sendButton.onclick = stopGeneration;
                sendButton.classList.add('stop-button');
            } else {
                sendButton.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                `;
                sendButton.onclick = sendMessage;
                sendButton.classList.remove('stop-button');
            }
        }
    }
    
    function toggleSize() {
        isExpanded = !isExpanded;
        if (chatWindow) {
            if (isExpanded) {
                chatWindow.classList.add('expanded');
            } else {
                chatWindow.classList.remove('expanded');
            }
        }
    }
    
    function openArticle(articleId) {
        console.log('Opening article:', articleId);
        AJS.flag({
            type: 'info',
            title: 'Opening Article',
            body: 'Article viewer will be implemented soon. Article ID: ' + articleId,
            close: 'auto'
        });
    }
    
    return {
        init: init,
        toggleChat: toggleChat,
        sendMessage: sendMessage,
        handleKeyPress: handleKeyPress,
        sendQuickMessage: sendQuickMessage,
        toggleSize: toggleSize,
        openArticle: openArticle
    };
})();
AJS.$(document).ready(function() {
    JurixChat.init();
});
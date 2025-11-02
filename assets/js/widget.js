/**
 * Chat Support Widget
 * Embeddable chat widget for website integration
 */

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        apiBaseUrl: window.location.protocol + '//' + window.location.host,
        websocketUrl: (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws/chat/',
        position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
        theme: {
            primaryColor: '#007bff',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            borderRadius: '10px'
        }
    };

    // Widget state
    let isOpen = false;
    let socket = null;
    let conversationId = null;
    let isConnected = false;
    let messageQueue = [];
    let sessionId = generateSessionId();

    // Create widget HTML
    function createWidgetHTML() {
        return `
            <div id="chat-widget-container" style="
                position: fixed;
                ${CONFIG.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                ${CONFIG.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            ">
                <!-- Chat Button -->
                <div id="chat-widget-button" style="
                    width: 60px;
                    height: 60px;
                    background-color: ${CONFIG.theme.primaryColor};
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: all 0.3s ease;
                    position: relative;
                " onclick="toggleChatWidget()">
                    <svg id="chat-icon" width="24" height="24" fill="white" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <svg id="close-icon" width="24" height="24" fill="white" viewBox="0 0 24 24" style="display: none;">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    <!-- Notification badge -->
                    <div id="notification-badge" style="
                        position: absolute;
                        top: -5px;
                        right: -5px;
                        background-color: #dc3545;
                        color: white;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                    "></div>
                </div>

                <!-- Chat Window -->
                <div id="chat-widget-window" style="
                    position: absolute;
                    ${CONFIG.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
                    ${CONFIG.position.includes('right') ? 'right: 0;' : 'left: 0;'}
                    width: 350px;
                    height: 450px;
                    background-color: ${CONFIG.theme.backgroundColor};
                    border-radius: ${CONFIG.theme.borderRadius};
                    box-shadow: 0 5px 25px rgba(0,0,0,0.2);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #e1e8ed;
                ">
                    <!-- Header -->
                    <div style="
                        background-color: ${CONFIG.theme.primaryColor};
                        color: white;
                        padding: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div>
                            <div style="font-weight: bold; font-size: 16px;">💬 Support Chat</div>
                            <div id="connection-status" style="font-size: 12px; opacity: 0.9;">Connecting...</div>
                        </div>
                        <div style="
                            width: 10px;
                            height: 10px;
                            border-radius: 50%;
                            background-color: #ffc107;
                        " id="status-indicator"></div>
                    </div>

                    <!-- Messages Container -->
                    <div id="chat-messages" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 15px;
                        background-color: #f8f9fa;
                    ">
                        <div class="system-message" style="
                            text-align: center;
                            color: #6c757d;
                            font-size: 14px;
                            margin-bottom: 15px;
                        ">
                            👋 Welcome! How can we help you today?
                        </div>
                    </div>

                    <!-- Typing Indicator -->
                    <div id="typing-indicator" style="
                        padding: 10px 15px;
                        color: #6c757d;
                        font-style: italic;
                        font-size: 13px;
                        display: none;
                    ">Support is typing...</div>

                    <!-- Input Area -->
                    <div style="
                        padding: 15px;
                        border-top: 1px solid #e1e8ed;
                        background-color: white;
                    ">
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="chat-input" placeholder="Type your message..." style="
                                flex: 1;
                                padding: 12px;
                                border: 1px solid #e1e8ed;
                                border-radius: 20px;
                                outline: none;
                                font-size: 14px;
                            " onkeypress="handleKeyPress(event)">
                            <button onclick="sendMessage()" style="
                                padding: 12px 16px;
                                background-color: ${CONFIG.theme.primaryColor};
                                color: white;
                                border: none;
                                border-radius: 50%;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate unique session ID
    function generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Toggle widget visibility
    function toggleChatWidget() {
        isOpen = !isOpen;
        const window = document.getElementById('chat-widget-window');
        const chatIcon = document.getElementById('chat-icon');
        const closeIcon = document.getElementById('close-icon');
        
        if (isOpen) {
            window.style.display = 'flex';
            chatIcon.style.display = 'none';
            closeIcon.style.display = 'block';
            hideNotificationBadge();
            if (!socket) {
                connectWebSocket();
            }
        } else {
            window.style.display = 'none';
            chatIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    }

    // Connect to WebSocket
    function connectWebSocket() {
        const wsUrl = CONFIG.websocketUrl + sessionId + '/';
        socket = new WebSocket(wsUrl);
        
        socket.onopen = function(e) {
            console.log('Chat widget connected to WebSocket');
            isConnected = true;
            updateConnectionStatus('Connected', 'green');
            
            // Send queued messages
            while (messageQueue.length > 0) {
                socket.send(messageQueue.shift());
            }
        };
        
        socket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            handleIncomingMessage(data);
        };
        
        socket.onclose = function(e) {
            console.log('Chat widget disconnected from WebSocket');
            isConnected = false;
            updateConnectionStatus('Disconnected', 'red');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (isOpen) {
                    connectWebSocket();
                }
            }, 3000);
        };
        
        socket.onerror = function(e) {
            console.error('WebSocket error:', e);
            updateConnectionStatus('Connection Error', 'red');
        };
    }

    // Handle incoming messages
    function handleIncomingMessage(data) {
        switch (data.type) {
            case 'chat_message':
                displayMessage(data.message, data.sender_type || 'admin', data.timestamp);
                if (!isOpen) {
                    showNotificationBadge();
                }
                break;
            case 'conversation_created':
                conversationId = data.conversation_id;
                break;
            case 'typing_start':
                showTypingIndicator();
                break;
            case 'typing_stop':
                hideTypingIndicator();
                break;
            case 'conversation_status':
                updateConnectionStatus(data.status, 'green');
                break;
        }
    }

    // Display message in chat
    function displayMessage(message, senderType, timestamp) {
        const messagesContainer = document.getElementById('chat-messages');
        const isUser = senderType === 'user';
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            ${isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        `;
        
        const messageContent = document.createElement('div');
        messageContent.style.cssText = `
            max-width: 70%;
            padding: 10px 15px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.4;
            ${isUser ? 
                `background-color: ${CONFIG.theme.primaryColor}; color: white; border-bottom-right-radius: 5px;` :
                'background-color: white; color: #333; border: 1px solid #e1e8ed; border-bottom-left-radius: 5px;'
            }
        `;
        
        messageContent.textContent = message;
        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send message
    function sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Display message immediately
        displayMessage(message, 'user');
        
        // Send via WebSocket
        const messageData = JSON.stringify({
            'type': 'chat_message',
            'message': message,
            'session_id': sessionId
        });
        
        if (isConnected) {
            socket.send(messageData);
        } else {
            messageQueue.push(messageData);
        }
        
        input.value = '';
    }

    // Handle enter key press
    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    }

    // Update connection status
    function updateConnectionStatus(status, color) {
        const statusElement = document.getElementById('connection-status');
        const indicator = document.getElementById('status-indicator');
        
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        if (indicator) {
            indicator.style.backgroundColor = color === 'green' ? '#28a745' : 
                                           color === 'red' ? '#dc3545' : '#ffc107';
        }
    }

    // Show typing indicator
    function showTypingIndicator() {
        document.getElementById('typing-indicator').style.display = 'block';
    }

    // Hide typing indicator
    function hideTypingIndicator() {
        document.getElementById('typing-indicator').style.display = 'none';
    }

    // Show notification badge
    function showNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        badge.style.display = 'flex';
        badge.textContent = '!';
    }

    // Hide notification badge
    function hideNotificationBadge() {
        document.getElementById('notification-badge').style.display = 'none';
    }

    // Initialize widget
    function initWidget() {
        // Create widget HTML
        const widgetHTML = createWidgetHTML();
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        // Make functions global
        window.toggleChatWidget = toggleChatWidget;
        window.sendMessage = sendMessage;
        window.handleKeyPress = handleKeyPress;
        
        console.log('Chat widget initialized successfully');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();

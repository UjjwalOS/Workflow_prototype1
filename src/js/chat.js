/*
 * =============================================
 * CHAT / ASK AI FUNCTIONALITY
 * =============================================
 *
 * Simple AI chat simulation for asking questions about documents
 */

function askQuickPrompt(prompt) {
    document.getElementById('chat-input').value = prompt;
    sendChat();
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const container = document.getElementById('chat-messages');
    const user = ROLES[state.currentRole];

    // Add user message
    container.innerHTML += `
        <div class="chat-message user">
            <div class="chat-avatar" style="background:${user.color}">${user.initials}</div>
            <div class="chat-bubble">${message}</div>
        </div>
    `;
    input.value = '';

    // Simulate AI response
    setTimeout(() => {
        let response = "I'll analyze that for you...";
        const q = message.toLowerCase();

        if (q.includes('budget') || q.includes('total')) {
            response = "Total budget: <strong>K1.2 billion</strong> (12% increase). Largest: Infrastructure K450M (37.5%).";
        } else if (q.includes('healthcare')) {
            response = "Healthcare: <strong>K320 million (26.7%)</strong>. Includes 3 new regional hospitals.";
        } else if (q.includes('risk')) {
            response = "Key risks: currency fluctuation, contractor delays, remote access challenges.";
        } else if (q.includes('recommend')) {
            response = "<strong>Approval recommended</strong> for Cabinet consideration.";
        } else if (q.includes('education')) {
            response = "Education: <strong>K280 million (23.3%)</strong>. Focus on teacher training and facility upgrades.";
        } else if (q.includes('infrastructure')) {
            response = "Infrastructure: <strong>K450 million (37.5%)</strong>. Road networks connecting rural to urban areas.";
        }

        container.innerHTML += `
            <div class="chat-message ai">
                <div class="chat-avatar">✨</div>
                <div class="chat-bubble">${response}</div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
    }, 600);

    container.scrollTop = container.scrollHeight;
}

// Make functions globally available
window.askQuickPrompt = askQuickPrompt;
window.sendChat = sendChat;

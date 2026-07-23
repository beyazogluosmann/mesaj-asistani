const input = document.getElementById('input');
const messages = document.getElementById('messages');

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    document.getElementById('typing').style.display = 'block';

    const res = await fetch('/mesaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    });

    document.getElementById('typing').style.display = 'none';
    const reply = await res.text();
    addMessage(reply, 'bot');
}

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#4a9eff;">$1</a>');
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}



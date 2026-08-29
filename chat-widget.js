(function() {
    const STYLE = `
        .chat-fab {
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            width: 56px; height: 56px; border-radius: 50%;
            background: #6366f1; color: #fff; border: none; cursor: pointer;
            box-shadow: 0 4px 20px rgba(99,102,241,0.4);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; transition: all 0.2s;
        }
        .chat-fab:hover { transform: scale(1.08); }
        .chat-fab .badge-dot {
            position: absolute; top: 10px; right: 10px;
            width: 10px; height: 10px; border-radius: 50%;
            background: #ef4444; display: none;
        }

        .chat-panel {
            position: fixed; bottom: 90px; right: 24px; z-index: 9999;
            width: 360px; height: 500px; background: #fff;
            border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.15);
            display: none; flex-direction: column; overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        .chat-panel.open { display: flex; }

        .chat-header {
            padding: 1rem 1.25rem; background: #6366f1; color: #fff;
            display: flex; justify-content: space-between; align-items: center;
        }
        .chat-header h3 { font-size: 0.95rem; font-weight: 600; }
        .chat-header .online { font-size: 0.75rem; opacity: 0.8; }
        .chat-close {
            width: 28px; height: 28px; border-radius: 6px; border: none;
            background: rgba(255,255,255,0.2); color: #fff; cursor: pointer;
            font-size: 1rem; display: flex; align-items: center; justify-content: center;
        }
        .chat-close:hover { background: rgba(255,255,255,0.3); }

        .chat-messages {
            flex: 1; overflow-y: auto; padding: 1rem; display: flex;
            flex-direction: column; gap: 0.75rem; background: #f9fafb;
        }
        .chat-msg {
            display: flex; gap: 0.5rem; align-items: flex-start;
        }
        .chat-msg .msg-avatar {
            width: 32px; height: 32px; border-radius: 8px; background: #e5e7eb;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.7rem; color: #888; flex-shrink: 0; overflow: hidden;
        }
        .chat-msg .msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .chat-msg .msg-body { flex: 1; }
        .chat-msg .msg-name { font-size: 0.75rem; font-weight: 600; color: #333; margin-bottom: 0.15rem; }
        .chat-msg .msg-text { font-size: 0.85rem; color: #555; line-height: 1.4; word-break: break-word; }
        .chat-msg .msg-time { font-size: 0.65rem; color: #bbb; margin-top: 0.15rem; }

        .chat-msg.mine { flex-direction: row-reverse; }
        .chat-msg.mine .msg-name { text-align: right; }
        .chat-msg.mine .msg-text { text-align: right; }
        .chat-msg.mine .msg-time { text-align: right; }

        .chat-input-area {
            padding: 0.75rem 1rem; border-top: 1px solid #f0f0f0;
            display: flex; gap: 0.5rem; background: #fff;
        }
        .chat-input-area input {
            flex: 1; padding: 0.6rem 0.85rem; border: 1px solid #e5e7eb;
            border-radius: 8px; font-size: 0.85rem; color: #333;
        }
        .chat-input-area input:focus { outline: none; border-color: #6366f1; }
        .chat-send {
            padding: 0.6rem 1rem; background: #6366f1; color: #fff;
            border: none; border-radius: 8px; font-size: 0.85rem;
            font-weight: 500; cursor: pointer; transition: background 0.15s;
        }
        .chat-send:hover { background: #5558e6; }
        .chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .chat-color-btn {
            width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e5e7eb;
            background: #fff; cursor: pointer; font-size: 0.85rem; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.15s;
        }
        .chat-color-btn:hover { border-color: #d1d5db; background: #f9fafb; }
        .chat-color-btn.active { border-color: #ef4444; background: #fef2f2; }
        .chat-color-btn.active .color-dot { background: #ef4444; }
        .color-dot { width: 10px; height: 10px; border-radius: 50%; background: #888; transition: background 0.15s; }

        .chat-login-hint {
            text-align: center; padding: 1rem; color: #999; font-size: 0.82rem;
        }
        .chat-login-hint a { color: #6366f1; text-decoration: none; }
    `;

    const HTML = `
        <button class="chat-fab" id="chatFab" onclick="chatToggle()">
            💬
            <div class="badge-dot" id="chatBadge"></div>
        </button>
        <div class="chat-panel" id="chatPanel">
            <div class="chat-header">
                <div>
                    <h3>全站聊天</h3>
                    <div class="online" id="chatOnline"></div>
                </div>
                <button class="chat-close" onclick="chatToggle()">✕</button>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div id="chatInputArea"></div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = HTML;
    document.body.appendChild(wrapper);

    const SUPABASE_URL = "https://mxajreukeniayoqyvybe.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YWpyZXVrZW5pYXlvcXl2eWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTkyNDYsImV4cCI6MjEwMzQzNTI0Nn0.J3H9pFK2dc3KOLL8d64a7HEznm-fkJUNZN4YdMu5jD4";

    let supabase = null;
    let currentUser = null;
    let currentProfile = null;
    let chatOpen = false;
    let lastMsgId = null;
    let pollInterval = null;
    let chatRedMode = false;

    function getAvatarHTML(url, size) {
        if (url) return `<img src="${url}" style="width:${size}px;height:${size}px;border-radius:8px;object-fit:cover">`;
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="${size*0.6}" height="${size*0.6}"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }

    async function initChat() {
        if (typeof window.supabase === 'undefined') return;
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session;
            const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
            currentProfile = profile || { username: session.user.email, avatar_url: '' };

            document.getElementById('chatInputArea').innerHTML = `
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="输入消息..." maxlength="500">
                    <button class="chat-color-btn" id="chatColorBtn" onclick="chatColorToggle()" title="切换红色字体"><span class="color-dot"></span></button>
                    <button class="chat-send" id="chatSendBtn" onclick="chatSend()">发送</button>
                </div>
            `;
            document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') chatSend(); });
        } else {
            document.getElementById('chatInputArea').innerHTML = `<div class="chat-login-hint"><a href="login.html">登录</a>后参与聊天</div>`;
        }

        loadMessages();
        pollInterval = setInterval(loadMessages, 3000);
    }

    async function loadMessages() {
        if (!supabase) return;
        const { data } = await supabase.from('chat_messages')
            .select('*').order('created_at', { ascending: true }).limit(50);

        if (!data) return;

        const container = document.getElementById('chatMessages');
        const isScrolled = container.scrollTop + container.clientHeight >= container.scrollHeight - 30;

        container.innerHTML = data.map(m => {
            const isMine = currentUser && m.user_id === currentUser.user.id;
            const time = new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            let msgText = escapeHtml(m.message);
            let msgStyle = '';
            if (msgText.startsWith('[red]')) {
                msgText = msgText.substring(5);
                msgStyle = 'color:#ef4444;font-weight:600;';
            }
            return `<div class="chat-msg ${isMine ? 'mine' : ''}">
                <div class="msg-avatar">${getAvatarHTML(m.avatar_url, 32)}</div>
                <div class="msg-body">
                    <div class="msg-name">${m.username}</div>
                    <div class="msg-text" style="${msgStyle}">${msgText}</div>
                    <div class="msg-time">${time}</div>
                </div>
            </div>`;
        }).join('');

        if (data.length > 0 && lastMsgId !== data[data.length-1].id) {
            if (isScrolled || !lastMsgId) container.scrollTop = container.scrollHeight;
            lastMsgId = data[data.length-1].id;
        }
    }

    async function chatSend() {
        if (!currentUser || !currentProfile) return;
        const input = document.getElementById('chatInput');
        const msg = input.value.trim();
        if (!msg) return;

        const btn = document.getElementById('chatSendBtn');
        btn.disabled = true;
        const finalMsg = chatRedMode ? '[red]' + msg : msg;
        input.value = '';

        await supabase.from('chat_messages').insert([{
            user_id: currentUser.user.id,
            username: currentProfile.username || currentUser.user.email,
            avatar_url: currentProfile.avatar_url || '',
            message: finalMsg
        }]);

        btn.disabled = false;
        loadMessages();
    }

    function escapeHtml(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    window.chatToggle = function() {
        chatOpen = !chatOpen;
        document.getElementById('chatPanel').classList.toggle('open', chatOpen);
        if (chatOpen) {
            const container = document.getElementById('chatMessages');
            setTimeout(() => container.scrollTop = container.scrollHeight, 100);
        }
    };

    window.chatColorToggle = function() {
        chatRedMode = !chatRedMode;
        document.getElementById('chatColorBtn').classList.toggle('active', chatRedMode);
    };

    window.chatSend = chatSend;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();

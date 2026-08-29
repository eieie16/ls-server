(function() {
    const SUPABASE_URL = "https://mxajreukeniayoqyvybe.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YWpyZXVrZW5pYXlvcXl2eWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTkyNDYsImV4cCI6MjEwMzQzNTI0Nn0.J3H9pFK2dc3KOLL8d64a7HEznm-fkJUNZN4YdMu5jD4";
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const isDark = getComputedStyle(document.body).backgroundColor === 'rgb(13, 13, 13)' ||
                   document.querySelector('.hero') !== null ||
                   document.querySelector('.badge') !== null;

    function createBell(session) {
        const nav = document.getElementById('navRight') || document.getElementById('navAuth');
        if (!nav) return;
        if (document.getElementById('notifBell')) return;

        const badgeDisplay = session ? '' : 'display:none;';
        const bellColor = isDark ? '#a0a0a0' : '#666';
        const hoverColor = isDark ? '#f5f5f5' : '#1a1a1a';

        const bellHTML = `<a href="notifications.html" id="notifBell" style="position:relative;text-decoration:none;font-size:1.1rem;color:${bellColor};transition:color 0.15s;line-height:1;flex-shrink:0" onmouseover="this.style.color='${hoverColor}'" onmouseout="this.style.color='${bellColor}'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span id="notifBadge" style="position:absolute;top:-4px;right:-6px;background:#ef4444;color:#fff;font-size:0.65rem;font-weight:600;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;${badgeDisplay}">0</span>
        </a>`;

        const userBadge = nav.querySelector('.user-badge');
        if (userBadge) {
            userBadge.insertAdjacentHTML('afterend', bellHTML);
        } else {
            nav.insertAdjacentHTML('afterbegin', bellHTML);
        }

        if (session) loadCount(session.user.id);
    }

    async function loadCount(userId) {
        try {
            const { count } = await client.from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId).eq('read', false);
            const badge = document.getElementById('notifBadge');
            if (!badge) return;
            if (count && count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } catch (e) {}
    }

    async function init() {
        const { data: { session } } = await client.auth.getSession();
        createBell(session);
    }

    function waitForNavAndInit() {
        const nav = document.getElementById('navRight') || document.getElementById('navAuth');
        if (nav && nav.children.length > 0) {
            init();
        } else {
            setTimeout(waitForNavAndInit, 50);
        }
    }

    window.updateBellCount = async function() {
        const { data: { session } } = await client.auth.getSession();
        if (session) await loadCount(session.user.id);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(waitForNavAndInit, 100);
        });
    } else {
        setTimeout(waitForNavAndInit, 100);
    }
})();

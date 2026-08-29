(function() {
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
        <div class="footer-inner">
            <div class="footer-left">
                <div class="footer-brand">凌云城</div>
                <div class="footer-desc">【凌云城-轻RP 4.0】角色扮演服务器</div>
            </div>
            <div class="footer-links">
                <a href="index.html">首页</a>
                <a href="features.html">特色</a>
                <a href="rules.html">规则</a>
                <a href="connect.html">加入</a>
                <a href="forum.html">论坛</a>
                <a href="redeem.html">兑换</a>
            </div>
            <div class="footer-contact">
                <a href="https://kook.vip/71Hw5z" target="_blank">Kook</a>
                <a href="https://qm.qq.com/q/zzUzFa6ytw" target="_blank">QQ 群</a>
            </div>
            <div class="footer-copy">&copy; 2025 凌云城. All rights reserved.</div>
        </div>
    `;

    var style = document.createElement('style');
    style.textContent = `
        .site-footer {
            margin-top: 3rem; padding: 2rem 1.5rem 1.5rem;
            background: #1a1a2e; color: #999; font-size: 0.82rem;
        }
        .footer-inner { max-width: 900px; margin: 0 auto; text-align: center; }
        .footer-brand { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.3rem; }
        .footer-desc { margin-bottom: 1rem; color: #777; }
        .footer-links { display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
        .footer-links a { color: #aaa; text-decoration: none; transition: color 0.15s; }
        .footer-links a:hover { color: #6366f1; }
        .footer-contact { display: flex; justify-content: center; gap: 1rem; margin-bottom: 1rem; }
        .footer-contact a { color: #6366f1; text-decoration: none; }
        .footer-contact a:hover { text-decoration: underline; }
        .footer-copy { color: #555; font-size: 0.75rem; }
    `;
    document.head.appendChild(style);

    var container = document.querySelector('.container') || document.querySelector('.layout') || document.body;
    container.appendChild(footer);
})();

(function() {
    var style = document.createElement('style');
    style.textContent = `
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 0.4rem; z-index: 101; }
        .hamburger span { display: block; width: 20px; height: 2px; background: #333; margin: 4px 0; transition: all 0.2s; border-radius: 1px; }
        .hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(4px, 4px); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(4px, -4px); }
        .mobile-overlay {
            display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.3); z-index: 99;
        }
        .mobile-overlay.open { display: block; }
        @media (max-width: 768px) {
            .hamburger { display: block; }
            .nav-center {
                display: none; position: fixed; top: 64px; left: 0; right: 0;
                background: #fff; flex-direction: column; padding: 1rem 2rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100;
                border-bottom: 1px solid #e5e7eb;
            }
            .nav-center.open { display: flex; }
            .nav-center li { padding: 0.5rem 0; }
            .nav-center a { font-size: 0.95rem; }
            .nav-right { gap: 0.5rem; }
            .nav-btn { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
            .user-badge span { display: none; }
        }
    `;
    document.head.appendChild(style);

    function init() {
        var nav = document.querySelector('nav');
        if (!nav) return;

        var logo = nav.querySelector('.logo');
        var hamburger = document.createElement('button');
        hamburger.className = 'hamburger';
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        hamburger.onclick = function() {
            hamburger.classList.toggle('open');
            var center = nav.querySelector('.nav-center');
            if (center) center.classList.toggle('open');
            var overlay = document.querySelector('.mobile-overlay');
            if (overlay) overlay.classList.toggle('open');
        };
        logo.parentNode.insertBefore(hamburger, logo.nextSibling);

        var overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.onclick = function() {
            hamburger.classList.remove('open');
            overlay.classList.remove('open');
            var center = nav.querySelector('.nav-center');
            if (center) center.classList.remove('open');
        };
        document.body.appendChild(overlay);

        nav.querySelectorAll('.nav-center a').forEach(function(a) {
            a.addEventListener('click', function() {
                hamburger.classList.remove('open');
                overlay.classList.remove('open');
                var center = nav.querySelector('.nav-center');
                if (center) center.classList.remove('open');
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

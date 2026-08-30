/* ===== 凌云城 自定义弹窗组件 ===== */

function showModal(opts) {
    return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s;';

        var icon = '';
        if (opts.type === 'success') icon = '<div style="width:48px;height:48px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 1rem">✅</div>';
        else if (opts.type === 'error') icon = '<div style="width:48px;height:48px;border-radius:50%;background:#fef2f2;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 1rem">❌</div>';
        else if (opts.type === 'warning') icon = '<div style="width:48px;height:48px;border-radius:50%;background:#fef9c3;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 1rem">⚠️</div>';
        else if (opts.type === 'info') icon = '<div style="width:48px;height:48px;border-radius:50%;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 1rem">ℹ️</div>';
        else if (opts.type === 'confirm') icon = '<div style="width:48px;height:48px;border-radius:50%;background:#fef9c3;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 1rem">❓</div>';

        var inputHtml = '';
        if (opts.input) {
            inputHtml = '<input type="' + (opts.inputType || 'text') + '" id="modalInput" value="' + (opts.inputValue || '') + '" placeholder="' + (opts.inputPlaceholder || '') + '" style="width:100%;padding:0.65rem 0.85rem;border:1px solid #e5e7eb;border-radius:8px;font-size:0.88rem;margin-top:0.75rem;outline:none;box-sizing:border-box">';
        }

        var btns = '';
        if (opts.type === 'confirm') {
            btns = '<button class="modal-btn modal-btn-cancel" id="modalCancel">取消</button><button class="modal-btn modal-btn-primary" id="modalOk">确定</button>';
        } else if (opts.type === 'prompt') {
            btns = '<button class="modal-btn modal-btn-cancel" id="modalCancel">取消</button><button class="modal-btn modal-btn-primary" id="modalOk">确定</button>';
        } else {
            btns = '<button class="modal-btn modal-btn-primary" id="modalOk">' + (opts.btnText || '确定') + '</button>';
        }

        overlay.innerHTML = '<div class="modal-box" style="background:#fff;border-radius:16px;padding:2rem;max-width:400px;width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.15);animation:slideUp .2s;">' +
            icon +
            (opts.title ? '<h3 style="font-size:1.05rem;font-weight:600;margin-bottom:0.5rem;color:#1a1a1a">' + opts.title + '</h3>' : '') +
            (opts.message ? '<p style="font-size:0.88rem;color:#666;line-height:1.5;margin-bottom:1rem">' + opts.message + '</p>' : '') +
            inputHtml +
            '<div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1.25rem">' + btns + '</div>' +
        '</div>';

        document.body.appendChild(overlay);

        // Focus input
        var input = document.getElementById('modalInput');
        if (input) {
            setTimeout(function() { input.focus(); }, 100);
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { overlay.remove(); resolve(input.value); }
                if (e.key === 'Escape') { overlay.remove(); resolve(null); }
            });
        }

        // Button handlers
        var okBtn = document.getElementById('modalOk');
        var cancelBtn = document.getElementById('modalCancel');

        okBtn.addEventListener('click', function() {
            overlay.remove();
            resolve(input ? input.value : true);
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                overlay.remove();
                resolve(null);
            });
        }

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) { overlay.remove(); resolve(null); }
        });
    });
}

// Convenience functions
function modalAlert(msg, type) {
    return showModal({ type: type || 'info', message: msg });
}

function modalConfirm(msg, title) {
    return showModal({ type: 'confirm', title: title || '确认操作', message: msg });
}

function modalPrompt(msg, opts) {
    return showModal(Object.assign({ type: 'prompt', title: '请输入', message: msg }, opts || {}));
}

// Inject CSS animations
if (!document.getElementById('modalStyle')) {
    var s = document.createElement('style');
    s.id = 'modalStyle';
    s.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}.modal-btn{padding:0.55rem 1.5rem;border-radius:8px;font-size:0.88rem;font-weight:500;cursor:pointer;border:none;transition:all .15s;min-width:80px;}.modal-btn-primary{background:#6366f1;color:#fff;}.modal-btn-primary:hover{background:#5558e6;}.modal-btn-cancel{background:#f3f4f6;color:#666;}.modal-btn-cancel:hover{background:#e5e7eb;}';
    document.head.appendChild(s);
}

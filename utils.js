/* ===== 凌云城 共享工具 ===== */

function sanitizeHTML(str) {
    if (!str) return '';
    str = String(str);
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    str = str.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    str = str.replace(/<embed\b[^>]*>/gi, '');
    str = str.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
    str = str.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    str = str.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
    str = str.replace(/javascript\s*:/gi, '');
    str = str.replace(/data\s*:/gi, '');
    return str;
}

// Prevent duplicate submissions
const _submittingMap = new Map();
function preventDoubleSubmit(key, fn) {
    if (_submittingMap.get(key)) return Promise.resolve();
    _submittingMap.set(key, true);
    return fn().finally(function() { setTimeout(function() { _submittingMap.set(key, false); }, 2000); });
}

// 敏感词过滤
var BANNED_WORDS = ['fuck','shit','damn','ass','hate','傻逼','操你','妈的','废物','垃圾',
    '去死','脑残','智障','弱智','傻B','SB','cnm','nmsl','死全家'];

function checkBannedWords(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < BANNED_WORDS.length; i++) {
        if (lower.indexOf(BANNED_WORDS[i]) !== -1) {
            return BANNED_WORDS[i];
        }
    }
    return null;
}

function maskBannedWords(text) {
    var result = text;
    BANNED_WORDS.forEach(function(word) {
        var regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        result = result.replace(regex, function(match) {
            return match[0] + '*'.repeat(match.length - 1);
        });
    });
    return result;
}

// 通用 loading 按钮状态
function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.dataset.origText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px"><span class="btn-spinner"></span>处理中...</span>';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.origText || btn.textContent;
    }
}

// 通用 toast 提示
function showToast(msg, type) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:2rem;right:2rem;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.85rem;z-index:9999;color:#fff;animation:fadeIn .2s;';
    t.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
}

// 通用分页组件
function renderPagination(containerId, currentPage, totalPages, onChange) {
    var el = document.getElementById(containerId);
    if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }

    var html = '<div class="pagination">';
    if (currentPage > 1) html += '<button class="page-btn" data-page="' + (currentPage - 1) + '">&laquo;</button>';

    var start = Math.max(1, currentPage - 2);
    var end = Math.min(totalPages, currentPage + 2);
    if (start > 1) html += '<button class="page-btn" data-page="1">1</button>';
    if (start > 2) html += '<span class="page-dots">...</span>';
    for (var i = start; i <= end; i++) {
        html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    if (end < totalPages - 1) html += '<span class="page-dots">...</span>';
    if (end < totalPages) html += '<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';

    if (currentPage < totalPages) html += '<button class="page-btn" data-page="' + (currentPage + 1) + '">&raquo;</button>';
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.page-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { onChange(parseInt(btn.dataset.page)); });
    });
}

/* ===== 凌云城 富文本编辑器 ===== */
function createEditor(containerId, opts) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const defaults = { height: 260, placeholder: '请输入内容...' };
    const cfg = Object.assign({}, defaults, opts || {});

    container.innerHTML = `
    <div class="editor-wrap">
        <div class="editor-toolbar">
            <select class="ed-select" data-cmd="fontSize">
                <option value="">字号</option>
                <option value="1">很小</option>
                <option value="2">小</option>
                <option value="3" selected>中</option>
                <option value="4">大</option>
                <option value="5">很大</option>
                <option value="6">超大</option>
                <option value="7">极大</option>
            </select>
            <select class="ed-select" data-cmd="fontName">
                <option value="">字体</option>
                <option value="微软雅黑">微软雅黑</option>
                <option value="宋体">宋体</option>
                <option value="黑体">黑体</option>
                <option value="楷体">楷体</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
            </select>
            <span class="ed-sep"></span>
            <button type="button" class="ed-btn" data-cmd="bold" title="加粗"><b>B</b></button>
            <button type="button" class="ed-btn" data-cmd="italic" title="斜体"><i>I</i></button>
            <button type="button" class="ed-btn" data-cmd="underline" title="下划线"><u>U</u></button>
            <button type="button" class="ed-btn" data-cmd="strikeThrough" title="删除线"><s>S</s></button>
            <span class="ed-sep"></span>
            <button type="button" class="ed-btn ed-color" data-cmd="foreColor" title="字体颜色">
                <span class="color-bar" style="background:#f00">A</span>
            </button>
            <button type="button" class="ed-btn ed-color" data-cmd="hiliteColor" title="背景颜色">
                <span class="color-bar" style="background:#ff0">A</span>
            </button>
            <input type="color" class="ed-colorpicker" id="edColor_${containerId}" value="#ff0000">
            <span class="ed-sep"></span>
            <button type="button" class="ed-btn" data-cmd="justifyLeft" title="左对齐">&#9776;</button>
            <button type="button" class="ed-btn" data-cmd="justifyCenter" title="居中">&#9776;</button>
            <button type="button" class="ed-btn" data-cmd="justifyRight" title="右对齐">&#9776;</button>
            <span class="ed-sep"></span>
            <button type="button" class="ed-btn" data-cmd="insertUnorderedList" title="无序列表">&#8226;</button>
            <button type="button" class="ed-btn" data-cmd="insertOrderedList" title="有序列表">1.</button>
            <button type="button" class="ed-btn" data-cmd="indent" title="增加缩进">&#8677;</button>
            <button type="button" class="ed-btn" data-cmd="outdent" title="减少缩进">&#8676;</button>
            <span class="ed-sep"></span>
            <button type="button" class="ed-btn" data-cmd="removeFormat" title="清除格式">&#128295;</button>
            <button type="button" class="ed-btn" data-cmd="undo" title="撤销">&#8617;</button>
            <button type="button" class="ed-btn" data-cmd="redo" title="重做">&#8618;</button>
            <span class="ed-sep"></span>
            <button type="button" class="ed-btn" data-action="link" title="插入链接">&#128279;</button>
            <button type="button" class="ed-btn" data-action="image" title="插入图片">&#128247;</button>
            <button type="button" class="ed-btn" data-action="quote" title="引用">&#128172;</button>
            <button type="button" class="ed-btn" data-action="code" title="代码块">&lt;/&gt;</button>
            <button type="button" class="ed-btn" data-action="hr" title="分割线">&#8213;</button>
        </div>
        <div class="editor-body" id="editorBody_${containerId}" contenteditable="true" style="min-height:${cfg.height}px" data-placeholder="${cfg.placeholder}"></div>
    </div>`;

    const body = document.getElementById('editorBody_' + containerId);
    const colorPicker = document.getElementById('edColor_' + containerId);
    let lastColorCmd = 'foreColor';

    // Placeholder
    function checkPlaceholder() {
        const text = body.innerText.trim();
        if (!text && !body.querySelector('img')) {
            body.classList.add('empty');
        } else {
            body.classList.remove('empty');
        }
    }
    body.addEventListener('input', checkPlaceholder);
    body.addEventListener('focus', function() { body.classList.remove('empty'); });
    body.addEventListener('blur', checkPlaceholder);
    checkPlaceholder();

    // Toolbar buttons
    container.querySelectorAll('.ed-btn[data-cmd]').forEach(function(btn) {
        btn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            document.execCommand(btn.dataset.cmd, false, null);
            body.focus();
        });
    });

    container.querySelectorAll('.ed-btn[data-action]').forEach(function(btn) {
        btn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            var action = btn.dataset.action;
            if (action === 'link') {
                var url = prompt('请输入链接地址:', 'https://');
                if (url) document.execCommand('createLink', false, url);
            } else if (action === 'image') {
                var imgUrl = prompt('请输入图片地址:', 'https://');
                if (imgUrl) document.execCommand('insertImage', false, imgUrl);
            } else if (action === 'quote') {
                document.execCommand('formatBlock', false, 'blockquote');
            } else if (action === 'code') {
                document.execCommand('formatBlock', false, 'pre');
            } else if (action === 'hr') {
                document.execCommand('insertHorizontalRule', false, null);
            }
            body.focus();
        });
    });

    // Select commands (font size / font name)
    container.querySelectorAll('.ed-select').forEach(function(sel) {
        sel.addEventListener('change', function() {
            if (sel.dataset.cmd && sel.value) {
                document.execCommand(sel.dataset.cmd, false, sel.value);
                body.focus();
            }
        });
    });

    // Color picker
    colorPicker.addEventListener('input', function() {
        document.execCommand(lastColorCmd, false, colorPicker.value);
        body.focus();
    });
    container.querySelectorAll('.ed-color').forEach(function(btn) {
        btn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            lastColorCmd = btn.dataset.cmd;
            colorPicker.click();
        });
    });

    // Keyboard shortcuts
    body.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
            if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
            if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
        }
        // Tab indent
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
        }
    });

    // Toolbar CSS
    if (!document.getElementById('editorStyle')) {
        var style = document.createElement('style');
        style.id = 'editorStyle';
        style.textContent = `
.editor-wrap { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; transition: border-color 0.15s; background: #fff; }
.editor-wrap:focus-within { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.editor-toolbar {
    display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
    padding: 6px 8px; background: #fafafa; border-bottom: 1px solid #e5e7eb;
}
.ed-btn {
    width: 30px; height: 28px; border: none; background: transparent;
    border-radius: 4px; cursor: pointer; font-size: 13px; color: #555;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s;
}
.ed-btn:hover { background: #e5e7eb; }
.ed-btn:active { background: #d1d5db; }
.ed-select {
    height: 28px; border: 1px solid #d1d5db; border-radius: 4px;
    font-size: 12px; padding: 0 4px; background: #fff; color: #555; cursor: pointer;
}
.ed-sep { width: 1px; height: 20px; background: #d1d5db; margin: 0 4px; flex-shrink: 0; }
.ed-color { position: relative; }
.ed-color .color-bar { font-weight: 700; font-size: 13px; }
.ed-colorpicker { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
.editor-body {
    padding: 14px 16px; min-height: 200px; outline: none;
    font-size: 14px; line-height: 1.8; color: #333; overflow-y: auto;
    word-break: break-word;
}
.editor-body:empty::before {
    content: attr(data-placeholder); color: #bbb; pointer-events: none;
}
.editor-body blockquote {
    border-left: 3px solid #6366f1; padding-left: 12px; margin: 8px 0;
    color: #666; background: #f9fafb; border-radius: 0 4px 4px 0;
}
.editor-body pre {
    background: #f3f4f6; padding: 10px 14px; border-radius: 6px;
    font-family: 'Courier New', monospace; font-size: 13px;
    overflow-x: auto; border: 1px solid #e5e7eb;
}
.editor-body img { max-width: 100%; border-radius: 6px; margin: 6px 0; }
.editor-body a { color: #6366f1; }
`;
        document.head.appendChild(style);
    }

    return {
        getHTML: function() { return body.innerHTML.trim(); },
        setHTML: function(html) { body.innerHTML = html; checkPlaceholder(); },
        clear: function() { body.innerHTML = ''; checkPlaceholder(); },
        focus: function() { body.focus(); }
    };
}

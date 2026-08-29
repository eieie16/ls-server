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
            <select class="ed-select ed-select-font" data-cmd="fontName">
                <option value="">字体</option>
                <option value="微软雅黑">微软雅黑</option>
                <option value="宋体">宋体</option>
                <option value="黑体">黑体</option>
                <option value="楷体">楷体</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times</option>
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
            <button type="button" class="ed-btn ed-color" data-cmd="backColor" title="背景颜色">
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
    var savedSelection = null;

    function saveSelection() {
        var sel = window.getSelection();
        if (sel.rangeCount > 0) {
            savedSelection = sel.getRangeAt(0).cloneRange();
        }
    }

    function restoreSelection() {
        if (savedSelection) {
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelection);
        }
    }

    colorPicker.addEventListener('input', function() {
        restoreSelection();
        document.execCommand(lastColorCmd, false, colorPicker.value);
        body.focus();
    });

    container.querySelectorAll('.ed-color').forEach(function(btn) {
        btn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            saveSelection();
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
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
        }
    });

    // Paste format cleanup - strip dirty styles from Word/web
    body.addEventListener('paste', function(e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/html') || (e.clipboardData || window.clipboardData).getData('text/plain');
        if (e.clipboardData.getData('text/html')) {
            var tmp = document.createElement('div');
            tmp.innerHTML = text;
            var clean = tmp.textContent || tmp.innerText || '';
            document.execCommand('insertText', false, clean);
        } else {
            document.execCommand('insertText', false, text);
        }
    });

    // Emoji picker
    var emojiBtn = document.createElement('button');
    emojiBtn.type = 'button';
    emojiBtn.className = 'ed-btn';
    emojiBtn.title = '表情';
    emojiBtn.textContent = '😀';
    emojiBtn.style.fontSize = '16px';
    emojiBtn.addEventListener('mousedown', function(e) {
        e.preventDefault();
        toggleEmojiPanel();
    });
    container.querySelector('.editor-toolbar').appendChild(emojiBtn);

    var emojiPanel = document.createElement('div');
    emojiPanel.className = 'emoji-panel';
    emojiPanel.style.display = 'none';
    var EMOJIS = '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕😟🙁☹️😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👹👺👻👽👾🤖😺😸😹😻😼😽🙀😿😾🙈🙉🙊💌💘💝💖💗💓💞💕💟❣️💔❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝🎶🎵🎤🎧🎼🎹🥁🎷🎺🎸🪕🎻🏠🏡🏢🏣🏤🏥🏦🏨🏩🏪🏫🏬🏭🏯🏰💒🗼🗽⛪🕌🛕🕍⛩🕋⛲⛺🌁🌃🏙🌄🌅🌠🎆🎇幽默 Beckoning 🫳 \uD83E\uDEE4 🫴 \uD83E\uDEE2 🫷 \uD83E\uDEE7 🫸 \uD83E\uDEE8 👌🤌🤏✌️🤞🫰🤟🤘🤙👈👉👆🖕👇☝️🫵👍👎✊👊🤛🤜👏🙌👐🤲🤝🙏✍️💅🤳💪🦾🦿🦵🦶👂🦻👃🧠🫀🫁🦷🦴👀👁👅👄👶🧒👦👧🧑👱👨🧔👩🧓👴👵🙍🙎🙅🙆💁🙋🧏🙇🤦🤷👮🕵️💂🥷👷🫅🤴👸👳👲🧕🤵👰🤰🫃🫄🤱👼🎅🧙🧚🧛🧜🧝🧞🧟🧌👳👲🧕🤵👰🤰🤱👼🎅🧙🧚🧛🧜🧝🧞🧟🧌';
    var emojiChars = EMOJIS.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{2764}\u{FE0F}\u{20E3}\u{1F466}-\u{1F469}\u{1F468}\u{1F467}\u{200D}\u{2695}\u{200D}\u{2640}\u{200D}\u{2642}\u{200D}\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}]/gu) || [];
    // Simple fallback: common emojis
    var SIMPLE_EMOJIS = ['😀','😂','🤣','😊','😍','🥰','😘','😜','🤪','😝','🤔','😏','🙄','😬','😴','🥳','😎','🤓','😡','😱','🥺','😭','😤','👍','👎','❤️','🔥','💯','✨','🎉','🎊','💪','🙏','👏','🙌','🤝','✌️','🤞','💕','💖','💗','🎶','🎵','🎮','🏆','⭐','🌟','💡','📢','📌','🎯','🚀','💎','🎁','🔔','✅','❌','⚠️','💬','📝','🔗','📸','🎬','💻','🔧','🎮','🕹️','🎰','🎲','🃏','🀄','🏆','🥇','🥈','🥉','🏅','⚽','🏀','🏈','⚾','🎾','🏐','🎱','🏓','🏸','🥊','🥋','🎽','🛹','🛼','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🎖️','🏅','🥇','🥈','🥉'];
    emojiPanel.innerHTML = '<div class="emoji-grid">' + SIMPLE_EMOJIS.map(function(e) {
        return '<span class="emoji-item" data-emoji="' + e + '">' + e + '</span>';
    }).join('') + '</div>';
    body.parentNode.appendChild(emojiPanel);

    emojiPanel.addEventListener('mousedown', function(e) {
        var item = e.target.closest('.emoji-item');
        if (item) {
            e.preventDefault();
            restoreSelection();
            document.execCommand('insertText', false, item.dataset.emoji);
            body.focus();
            emojiPanel.style.display = 'none';
        }
    });

    function toggleEmojiPanel() {
        saveSelection();
        var isVisible = emojiPanel.style.display === 'block';
        emojiPanel.style.display = isVisible ? 'none' : 'block';
    }

    // Char count & word count
    var charCountEl = document.createElement('div');
    charCountEl.className = 'editor-charcount';
    body.parentNode.appendChild(charCountEl);

    function updateCharCount() {
        var text = body.innerText || '';
        var chars = text.replace(/\s/g, '').length;
        charCountEl.textContent = chars + ' 字';
        charCountEl.style.color = chars > 5000 ? '#ef4444' : '#999';
    }
    body.addEventListener('input', updateCharCount);
    updateCharCount();

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
    width: 30px; height: 28px; min-width: 30px; border: none; background: transparent;
    border-radius: 4px; cursor: pointer; font-size: 13px; color: #555;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s; flex-shrink: 0;
}
.ed-btn:hover { background: #e5e7eb; }
.ed-btn:active { background: #d1d5db; }
.editor-wrap .ed-select {
    height: 28px; border: 1px solid #d1d5db; border-radius: 4px;
    font-size: 12px; padding: 0 6px; background: #fff; color: #555; cursor: pointer;
    flex-shrink: 0; width: auto;
}
.editor-wrap .ed-select[data-cmd="fontSize"] { width: 62px !important; }
.editor-wrap .ed-select-font { width: 88px !important; }
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
.emoji-panel {
    position: absolute; z-index: 100; background: #fff; border: 1px solid #e5e7eb;
    border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 8px;
    max-width: 320px; max-height: 200px; overflow-y: auto;
}
.emoji-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; }
.emoji-item {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; border-radius: 4px; font-size: 18px; transition: background 0.1s;
}
.emoji-item:hover { background: #f3f4f6; }
.editor-charcount { text-align: right; font-size: 0.72rem; color: #999; padding: 4px 8px; background: #fafafa; border-top: 1px solid #f0f0f0; }
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

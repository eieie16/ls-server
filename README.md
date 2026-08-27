# 凌云城-轻RP 4.0 官网

## 本地预览
双击打开 `index.html` 即可在浏览器中查看。

## 部署到 GitHub Pages

### 步骤一：安装 Git（如果还没装）
1. 访问 https://git-scm.com/download/win
2. 下载并安装，一路下一步即可

### 步骤二：创建 GitHub 仓库
1. 打开 https://github.com/new
2. 仓库名填：`ls-server`（或你喜欢的名字）
3. 设为 Public
4. 不要勾选 "Initialize this repository with a README"
5. 点击 Create repository

### 步骤三：上传文件
方法A（推荐，最简单）：
1. 在仓库页面点击 "Add file" → "Upload files"
2. 把 `index.html`、`features.html`、`rules.html`、`connect.html` 拖进去
3. 点击 "Commit changes"

方法B（用 Git）：
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 步骤四：开启 GitHub Pages
1. 进入仓库 Settings → Pages
2. Source 选 "Deploy from a branch"
3. Branch 选 main，文件夹选 / (root)
4. 点击 Save
5. 等待约1-2分钟，访问 `https://你的用户名.github.io/仓库名`

---

## 文件说明
| 文件 | 页面 |
|------|------|
| `index.html` | 首页 |
| `features.html` | 服务器特色 |
| `rules.html` | 服务器规则 |
| `connect.html` | 如何加入 |

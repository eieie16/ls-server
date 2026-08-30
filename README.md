# 凌云城-轻RP 4.0 官网

## 文件说明
| 文件 | 说明 |
|------|------|
| `index.html` | 首页 |
| `features.html` | 服务器特色 |
| `rules.html` | 服务器规则 |
| `connect.html` | 如何加入 |
| `login.html` | 登录/注册页 |
| `dashboard.html` | 用户面板 |
| `admin.html` | 管理员后台 |

---

## Supabase 配置步骤

### 1. 创建 Supabase 项目
1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 填写项目信息：
   - Name: `lingyun-cheng`
   - Database Password: 设置一个强密码
   - Region: 选 Singapore（新加坡）
4. 点击 "Create new project"

### 2. 获取 API 配置
1. 进入项目 Dashboard
2. 点击左上角项目名 → Settings → API
3. 复制以下两个值：
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. 配置认证
1. 左侧菜单 Authentication → Providers
2. 启用 **Email**
3. 启用 **Google**（可选，需要配置 Google Cloud Console）

### 4. 运行 SQL 脚本
1. 左侧菜单 SQL Editor
2. 复制 `init.sql` 文件内容
3. 点击 Run

### 5. 替换配置
打开以下文件，替换 `SUPABASE_URL` 和 `SUPABASE_KEY`：
- `login.html`
- `dashboard.html`
- `admin.html`
- `index.html`

```javascript
const SUPABASE_URL = 'https://mxajreukeniayoqvyybe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Yl2py6Pj5XLimcCBT2sXEg_AOa4gKWV';
```

### 6. 创建第一个管理员
1. 在浏览器打开 `login.html`
2. 注册一个账号
3. 在 Supabase Dashboard → Authentication → Users
4. 找到你的用户，复制 User ID
5. SQL Editor 运行：
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = '你的用户ID';
```

---

## 功能说明

### 用户功能
- 邮箱密码注册/登录
- Google 一键登录（需配置 OAuth）
- 个人面板查看游戏数据
- 密码重置

### 管理员功能
- 查看所有注册用户
- 封禁/解封用户
- 创建新用户
- 删除用户
- 修改用户角色

---

## 部署

网站已推送到 GitHub，开启 Pages：
1. 仓库 Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, Folder: /(root)
4. Save

访问：https://eieie16.github.io/ls-server/login.html

Config = {}

-- ==================== 服务器信息 ====================

-- 服务器名称 (显示在UI上)
Config.ServerName = '格格'

-- ==================== 框架设置 ====================

-- 框架选择: 'esx' 或 'qb' 或 'auto' (自动检测)
Config.Framework = 'auto'

-- 名称显示格式
-- 可用变量: {firstname}, {lastname}, {fullname}, {fivem_name}, {job}, {id}
-- 示例: "[{id}] {fullname} ({fivem_name})" => "[1] 张三 (Player123)"
Config.NameFormat = "[{id}] {fullname} | {fivem_name}"

-- 同步间隔 (毫秒) - 定期检查并同步名称
Config.SyncInterval = 30000

-- 是否在玩家加入时同步
Config.SyncOnJoin = true

-- 是否在角色加载/切换时同步
Config.SyncOnCharacterLoad = true

-- 是否显示职业信息
Config.ShowJob = false

-- 职业显示格式 (仅当 ShowJob = true 时生效)
-- 添加到名称后面
Config.JobFormat = " [{job}]"

-- 调试模式
Config.Debug = false

-- 日志输出
Config.EnableLogs = false

-- ==================== 名称匹配检测 ====================

-- 是否启用名称匹配检测 (角色名必须与FiveM昵称一致)
Config.EnableNameMatch = true

-- 匹配模式: 
-- 'fullname' = 角色全名必须与FiveM昵称完全一致
-- 'firstname' = 角色名(firstname)必须与FiveM昵称一致
-- 'contains' = FiveM昵称必须包含角色名
Config.MatchMode = 'fullname'

-- 是否忽略大小写
Config.IgnoreCase = true

-- 是否忽略空格
Config.IgnoreSpaces = true

-- 检测失败后的处理方式:
-- 'warn' = 仅弹出警告提示
-- 'kick' = 踢出玩家
-- 'freeze' = 冻结玩家直到更改
Config.MismatchAction = 'warn'

-- 警告提示持续时间 (秒), 0 = 永久显示直到关闭
Config.WarningDuration = 0

-- 警告提示标题
Config.WarningTitle = '名称不匹配'

-- 警告提示内容 (可用变量: {fivem_name}, {char_name})
Config.WarningMessage = '您的FiveM昵称 [{fivem_name}] 与游戏角色名 [{char_name}] 不一致！\n\n请前往 FiveM 设置中将昵称修改为您的角色名，然后重新连接服务器。'

-- 踢出理由 (仅当 MismatchAction = 'kick' 时生效)
Config.KickReason = '您的FiveM昵称必须与游戏角色名一致，请修改后重新连接。'

-- 检测延迟 (毫秒) - 等待角色完全加载后再检测
Config.CheckDelay = 3000

-- 是否在玩家加入服务器时检测 (角色加载后)
Config.CheckOnJoin = true

-- 加入时检测延迟 (毫秒) - 等待玩家完全连接后再检测
Config.JoinCheckDelay = 5000

-- ==================== 连接阶段检测 (高级) ====================
-- 在玩家连接时就检测，阻止名称不匹配的玩家进入服务器
-- 注意: 这需要查询数据库获取玩家已有的角色名

-- 是否启用连接阶段检测
Config.CheckOnConnect = true

-- 连接阶段检测失败时的提示信息 (支持特殊字符美化)
-- 可用变量: {fivem_name}, {char_name}, {license}
Config.ConnectDenyMessage = [[
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 您的 FiveM 昵称必须与 角色名 一致才能进入服务器 🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 游戏内角色名：  {char_name}
✏️ 当前FiveM昵称：  {fivem_name}
🆔 你的标识符：     {license}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 请按以下步骤更改您的FiveM昵称
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚙️ 1. 点击右上角头像或齿轮图标
  📋 2. 选择「账户设置」→「玩家昵称」
  ✅ 3. 请将 FiveM 昵称更改为: {char_name}
  ✨ 4. 请务必检查是否有空格

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 提示: 更改后即可重新连接服务器啦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤝 需要帮助？请加入我们的社区 🤝
💬 QQ交流群: 1083503452
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
]]

-- 是否允许新玩家 (没有角色的玩家) 连接
-- ⚠ 设为 true 会变成后门：DB 查询失败时也会走这条路放行
-- 推荐 false，真要让新人进来就用 WhitelistIdentifiers
Config.AllowNewPlayers = false

-- 新玩家提示 (如果不允许新玩家)
Config.NewPlayerDenyMessage = [[
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 您还没有创建角色 🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

您的账号尚未在服务器中创建角色。
请联系管理员获取帮助。

🤝 需要帮助？请加入我们的社区 🤝
💬 QQ交流群: 1083503452
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
]]

-- 定期检测间隔 (毫秒), 0 = 不定期检测
Config.PeriodicCheckInterval = 0

-- 白名单 - 这些玩家跳过检测 (使用 license 或 steam 或 discord ID)
Config.WhitelistIdentifiers = {
    -- 'license:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    -- 'steam:xxxxxxxxxxxxxxx',
    -- 'discord:xxxxxxxxxxxxxxxxxx',
}

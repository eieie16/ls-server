# TXSync - 高级名称同步系统

FiveM ESX/QB-Core 双框架支持的高级名称同步资源，将玩家角色名称实时同步至 TX Admin 显示面板。

## 功能特性

- **双框架支持**: 自动检测并支持 ESX 和 QB-Core 框架
- **实时同步**: 玩家登录、角色加载、角色切换时自动同步
- **自定义格式**: 灵活配置显示名称格式
- **职业显示**: 可选显示玩家当前职业
- **定期同步**: 自动定期同步确保数据准确
- **管理命令**: 提供手动同步命令
- **导出函数**: 供其他资源调用

## 安装

1. 将 `txsync` 文件夹放入服务器的 `resources` 目录
2. 在 `server.cfg` 中添加:
   ```
   ensure oxmysql
   ensure es_extended  # 或 qb-core
   ensure txsync
   ```
3. 根据需要修改 `config.lua` 配置

## 依赖

- **oxmysql** - 数据库连接
- **es_extended** 或 **qb-core** - 游戏框架

## 配置说明

```lua
Config = {}

-- 框架选择: 'esx' 或 'qb' 或 'auto' (自动检测)
Config.Framework = 'auto'

-- 名称显示格式
-- 可用变量: {firstname}, {lastname}, {fullname}, {fivem_name}, {job}, {id}
Config.NameFormat = "[{id}] {fullname} | {fivem_name}"

-- 同步间隔 (毫秒)
Config.SyncInterval = 30000

-- 是否在玩家加入时同步
Config.SyncOnJoin = true

-- 是否在角色加载/切换时同步
Config.SyncOnCharacterLoad = true

-- 是否显示职业信息
Config.ShowJob = false

-- 职业显示格式
Config.JobFormat = " [{job}]"

-- 调试模式
Config.Debug = false

-- 日志输出
Config.EnableLogs = true
```

## 名称格式示例

| 格式 | 显示效果 |
|------|----------|
| `[{id}] {fullname} \| {fivem_name}` | [1] 张三 \| Player123 |
| `{fullname} ({fivem_name})` | 张三 (Player123) |
| `[ID:{id}] {firstname} {lastname}` | [ID:1] 张 三 |
| `{fivem_name} - {fullname}` | Player123 - 张三 |

## 管理命令

| 命令 | 权限 | 说明 |
|------|------|------|
| `/txsync` | command.txsync | 同步所有在线玩家名称 |
| `/txsyncplayer [ID]` | command.txsync | 同步指定玩家名称 |

### 权限配置

在 `server.cfg` 中添加:
```
add_ace group.admin command.txsync allow
```

## 导出函数

### 服务端

```lua
-- 同步单个玩家名称
exports['txsync']:SyncPlayerName(source)

-- 同步所有在线玩家
exports['txsync']:SyncAllPlayers()

-- 获取格式化后的显示名称
local name = exports['txsync']:GetFormattedName(source)

-- 获取玩家角色信息
local info = exports['txsync']:GetCharacterInfo(source)
-- info.firstname, info.lastname, info.fullname, info.job, info.id
```

### 客户端

```lua
-- 请求同步当前玩家名称
exports['txsync']:RequestSync()
```

## TX Admin 集成

本资源通过以下方式与 TX Admin 集成:

1. **State Bag**: 将格式化名称存储在玩家的 state bag (`txsync_name`) 中
2. **事件触发**: 触发 `txAdmin:events:playerTagChanged` 事件
3. **控制台日志**: 在服务器控制台输出同步日志

## 支持的事件

### ESX
- `esx:playerLoaded` - 玩家加载
- `esx_multicharacter:CharacterChosen` - 多角色切换
- `esx:setJob` - 职业变更

### QB-Core
- `QBCore:Server:OnPlayerLoaded` - 玩家加载
- `qb-multicharacter:server:loadCharacter` - 多角色切换
- `QBCore:Client:OnJobUpdate` - 职业变更

## 故障排除

1. **名称未同步**: 检查框架是否正确加载，启用 `Config.Debug = true` 查看日志
2. **显示为空**: 确保玩家已完成角色选择/创建
3. **TX Admin 未显示**: 确保 txAdmin (monitor) 资源正在运行

## 许可证

MIT License

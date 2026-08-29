fx_version 'cerulean'
game 'gta5'

author '格格'
description 'ESX/QB高级名称同步插件'
version '1.0.0'

lua54 'yes'

shared_scripts {
    'config.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server.lua'
}

client_scripts {
    'client.lua'
}

escrow_ignore {
    'config.lua'
}

dependencies {
    'oxmysql'
}

dependency '/assetpacks'
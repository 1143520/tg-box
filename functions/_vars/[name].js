export async function onRequestGet({ params, env }) {
    const varName = params.name;
    
    // 添加新的允许访问的环境变量
    const allowedVars = [
        'SYNC_INTERVAL',
        'STORAGE_TYPE',  // 新增：存储类型 (KV 或 TELEGRAM)
        'TELEGRAM_BOT_TOKEN',  // 新增：Telegram Bot Token
        'TELEGRAM_CHAT_ID'  // 新增：Telegram Chat ID
    ];
    
    if (!allowedVars.includes(varName)) {
        return new Response('Forbidden', { 
            status: 403,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    const value = env[varName];
    
    if (value === undefined) {
        return new Response('Not Found', { 
            status: 404,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    return new Response(value, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        }
    });
}

export function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
} 
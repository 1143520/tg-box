export async function onRequestGet({ params, env }) {
    const varName = params.name;
    
    // 添加新的允许访问的环境变量
    const allowedVars = [
        'SYNC_INTERVAL',
        'STORAGE_TYPE',  // 默认存储类型
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_CHAT_ID'
    ];
    
    if (!allowedVars.includes(varName)) {
        return new Response('Forbidden', { 
            status: 403,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    // 特殊处理存储类型
    if (varName === 'STORAGE_TYPE') {
        // 从请求头获取前端设置的存储类型
        const headerStorageType = request.headers.get('X-Storage-Type');
        // 使用前端设置的类型，如果没有则使用环境变量，如果环境变量也没有则使用默认值 'KV'
        const storageType = headerStorageType || env.STORAGE_TYPE || 'KV';
        
        return new Response(storageType, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
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
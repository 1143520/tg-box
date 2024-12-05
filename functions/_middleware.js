async function initializeDatabase(env) {
  if (!env.DB) {
    console.error('Database binding not found in environment');
    throw new Error('Database binding not found - 请在 Cloudflare Pages 设置中绑定 D1 数据库');
  }

  try {
    // 检查数据库连接
    const testQuery = await env.DB.prepare('SELECT 1').first();
    if (!testQuery) {
      throw new Error('数据库连接测试失败');
    }

    // 创建表
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS content_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`数据库初始化失败: ${error.message}`);
  }
}

export async function onRequest(context) {
  try {
    // 检查环境变量
    if (!context.env.DB) {
      throw new Error('Database binding not found - 请在 Cloudflare Pages 设置中绑定 D1 数据库');
    }

    // 初始化数据库
    await initializeDatabase(context.env);
    
    // 处理请求
    const response = await context.next();
    
    // 添加 CORS 头
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error('Middleware error:', error);
    
    // 如果是 OPTIONS 请求，返回 CORS 头
    if (context.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // 返回详细的错误信息
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
} 
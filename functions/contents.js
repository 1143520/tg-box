import TelegramStorage from '../js/telegram.js';

export async function onRequestGet({ request, env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, type, title, content FROM content_blocks ORDER BY id DESC'
    ).all();
    
    return new Response(JSON.stringify(results), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { type, title, content } = await request.json();
    
    if (!type || !title || !content) {
      return new Response(JSON.stringify({ error: '缺少必要字段' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 获取存储类型
    const storageType = env.STORAGE_TYPE || 'KV';

    // 如果是使用Telegram存储，且内容类型是文本
    if (storageType === 'TELEGRAM' && type === 'text') {
      const telegram = new TelegramStorage(
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_CHAT_ID
      );

      // 发送到Telegram
      const messageText = `<b>${title}</b>\n\n${content}`;
      const result = await telegram.sendMessage(messageText);
      
      // 保存到数据库时使用Telegram消息URL
      const { success } = await env.DB.prepare(
        'INSERT INTO content_blocks (type, title, content) VALUES (?, ?, ?)'
      ).bind(type, title, result.url).run();

      if (!success) {
        throw new Error('创建内容失败');
      }

      return new Response(JSON.stringify({ 
        type, 
        title, 
        content: result.url
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 其他情况按原来的逻辑处理
    const { success } = await env.DB.prepare(
      'INSERT INTO content_blocks (type, title, content) VALUES (?, ?, ?)'
    ).bind(type, title, content).run();

    if (!success) {
      throw new Error('创建内容失败');
    }

    return new Response(JSON.stringify({ 
      type, 
      title, 
      content
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
} 
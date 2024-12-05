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

    // 如果是使用Telegram存储，且是文本类内容
    if (storageType === 'TELEGRAM' && ['text', 'poetry', 'code'].includes(type)) {
      const telegram = new TelegramStorage(
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_CHAT_ID
      );

      // 根据不同类型格式化消息
      let messageText;
      if (type === 'code') {
        messageText = `<b>${title}</b>\n\n<pre><code>${content}</code></pre>`;
      } else if (type === 'poetry') {
        // 将诗歌每行用<i>标签包裹
        const formattedPoetry = content
          .split('\n')
          .map(line => `<i>${line}</i>`)
          .join('\n');
        messageText = `<b>${title}</b>\n\n${formattedPoetry}`;
      } else {
        // 普通文本
        messageText = `<b>${title}</b>\n\n${content}`;
      }

      // 发送到Telegram
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
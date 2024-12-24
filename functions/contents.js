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

    // 如果是使用Telegram存储
    if (storageType === 'TELEGRAM') {
      const telegram = new TelegramStorage(
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_CHAT_ID
      );

      // 根据不同类型处理内容
      if (type === 'image') {
        // 对于图片类型，content应该是图片URL
        // 确保URL使用代理格式
        let proxyUrl = content;
        if (content.includes('/file/bot')) {
          const filePath = content.split('/file/bot')[1].split('/')[1];
          proxyUrl = `${new URL(request.url).origin}/images/proxy?path=${filePath}`;
        }
        
        // 保存到数据库
        const { success } = await env.DB.prepare(
          'INSERT INTO content_blocks (type, title, content) VALUES (?, ?, ?)'
        ).bind(type, title, proxyUrl).run();

        if (!success) {
          throw new Error('创建内容失败');
        }

        return new Response(JSON.stringify({ 
          type, 
          title, 
          content: proxyUrl
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else if (['text', 'poetry', 'code'].includes(type)) {
        // 对于文本类内容，使用原有的处理逻辑
        let messageText;
        if (type === 'code') {
          messageText = `<b>${title}</b>\n\n<pre><code>${content}</code></pre>`;
        } else if (type === 'poetry') {
          const formattedPoetry = content
            .split('\n')
            .map(line => `<i>${line}</i>`)
            .join('\n');
          messageText = `<b>${title}</b>\n\n${formattedPoetry}`;
        } else {
          messageText = `<b>${title}</b>\n\n${content}`;
        }

        try {
          const result = await telegram.sendMessage(messageText);
          
          if (result && result.message_id) {
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
          } else {
            throw new Error('发送消息成功但未获取到消息ID');
          }
        } catch (error) {
          console.error('Telegram error:', error);
          throw error;
        }
      }
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
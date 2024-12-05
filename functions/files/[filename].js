export async function onRequestGet({ params, env }) {
  try {
    const filename = params.filename;
    console.log('Requesting file:', filename);
    
    // 使用与图片相同的方式获取文件
    const file = await env.FILES.get(filename, { type: 'arrayBuffer' });
    const metadata = await env.FILES.getWithMetadata(filename);
    
    if (!file) {
      console.log('File not found:', filename);
      return new Response('文件不存在', { 
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 获取原始文件名
    const originalName = metadata?.httpMetadata?.contentDisposition?.match(/filename="(.+)"/)?.[1] || filename;

    return new Response(file, {
      headers: {
        'Content-Type': metadata?.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Access-Control-Allow-Origin': '*',
        'Content-Length': file.byteLength
      }
    });
  } catch (error) {
    console.error('Get file error:', error);
    return new Response('Error fetching file: ' + error.message, { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 
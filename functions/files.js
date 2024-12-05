export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const filename = url.pathname.split('/').pop();
    console.log('Requesting file:', filename);
    
    // 从KV存储获取文件
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
    const originalName = metadata?.metadata?.filename || filename;

    // 返回文件
    return new Response(file, {
      headers: {
        'Content-Type': metadata?.metadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Content-Length': metadata?.metadata?.size || file.byteLength,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
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

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
} 
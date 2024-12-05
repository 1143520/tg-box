export async function onRequestGet({ request, env, params }) {
    try {
        // 处理 CORS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        if (!env.FILES) {
            throw new Error('FILES binding not found');
        }

        const filename = params.name;
        const origin = request.headers.get('origin') || request.url;
        console.log('Requesting file:', filename, 'Origin:', origin);
        
        // 从KV存储获取文件
        const file = await env.FILES.get(filename, { type: 'arrayBuffer' });
        const { metadata } = await env.FILES.getWithMetadata(filename);
        
        if (!file) {
            return new Response('File not found', { 
                status: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            });
        }

        console.log('File found:', {
            size: file.byteLength,
            metadata: metadata,
            filename: filename
        });

        // 设置响应头
        const headers = new Headers({
            'Content-Type': metadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(metadata?.originalName || filename)}"`,
            'Content-Length': file.byteLength.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
            'Accept-Ranges': 'bytes'
        });

        // 返回文件
        return new Response(file, { headers });
    } catch (error) {
        console.error('Get file error:', error);
        return new Response('Error fetching file: ' + error.message, { 
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*'
            }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
        },
    });
} 
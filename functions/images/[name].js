export async function onRequestGet({ request, env, params }) {
    try {
        if (!env.IMAGES) {
            throw new Error('IMAGES binding not found');
        }

        const filename = params.name;
        console.log('Requesting image:', filename);
        
        // 从KV存储获取图片
        const image = await env.IMAGES.get(filename, { type: 'arrayBuffer' });
        const metadata = await env.IMAGES.getWithMetadata(filename);
        
        if (!image) {
            console.log('Image not found:', filename);
            return new Response('Image not found', { 
                status: 404,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 返回图片，设置正确的Content-Type
        return new Response(image, {
            headers: {
                'Content-Type': metadata.metadata?.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Get image error:', error);
        return new Response('Error fetching image: ' + error.message, { 
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export async function onRequestDelete({ request, env, params }) {
    try {
        if (!env.IMAGES) {
            throw new Error('IMAGES binding not found');
        }

        const filename = params.name;
        
        // 从KV存储删除图片
        await env.IMAGES.delete(filename);

        return new Response(JSON.stringify({ message: '图片删除成功' }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Delete image error:', error);
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
            'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
} 
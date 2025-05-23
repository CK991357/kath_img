/**
 * Cloudflare Worker 入口文件
 * 处理所有传入的 HTTP 请求，包括密码验证和与 Cloudinary REST API 的交互。
 */

// 注意：Cloudflare Worker 环境不直接支持 Node.js 的 'crypto' 模块，
// 但它提供了 Web Crypto API。这里我们将使用 Web Crypto API 来生成签名。

/**
 * 生成 Cloudinary API 请求的签名。
 * 适用于需要签名的管理 API 和上传 API 请求。
 * @param {object} params - 需要签名的参数对象。
 * @param {string} apiSecret - Cloudinary API Secret。
 * @returns {Promise<string>} - 返回生成的签名。
 */
async function generateCloudinarySignature(params: Record<string, any>, apiSecret: string): Promise<string> {
  // 对参数进行排序
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => {
      const value = params[key];
      // 如果值是数组，将其转换为逗号分隔的字符串
      if (Array.isArray(value)) {
        return `${key}=${value.join(',')}`;
      }
      return `${key}=${value}`;
    })
    .join('&');

  const stringToSign = `${queryString}${apiSecret}`;

  // 使用 Web Crypto API 计算 SHA1 哈希
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return signature;
}

export default {
  /**
   * Cloudflare Worker 的入口函数，处理所有传入的 HTTP 请求。
   * @param {Request} request - 传入的 Request 对象。
   * @param {object} env - Worker 的环境变量对象，包含 Cloudinary 凭据和密码。
   * @param {ExecutionContext} ctx - Worker 的执行上下文，用于管理生命周期。
   * @returns {Response} - 返回的 Response 对象。
   */
  async fetch(request: Request, env: { CLOUDINARY_CLOUD_NAME: string; CLOUDINARY_API_KEY: string; CLOUDINARY_API_SECRET: string; ASSETS: { fetch: (request: Request) => Promise<Response> } }, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // 直接处理请求，不进行密码验证
      return handleAuthenticatedRequest(request, env, path, method);
    } catch (error: any) {
      console.error('Worker Request Handling Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }
};

/**
 * 处理已认证的请求，分发到不同的 API 处理函数或服务静态文件。
 * @param {Request} request - 传入的 Request 对象。
 * @param {object} env - Worker 的环境变量对象。
 * @param {string} path - 请求路径。
 * @param {string} method - 请求方法。
 * @returns {Response} - 返回的 Response 对象。
 */
async function handleAuthenticatedRequest(request: Request, env: { CLOUDINARY_CLOUD_NAME: string; CLOUDINARY_API_KEY: string; CLOUDINARY_API_SECRET: string; ASSETS: { fetch: (request: Request) => Promise<Response> } }, path: string, method: string): Promise<Response> {
  // Cloudinary 配置信息
  const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME;
  const API_KEY = env.CLOUDINARY_API_KEY;
  const API_SECRET = env.CLOUDINARY_API_SECRET;

  switch (path) {
    case '/api/upload':
      if (method === 'POST') {
        return handleUpload(request, CLOUD_NAME, API_KEY, API_SECRET);
      }
      break;
    case '/api/images':
      if (method === 'GET') {
        return handleGetImages(request, CLOUD_NAME, API_KEY, API_SECRET);
      }
      break;
    case '/api/transform':
      if (method === 'GET') {
        return handleTransformImage(request, CLOUD_NAME);
      }
      break;
    case '/api/save-transformed-image':
      if (method === 'POST') {
        return handleSaveTransformedImage(request, CLOUD_NAME, API_KEY, API_SECRET);
      }
      break;
    case '/api/delete-image':
      if (method === 'DELETE') {
        return handleDeleteImage(request, CLOUD_NAME, API_KEY, API_SECRET);
      }
      break;
  }

  // 如果不是 API 请求，则尝试服务静态文件
  // 使用 ASSETS 绑定来服务 Cloudflare Pages 上的静态文件
  return env.ASSETS.fetch(request);
}

/**
 * 处理图片上传请求，直接调用 Cloudinary Upload API。
 * @param {Request} request - 传入的 Request 对象，包含图片文件数据。
 * @param {string} cloudName - Cloudinary Cloud Name。
 * @param {string} apiKey - Cloudinary API Key。
 * @param {string} apiSecret - Cloudinary API Secret。
 * @returns {Response} - 返回包含图片 URL 的 Response 对象或错误信息。
 */
async function handleUpload(request: Request, cloudName: string, apiKey: string, apiSecret: string): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const folder = (formData.get('folder') as string | null) || 'worker_uploads'; // ✅ 明确类型并确保默认值
    const tags = formData.get('tags') as string | null;

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No valid file uploaded.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const timestamp = Math.round((new Date()).getTime() / 1000);
    const paramsToSign: { timestamp: number; folder: string; tags?: string } = {
      timestamp: timestamp,
      folder: folder // ✅ 此处 folder 已确保为 string
    };
    if (tags) {
      paramsToSign.tags = (tags as string).split(',').map(tag => tag.trim()).join(','); // ✅ 确保是 string
    }

    const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

    const uploadFormData = new FormData();
    uploadFormData.append('file', file as Blob); // 明确断言为 Blob
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);
    uploadFormData.append('folder', paramsToSign.folder as string); // ✅ 类型安全
    // 处理可选字段 tags（仅在存在时添加）
    if (paramsToSign.tags) {
      uploadFormData.append('tags', paramsToSign.tags as string); // ✅ 确保非空
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    const result: any = await response.json(); // 暂时使用 any 类型

    if (response.ok) {
      console.log('图片上传成功:', result);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.error('Cloudinary 图片上传失败:', result);
      return new Response(JSON.stringify({ error: 'Cloudinary upload failed.', details: (result as any).error?.message || 'Unknown error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status
      });
    }

  } catch (error: any) {
    console.error('图片上传失败:', error);
    return new Response(JSON.stringify({ error: 'Image upload failed.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 获取 Cloudinary 中指定文件夹下的图片列表，直接调用 Cloudinary Admin API。
 * @param {Request} request - 传入的 Request 对象。
 * @param {string} cloudName - Cloudinary Cloud Name。
 * @param {string} apiKey - Cloudinary API Key。
 * @param {string} apiSecret - Cloudinary API Secret。
 * @returns {Response} - 返回图片数组的 Response 对象或错误信息。
 */
async function handleGetImages(request: Request, cloudName: string, apiKey: string, apiSecret: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder');
    const tag = url.searchParams.get('tag');

    let apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`;
    const queryParams = new URLSearchParams();
    queryParams.append('max_results', '50');

    if (tag) {
      apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?tag=${tag}`;
    } else if (folder) {
      queryParams.append('prefix', `${folder}/`);
    }

    const authHeader = btoa(`${apiKey}:${apiSecret}`);

    const response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    const result: any = await response.json(); // 暂时使用 any 类型

    if (response.ok) {
      let images = result.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url
      }));

      images = images.filter((image: any) => !image.public_id.includes('cld-sample') && !image.public_id.includes('samples/'));

      return new Response(JSON.stringify(images), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.error('Cloudinary 获取图片列表失败:', result);
      return new Response(JSON.stringify({ error: 'Failed to fetch images from Cloudinary.', details: (result as any).error?.message || 'Unknown error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status
      });
    }
  } catch (error: any) {
    console.error('获取图片列表失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch images.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 根据 public_id 和转换参数生成 Cloudinary 图片 URL。
 * 此函数不调用 Cloudinary API，而是根据规则构建 URL。
 * @param {Request} request - 传入的 Request 对象。
 * @param {string} cloudName - Cloudinary Cloud Name。
 * @returns {Response} - 返回包含转换后图片 URL 的 Response 对象或错误信息。
 */
async function handleTransformImage(request: Request, cloudName: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const public_id = url.searchParams.get('public_id');
    const transformationsJson = url.searchParams.get('transformations');

    if (!public_id) {
      return new Response(JSON.stringify({ error: 'Public ID is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let transformations: Record<string, any> = {}; // 明确类型
    if (transformationsJson) {
      try {
        transformations = JSON.parse(transformationsJson);
      } catch (parseError: any) { // 明确指定 error 类型为 any
        return new Response(JSON.stringify({ error: 'Invalid transformations JSON.', details: parseError.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const transformationParts: string[] = []; // 明确类型

    for (const effectType in transformations) {
      const params = transformations[effectType];
      let part = '';

      switch (effectType) {
        case 'improve':
        case 'auto_brightness':
        case 'auto_color':
        case 'auto_contrast':
        case 'sharpen':
        case 'vibrance':
        case 'upscale':
        case 'enhance':
          part = `e_${effectType}`;
          break;
        case 'cartoonify':
        case 'sepia':
        case 'vignette':
        case 'pixelate':
        case 'grayscale':
          part = `e_${effectType}`;
          break;
        case 'e_art':
          if (params && params.filter) {
            part = `e_art:${params.filter}`;
          }
          break;
        case 'remove_background':
          part = 'e_background_removal';
          break;
        case 'shadow':
          part = 'e_shadow';
          break;
        case 'o':
          if (params && params.level !== undefined) {
            part = `o_${params.level}`;
          }
          break;
        case 'e_replace_color':
          if (params && params.to_color && params.from_color) {
            let effectString = `e_replace_color:${params.to_color}`;
            if (params.tolerance) {
              effectString += `:${params.tolerance}`;
            }
            effectString += `:${params.from_color}`;
            part = effectString;
          }
          break;
        case 'e_vectorize':
          part = 'e_vectorize';
          break;
        case 'f':
          if (params && params.format) {
            part = `f_${params.format}`;
          }
          break;
        case 'c':
          if (params && params.crop_mode) {
            let cropPart = `c_${params.crop_mode}`;
            if (params.width) cropPart += `,w_${params.width}`;
            if (params.height) cropPart += `,h_${params.height}`;
            if (params.gravity) cropPart += `,g_${params.gravity}`; // 添加重力参数
            part = cropPart;
          }
          break;
        // 颜色调整
        case 'e_brightness':
        case 'e_contrast':
        case 'e_saturation':
          if (params && params.level !== undefined) {
            part = `e_${effectType.replace('e_', '')}:${params.level}`;
          }
          break;
        // 模糊与像素化
        case 'e_blur':
        case 'e_pixelate':
          if (params && params.strength !== undefined) {
            part = `e_${effectType.replace('e_', '')}:${params.strength}`;
          }
          break;
        case 'e_blur_faces':
          part = 'e_blur_faces';
          break;
        case 'e_pixelate_faces':
          part = 'e_pixelate_faces';
          break;
        case 'q':
          if (params && params.level !== undefined) {
            part = `q_${params.level}`;
          }
          break;
        case 'dpr':
          if (params && params.value !== undefined) {
            part = `dpr_${params.value}`;
          }
          break;
        default:
          break;
      }
      if (part) {
        transformationParts.push(part);
      }
    }

    const transformationString = transformationParts.join(',');
    const transformedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${public_id}`;

    return new Response(JSON.stringify({ transformed_url: transformedUrl }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error: any) {
    console.error('生成转换图片 URL 失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate transformed image URL.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 保存转换后的图片到 Cloudinary，直接调用 Cloudinary Upload API。
 * @param {Request} request - 传入的 Request 对象。
 * @param {string} cloudName - Cloudinary Cloud Name。
 * @param {string} apiKey - Cloudinary API Key。
 * @param {string} apiSecret - Cloudinary API Secret。
 * @returns {Response} - 返回 Cloudinary 上传结果的 Response 对象或错误信息。
 */
async function handleSaveTransformedImage(request: Request, cloudName: string, apiKey: string, apiSecret: string): Promise<Response> {
  try {
    const { imageUrl, folder } = await request.json() as { imageUrl: string; folder?: string };

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 获取图片内容并转换为 Blob
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch image from URL: ${imageUrl}` }), { status: imageResponse.status, headers: { 'Content-Type': 'application/json' } });
    }
    const imageBlob = await imageResponse.blob();

    const timestamp = Math.round((new Date()).getTime() / 1000);
    const paramsToSign: { timestamp: number; folder: string } = {
      timestamp: timestamp,
      folder: folder || 'worker_uploads'
    };

    const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

    const uploadFormData = new FormData();
    uploadFormData.append('file', imageBlob, 'transformed_image.png'); // 将 Blob 添加到 FormData，并提供文件名
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);
    uploadFormData.append('folder', paramsToSign.folder as string); // 明确断言为 string

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    const result: any = await response.json(); // 暂时使用 any 类型

    if (response.ok) {
      console.log('转换后图片保存成功:', result);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.error('Cloudinary 保存转换后图片失败:', result);
      return new Response(JSON.stringify({ error: 'Cloudinary save failed.', details: (result as any).error?.message || 'Unknown error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status
      });
    }

  } catch (error: any) {
    console.error('保存转换后图片失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to save transformed image.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 从 Cloudinary 删除图片，直接调用 Cloudinary Admin API。
 * @param {Request} request - 传入的 Request 对象。
 * @param {string} cloudName - Cloudinary Cloud Name。
 * @param {string} apiKey - Cloudinary API Key。
 * @param {string} apiSecret - Cloudinary API Secret。
 * @returns {Response} - 返回 Cloudinary 删除结果的 Response 对象或错误信息。
 */
async function handleDeleteImage(request: Request, cloudName: string, apiKey: string, apiSecret: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const public_id = url.searchParams.get('public_id');

    if (!public_id) {
      return new Response(JSON.stringify({ error: 'Public ID is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const timestamp = Math.round((new Date()).getTime() / 1000);
    const paramsToSign = {
      public_id: public_id,
      timestamp: timestamp
    };

    const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

    const deleteFormData = new FormData();
    deleteFormData.append('public_id', public_id);
    deleteFormData.append('api_key', apiKey);
    deleteFormData.append('timestamp', timestamp.toString());
    deleteFormData.append('signature', signature);

    const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
    const response = await fetch(deleteUrl, {
      method: 'POST', // 删除操作在 Cloudinary API 中是 POST
      body: deleteFormData,
    });

    const result: any = await response.json(); // 暂时使用 any 类型

    if (response.ok) {
      console.log('图片删除成功:', result);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.error('Cloudinary 删除图片失败:', result);
      return new Response(JSON.stringify({ error: 'Cloudinary delete failed.', details: (result as any).error?.message || 'Unknown error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status
      });
    }

  } catch (error: any) {
    console.error('删除图片失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete image.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

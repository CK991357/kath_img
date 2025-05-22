/**
 * Cloudflare Worker 入口文件
 */

// 导入 Cloudinary SDK
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary 配置将在 handleRequest 中从 env 获取

export default {
  /**
   * Cloudflare Worker 的入口函数，处理所有传入的 HTTP 请求。
   * @param {Request} request - 传入的 Request 对象。
   * @param {object} env - Worker 的环境变量对象，包含 Cloudinary 凭据和密码。
   * @param {ExecutionContext} ctx - Worker 的执行上下文，用于管理生命周期。
   * @returns {Response} - 返回的 Response 对象。
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // 从环境变量中获取密码
      const CORRECT_PASSWORD = env.AUTH_PASSWORD;
      if (!CORRECT_PASSWORD) {
        // 如果未设置密码，则直接处理请求（或者返回错误，取决于期望行为）
        console.warn('AUTH_PASSWORD is not set in Worker environment. Access will not be protected.');
        return handleAuthenticatedRequest(request, env, path, method);
      }

      // 检查是否已登录（Cookie验证）
      const cookies = request.headers.get('Cookie')?.split('; ') || [];
      let passwordValue = null;
      for (const cookie of cookies) {
        const [name, ...rest] = cookie.split('=');
        if (name === 'password') {
          passwordValue = decodeURIComponent(rest.join('='));
          break;
        }
      }

      // 处理POST请求（密码提交）
      if (method === 'POST' && path === '/') { // 假设密码提交到根路径
        const ct = request.headers.get('Content-Type') || '';
        if (!ct.includes('application/x-www-form-urlencoded')) {
          return new Response('Unsupported Content-Type', { status: 400 });
        }

        let formData;
        try {
          formData = await request.formData();
        } catch (error) {
          return new Response('Invalid form data', { status: 400 });
        }

        const entered = formData.get('password');
        if (entered === CORRECT_PASSWORD) {
          // 密码正确：设置Cookie并重定向到根路径
          const encodedPassword = encodeURIComponent(CORRECT_PASSWORD);
          const headers = new Headers({
            'Location': '/', // 重定向到首页
            'Set-Cookie': `password=${encodedPassword}; Path=/; HttpOnly; Secure; SameSite=Strict`
          });
          return new Response(null, { status: 302, headers });
        } else {
          // 密码错误：显示登录页
          return new Response(generateLoginPage('密码错误，请重试。'), {
            status: 401,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      }

      // 非POST请求：检查Cookie是否有效
      if (passwordValue === CORRECT_PASSWORD) {
        // 已登录：允许访问原始请求
        // 配置 Cloudinary SDK (在认证通过后配置)
        cloudinary.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET
        });
        return handleAuthenticatedRequest(request, env, path, method);
      } else {
        // 未登录：强制返回登录页
        return new Response(generateLoginPage(), {
          status: 401,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    } catch (error) {
      console.error('Worker Request Handling Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }
};

/**
 * 处理已认证的请求，分发到不同的 API 处理函数或服务静态文件
 * @param {Request} request - 传入的 Request 对象
 * @param {object} env - Worker 的环境变量对象
 * @param {string} path - 请求路径
 * @param {string} method - 请求方法
 * @returns {Response} - 返回的 Response 对象
 */
async function handleAuthenticatedRequest(request, env, path, method) {
  // 配置 Cloudinary SDK (确保在处理 API 请求前已配置)
  // 如果在 handleRequest 中已配置，这里可以省略，但为了健壮性可以再次确认
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET
    });
  }

  switch (path) {
    case '/api/upload': // 注意：前端上传路径已改为 /api/upload
      if (method === 'POST') {
        return handleUpload(request);
      }
      break;
    case '/api/images':
      if (method === 'GET') {
        return handleGetImages(request);
      }
      break;
    case '/api/transform':
      if (method === 'GET') {
        return handleTransformImage(request);
      }
      break;
    case '/api/save-transformed-image':
      if (method === 'POST') {
        return handleSaveTransformedImage(request);
      }
      break;
    case '/api/delete-image':
      if (method === 'DELETE') {
        return handleDeleteImage(request);
      }
      break;
  }

  // 如果不是 API 请求，则尝试服务静态文件
  // 关键修复：使用 fetch(request) 避免循环，并确保 Pages 静态内容被服务
  return fetch(request);
}

/**
 * 处理图片上传请求
 * @param {Request} request - 传入的 Request 对象，包含图片文件数据
 * @returns {Response} - 返回包含图片 URL 的 Response 对象或错误信息
 */
async function handleUpload(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image'); // 前端字段名为 'image'
    const folder = formData.get('folder');
    const tags = formData.get('tags');

    // 检查 file 是否为 File 对象
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No valid file uploaded.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 将文件数据转换为 Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer))); // 使用 Web API 转换

    const uploadOptions = {
      folder: folder || 'worker_uploads' // 如果提供了文件夹名，则使用；否则使用默认文件夹
    };

    if (tags) {
      uploadOptions.tags = tags.split(',').map(tag => tag.trim()); // 将逗号分隔的标签字符串转换为数组
    }

    // 使用 cloudinary.uploader.upload 方法上传文件 buffer
    const result = await cloudinary.uploader.upload(`data:${file.type};base64,${base64File}`, uploadOptions);

    console.log('图片上传成功:', result);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('图片上传失败:', error);
    return new Response(JSON.stringify({ error: 'Image upload failed.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 获取 Cloudinary 中指定文件夹下的图片列表
 * @param {Request} request - 传入的 Request 对象
 * @returns {Response} - 返回图片数组的 Response 对象或错误信息
 */
async function handleGetImages(request) {
  try {
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder');
    const tag = url.searchParams.get('tag');

    let result;
    let images;

    if (tag) {
      result = await cloudinary.api.resources_by_tag(tag, {
        type: 'upload',
        max_results: 50
      });
      images = result.resources.map(resource => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url
      }));
    } else if (folder) {
      const options = {
        type: 'upload',
        max_results: 50
      };
      options.prefix = `${folder}/`;

      result = await cloudinary.api.resources(options);

      images = result.resources.map(resource => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url
      }));
    } else {
      const options = {
        type: 'upload',
        max_results: 50
      };
      result = await cloudinary.api.resources(options);

      images = result.resources.map(resource => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url
      }));
    }

    images = images.filter(image => !image.public_id.includes('cld-sample') && !image.public_id.includes('samples/'));

    return new Response(JSON.stringify(images), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch images.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 根据 public_id 和转换参数生成 Cloudinary 图片 URL
 * @param {Request} request - 传入的 Request 对象
 * @returns {Response} - 返回包含转换后图片 URL 的 Response 对象或错误信息
 */
async function handleTransformImage(request) {
  try {
    const url = new URL(request.url);
    const public_id = url.searchParams.get('public_id');
    const transformationsJson = url.searchParams.get('transformations');

    if (!public_id) {
      return new Response(JSON.stringify({ error: 'Public ID is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let transformations = {};
    if (transformationsJson) {
      try {
        transformations = JSON.parse(transformationsJson);
      } catch (parseError) {
        return new Response(JSON.stringify({ error: 'Invalid transformations JSON.', details: parseError.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const cloudinaryTransformations = {};

    for (const effectType in transformations) {
      const params = transformations[effectType];

      switch (effectType) {
        case 'improve':
        case 'auto_brightness':
        case 'auto_color':
        case 'auto_contrast':
        case 'sharpen':
        case 'vibrance':
        case 'upscale':
        case 'enhance':
          cloudinaryTransformations.effect = effectType;
          break;
        case 'cartoonify':
        case 'sepia':
        case 'vignette':
        case 'pixelate':
        case 'grayscale':
          cloudinaryTransformations.effect = effectType;
          break;
        case 'e_art':
          if (params && params.filter) {
            cloudinaryTransformations.effect = `art:${params.filter}`;
          }
          break;
        case 'remove_background':
          cloudinaryTransformations.effect = 'background_removal';
          break;
        case 'shadow':
          cloudinaryTransformations.effect = 'shadow';
          break;
        case 'o':
          if (params && params.level !== undefined) {
            cloudinaryTransformations.opacity = params.level;
          }
          break;
        case 'e_replace_color':
          if (params && params.to_color && params.from_color) {
            let effectString = `replace_color:${params.to_color}`;
            if (params.tolerance) {
              effectString += `:${params.tolerance}`;
            }
            effectString += `:${params.from_color}`;
            cloudinaryTransformations.effect = effectString;
          }
          break;
        case 'e_vectorize':
          cloudinaryTransformations.effect = 'vectorize';
          break;
        case 'f':
          if (params && params.format) {
            cloudinaryTransformations.format = params.format;
          }
          break;
        case 'c':
          if (params && params.crop_mode) {
            cloudinaryTransformations.crop = params.crop_mode;
            if (params.width) cloudinaryTransformations.width = params.width;
            if (params.height) cloudinaryTransformations.height = params.height;
          }
          break;
        case 'q':
          if (params && params.level !== undefined) {
            cloudinaryTransformations.quality = params.level;
          }
          break;
        case 'dpr':
          if (params && params.value !== undefined) {
            cloudinaryTransformations.dpr = params.value;
          }
          break;
        default:
          break;
      }
    }

    const transformedUrl = cloudinary.url(public_id, cloudinaryTransformations);

    return new Response(JSON.stringify({ transformed_url: transformedUrl }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('生成转换图片 URL 失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate transformed image URL.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 保存转换后的图片到 Cloudinary
 * @param {Request} request - 传入的 Request 对象
 * @returns {Response} - 返回 Cloudinary 上传结果的 Response 对象或错误信息
 */
async function handleSaveTransformedImage(request) {
  try {
    const { imageUrl, folder } = await request.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const uploadOptions = {
      folder: folder || 'worker_uploads'
    };

    const result = await cloudinary.uploader.upload(imageUrl, uploadOptions);

    console.log('转换后图片保存成功:', result);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('保存转换后图片失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to save transformed image.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 从 Cloudinary 删除图片
 * @param {Request} request - 传入的 Request 对象
 * @returns {Response} - 返回 Cloudinary 删除结果的 Response 对象或错误信息
 */
async function handleDeleteImage(request) {
  try {
    const url = new URL(request.url);
    const public_id = url.searchParams.get('public_id');

    if (!public_id) {
      return new Response(JSON.stringify({ error: 'Public ID is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await cloudinary.uploader.destroy(public_id);

    console.log('图片删除成功:', result);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('删除图片失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete image.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * 登录页HTML模板
 * @param {string} [errorMessage=''] - 错误信息，用于在页面上显示
 * @returns {string} - 登录页的完整 HTML 字符串
 */
function generateLoginPage(errorMessage = '') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>访问验证 - Kapture</title>
  <style>
    body { margin:0; font-family:sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh;
           background:linear-gradient(to bottom right, #4CAF50, #2196F3); color:#fff; } /* 绿色到蓝色渐变 */
    .login-container { background:rgba(255,255,255,0.9); padding:2.5rem; border-radius:.75rem; box-shadow:0 8px 16px rgba(0,0,0,0.2);
                       width:100%; max-width:450px; text-align:center; color:#333; }
    h1 { font-size:2rem; color:#3F51B5; margin-bottom:1.5rem; } /* 深蓝色标题 */
    .error-message { color:#F44336; margin-bottom:1.5rem; font-weight:bold; } /* 红色错误信息 */
    .form-group { margin-bottom:1.5rem; text-align:left; }
    label { display:block; margin-bottom:.75rem; color:#607D8B; font-weight:bold; } /* 灰色标签 */
    input[type="password"] { width:calc(100% - 1.5rem); padding:.8rem; border:1px solid #B0BEC5; border-radius:.5rem;
                             font-size:1.1rem; box-sizing:border-box; }
    input[type="password"]:focus { border-color:#2196F3; outline:none; box-shadow:0 0 0 3px rgba(33,150,243,0.3); }
    button { width:100%; padding:.9rem; background:linear-gradient(to right, #2196F3, #4CAF50); /* 蓝色到绿色渐变按钮 */
             color:#fff; font-weight:bold; border:none; border-radius:.5rem; cursor:pointer; transition:all .3s ease;
             font-size:1.2rem; letter-spacing:1px; }
    button:hover { transform:translateY(-2px); box-shadow:0 6px 12px rgba(0,0,0,0.2); }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Kapture 访问验证</h1>
    ${errorMessage ? `<p class="error-message">${errorMessage}</p>` : ''}
    <form method="POST">
      <div class="form-group">
        <label for="password">请输入密码：</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">验证</button>
    </form>
  </div>
</body>
</html>`;
}

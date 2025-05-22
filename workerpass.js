export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

async function handleRequest(request, env) {
  try {
    const CORRECT_PASSWORD = env.CORRECT_PASSWORD;
    if (!CORRECT_PASSWORD) {
      throw new Error('CORRECT_PASSWORD is not set');
    }

    const url = new URL(request.url);
    
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
    if (request.method === 'POST') {
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
      // 关键修复：使用 fetch(request.url, request) 避免循环
      return fetch(request.url, {
        method: request.method,
        headers: request.headers,
        cf: { cacheEverything: false } // 禁用缓存以确保动态内容
      });
    } else {
      // 未登录：强制返回登录页
      return new Response(generateLoginPage(), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 登录页HTML模板（保持不变）
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-color: #4F46E5; /* Indigo 600 */
      --primary-dark-color: #4338CA; /* Indigo 700 */
      --secondary-color: #6366F1; /* Indigo 500 */
      --text-color-dark: #1F2937; /* Gray 900 */
      --text-color-light: #4B5563; /* Gray 600 */
      --bg-light: #F9FAFB; /* Gray 50 */
      --bg-card: #FFFFFF;
      --border-color: #D1D5DB; /* Gray 300 */
      --error-color: #EF4444; /* Red 500 */
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    body {
      margin: 0;
      font-family: 'Inter', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      color: var(--text-color-dark);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .login-container {
      background: var(--bg-card);
      padding: 2.5rem;
      border-radius: 0.75rem;
      box-shadow: var(--shadow-md);
      width: 100%;
      max-width: 420px;
      text-align: center;
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    h1 {
      font-size: 2rem;
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      font-weight: 700;
    }

    .error-message {
      color: var(--error-color);
      margin-bottom: 1.5rem;
      font-weight: 600;
      background-color: rgba(239, 68, 68, 0.1);
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid var(--error-color);
    }

    .form-group {
      margin-bottom: 1.5rem;
      text-align: left;
    }

    label {
      display: block;
      margin-bottom: 0.75rem;
      color: var(--text-color-light);
      font-weight: 600;
      font-size: 0.95rem;
    }

    input[type="password"] {
      width: calc(100% - 2rem); /* Adjust for padding */
      padding: 0.9rem 1rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 1.1rem;
      box-sizing: border-box;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    input[type="password"]:focus {
      border-color: var(--primary-color);
      outline: none;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2); /* primary-color with transparency */
    }

    button {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
      color: #fff;
      font-weight: 700;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1.15rem;
      letter-spacing: 0.5px;
      box-shadow: var(--shadow-sm);
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      background: linear-gradient(to right, var(--primary-dark-color), var(--primary-color));
    }

    button:active {
      transform: translateY(0);
      box-shadow: none;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Kapture 访问验证</h1>
    ${errorMessage ? `<p class="error-message">${errorMessage}</p>` : ''}
    <form method="POST">
      <div class="form-group">
        <label for="password">请输入密码：</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>
      <button type="submit">验证</button>
    </form>
  </div>
</body>
</html>`;
}

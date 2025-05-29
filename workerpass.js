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

function generateLoginPage(errorMessage = '') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>访问验证 | Cloudinary 图片管理</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --primary-color: #3498db;
      --primary-hover: #2980b9;
      --secondary-color: #2c3e50;
      --accent-color: #9b59b6;
      --success-color: #2ecc71;
      --danger-color: #e74c3c;
      --light-bg: #f8f9fa;
      --card-bg: #ffffff;
      --text-color: #333333;
      --text-secondary: #777777;
      --border-color: #e0e0e0;
      --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      --border-radius: 12px;
      --transition: all 0.3s ease;
    }
    
    .dark-theme {
      --primary-color: #3498db;
      --primary-hover: #2980b9;
      --secondary-color: #34495e;
      --accent-color: #9b59b6;
      --success-color: #27ae60;
      --danger-color: #c0392b;
      --light-bg: #1a1f25;
      --card-bg: #222831;
      --text-color: #e0e0e0;
      --text-secondary: #a0a0a0;
      --border-color: #2d3743;
      --shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      transition: background-color 0.3s, border-color 0.3s;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      padding: 20px;
      color: var(--text-color);
      transition: var(--transition);
    }
    
    .login-container {
      width: 100%;
      max-width: 450px;
      background-color: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      overflow: hidden;
      border: 1px solid var(--border-color);
      transition: var(--transition);
    }
    
    .login-header {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 25px;
      background: linear-gradient(to right, var(--primary-color), var(--accent-color));
      color: white;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .login-header i {
      font-size: 28px;
    }
    
    .login-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .login-body {
      padding: 30px;
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 15px;
      background-color: rgba(231, 76, 60, 0.1);
      border: 1px solid rgba(231, 76, 60, 0.2);
      border-radius: 8px;
      margin-bottom: 20px;
      color: var(--danger-color);
      font-weight: 500;
    }
    
    .error-message i {
      color: var(--danger-color);
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-group label {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      font-weight: 500;
      color: var(--text-color);
    }
    
    .form-group label i {
      color: var(--primary-color);
    }
    
    input[type="password"] {
      width: 100%;
      padding: 14px 18px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background-color: var(--card-bg);
      color: var(--text-color);
      font-size: 1rem;
      transition: var(--transition);
    }
    
    input[type="password"]:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
      outline: none;
    }
    
    .btn-primary {
      width: 100%;
      padding: 14px;
      background: linear-gradient(to right, var(--primary-color), var(--accent-color));
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
    
    .btn-primary:hover {
      background: linear-gradient(to right, var(--primary-hover), #8a4db3);
      transform: translateY(-2px);
    }
    
    .theme-switch {
      position: absolute;
      top: 20px;
      right: 20px;
    }
    
    #themeToggle {
      display: none;
    }
    
    .toggle-btn {
      display: flex;
      align-items: center;
      cursor: pointer;
      position: relative;
      width: 60px;
      height: 30px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 15px;
      padding: 0 5px;
      transition: var(--transition);
    }
    
    .toggle-btn i {
      font-size: 16px;
      z-index: 2;
      transition: var(--transition);
    }
    
    .toggle-btn .fa-sun {
      color: #f1c40f;
    }
    
    .toggle-btn .fa-moon {
      color: #ecf0f1;
      transform: translateX(30px);
      opacity: 0;
    }
    
    .slider {
      position: absolute;
      left: 5px;
      width: 22px;
      height: 22px;
      background: white;
      border-radius: 50%;
      transition: var(--transition);
    }
    
    #themeToggle:checked + .toggle-btn .slider {
      transform: translateX(30px);
    }
    
    #themeToggle:checked + .toggle-btn .fa-sun {
      transform: translateX(-30px);
      opacity: 0;
    }
    
    #themeToggle:checked + .toggle-btn .fa-moon {
      transform: translateX(0);
      opacity: 1;
    }
    
    .login-footer {
      text-align: center;
      padding: 20px;
      color: var(--text-secondary);
      font-size: 0.9rem;
      border-top: 1px solid var(--border-color);
    }
    
    @media (max-width: 480px) {
      .login-container {
        max-width: 100%;
      }
      
      .login-header {
        padding: 20px;
      }
      
      .login-body {
        padding: 25px;
      }
    }
  </style>
</head>
<body>
  <div class="theme-switch">
    <input type="checkbox" id="themeToggle" aria-label="切换深色模式">
    <label for="themeToggle" class="toggle-btn">
      <i class="fas fa-sun" aria-hidden="true"></i>
      <i class="fas fa-moon" aria-hidden="true"></i>
      <span class="slider"></span>
    </label>
  </div>
  
  <div class="login-container">
    <div class="login-header">
      <i class="fas fa-lock" aria-hidden="true"></i>
      <h1>访问验证</h1>
    </div>
    
    <div class="login-body">
      ${errorMessage ? `
        <div class="error-message">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>${errorMessage}</span>
        </div>
      ` : ''}
      
      <form method="POST">
        <div class="form-group">
          <label for="password">
            <i class="fas fa-key" aria-hidden="true"></i> 
            <span>密码：</span>
          </label>
          <input type="password" id="password" name="password" required
                 aria-label="输入访问密码" placeholder="请输入访问密码">
        </div>
        <button type="submit" class="btn-primary">
          <i class="fas fa-unlock" aria-hidden="true"></i> 验证
        </button>
      </form>
    </div>
    
    <div class="login-footer">
      <p>Cloudinary 图片管理系统 &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
  
  <script>
    // 主题切换功能
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // 应用保存的主题
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      themeToggle.checked = true;
    }
    
    // 主题切换事件
    themeToggle.addEventListener('change', () => {
      if (themeToggle.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      }
    });
  </script>
</body>
</html>`;
}

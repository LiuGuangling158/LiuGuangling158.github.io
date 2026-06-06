/**
 * 认证管理 —— Token 存储 + 登录界面
 */
import { el } from './utils/dom.js';

const STORAGE_KEY = '__blog_admin_token__';

export class AuthManager {
  constructor(api) {
    this.api = api;
  }

  getToken() {
    return localStorage.getItem(STORAGE_KEY);
  }

  setToken(token) {
    localStorage.setItem(STORAGE_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 验证已存储的 token
   * @returns {Promise<{login: string, avatar_url: string}|null>}
   */
  async validateStored() {
    const token = this.getToken();
    if (!token) return null;
    try {
      // 临时创建 apiclient 来验证
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (!res.ok) {
        this.clearToken();
        return null;
      }
      return res.json();
    } catch {
      return null;
    }
  }

  /**
   * 渲染登录界面
   * @param {HTMLElement} container
   * @param {(token: string, user: object) => void} onSuccess
   */
  renderLoginScreen(container, onSuccess) {
    container.innerHTML = '';

    const card = el('div', { className: 'auth-card' });

    const logo = el('div', { className: 'auth-logo' });
    // GitHub 风格的简单 SVG 图标
    logo.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
      <path d="M9 18c-4.51 2-5-2-7-2"/>
    </svg>`;

    const title = el('h2', { className: 'auth-title' }, '管理后台');
    const desc = el('p', { className: 'auth-desc' }, '输入 GitHub Personal Access Token 以继续');

    const input = el('input', {
      type: 'password',
      className: 'auth-input',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      id: 'auth-token-input',
    });

    const btn = el('button', { className: 'auth-btn', id: 'auth-btn' }, '连接 GitHub');
    const hint = el('p', { className: 'auth-hint' });
    hint.innerHTML = 'Token 需要 <code>repo</code> 权限。<a href="https://github.com/settings/tokens" target="_blank" rel="noopener">创建 Token →</a>';

    const errorEl = el('div', { className: 'auth-error', id: 'auth-error' });

    card.append(logo, title, desc, input, btn, hint, errorEl);

    const wrap = el('div', { className: 'auth-screen' }, card);
    container.appendChild(wrap);

    // 事件绑定
    const doLogin = async () => {
      const token = input.value.trim();
      if (!token) {
        errorEl.textContent = '请输入 Token';
        errorEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = '验证中...';
      errorEl.style.display = 'none';

      try {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        });
        if (!res.ok) {
          const msg = res.status === 401 ? 'Token 无效，请检查后重试' : `验证失败 (${res.status})`;
          throw new Error(msg);
        }
        const user = await res.json();
        this.setToken(token);
        onSuccess(token, user);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = '连接 GitHub';
      }
    };

    btn.addEventListener('click', doLogin);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  }
}

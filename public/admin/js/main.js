/**
 * Admin 应用入口
 * 负责：标签页路由、各 section 的初始化与切换
 */
import { ApiClient } from './api.js';
import { AuthManager } from './auth.js';
import { ToastManager } from './toast.js';
import { ModalManager } from './modal.js';
import { PostsSection } from './sections/posts.js';
import { SiteConfigSection } from './sections/site-config.js';
import { LinksSection } from './sections/links.js';
import { CategoriesSection } from './sections/categories.js';
import { SkillsSection } from './sections/skills.js';
import { HeroSection } from './sections/hero.js';
import { ImageManagerSection } from './sections/image-manager.js';
import { el, clearContainer } from './utils/dom.js';

class AdminApp {
  constructor() {
    const appEl = document.getElementById('admin-app');
    this.owner = appEl?.dataset.owner || 'liuguangling158';
    this.repo = appEl?.dataset.repo || 'liuguangling158.github.io';

    this.api = null;
    this.auth = null;
    this.toast = new ToastManager();
    this.modal = new ModalManager();
    this.sections = {};
    this.currentTab = 'posts';
    this.user = null;
  }

  async init() {
    const container = document.getElementById('admin-app');
    if (!container) return;

    // 尝试用已存储的 token 自动登录
    const tempAuth = new AuthManager(null);
    const user = await tempAuth.validateStored();

    if (user) {
      const token = tempAuth.getToken();
      this._onLoginSuccess(token, user);
    } else {
      // 显示登录界面
      tempAuth.renderLoginScreen(container, (token, user) => {
        this._onLoginSuccess(token, user);
      });
    }
  }

  _onLoginSuccess(token, user) {
    this.user = user;
    this.api = new ApiClient(token, this.owner, this.repo);
    this.auth = new AuthManager(this.api);

    // 初始化所有 section
    this.sections = {
      posts: new PostsSection(this.api, this.toast, this.modal),
      'site-config': new SiteConfigSection(this.api, this.toast),
      links: new LinksSection(this.api, this.toast),
      categories: new CategoriesSection(this.api, this.toast),
      skills: new SkillsSection(this.api, this.toast),
      hero: new HeroSection(this.api, this.toast),
      'images-covers': new ImageManagerSection(this.api, this.toast, this.modal, 'public/images/covers', '封面图片管理', 'covers'),
      'images-posts': new ImageManagerSection(this.api, this.toast, this.modal, 'public/images/posts', '文章插图管理', 'posts'),
    };

    this._renderShell();
    this.switchTab('posts');
  }

  _renderShell() {
    const container = document.getElementById('admin-app');
    clearContainer(container);

    const shell = el('div', { className: 'admin-shell' });

    // Header
    const header = el('div', { className: 'admin-header' });
    const brand = el('div', { className: 'admin-brand' }, [
      el('span', { className: 'admin-brand-dot' }),
      '管理后台',
    ]);
    const userInfo = el('div', { className: 'admin-user' }, [
      el('img', { className: 'admin-user-avatar', src: this.user.avatar_url, alt: this.user.login }),
      el('span', { className: 'admin-user-name' }, this.user.login),
      el('button', { className: 'admin-logout', onClick: () => this._logout() }, '登出'),
    ]);
    header.append(brand, userInfo);

    // Tab nav
    const nav = el('div', { className: 'admin-nav' });
    const tabs = [
      { id: 'posts', label: '📝 文章' },
      { id: 'site-config', label: '⚙️ 站点' },
      { id: 'links', label: '🔗 链接' },
      { id: 'categories', label: '📂 分类' },
      { id: 'skills', label: '🛠 技能' },
      { id: 'hero', label: '🖼 轮播' },
      { id: 'images-covers', label: '🖼 封面图' },
      { id: 'images-posts', label: '📷 插图' },
    ];
    tabs.forEach((tab) => {
      const tabEl = el('button', {
        className: 'admin-nav-tab',
        'data-tab': tab.id,
        onClick: () => this.switchTab(tab.id),
      }, tab.label);
      nav.appendChild(tabEl);
    });

    // Content
    const content = el('div', { className: 'admin-content', id: 'admin-content' });
    tabs.forEach((tab) => {
      const panel = el('div', {
        className: 'section-panel',
        id: `panel-${tab.id}`,
      });
      content.appendChild(panel);
    });

    shell.append(header, nav, content);
    container.appendChild(shell);
  }

  async switchTab(tabId) {
    this.currentTab = tabId;

    // 更新标签页样式
    document.querySelectorAll('.admin-nav-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });

    // 更新面板显示
    document.querySelectorAll('.section-panel').forEach((p) => {
      p.classList.toggle('active', p.id === `panel-${tabId}`);
    });

    // 首次加载该 section
    const section = this.sections[tabId];
    if (section && !section._loaded) {
      const panel = document.getElementById(`panel-${tabId}`);
      if (panel) {
        panel.innerHTML = '<div class="loading-wrap"><div class="spinner spinner-lg"></div><span>加载中...</span></div>';
        try {
          await section.render(panel);
          section._loaded = true;
        } catch (err) {
          panel.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
          this.toast.error(`加载失败：${err.message}`);
        }
      }
    }
  }

  _logout() {
    if (this.auth) this.auth.clearToken();
    const container = document.getElementById('admin-app');
    clearContainer(container);

    // 重置所有 section
    this.sections = {};
    this.api = null;

    // 回到登录界面
    const tempAuth = new AuthManager(null);
    tempAuth.renderLoginScreen(container, (token, user) => {
      this._onLoginSuccess(token, user);
    });
  }
}

// 启动
const app = new AdminApp();
app.init();

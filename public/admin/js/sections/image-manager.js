/**
 * 图片管理器 —— 浏览、上传、删除指定目录下的图片
 * 可用于 covers 和 posts 图片目录
 */
import { el, clearContainer, formGroup } from '../utils/dom.js';

export class ImageManagerSection {
  /**
   * @param {import('../api.js').ApiClient} api
   * @param {object} toast
   * @param {object} modal
   * @param {string} dirPath - GitHub 仓库目录路径
   * @param {string} title - 面板标题
   * @param {string} uploadSubdir - 上传子目录名 ('covers' | 'posts')
   */
  constructor(api, toast, modal, dirPath, title, uploadSubdir) {
    this.api = api;
    this.toast = toast;
    this.modal = modal;
    this.dirPath = dirPath;
    this.title = title;
    this.uploadSubdir = uploadSubdir;
    this._loaded = false;
    this.images = [];
  }

  async render(container) {
    clearContainer(container);

    const header = el('div', { className: 'section-header' });
    header.appendChild(el('h2', { className: 'section-title' }, this.title));
    container.appendChild(header);

    const body = el('div', { id: `img-mgr-body-${this.uploadSubdir}` });
    body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>加载中...</span></div>';
    container.appendChild(body);

    await this._load(body);
  }

  async _load(body) {
    try {
      const files = await this.api.listDirectory(this.dirPath);
      this.images = files
        .filter((f) => f.type === 'file' && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(f.name))
        .sort((a, b) => b.name.localeCompare(a.name)); // 最新的在前
      this._render(body);
    } catch (err) {
      if (err.status === 404) {
        // 目录还不存在
        this.images = [];
        this._render(body);
      } else {
        body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
      }
    }
  }

  _render(body) {
    clearContainer(body);

    const _self = this;

    // 上传区
    const uploadZone = el('div', { className: 'img-mgr-upload', id: `img-upload-${this.uploadSubdir}` });
    const dropText = el('span', { className: 'img-mgr-upload-text' }, '📤 拖拽图片到此处上传');
    uploadZone.appendChild(dropText);

    // 拖拽上传
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      for (const file of files) {
        if (file.type.startsWith('image/')) await _handleUpload(file);
      }
    });

    // 点击上传
    uploadZone.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      fileInput.onchange = async () => {
        for (const file of fileInput.files) {
          await _handleUpload(file);
        }
      };
      fileInput.click();
    });

    body.appendChild(uploadZone);

    // 统计
    const stats = el('p', {
      className: 'img-mgr-stats',
    }, `共 ${this.images.length} 张图片`);
    body.appendChild(stats);

    // 空状态
    if (this.images.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.innerHTML = `<div class="empty-state-icon">🖼</div><p class="empty-state-text">暂无图片</p>`;
      body.appendChild(empty);
      return;
    }

    // 图片网格
    const grid = el('div', { className: 'img-mgr-grid' });
    this.images.forEach((img) => {
      grid.appendChild(_self._renderImageCard(img));
    });
    body.appendChild(grid);

    async function _handleUpload(file) {
      uploadZone.classList.add('uploading');
      dropText.textContent = '⏳ 上传中...';
      try {
        await _self._uploadFile(file);
        await _self._load(body);
        _self.toast.success(`${file.name} 上传成功`);
      } catch (err) {
        _self.toast.error(`上传失败：${err.message}`);
      } finally {
        uploadZone.classList.remove('uploading');
        dropText.textContent = '📤 拖拽图片到此处上传';
      }
    }
  }

  _renderImageCard(img) {
    const _self = this;
    // 公开 URL
    const publicUrl = '/' + img.path.replace(/^public\//, '');
    const card = el('div', { className: 'img-mgr-card' });

    // 缩略图
    const thumb = el('img', {
      className: 'img-mgr-thumb',
      src: publicUrl,
      alt: img.name,
      loading: 'lazy',
    });
    thumb.onerror = () => {
      thumb.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23fff0f5" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23c997b0" font-size="14">🖼</text></svg>';
    };

    // 文件名
    const name = el('span', { className: 'img-mgr-name', title: img.name }, img.name);

    // 操作按钮
    const actions = el('div', { className: 'img-mgr-actions' });

    // 复制路径
    const copyBtn = el('button', {
      className: 'img-mgr-btn img-mgr-btn-copy',
      title: `复制路径：${publicUrl}`,
      onClick: () => this._copyPath(publicUrl),
    }, '📋 复制');

    // 复制 Markdown
    const copyMdBtn = el('button', {
      className: 'img-mgr-btn img-mgr-btn-copy',
      title: '复制 Markdown 图片语法',
      onClick: () => this._copyPath(`![图片](${publicUrl})`),
    }, '📝 MD');

    // 删除
    const delBtn = el('button', {
      className: 'img-mgr-btn img-mgr-btn-del',
      title: '删除图片',
      onClick: () => this._deleteImage(img, card),
    }, '🗑');

    actions.append(copyBtn, copyMdBtn, delBtn);
    card.append(thumb, name, actions);
    return card;
  }

  async _copyPath(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('已复制到剪贴板');
    } catch {
      this.toast.error('复制失败，请手动复制');
    }
  }

  async _deleteImage(img, cardEl) {
    const confirmed = await this.modal.confirm(
      '删除图片',
      `确定要删除 ${img.name} 吗？此操作不可撤销。`,
      'danger'
    );
    if (!confirmed) return;

    try {
      await this.api.deleteFile(img.path, img.sha, `删除图片：${img.name}`);
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'scale(0.9)';
      cardEl.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        cardEl.remove();
        // 更新计数
        this.images = this.images.filter((i) => i.path !== img.path);
        const statsEl = document.querySelector('.img-mgr-stats');
        if (statsEl) statsEl.textContent = `共 ${this.images.length} 张图片`;
        if (this.images.length === 0) {
          // 重新渲染空状态
          const container = cardEl.closest('#img-mgr-body-covers, #img-mgr-body-posts');
          if (container) this._render(container);
        }
      }, 300);
      this.toast.success(`${img.name} 已删除`);
    } catch (err) {
      this.toast.error(`删除失败：${err.message}`);
    }
  }

  /** 生成唯一文件名并上传 */
  async _uploadFile(file) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 8);
    const ext = file.name.split('.').pop().toLowerCase() || 'png';
    const filename = `${dateStr}-${rand}.${ext}`;
    const repoPath = `${this.dirPath}/${filename}`;
    await this.api.uploadImage(file, repoPath);
  }
}

/**
 * Hero 轮播图管理 —— 编辑 src/config/hero.ts
 */
import { el, clearContainer, formGroup } from '../utils/dom.js';

const CONFIG_PATH = 'src/config/hero.ts';

export class HeroSection {
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
    this._loaded = false;
    this.images = [];
    this.intervalMs = 5500;
  }

  async render(container) {
    clearContainer(container);

    const header = el('div', { className: 'section-header' });
    header.appendChild(el('h2', { className: 'section-title' }, 'Hero 轮播图管理'));
    const saveBtn = el('button', { className: 'admin-btn admin-btn-primary', id: 'hero-save-btn' }, '💾 保存修改');
    header.appendChild(saveBtn);
    container.appendChild(header);

    const body = el('div', { id: 'hero-body' });
    body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>加载中...</span></div>';
    container.appendChild(body);

    await this._load(body);

    saveBtn.addEventListener('click', () => this._save(body));
  }

  async _load(body) {
    try {
      const { content, sha } = await this.api.readFile(CONFIG_PATH);
      this._sha = sha;
      this._rawContent = content;
      const parsed = this._parseHero(content);
      this.images = parsed.images;
      this.intervalMs = parsed.intervalMs;
      this._render(body);
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
    }
  }

  _parseHero(content) {
    // 解析 heroImages 数组
    const imgMatch = content.match(/export const heroImages\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
    const images = [];
    if (imgMatch) {
      const arrayContent = imgMatch[1];
      // 匹配每个 { src: '...', alt: '...' }
      const itemRe = /\{\s*src:\s*'([^']*)'\s*,\s*alt:\s*'([^']*)'\s*\}/g;
      let m;
      while ((m = itemRe.exec(arrayContent)) !== null) {
        images.push({ src: m[1], alt: m[2] });
      }
    }

    // 解析 heroIntervalMs
    const intMatch = content.match(/export const heroIntervalMs\s*=\s*(\d+)/);
    const intervalMs = intMatch ? parseInt(intMatch[1], 10) : 5500;

    return { images, intervalMs };
  }

  _render(body) {
    clearContainer(body);

    // 轮播间隔设置
    const settingsCard = el('div', { className: 'admin-card' });
    settingsCard.appendChild(el('h3', { className: 'admin-card-title' }, '轮播设置'));
    const intervalInput = el('input', {
      className: 'form-input',
      type: 'number',
      id: 'hero-interval',
      value: String(this.intervalMs),
      min: '1000',
      step: '500',
    });
    settingsCard.appendChild(formGroup('切换间隔（毫秒）', intervalInput, '每张图片显示的时间'));
    body.appendChild(settingsCard);

    // 图片列表
    const imagesCard = el('div', { className: 'admin-card' });
    imagesCard.appendChild(el('h3', { className: 'admin-card-title' }, `轮播图片（${this.images.length} 张）`));

    if (this.images.length === 0) {
      imagesCard.appendChild(el('p', { className: 'admin-text-muted' }, '暂无图片'));
    }

    const list = el('div', { className: 'array-list', id: 'hero-images-list' });
    this.images.forEach((img, idx) => {
      list.appendChild(this._renderImageItem(img, idx, body));
    });
    imagesCard.appendChild(list);

    const addBtn = el('button', {
      className: 'array-add-btn',
      onClick: () => this._addImage(body),
    }, '＋ 添加图片');
    imagesCard.appendChild(addBtn);

    body.appendChild(imagesCard);
  }

  _renderImageItem(img, idx, body) {
    const item = el('div', { className: 'array-item' });
    item.setAttribute('data-idx', String(idx));

    const itemHeader = el('div', { className: 'array-item-header' });
    itemHeader.appendChild(el('span', { className: 'array-item-label' }, `图片 ${idx + 1}`));
    const removeBtn = el('button', {
      className: 'array-item-remove',
      onClick: () => {
        this.images.splice(idx, 1);
        this._render(body);
      },
    }, '×');
    itemHeader.appendChild(removeBtn);

    const row = el('div', { className: 'form-row' });
    const srcInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: img.src,
      placeholder: '图片路径，如 /images/hero/hero-1.jpg',
      onChange: (e) => { img.src = e.target.value; },
    });
    const altInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: img.alt,
      placeholder: '图片描述',
      onChange: (e) => { img.alt = e.target.value; },
    });
    row.append(
      formGroup('路径', srcInput),
      formGroup('描述', altInput),
    );

    // 预览
    const preview = el('div', { className: 'admin-mt-4' });
    const imgEl = el('img', {
      src: img.src,
      alt: img.alt,
      style: 'max-height:120px;border-radius:8px;border:1px solid #ffe4ef;',
      onError: () => { imgEl.style.display = 'none'; },
    });
    preview.appendChild(el('span', { className: 'admin-text-muted' }, '预览：'));
    preview.appendChild(el('br'));
    preview.appendChild(imgEl);
    row.parentNode?.appendChild?.(preview) || item.appendChild(preview);

    item.append(itemHeader, row);
    return item;
  }

  _addImage(body) {
    this.images.push({ src: '', alt: '' });
    this._render(body);
  }

  _escape(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  _generateHeroTs() {
    const esc = (s) => this._escape(s);
    const imagesStr = this.images
      .map((img) => `  { src: '${esc(img.src)}', alt: '${esc(img.alt)}' }`)
      .join(',\n');

    return `/** 首屏轮播背景（将图片放到 public/images/hero/ 并在此配置） */
export const heroImages = [
${imagesStr},
] as const;

/** 每张背景停留时间（毫秒） */
export const heroIntervalMs = ${this.intervalMs};
`;
  }

  async _save(body) {
    const saveBtn = document.getElementById('hero-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    // 获取当前 interval 值
    const intervalInput = document.getElementById('hero-interval');
    if (intervalInput) {
      this.intervalMs = parseInt(intervalInput.value, 10) || 5500;
    }

    try {
      const content = this._generateHeroTs();
      const result = await this.api.writeFile(CONFIG_PATH, content, this._sha, '更新轮播图配置');
      this._sha = result.sha;
      this.toast.success('轮播图配置已保存');
    } catch (err) {
      this.toast.error(`保存失败：${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存修改';
    }
  }
}

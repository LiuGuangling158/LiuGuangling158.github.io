/**
 * 链接管理 —— 编辑 src/config/links.ts
 */
import { el, clearContainer, formGroup } from '../utils/dom.js';

const CONFIG_PATH = 'src/config/links.ts';
const ICON_OPTIONS = ['github', 'bilibili', 'twitter', 'mail', 'link'];

export class LinksSection {
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
    this._loaded = false;
    this.socialLinks = [];
    this.friendLinks = [];
  }

  async render(container) {
    clearContainer(container);

    const header = el('div', { className: 'section-header' });
    header.appendChild(el('h2', { className: 'section-title' }, '链接管理'));
    const saveBtn = el('button', { className: 'admin-btn admin-btn-primary', id: 'links-save-btn' }, '💾 保存修改');
    header.appendChild(saveBtn);
    container.appendChild(header);

    const body = el('div', { id: 'links-body' });
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
      this.socialLinks = this._parseArray(content, 'socialLinks');
      this.friendLinks = this._parseArray(content, 'friendLinks');
      this._render(body);
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
    }
  }

  _parseArray(content, arrayName) {
    const re = new RegExp(`${arrayName}:\\s*LinkItem\\[\\]\\s*=\\s*\\[([\\s\\S]*?)\\];`);
    const match = content.match(re);
    if (!match) return [];

    const arrayContent = match[1];
    const items = [];
    // 匹配每个 { name: '...', url: '...', desc?: '...', icon?: '...' }
    const itemRe = /\{([^}]+)\}/g;
    let m;
    while ((m = itemRe.exec(arrayContent)) !== null) {
      const itemBlock = m[1];
      const item = {};

      const nameMatch = itemBlock.match(/name:\s*'([^']*)'/);
      if (nameMatch) item.name = nameMatch[1];

      const urlMatch = itemBlock.match(/url:\s*'([^']*)'/);
      if (urlMatch) item.url = urlMatch[1];

      const descMatch = itemBlock.match(/desc:\s*'([^']*)'/);
      if (descMatch) item.desc = descMatch[1];

      const iconMatch = itemBlock.match(/icon:\s*'([^']*)'/);
      if (iconMatch) item.icon = iconMatch[1];

      if (item.name || item.url) items.push(item);
    }
    return items;
  }

  _render(body) {
    clearContainer(body);

    // 我的链接
    body.appendChild(this._renderLinkGroup('我的链接', this.socialLinks, 'social', body));

    // 友链
    body.appendChild(this._renderLinkGroup('友链 / 收藏', this.friendLinks, 'friend', body));
  }

  _renderLinkGroup(title, links, groupId, body) {
    const card = el('div', { className: 'admin-card' });
    card.appendChild(el('h3', { className: 'admin-card-title' }, `${title}（${links.length} 项）`));

    const list = el('div', { className: 'array-list' });
    links.forEach((link, idx) => {
      list.appendChild(this._renderLinkItem(link, idx, groupId, body));
    });
    card.appendChild(list);

    const addBtn = el('button', {
      className: 'array-add-btn',
      onClick: () => {
        links.push({ name: '', url: '', desc: '', icon: 'link' });
        this._render(body);
      },
    }, '＋ 添加链接');
    card.appendChild(addBtn);

    return card;
  }

  _renderLinkItem(link, idx, groupId, body) {
    const item = el('div', { className: 'array-item' });

    const itemHeader = el('div', { className: 'array-item-header' });
    itemHeader.appendChild(el('span', { className: 'array-item-label' }, `链接 ${idx + 1}`));
    const removeBtn = el('button', {
      className: 'array-item-remove',
      onClick: () => {
        const target = groupId === 'social' ? this.socialLinks : this.friendLinks;
        target.splice(idx, 1);
        this._render(body);
      },
    }, '×');
    itemHeader.appendChild(removeBtn);

    const row1 = el('div', { className: 'form-row' });
    const nameInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: link.name || '',
      placeholder: '名称',
      onChange: (e) => { link.name = e.target.value; },
    });
    const urlInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: link.url || '',
      placeholder: 'URL',
      onChange: (e) => { link.url = e.target.value; },
    });
    row1.append(formGroup('名称', nameInput), formGroup('URL', urlInput));

    const row2 = el('div', { className: 'form-row' });
    const descInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: link.desc || '',
      placeholder: '描述（可选）',
      onChange: (e) => { link.desc = e.target.value; },
    });
    const iconSelect = el('select', {
      className: 'form-select',
      onChange: (e) => { link.icon = e.target.value; },
    });
    ICON_OPTIONS.forEach((opt) => {
      const option = el('option', { value: opt }, opt);
      if (link.icon === opt) option.selected = true;
      iconSelect.appendChild(option);
    });
    row2.append(formGroup('描述', descInput), formGroup('图标', iconSelect));

    item.append(itemHeader, row1, row2);
    return item;
  }

  _escape(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  _generateLinksTs() {
    const esc = (s) => this._escape(s);

    const formatItem = (item, indent = '  ') => {
      const parts = [];
      parts.push(`${indent}  name: '${esc(item.name)}'`);
      parts.push(`${indent}  url: '${esc(item.url)}'`);
      if (item.desc) parts.push(`${indent}  desc: '${esc(item.desc)}'`);
      if (item.icon && item.icon !== 'link') parts.push(`${indent}  icon: '${esc(item.icon)}'`);
      return `${indent}{\n${parts.join(',\n')},\n${indent}}`;
    };

    const socialItems = this.socialLinks.map((l) => formatItem(l)).join(',\n');
    const friendItems = this.friendLinks.map((l) => formatItem(l)).join(',\n');

    return `export type LinkItem = {
  name: string;
  url: string;
  desc?: string;
  icon?: 'github' | 'bilibili' | 'twitter' | 'mail' | 'link';
};

/** 我的常用链接 */
export const socialLinks: LinkItem[] = [
${socialItems},
];

/** 友链 / 收藏站点 */
export const friendLinks: LinkItem[] = [
${friendItems},
];
`;
  }

  async _save(body) {
    const saveBtn = document.getElementById('links-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      const content = this._generateLinksTs();
      const result = await this.api.writeFile(CONFIG_PATH, content, this._sha, '更新链接配置');
      this._sha = result.sha;
      this.toast.success('链接配置已保存');
    } catch (err) {
      this.toast.error(`保存失败：${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存修改';
    }
  }
}

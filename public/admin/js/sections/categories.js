/**
 * 分类管理 —— 编辑 src/config/categories.ts
 */
import { el, clearContainer, formGroup } from '../utils/dom.js';

const CONFIG_PATH = 'src/config/categories.ts';

export class CategoriesSection {
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
    this._loaded = false;
    this.categories = [];
  }

  async render(container) {
    clearContainer(container);

    const header = el('div', { className: 'section-header' });
    header.appendChild(el('h2', { className: 'section-title' }, '分类管理'));
    const saveBtn = el('button', { className: 'admin-btn admin-btn-primary', id: 'cat-save-btn' }, '💾 保存修改');
    header.appendChild(saveBtn);
    container.appendChild(header);

    const body = el('div', { id: 'cat-body' });
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
      this.categories = this._parseCategories(content);
      this._render(body);
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
    }
  }

  _parseCategories(content) {
    const match = content.match(/export const categories:\s*Category\[\]\s*=\s*\[([\s\S]*?)\];/);
    if (!match) return [];

    const arrayContent = match[1];
    const categories = [];
    // 匹配每个 { slug: '...', name: '...', description: '...' }
    const itemRe = /\{([^}]+)\}/g;
    let m;
    while ((m = itemRe.exec(arrayContent)) !== null) {
      const block = m[1];
      const cat = {};

      const slugMatch = block.match(/slug:\s*'([^']*)'/);
      if (slugMatch) cat.slug = slugMatch[1];

      const nameMatch = block.match(/name:\s*'([^']*)'/);
      if (nameMatch) cat.name = nameMatch[1];

      // description 可能是单行或多行
      const descMatch = block.match(/description:\s*'([^']*)'/);
      if (descMatch) {
        cat.description = descMatch[1];
      } else {
        // 可能是多行的 description（用 + 连接）
        const descMultiRe = /description:\s*([\s\S]*?)(?:,\s*\n|\s*\n\s*\})/;
        const descMulti = block.match(descMultiRe);
        if (descMulti) {
          let desc = descMulti[1].trim();
          // 合并字符串连接 '...' + '...'
          desc = desc.replace(/'\s*\+\s*'/g, '').replace(/^'|'$/g, '').trim();
          cat.description = desc;
        }
      }

      if (cat.slug) categories.push(cat);
    }
    return categories;
  }

  _render(body) {
    clearContainer(body);

    const card = el('div', { className: 'admin-card' });
    card.appendChild(el('h3', { className: 'admin-card-title' }, `分类列表（${this.categories.length} 项）`));

    const list = el('div', { className: 'array-list' });
    this.categories.forEach((cat, idx) => {
      list.appendChild(this._renderCatItem(cat, idx, body));
    });
    card.appendChild(list);

    const addBtn = el('button', {
      className: 'array-add-btn',
      onClick: () => {
        this.categories.push({ slug: '', name: '', description: '' });
        this._render(body);
      },
    }, '＋ 添加分类');
    card.appendChild(addBtn);

    body.appendChild(card);
  }

  _renderCatItem(cat, idx, body) {
    const item = el('div', { className: 'array-item' });

    const itemHeader = el('div', { className: 'array-item-header' });
    itemHeader.appendChild(el('span', { className: 'array-item-label' }, `分类 ${idx + 1}`));
    const removeBtn = el('button', {
      className: 'array-item-remove',
      onClick: () => {
        this.categories.splice(idx, 1);
        this._render(body);
      },
    }, '×');
    itemHeader.appendChild(removeBtn);

    const row1 = el('div', { className: 'form-row' });
    const slugInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: cat.slug || '',
      placeholder: '分类标识（slug）',
      onChange: (e) => { cat.slug = e.target.value; },
    });
    const nameInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: cat.name || '',
      placeholder: '显示名称',
      onChange: (e) => { cat.name = e.target.value; },
    });
    row1.append(formGroup('标识 (slug)', slugInput), formGroup('显示名称', nameInput));

    const descInput = el('textarea', {
      className: 'form-textarea',
      placeholder: '分类描述',
      onChange: (e) => { cat.description = e.target.value; },
    }, cat.description || '');
    descInput.style.minHeight = '60px';

    item.append(itemHeader, row1, formGroup('描述', descInput));
    return item;
  }

  _generateCategoriesTs() {
    const formatCat = (cat, indent = '    ') => {
      const lines = [];
      lines.push(`${indent}  slug: '${cat.slug}'`);
      lines.push(`${indent}  name: '${cat.name}'`);
      // 长描述折行
      if (cat.description && cat.description.length > 60) {
        const words = cat.description;
        lines.push(`${indent}  description:`);
        lines.push(`${indent}    '${words}',`);
      } else {
        lines.push(`${indent}  description: '${cat.description}',`);
      }
      return `${indent}{\n${lines.join('\n')}\n${indent}}`;
    };

    const items = this.categories.map((c) => formatCat(c)).join(',\n');

    return `export interface Category {
  slug: string;
  name: string;
  description: string;
}

export const categories: Category[] = [
${items},
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
`;
  }

  async _save(body) {
    const saveBtn = document.getElementById('cat-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      const content = this._generateCategoriesTs();
      const result = await this.api.writeFile(CONFIG_PATH, content, this._sha, '更新分类配置');
      this._sha = result.sha;
      this.toast.success('分类配置已保存');
    } catch (err) {
      this.toast.error(`保存失败：${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存修改';
    }
  }
}

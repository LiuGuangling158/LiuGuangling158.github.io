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

    const headerRight = el('div', { className: 'admin-flex', style: 'gap: 8px; align-items: center;' });

    // 预览 chip
    if (cat.name) {
      const previewChip = el('span', { className: 'cat-preview-chip' }, cat.name);
      headerRight.appendChild(previewChip);
    }

    const removeBtn = el('button', {
      className: 'array-item-remove',
      onClick: () => {
        this.categories.splice(idx, 1);
        this._render(body);
      },
    }, '×');
    headerRight.appendChild(removeBtn);
    itemHeader.appendChild(headerRight);

    const row1 = el('div', { className: 'form-row' });
    const slugInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: cat.slug || '',
      placeholder: '分类标识（slug）',
      onChange: (e) => {
        cat.slug = e.target.value;
        // 更新 slug 输入框的校验状态
        this._validateSlugField(e.target);
      },
    });
    const nameInput = el('input', {
      className: 'form-input',
      type: 'text',
      value: cat.name || '',
      placeholder: '显示名称',
      onChange: (e) => {
        cat.name = e.target.value;
        // 更新预览 chip
        const chip = item.querySelector('.cat-preview-chip');
        if (chip) chip.textContent = e.target.value || '预览';
      },
    });
    row1.append(formGroup('标识 (slug)', slugInput), formGroup('显示名称', nameInput));

    // 描述 + 字数统计
    const descGroup = el('div', { className: 'form-group' });
    const descLabelRow = el('div', { style: 'display: flex; justify-content: space-between; align-items: center;' });
    descLabelRow.appendChild(el('label', { className: 'form-label' }, '描述'));
    const charCount = el('span', { className: 'char-count' }, `${(cat.description || '').length} 字`);
    descLabelRow.appendChild(charCount);

    const descInput = el('textarea', {
      className: 'form-textarea',
      placeholder: '分类描述',
      onChange: (e) => {
        cat.description = e.target.value;
        charCount.textContent = `${e.target.value.length} 字`;
      },
    }, cat.description || '');
    descInput.style.minHeight = '60px';

    descGroup.append(descLabelRow, descInput);

    item.append(itemHeader, row1, descGroup);
    return item;
  }

  /** 校验 slug 唯一性，给输入框添加视觉提示 */
  _validateSlugField(inputEl) {
    const val = (inputEl.value || '').trim();
    if (!val) {
      inputEl.classList.remove('input-error');
      return;
    }
    const dupCount = this.categories.filter((c) => c.slug === val).length;
    if (dupCount > 1) {
      inputEl.classList.add('input-error');
    } else {
      inputEl.classList.remove('input-error');
    }
  }

  _escape(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  _generateCategoriesTs() {
    const esc = (s) => this._escape(s);

    const items = this.categories.map((cat) => {
      const desc = esc(cat.description);
      const lines = [];
      lines.push(`    slug: '${esc(cat.slug)}',`);
      lines.push(`    name: '${esc(cat.name)}',`);
      if (cat.description && cat.description.length > 60) {
        lines.push(`    description:`);
        lines.push(`      '${desc}',`);
      } else {
        lines.push(`    description: '${desc}',`);
      }
      return `  {\n${lines.join('\n')}\n  }`;
    }).join(',\n');

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
    // slug 唯一性校验
    const slugs = this.categories.map((c) => (c.slug || '').trim()).filter(Boolean);
    const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    if (dupSlugs.length > 0) {
      this.toast.error(`分类标识重复：${dupSlugs.join(', ')}，请确保每个分类的 slug 唯一`);
      return;
    }

    // slug 为空校验
    const emptySlug = this.categories.findIndex((c) => !(c.slug || '').trim());
    if (emptySlug >= 0) {
      this.toast.error(`第 ${emptySlug + 1} 个分类的标识 (slug) 不能为空`);
      return;
    }

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

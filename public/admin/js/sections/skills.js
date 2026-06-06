/**
 * 技能徽章管理 —— 编辑 src/config/skills.ts
 */
import { el, clearContainer } from '../utils/dom.js';

const CONFIG_PATH = 'src/config/skills.ts';

export class SkillsSection {
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
    this._loaded = false;
    this.skills = [];
  }

  async render(container) {
    clearContainer(container);

    // 头部
    const header = el('div', { className: 'section-header' });
    header.appendChild(el('h2', { className: 'section-title' }, '技能管理'));
    const saveBtn = el('button', { className: 'admin-btn admin-btn-primary', id: 'skills-save-btn' }, '💾 保存修改');
    header.appendChild(saveBtn);
    container.appendChild(header);

    // 内容区
    const body = el('div', { id: 'skills-body' });
    body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>加载中...</span></div>';
    container.appendChild(body);

    await this._load(body);

    // 保存事件
    saveBtn.addEventListener('click', () => this._save(body));
  }

  async _load(body) {
    try {
      const { content, sha } = await this.api.readFile(CONFIG_PATH);
      this._sha = sha;
      this._rawContent = content;
      this.skills = this._parseSkills(content);
      this._render(body);
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
    }
  }

  _parseSkills(content) {
    // 匹配数组内容
    const match = content.match(/export const skills:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/);
    if (!match) return [];

    const arrayContent = match[1];
    const skills = [];
    // 匹配每个字符串
    const strRe = /'([^']*)'/g;
    let m;
    while ((m = strRe.exec(arrayContent)) !== null) {
      skills.push(m[1]);
    }
    return skills;
  }

  _render(body) {
    clearContainer(body);

    const card = el('div', { className: 'admin-card' });
    const title = el('h3', { className: 'admin-card-title' }, `技能列表（${this.skills.length} 项）`);
    card.appendChild(title);

    if (this.skills.length === 0) {
      card.appendChild(el('p', { className: 'admin-text-muted' }, '暂无技能'));
    }

    const tagList = el('div', { className: 'tag-list', id: 'skills-tag-list' });

    this.skills.forEach((skill, idx) => {
      const tag = el('div', { className: 'tag-item' });
      const text = el('span', {}, skill);
      const removeBtn = el('button', {
        className: 'tag-remove',
        onClick: () => this._removeSkill(idx, body),
      }, '×');
      tag.append(text, removeBtn);
      tagList.appendChild(tag);
    });

    card.appendChild(tagList);

    // 添加输入
    const inputWrap = el('div', { className: 'tag-input-wrap' });
    const input = el('input', {
      className: 'form-input',
      type: 'text',
      id: 'new-skill-input',
      placeholder: '输入新技能名称，按 Enter 添加',
      onKeydown: (e) => {
        if (e.key === 'Enter') {
          this._addSkill(body);
        }
      },
    });
    const addBtn = el('button', {
      className: 'admin-btn admin-btn-primary admin-btn-sm',
      onClick: () => this._addSkill(body),
    }, '＋ 添加');

    inputWrap.append(input, addBtn);
    card.appendChild(inputWrap);
    body.appendChild(card);
  }

  _addSkill(body) {
    const input = document.getElementById('new-skill-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (this.skills.includes(val)) {
      this.toast.info(`"${val}" 已存在`);
      return;
    }
    this.skills.push(val);
    input.value = '';
    this._render(body);
  }

  _removeSkill(idx, body) {
    this.skills.splice(idx, 1);
    this._render(body);
  }

  _generateSkillsTs() {
    const items = this.skills.map((s) => `  '${s}'`).join(',\n');
    return `/**
 * 技能列表 —— 以卡片徽章形式展示在首页
 * 增删改只需编辑此数组
 */
export const skills: string[] = [
${items}
];
`;
  }

  async _save(body) {
    const saveBtn = document.getElementById('skills-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      const content = this._generateSkillsTs();
      const result = await this.api.writeFile(CONFIG_PATH, content, this._sha, '更新技能列表');
      this._sha = result.sha;
      this.toast.success('技能列表已保存');
    } catch (err) {
      this.toast.error(`保存失败：${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存修改';
    }
  }
}

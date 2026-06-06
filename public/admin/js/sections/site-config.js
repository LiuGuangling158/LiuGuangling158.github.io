/**
 * 站点配置管理 —— 编辑 src/config/site.ts
 */
import { el, clearContainer, formGroup } from '../utils/dom.js';

const CONFIG_PATH = 'src/config/site.ts';

export class SiteConfigSection {
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
    this._loaded = false;
    this.site = {};
    this.giscus = {};
  }

  async render(container) {
    clearContainer(container);

    const header = el('div', { className: 'section-header' });
    header.appendChild(el('h2', { className: 'section-title' }, '站点配置'));
    const saveBtn = el('button', { className: 'admin-btn admin-btn-primary', id: 'site-save-btn' }, '💾 保存修改');
    header.appendChild(saveBtn);
    container.appendChild(header);

    const body = el('div', { id: 'site-body' });
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
      this.site = this._parseSite(content);
      this.giscus = this._parseGiscus(content);
      this._render(body);
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
    }
  }

  _parseObj(content, objName) {
    const re = new RegExp(`export const ${objName}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*as\\s*const`);
    const fallbackRe = new RegExp(`export const ${objName}\\s*=\\s*\\{([\\s\\S]*?)\\};`);
    const match = content.match(re) || content.match(fallbackRe);
    if (!match) return {};

    const block = match[1];
    const result = {};

    // 匹配 key: value 对
    // 支持字符串 '...' 和布尔值 true/false
    const lines = block.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('//')) continue;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      let rawVal = trimmed.slice(colonIdx + 1).trim();

      // 去掉结尾逗号和 as const
      rawVal = rawVal.replace(/,\s*$/, '').replace(/\s+as\s+const\s*$/, '');

      // 布尔值
      if (rawVal === 'true') {
        result[key] = true;
      } else if (rawVal === 'false') {
        result[key] = false;
      } else {
        // 字符串
        let val = rawVal;
        if ((val.startsWith("'") && val.endsWith("'")) ||
            (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1);
        }
        result[key] = val;
      }
    }

    return result;
  }

  _parseSite(content) {
    return this._parseObj(content, 'site');
  }

  _parseGiscus(content) {
    const giscusData = this._parseObj(content, 'giscus');
    // 特殊处理数字字符串字段（strict, reactionsEnabled, emitMetadata 在 TS 中是字符串 '1'/'0'）
    return giscusData;
  }

  _render(body) {
    clearContainer(body);

    // === 站点信息 ===
    const siteCard = el('div', { className: 'admin-card' });
    siteCard.appendChild(el('h3', { className: 'admin-card-title' }, '站点信息'));

    const siteFields = [
      ['name', '站点名称', 'text'],
      ['title', 'SEO 标题', 'text'],
      ['description', '站点描述', 'text'],
      ['avatar', '头像路径', 'text'],
      ['favicon', 'Favicon 路径', 'text'],
      ['author', '作者名', 'text'],
      ['url', '站点 URL', 'url'],
      ['locale', '语言地区', 'text'],
      ['github', 'GitHub 地址', 'url'],
    ];

    siteFields.forEach(([key, label, type]) => {
      const input = el('input', {
        className: 'form-input',
        type: type,
        id: `site-${key}`,
        value: this.site[key] || '',
      });
      siteCard.appendChild(formGroup(label, input));
    });

    body.appendChild(siteCard);

    // === Giscus 评论 ===
    const giscusCard = el('div', { className: 'admin-card' });
    giscusCard.appendChild(el('h3', { className: 'admin-card-title' }, 'Giscus 评论配置'));

    const enabledLabel = el('label', { className: 'form-check' });
    const enabledCheck = el('input', { type: 'checkbox', id: 'giscus-enabled' });
    if (this.giscus.enabled) enabledCheck.checked = true;
    enabledLabel.append(enabledCheck, '启用评论');
    giscusCard.appendChild(el('div', { className: 'form-group' }, enabledLabel));

    const giscusFields = [
      ['repo', '仓库 (owner/repo)', 'text'],
      ['repoId', 'Repository ID', 'text'],
      ['category', 'Discussion 分类名', 'text'],
      ['categoryId', 'Category ID', 'text'],
      ['mapping', '映射方式', 'text'],
      ['strict', '严格匹配', 'text'],
      ['reactionsEnabled', 'Reactions 启用', 'text'],
      ['emitMetadata', '发送元数据', 'text'],
      ['inputPosition', '输入框位置', 'text'],
      ['theme', '主题', 'text'],
      ['lang', '语言', 'text'],
    ];

    giscusFields.forEach(([key, label, type]) => {
      const val = this.giscus[key] !== undefined ? String(this.giscus[key]) : '';
      const input = el('input', {
        className: 'form-input',
        type: type,
        id: `giscus-${key}`,
        value: val,
      });
      giscusCard.appendChild(formGroup(label, input));
    });

    body.appendChild(giscusCard);
  }

  _readFormValues() {
    const site = {};
    const siteKeys = ['name', 'title', 'description', 'avatar', 'favicon', 'author', 'url', 'locale', 'github'];
    siteKeys.forEach((k) => {
      const el = document.getElementById(`site-${k}`);
      if (el) site[k] = el.value;
    });

    const giscus = {};
    const enabledCheck = document.getElementById('giscus-enabled');
    giscus.enabled = enabledCheck ? enabledCheck.checked : false;
    const giscusKeys = ['repo', 'repoId', 'category', 'categoryId', 'mapping', 'strict', 'reactionsEnabled', 'emitMetadata', 'inputPosition', 'theme', 'lang'];
    giscusKeys.forEach((k) => {
      const el = document.getElementById(`giscus-${k}`);
      if (el) giscus[k] = el.value;
    });

    return { site, giscus };
  }

  _escape(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  _generateSiteTs(siteData, giscusData) {
    const s = siteData;
    const g = giscusData;

    const esc = (val) => this._escape(val);

    const giscusLines = [];
    giscusLines.push(`  enabled: ${g.enabled},`);
    giscusLines.push(`  repo: '${esc(g.repo)}',`);
    giscusLines.push(`  repoId: '${esc(g.repoId)}',`);
    giscusLines.push(`  category: '${esc(g.category)}',`);
    giscusLines.push(`  categoryId: '${esc(g.categoryId)}',`);
    giscusLines.push(`  mapping: '${esc(g.mapping)}' as const,`);
    giscusLines.push(`  strict: '${esc(g.strict)}',`);
    giscusLines.push(`  reactionsEnabled: '${esc(g.reactionsEnabled)}',`);
    giscusLines.push(`  emitMetadata: '${esc(g.emitMetadata)}',`);
    giscusLines.push(`  inputPosition: '${esc(g.inputPosition)}' as const,`);
    giscusLines.push(`  theme: '${esc(g.theme)}',`);
    giscusLines.push(`  lang: '${esc(g.lang)}',`);

    return `export const site = {
  name: '${esc(s.name)}',
  title: '${esc(s.title)}',
  description: '${esc(s.description)}',
  /** 头像：public/avatar.jpg */
  avatar: '${esc(s.avatar)}',
  /** 浏览器图标：public/favicon.png */
  favicon: '${esc(s.favicon)}',
  author: '${esc(s.author)}',
  url: '${esc(s.url)}',
  locale: '${esc(s.locale)}',
  github: '${esc(s.github)}',
} as const;

/** 在 https://giscus.app/zh-CN 生成后填入；留空则评论区显示配置提示 */
export const giscus = {
${giscusLines.join('\n')}
};
`;
  }

  async _save(body) {
    const saveBtn = document.getElementById('site-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      const { site, giscus } = this._readFormValues();
      const content = this._generateSiteTs(site, giscus);
      const result = await this.api.writeFile(CONFIG_PATH, content, this._sha, '更新站点配置');
      this._sha = result.sha;
      this.site = site;
      this.giscus = giscus;
      this.toast.success('站点配置已保存');
    } catch (err) {
      this.toast.error(`保存失败：${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存修改';
    }
  }
}

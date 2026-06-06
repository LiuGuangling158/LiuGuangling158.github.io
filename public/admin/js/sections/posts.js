/**
 * 博客文章管理 —— 列表 + 新建/编辑 + 删除
 */
import { el, formGroup, clearContainer, toggle } from '../utils/dom.js';
import { parseFrontmatter, generateMarkdown, generateFilename } from '../utils/frontmatter.js';

const BLOG_DIR = 'src/content/blog';

export class PostsSection {
  constructor(api, toast, modal) {
    this.api = api;
    this.toast = toast;
    this.modal = modal;
    this._loaded = false;
    this.posts = [];
    this.editingPost = null; // 正在编辑的文章
  }

  async render(container) {
    clearContainer(container);

    // 头部
    const header = el('div', { className: 'section-header' });
    const title = el('h2', { className: 'section-title' }, '文章管理');
    const actions = el('div', { className: 'admin-flex admin-gap-4' });
    const newBtn = el('button', {
      className: 'admin-btn admin-btn-primary',
      onClick: () => this._showEditor(container, null),
    }, '＋ 新建文章');
    const refreshBtn = el('button', {
      className: 'admin-btn admin-btn-cancel',
      onClick: () => this._loadPosts(container),
    }, '🔄 刷新');

    actions.append(newBtn, refreshBtn);
    header.append(title, actions);

    // 列表容器
    const listWrap = el('div', { id: 'post-list-wrap' });
    // 编辑器容器
    const editorWrap = el('div', { id: 'post-editor-wrap' });

    container.append(header, listWrap, editorWrap);

    await this._loadPosts(container);
  }

  async _loadPosts(container) {
    const listWrap = container.querySelector('#post-list-wrap');
    if (!listWrap) return;

    listWrap.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>加载文章列表...</span></div>';

    try {
      const files = await this.api.listDirectory(BLOG_DIR);
      this.posts = []; // 将被填充

      // 读取每篇文章的 frontmatter（不读正文，节省请求）
      // 但 GitHub Contents API 对目录请求已经返回了文件列表
      // 为了获取 frontmatter 需要逐个读取
      const postPromises = files
        .filter((f) => f.name.endsWith('.md') || f.name.endsWith('.mdx'))
        .map(async (file) => {
          try {
            const { content, sha } = await this.api.readFile(file.path);
            const parsed = parseFrontmatter(content);
            return {
              name: file.name,
              path: file.path,
              sha,
              ...(parsed?.frontmatter || {}),
              _raw: content,
            };
          } catch {
            return null;
          }
        });

      const results = await Promise.all(postPromises);
      this.posts = results.filter(Boolean);

      this._renderPostList(listWrap, container);
    } catch (err) {
      listWrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">加载失败：${err.message}</p></div>`;
      this.toast.error(`加载文章列表失败：${err.message}`);
    }
  }

  _renderPostList(listWrap, container) {
    clearContainer(listWrap);

    if (this.posts.length === 0) {
      listWrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><p class="empty-state-text">还没有文章，点击"新建文章"开始创作</p></div>`;
      return;
    }

    // 按发布日期倒序
    const sorted = [...this.posts].sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const db = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return db - da;
    });

    const tableWrap = el('div', { className: 'admin-table-wrap' });
    const table = el('table', { className: 'admin-table' });
    table.innerHTML = `
      <thead>
        <tr>
          <th>标题</th>
          <th>分类</th>
          <th>日期</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
    `;

    const tbody = el('tbody');
    sorted.forEach((post) => {
      const pubDate = post.pubDate ? this._fmtDate(post.pubDate) : '-';
      const statusClass = post.draft ? 'status-draft' : 'status-published';
      const statusText = post.draft ? '草稿' : '已发布';

      const tr = el('tr');
      tr.innerHTML = `
        <td><strong>${this._esc(post.title || post.name)}</strong></td>
        <td>${this._esc(post.category || '未分类')}</td>
        <td>${pubDate}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      `;

      const actionsTd = el('td');
      const actionsDiv = el('div', { className: 'admin-table-actions' });
      const editBtn = el('button', {
        className: 'admin-btn admin-btn-sm admin-btn-primary',
        onClick: () => this._showEditor(container, post),
      }, '编辑');
      const deleteBtn = el('button', {
        className: 'admin-btn admin-btn-sm admin-btn-danger',
        onClick: () => this._deletePost(post, listWrap, container),
      }, '删除');
      actionsDiv.append(editBtn, deleteBtn);
      actionsTd.appendChild(actionsDiv);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    listWrap.appendChild(tableWrap);
  }

  _showEditor(container, post) {
    const editorWrap = container.querySelector('#post-editor-wrap');
    if (!editorWrap) return;
    clearContainer(editorWrap);

    this.editingPost = post;
    const isNew = !post;

    // 解析现有数据
    let fm = {};
    let body = '';
    if (post && post._raw) {
      const parsed = parseFrontmatter(post._raw);
      if (parsed) {
        fm = parsed.frontmatter;
        body = parsed.body;
      }
    }

    // 头部
    const header = el('div', { className: 'section-header' });
    header.appendChild(el('h3', { className: 'section-title' }, isNew ? '新建文章' : `编辑：${fm.title || post.name}`));

    const headerActions = el('div', { className: 'admin-flex admin-gap-4' });
    const saveBtn = el('button', {
      className: 'admin-btn admin-btn-primary',
      id: 'post-save-btn',
    }, '💾 保存');
    const cancelBtn = el('button', {
      className: 'admin-btn admin-btn-cancel',
      onClick: () => {
        this.editingPost = null;
        clearContainer(editorWrap);
        this._loadPosts(container);
      },
    }, '取消');

    headerActions.append(saveBtn, cancelBtn);
    header.appendChild(headerActions);

    // 编辑器主体
    const editor = el('div', { className: 'post-editor' });

    // 左侧：frontmatter 表单
    const sidebar = el('div', { className: 'post-editor-sidebar' });

    const titleInput = el('input', { className: 'form-input', type: 'text', id: 'fm-title', value: fm.title || '', placeholder: '文章标题 *' });
    const descInput = el('input', { className: 'form-input', type: 'text', id: 'fm-desc', value: fm.description || '', placeholder: '摘要（可选）' });
    const pubDateInput = el('input', { className: 'form-input', type: 'date', id: 'fm-pubdate', value: fm.pubDate ? this._toDateStr(fm.pubDate) : this._todayStr() });
    const updDateInput = el('input', { className: 'form-input', type: 'date', id: 'fm-upddate', value: fm.updatedDate ? this._toDateStr(fm.updatedDate) : '' });
    const catInput = el('input', { className: 'form-input', type: 'text', id: 'fm-category', value: fm.category || '', placeholder: '分类（默认：未分类）' });
    const coverInput = el('input', { className: 'form-input', type: 'text', id: 'fm-cover', value: fm.cover || '', placeholder: '封面图片路径（可选）' });

    const draftCheckLabel = el('label', { className: 'form-check' });
    const draftCheck = el('input', { type: 'checkbox', id: 'fm-draft' });
    if (fm.draft) draftCheck.checked = true;
    draftCheckLabel.append(draftCheck, '草稿（不在站点中显示）');

    const filenameInput = el('input', {
      className: 'form-input',
      type: 'text',
      id: 'fm-filename',
      value: post ? post.name : '',
      placeholder: '留空则自动生成',
    });

    sidebar.append(
      formGroup('标题 *', titleInput),
      formGroup('摘要', descInput),
      formGroup('发布日期 *', pubDateInput),
      formGroup('更新日期', updDateInput),
      formGroup('分类', catInput),
      formGroup('封面图片', coverInput),
      el('div', { className: 'form-group' }, draftCheckLabel),
      formGroup('文件名', filenameInput, '留空则根据标题和日期自动生成'),
    );

    // 右侧：Markdown 编辑器
    const bodyPanel = el('div', { className: 'post-editor-body' });
    const toolbar = el('div', { className: 'post-editor-toolbar' });
    const tabs = el('div', { className: 'post-editor-tabs' });
    const editTab = el('button', {
      className: 'post-editor-tab active',
      'data-mode': 'edit',
      onClick: () => _switchMode('edit'),
    }, '✏️ 编辑');
    const previewTab = el('button', {
      className: 'post-editor-tab',
      'data-mode': 'preview',
      onClick: () => _switchMode('preview'),
    }, '👁 预览');

    tabs.append(editTab, previewTab);
    toolbar.appendChild(tabs);

    const textarea = el('textarea', {
      className: 'form-textarea',
      id: 'fm-body',
      placeholder: 'Markdown 正文...',
    }, body);
    textarea.style.flex = '1';
    textarea.style.minHeight = '400px';

    const preview = el('div', { className: 'markdown-preview', id: 'md-preview' });
    preview.style.display = 'none';
    preview.style.flex = '1';

    bodyPanel.append(toolbar, textarea, preview);

    const _switchMode = (mode) => {
      document.querySelectorAll('.post-editor-tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
      if (mode === 'preview') {
        textarea.style.display = 'none';
        preview.style.display = '';
        preview.innerHTML = this._renderMarkdown(textarea.value);
      } else {
        textarea.style.display = '';
        preview.style.display = 'none';
      }
    };

    editor.append(sidebar, bodyPanel);

    editorWrap.append(header, editor);

    // 保存按钮事件
    saveBtn.addEventListener('click', () => this._savePost(container, editorWrap, isNew, post));
  }

  async _savePost(container, editorWrap, isNew, originalPost) {
    const title = document.getElementById('fm-title').value.trim();
    const description = document.getElementById('fm-desc').value.trim();
    const pubDate = document.getElementById('fm-pubdate').value;
    const updatedDate = document.getElementById('fm-upddate').value;
    const category = document.getElementById('fm-category').value.trim();
    const cover = document.getElementById('fm-cover').value.trim();
    const draft = document.getElementById('fm-draft').checked;
    const body = document.getElementById('fm-body').value;
    let filename = document.getElementById('fm-filename').value.trim();

    if (!title) {
      this.toast.error('请输入文章标题');
      return;
    }
    if (!pubDate) {
      this.toast.error('请选择发布日期');
      return;
    }

    // 生成文件名
    if (!filename) {
      filename = generateFilename(title, pubDate);
    }
    if (!filename.endsWith('.md') && !filename.endsWith('.mdx')) {
      filename += '.md';
    }

    const filePath = `${BLOG_DIR}/${filename}`;

    // 如果是新文件或改名了，检查是否已存在
    if (isNew || filename !== originalPost.name) {
      const exists = this.posts.some((p) => p.path === filePath);
      if (exists && isNew) {
        this.toast.error(`文件 ${filename} 已存在，请修改文件名`);
        return;
      }
    }

    // 构建 frontmatter
    const fm = { title };
    if (description) fm.description = description;
    fm.pubDate = pubDate;
    if (updatedDate) fm.updatedDate = updatedDate;
    if (category) fm.category = category;
    fm.draft = draft;
    if (cover) fm.cover = cover;

    const content = generateMarkdown(fm, body);

    const saveBtn = document.getElementById('post-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      let sha = null;
      // 更新时用原来的 sha；新建或改名时不用
      if (originalPost && filename === originalPost.name) {
        sha = originalPost.sha;
      }

      const action = isNew ? '创建' : '更新';
      await this.api.writeFile(filePath, content, sha, `${action}文章：${title}`);
      this.toast.success(`文章"${title}"${action}成功！`);

      this.editingPost = null;
      clearContainer(editorWrap);
      await this._loadPosts(container);
    } catch (err) {
      this.toast.error(`保存失败：${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 保存';
    }
  }

  async _deletePost(post, listWrap, container) {
    const confirmed = await this.modal.confirm(
      '删除文章',
      `确定要删除"${post.title || post.name}"吗？此操作不可撤销。`,
      'danger'
    );
    if (!confirmed) return;

    try {
      await this.api.deleteFile(post.path, post.sha, `删除文章：${post.title || post.name}`);
      this.toast.success(`文章"${post.title || post.name}"已删除`);
      await this._loadPosts(container);
    } catch (err) {
      this.toast.error(`删除失败：${err.message}`);
    }
  }

  /** 简单的 Markdown → HTML 渲染 */
  _renderMarkdown(md) {
    let html = md;

    // 代码块（先处理，避免内部内容被后续规则影响）
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      // 对代码内容做最基本的 HTML 转义
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    });

    // 行内代码（在 block 之后处理）
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 标题
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 粗体 / 斜体
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 分割线
    html = html.replace(/^---$/gm, '<hr>');

    // 引用
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // 无序列表
    html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // 表格（简化版）
    html = html.replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return '<!-- table-sep -->';
      const isHeader = match.includes('---');
      const cellTag = isHeader ? 'th' : 'td';
      return `<tr>${cells.map(c => `<${cellTag}>${c}</${cellTag}>`).join('')}</tr>`;
    });

    // 段落（剩余的非空行）
    html = html.replace(/^(?!<[a-z]|<!--)(.+)$/gm, (_, line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      return `<p>${trimmed}</p>`;
    });

    return html;
  }

  _fmtDate(d) {
    if (d instanceof Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (typeof d === 'string') {
      return d.slice(0, 10);
    }
    return String(d);
  }

  _toDateStr(d) {
    if (d instanceof Date) return this._fmtDate(d);
    if (typeof d === 'string') return d.slice(0, 10);
    return this._todayStr();
  }

  _todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

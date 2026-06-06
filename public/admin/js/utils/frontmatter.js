/**
 * YAML Frontmatter 解析与生成
 *
 * 支持的 frontmatter 字段（与 src/content.config.ts schema 一致）：
 *   title (required)
 *   description (optional)
 *   pubDate (required, YYYY-MM-DD)
 *   updatedDate (optional, YYYY-MM-DD)
 *   category (default: '未分类')
 *   draft (default: false)
 *   cover (optional)
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * 解析 markdown 文件中的 frontmatter
 * @param {string} mdContent
 * @returns {{ frontmatter: object, body: string }|null}
 */
export function parseFrontmatter(mdContent) {
  const match = mdContent.match(FRONTMATTER_RE);
  if (!match) return null;

  const yamlBlock = match[1];
  const body = match[2] || '';
  const frontmatter = {};

  // 逐行解析简单的 YAML
  const lines = yamlBlock.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // 去掉引号
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    // 布尔值
    if (value === 'true') {
      frontmatter[key] = true;
    } else if (value === 'false') {
      frontmatter[key] = false;
    } else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * 生成完整的 markdown 文件内容
 * @param {object} fm - frontmatter 对象
 * @param {string} body - markdown 正文
 * @returns {string}
 */
export function generateMarkdown(fm, body) {
  const lines = ['---'];

  // title (required)
  lines.push(`title: ${yamlString(fm.title)}`);

  // description (optional)
  if (fm.description) {
    lines.push(`description: ${yamlString(fm.description)}`);
  }

  // pubDate (required)
  const pubDate = fm.pubDate instanceof Date
    ? fmtDate(fm.pubDate)
    : fm.pubDate;
  lines.push(`pubDate: ${pubDate}`);

  // updatedDate (optional)
  if (fm.updatedDate) {
    const ud = fm.updatedDate instanceof Date
      ? fmtDate(fm.updatedDate)
      : fm.updatedDate;
    lines.push(`updatedDate: ${ud}`);
  }

  // category
  if (fm.category && fm.category !== '未分类') {
    lines.push(`category: ${yamlString(fm.category)}`);
  }

  // draft
  if (fm.draft) {
    lines.push('draft: true');
  }

  // cover (optional)
  if (fm.cover) {
    lines.push(`cover: ${yamlString(fm.cover)}`);
  }

  lines.push('---');
  lines.push(''); // 空行
  lines.push(body || '');

  return lines.join('\n');
}

/**
 * 将日期格式化为 YYYY-MM-DD
 * @param {Date} d
 * @returns {string}
 */
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * YAML 字符串（需要时加引号）
 * @param {string} s
 * @returns {string}
 */
function yamlString(s) {
  // 包含特殊字符时加引号
  if (/[#:{}[\],&*?|<>'"!%@`\n\r]/.test(s) || s.includes('--')) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}

/**
 * 从文章标题生成安全文件名
 * @param {string} title
 * @returns {string}
 */
export function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*#\n\r\t]/g, '') // 去除非法文件名字符
    .replace(/\s+/g, '-')                 // 空格转连字符
    .replace(/-+/g, '-')                  // 多个连字符合并
    .replace(/^-|-$/g, '')                // 去除首尾连字符
    .toLowerCase()
    || 'untitled';
}

/**
 * 生成新文章的文件名
 * @param {string} title
 * @param {string} pubDate - YYYY-MM-DD
 * @returns {string}
 */
export function generateFilename(title, pubDate) {
  const slug = sanitizeFilename(title);
  return `${pubDate}-${slug}.md`;
}

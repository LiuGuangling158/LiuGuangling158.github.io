/**
 * GitHub REST API 客户端
 * 通过 GitHub Contents API 读写文件
 */
export class ApiClient {
  #token;
  #owner;
  #repo;
  #baseUrl;

  constructor(token, owner, repo) {
    this.#token = token;
    this.#owner = owner;
    this.#repo = repo;
    this.#baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
  }

  #headers() {
    return {
      Authorization: `Bearer ${this.#token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async #handleResponse(res) {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.message || `GitHub API error: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return res.json();
  }

  /**
   * Unicode 安全 base64 解码
   */
  #decode(b64) {
    const cleaned = b64.replace(/\s/g, '');
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  /**
   * Unicode 安全 base64 编码
   */
  #encode(str) {
    const bytes = new TextEncoder().encode(str);
    const binary = String.fromCodePoint(...bytes);
    return btoa(binary);
  }

  /**
   * 读取文件内容
   * @param {string} path - 相对于仓库根目录的路径
   * @returns {Promise<{content: string, sha: string, path: string}>}
   */
  async readFile(path) {
    const res = await fetch(`${this.#baseUrl}/${path}`, {
      headers: this.#headers(),
    });
    const data = await this.#handleResponse(res);
    // 单文件返回的是单个对象，不是数组
    return {
      content: this.#decode(data.content),
      sha: data.sha,
      path: data.path,
    };
  }

  /**
   * 写入文件（创建或更新）
   * @param {string} path
   * @param {string} content - 新文件内容
   * @param {string|null} sha - 更新时需要，创建时为 null
   * @param {string} message - commit 信息
   * @returns {Promise<{sha: string}>}
   */
  async writeFile(path, content, sha, message) {
    const body = { message, content: this.#encode(content) };
    if (sha) body.sha = sha;

    const res = await fetch(`${this.#baseUrl}/${path}`, {
      method: 'PUT',
      headers: { ...this.#headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await this.#handleResponse(res);
    return { sha: data.content.sha };
  }

  /**
   * 删除文件
   * @param {string} path
   * @param {string} sha
   * @param {string} message
   */
  async deleteFile(path, sha, message) {
    const res = await fetch(`${this.#baseUrl}/${path}`, {
      method: 'DELETE',
      headers: { ...this.#headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha }),
    });
    return this.#handleResponse(res);
  }

  /**
   * 列出目录内容
   * @param {string} path
   * @returns {Promise<Array<{name: string, path: string, sha: string, type: string}>>}
   */
  async listDirectory(path) {
    const res = await fetch(`${this.#baseUrl}/${path}`, {
      headers: this.#headers(),
    });
    const data = await this.#handleResponse(res);
    if (!Array.isArray(data)) return [];
    return data.map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      type: item.type,
    }));
  }

  /**
   * 验证 token 有效性
   * @returns {Promise<{login: string, avatar_url: string}>}
   */
  async getUser() {
    const res = await fetch('https://api.github.com/user', {
      headers: this.#headers(),
    });
    if (!res.ok) {
      throw new Error(`Invalid token: ${res.status}`);
    }
    return res.json();
  }
}

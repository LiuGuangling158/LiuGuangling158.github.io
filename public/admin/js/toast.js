/**
 * Toast 通知系统
 */
export class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * 显示一条 toast
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   */
  show(type, message) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span>
      <span class="toast-msg">${this._escape(message)}</span>`;
    this.container.appendChild(toast);

    // 入场动画
    requestAnimationFrame(() => toast.classList.add('toast-enter'));

    // 4 秒后自动消失
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  }

  success(message) { this.show('success', message); }
  error(message) { this.show('error', message); }
  info(message) { this.show('info', message); }

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

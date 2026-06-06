/**
 * 确认弹窗
 */
export class ModalManager {
  /**
   * 确认弹窗，返回 Promise<boolean>
   * @param {string} title
   * @param {string} message
   * @param {'danger'|'normal'} [variant='normal']
   * @returns {Promise<boolean>}
   */
  confirm(title, message, variant = 'normal') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const card = document.createElement('div');
      card.className = 'modal-card';
      card.innerHTML = `
        <h3 class="modal-title">${title}</h3>
        <p class="modal-msg">${message}</p>
        <div class="modal-actions">
          <button class="admin-btn admin-btn-cancel" id="modal-cancel">取消</button>
          <button class="admin-btn ${variant === 'danger' ? 'admin-btn-danger' : 'admin-btn-primary'}" id="modal-confirm">确认</button>
        </div>
      `;
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      const cleanup = () => {
        overlay.classList.add('modal-exit');
        overlay.addEventListener('transitionend', () => overlay.remove());
      };

      card.querySelector('#modal-cancel').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      card.querySelector('#modal-confirm').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });

      // ESC 关闭
      const onKey = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', onKey);
        }
      };
      document.addEventListener('keydown', onKey);

      // 入场动画
      requestAnimationFrame(() => overlay.classList.add('modal-enter'));
    });
  }

  /**
   * 提示弹窗（仅确认）
   * @param {string} title
   * @param {string} message
   */
  alert(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const card = document.createElement('div');
      card.className = 'modal-card';
      card.innerHTML = `
        <h3 class="modal-title">${title}</h3>
        <p class="modal-msg">${message}</p>
        <div class="modal-actions">
          <button class="admin-btn admin-btn-primary" id="modal-ok">知道了</button>
        </div>
      `;
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      const cleanup = () => {
        overlay.classList.add('modal-exit');
        overlay.addEventListener('transitionend', () => {
          overlay.remove();
          resolve();
        });
      };

      card.querySelector('#modal-ok').addEventListener('click', cleanup);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
      });

      const onKey = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          cleanup();
          document.removeEventListener('keydown', onKey);
        }
      };
      document.addEventListener('keydown', onKey);

      requestAnimationFrame(() => overlay.classList.add('modal-enter'));
    });
  }
}

/**
 * DOM 工具函数
 */

/**
 * 创建元素并设置属性/文本
 * @param {string} tag
 * @param {Record<string,string>} [attrs]
 * @param {string|Node|Node[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') {
      node.className = v;
    } else if (k === 'htmlFor') {
      node.setAttribute('for', v);
    } else if (k.startsWith('data-')) {
      node.setAttribute(k, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      node.setAttribute(k, v);
    }
  }
  if (children !== undefined && children !== null) {
    if (Array.isArray(children)) {
      node.append(...children);
    } else if (typeof children === 'string') {
      node.textContent = children;
    } else {
      node.append(children);
    }
  }
  return node;
}

/**
 * 创建带 label 的表单组
 * @param {string} label
 * @param {HTMLElement|HTMLElement[]} input
 * @param {string} [help]
 * @returns {HTMLElement}
 */
export function formGroup(label, input, help) {
  const group = el('div', { className: 'form-group' });
  const labelEl = el('label', { className: 'form-label' }, label);
  group.append(labelEl);
  if (Array.isArray(input)) {
    group.append(...input);
  } else {
    group.append(input);
  }
  if (help) {
    group.append(el('span', { className: 'form-help' }, help));
  }
  return group;
}

/**
 * 显示/隐藏元素
 * @param {HTMLElement} el
 * @param {boolean} visible
 */
export function toggle(el, visible) {
  el.style.display = visible ? '' : 'none';
}

/**
 * 清空容器
 * @param {HTMLElement} container
 */
export function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

(function () {
/* The client module loader serves a bundle under the id of the Loader row that
   owns it. A row can outlive a rename (for example while the host still holds
   the previous generation), so the id this file registers is taken from the
   request URL when it names a single bundle; the package name is the fallback
   for the combo URL and for test harnesses without a document. Re-executing the
   bundle in one page (HMR) must not register the same id twice, hence the
   module-local guard; the function scope keeps re-declaration impossible. */
const moduleId = (() => {
  try {
    const src = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
    const at = src.indexOf('/plugins/??');
    if (at === -1) return null;
    const rest = src.slice(at + '/plugins/??'.length);
    if (rest.indexOf(',') !== -1) return null;
    const cut = rest.indexOf('/client.js');
    if (cut <= 0) return null;
    return decodeURIComponent(rest.slice(0, cut));
  } catch (error) {
    return null;
  }
})() || 'dsh-json-tree-preview';

window.__ModuleLoader__.load({
    id: moduleId,
    factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const DEF_ID = 'dsh-json-tree-preview/json';
    const NS = 'jsonTreePreview';
    const C = 'dsh-json-tree';
    const ROW_H = 20;
    const OVERSCAN = 10;
    const FALLBACK_ROWS = 60;
    const EXTENSIONS = ['json', 'jsonc', 'json5'];

    /* ------------------------------------------------------------------ style */

    const CSS = `
.${C}{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);container-type:inline-size;font-family:ui-monospace,"SFMono-Regular","Cascadia Mono",Consolas,"Liberation Mono",monospace}
.${C}-toolbar{flex:none;display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.${C}-btn{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap}
.${C}-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.${C}-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.${C}-btn svg{display:block;flex:none}
.${C}-search{display:flex;align-items:center;gap:4px;flex:1 1 auto;min-width:64px;max-width:240px;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-base)}
.${C}-search:focus-within{border-color:var(--dsw-alias-brand-primary)}
.${C}-search input{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:12px}
.${C}-search input::placeholder{color:var(--dsw-alias-state-idle-primary)}
.${C}-clear{flex:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0 2px;font-size:14px;line-height:1;border-radius:4px}
.${C}-clear:hover{color:var(--dsw-alias-label-primary)}
.${C}-stat{flex:none;margin-left:auto;color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;font-variant-numeric:tabular-nums}
.${C}-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 0 32px;outline:none}
.${C}-row{position:relative;display:flex;align-items:baseline;gap:4px;padding-right:12px;font-size:12.5px;line-height:20px;white-space:pre;outline:none}
.${C}-row[data-branch="true"]{cursor:pointer}
.${C}-row[data-branch="true"]:hover{background:var(--dsw-alias-bg-layer-1)}
.${C}-row:focus-visible{box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary);border-radius:4px}
.${C}-row[data-match="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
.${C}-row[data-active="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}
.${C}-row[data-selected="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent)}
.${C}-guides{position:absolute;top:0;bottom:0;pointer-events:none;background-image:repeating-linear-gradient(to right,var(--dsw-alias-border-l1) 0 1px,transparent 1px 14px);background-position:6px 0;opacity:.85}
.${C}-chev{flex:none;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;align-self:center;color:var(--dsw-alias-state-idle-primary)}
.${C}-chev svg{transition:transform .12s ease}
.${C}-row[data-open="true"]>.${C}-chev svg{transform:rotate(90deg)}
.${C}-key{cursor:pointer}
.${C}-index{cursor:pointer}
.${C}-value{cursor:pointer}
.${C}-key{color:var(--dsw-alias-brand-primary)}
.${C}-index{color:var(--dsw-alias-state-idle-primary);font-variant-numeric:tabular-nums}
.${C}-punct{color:var(--dsw-alias-label-secondary)}
.${C}-colon{color:var(--dsw-alias-label-secondary);margin-right:2px}
.${C}-count{display:inline-block;align-self:center;margin:0 4px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px;font-variant-numeric:tabular-nums;vertical-align:baseline}
.${C}-preview{color:var(--dsw-alias-label-secondary);opacity:.72;margin-left:4px}
.${C}-value{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:pre}
.${C}-fill{flex:1 1 auto;min-width:0}
.${C}-copyv{flex:none;align-self:center;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-left:2px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;transition:opacity .12s ease,background-color .12s ease,color .12s ease}
.${C}-row:hover .${C}-copyv,.${C}-row:focus-within .${C}-copyv,.${C}-row[data-copied="true"] .${C}-copyv{opacity:1}
.${C}-copyv:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.${C}-copyv:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.${C}-prim[data-kind="string"]{color:var(--dsw-alias-state-success-primary)}
.${C}-prim[data-kind="number"]{color:var(--dsw-alias-state-warn-primary);font-variant-numeric:tabular-nums}
.${C}-prim[data-kind="boolean"]{color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-state-error-primary));font-weight:600}
.${C}-prim[data-kind="null"]{color:var(--dsw-alias-state-idle-primary);font-style:italic}
.${C}-state{flex:1 1 auto;min-height:0;overflow:auto;padding:24px 18px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.${C}-state-title{font-size:13px;font-weight:600;color:var(--dsw-alias-state-error-primary)}
.${C}-state-msg{font-size:12px;color:var(--dsw-alias-label-primary);word-break:break-word}
.${C}-state-at{font-size:11px;color:var(--dsw-alias-label-secondary)}
.${C}-state-code{margin:0;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);font:inherit;font-size:11.5px;line-height:1.5;overflow:auto;max-width:100%;white-space:pre}
.${C}-state-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.${C}-empty{padding:24px 18px;color:var(--dsw-alias-label-secondary);font-size:12px}
.${C}-crumbs{flex:none;display:flex;align-items:center;gap:8px;padding:5px 10px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11px;min-height:26px}
.${C}-path{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.${C}-path[title=""]{color:var(--dsw-alias-label-secondary);opacity:.8}
.${C}-copy{flex:none;height:20px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.${C}-copy:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.${C}-count{flex:none;padding:0 4px;color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums}
@container (max-width:340px){.${C}-stat{display:none}.${C}-btn-label{display:none}.${C}-count{display:none}}
    `;

    /* ---------------------------------------------------------------- locale */

    const EN = {
      title: 'JSON tree',
      expandAll: 'Expand all',
      collapseAll: 'Collapse all',
      filter: 'Filter keys and values',
      noMatch: 'No matching nodes',
      nodes: 'nodes',
      empty: 'Empty document',
      invalid: 'Invalid JSON',
      line: 'Line',
      column: 'Column',
      hint: 'Use the viewer menu above to switch to Code and read the raw text.',
      copy: 'Copy path',
      copied: 'Copied',
      copyValue: 'Copy value',
      pick: 'Click a key to see its path',
    };
    const ZH = {
      title: 'JSON 树',
      expandAll: '全部展开',
      collapseAll: '全部折叠',
      filter: '筛选键和值',
      noMatch: '没有匹配的节点',
      nodes: '个节点',
      empty: '空文档',
      invalid: 'JSON 解析失败',
      line: '行',
      column: '列',
      hint: '可在上方视图菜单切换为「代码」查看原文。',
      copy: '复制路径',
      copied: '已复制',
      copyValue: '复制值',
      pick: '点击键名查看路径',
    };

    /* --------------------------------------------------------------- decoding */

    function decodeContent(content) {
      if (!content) return null;
      if (content.kind === 'text') return content.text;
      if (content.kind === 'bytes') {
        try {
          return new TextDecoder('utf-8').decode(content.data);
        } catch (error) {
          return null;
        }
      }
      return null;
    }

    function stripJsonc(text) {
      let out = '';
      let inString = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
          out += ch;
          if (ch === '\\') { out += text[++i] ?? ''; continue; }
          if (ch === '"') inString = false;
          continue;
        }
        if (ch === '"') { inString = true; out += ch; continue; }
        if (ch === '/' && text[i + 1] === '/') {
          while (i < text.length && text[i] !== '\n') i++;
          out += '\n';
          continue;
        }
        if (ch === '/' && text[i + 1] === '*') {
          i += 2;
          while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
          i += 1;
          continue;
        }
        out += ch;
      }
      let cleaned = '';
      inString = false;
      for (let i = 0; i < out.length; i++) {
        const ch = out[i];
        if (inString) {
          cleaned += ch;
          if (ch === '\\') { cleaned += out[++i] ?? ''; continue; }
          if (ch === '"') inString = false;
          continue;
        }
        if (ch === '"') { inString = true; cleaned += ch; continue; }
        if (ch === ',') {
          let k = i + 1;
          while (k < out.length && /\s/.test(out[k])) k++;
          if (out[k] === '}' || out[k] === ']') continue;
        }
        cleaned += ch;
      }
      return cleaned;
    }

    function locate(text, position) {
      let line = 1;
      let column = 1;
      const stop = Math.min(position, text.length);
      for (let i = 0; i < stop; i++) {
        if (text[i] === '\n') { line++; column = 1; } else column++;
      }
      return { line, column };
    }

    /* V8 no longer reports an offset for every syntax error, so scan for one. */
    function findErrorIndex(text) {
      let i = 0;
      const fail = () => { throw { index: i }; };
      const ws = () => { while (i < text.length && ' \t\n\r'.indexOf(text[i]) >= 0) i++; };
      const str = () => {
        i++;
        while (i < text.length) {
          const ch = text[i];
          if (ch === '\\') { i += 2; continue; }
          if (ch === '"') { i++; return; }
          if (ch === '\n') fail();
          i++;
        }
        fail();
      };
      const num = () => {
        if (text[i] === '-') i++;
        while (i < text.length && text[i] >= '0' && text[i] <= '9') i++;
        if (text[i] === '.') { i++; while (i < text.length && text[i] >= '0' && text[i] <= '9') i++; }
        if (text[i] === 'e' || text[i] === 'E') { i++; if (text[i] === '+' || text[i] === '-') i++; while (i < text.length && text[i] >= '0' && text[i] <= '9') i++; }
      };
      const object = () => {
        i++; ws();
        if (text[i] === '}') { i++; return; }
        for (;;) {
          ws();
          if (text[i] !== '"') fail();
          str(); ws();
          if (text[i] !== ':') fail();
          i++; value(); ws();
          if (text[i] === ',') { i++; continue; }
          if (text[i] === '}') { i++; return; }
          fail();
        }
      };
      const array = () => {
        i++; ws();
        if (text[i] === ']') { i++; return; }
        for (;;) {
          value(); ws();
          if (text[i] === ',') { i++; continue; }
          if (text[i] === ']') { i++; return; }
          fail();
        }
      };
      const value = () => {
        ws();
        if (i >= text.length) fail();
        const ch = text[i];
        if (ch === '{') return object();
        if (ch === '[') return array();
        if (ch === '"') return str();
        if (ch === '-' || (ch >= '0' && ch <= '9')) return num();
        if (text.startsWith('true', i)) { i += 4; return; }
        if (text.startsWith('false', i)) { i += 5; return; }
        if (text.startsWith('null', i)) { i += 4; return; }
        fail();
      };
      try {
        value();
        ws();
        if (i < text.length) fail();
        return -1;
      } catch (failure) {
        return typeof failure.index === 'number' ? failure.index : -1;
      }
    }

    function parseDocument(text, tolerant) {
      const attempt = (source) => {
        try {
          return { ok: true, value: JSON.parse(source) };
        } catch (error) {
          return { ok: false, error };
        }
      };
      let result = attempt(text);
      if (!result.ok && tolerant) {
        const stripped = stripJsonc(text);
        if (stripped !== text) result = attempt(stripped);
      }
      if (result.ok) return result;
      const raw = String((result.error && result.error.message) || result.error);
      const named = /position (\d+)/.exec(raw);
      const position = named ? Number(named[1]) : findErrorIndex(text);
      const at = position >= 0 ? locate(text, position) : null;
      const message = raw
        .replace(/,\s*"[\s\S]*is not valid JSON"?\s*$/i, '')
        .replace(/\s*in JSON at position \d+.*$/i, '')
        .replace(/^JSON\.parse:\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
      return { ok: false, message, at, position };
    }

    /* ------------------------------------------------------------------ tree */

    function isContainer(node) {
      return node.kind === 'object' || node.kind === 'array';
    }

    function shortPrimitive(value) {
      if (value === null) return 'null';
      if (typeof value === 'string') {
        return JSON.stringify(value.length > 16 ? value.slice(0, 16) + '…' : value);
      }
      return String(value);
    }

    function containerPreview(value, kind) {
      const parts = [];
      if (kind === 'array') {
        for (let i = 0; i < value.length && parts.length < 4; i++) parts.push(shortPrimitive(value[i]));
        if (value.length > 4) parts.push('…');
      } else {
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length && parts.length < 3; i++) {
          parts.push(keys[i] + ': ' + shortPrimitive(value[keys[i]]));
        }
        if (keys.length > 3) parts.push('…');
      }
      return parts.join(', ');
    }

    function buildTree(rootValue) {
      const nodes = [];
      const visit = (key, value, depth, parentId, inArray) => {
        const id = nodes.length;
        const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
        const node = {
          id, key, depth, parentId, inArray, kind, value,
          childIds: null, childCount: 0, preview: '',
        };
        nodes.push(node);
        if (kind === 'array' || kind === 'object') {
          const childIds = [];
          if (kind === 'array') {
            for (let i = 0; i < value.length; i++) childIds.push(visit(i, value[i], depth + 1, id, true));
          } else {
            const keys = Object.keys(value);
            for (let i = 0; i < keys.length; i++) {
              childIds.push(visit(keys[i], value[keys[i]], depth + 1, id, false));
            }
          }
          node.childIds = childIds;
          node.childCount = childIds.length;
          node.preview = containerPreview(value, kind);
        }
        return id;
      };
      const rootId = visit('', rootValue, 0, -1, false);
      return { nodes, rootId };
    }

    function computeRows(tree, expanded, openSet) {
      const rows = [];
      const walk = (id) => {
        const node = tree.nodes[id];
        rows.push(node);
        if (!isContainer(node)) return;
        const open = openSet ? openSet.has(id) : expanded.has(id);
        if (!open) return;
        const children = node.childIds;
        for (let i = 0; i < children.length; i++) walk(children[i]);
      };
      walk(tree.rootId);
      return rows;
    }

    function defaultExpanded(tree) {
      if (!tree) return new Set();
      const next = new Set([tree.rootId]);
      if (tree.nodes.length <= 400) {
        for (let i = 0; i < tree.nodes.length; i++) {
          const node = tree.nodes[i];
          if (node.depth <= 1 && isContainer(node)) next.add(node.id);
        }
      }
      return next;
    }

    function primitiveText(node) {
      if (node.kind === 'string') {
        const value = node.value;
        return JSON.stringify(value.length > 240 ? value.slice(0, 240) + '…' : value);
      }
      if (node.kind === 'null') return 'null';
      return String(node.value);
    }

    /* ----------------------------------------------------------------- glyphs */

    function chevron() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M4.5 2.5 8 6l-3.5 3.5',
          stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
        }));
    }

    function expandGlyph() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M2 4.5 6 8l4-3.5',
          stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
        }));
    }

    function collapseGlyph() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M2 7.5 6 4l4 3.5',
          stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
        }));
    }

    /* ------------------------------------------------------------------- rows */

    const STORE_PREFIX = 'dsh-json-tree:';

    function nodePath(tree, node) {
      const chain = [];
      let current = node;
      while (current && current.parentId >= 0) {
        chain.push(current);
        current = tree.nodes[current.parentId];
      }
      chain.reverse();
      let out = '';
      for (let i = 0; i < chain.length; i++) {
        const item = chain[i];
        if (item.inArray) {
          out += '[' + item.key + ']';
        } else {
          const key = String(item.key);
          if (/^[A-Za-z_$][\w$]*$/.test(key)) out += (out ? '.' : '') + key;
          else out += '[' + JSON.stringify(key) + ']';
        }
      }
      return out || '$';
    }

    function readStored(key) {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return new Set(parsed.filter((id) => typeof id === 'number'));
      } catch (error) {
        return null;
      }
    }

    function writeStored(key, openIds) {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        if (openIds.size > 5000) {
          window.localStorage.removeItem(key);
          return;
        }
        window.localStorage.setItem(key, JSON.stringify(Array.from(openIds)));
      } catch (error) { /* a full or blocked store must not break the viewer */ }
    }

    function copyText(text) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
          return true;
        }
      } catch (error) { /* fall through to the legacy path */ }
      try {
        if (typeof document === 'undefined' || !document.body) return false;
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', 'readonly');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        return ok;
      } catch (error) {
        return false;
      }
    }

    function copyGlyph() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        h('rect', {
          x: 4.2, y: 4.2, width: 6, height: 6, rx: 1.2,
          stroke: 'currentColor', strokeWidth: 1.2,
        }),
        h('path', {
          d: 'M7.8 4.2V3.4A1.4 1.4 0 0 0 6.4 2H3.4A1.4 1.4 0 0 0 2 3.4v3A1.4 1.4 0 0 0 3.4 7.8h.8',
          stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round',
        }));
    }

    function checkGlyph() {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M2.5 6.4 5 8.9 9.5 3.4',
          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
        }));
    }

    const Row = React.memo(function JsonTreeRow({
      node, open, matched, activeMatch, selected, onToggle, onSelect, copyLabel,
    }) {
      const branch = isContainer(node);
      const guides = node.depth > 0
        ? h('span', {
          className: C + '-guides',
          style: { left: '10px', width: node.depth * 14 + 'px' },
        })
        : null;
      const marker = h('span', { className: C + '-chev', 'aria-hidden': true }, branch ? chevron() : null);
      const select = (event) => {
        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof onSelect === 'function') onSelect(node.id);
      };
      const [valueCopied, setValueCopied] = useState(false);
      const copyValue = (event) => {
        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
        const payload = branch
          ? JSON.stringify(node.value, null, 2)
          : (node.kind === 'string' ? node.value : String(node.value));
        if (!copyText(payload)) return;
        setValueCopied(true);
        setTimeout(() => setValueCopied(false), 1200);
      };
      const copyButton = h('button', {
        type: 'button',
        className: C + '-copyv',
        title: copyLabel,
        'aria-label': copyLabel,
        tabIndex: -1,
        onClick: copyValue,
      }, valueCopied ? checkGlyph() : copyGlyph());
      const label = node.parentId < 0
        ? null
        : node.inArray
          ? [
            h('span', { key: 'k', className: C + '-index', onClick: select }, String(node.key)),
            h('span', { key: 'c', className: C + '-colon' }, ':'),
          ]
          : [
            h('span', { key: 'k', className: C + '-key', onClick: select }, JSON.stringify(node.key)),
            h('span', { key: 'c', className: C + '-colon' }, ':'),
          ];
      let body;
      if (branch) {
        const bracket = node.kind === 'array' ? ['[', ']'] : ['{', '}'];
        if (open) {
          body = [h('span', { key: 'b', className: C + '-punct' }, bracket[0])];
        } else {
          body = [
            h('span', { key: 'b', className: C + '-punct' }, bracket[0]),
            h('span', { key: 'd', className: C + '-punct' }, '…'),
            h('span', { key: 'e', className: C + '-punct' }, bracket[1]),
            h('span', { key: 'n', className: C + '-count' }, String(node.childCount)),
            node.childCount > 0
              ? h('span', { key: 'p', className: C + '-preview' }, node.preview)
              : null,
          ];
        }
      } else {
        body = [
          h('span', {
            key: 'v',
            className: C + '-prim',
            'data-kind': node.kind,
            title: node.kind === 'string' ? node.value : undefined,
          }, primitiveText(node)),
        ];
      }
      return h('div', {
        className: C + '-row',
        'data-depth': node.depth,
        'data-branch': branch ? 'true' : 'false',
        'data-open': open ? 'true' : 'false',
        'data-match': matched ? 'true' : 'false',
        'data-active': activeMatch ? 'true' : 'false',
        'data-selected': selected ? 'true' : 'false',
        'data-copied': valueCopied ? 'true' : 'false',
        'data-rid': node.id,
        role: 'treeitem',
        'aria-level': node.depth + 1,
        'aria-expanded': branch ? (open ? 'true' : 'false') : undefined,
        tabIndex: branch ? 0 : -1,
        style: { paddingLeft: 10 + node.depth * 14 + 'px' },
        onClick: branch ? () => onToggle(node.id) : undefined,
        onKeyDown: branch
          ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onToggle(node.id);
            }
          }
          : undefined,
      }, guides, marker, label, h('span', { className: C + '-value', onClick: select }, body), copyButton, h('span', { className: C + '-fill' }));
    });

    /* ------------------------------------------------------------------- body */

    function JsonTreeBody(props) {
      const { resourceAddress, content, scrollportRef } = props;
      const direct = props.text;
      const rawT = props.t;
      const t = useCallback((key) => {
        if (typeof rawT === 'function') {
          const value = rawT(key);
          if (typeof value === 'string' && value !== key) return value;
        }
        return EN[key] || key;
      }, [rawT]);

      const text = useMemo(
        () => (typeof direct === 'string' ? direct : decodeContent(content)),
        [direct, content],
      );
      const size = content && content.kind === 'bytes'
        ? content.data.byteLength
        : (typeof props.size === 'number' ? props.size : null);
      const tolerant = /\.(jsonc|json5)(?:[?#]|$)/i.test(typeof resourceAddress === 'string' ? resourceAddress : '')
        || /\.(jsonc|json5)$/i.test(typeof props.path === 'string' ? props.path : '');
      const parsed = useMemo(() => (text == null ? null : parseDocument(text, tolerant)), [text, tolerant]);
      const tree = useMemo(() => (parsed && parsed.ok ? buildTree(parsed.value) : null), [parsed]);

      const [expanded, setExpanded] = useState(() => defaultExpanded(tree));
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(-1);
      const [activeMatch, setActiveMatch] = useState(0);
      const [copied, setCopied] = useState(false);
      const [range, setRange] = useState({ start: 0, end: FALLBACK_ROWS });
      const scrollEl = useRef(null);
      const rowsRef = useRef([]);
      const searchRef = useRef(null);
      const storageKey = STORE_PREFIX + (typeof props.path === 'string' && props.path
        ? props.path
        : (typeof resourceAddress === 'string' ? resourceAddress : 'untitled'));

      useEffect(() => {
        setExpanded(readStored(storageKey) || defaultExpanded(tree));
        setSelected(-1);
        if (scrollEl.current) scrollEl.current.scrollTop = 0;
      }, [tree, storageKey]);

      useEffect(() => {
        if (tree) writeStored(storageKey, expanded);
      }, [tree, expanded, storageKey]);

      useEffect(() => {
        if (!copied) return undefined;
        const timer = setTimeout(() => setCopied(false), 1400);
        return () => clearTimeout(timer);
      }, [copied]);

      const toggle = useCallback((id) => {
        setExpanded((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id); else next.add(id);
          return next;
        });
      }, []);

      const expandAll = useCallback(() => {
        if (!tree) return;
        const next = new Set();
        for (let i = 0; i < tree.nodes.length; i++) {
          if (isContainer(tree.nodes[i])) next.add(tree.nodes[i].id);
        }
        setExpanded(next);
      }, [tree]);

      const collapseAll = useCallback(() => {
        setExpanded(new Set());
      }, []);

      const needle = query.trim().toLowerCase();
      const matches = useMemo(() => {
        if (!tree || !needle) return null;
        const found = new Set();
        for (let i = 0; i < tree.nodes.length; i++) {
          const node = tree.nodes[i];
          if (node.parentId < 0) continue;
          let haystack = node.inArray ? '' : String(node.key);
          if (!isContainer(node)) haystack += '\u0000' + String(node.value);
          if (haystack.toLowerCase().indexOf(needle) >= 0) found.add(node.id);
        }
        return found;
      }, [tree, needle]);

      const matchIds = useMemo(() => {
        if (!tree || !matches) return [];
        const ids = [];
        for (let i = 0; i < tree.nodes.length; i++) {
          if (matches.has(tree.nodes[i].id)) ids.push(tree.nodes[i].id);
        }
        return ids;
      }, [tree, matches]);

      useEffect(() => {
        setActiveMatch(0);
      }, [needle]);

      const filterOpen = useMemo(() => {
        if (!tree || !matches) return null;
        const open = new Set();
        matches.forEach((id) => {
          let parent = tree.nodes[id].parentId;
          while (parent >= 0 && !open.has(parent)) {
            open.add(parent);
            parent = tree.nodes[parent].parentId;
          }
        });
        return open;
      }, [tree, matches]);

      const rows = useMemo(
        () => (tree ? computeRows(tree, expanded, filterOpen) : []),
        [tree, expanded, filterOpen],
      );

      const noMatch = matches !== null && matches.size === 0;

      const computeRange = useCallback(() => {
        const el = scrollEl.current;
        const list = rowsRef.current;
        const total = list.length;
        if (total === 0) {
          setRange((previous) => (previous.start === 0 && previous.end === 0 ? previous : { start: 0, end: 0 }));
          return;
        }
        const height = el && el.clientHeight ? el.clientHeight : FALLBACK_ROWS * ROW_H;
        const top = el ? el.scrollTop : 0;
        const start = Math.max(0, Math.min(total - 1, Math.floor(top / ROW_H) - OVERSCAN));
        const end = Math.min(total, Math.ceil((top + height) / ROW_H) + OVERSCAN);
        setRange((previous) => (previous.start === start && previous.end === end ? previous : { start, end }));
      }, []);

      rowsRef.current = rows;

      const attachScroll = useCallback((el) => {
        scrollEl.current = el;
        if (typeof scrollportRef === 'function') scrollportRef(el);
      }, [scrollportRef]);

      useEffect(() => {
        computeRange();
      }, [rows, computeRange]);

      useEffect(() => {
        if (matchIds.length === 0) return;
        const id = matchIds[Math.min(activeMatch, matchIds.length - 1)];
        const index = rows.findIndex((node) => node.id === id);
        if (index < 0) return;
        const el = scrollEl.current;
        if (el) {
          const height = el.clientHeight || FALLBACK_ROWS * ROW_H;
          el.scrollTop = Math.max(0, index * ROW_H - height / 2);
          computeRange();
        } else {
          setRange({ start: Math.max(0, index - OVERSCAN), end: index + FALLBACK_ROWS });
        }
      }, [matchIds, activeMatch, rows, computeRange]);

      const step = useCallback((delta) => {
        setActiveMatch((current) => {
          const total = matchIds.length;
          if (total === 0) return 0;
          return (current + delta + total) % total;
        });
      }, [matchIds.length]);

      const chosen = tree && selected >= 0 && selected < tree.nodes.length ? tree.nodes[selected] : null;
      const chosenPath = chosen ? nodePath(tree, chosen) : '';

      const crumbs = h('div', { className: C + '-crumbs' },
        h('span', { className: C + '-path', title: chosenPath }, chosenPath || t('pick')),
        chosen
          ? h('button', {
            type: 'button',
            className: C + '-copy',
            onClick: () => { setCopied(copyText(chosenPath)); },
          }, copied ? t('copied') : t('copy'))
          : null);

      const toolbar = h('div', { className: C + '-toolbar' },
        h('button', {
          type: 'button', className: C + '-btn', onClick: expandAll, title: t('expandAll'), 'aria-label': t('expandAll'),
        }, expandGlyph(), h('span', { className: C + '-btn-label' }, t('expandAll'))),
        h('button', {
          type: 'button', className: C + '-btn', onClick: collapseAll, title: t('collapseAll'), 'aria-label': t('collapseAll'),
        }, collapseGlyph(), h('span', { className: C + '-btn-label' }, t('collapseAll'))),
        h('div', { className: C + '-search' },
          h('input', {
            ref: searchRef,
            value: query,
            spellCheck: false,
            placeholder: t('filter'),
            'aria-label': t('filter'),
            onChange: (event) => { setQuery(event.target.value); if (scrollEl.current) scrollEl.current.scrollTop = 0; },
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                step(event.shiftKey ? -1 : 1);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setQuery('');
                if (scrollEl.current) scrollEl.current.scrollTop = 0;
              }
            },
          }),
          matchIds.length > 0
            ? h('span', { className: C + '-count' }, (Math.min(activeMatch, matchIds.length - 1) + 1) + '/' + matchIds.length)
            : null,
          query
            ? h('button', {
              type: 'button',
              className: C + '-clear',
              'aria-label': 'clear',
              onClick: () => { setQuery(''); if (scrollEl.current) scrollEl.current.scrollTop = 0; },
            }, '×')
            : null),
        tree
          ? h('span', { className: C + '-stat' },
            tree.nodes.length + ' ' + t('nodes') + (size == null ? '' : ' · ' + (size / 1024).toFixed(1) + ' KB'))
          : null);

      let panel;
      if (text == null || !text.trim()) {
        panel = h('div', { className: C + '-empty' }, t('empty'));
      } else if (parsed && !parsed.ok) {
        let excerpt = null;
        if (parsed.at) {
          const lines = text.split('\n');
          const lineText = lines[parsed.at.line - 1] || '';
          const indent = Math.max(0, parsed.at.column - 1);
          const shown = lineText.length > 160 ? lineText.slice(0, 160) + '…' : lineText;
          excerpt = h('pre', { className: C + '-state-code' }, shown + '\n' + ' '.repeat(Math.min(indent, shown.length)) + '^');
        }
        panel = h('div', { className: C + '-state' },
          h('div', { className: C + '-state-title' }, t('invalid')),
          h('div', { className: C + '-state-msg' }, parsed.message),
          parsed.at
            ? h('div', { className: C + '-state-at' },
              t('line') + ' ' + parsed.at.line + ' · ' + t('column') + ' ' + parsed.at.column)
            : null,
          excerpt,
          h('div', { className: C + '-state-hint' }, t('hint')));
      } else if (!tree) {
        panel = h('div', { className: C + '-empty' }, t('empty'));
      } else {
        const total = rows.length;
        const start = Math.max(0, Math.min(range.start, Math.max(0, total - 1)));
        const end = Math.max(start, Math.min(range.end, total));
        const shown = rows.slice(start, end);
        const children = shown.map((node) => h(Row, {
          key: node.id,
          node,
          open: filterOpen ? filterOpen.has(node.id) : expanded.has(node.id),
          matched: matches ? matches.has(node.id) : false,
          activeMatch: matchIds.length > 0 && node.id === matchIds[Math.min(activeMatch, matchIds.length - 1)],
          selected: node.id === selected,
          onToggle: toggle,
          onSelect: setSelected,
          copyLabel: t('copyValue'),
          copyLabel: t('copyValue'),
        }));
        panel = h('div', {
          className: C + '-scroll',
          ref: attachScroll,
          role: 'tree',
          'aria-label': t('title'),
          onScroll: computeRange,
        }, noMatch
          ? h('div', { className: C + '-empty' }, t('noMatch'))
          : [
            start > 0
              ? h('div', { key: 'pad-top', className: C + '-pad', style: { height: (start * ROW_H) + 'px' } })
              : null,
            children,
            end < total
              ? h('div', { key: 'pad-bottom', className: C + '-pad', style: { height: ((total - end) * ROW_H) + 'px' } })
              : null,
          ]);
      }

      return h('div', {
        className: C,
        'data-json-tree': 'true',
        onKeyDown: (event) => {
          if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
            event.preventDefault();
            if (searchRef.current && typeof searchRef.current.focus === 'function') searchRef.current.focus();
          }
        },
      }, h('style', null, CSS), toolbar, panel, crumbs);
    }

    /* -------------------------------------------------------------- sidebar */

    let translate = null;
    const titleText = () => {
      if (typeof translate === 'function') {
        const value = translate('title');
        if (typeof value === 'string' && value !== 'title') return value;
      }
      return EN.title;
    };

    function SidebarJsonViewer(props) {
      const t = useCallback((key) => {
        if (typeof translate === 'function') {
          const value = translate(key);
          if (typeof value === 'string' && value !== key) return value;
        }
        return EN[key] || key;
      }, []);

      return h(JsonTreeBody, {
        text: typeof props.content === 'string' ? props.content : null,
        path: props.path,
        size: props.size,
        t,
      });
    }

    /* ------------------------------------------------------------------ apply */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        /* No once-only guard here: an HMR reload disposes this generation's
           registrations and then runs apply() again, so a guard would leave the
           sidebar without a viewer. Every registration below is idempotent. */

        /* A previous generation of this module (an HMR reload) can still own the
           locale namespace; the viewer must register even then. */
        try {
          ctx.effect(() => ctx.locale.register(NS, 'en', EN));
          ctx.effect(() => ctx.locale.register(NS, 'zh', ZH));
        } catch (error) { /* the labels fall back to their keys */ }
        try {
          translate = ctx.locale.bind(NS);
        } catch (error) { /* keep the key fallback */ }

        let previewsDone = false;
        let sidebarDone = false;
        const owned = [];

        const registerPreviews = (service) => {
          try {
            owned.push(service.register({
              id: DEF_ID,
              extensions: EXTENSIONS,
              priority: 'extension',
              title: titleText,
              loading: 'bytes-complete',
            }));
          } catch (error) { /* a live generation already owns this id */ }
          try {
            owned.push(ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register({
              name: 'sidebar.right.tab.document',
              key: DEF_ID,
              locale: NS,
            }, JsonTreeBody)));
          } catch (error) { /* the slot is already taken by this generation */ }
          previewsDone = true;
        };

        const registerSidebar = (service) => {
          let present = false;
          try {
            const list = service.getFileViewers ? service.getFileViewers() : [];
            present = Array.isArray(list) && list.some((viewer) => viewer && viewer.id === DEF_ID);
          } catch (error) { present = false; }
          if (present) {
            sidebarDone = true;
            return;
          }
          try {
            owned.push(service.registerFileViewer({
              id: DEF_ID,
              title: titleText,
              exts: EXTENSIONS,
              priority: 50,
              fetchStrategy: 'fsRead',
              component: SidebarJsonViewer,
            }));
          } catch (error) { /* already registered by a live generation */ }
          sidebarDone = true;
        };

        ctx.effect(() => {
          let ticks = 0;
          let timer = null;
          const stop = () => {
            if (timer !== null) {
              clearInterval(timer);
              timer = null;
            }
          };
          const tick = () => {
            if (!previewsDone) {
              const service = ctx.get('documentPreviews');
              if (service && typeof service.register === 'function') {
                try {
                  registerPreviews(service);
                } catch (error) {
                  previewsDone = true;
                }
              }
            }
            if (!sidebarDone) {
              const service = ctx.get('betterSidebar');
              if (service && typeof service.registerFileViewer === 'function') {
                try {
                  registerSidebar(service);
                } catch (error) {
                  sidebarDone = true;
                }
              }
            }
            ticks += 1;
            if ((previewsDone && sidebarDone) || ticks >= 60) stop();
          };
          tick();
          if (!previewsDone || !sidebarDone) timer = setInterval(tick, 200);
          return () => {
            stop();
            for (let i = 0; i < owned.length; i++) {
              try {
                const dispose = owned[i];
                if (typeof dispose === 'function') dispose();
              } catch (error) { /* ignore */ }
            }
            owned.length = 0;
          };
        });

        /* Self-healing watch: closing a tab, an HMR teardown or a plugin reload
           can drop the viewer while this page stays open. When the service no
           longer lists us, install again — the registration is idempotent. */
        let stale = false;
        ctx.effect(() => {
          const timer = setInterval(() => {
            if (stale) return;
            const service = ctx.get('betterSidebar');
            if (!service || typeof service.registerFileViewer !== 'function') return;
            let known = true;
            try {
              const list = service.getFileViewers ? service.getFileViewers() : null;
              if (Array.isArray(list)) {
                known = list.some((viewer) => viewer && viewer.id === DEF_ID);
              }
            } catch (error) { known = true; }
            if (known) return;
            try {
              owned.push(service.registerFileViewer({
                id: DEF_ID,
                title: titleText,
                exts: EXTENSIONS,
                priority: 50,
                fetchStrategy: 'fsRead',
                component: SidebarJsonViewer,
              }));
            } catch (error) { /* another generation won the race */ }
          }, 2000);
          return () => {
            stale = true;
            clearInterval(timer);
          };
        });
      },
    };
  },
  });
})();

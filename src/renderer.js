// Renderer: parses Markdown with marked (GFM mode) and styles it with github-markdown-css.
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// GitHub-style heading anchors (same slug rules as github.com)
const slugCounts = new Map();
function slugify(text) {
  let slug = text.toLowerCase().trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
  const n = slugCounts.get(slug) || 0;
  slugCounts.set(slug, n + 1);
  return n ? `${slug}-${n}` : slug;
}
marked.use({
  hooks: { preprocess(md) { slugCounts.clear(); return md; } },
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const raw = tokens.map(t => t.raw ?? '').join('');
      return `<h${depth} id="${slugify(raw)}">${text}</h${depth}>\n`;
    }
  }
});
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));
marked.setOptions({ gfm: true, breaks: false });

const content = document.getElementById('content');
const viewer = document.getElementById('viewer');
const dropZone = document.getElementById('drop-zone');
const overlay = document.getElementById('drag-overlay');
const filename = document.getElementById('filename');
const html = document.documentElement;

let currentPath = null;

// ---- Theme ----
const savedTheme = localStorage.getItem('theme') ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function applyTheme(t) {
  html.setAttribute('data-theme', t);
  html.style.colorScheme = t;
  document.getElementById('hljs-light').disabled = t === 'dark';
  document.getElementById('hljs-dark').disabled = t !== 'dark';
  document.getElementById('btn-theme').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', t);
}
applyTheme(savedTheme);
const toggleTheme = () => applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
document.getElementById('btn-theme').onclick = toggleTheme;
window.markdowner.onToggleTheme(toggleTheme);

// ---- Rendering ----
function render({ path, content: md, reload }) {
  currentPath = path;
  const scrollY = reload ? viewer.scrollTop : 0;
  let out = marked.parse(md);
  // GFM task lists: style checkboxes like GitHub does.
  out = out.replace(/<input type="checkbox"/g, '<input type="checkbox" class="task-list-item-checkbox"');
  content.innerHTML = out;
  // Resolve relative image paths against the file's directory.
  const dir = path.replace(/[\\/][^\\/]*$/, '');
  content.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!/^(https?:|data:|file:)/i.test(src)) {
      img.src = 'file:///' + (dir + '/' + src).replace(/\\/g, '/');
    }
  });
  filename.textContent = path;
  filename.title = path;
  dropZone.hidden = true;
  viewer.hidden = false;
  viewer.scrollTop = scrollY;
}
window.markdowner.onFileOpened(render);

// Links: anchors scroll, web links open in the browser, .md links open in-app.
content.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  e.preventDefault();
  if (href.startsWith('#')) {
    const el = document.getElementById(decodeURIComponent(href.slice(1)));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  } else if (/^https?:/i.test(href)) {
    window.markdowner.openExternal(href);
  } else if (/\.(md|markdown)$/i.test(href) && currentPath) {
    const dir = currentPath.replace(/[\\/][^\\/]*$/, '');
    window.markdowner.openPath(dir + '\\' + href.replace(/\//g, '\\'));
  }
});

// ---- Open buttons ----
document.getElementById('btn-open').onclick = () => window.markdowner.openDialog();
document.getElementById('btn-open-big').onclick = () => window.markdowner.openDialog();

// ---- Drag & drop ----
let dragDepth = 0;
document.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; overlay.hidden = false; });
document.addEventListener('dragover', e => { e.preventDefault(); });
document.addEventListener('dragleave', e => { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; overlay.hidden = true; } });
document.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0; overlay.hidden = true;
  const file = e.dataTransfer.files[0];
  if (file) window.markdowner.openPath(window.markdowner.pathForFile(file));
});

// ---- Export HTML ----
async function exportHtml() {
  if (!currentPath) return;
  const [ghCss, hlCss] = await Promise.all([
    fetch('../node_modules/github-markdown-css/github-markdown-light.css').then(r => r.text()),
    fetch('../node_modules/highlight.js/styles/github.css').then(r => r.text())
  ]);
  const title = currentPath.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
  const doc = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>${ghCss}\n${hlCss}
.markdown-body{box-sizing:border-box;min-width:200px;max-width:980px;margin:0 auto;padding:45px}
@media (max-width:767px){.markdown-body{padding:15px}}</style></head>
<body><article class="markdown-body">${content.innerHTML}</article></body></html>`;
  window.markdowner.saveHtml({ suggestedName: title + '.html', html: doc });
}
window.markdowner.onRequestExport(exportHtml);

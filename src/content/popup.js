import { ERROR_MESSAGES } from '../shared/config.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, href) {
  const node = element('a', text);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noreferrer noopener';
  return node;
}

export class TranslationPopup {
  constructor({ close, speak }) {
    this.host = element('div');
    this.host.dataset.hovertransRoot = '';
    this.host.style.cssText = 'all:initial!important;position:fixed!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important;color-scheme:light!important;';
    this.root = this.host.attachShadow({ mode: 'open' });
    const style = element('style');
    style.textContent = `
      :host{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#192137}
      *{box-sizing:border-box} .card{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#192137;width:360px;max-width:calc(100vw - 16px);max-height:min(460px,calc(100vh - 24px));overflow:auto;overscroll-behavior:contain;background:#fff;border:1px solid #dbe1ee;border-radius:16px;box-shadow:0 10px 40px #1424492b,0 2px 8px #14244912;padding:17px;text-align:left}
      header{display:flex;align-items:center;gap:8px;color:#6d7590;font-size:11px;font-weight:600;letter-spacing:.04em}
      .mark{display:grid;place-items:center;width:22px;height:22px;border-radius:7px;background:#eeedff;color:#6657d9;font-size:10px}
      .language{margin-left:auto}button{font:inherit;cursor:pointer;border:0;border-radius:8px}button:focus-visible,a:focus-visible{outline:2px solid #7564df;outline-offset:2px}
      .close{background:none;color:#7e8699;padding:0 4px;font-size:20px;line-height:24px}.word-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}
      .word{font-size:19px;font-weight:650;overflow-wrap:anywhere}.speak{background:#f0edff;color:#6150c7;padding:6px 10px;font-size:12px;white-space:nowrap}.speak:disabled{cursor:default;background:#f2f3f6;color:#9096a5}
      .translation{font-size:24px;font-weight:650;line-height:1.3;margin:9px 0 6px;overflow-wrap:anywhere}.alternatives{font-size:14px;color:#5b647c;overflow-wrap:anywhere}.status{margin:12px 0;color:#737c90;font-size:14px}.error{color:#a24d37}
      .examples{border-top:1px solid #eceef5;margin-top:14px;padding-top:12px}.caption{font-size:10px;color:#8a91a1;letter-spacing:.08em;font-weight:700}.example{margin:8px 0 3px;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.attribution{font-size:10px;color:#969ca9}
      a{color:#777f96;text-decoration:none}a:hover{text-decoration:underline}.footer{margin-top:12px;display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#969ca9}.voice-note{font-size:11px;color:#858da0;margin-top:5px}
      [hidden]{display:none!important}
    `;
    this.card = element('section', '', 'card');
    this.card.setAttribute('role', 'region');
    this.card.setAttribute('aria-label', 'Перевод HoverTrans');
    const header = element('header');
    const closeButton = element('button', '×', 'close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Закрыть перевод');
    closeButton.addEventListener('click', close);
    header.append(element('span', 'HT', 'mark'), element('span', 'HOVERTRANS'), element('span', 'EN → RU', 'language'), closeButton);
    const row = element('div', '', 'word-row');
    this.word = element('span', '', 'word');
    this.speakButton = element('button', '▶ Произнести', 'speak');
    this.speakButton.type = 'button';
    this.speakButton.setAttribute('aria-label', 'Произнести по-английски');
    this.speakButton.disabled = true;
    this.speakButton.addEventListener('click', speak);
    row.append(this.word, this.speakButton);
    this.voiceNote = element('div', '', 'voice-note');
    this.translation = element('div', '', 'translation');
    this.translation.setAttribute('aria-live', 'polite');
    this.alternatives = element('div', '', 'alternatives');
    this.status = element('div', '', 'status');
    this.status.setAttribute('role', 'status');
    this.examples = element('div', '', 'examples');
    this.footer = element('div', '', 'footer');
    this.footer.append(link('Перевод: MyMemory ↗', 'https://mymemory.translated.net/'), element('span', 'Ctrl · 500 мс'));
    this.card.append(header, row, this.voiceNote, this.translation, this.alternatives, this.status, this.examples, this.footer);
    this.root.append(style, this.card);
  }

  get visible() { return this.host.isConnected; }
  contains(event) { return event.composedPath().includes(this.host); }
  hit(x, y) {
    const r = this.host.getBoundingClientRect();
    return this.visible && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  show(point) {
    this.point = point;
    this.word.textContent = point.word;
    this.translation.textContent = '';
    this.alternatives.textContent = '';
    this.examples.replaceChildren();
    this.examples.hidden = true;
    this.status.className = 'status';
    this.status.textContent = 'Переводим…';
    this.voiceNote.textContent = '';
    this.speakButton.disabled = true;
    document.documentElement.append(this.host);
    this.position();
  }

  position() {
    if (!this.visible) return;
    const { width, height } = this.host.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(this.point.x - 22, innerWidth - width - margin));
    const above = this.point.y - height - 12;
    const top = above >= margin ? above : Math.max(margin, Math.min(this.point.y + 12, innerHeight - height - margin));
    this.host.style.setProperty('left', `${left}px`, 'important');
    this.host.style.setProperty('top', `${top}px`, 'important');
  }

  result(result) {
    if (result.ok) {
      this.translation.textContent = result.translation;
      this.alternatives.textContent = result.alternatives.join(' · ');
      this.status.textContent = '';
    } else {
      this.status.className = 'status error';
      this.status.textContent = ERROR_MESSAGES[result.error?.code] || ERROR_MESSAGES.UNAVAILABLE;
    }
    this.position();
  }

  setExamples(result) {
    this.examples.dataset.state = result.ok ? 'ready' : (result.error?.code || 'UNAVAILABLE');
    this.examples.replaceChildren();
    this.examples.hidden = !result.ok || !result.examples?.length;
    if (this.examples.hidden) return;
    this.examples.append(element('div', 'ПРИМЕРЫ УПОТРЕБЛЕНИЯ', 'caption'));
    for (const example of result.examples) {
      const credit = element('div', '', 'attribution');
      credit.append(link('Wiktionary', example.sourceUrl), document.createTextNode(' · Free Dictionary API'));
      if (example.licenseUrl) credit.append(document.createTextNode(' · '), link(example.licenseName || 'Лицензия', example.licenseUrl));
      this.examples.append(element('div', example.text, 'example'), credit);
    }
    this.position();
  }

  setVoice(result) {
    const available = result.ok && result.available;
    this.speakButton.disabled = !available;
    this.speakButton.title = available ? 'Произнести локальным английским голосом' : 'Английский голос недоступен';
    this.voiceNote.textContent = available ? '' : 'Английский голос недоступен';
    this.position();
  }

  hide() { this.host.remove(); }
}

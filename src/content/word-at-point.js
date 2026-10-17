import { tokenAt } from '../shared/words.js';

const EXCLUDED = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-hovertrans-root]';

export function wordAtPoint(x, y, doc = document) {
  const element = doc.elementFromPoint(x, y);
  if (!element || element.closest(EXCLUDED) || element.isContentEditable) return null;
  let node, offset;
  if (doc.caretPositionFromPoint) {
    const caret = doc.caretPositionFromPoint(x, y);
    node = caret?.offsetNode;
    offset = caret?.offset;
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    node = range?.startContainer;
    offset = range?.startOffset;
  }
  if (node?.nodeType !== 3 || !node.parentElement || node.parentElement.closest(EXCLUDED)
    || node.parentElement.isContentEditable || node.getRootNode() !== doc) return null;
  const token = tokenAt(node.textContent, offset);
  if (!token) return null;
  const range = doc.createRange();
  range.setStart(node, token.start);
  range.setEnd(node, token.end);
  const rects = [...range.getClientRects()];
  const rect = rects.find(rect => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
  if (!rect || !node.parentElement.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) return null;
  return { ...token, node, rect, x, y };
}

export function sameTarget(a, b) {
  return Boolean(a && b && a.node === b.node && a.start === b.start && a.end === b.end && a.word === b.word);
}

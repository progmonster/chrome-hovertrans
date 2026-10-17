import { createService } from './service.js';
import { createSpeech } from './speech.js';

const service = createService({ speech: createSpeech(chrome.tts) });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  service.handle(message, sender).then(sendResponse, () => sendResponse({
    requestId: message?.requestId, ok: false, error: { code: 'UNAVAILABLE' },
  }));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => service.forgetTab(tabId));

export function chooseVoice(voices) {
  const localEnglish = voices.filter(voice => voice.remote === false && /^en(?:-|$)/i.test(voice.lang || ''));
  return localEnglish.find(voice => voice.lang.toLowerCase() === 'en-us') || localEnglish[0] || null;
}

export function createSpeech(tts, runtime = chrome.runtime) {
  let active = null;
  let pending = null;
  const voices = () => new Promise(resolve => tts.getVoices(resolve));
  return {
    async status() { return { available: Boolean(chooseVoice(await voices())) }; },
    async speak(word, owner, requestId) {
      const utterance = { owner, requestId };
      pending = utterance;
      const voice = chooseVoice(await voices());
      if (pending !== utterance) return { available: false };
      pending = null;
      if (!voice) return { available: false };
      active = utterance;
      await new Promise((resolve, reject) => {
        // Some OS voices emit no events. Never leave the button awaiting speech forever.
        const timer = setTimeout(resolve, 10000);
        const finish = error => {
          clearTimeout(timer);
          if (active === utterance) active = null;
          if (error) reject(new Error('TTS unavailable'));
          else resolve();
        };
        tts.speak(word, {
          voiceName: voice.voiceName, lang: voice.lang, enqueue: false, rate: 0.9,
          onEvent(event) {
            if (['end', 'error', 'interrupted', 'cancelled'].includes(event.type)) finish(event.type === 'error');
          },
        }, () => { if (runtime.lastError) finish(true); });
      });
      return { available: true };
    },
    stop(owner, requestId) {
      if (pending?.owner === owner && pending?.requestId === requestId) pending = null;
      if (active?.owner === owner && active?.requestId === requestId) {
        tts.stop();
        active = null;
      }
    },
    forgetTab(tabId) {
      if (pending?.owner.startsWith(`${tabId}:`)) pending = null;
      if (active?.owner.startsWith(`${tabId}:`)) {
        tts.stop();
        active = null;
      }
    },
  };
}

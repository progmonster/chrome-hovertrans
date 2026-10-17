import { translate } from '../src/providers/mymemory.js';
import { lookupExamples } from '../src/providers/dictionary.js';

// Explicit diagnostic only: ordinary npm test never sends live network requests.
for (const word of ['hello', 'bank', 'run', "don't", 'well-known', 'qzxwvv']) {
  try {
    const result = await translate(word);
    console.log(`${word}: ${result.translation} (${result.provider})`);
  } catch (error) {
    console.log(`${word}: ${error.code || 'UNAVAILABLE'}`);
    if (error.code === 'RATE_LIMIT') break;
  }
}
try {
  const result = await lookupExamples('hello');
  console.log(`hello examples: ${result.examples.length}, attributed: ${result.examples.every(example => example.licenseUrl)}`);
} catch (error) { console.log(`examples: ${error.code || 'UNAVAILABLE'}`); }

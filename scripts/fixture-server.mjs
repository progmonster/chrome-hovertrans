import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const server = createServer(async (req, res) => {
  if (!['/', '/fixture.html'].includes(req.url)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(await readFile(new URL('../tests/fixtures/page.html', import.meta.url)));
});
server.listen(8765, '127.0.0.1', () => console.log('HoverTrans fixture: http://127.0.0.1:8765'));

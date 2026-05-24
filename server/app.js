import createServer from './server.js';

const PORT = process.env.PORT || 3000;
const server = createServer();

server.listen(PORT, () => {
  console.log(`✓ Server běží na http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('\n✓ Server se vypíná...');

  if (typeof server.shutdown === 'function') {
    await server.shutdown();
  } else {
    server.close();
  }

  process.exit(0);
});

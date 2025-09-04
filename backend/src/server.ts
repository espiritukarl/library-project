import { config } from 'dotenv';
config();

import http from 'http';

import { app } from './app';
import { env } from './config/env';

const server = http.createServer(app);

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${env.port}`);
});

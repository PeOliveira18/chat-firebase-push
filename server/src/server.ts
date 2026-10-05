import { createApp } from './app.js';
import { PORT } from './config/env.js';
import { closeAdminApp } from './services/firebaseAdmin.js';

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[api] chat-firebase-push-api ouvindo na porta ${PORT}`);
});

// Desligamento gracioso (o Render envia SIGTERM em novos deploys).
process.on('SIGTERM', () => {
  server.close(() => {
    closeAdminApp().finally(() => process.exit(0));
  });
});

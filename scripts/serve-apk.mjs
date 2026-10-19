import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
const apkName = 'HoneyFlower-0.2.0-prueba.apk';
const apkPath = fileURLToPath(new URL(`../artifacts/android/${apkName}`, import.meta.url));
const iconPath = fileURLToPath(
  new URL(
    '../apps/mobile/src/assets/figma/components/character-imgIlustracionPngAprobadaBrote.png',
    import.meta.url,
  ),
);
const port = Number(process.env.HF_APK_PORT || 8081);
const info = await stat(apkPath);
const page = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Descargar HoneyFlower</title><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#211a30;color:white;font:16px/1.5 system-ui,sans-serif}main{max-width:440px;padding:28px;border-radius:32px;background:#2b213c;text-align:center}img{width:180px;height:180px;object-fit:contain}h1{margin:0 0 8px}p{color:#ded2f0}a{display:block;padding:16px;border-radius:16px;background:#be97f4;color:#211a30;font-weight:700;text-decoration:none}small{color:#bcafd0}</style><main><img src="/icon.png" alt="Tu compañera de hábitos"><h1>HoneyFlower</h1><p>Inicio, Análisis y Perfil.<br>Prueba local para Android.</p><a href="/${apkName}" download>Descargar APK · ${(info.size / 1024 / 1024).toFixed(1)} MB</a><p>Abre la descarga para instalarla. Si Android lo solicita, permite la instalación desde tu navegador.</p><small>Versión 0.2.0 · Android 7 o posterior.<br>Sin cuenta ni servidor. Tus registros se guardan en el celular.</small></main></html>`;
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405);
    response.end();
    return;
  }
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : page);
    return;
  }
  const path = pathname === `/${apkName}` ? apkPath : pathname === '/icon.png' ? iconPath : null;
  if (!path) {
    response.writeHead(404);
    response.end('No encontrado');
    return;
  }
  try {
    const file = await stat(path);
    response.writeHead(200, {
      'Content-Type': path === apkPath ? 'application/vnd.android.package-archive' : 'image/png',
      'Content-Length': file.size,
      ...(path === apkPath ? { 'Content-Disposition': `attachment; filename="${apkName}"` } : {}),
    });
    if (request.method === 'HEAD') response.end();
    else {
      const stream = createReadStream(path);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    }
  } catch {
    response.writeHead(404);
    response.end('Compila primero la APK.');
  }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`Descarga local: http://127.0.0.1:${port}/`);
  for (const entries of Object.values(networkInterfaces()))
    for (const address of entries ?? [])
      if (address.family === 'IPv4' && !address.internal)
        console.log(`Misma red: http://${address.address}:${port}/`);
  console.log('Solo se comparten la APK y su icono. Ctrl+C detiene la descarga.');
});

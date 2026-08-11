export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Sistema de Faltas e Sobras</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #1e293b; }
      p { color: #64748b; margin: 0 0 1.5rem; font-size: 0.875rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.625rem 1.25rem; border-radius: 0.375rem; font: inherit; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #2563eb; color: #ffffff; }
      .primary:hover { background: #1d4ed8; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Carregar Sistema de Faltas e Sobras</h1>
      <p>Clique no botão abaixo para abrir o sistema diretamente.</p>
      <div class="actions">
        <button class="primary" onclick="window.location.href='/'">Abrir Sistema</button>
      </div>
    </div>
  </body>
</html>`;
}

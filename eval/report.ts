import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RunResult } from './types'

function overallPass(result: RunResult): boolean {
  if (result.error) return false
  const deterministicPass = result.deterministic.every((d) => d.pass)
  const judgePass = result.judge?.overallPass ?? false
  return deterministicPass && judgePass
}

export function printSummary(results: RunResult[]): void {
  const rows = results.map((r) => ({
    scenario: r.scenarioLabel,
    körning: `#${r.runIndex + 1}`,
    avslutades: r.terminatedBy,
    turer: r.turnCount,
    deterministisk: r.deterministic.every((d) => d.pass) ? 'OK' : 'FEL',
    domare: r.judge
      ? r.judge.overallPass
        ? 'OK'
        : 'FEL'
      : r.error
        ? 'FEL'
        : '-',
    poäng: r.judge?.score ?? '-',
    godkänt: overallPass(r) ? '✅' : '❌',
  }))
  console.table(rows)
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

export function writeResultArtifact(
  result: RunResult,
  resultsDir: string,
): string {
  ensureDir(resultsDir)
  const safeName = `${result.scenarioId}__run${result.runIndex + 1}`.replace(
    /[^\w-]/g,
    '_',
  )
  const path = join(resultsDir, `${safeName}.json`)
  writeFileSync(path, JSON.stringify(result, null, 2), 'utf-8')
  return path
}

export function writeBatchSummary(
  results: RunResult[],
  resultsDir: string,
): string {
  ensureDir(resultsDir)
  const path = join(resultsDir, 'summary.json')
  const summary = results.map((r) => ({
    scenarioId: r.scenarioId,
    runIndex: r.runIndex,
    terminatedBy: r.terminatedBy,
    turnCount: r.turnCount,
    deterministicPass: r.deterministic.every((d) => d.pass),
    judgePass: r.judge?.overallPass ?? null,
    score: r.judge?.score ?? null,
    overallPass: overallPass(r),
    error: r.error ?? null,
  }))
  writeFileSync(path, JSON.stringify(summary, null, 2), 'utf-8')
  return path
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function writeHtmlReport(
  results: RunResult[],
  resultsDir: string,
): string {
  ensureDir(resultsDir)
  const path = join(resultsDir, 'report.html')
  const dataJson = JSON.stringify(results).replace(/</g, '\\u003c')
  const generatedAt = new Date().toLocaleString('sv-SE')

  const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<title>AI-samtal eval-rapport</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f7f7f8; --panel: #ffffff; --border: #e2e2e6; --text: #1a1a1e;
    --muted: #6b6b73; --accent: #3a5bd9; --ok: #1f8a4c; --fail: #c53030;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #17181c; --panel: #202127; --border: #33343b; --text: #ececef; --muted: #9a9aa2; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
  header h1 { margin: 0 0 0.25rem; font-size: 1.25rem; }
  header p { margin: 0; color: var(--muted); font-size: 0.85rem; }
  .layout { display: grid; grid-template-columns: minmax(340px, 420px) 1fr; gap: 0; height: calc(100vh - 64px); }
  .list { overflow-y: auto; border-right: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
  th { position: sticky; top: 0; background: var(--panel); }
  tbody tr { cursor: pointer; }
  tbody tr:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
  tbody tr.selected { background: color-mix(in srgb, var(--accent) 16%, transparent); }
  .pass { color: var(--ok); font-weight: 600; }
  .fail { color: var(--fail); font-weight: 600; }
  .detail { overflow-y: auto; padding: 1.25rem 1.5rem; }
  .detail h2 { margin-top: 0; font-size: 1.1rem; }
  .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; margin-right: 0.4rem; }
  .badge.ok { background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }
  .badge.bad { background: color-mix(in srgb, var(--fail) 18%, transparent); color: var(--fail); }
  section { margin-bottom: 1.5rem; }
  section h3 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); margin-bottom: 0.5rem; }
  .turn { padding: 0.6rem 0.8rem; border-radius: 10px; margin-bottom: 0.5rem; max-width: 80%; font-size: 0.9rem; }
  .turn.coach { background: var(--panel); border: 1px solid var(--border); }
  .turn.user { background: color-mix(in srgb, var(--accent) 10%, var(--panel)); margin-left: auto; }
  .turn .who { font-size: 0.72rem; color: var(--muted); margin-bottom: 0.2rem; text-transform: uppercase; }
  .turn .text-event { white-space: pre-wrap; }
  .turn .text-event + .text-event { margin-top: 0.35rem; }
  .tool-note { display: block; margin: 0.35rem 0; font-size: 0.78rem; color: var(--accent); font-family: ui-monospace, monospace; }
  .rubric-item { padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .rubric-item .id { font-weight: 600; font-family: ui-monospace, monospace; font-size: 0.8rem; }
  .rubric-item .reasoning { color: var(--muted); margin-top: 0.15rem; }
  .empty { color: var(--muted); padding: 2rem; text-align: center; }
</style>
</head>
<body>
<header>
  <h1>AI-samtal eval-rapport</h1>
  <p>Genererad ${escapeHtml(generatedAt)} · ${results.length} körning(ar)</p>
</header>
<div class="layout">
  <div class="list">
    <table>
      <thead><tr><th>Scenario</th><th>Körning</th><th>Poäng</th><th>Godkänt</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
  <div class="detail" id="detail"><div class="empty">Välj en körning i listan till vänster.</div></div>
</div>
<script>
const DATA = ${dataJson};

function overallPass(r) {
  if (r.error) return false;
  const detOk = r.deterministic.every((d) => d.pass);
  const judgeOk = r.judge ? r.judge.overallPass : false;
  return detOk && judgeOk;
}

function renderRows() {
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  DATA.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.dataset.index = String(i);
    const ok = overallPass(r);
    tr.innerHTML = \`<td>\${r.scenarioLabel}</td><td>#\${r.runIndex + 1}</td><td>\${r.judge ? r.judge.score : '-'}</td><td class="\${ok ? 'pass' : 'fail'}">\${ok ? '✅' : '❌'}</td>\`;
    tr.addEventListener('click', () => selectRun(i));
    tbody.appendChild(tr);
  });
}

// Renders a turn's events in the exact order they happened, so it's visible
// whether a tool call came before, between, or after spoken text.
function renderTurn(t) {
  const who = t.speaker === 'coach' ? 'Coach' : 'Användare';
  const body = t.events.length
    ? t.events
        .map((e) =>
          e.kind === 'toolCall'
            ? \`<span class="tool-note">🔧 \${e.name}(\${JSON.stringify(e.args)})</span>\`
            : \`<div class="text-event">\${e.text}</div>\`
        )
        .join('')
    : '<div class="text-event">(inget tal, endast verktygsanrop)</div>';
  return \`<div class="turn \${t.speaker}"><div class="who">\${who} · tur \${t.turn}</div>\${body}</div>\`;
}

function renderChecklist(title, items, getLabel) {
  if (!items.length) return '';
  const rows = items.map(getLabel).join('');
  return \`<section><h3>\${title}</h3>\${rows}</section>\`;
}

function selectRun(index) {
  document.querySelectorAll('#rows tr').forEach((el) => el.classList.remove('selected'));
  const tr = document.querySelector(\`#rows tr[data-index="\${index}"]\`);
  if (tr) tr.classList.add('selected');

  const r = DATA[index];
  const detail = document.getElementById('detail');
  const ok = overallPass(r);

  const deterministicHtml = renderChecklist('Deterministiska kontroller', r.deterministic, (d) =>
    \`<div class="rubric-item"><span class="badge \${d.pass ? 'ok' : 'bad'}">\${d.pass ? 'OK' : 'FEL'}</span><span class="id">\${d.id}</span>\${d.detail ? '<div class="reasoning">' + d.detail + '</div>' : ''}</div>\`
  );

  const judgeHtml = r.judge
    ? renderChecklist('Domarens bedömning (poäng: ' + r.judge.score + ')', r.judge.items, (it) =>
        \`<div class="rubric-item"><span class="badge \${it.pass ? 'ok' : 'bad'}">\${it.pass ? 'OK' : 'FEL'}</span><span class="id">\${it.id}</span><div class="reasoning">\${it.reasoning}</div></div>\`
      )
    : '<section><h3>Domarens bedömning</h3><p class="empty">Ingen domarbedömning (fel under körningen).</p></section>';

  const errorHtml = r.error ? \`<section><h3>Fel</h3><p>\${r.error}</p></section>\` : '';

  detail.innerHTML = \`
    <h2>\${r.scenarioLabel} — körning #\${r.runIndex + 1} <span class="badge \${ok ? 'ok' : 'bad'}">\${ok ? 'GODKÄNT' : 'EJ GODKÄNT'}</span></h2>
    <p style="color:var(--muted); font-size:0.85rem;">Avslutades: \${r.terminatedBy} · \${r.turnCount} turer \${r.judge ? '· ' + r.judge.summary : ''}</p>
    \${errorHtml}
    \${deterministicHtml}
    \${judgeHtml}
    <section><h3>Transkript</h3>\${r.transcript.map(renderTurn).join('')}</section>
  \`;
}

renderRows();
if (DATA.length) selectRun(0);
</script>
</body>
</html>
`

  writeFileSync(path, html, 'utf-8')
  return path
}

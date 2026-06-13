const fs = require('fs');
const path = require('path');

class ReportGenerator {
  static generateJSON(simulationParams, results) {
    const report = {
      meta: {
        tool: 'gaolaif',
        version: '0.1.0',
        generatedAt: new Date().toISOString(),
        simulationId: simulationParams.sessionId || 'unknown',
      },
      target: {
        contract: simulationParams.contract || 'unknown',
        timestamp: simulationParams.timestamp || Date.now(),
      },
      adversarialModes: (simulationParams.adversarialModes || []).map(id => ({
        id,
        name: ReportGenerator._modeName(id),
        enabled: true,
      })),
      results: {
        summary: {
          total: results.total || 0,
          passed: results.passed || 0,
          failed: results.failed || 0,
        },
        invariants: (results.invariants || []).map(inv => ({
          id: inv.id,
          name: inv.name,
          category: inv.cat || 'unknown',
          status: inv.status,
          detail: inv.detail || '',
          blockNumber: inv.block || null,
        })),
        simulationLogs: results.logs || [],
      },
    };
    return JSON.stringify(report, null, 2);
  }

  static generateMarkdown(simulationParams, results) {
    const date = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const modes = (simulationParams.adversarialModes || []).map(id =>
      `  - **${ReportGenerator._modeName(id)}** (\`${id}\`)`
    ).join('\n');
    const total = results.total || 0;
    const passed = results.passed || 0;
    const failed = results.failed || 0;

    let md = '';
    md += `# Gaolaif Security Integrity Proof\n\n`;
    md += `**Generated:** ${date}  \n`;
    md += `**Simulation ID:** \`${simulationParams.sessionId || 'unknown'}\`  \n`;
    md += `**Target Contract:** \`${simulationParams.contract || 'unknown'}\`  \n\n`;
    md += `---\n\n`;
    md += `## Adversarial Conditions\n\n`;
    md += modes || '  - none\n';
    md += '\n';
    md += `## Invariant Integrity Report\n\n`;
    md += `| Status | Invariant | Category | Detail |\n`;
    md += `|--------|-----------|----------|--------|\n`;

    for (const inv of (results.invariants || [])) {
      const statusIcon = inv.status === 'pass' ? '✓' : inv.status === 'fail' ? '✗' : '○';
      md += `| ${statusIcon} | ${inv.name} | ${inv.cat || '\u2014'} | ${(inv.detail || '\u2014').replace(/\|/g, '\\|')} |\n`;
    }

    md += `\n### Summary\n\n`;
    md += `- **Total Invariants:** ${total}\n`;
    md += `- **Intact:** ${passed}\n`;
    md += `- **Broken:** ${failed}\n`;

    const integrity = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    md += `- **Integrity Score:** ${integrity}%\n\n`;

    if (failed > 0) {
      md += `> **${failed} invariant(s) broken** under simulated adversarial conditions.\n`;
      md += `> Review the failed invariants and consider mitigations.\n\n`;
    } else {
      md += `> All invariants passed under simulated adversarial conditions.\n\n`;
    }

    md += `---\n\n`;
    md += `## Simulation Log\n\n`;
    md += '```\n';
    for (const log of (results.logs || [])) {
      md += `[${log.ts || '\u2014'}] [${log.level || 'info'}] ${log.message}\n`;
    }
    md += '```\n';

    return md;
  }

  static generateHTML(simulationParams, results) {
    const date = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const modes = (simulationParams.adversarialModes || []).map(id =>
      `<li><strong>${ReportGenerator._modeName(id)}</strong> <code>${id}</code></li>`
    ).join('\n');
    const total = results.total || 0;
    const passed = results.passed || 0;
    const failed = results.failed || 0;
    const integrity = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    let rows = '';
    for (const inv of (results.invariants || [])) {
      const icon = inv.status === 'pass' ? '\u2705' : inv.status === 'fail' ? '\u274C' : '\u25CB';
      rows += `<tr><td>${icon}</td><td>${inv.name}</td><td>${inv.cat || '\u2014'}</td><td>${inv.detail || '\u2014'}</td></tr>\n`;
    }

    let logs = '';
    for (const log of (results.logs || [])) {
      logs += `<span style="color:#8b949e">[${log.ts || '\u2014'}]</span> [${log.level || 'info'}] ${log.message}\n`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Gaolaif Security Proof</title>
<style>
  body{background:#0d1117;color:#e6edf3;font-family:'SF Mono','JetBrains Mono','Consolas',monospace;font-size:13px;line-height:1.6;padding:40px;max-width:900px;margin:0 auto}
  h1{color:#f0883e;font-size:22px;border-bottom:1px solid #30363d;padding-bottom:12px}
  h2{color:#e6edf3;font-size:16px;margin-top:32px}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th,td{padding:8px 12px;text-align:left;border:1px solid #30363d}
  th{background:#161b22;color:#8b949e;text-transform:uppercase;font-size:10px;letter-spacing:.5px}
  td{background:#1c2128}
  code{background:#21262d;padding:1px 5px;font-size:12px}
  .summary{display:flex;gap:24px;margin:16px 0}
  .summary div{padding:16px;border:1px solid #30363d;flex:1;text-align:center;background:#161b22}
  .summary .num{font-size:24px;font-weight:700;color:#f0883e}
  .summary .label{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
  .summary .num.pass{color:#3fb950}
  .summary .num.fail{color:#f85149}
  .logs{background:#161b22;border:1px solid #30363d;padding:16px;font-size:11px;color:#8b949e;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;line-height:1.8}
  .integrity{font-size:11px;color:#8b949e;margin-top:32px;border-top:1px solid #30363d;padding-top:16px}
</style>
</head>
<body>
<h1>Gaolaif Security Integrity Proof</h1>
<p>Generated: ${date} &middot; ID: <code>${simulationParams.sessionId || 'unknown'}</code><br>
Target: <code>${simulationParams.contract || 'unknown'}</code></p>

<h2>Adversarial Conditions</h2>
<ul>${modes}</ul>

<h2>Invariant Integrity Report</h2>
<div class="summary">
  <div><div class="num">${total}</div><div class="label">Total</div></div>
  <div><div class="num pass">${passed}</div><div class="label">Intact</div></div>
  <div><div class="num fail">${failed}</div><div class="label">Broken</div></div>
  <div><div class="num">${integrity}%</div><div class="label">Score</div></div>
</div>

<table><thead><tr><th></th><th>Invariant</th><th>Category</th><th>Detail</th></tr></thead><tbody>
${rows}</tbody></table>

<h2>Simulation Log</h2>
<div class="logs">${logs}</div>
<div class="integrity">This proof was generated locally by gaolaif v0.1.0. No data was transmitted externally.</div>
</body>
</html>`;
  }

  static async generatePDF(simulationParams, results, outputDir) {
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch {
      throw new Error('puppeteer not available — install with: npm install puppeteer');
    }

    const html = ReportGenerator.generateHTML(simulationParams, results);
    const filename = `gaolaif-proof-${Date.now()}.pdf`;
    const filepath = path.join(outputDir, filename);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: filepath,
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
      });
    } finally {
      await browser.close();
    }

    return filepath;
  }

  static _modeName(id) {
    const names = {
      oracleStaleness: 'Oracle Staleness',
      sequencerDowntime: 'Sequencer Downtime',
      l2Reorg: 'L2 Reorg',
      flashLoanManipulation: 'Flash Loan Manipulation',
    };
    return names[id] || id;
  }
}

module.exports = { ReportGenerator };

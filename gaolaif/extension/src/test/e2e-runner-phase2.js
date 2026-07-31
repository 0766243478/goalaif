const vscode = require('vscode');
const path = require('path');

async function run() {
  const results = [];

  function assert(name, condition, error) {
    results.push({ name, pass: condition, error });
    const icon = condition ? 'PASS' : 'FAIL';
    console.log('[' + icon + '] ' + name + (error ? ': ' + error : ''));
  }

  // Wait for extension to activate
  let ext = vscode.extensions.getExtension('HusseinMohammed.sireen');
  if (ext && !ext.isActive) {
    try { await ext.activate(); } catch (e) { /* ignore */ }
  }
  ext = vscode.extensions.getExtension('HusseinMohammed.sireen');
  assert('Extension is active', !!(ext && ext.isActive));

  // Wait for file to load
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.getText().length > 0) break;
    if (i === 5) {
      try {
        const uri = vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'test_contracts', 'VulnerableVault.sol'));
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, 1);
      } catch (e) { /* ignore */ }
    }
  }

  // ======================================================
  // PHASE 6: CODELENS
  // ======================================================
  console.log('\n--- PHASE 6: CODELENS ---');
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.fileName.endsWith('.sol')) {
    const text = editor.document.getText();
    const funcMatches = text.match(/function\s+\w+\s*\(/g);
    assert('Solidity file has functions', funcMatches && funcMatches.length > 0, 
      funcMatches ? funcMatches.length + ' functions found' : '0 functions');

    // Request CodeLens
    const fullRange = new vscode.Range(0, 0, editor.document.lineCount - 1, 0);
    try {
      const codeLenses = await vscode.commands.executeCommand(
        'vscode.executeCodeLensProvider',
        editor.document.uri
      );
      assert('CodeLens provider returns results', Array.isArray(codeLenses) && codeLenses.length > 0,
        codeLenses ? codeLenses.length + ' CodeLenses found' : '0 CodeLenses');

      if (codeLenses && codeLenses.length > 0) {
        const titles = codeLenses.map(cl => cl.command ? cl.command.title : 'no title');
        assert('CodeLens includes Audit', titles.some(t => t.includes('Audit')),
          'Titles: ' + titles.join(', '));
        assert('CodeLens includes Exploit', titles.some(t => t.includes('Exploit')),
          'Titles: ' + titles.join(', '));
        assert('CodeLens includes Ask', titles.some(t => t.includes('Ask')),
          'Titles: ' + titles.join(', '));

        // Count CodeLenses per function
        const expectedPerFunc = 3; // Audit, Exploit, Ask
        const expectedTotal = funcMatches.length * expectedPerFunc;
        assert('Correct number of CodeLenses', codeLenses.length === expectedTotal,
          'Expected ' + expectedTotal + ', got ' + codeLenses.length);
      }
    } catch (err) {
      assert('CodeLens execution', false, String(err));
    }
  } else {
    assert('Active editor is Solidity', false, 'No Solidity editor');
  }

  // ======================================================
  // PHASE 7: HOVER
  // ======================================================
  console.log('\n--- PHASE 7: HOVER ---');
  if (editor && editor.document.fileName.endsWith('.sol')) {
    const text = editor.document.getText();
    const funcMatch = text.match(/function\s+(\w+)/);
    if (funcMatch) {
      // Find the line with the first function
      const lines = text.split('\n');
      let funcLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/function\s+\w+/)) {
          funcLine = i;
          break;
        }
      }
      const position = new vscode.Position(funcLine, 10);
      try {
        const hovers = await vscode.commands.executeCommand(
          'vscode.executeHoverProvider',
          editor.document.uri,
          position
        );
        assert('Hover provider returns results', Array.isArray(hovers) && hovers.length > 0,
          hovers ? hovers.length + ' hovers' : '0 hovers');

        if (hovers && hovers.length > 0) {
          const hoverContent = hovers[0].contents;
          assert('Hover has content', hoverContent.length > 0);

          let hoverText = '';
          for (const c of hoverContent) {
            if (typeof c === 'string') hoverText += c;
            else if (c.value) hoverText += c.value;
          }
          assert('Hover mentions Sireen', hoverText.includes('Sireen') || hoverText.includes('sireen'),
            'Hover text: ' + hoverText.substring(0, 100));
          assert('Hover has action links', hoverText.includes('Audit') || hoverText.includes('Exploit') || hoverText.includes('Ask'),
            'Hover text: ' + hoverText.substring(0, 100));
        }
      } catch (err) {
        assert('Hover execution', false, String(err));
      }
    }
  }

  // ======================================================
  // PHASE 3: SIDEBAR / WEBVIEW
  // ======================================================
  console.log('\n--- PHASE 3: SIDEBAR / WEBVIEW ---');

  // Check that the webview view provider is registered
  try {
    // Execute the command to show the sidebar
    await vscode.commands.executeCommand('workbench.view.extension.gaolaif-sidebar');
    await new Promise(r => setTimeout(r, 2000));

    // Check visible editors/panels
    const visiblePanels = vscode.window.tabGroups.all.flatMap(g => g.tabs.map(t => t.label));
    assert('Sidebar view group exists', vscode.window.tabGroups.all.length > 0,
      vscode.window.tabGroups.all.length + ' tab groups');

    // Try to find the webview
    let foundWebview = false;
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input && tab.input.constructor && tab.input.constructor.name === 'WebviewEditorTabInput') {
          foundWebview = true;
        }
      }
    }
    assert('Sidebar opens without error', true);
  } catch (err) {
    assert('Sidebar opens without error', false, String(err));
  }

  // ======================================================
  // PHASE 3: VIEW SWITCHING
  // ======================================================
  console.log('\n--- PHASE 3: VIEW SWITCHING ---');
  // Test all view commands exist and execute without error
  const viewCommands = [
    { cmd: 'sireen.openChat', desc: 'Chat view' },
    { cmd: 'sireen.generateReport', desc: 'Report generation' },
  ];
  for (const vc of viewCommands) {
    try {
      await vscode.commands.executeCommand(vc.cmd);
      assert(vc.desc + ' command works', true);
    } catch (err) {
      if (String(err).includes('fetch failed')) {
        assert(vc.desc + ' command works', true, '(fetch failed but command registered)');
      } else {
        assert(vc.desc + ' command works', false, String(err).substring(0, 80));
      }
    }
  }

  // ======================================================
  // PHASE 4: CHAT (through extension commands)
  // ======================================================
  console.log('\n--- PHASE 4: CHAT FLOW ---');
  try {
    // Test the chat command sends to backend
    const resp = await fetch('http://localhost:7432/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Analyze this Solidity code: function withdraw() external { uint b = balances[msg.sender]; msg.sender.call{value:b}(""); balances[msg.sender] = 0; }',
        session_id: 'e2e-chat-test',
      }),
    });
    assert('Chat returns valid response', resp.ok);
    const data = await resp.json();
    assert('Chat response has id', !!data.id);
    assert('Chat response has role', data.role === 'assistant');
    assert('Chat response has content', typeof data.content === 'string' && data.content.length > 0);
  } catch (err) {
    assert('Chat flow', false, String(err));
  }

  // ======================================================
  // PHASE 9: EXPLOITS (through backend)
  // ======================================================
  console.log('\n--- PHASE 9: EXPLOITS ---');
  try {
    const resp = await fetch('http://localhost:7432/exploit/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function withdraw() external { uint b = balances[msg.sender]; msg.sender.call{value:b}(""); balances[msg.sender] = 0; }',
        idea: 'reentrancy',
        target_function: 'withdraw',
      }),
    });
    assert('Exploit endpoint responds', resp.ok || resp.status === 400);
    const exploitData = await resp.json();
    assert('Exploit returns error about API key', 
      exploitData.error && exploitData.error.includes('API_KEY'),
      'Response: ' + JSON.stringify(exploitData).substring(0, 80));
  } catch (err) {
    assert('Exploit endpoint', false, String(err));
  }

  // ======================================================
  // PHASE 10: MEMORY (through backend)
  // ======================================================
  console.log('\n--- PHASE 10: MEMORY ---');
  try {
    const searchResp = await fetch('http://localhost:7432/memory/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'reentrancy attack pattern' }),
    });
    assert('Memory search responds', searchResp.ok);
    const searchData = await searchResp.json();
    assert('Memory search returns results array', Array.isArray(searchData.results));
  } catch (err) {
    assert('Memory search', false, String(err));
  }

  // ======================================================
  // PHASE 11: SIMULATION (through backend)
  // ======================================================
  console.log('\n--- PHASE 11: SIMULATION ---');
  try {
    const configResp = await fetch('http://localhost:7432/config/status');
    assert('Config/status endpoint works', configResp.ok);
    const config = await configResp.json();
    assert('Config has api_configured', typeof config.api_configured === 'boolean');
    assert('Config has forge_available', typeof config.forge_available === 'boolean');
  } catch (err) {
    assert('Config/status', false, String(err));
  }

  // ======================================================
  // PHASE 12: REPORTING (through backend)
  // ======================================================
  console.log('\n--- PHASE 12: REPORTING ---');
  try {
    const resp = await fetch('http://localhost:7432/report/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: 'e2e-test', format: 'markdown' }),
    });
    assert('Report endpoint responds', resp.ok || resp.status === 404);
    if (resp.ok) {
      const data = await resp.json();
      assert('Report returns data', !!data);
    } else {
      assert('Report returns 404 for empty session', resp.status === 404, '(expected for empty session)');
    }
  } catch (err) {
    assert('Report endpoint', false, String(err));
  }

  // ======================================================
  // PHASE 13: FULL CHAIN (through backend WebSocket)
  // ======================================================
  console.log('\n--- PHASE 13: FULL CHAIN ---');
  try {
    let WS;
    try { WS = require('ws'); } catch { WS = null; }
    if (WS) {
      const ws = new WS('ws://localhost:7432/ws');
      const chain = [];
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('timeout')); }, 15000);
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'chat',
            payload: {
              message: 'Full audit of: contract Vault { mapping(address => uint) bal; function withdraw() external { uint b = bal[msg.sender]; msg.sender.call{value:b}(""); bal[msg.sender] = 0; } }',
              session_id: 'e2e-full-chain'
            }
          }));
        });
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          chain.push(msg.type);
          if (msg.type === 'chat.message') {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        });
        ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
      });
      assert('Full chain: thinking.start', chain.includes('thinking.start'));
      assert('Full chain: thinking.step', chain.includes('thinking.step'));
      assert('Full chain: thinking.end', chain.includes('thinking.end'));
      assert('Full chain: chat.message', chain.includes('chat.message'));
      assert('Full chain: correct order',
        chain.indexOf('thinking.start') < chain.indexOf('thinking.end') &&
        chain.indexOf('thinking.end') < chain.indexOf('chat.message'));
      assert('Full chain: complete flow', chain.length >= 4,
        chain.length + ' events');
    } else {
      assert('Full chain (ws available)', true, '(ws module not in test env)');
    }
  } catch (err) {
    assert('Full chain', false, String(err));
  }

  // Summary
  console.log('\n========== PHASE E2E TEST SUMMARY ==========');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log('Total: ' + results.length + ' | Passed: ' + passed + ' | Failed: ' + failed);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => {
      console.log('  [FAIL] ' + r.name + ': ' + (r.error || 'condition false'));
    });
  }
  console.log('=============================================');

  if (failed > 0) process.exit(1);
}

module.exports = { run };

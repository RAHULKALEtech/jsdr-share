import app from '../server/app.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5055, resolve));
  console.log('Test server started on port 5055');

  const BASE_URL = 'http://127.0.0.1:5055';

  try {
    // 1. Health check
    console.log('Testing GET /api/health...');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('Health check response:', healthData);
    if (healthData.status !== 'ok') throw new Error('Health check failed');

    // 2. Create session
    console.log('Testing POST /api/transfer/create...');
    const createRes = await fetch(`${BASE_URL}/api/transfer/create`, { method: 'POST' });
    const createData = await createRes.json();
    console.log('Create session response:', createData);
    if (!createData.success || !createData.sessionId || !createData.code) {
      throw new Error('Create session failed');
    }
    const { sessionId, code } = createData;

    // 3. Get session info by 5-digit code
    console.log(`Testing GET /api/transfer/${code}/info (lookup by code)...`);
    const infoByCodeRes = await fetch(`${BASE_URL}/api/transfer/${code}/info`);
    const infoByCodeData = await infoByCodeRes.json();
    console.log('Info by code response:', infoByCodeData);
    if (!infoByCodeData.success || infoByCodeData.sessionId !== sessionId) {
      throw new Error('Lookup by code failed');
    }

    // 4. Upload file in 2 chunks
    const testContent = Buffer.from('Hello, JSDR Share! This is a zero-compression bit-for-bit file transfer test.', 'utf-8');
    const testHash = crypto.createHash('sha256').update(testContent).digest('hex');
    const fileId = 'test-file-1';
    const fileName = 'sample_document.txt';
    const half = Math.floor(testContent.length / 2);
    const chunk1 = testContent.subarray(0, half);
    const chunk2 = testContent.subarray(half);

    console.log('Testing POST upload chunk 0...');
    const form1 = new FormData();
    form1.append('chunk', new Blob([chunk1]), fileName);
    const chunk0Res = await fetch(`${BASE_URL}/api/transfer/${sessionId}/upload-chunk`, {
      method: 'POST',
      headers: {
        'x-file-id': fileId,
        'x-file-name': encodeURIComponent(fileName),
        'x-file-size': testContent.length.toString(),
        'x-file-type': 'text/plain',
        'x-chunk-index': '0',
        'x-total-chunks': '2',
        'x-sha256': testHash,
      },
      body: form1,
    });
    const chunk0Data = await chunk0Res.json();
    console.log('Chunk 0 response:', chunk0Data);
    if (!chunk0Data.success) throw new Error('Chunk 0 upload failed');

    console.log('Testing POST upload chunk 1 (final)...');
    const form2 = new FormData();
    form2.append('chunk', new Blob([chunk2]), fileName);
    const chunk1Res = await fetch(`${BASE_URL}/api/transfer/${sessionId}/upload-chunk`, {
      method: 'POST',
      headers: {
        'x-file-id': fileId,
        'x-file-name': encodeURIComponent(fileName),
        'x-file-size': testContent.length.toString(),
        'x-file-type': 'text/plain',
        'x-chunk-index': '1',
        'x-total-chunks': '2',
        'x-sha256': testHash,
      },
      body: form2,
    });
    const chunk1Data = await chunk1Res.json();
    console.log('Chunk 1 response:', chunk1Data);
    if (!chunk1Data.success || chunk1Data.status !== 'READY') throw new Error('Chunk 1 upload failed');
    if (chunk1Data.sha256 !== testHash) throw new Error('SHA-256 mismatch');

    // 5. Update receiver action (REST sync)
    console.log('Testing POST /api/transfer/:sessionId/action (VIEWING)...');
    const actionRes = await fetch(`${BASE_URL}/api/transfer/${sessionId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'VIEWING' }),
    });
    const actionData = await actionRes.json();
    console.log('Action response:', actionData);
    if (!actionData.success || actionData.receiverAction !== 'VIEWING') throw new Error('Action update failed');

    // 6. Download single file & verify content match
    console.log('Testing GET download file...');
    const dlRes = await fetch(`${BASE_URL}/api/transfer/${sessionId}/download/${fileId}`);
    const dlBuffer = Buffer.from(await dlRes.arrayBuffer());
    if (dlBuffer.toString('utf-8') !== testContent.toString('utf-8')) {
      throw new Error('Downloaded content does not match original binary!');
    }
    console.log('Downloaded file verified bit-for-bit!');

    // 7. Download ZIP archive
    console.log('Testing GET download ZIP...');
    const zipRes = await fetch(`${BASE_URL}/api/transfer/${sessionId}/download-zip`);
    const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
    if (zipBuffer.length === 0 || !zipRes.headers.get('content-type')?.includes('zip')) {
      throw new Error('Download ZIP failed');
    }
    console.log(`Downloaded ZIP verified (${zipBuffer.length} bytes)!`);

    console.log('\n=========================================');
    console.log('✅ ALL BACKEND ENDPOINT TESTS PASSED 100%');
    console.log('=========================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});

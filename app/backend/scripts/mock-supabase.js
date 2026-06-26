const http = require('http');
const bcrypt = require('bcrypt');

const PORT = 54321;
const TEST_API_KEY = "qx_live_12345678abcdefghijklmnopqrstuvwxyz";
const keyHash = bcrypt.hashSync(TEST_API_KEY, 10);

// In-memory database
const db = {
  branch_deployments: [],
  api_keys: [
    {
      id: "test-admin-key-id",
      name: "Test Admin Key",
      key_hash: keyHash,
      key_prefix: "qx_live_123",
      scopes: ["admin"],
      owner_id: "owner-1",
      organization_id: "org-1",
      is_active: true,
      request_count: 0,
      monthly_quota: 10000,
      last_reset_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

const server = http.createServer((req, res) => {
  console.log(`[Mock Supabase] ${req.method} ${req.url}`);
  
  // Set JSON headers
  res.setHeader('Content-Type', 'application/json');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse path
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  
  // Check if it's the REST endpoint
  if (pathname.startsWith('/rest/v1/')) {
    const table = pathname.substring('/rest/v1/'.length);
    
    // Read request body
    let bodyStr = '';
    req.on('data', chunk => {
      bodyStr += chunk.toString();
    });
    
    req.on('end', () => {
      let body = null;
      if (bodyStr) {
        try {
          body = JSON.parse(bodyStr);
        } catch (e) {
          console.error('[Mock Supabase] Failed to parse JSON body:', bodyStr);
        }
      }
      
      if (!db[table]) {
        db[table] = [];
      }
      
      const tableData = db[table];
      
      if (req.method === 'GET') {
        let results = [...tableData];
        
        // Simple filter processing
        for (const [key, val] of urlObj.searchParams.entries()) {
          if (val.startsWith('eq.')) {
            const filterVal = val.substring(3);
            results = results.filter(row => {
              const rowVal = row[key];
              if (rowVal == null) return false;
              return String(rowVal) === filterVal;
            });
          }
        }
        
        // Handle sorting if present
        const order = urlObj.searchParams.get('order');
        if (order) {
          const [col, dir] = order.split('.');
          results.sort((a, b) => {
            if (a[col] < b[col]) return dir === 'desc' ? 1 : -1;
            if (a[col] > b[col]) return dir === 'desc' ? -1 : 1;
            return 0;
          });
        }
        
        // Respond
        const acceptHeader = req.headers['accept'] || '';
        if (acceptHeader.includes('application/vnd.pgrst.object+json')) {
          if (results.length > 0) {
            res.writeHead(200);
            res.end(JSON.stringify(results[0]));
          } else {
            // PostgREST return 406 or 200 null depending on maybeSingle or single
            // For maybeSingle, returning null/empty is expected
            res.writeHead(200);
            res.end(JSON.stringify(null));
          }
        } else {
          res.writeHead(200);
          res.end(JSON.stringify(results));
        }
      } else if (req.method === 'POST') {
        const preferHeader = req.headers['prefer'] || '';
        const isUpsert = preferHeader.includes('resolution=merge-duplicates');
        
        const payload = Array.isArray(body) ? body : [body];
        const upserted = [];
        
        for (const item of payload) {
          if (isUpsert && table === 'branch_deployments') {
            const idx = tableData.findIndex(row => row.branch_name === item.branch_name);
            if (idx !== -1) {
              const existing = tableData[idx];
              const updated = {
                ...existing,
                ...item,
                updated_at: new Date().toISOString()
              };
              tableData[idx] = updated;
              upserted.push(updated);
            } else {
              const created = {
                id: Math.random().toString(36).substring(2, 15),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...item
              };
              tableData.push(created);
              upserted.push(created);
            }
          } else {
            const created = {
              id: Math.random().toString(36).substring(2, 15),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...item
            };
            tableData.push(created);
            upserted.push(created);
          }
        }
        
        const acceptHeader = req.headers['accept'] || '';
        if (acceptHeader.includes('application/vnd.pgrst.object+json')) {
          res.writeHead(201);
          res.end(JSON.stringify(upserted[0] || null));
        } else {
          res.writeHead(201);
          res.end(JSON.stringify(upserted));
        }
      } else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      }
    });
    return;
  }
  
  // Health check / fallback
  res.writeHead(200);
  res.end(JSON.stringify({ status: 'ok', service: 'mock-supabase' }));
});

server.listen(PORT, () => {
  console.log(`[Mock Supabase] Server listening on port ${PORT}`);
  console.log(`[Mock Supabase] Pre-seeded API key: ${TEST_API_KEY}`);
});

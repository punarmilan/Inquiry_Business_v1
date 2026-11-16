// Isolated model doubles. No connection to the configured application database.
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const get = (value, path) => path.split('.').reduce((item, key) => item?.[key], value);
const matches = (row, filter) => Object.entries(filter).every(([key, expected]) => {
  const value = get(row, key);
  if (expected?.$in) return expected.$in.some((entry) => String(entry) === String(value));
  if (expected?.$gt) return +new Date(value) > +new Date(expected.$gt);
  if (expected?.$lt) return +new Date(value) < +new Date(expected.$lt);
  if (expected?.$not instanceof RegExp) return !expected.$not.test(value);
  return String(value) === String(expected);
});
const chain = (rows) => {
  let data = rows;
  return {
    select() { return this; },
    sort(order) { data.sort((a, b) => { for (const [key, direction] of Object.entries(order)) { if (a[key] !== b[key]) return a[key] > b[key] ? direction : -direction; } return 0; }); return this; },
    skip(count) { data = data.slice(count); return this; },
    limit(count) { data = data.slice(0, count); return this; },
    lean: async () => clone(data),
  };
};
const installStore = (t, backends) => {
  const state = { settings: new Map(), revisions: new Map(), releases: new Map(), assets: new Map(), campaigns: new Map(), cities: new Map(), failRelease: false, failActivation: false, queries: [] };
  for (const root of backends) {
    for (const [name, table] of [['Setting', state.settings], ['UIRevision', state.revisions], ['UIRelease', state.releases], ['UIAsset', state.assets], ['UICampaign', state.campaigns], ['City', state.cities]]) {
      const Model = require(`${root}/src/models/${name}`);
      t.mock.method(Model, 'create', async (input) => {
        if (name === 'UIRelease' && state.failRelease) throw new Error('Simulated release write failure');
        if (name === 'Setting' && state.failActivation) throw new Error('Simulated pointer write failure');
        const document = new Model(input);
        await document.validate();
        if (name === 'Setting' && [...table.values()].some((row) => row.key === input.key)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        const row = clone(document.toObject({ minimize: false }));
        row.createdAt ||= new Date().toISOString();
        table.set(row._id, row);
        return clone(row);
      });
      t.mock.method(Model, 'findById', (id) => ({ select() { return this; }, lean: async () => clone(table.get(String(id)) || null) }));
      t.mock.method(Model, 'findOne', (filter) => ({ lean: async () => clone([...table.values()].find((row) => matches(row, filter)) || null) }));
      t.mock.method(Model, 'find', (filter = {}) => {
        state.queries.push({ name, filter });
        return chain([...table.values()].filter((row) => matches(row, filter)));
      });
      t.mock.method(Model, 'countDocuments', async (filter) => [...table.values()].filter((row) => matches(row, filter)).length);
      if (name === 'UICampaign') t.mock.method(Model, 'exists', async (filter) => [...table.values()].some((row) => matches(row, filter)));
      t.mock.method(Model, 'findOneAndUpdate', async (filter, update) => {
        if (name === 'Setting' && state.failActivation) throw new Error('Simulated pointer write failure');
        const row = [...table.values()].find((entry) => matches(entry, filter));
        if (!row) return null;
        Object.assign(row, clone(update.$set || {}));
        for (const [key, delta] of Object.entries(update.$inc || {})) row[key] += delta;
        for (const [key, entry] of Object.entries(update.$push || {})) (row[key] ||= []).push(clone(entry));
        return clone(row);
      });
      if (name === 'UIRelease') t.mock.method(Model, 'aggregate', async (pipeline) => {
        // Exercise active-head lineage semantics; never treat orphan candidates as history.
        const rows = [];
        const seen = new Set();
        let id = String(pipeline[0].$match._id);
        while (table.has(id) && !seen.has(id)) {
          seen.add(id);
          const row = table.get(id);
          rows.push(clone(row));
          id = String(row.previousReleaseId);
        }
        const match = pipeline.slice(1).find((stage) => stage.$match);
        if (match) return rows.filter((row) => matches(row, match.$match));
        const facet = pipeline.find((stage) => stage.$facet).$facet;
        const skip = facet.data.find((stage) => '$skip' in stage).$skip;
        const limit = facet.data.find((stage) => '$limit' in stage).$limit;
        return [{ data: rows.slice(skip, skip + limit), meta: [{ total: rows.length }] }];
      });
    }
  }
  state.head = () => [...state.settings.values()].find((row) => row.key === 'ui.activeRelease')?.value;
  return state;
};
const serve = async (t, app) => {
  const http = require('node:http');
  const server = http.createServer(app);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  return (method, path, body, headers = {}) => new Promise((resolve, reject) => {
    const request = http.request({ hostname: '127.0.0.1', port: server.address().port, path, method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers } }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: text ? (response.headers['content-type'] || '').includes('application/json') ? JSON.parse(text) : text : null }));
    });
    request.on('error', reject);
    request.end(body ? JSON.stringify(body) : undefined);
  });
};
module.exports = { installStore, serve };

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
};

async function rpc(name, body) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${name} failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

const payload = {
  full_name: 'Prueba Local',
  phone: '04141234567',
  email: 'prueba.local@example.com',
  location_text: 'Caracas, prueba local',
  message: 'Smoke test SOS local',
  urgency: 'medium',
  consent: true,
};

console.log('Supabase local smoke test');
console.log('API:', url);

const submit = await rpc('submit_sos_request', { payload });
console.log('\n1) submit_sos_request:', submit);

const status = await rpc('get_sos_status', {
  p_tracking_code: submit.tracking_code,
});
console.log('2) get_sos_status:', status);

const duplicate = await rpc('submit_sos_request', { payload });
console.log('3) duplicate submit (expect is_existing=true):', duplicate);

if (!submit.tracking_code || status?.status !== 'pending') {
  process.exit(1);
}

console.log('\nOK — flujo SOS local funcionando');

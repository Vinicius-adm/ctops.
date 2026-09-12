import { validateHost, getHostExamples } from '@/utils/host';

const cases: Array<{ input?: string; expectValid: boolean }> = [
  { input: undefined, expectValid: true },
  { input: '', expectValid: true },
  { input: '/var/run/docker.sock', expectValid: true },
  { input: '\\\\.\\pipe\\docker_engine', expectValid: true },
  { input: '//./pipe/docker_engine', expectValid: true },
  { input: 'tcp://127.0.0.1:2375', expectValid: true },
  { input: '127.0.0.1:2375', expectValid: true },
  { input: 'badhost', expectValid: false },
  { input: 'host:99999', expectValid: false }
];

let failed = 0;
for (const c of cases) {
  const r = validateHost(c.input as any);
  if ((r.valid ?? false) !== c.expectValid) {
    console.error('FAIL', c.input, '=>', r);
    failed++;
  } else {
    console.log('OK', c.input, '=>', r.valid ? 'valid' : 'invalid');
  }
}

console.log('Examples:', getHostExamples().join(' | '));
if (failed) {
  console.error('Test failed with', failed, 'cases');
  process.exit(1);
} else {
  console.log('All host validation tests passed');
  process.exit(0);
}

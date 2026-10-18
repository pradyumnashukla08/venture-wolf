const { spawn } = require('child_process');

const eas = spawn('npx.cmd', ['eas-cli', 'credentials', '-p', 'android'], {
  env: { ...process.env }
});

eas.stdout.on('data', (data) => {
  const str = data.toString();
  console.log('STDOUT:', str);
  if (str.includes('Which build profile do you want to configure?')) {
    eas.stdin.write('preview\n');
  }
});

eas.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

eas.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
});

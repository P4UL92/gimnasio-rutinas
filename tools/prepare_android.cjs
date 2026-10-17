const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const androidNS = 'http://schemas.android.com/apk/res/android';

function configureManifest(xml, appId) {
  const dom = new JSDOM(xml, { contentType: 'application/xml' });
  try {
    const doc = dom.window.document;
    const applications = doc.getElementsByTagName('application');
    if (doc.documentElement.tagName !== 'manifest' || applications.length !== 1) {
      throw new Error('Expected one Android application in AndroidManifest.xml');
    }
    const app = applications[0];
    const activities = [...app.getElementsByTagName('activity')].filter(a =>
      ['.MainActivity', `${appId}.MainActivity`].includes(a.getAttributeNS(androidNS, 'name'))
    );
    if (activities.length !== 1) {
      throw new Error('Expected one Capacitor MainActivity');
    }
    const activity = activities[0];
    if (
      !activity.querySelector('intent-filter action') ||
      ![...activity.getElementsByTagName('action')].some(
        a => a.getAttributeNS(androidNS, 'name') === 'android.intent.action.MAIN'
      )
    ) {
      throw new Error('MainActivity has no MAIN intent');
    }
    if (
      activity.getAttributeNS(androidNS, 'screenOrientation') === 'portrait' &&
      app.getAttributeNS(androidNS, 'appCategory') === 'productivity'
    ) {
      return xml;
    }
    activity.setAttributeNS(androidNS, 'android:screenOrientation', 'portrait');
    app.setAttributeNS(androidNS, 'android:appCategory', 'productivity');
    return '<?xml version="1.0" encoding="utf-8"?>\n' + dom.serialize() + '\n';
  } finally {
    dom.window.close();
  }
}

function prepare(root = path.resolve(__dirname, '..')) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
  if (config.appId !== 'com.p4ul92.gimnasiorutinas' || config.webDir !== 'www') {
    throw new Error('Review Capacitor appId or webDir before preparing Android');
  }
  const cli = path.join(root, 'node_modules/@capacitor/cli/bin/capacitor');
  if (!fs.existsSync(cli)) {
    throw new Error('Install dependencies with npm install first');
  }
  const run = (file, args = []) =>
    execFileSync(process.execPath, [file, ...args], { cwd: root, stdio: 'inherit' });

  run(path.join(root, 'tools/build_web_dist.cjs'));

  const native = path.join(root, 'android');
  if (!fs.existsSync(native)) {
    run(cli, ['add', 'android']);
  }
  run(cli, ['sync', 'android']);

  const manifest = path.join(native, 'app/src/main/AndroidManifest.xml');
  const before = fs.readFileSync(manifest, 'utf8');
  const after = configureManifest(before, config.appId);
  if (before !== after) {
    fs.writeFileSync(manifest, after);
  }
  if (configureManifest(fs.readFileSync(manifest, 'utf8'), config.appId) !== after) {
    throw new Error('Android manifest configuration was not preserved');
  }

  const generateIconsScript = path.join(root, 'tools/generate_android_icons.cjs');
  if (fs.existsSync(generateIconsScript)) {
    run(generateIconsScript);
  }

  console.log('Android project prepared: portrait MainActivity, current web assets synced, native icons generated.');
}

module.exports = { configureManifest, prepare };

if (require.main === module) {
  try {
    prepare();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

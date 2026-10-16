const assert = require('node:assert/strict');
const { configureManifest } = require('./prepare_android.cjs');

const sampleManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:allowBackup="true" android:label="@string/app_name">
    <activity android:name=".MainActivity" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>`;

const updated = configureManifest(sampleManifest, 'com.p4ul92.gimnasiorutinas');
assert.ok(updated.includes('android:screenOrientation="portrait"'), 'Debe fijar orientación portrait');
assert.ok(updated.includes('android:appCategory="productivity"'), 'Debe fijar categoría de app');
assert.equal(configureManifest(updated, 'com.p4ul92.gimnasiorutinas'), updated, 'Debe ser idempotente');

console.log('PASS: Configuración de AndroidManifest verificada.');

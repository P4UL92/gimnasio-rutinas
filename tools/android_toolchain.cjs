const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function options(args = process.argv.slice(2)) {
  const result = {
    check: false,
    javaHome: process.env.JAVA_HOME,
    sdkDir: process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') {
      result.check = true;
    } else if (
      ['--java-home', '--sdk-dir'].includes(args[i]) &&
      args[i + 1] &&
      !args[i + 1].startsWith('--')
    ) {
      result[args[i] === '--java-home' ? 'javaHome' : 'sdkDir'] = args[++i];
    } else {
      throw new Error('Use --check, --java-home <JDK21> and --sdk-dir <Android SDK>.');
    }
  }
  return result;
}

function inspect(config) {
  const javaHome = config.javaHome ? path.resolve(config.javaHome) : null;
  const sdkDir = config.sdkDir ? path.resolve(config.sdkDir) : null;
  const java = javaHome && path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  const javac = javaHome && path.join(javaHome, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac');
  const report = {
    javaHome,
    sdkDir,
    javaVersion: null,
    jdk21: false,
    platform35: false,
    buildTools: [],
    buildTools34: false,
    commandLineTools: false,
    problems: []
  };

  if (!java || !fs.existsSync(java) || !fs.existsSync(javac)) {
    report.problems.push('Supply a complete JDK21 with --java-home or JAVA_HOME.');
  } else {
    const result = spawnSync(java, ['-version'], { encoding: 'utf8', timeout: 15000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('The supplied Java executable could not report its version.');
    report.javaVersion = (result.stdout + result.stderr).trim();
    report.jdk21 = /version "21(?:\.|")/.test(report.javaVersion);
    if (!report.jdk21) report.problems.push('This Capacitor 7 project requires JDK21.');
  }

  if (!sdkDir || !fs.existsSync(sdkDir)) {
    report.problems.push('Supply Android SDK with --sdk-dir or ANDROID_HOME.');
  } else {
    report.platform35 = fs.existsSync(path.join(sdkDir, 'platforms', 'android-35', 'android.jar'));
    if (!report.platform35) report.problems.push('SDK platform android-35 (android.jar) is missing.');
    const tools = path.join(sdkDir, 'build-tools');
    if (fs.existsSync(tools)) {
      report.buildTools = fs
        .readdirSync(tools)
        .filter(name =>
          fs.existsSync(path.join(tools, name, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2'))
        );
    }
    report.buildTools34 = report.buildTools.includes('34.0.0');
    if (!report.buildTools34) {
      report.problems.push('SDK build-tools 34.0.0 are missing from the standard directory layout.');
    }
    const commandLine = path.join(sdkDir, 'cmdline-tools');
    if (fs.existsSync(commandLine)) {
      report.commandLineTools = fs
        .readdirSync(commandLine)
        .some(name =>
          fs.existsSync(
            path.join(commandLine, name, 'bin', process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager')
          )
        );
    }
  }
  return report;
}

function main() {
  const config = options();
  const report = inspect(config);
  console.log(JSON.stringify(report, null, 2));
  if (config.check) {
    process.exitCode = report.problems.length ? 1 : 0;
    return;
  }
  if (report.problems.length) {
    throw new Error('Toolchain incomplete. Review the diagnostic above before building.');
  }
  require('./prepare_android.cjs').prepare(root);
  const java = path.join(report.javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  const env = {
    ...process.env,
    JAVA_HOME: report.javaHome,
    ANDROID_HOME: report.sdkDir,
    ANDROID_SDK_ROOT: report.sdkDir
  };
  execFileSync(
    java,
    [
      '-Xmx64m',
      '-Xms64m',
      '-classpath',
      path.join(root, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar'),
      'org.gradle.wrapper.GradleWrapperMain',
      '-p',
      path.join(root, 'android'),
      'assembleDebug',
      '--console=plain'
    ],
    { cwd: root, env, stdio: 'inherit' }
  );
  const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(apk)) {
    throw new Error('Gradle returned without the expected debug APK.');
  }
  console.log(`Debug APK created: ${apk}`);
}

module.exports = { options, inspect };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

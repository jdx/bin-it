import {Command, flags} from '@anycli/command'
import * as qq from 'qqjs'
import * as sh from 'shelljs'

import {info} from '../project'

const p = (...args: string[]) => qq.path.join(...args)

export default class Build extends Command {
  static flags = {
    os: flags.enum({required: true, options: ['win32', 'darwin', 'linux']}),
    arch: flags.enum({required: true, options: ['x64', 'x32', 'arm']}),
  }

  info!: info.Info
  workDir!: string
  os!: string
  arch!: string

  async run() {
    const {flags} = this.parse(Build)
    this.info = info()
    this.os = flags.os
    this.arch = flags.arch
    let versionedBase = `${this.info.pjson.name}-v${this.info.pjson.version}-${flags.os}-${flags.arch}`
    this.workDir = p(this.info.tmp, versionedBase)
    this.writeJSFiles()
    this.fetchNodeBin()

    let tgzPath = qq.path.join(this.info.dist, this.info.version, versionedBase + '.tar.gz')
    // let txzPath = qq.path.join(this.info.dist, versionedBase + '.tar.xz')
    qq.mkdirp(qq.path.dirname(tgzPath))
    qq.cd(this.info.tmp)
    // qq.x(`tar c ${versionedBase} | xz > ${txzPath}`)
    qq.x(`tar czf ${tgzPath} ${versionedBase}`)
    const sha256gz = qq.x(`shasum -a 256 ${tgzPath} | awk \{'print $1'\}`, {stdio: [0, null, 2]}).stdout
    // const sha256xz = qq.x(`shasum -a 256 ${txzPath} | awk \{'print $1'\}`, {stdio: [0, null, 2]}).stdout

    qq.writeJSON(`${this.info.dist}/${flags.os}-${flags.arch}`, {
      version: this.info.version,
      sha256gz,
      // sha256xz,
    })
  }

writeJSFiles() {
  const tarball = qq.path.join(`${this.info.name}-v${this.info.version}.tgz`)
  qq.rm(this.workDir)
  qq.mkdirp(qq.path.dirname(this.workDir))
  qq.x('yarn')
  qq.x('yarn run prepublishOnly')
  qq.x('npm pack')
  qq.x(`tar xvzf ${tarball}`)
  qq.mv('package', this.workDir)
  qq.rm(tarball)
  qq.cp([this.info.root, 'yarn.lock'], this.workDir)
  qq.cd(this.workDir)
  qq.x('yarn install --production --non-interactive')
  qq.write([this.workDir, 'bin', this.info.bin], `#!/usr/bin/env bash
set -e
get_script_dir () {
  SOURCE="\${BASH_SOURCE[0]}"
  # While \$SOURCE is a symlink, resolve it
  while [ -h "\$SOURCE" ]; do
    DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
    SOURCE="\$( readlink "\$SOURCE" )"
    # If \$SOURCE was a relative symlink (so no "/" as prefix, need to resolve it relative to the symlink base directory
    [[ \$SOURCE != /* ]] && SOURCE="\$DIR/\$SOURCE"
  done
  DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
  echo "\$DIR"
}
DIR=\$(get_script_dir)
# normalize home directory
CLI_HOME=\$(cd && pwd)
XDG_DATA_HOME=\${XDG_DATA_HOME:="\$CLI_HOME/.local/share"}
CLIENT_DIR="\$XDG_DATA_HOME/${this.info.bin}/client"
BIN_DIR="\$CLIENT_DIR/bin"
if [ -x "\$BIN_DIR/${this.info.bin}" ] && [[ "\$DIR" != "\$CLIENT_DIR"* ]]; then
  if [ "\$DEBUG" == "*" ]; then
    echo "\$XDG_DATA_HOME/${this.info.bin}/client/bin/${this.info.bin}" "\$@"
  fi
  "\$XDG_DATA_HOME/${this.info.bin}/client/bin/${this.info.bin}" "\$@"
else
  if [ "\$DEBUG" == "*" ]; then
    echo ${this.scopedEnvVarKey('CLI_BINPATH')}="\$DIR/${this.info.bin}" "\$DIR/node" "\$DIR/${this.info.bin}.js" "\$@"
  fi
  ${this.scopedEnvVarKey('CLI_BINPATH')}="\$DIR/${this.info.bin}" "\$DIR/node" "\$DIR/${this.info.bin}.js" "\$@"
fi
`)
  sh.chmod(755, p(this.workDir, 'bin', this.info.bin))
  }

  scopedEnvVarKey(k: string) {
    return [this.info.bin, k]
    .map(p => p.replace(/-/g, '_'))
    .join('_')
    .toUpperCase()
  }

  fetchNodeBin() {
    if (this.os === 'win32') {
      // const nodeExt = '.exe'
      // const nodeBase = `node-v${this.nodeVersion}-win-${this.arch}`
      // const url = `https://nodejs.org/dist/v${this.nodeVersion}/node-v${this.nodeVersion}-win-${this.arch}.7z`
      // qq.x(`curl -fSsLo ${this.tmp}/node/${nodeBase}.7z ${url}`)
      // qq.cd([this.tmp, 'node'])
      // 7z x -bd -y "${TMP_DIR}/node/${node_base}.7z" > /dev/null
      // mv "${node_base}/node.exe" "$TMP_DIR/cache/node/${node_base}"
    } else {
      const nodeArch = this.arch === 'arm' ? 'armv7l' : this.arch
      const nodeBase = `node-v${this.info.nodeVersion}-${this.os}-${nodeArch}`
      const url = `https://nodejs.org/dist/v${this.info.nodeVersion}/${nodeBase}.tar.xz`
      qq.mkdirp([this.info.tmp, 'node'])
      qq.x(`curl -fSsL "${url}" | tar -C "${this.info.tmp}/node" -xJ`)
      qq.mv(`${this.info.tmp}/node/${nodeBase}/bin/node`, [this.workDir, '/bin/node'])
    }
  }
}

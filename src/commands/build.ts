import {Command, flags} from '@anycli/command'
import * as qq from 'qqjs'
import * as sh from 'shelljs'

import {info} from '../project'

const p = (...args: string[]) => qq.path.join(...args)

export default class Build extends Command {
  static flags = {
    os: flags.enum({required: true, options: ['win32', 'darwin', 'linux']}),
    arch: flags.enum({required: true, options: ['x64', 'x32', 'arm']}),
    channel: flags.string({required: true}),
  }

  info!: info.Info

  async run() {
    const {flags} = this.parse(Build)
    this.info = info(flags)
    this.writeJSFiles()
    this.fetchNodeBin()

    qq.mkdirp(this.info.dist)
    qq.cd(this.info.tmp)
    qq.x(`tar c ${this.info.versionedBase} | xz > ${this.info.txzPath}`)
    qq.x(`tar czf ${this.info.tgzPath} ${this.info.versionedBase}`)
    const sha256gz = qq.x(`shasum -a 256 ${this.info.tgzPath} | awk \{'print $1'\}`, {stdio: [0, null, 2]}).stdout
    const sha256xz = qq.x(`shasum -a 256 ${this.info.txzPath} | awk \{'print $1'\}`, {stdio: [0, null, 2]}).stdout

    qq.writeJSON(`${this.info.dist}/${this.info.os}-${this.info.arch}`, {
      channel: this.info.channel,
      version: this.info.version,
      sha256gz,
      sha256xz,
    })
  }

writeJSFiles() {
  const tarball = qq.path.join(this.info.root, `${this.info.name}-v${this.info.shortVersion}.tgz`)
  qq.rm(this.info.base)
  qq.mkdirp(qq.path.dirname(this.info.base))
  qq.cd(this.info.root)
  qq.x('yarn')
  qq.x('yarn run prepublishOnly')
  qq.x('yarn pack')
  qq.cd(this.info.tmp)
  qq.x(`tar xvzf ${tarball}`)
  qq.mv('package', this.info.base)
  qq.rm(tarball)
  qq.cp([this.info.root, 'yarn.lock'], this.info.base)
  qq.cd(this.info.base)
  qq.x('yarn install --production --non-interactive')
  qq.write([this.info.base, 'bin', this.info.bin], `#!/usr/bin/env bash
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
  sh.chmod(755, p(this.info.base, 'bin', this.info.bin))
  }

  scopedEnvVarKey(k: string) {
    return [this.info.bin, k]
    .map(p => p.replace(/-/g, '_'))
    .join('_')
    .toUpperCase()
  }

  fetchNodeBin() {
    if (this.info.os === 'win32') {
      // const nodeExt = '.exe'
      // const nodeBase = `node-v${this.nodeVersion}-win-${this.arch}`
      // const url = `https://nodejs.org/dist/v${this.nodeVersion}/node-v${this.nodeVersion}-win-${this.arch}.7z`
      // qq.x(`curl -fSsLo ${this.tmp}/node/${nodeBase}.7z ${url}`)
      // qq.cd([this.tmp, 'node'])
      // 7z x -bd -y "${TMP_DIR}/node/${node_base}.7z" > /dev/null
      // mv "${node_base}/node.exe" "$TMP_DIR/cache/node/${node_base}"
    } else {
      const nodeArch = this.info.arch === 'arm' ? 'armv7l' : this.info.arch
      const nodeBase = `node-v${this.info.nodeVersion}-${this.info.os}-${nodeArch}`
      const url = `https://nodejs.org/dist/v${this.info.nodeVersion}/${nodeBase}.tar.xz`
      qq.mkdirp([this.info.tmp, 'node'])
      qq.x(`curl -fSsL "${url}" | tar -C "${this.info.tmp}/node" -xJ`)
      qq.mv(`${this.info.tmp}/node/${nodeBase}/bin/node`, [this.info.base, '/bin/node'])
    }
  }
}

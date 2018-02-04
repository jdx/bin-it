import {Command, flags} from '@anycli/command'
import cli from 'cli-ux'
import * as execa from 'execa'
import * as path from 'path'
import * as sh from 'shelljs'
import * as qq from 'qqjs'

sh.set('-ev')

function x(cmd: string, opts: execa.SyncOptions = {}) {
  cli.log(`$ ${cmd}`)
  execa.shellSync(cmd, {stdio: 'inherit', ...opts})
}

export default class Build extends Command {
  static flags = {
    os: flags.string(),
    arch: flags.string(),
  }

  async run() {
    const {flags} = this.parse(Build)
    cli.log(flags)
    const cwd = process.cwd()
    const pjson = require(path.join(cwd, 'package.json'))
    const {name, version} = pjson

    // gather all the JS files
    sh.rm('-rf', 'tmp/package')
    sh.mkdir('-p', 'tmp')
    x('yarn')
    x('yarn run prepublishOnly')
    x('yarn pack')
    sh.pushd('tmp')
    const tarball = `${name}-v${version}.tgz`
    sh.mv(`../${tarball}`, '.')
    x(`tar xvzf ${tarball}`)
    sh.cp('../yarn.lock', 'package')
    sh.pushd('package')
    x('yarn install --production --non-interactive')

    // gather all the JS files
  }
}

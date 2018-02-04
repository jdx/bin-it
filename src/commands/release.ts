import {Command, flags} from '@anycli/command'

import {info} from '../project'

export default class Release extends Command {
  static flags = {
    os: flags.enum({required: true, options: ['win32', 'darwin', 'linux']}),
    arch: flags.enum({required: true, options: ['x64', 'x32', 'arm']}),
    channel: flags.string({required: true}),
  }

  info!: info.Info

  async run() {
    const {flags} = this.parse(Release)
    this.info = info(flags)
  }
}

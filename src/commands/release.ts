import {Command, flags} from '@anycli/command'
import axios from 'axios'

import {info} from '../project'

export default class Release extends Command {
  static flags = {
    os: flags.enum({required: true, options: ['win32', 'darwin', 'linux']}),
    arch: flags.enum({required: true, options: ['x64', 'x32', 'arm']}),
    channel: flags.string({required: true}),
  }

  info!: info.Info

  async run() {
    if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN must be set')
    const {flags} = this.parse(Release)
    this.info = info(flags)

    const github = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        authorization: process.env.GH_TOKEN,
      }
    })

    await github.post('/repos/jdxcode/bin-it/releases', {
      tag_name: 'v1.0.0-test1',
      target_commitish: 'master',
      name: 'v1.0.0-test1',
      body: 'Description of the release',
      draft: false,
      prerelease: true
    })
  }
}

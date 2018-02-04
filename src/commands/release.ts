import {Command, flags} from '@anycli/command'
import * as Octokit from '@octokit/rest'
import cli from 'cli-ux'
import * as fs from 'fs-extra'
import * as qq from 'qqjs'

import {info} from '../project'

const debug = require('debug')('release')

export default class Release extends Command {
  static flags = {
    // channel: flags.string({required: true}),
    prerelease: flags.boolean(),
    draft: flags.boolean(),
  }

  info!: info.Info

  async run() {
    if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN must be set')
    const {flags} = this.parse(Release)
    this.info = info()

    const octokit = new Octokit()
    octokit.authenticate({
      type: 'token',
      token: process.env.GH_TOKEN,
    })
    const tag = `v${this.info.version}`
    let release: any
    try {
      const {data} = await octokit.repos.createRelease({
        owner: 'jdxcode',
        repo: 'bin-it',
        target_commitish: this.info.sha,
        tag_name: tag,
        prerelease: flags.prerelease,
        draft: flags.draft,
      })
      debug(data)
      release = data
    } catch (err) {
      debug(err)
      // try getting a release if we can't create one
      const {data} = await octokit.repos.getReleaseByTag({
        owner: 'jdxcode',
        repo: 'bin-it',
        tag,
      })
      release = data
    }
    const assets = qq.globby([`dist/${this.info.name}-v${this.info.version}*.tar.gz`])
    debug(assets)

    for (let file of assets) {
      const result = await octokit.repos.uploadAsset({
        url: release.upload_url,
        file: fs.createReadStream(file),
        contentType: 'application/gzip',
        contentLength: fs.statSync(file).size,
        name: 'bin-it-darwin-x64.tar.gz',
        label: 'bin-it-darwin-x64.tar.gz',
      })
      debug(result)
    }
  }

  async catch(err: any) {
    if (err.response && err.response.data && err.response.data.errors) {
      for (let e of err.response.data.errors) {
        cli.warn(e)
      }
    }
    super.catch(err)
  }
}

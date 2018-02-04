import {Command, flags} from '@anycli/command'
import * as Octokit from '@octokit/rest'
import cli from 'cli-ux'
import * as fs from 'fs-extra'

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

    // const github = axios.create({
    //   baseURL: 'https://api.github.com',
    //   headers: {
    //     authorization: `Bearer ${process.env.GH_TOKEN}`,
    //   }
    // })

    // await github.post('/repos/jdxcode/bin-it/releases', {
    //   tag_name: 'v0.0.0-test1',
    //   // target_commitish: 'ea6ac3b',
    //   // name: 'v0.0.0-test1',
    //   // body: 'Description of the release',
    //   draft: false,
    //   prerelease: true
    // })

    // await github.post('://<upload_url>/repos/:owner/:repo/releases/:id/assets?name=foo.zip', {
    //   tag_name: 'v0.0.0-test1',
    //   // target_commitish: 'ea6ac3b',
    //   // name: 'v0.0.0-test1',
    //   // body: 'Description of the release',
    //   draft: false,
    //   prerelease: true
    // })
    const octokit = new Octokit()
    octokit.authenticate({
      type: 'token',
      token: process.env.GH_TOKEN,
    })
    const {data: release} = await octokit.repos.createRelease({
      owner: 'jdxcode',
      repo: 'bin-it',
      target_commitish: 'v0.0.0-test3',
      tag_name: 'v0.0.0-test3',
      prerelease: true,
    })
    console.dir(release)
    const file = 'dist/bin-it-darwin-x64.tar.gz'
    const result = await octokit.repos.uploadAsset({
      url: release.upload_url,
      file: fs.createReadStream(file),
      contentType: 'application/gzip',
      contentLength: fs.statSync(file).size,
      name: 'bin-it-darwin-x64.tar.gz',
      label: 'bin-it-darwin-x64.tar.gz',
    })
    console.dir(result)
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

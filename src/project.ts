import * as qq from 'qqjs'

export namespace info {
  export interface Info {
    pjson: any
    name: string
    root: string
    tmp: string
    dist: string
    version: string
    nodeVersion: string
    bin: string
    sha: string
  }
}

export function info(): info.Info {
  const root = process.cwd()
  const pjson = qq.readJSON([root, 'package.json'])
  const tmp = qq.path.join(root, 'tmp')
  const dist = qq.path.join(root, 'dist')
  pjson['bin-it'] = pjson['bin-it'] || {}
  let nodeVersion = pjson['bin-it'].node || process.versions.node
  let bin = pjson.anycli.bin || Object.keys(pjson.bin) || pjson.name
  const sha = qq.x('git', ['rev-parse', '--short', 'HEAD'], {stdio: [0, null, 2]}).stdout
  // let debVersion = `${shortVersion}-1`
  // let unversionedBase = `${pjson.name}-${opts.os}-${opts.arch}`
  return {
    pjson,
    sha,
    name: pjson.name,
    root,
    tmp,
    version: pjson.version,
    dist,
    nodeVersion,
    bin,
  }
}

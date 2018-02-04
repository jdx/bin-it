import * as qq from 'qqjs'

const p = (...args: string[]) => qq.path.join(...args)

export namespace info {
  export interface Info {
    pjson: any
    name: string
    root: string
    tmp: string
    dist: string
    version: string
    channel: string
    os: string
    arch: string
    nodeVersion: string
    shortVersion: string
    bin: string
    debVersion: string
    unversionedBase: string
    versionedBase: string
    base: string
    tgzPath: string
    txzPath: string
  }
}

export function info(opts: {channel: string, os: string, arch: string, root?: string}): info.Info {
  const root = opts.root || process.cwd()
  const pjson = qq.readJSON([root, 'package.json'])
  const tmp = qq.path.join(root, 'tmp')
  const dist = qq.path.join(root, 'dist')
  pjson['bin-it'] = pjson['bin-it'] || {}
  let nodeVersion = pjson['bin-it'].node || process.versions.node
  let bin = pjson.anycli.bin || Object.keys(pjson.bin) || pjson.name
  const sha = qq.x('git', ['rev-parse', '--short', 'HEAD'], {stdio: [0, null, 2]}).stdout
  let version = `${pjson.version}-${sha}`
  let shortVersion = version
  let debVersion = `${shortVersion}-1`
  let versionedBase = `${pjson.name}-v${pjson.version}-${opts.os}-${opts.arch}`
  let unversionedBase = `${pjson.name}-${opts.os}-${opts.arch}`
  let base = p(tmp, versionedBase)
  let tgzPath = qq.path.join(dist, unversionedBase + '.tar.gz')
  let txzPath = qq.path.join(dist, unversionedBase + '.tar.xz')
  return {
    pjson,
    name: pjson.name,
    root,
    tmp,
    version,
    dist,
    channel: opts.channel,
    os: opts.os,
    arch: opts.arch,
    nodeVersion,
    shortVersion,
    bin,
    debVersion,
    unversionedBase,
    versionedBase,
    base,
    tgzPath,
    txzPath,
  }
}

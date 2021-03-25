const { titleCase } = require("./util")
const { minify } = require("terser")

module.exports = async function packWxml(asset, options) {
  const cache = []
  const name =
    asset.parent.type === "page"
      ? `const $${asset.parent.id}`
      : `remotes['${titleCase(asset.parent.tag)}']`
  asset.output = `${name} = ${asset.code}\n\n`
  for (const dep of asset.childAssets.values()) {
    let code = `remotes['${dep.id}'] = ${dep.code}\n\n`
    if (cache.indexOf(dep.name) < 0) {
      asset.output += code
      cache.push(dep.name)
    }
  }
  if (options.m) {
    return minify(asset.output, {})
  } else {
    return asset.output
  }
}

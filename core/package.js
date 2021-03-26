const { promises } = require("fs")
const ejs = require("ejs")
const Path = require("path")
const { minify } = require("terser")
const csso = require("csso")
const prettier = require("prettier")

const manifest = []

module.exports.manifest = manifest

const packJs = require("./packagers/js.js")
const packWxss = require("./packagers/wxss.js")
const packWxml = require("./packagers/wxml.js")
const packBerial = require("./packagers/berial.js")

module.exports = async function pack(asset, options) {
  options.umds = []
  await packageAsset(asset, options)
  await writeAsset(asset, options)
  await copySdk(options)
  await generateEntry(options)
}

async function writeAsset(asset, options) {
  asset.outputPath = Path.resolve(options.o, asset.hash)
  asset.output.js = asset.siblingAssets.get(".js").code
  options.umds.push("./" + asset.hash + ".js")
  await write(asset, options)

  const childs = Array.from(asset.childAssets.values()).map(async (page) => {
    await packBerial(page, options)
    await write(page, options)
  })
  await Promise.all(childs)
}

async function packageAsset(asset, options) {
  await packageJson(asset, options)
  if (asset.type === "component") {
    asset.parent.output.jsx += asset.output.jsx
    asset.parent.output.js += asset.output.js
    asset.parent.output.css += asset.output.css
  }
  const all = Array.from(asset.childAssets.values()).map(async (child) => {
    await packageAsset(child, options)
<<<<<<< HEAD
    if (asset.type === "page") {
      asset.output.css += child.output.css
      asset.output.js += child.output.js
      asset.output.jsx = child.output.jsx + asset.output.jsx
    }
  })
  if (asset.type === "app") {
    asset.outputPath = Path.resolve(options.o, asset.hash)
    asset.output.js = asset.siblingAssets.get(".js").code
    asset.output.css = asset.siblingAssets.get(".wxss").code
    options.umds.push("./" + asset.hash + ".js")
  }
  await Promise.all(all)
  if (asset.type === "page" || asset.type === "app") {
    await packBerial(asset, options)
    await write(asset, options)
  }
=======
  })

  await Promise.all(all)
>>>>>>> 927552b95ab0e72613042944d55cd2744324ae19
}

async function write(asset, options) {
  await promises.mkdir(Path.resolve(options.o), { recursive: true })
  for (const key in asset.output) {
    let path = `${asset.outputPath}.${key}`
    let code = asset.output[key]
    if (key.startsWith("js")) {
      if (options.m) {
        code = (await minify(code, {})).code
      } else {
        code = prettier.format(code, {
          semi: true,
          parser: "babel",
        })
      }
    } else if (key === "css") {
      if (options.m) {
        code = csso.minify(code).css
      } else {
        code = prettier.format(code, {
          parser: "css",
        })
      }
    }
    await promises.writeFile(path, code)
  }
}

async function packageJson(asset, options) {
  const siblings = asset.siblingAssets
  if (siblings) {
    siblings.forEach(async (value, key) => {
      if (value) {
        if (key === ".js")
          asset.output.js = await packJs(siblings.get(".js"), options)
        if (key === ".wxml")
          asset.output.jsx = await packWxml(siblings.get(".wxml"), options)
        if (key === ".wxss")
          asset.output.css = await packWxss(siblings.get(".wxss"))
      }
    })
  }
}

async function copySdk(options) {
  let umds = ["./runtime/api.js", "./runtime/wx.js", "./runtime/components.js"]
  let umdPromises = umds.map(async (u) => {
    const dist = Path.join(Path.resolve(options.o), u)
    await promises.mkdir(Path.dirname(dist), { recursive: true })
    if (options.m) {
      const file = await promises.readFile(Path.join(__dirname, u))
      const miniFile = await minify(file.toString(), {})
      await promises.writeFile(dist, miniFile.code)
    } else {
      await promises.copyFile(Path.join(__dirname, u), dist)
    }
  })
  await Promise.all(umdPromises)
  options.umds = umds.concat(options.umds)
}

async function generateEntry(options) {
  const html = await ejs.renderFile(Path.resolve(__dirname, "index.ejs"), {
    umds: options.umds,
    manifest,
  })
  await promises.writeFile(
    Path.join(Path.resolve(options.o), "index.html"),
    html
  )
}

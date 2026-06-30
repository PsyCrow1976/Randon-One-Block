// priority: 5
// Randon One Block — authoritative config I/O (kubejs/config/ only; never instance root)

var RANDOM_ONE_BLOCK_CONFIG_FILES = [
  'random_one_block.json',
  'random_one_block_mod_pools.json',
  'random_one_block_team_unlocks.json',
  'random_one_block_mod_pools_debug.json',
  'random_one_block_pool.json',
  'random_one_block_pool.txt'
]

function robKubejsConfigPath(filename) {
  try {
    var $KubeJSPaths = Java.loadClass('dev.latvian.mods.kubejs.KubeJSPaths')
    return String($KubeJSPaths.CONFIG.resolve(String(filename)).toAbsolutePath())
  } catch (ignored) {}

  return null
}

function robReadKubejsConfigJson(filename) {
  var path = robKubejsConfigPath(filename)

  if (!path) {
    console.error('[RandomOneBlock] KubeJSPaths.CONFIG unavailable — cannot load ' + filename)
    return null
  }

  var config = JsonIO.read(path)
  if (config) return config

  console.warn(
    '[RandomOneBlock] Config not found at ' +
      path +
      ' — pack configs must live in kubejs/config/ (delete any copy at the instance root).'
  )
  return null
}

function robWriteKubejsConfigJson(filename, payload) {
  var path = robKubejsConfigPath(filename)

  if (!path) {
    console.error('[RandomOneBlock] KubeJSPaths.CONFIG unavailable — cannot write ' + filename)
    return false
  }

  JsonIO.write(path, payload == null ? {} : payload)
  return true
}

var RandonOneBlockConfigIO = {
  path: robKubejsConfigPath,
  read: robReadKubejsConfigJson,
  write: robWriteKubejsConfigJson,
  packConfigFiles: RANDOM_ONE_BLOCK_CONFIG_FILES
}

ServerEvents.loaded(event => {
  var examplePath = robKubejsConfigPath('random_one_block.json')
  if (examplePath) {
    console.info('[RandomOneBlock] Authoritative pack config dir: ' + examplePath.replace(/random_one_block\.json$/, ''))
  }
})
// priority: 5
// Randon One Block — authoritative config I/O (kubejs/config/ only; never instance root)

var RANDOM_ONE_BLOCK_CONFIG_FILES = [
  'random_one_block.json',
  'random_one_block_mod_pools.json',
  'random_one_block_team_unlocks.json',
  'random_one_block_team_counters.json',
  'random_one_block_mod_pools_debug.json',
  'random_one_block_pool.json',
  'random_one_block_pool.txt'
]

var RANDOM_ONE_BLOCK_RUNTIME_CONFIG_FILES = {
  'random_one_block_team_unlocks.json': {},
  'random_one_block_team_counters.json': {},
  'random_one_block_mod_pools_debug.json': {},
  'random_one_block_pool.json': {}
}

function robIsRuntimeConfigFile(filename) {
  return RANDOM_ONE_BLOCK_RUNTIME_CONFIG_FILES.hasOwnProperty(String(filename))
}

function robDefaultRuntimeConfig(filename) {
  var name = String(filename)
  if (!robIsRuntimeConfigFile(name)) return null
  return RANDOM_ONE_BLOCK_RUNTIME_CONFIG_FILES[name]
}

function robKubejsConfigPath(filename) {
  var name = String(filename)
  var $KubeJSPaths = null
  var candidates = []
  var i = 0
  var pathStr = ''

  try {
    $KubeJSPaths = Java.loadClass('dev.latvian.mods.kubejs.KubeJSPaths')
  } catch (ignored) {
    return null
  }

  // KubeJS 8.x: CONFIG/DIRECTORY can resolve to the instance root on some builds.
  // Always prefer an explicit kubejs/config path under GAMEDIR.
  try {
    candidates.push($KubeJSPaths.GAMEDIR.resolve('kubejs').resolve('config').resolve(name).toAbsolutePath())
  } catch (ignored2) {}

  try {
    if ($KubeJSPaths.CONFIG) {
      candidates.push($KubeJSPaths.CONFIG.resolve(name).toAbsolutePath())
    }
  } catch (ignored3) {}

  try {
    if ($KubeJSPaths.DIRECTORY) {
      candidates.push($KubeJSPaths.DIRECTORY.resolve('config').resolve(name).toAbsolutePath())
    }
  } catch (ignored4) {}

  for (i = 0; i < candidates.length; i++) {
    pathStr = String(candidates[i])
    if (pathStr.indexOf('/kubejs/config/') >= 0 || pathStr.indexOf('\\kubejs\\config\\') >= 0) {
      return pathStr
    }
  }

  if (candidates.length) return String(candidates[0])
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

  var runtimeDefault = robDefaultRuntimeConfig(filename)
  if (runtimeDefault != null) {
    robWriteKubejsConfigJson(filename, runtimeDefault)
    console.info('[RandomOneBlock] Created runtime config at ' + path)
    return runtimeDefault
  }

  console.warn(
    '[RandomOneBlock] Config not found at ' +
      path +
      ' — expected under kubejs/config/ in the pack.'
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
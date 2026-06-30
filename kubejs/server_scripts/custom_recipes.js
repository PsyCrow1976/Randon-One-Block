// priority: 1
// Randon One Block — 3×3 compression + 9× decompress for custom storage blocks

var CUSTOM_COMPRESSION_RECIPES = [
  { block: 'kubejs:leather_block', ingredient: 'minecraft:leather', key: 'L' },
  { block: 'kubejs:sapling_block', ingredient: 'minecraft:oak_sapling', key: 'S' },
  { block: 'kubejs:carrot_block', ingredient: 'minecraft:carrot', key: 'C' },
  { block: 'kubejs:potato_block', ingredient: 'minecraft:potato', key: 'P' },
  { block: 'kubejs:torch_block', ingredient: 'minecraft:torch', key: 'T' }
]

ServerEvents.recipes(event => {
  var i = 0
  var entry = null
  var pattern = null
  var key = null
  var blockSuffix = null

  for (i = 0; i < CUSTOM_COMPRESSION_RECIPES.length; i++) {
    entry = CUSTOM_COMPRESSION_RECIPES[i]
    pattern = [entry.key + entry.key + entry.key, entry.key + entry.key + entry.key, entry.key + entry.key + entry.key]
    key = {}
    key[entry.key] = entry.ingredient
    blockSuffix = String(entry.block).split(':')[1]

    try {
      event
        .shaped(Item.of(entry.block), pattern, key)
        .id('kubejs:' + blockSuffix + '_from_' + blockSuffix.replace('_block', ''))

      event
        .shapeless('9x ' + entry.ingredient, [entry.block])
        .id('kubejs:' + blockSuffix.replace('_block', '') + '_from_' + blockSuffix)

      console.info('[RandonOneBlock] Registered compression recipes for ' + entry.block)
    } catch (err) {
      console.warn(
        '[RandonOneBlock] Script recipes failed for ' +
          entry.block +
          ' (datapack recipes in kubejs/data may still apply): ' +
          err
      )
    }
  }
})
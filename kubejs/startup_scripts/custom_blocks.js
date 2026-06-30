// priority: 1
// Randon One Block — custom minable blocks for alternative resource loops

var CUSTOM_STORAGE_BLOCKS = [
  {
    id: 'leather_block',
    displayName: 'Leather Block',
    mapColor: 'color_brown',
    soundType: 'wool',
    hardness: 0.8,
    mineableTag: 'minecraft:mineable/hoe'
  },
  {
    id: 'sapling_block',
    displayName: 'Sapling Block',
    mapColor: 'color_green',
    soundType: 'grass',
    hardness: 0.6,
    mineableTag: 'minecraft:mineable/hoe'
  },
  {
    id: 'carrot_block',
    displayName: 'Carrot Block',
    mapColor: 'color_orange',
    soundType: 'crop',
    hardness: 0.6,
    mineableTag: 'minecraft:mineable/hoe'
  },
  {
    id: 'potato_block',
    displayName: 'Potato Block',
    mapColor: 'dirt',
    soundType: 'crop',
    hardness: 0.6,
    mineableTag: 'minecraft:mineable/hoe'
  },
  {
    id: 'torch_block',
    displayName: 'Torch Block',
    mapColor: 'color_yellow',
    soundType: 'wood',
    hardness: 0.5,
    lightLevel: 0.93,
    mineableTag: 'minecraft:mineable/axe'
  }
]

StartupEvents.registry('block', event => {
  var i = 0
  var entry = null
  var builder = null

  for (i = 0; i < CUSTOM_STORAGE_BLOCKS.length; i++) {
    entry = CUSTOM_STORAGE_BLOCKS[i]
    builder = event
      .create(entry.id)
      .displayName(entry.displayName)
      .mapColor(entry.mapColor)
      .soundType(entry.soundType)
      .hardness(entry.hardness)
      .resistance(entry.hardness)
      .fullBlock(true)
      .tagBlock(entry.mineableTag)
      .item(item => {
        item.displayName(entry.displayName)
      })

    if (entry.lightLevel != null) {
      builder.lightLevel(entry.lightLevel)
    }

    console.info('[RandonOneBlock] Registered custom block kubejs:' + entry.id)
  }
})
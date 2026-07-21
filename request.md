# Request to Equivox developer

Copy-paste message for GitHub issues / Discord.

**Repo:** https://github.com/Yaskulsky/Equivox  
**Issues:** https://github.com/Yaskulsky/Equivox/issues  

---

**Subject:** Crash on Philosopher’s Stone world transmutation — NeoForge API break (`fireBlockBreak`) on 26.1.2.76+

Hi,

I’m building a NeoForge skyblock modpack (Randon One Block) and hit a hard crash with **Equivox**. I’m not a Java / mod developer myself — I’m using **AI tools to build and troubleshoot the pack**, so I rely on that help for diagnosis and don’t have the skills to patch or rebuild Equivox on my own. A fixed public JAR would really help.

I’m using **Equivox 1.0.0** (`equivox-1.0.0.jar`, internal version **1.5.0**) on **Minecraft 26.1.2** / **NeoForge 26.1.2.76**.

### Issue
Using the **Philosopher’s Stone** on a transmutable block (e.g. dirt, sand, cobble) crashes the game immediately with:

```text
java.lang.NoSuchMethodError:
  'net.neoforged.neoforge.event.level.BlockEvent$BreakEvent
   net.neoforged.neoforge.common.CommonHooks.fireBlockBreak(
     Level, GameType, ServerPlayer, BlockPos, BlockState)'

  at com.yaskulsky.equivox.utils.PlayerHelper.checkBreakPermission(PlayerHelper.java:159)
  at com.yaskulsky.equivox.utils.PlayerHelper.hasBreakPermission(...)
  at com.yaskulsky.equivox.utils.PlayerHelper.checkedReplaceBlock(...)
  at com.yaskulsky.equivox.gameObjs.items.PhilosophersStone.onItemUseFirst(...)
```

### Cause (from crash report + NeoForge sources)
The current JAR still links against the **old** NeoForge signature:

- `fireBlockBreak(..., ServerPlayer, ...) → BlockEvent.BreakEvent`

On NeoForge **26.1.2.21-beta and later** (including **26.1.2.76**), that method was replaced with:

- `fireBlockBreak(..., Player, ...) → BreakBlockEvent`  
  (`net.neoforged.neoforge.event.level.block.BreakBlockEvent`)

So this is a binary incompatibility — pack config / KubeJS cannot fix it.

### Request
Could you please release a **new build recompiled against a recent NeoForge** — specifically **26.1.2.76** (or anything ≥ 26.1.2.21-beta with the new break-event API)?

In `PlayerHelper.checkBreakPermission`, updating the `CommonHooks.fireBlockBreak(...)` call for the new return type / `Player` parameter should be enough (`.isCanceled()` still applies).

I can’t rebuild the mod myself; I’m depending on AI and your release for a working Philosopher’s Stone on current NeoForge.

### Environment
- Minecraft: **26.1.2**
- NeoForge: **26.1.2.76**
- Equivox: **1.0.0** (`equivox-1.0.0.jar`)
- Repro: right-click dirt/sand (or any world-transmutation target) with Philosopher’s Stone

Happy to provide the full crash report if useful.

Thanks for maintaining Equivox!

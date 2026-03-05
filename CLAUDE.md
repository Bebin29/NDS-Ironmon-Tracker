# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NDS-Ironmon-Tracker is a Lua script for the BizHawk emulator (v2.8+) that provides a real-time overlay tracker for the Pokémon "ironMON challenge" — a specialized speedrunning/challenge mode. It supports Gen 4 (Diamond/Pearl/Platinum/HeartGold/SoulSilver) and Gen 5 (Black/White/Black 2/White 2).

**Language:** 100% Lua (interpreted, no build step). Runs inside BizHawk's Lua Console.

## Running the Tracker

1. Load a supported NDS ROM in BizHawk
2. Tools → Lua Console → Open `Ironmon-Tracker.lua` (the entry point)

There is no build, lint, or test pipeline. Development is validated manually via BizHawk with actual ROMs.

## Architecture

```
Ironmon-Tracker.lua          ← Entry point
└── ironmon_tracker/
    ├── Main.lua             ← Initialization & setup
    ├── Program.lua          ← Main orchestrator (largest file, 41k+ lines)
    ├── Tracker.lua          ← Core data tracking logic
    ├── Memory.lua           ← Safe wrapper around BizHawk's memory API
    ├── PokemonDataReader.lua ← Decrypts Pokemon data structs from memory
    ├── GameConfigurator.lua ← ROM detection & game-specific config
    ├── BattleHandlerBase.lua ← Common battle logic
    ├── BattleHandlerGen4.lua ← Gen 4 battle specifics
    ├── BattleHandlerGen5.lua ← Gen 5 battle specifics
    ├── constants/           ← Static game data (memory addresses, Pokemon/Move/Item/Ability databases)
    ├── ui/                  ← UI layer (60+ screen/widget files)
    │   ├── UIBaseClasses/   ← Custom component framework (Frame, Component, Layout, event listeners)
    │   ├── LogViewer/       ← Post-game log viewer screens (12 files)
    │   ├── MainScreen.lua   ← Primary tracker display
    │   └── [Screen].lua     ← Individual screen classes
    ├── utils/               ← Helpers (DrawingUtils, MoveUtils, IconDrawer, etc.)
    ├── network/             ← Streamer integration & remote API
    ├── extras/              ← Crash recovery, brow animations
    ├── images/              ← Sprites, icons, type images
    └── themes/              ← Color theme files (.colortheme)
```

### Key Layers

- **Platform Layer:** `Memory.lua` isolates BizHawk API calls. All emulator memory reads go through this.
- **Data Layer:** `constants/` holds massive lookup tables (`PokemonData.lua`, `MoveData.lua`, `MemoryAddresses.lua`). `PokemonDataReader.lua` handles block shuffling and decryption (24 shuffle permutations using PID as seed).
- **Logic Layer:** `Tracker.lua` manages tracked state. `BattleHandler*` classes handle battle-specific logic per generation. `Program.lua` orchestrates everything.
- **UI Layer:** Custom component framework in `UIBaseClasses/` — `Component` wraps `Frame` + `Box`, `Layout` handles positioning, event listeners (`JoypadEventListener`, `MouseClickEventListener`, `HoverEventListener`) handle input. `ScreenStack.lua` manages screen navigation with push/pop semantics.

### Multi-Gen Support

Game-specific behavior is data-driven: `GameInfo.lua` and `MemoryAddresses.lua` contain per-game metadata and memory maps. Gen-specific logic lives in `BattleHandlerGen4.lua` / `BattleHandlerGen5.lua`. `GameConfigurator.lua` detects the ROM and configures accordingly.

### Persistence

- `Pickle.lua` — Lua table serialization for save/load
- `.trackerdata` files — per-ROM run progress
- `.pt` files — playtime tracking
- `Settings.ini` — user configuration (INI format via `Inifile.lua`)
- `.colortheme` files — theme customization

## BizHawk Globals

The codebase uses many BizHawk API globals: `memory`, `event`, `emu`, `client`, `gui`, `gameinfo`, `forms`, `joypad`, `bit`, `bizstring`. These are provided by the emulator runtime, not defined in the codebase. The full list is in `.vscode/settings.json` under `Lua.diagnostics.globals`.

Custom globals (module-level tables acting as singletons): `Graphics`, `GameInfo`, `PokemonData`, `MoveData`, `AbilityData`, `ItemData`, `TrainerData`, `LocationData`, `MemoryAddresses`, `Paths`, etc.

## Gotchas

- `Program.lua` is extremely large (~41k lines) — changes here need careful context awareness
- ROM filenames can't have spaces or leading zeros in numbers
- Savestates are only compatible within the same tracker version
- The evolution data files (`EvoDataGen4.lua`, `EvoDataGen5.lua`) and Pokemon/Move databases are very large generated data — avoid reading them fully
- BizHawk graphics scaling must be 1x for the overlay to render correctly

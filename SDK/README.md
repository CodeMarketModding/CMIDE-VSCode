# Code Market API reference stubs

- `CSharp/` contains the C# reference API, with a file for each type.
- `Java/` contains the Java reference API, using the game's Java method and constant names.

These are source-level reference stubs, not runtime implementations. Members throw if executed. They describe the complete extracted API, including commands a particular world may not have unlocked; they do not change the game's unlocks.

For game scripts, the IDE requests completion metadata from the game's interpreter for the current world. A separate in-memory index for the active world language caches common API completions and refreshes about every ten seconds. Other contexts fall back to the game. For local C# and Java documents, the IDE reads the corresponding reference stubs and offers basic completions without checking a world's unlocks.

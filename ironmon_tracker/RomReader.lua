RomReader = {}

-- NDS ROM header offsets
local NDS_FNT_OFFSET = 0x40
local NDS_FNT_SIZE = 0x44
local NDS_FAT_OFFSET = 0x48
local NDS_FAT_SIZE = 0x4C

-- NARC file paths per game version for trainer data
RomReader.TRAINER_NARC_PATHS = {
	[GameInfo.VERSION_NUMBER.DIAMOND] = {
		trdata = "poketool/trainer/trdata.narc",
		trpoke = "poketool/trainer/trpoke.narc",
	},
	[GameInfo.VERSION_NUMBER.PEARL] = {
		trdata = "poketool/trainer/trdata.narc",
		trpoke = "poketool/trainer/trpoke.narc",
	},
	[GameInfo.VERSION_NUMBER.PLATINUM] = {
		trdata = "poketool/trainer/trdata.narc",
		trpoke = "poketool/trainer/trpoke.narc",
	},
	[GameInfo.VERSION_NUMBER.HEART_GOLD] = {
		trdata = "a/0/5/5",
		trpoke = "a/0/5/6",
	},
	[GameInfo.VERSION_NUMBER.SOUL_SILVER] = {
		trdata = "a/0/5/5",
		trpoke = "a/0/5/6",
	},
	[GameInfo.VERSION_NUMBER.BLACK] = {
		trdata = "a/0/9/1",
		trpoke = "a/0/9/2",
	},
	[GameInfo.VERSION_NUMBER.WHITE] = {
		trdata = "a/0/9/1",
		trpoke = "a/0/9/2",
	},
	[GameInfo.VERSION_NUMBER.BLACK2] = {
		trdata = "a/0/9/1",
		trpoke = "a/0/9/2",
	},
	[GameInfo.VERSION_NUMBER.WHITE2] = {
		trdata = "a/0/9/1",
		trpoke = "a/0/9/2",
	},
}

-- NARC file paths for personal (base stats) data — catch rate is at offset 8
RomReader.PERSONAL_NARC_PATHS = {
	[GameInfo.VERSION_NUMBER.DIAMOND] = "poketool/personal/personal.narc",
	[GameInfo.VERSION_NUMBER.PEARL] = "poketool/personal/personal.narc",
	[GameInfo.VERSION_NUMBER.PLATINUM] = "poketool/personal/personal.narc",
	[GameInfo.VERSION_NUMBER.HEART_GOLD] = "a/0/0/2",
	[GameInfo.VERSION_NUMBER.SOUL_SILVER] = "a/0/0/2",
	[GameInfo.VERSION_NUMBER.BLACK] = "a/0/1/6",
	[GameInfo.VERSION_NUMBER.WHITE] = "a/0/1/6",
	[GameInfo.VERSION_NUMBER.BLACK2] = "a/0/1/6",
	[GameInfo.VERSION_NUMBER.WHITE2] = "a/0/1/6",
}

-- NARC file paths for evolution data
RomReader.EVO_NARC_PATHS = {
	[GameInfo.VERSION_NUMBER.DIAMOND] = "poketool/personal/evo.narc",
	[GameInfo.VERSION_NUMBER.PEARL] = "poketool/personal/evo.narc",
	[GameInfo.VERSION_NUMBER.PLATINUM] = "poketool/personal/evo.narc",
	[GameInfo.VERSION_NUMBER.HEART_GOLD] = "a/0/0/3",
	[GameInfo.VERSION_NUMBER.SOUL_SILVER] = "a/0/0/3",
	[GameInfo.VERSION_NUMBER.BLACK] = "a/0/1/8",
	[GameInfo.VERSION_NUMBER.WHITE] = "a/0/1/8",
	[GameInfo.VERSION_NUMBER.BLACK2] = "a/0/1/8",
	[GameInfo.VERSION_NUMBER.WHITE2] = "a/0/1/8",
}

-- Evolution method IDs (Gen 4/5 ROM encoding)
RomReader.EVO_METHODS = {
	[1] = "Friendship",
	[2] = "Friendship (Day)",
	[3] = "Friendship (Night)",
	[4] = "Level Up",
	[5] = "Trade",
	[6] = "Trade w/ Item",
	[7] = "Use Item",
	[8] = "Level (ATK > DEF)",
	[9] = "Level (ATK = DEF)",
	[10] = "Level (ATK < DEF)",
	[11] = "Level (PID High)",
	[12] = "Level (PID Low)",
	[13] = "Shedinja Spawn",
	[15] = "Beauty",
	[16] = "Use Item (Male)",
	[17] = "Use Item (Female)",
	[18] = "Hold Item (Day)",
	[19] = "Hold Item (Night)",
	[20] = "Know Move",
	[21] = "Party w/ Species",
	[22] = "Level (Male)",
	[23] = "Level (Female)",
	-- Gen 5 additions
	[24] = "Level (Electric)",
	[25] = "Level (Forest)",
	[26] = "Level (Cold)",
	[27] = "Trade w/ Species",
	[28] = "Level (Rain)",
}

-- Cached ROM header values
local cachedFATOffset = nil
local cachedFNTOffset = nil

local function getFATOffset()
	if not cachedFATOffset then
		cachedFATOffset = Memory.readROMu32(NDS_FAT_OFFSET)
	end
	return cachedFATOffset
end

local function getFNTOffset()
	if not cachedFNTOffset then
		cachedFNTOffset = Memory.readROMu32(NDS_FNT_OFFSET)
	end
	return cachedFNTOffset
end

--- Gets the start and end offsets for a file in the ROM by its file ID
---@param fileID number
---@return number startOffset, number endOffset
function RomReader.getFATEntry(fileID)
	local fatBase = getFATOffset()
	local entryOffset = fatBase + fileID * 8
	local startOff = Memory.readROMu32(entryOffset)
	local endOff = Memory.readROMu32(entryOffset + 4)
	return startOff, endOff
end

--- Resolves a NitroFS file path to a file ID by navigating the FNT
---@param filepath string e.g. "poketool/trainer/trdata.narc" or "a/0/5/5"
---@return number|nil fileID
function RomReader.resolveFileID(filepath)
	local fntBase = getFNTOffset()
	local parts = {}
	for part in filepath:gmatch("[^/]+") do
		table.insert(parts, part)
	end
	if #parts == 0 then return nil end

	-- Read root directory entry
	local dirOffset = Memory.readROMu32(fntBase) -- offset to root name entries (relative to FNT)
	local firstFileID = Memory.readROMu16(fntBase + 4)

	-- Navigate through path components
	local currentDirID = 0
	for i, component in ipairs(parts) do
		local isLast = (i == #parts)
		local nameTableOffset = fntBase + dirOffset
		local fileCounter = firstFileID
		local found = false

		while true do
			local typeLenByte = Memory.readROMu8(nameTableOffset)
			if typeLenByte == 0 then break end -- end of directory entries

			local isDir = bit.band(typeLenByte, 0x80) ~= 0
			local nameLen = bit.band(typeLenByte, 0x7F)
			nameTableOffset = nameTableOffset + 1

			-- Read the name
			local nameChars = {}
			for j = 0, nameLen - 1 do
				local ch = Memory.readROMu8(nameTableOffset + j)
				table.insert(nameChars, string.char(ch))
			end
			local entryName = table.concat(nameChars)
			nameTableOffset = nameTableOffset + nameLen

			local subDirID = nil
			if isDir then
				subDirID = Memory.readROMu16(nameTableOffset)
				nameTableOffset = nameTableOffset + 2
			end

			if entryName == component then
				if isDir and not isLast then
					-- Navigate into subdirectory (subDirID is 0xF000-based)
					currentDirID = subDirID - 0xF000
					local dirEntryOffset = fntBase + currentDirID * 8
					dirOffset = Memory.readROMu32(dirEntryOffset)
					firstFileID = Memory.readROMu16(dirEntryOffset + 4)
					found = true
					break
				elseif not isDir and isLast then
					-- Found the file
					return fileCounter
				elseif isDir and isLast then
					-- Path ends at a directory (for numbered paths like "a/0/5/5")
					-- In this case, the "5" at the end is actually a file, not a dir
					-- This shouldn't happen if the path is correct
					return nil
				end
			end

			if not isDir then
				fileCounter = fileCounter + 1
			end
		end

		if not found and not isLast then
			-- For numeric paths like "a/0/5/5", the last component might be resolved
			-- differently: the last component is a file index within the directory
			return nil
		end
	end

	return nil
end

--- Resolves a path that may use numeric-only final components (like "a/0/5/5")
--- where the last component is a file index within the parent directory
---@param filepath string
---@return number|nil fileID
function RomReader.resolveFileIDSmart(filepath)
	-- First try direct path resolution
	local fileID = RomReader.resolveFileID(filepath)
	if fileID then return fileID end

	-- For paths like "a/0/5/5", try treating last component as Nth file in parent dir
	local parts = {}
	for part in filepath:gmatch("[^/]+") do
		table.insert(parts, part)
	end
	if #parts < 2 then return nil end

	local lastPart = parts[#parts]
	local fileIndex = tonumber(lastPart)
	if fileIndex == nil then return nil end

	-- Navigate to the parent directory
	local fntBase = getFNTOffset()
	local dirOffset = Memory.readROMu32(fntBase)
	local firstFileID = Memory.readROMu16(fntBase + 4)

	for i = 1, #parts - 1 do
		local component = parts[i]
		local nameTableOffset = fntBase + dirOffset
		local found = false

		while true do
			local typeLenByte = Memory.readROMu8(nameTableOffset)
			if typeLenByte == 0 then break end

			local isDir = bit.band(typeLenByte, 0x80) ~= 0
			local nameLen = bit.band(typeLenByte, 0x7F)
			nameTableOffset = nameTableOffset + 1

			local nameChars = {}
			for j = 0, nameLen - 1 do
				local ch = Memory.readROMu8(nameTableOffset + j)
				table.insert(nameChars, string.char(ch))
			end
			local entryName = table.concat(nameChars)
			nameTableOffset = nameTableOffset + nameLen

			if isDir then
				local subDirID = Memory.readROMu16(nameTableOffset)
				nameTableOffset = nameTableOffset + 2
				if entryName == component then
					local dirEntryOffset = fntBase + (subDirID - 0xF000) * 8
					dirOffset = Memory.readROMu32(dirEntryOffset)
					firstFileID = Memory.readROMu16(dirEntryOffset + 4)
					found = true
					break
				end
			end
		end

		if not found then return nil end
	end

	-- The Nth file in this directory (0-indexed)
	return firstFileID + fileIndex
end

--- Parses a NARC file and returns the sub-file offsets/sizes
---@param narcFileID number File ID of the NARC in the NitroFS
---@return table|nil subFiles Array of {offset=, size=} for each sub-file
function RomReader.parseNARC(narcFileID)
	local narcStart, narcEnd = RomReader.getFATEntry(narcFileID)
	if narcStart == 0 and narcEnd == 0 then return nil end

	-- Read NARC header (16 bytes)
	-- Verify magic "NARC" = 0x4352414E
	local magic = Memory.readROMu32(narcStart)
	if magic ~= 0x4352414E then
		-- Try byte-swapped: "CRAN" might be different endian
		-- NARC magic is "NARC" in ASCII = 0x4E415243
		if magic ~= 0x4E415243 then
			return nil
		end
	end

	-- BTAF section starts right after NARC header (offset 0x10)
	local btafOffset = narcStart + 0x10
	local btafMagic = Memory.readROMu32(btafOffset)
	-- BTAF = 0x46415442
	local btafSize = Memory.readROMu32(btafOffset + 4)
	local fileCount = Memory.readROMu16(btafOffset + 8)

	-- Read BTAF entries (start after 12-byte BTAF header)
	local btafEntries = {}
	for i = 0, fileCount - 1 do
		local entryOffset = btafOffset + 12 + i * 8
		local subStart = Memory.readROMu32(entryOffset)
		local subEnd = Memory.readROMu32(entryOffset + 4)
		btafEntries[i] = {start = subStart, ["end"] = subEnd}
	end

	-- BTNF section follows BTAF
	local btnfOffset = btafOffset + btafSize
	local btnfSize = Memory.readROMu32(btnfOffset + 4)

	-- GMIF section follows BTNF
	local gmifOffset = btnfOffset + btnfSize
	local gmifDataStart = gmifOffset + 8 -- skip GMIF header (magic + size)

	-- Build sub-file table with absolute ROM offsets
	local subFiles = {}
	for i = 0, fileCount - 1 do
		local entry = btafEntries[i]
		subFiles[i + 1] = {
			offset = gmifDataStart + entry.start,
			size = entry["end"] - entry.start,
		}
	end

	return subFiles
end

--- Parses Gen 4 trainer data (trdata) from a NARC sub-file
---@param offset number ROM offset of the trdata entry
---@param size number Size of the entry
---@return table trdata {flags, trainerClass, pokemonCount, ai}
local function parseTrdata(offset, size)
	local flags = Memory.readROMu8(offset)
	local trainerClass = Memory.readROMu8(offset + 1)
	-- offset+2 is battle type (single/double)
	local pokemonCount = Memory.readROMu8(offset + 3)

	-- Items at offset+4 (4 x u16 = 8 bytes)
	local items = {}
	for i = 0, 3 do
		local itemID = Memory.readROMu16(offset + 4 + i * 2)
		if itemID > 0 then
			table.insert(items, itemID)
		end
	end

	-- AI flags at offset+12 (u32)
	local ai = 0
	if size >= 16 then
		ai = Memory.readROMu32(offset + 12)
	end

	return {
		flags = flags,
		trainerClass = trainerClass,
		pokemonCount = pokemonCount,
		items = items,
		ai = ai,
		hasMoves = bit.band(flags, 0x01) ~= 0,
		hasItems = bit.band(flags, 0x02) ~= 0,
	}
end

--- Parses trainer pokemon (trpoke) from a NARC sub-file
---@param offset number ROM offset of the trpoke entry
---@param size number Size of the entry
---@param trdata table The parsed trdata for this trainer
---@param gen number Game generation (4 or 5)
---@param isDiamondPearl boolean True for Diamond/Pearl (no seal field)
---@return table pokemon Array of pokemon entries
local function parseTrpoke(offset, size, trdata, gen, isDiamondPearl)
	local pokemon = {}
	local hasMoves = trdata.hasMoves
	local hasItems = trdata.hasItems

	-- Calculate entry size: base 6 bytes (difficulty u16 + level u16 + species u16)
	-- + 2 if hasItems (held item u16)
	-- + 8 if hasMoves (4 move u16s)
	-- + 2 seal/padding for Platinum, HGSS, and Gen 5 (NOT Diamond/Pearl)
	local entrySize = 6
	if hasItems then entrySize = entrySize + 2 end
	if hasMoves then entrySize = entrySize + 8 end
	if not isDiamondPearl then entrySize = entrySize + 2 end

	for i = 0, trdata.pokemonCount - 1 do
		local entryOffset = offset + i * entrySize
		if entryOffset + entrySize > offset + size then break end

		local difficulty = Memory.readROMu16(entryOffset)
		local level = Memory.readROMu16(entryOffset + 2)
		local speciesRaw = Memory.readROMu16(entryOffset + 4)
		local speciesID = bit.band(speciesRaw, 0x03FF) -- lower 10 bits
		local form = bit.rshift(bit.band(speciesRaw, 0xFC00), 10) -- upper 6 bits

		local readPos = entryOffset + 6

		local heldItem = 0
		if hasItems then
			heldItem = Memory.readROMu16(readPos)
			readPos = readPos + 2
		end

		local moves = {}
		if hasMoves then
			for j = 1, 4 do
				local moveID = Memory.readROMu16(readPos)
				table.insert(moves, moveID)
				readPos = readPos + 2
			end
		end

		-- Resolve names using existing global data tables
		local pokemonEntry = PokemonData.POKEMON[speciesID + 1]
		local pokemonName = pokemonEntry and pokemonEntry.name or ("Pokemon #" .. speciesID)
		local pokemonTypes = pokemonEntry and pokemonEntry.type or {}

		local moveData = {}
		for _, moveID in ipairs(moves) do
			local moveEntry = MoveData.MOVES[moveID + 1]
			table.insert(moveData, {
				id = moveID,
				name = moveEntry and moveEntry.name or ("Move #" .. moveID),
				type = moveEntry and moveEntry.type or "",
				category = moveEntry and moveEntry.category or "",
				power = moveEntry and moveEntry.power or 0,
				accuracy = moveEntry and moveEntry.accuracy or 0,
			})
		end

		local itemName = "None"
		if heldItem > 0 and ItemData.ITEMS and ItemData.ITEMS[heldItem] then
			itemName = ItemData.ITEMS[heldItem].name
		end

		-- Ability slot is encoded in the upper byte of difficulty
		-- We can't resolve the exact ability without species ability data from ROM
		-- The tracker reads abilities at runtime from live battle memory
		local abilityName = ""
		local abilityID = 0

		table.insert(pokemon, {
			speciesID = speciesID,
			name = pokemonName,
			types = pokemonTypes,
			level = level,
			form = form,
			heldItem = heldItem,
			heldItemName = itemName,
			moves = moveData,
			ability = abilityName,
			abilityID = abilityID,
			difficulty = bit.band(difficulty, 0xFF), -- IV value (lower byte)
		})
	end

	return pokemon
end

--- Reads all trainers from the ROM for the current game
---@return table|nil trainers Table indexed by trainer ID (1-based), or nil on failure
function RomReader.readAllTrainers()
	-- Get game code from ROM header
	local gameCode = Memory.read_u32_le(MemoryAddresses.NDS_CONSTANTS.CARTRIDGE_HEADER + 0x0C)
	local gameInfo = GameInfo.GAME_INFO[gameCode]
	if not gameInfo then return nil end

	local narcPaths = RomReader.TRAINER_NARC_PATHS[gameCode]
	if not narcPaths then return nil end

	-- Resolve NARC file IDs
	local trdataFileID = RomReader.resolveFileIDSmart(narcPaths.trdata)
	local trpokeFileID = RomReader.resolveFileIDSmart(narcPaths.trpoke)

	if not trdataFileID or not trpokeFileID then
		print("RomReader: Could not resolve trainer NARC file IDs")
		-- Fallback: try direct path
		trdataFileID = RomReader.resolveFileID(narcPaths.trdata)
		trpokeFileID = RomReader.resolveFileID(narcPaths.trpoke)
		if not trdataFileID or not trpokeFileID then
			return nil
		end
	end

	-- Parse NARC files
	local trdataSubFiles = RomReader.parseNARC(trdataFileID)
	local trpokeSubFiles = RomReader.parseNARC(trpokeFileID)

	if not trdataSubFiles or not trpokeSubFiles then
		print("RomReader: Could not parse trainer NARC files")
		return nil
	end

	local gen = gameInfo.GEN or 4
	-- Diamond and Pearl don't have the 2-byte seal/padding field in trpoke entries
	local isDiamondPearl = (gameCode == GameInfo.VERSION_NUMBER.DIAMOND or gameCode == GameInfo.VERSION_NUMBER.PEARL)
	local trainers = {}
	local trainerCount = math.min(#trdataSubFiles, #trpokeSubFiles)

	for i = 1, trainerCount do
		local trdataFile = trdataSubFiles[i]
		local trpokeFile = trpokeSubFiles[i]

		if trdataFile and trpokeFile and trdataFile.size > 0 then
			local trdata = parseTrdata(trdataFile.offset, trdataFile.size)
			local pokemon = {}
			if trdata.pokemonCount > 0 and trpokeFile.size > 0 then
				pokemon = parseTrpoke(trpokeFile.offset, trpokeFile.size, trdata, gen, isDiamondPearl)
			end

			local trainerID = i - 1 -- 0-based trainer ID (NARC sub-files are 0-indexed)
			trainers[trainerID] = {
				id = trainerID,
				trainerClass = trdata.trainerClass,
				pokemonCount = trdata.pokemonCount,
				hasMoves = trdata.hasMoves,
				hasItems = trdata.hasItems,
				ai = trdata.ai,
				pokemon = pokemon,
			}
		end
	end

	return trainers, trainerCount
end

-- Cached personal NARC data for catch rate lookups
local cachedPersonalNARC = nil

--- Gets the catch rate for a Pokemon species from the ROM's personal data
---@param speciesID number 0-based species ID
---@return number|nil catchRate (0-255)
function RomReader.getSpeciesCatchRate(speciesID)
	if not speciesID or speciesID < 0 then return nil end

	local gameCode = Memory.read_u32_le(MemoryAddresses.NDS_CONSTANTS.CARTRIDGE_HEADER + 0x0C)
	local narcPath = RomReader.PERSONAL_NARC_PATHS[gameCode]
	if not narcPath then return nil end

	if not cachedPersonalNARC then
		local fileID = RomReader.resolveFileIDSmart(narcPath)
		if not fileID then return nil end
		cachedPersonalNARC = RomReader.parseNARC(fileID)
		if not cachedPersonalNARC then return nil end
	end

	-- Species are 0-indexed but NARC sub-files are 1-indexed
	local subFile = cachedPersonalNARC[speciesID + 1]
	if not subFile then return nil end

	-- Catch rate is at offset 8 in the personal data structure
	return Memory.readROMu8(subFile.offset + 8)
end

-- Cached evolution NARC data
local cachedEvoNARC = nil

--- Reads all evolution data from the ROM.
--- Returns a table indexed by 0-based speciesID, each entry is an array of evolutions.
--- Each evolution: { method = string, methodID = number, param = number, targetID = number, targetName = string }
---@return table|nil evolutions
function RomReader.readAllEvolutions()
	local gameCode = Memory.read_u32_le(MemoryAddresses.NDS_CONSTANTS.CARTRIDGE_HEADER + 0x0C)
	local narcPath = RomReader.EVO_NARC_PATHS[gameCode]
	if not narcPath then return nil end

	if not cachedEvoNARC then
		local fileID = RomReader.resolveFileIDSmart(narcPath)
		if not fileID then return nil end
		cachedEvoNARC = RomReader.parseNARC(fileID)
		if not cachedEvoNARC then return nil end
	end

	local evolutions = {}

	for i = 1, #cachedEvoNARC do
		local subFile = cachedEvoNARC[i]
		local speciesID = i - 1 -- 0-based
		local evoList = {}
		local size = subFile.size or 42 -- 7 entries × 6 bytes default

		-- Each evo entry is 6 bytes: method(u16) + param(u16) + target(u16)
		-- Max 7 entries per species
		local maxEntries = math.floor(size / 6)
		if maxEntries > 7 then maxEntries = 7 end

		for j = 0, maxEntries - 1 do
			local entryOffset = subFile.offset + j * 6
			local methodID = Memory.readROMu16(entryOffset)
			local param = Memory.readROMu16(entryOffset + 2)
			local targetID = Memory.readROMu16(entryOffset + 4)

			if methodID > 0 and targetID > 0 then
				local methodName = RomReader.EVO_METHODS[methodID] or ("Method " .. methodID)
				local targetEntry = PokemonData.POKEMON[targetID + 1]
				local targetName = targetEntry and targetEntry.name or ("Pokemon #" .. targetID)

				-- Resolve item name if applicable
				local paramName = nil
				if methodID == 6 or methodID == 7 or methodID == 16 or methodID == 17
				   or methodID == 18 or methodID == 19 then
					-- param is an item ID
					local itemEntry = ItemData.ITEMS and ItemData.ITEMS[param]
					paramName = itemEntry and itemEntry.name or nil
				elseif methodID == 20 then
					-- param is a move ID
					local moveEntry = MoveData.MOVES and MoveData.MOVES[param + 1]
					paramName = moveEntry and moveEntry.name or nil
				elseif methodID == 21 or methodID == 27 then
					-- param is a species ID
					local specEntry = PokemonData.POKEMON[param + 1]
					paramName = specEntry and specEntry.name or nil
				elseif methodID == 4 or methodID == 8 or methodID == 9 or methodID == 10
				       or methodID == 22 or methodID == 23 or methodID == 24 or methodID == 25
				       or methodID == 26 or methodID == 28 then
					-- param is a level
					paramName = "Lv." .. param
				end

				table.insert(evoList, {
					methodID = methodID,
					method = methodName,
					param = param,
					paramName = paramName,
					targetID = targetID,
					targetName = targetName,
				})
			end
		end

		if #evoList > 0 then
			evolutions[speciesID] = evoList
		end
	end

	return evolutions
end

--- Clears cached ROM header values (call when ROM changes)
function RomReader.clearCache()
	cachedFATOffset = nil
	cachedFNTOffset = nil
	cachedPersonalNARC = nil
	cachedEvoNARC = nil
end

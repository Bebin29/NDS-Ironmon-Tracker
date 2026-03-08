Network = {
	CurrentConnection = {},
	lastUpdateTime = 0,
	printSuccessfulConnectMsg = true,
	STREAMERBOT_VERSION = "1.0.1", -- Known streamerbot version. Update this value to inform user to update streamerbot code
	TEXT_UPDATE_FREQUENCY = 2, -- # of seconds
	SOCKET_UPDATE_FREQUENCY = 2, -- # of seconds
	HTTP_UPDATE_FREQUENCY = 2, -- # of seconds
	TEXT_INBOUND_FILE = "NDS-Tracker-Requests.json", -- The CLIENT's outbound data file; Tracker is the "Server" and will read requests from this file
	TEXT_OUTBOUND_FILE = "NDS-Tracker-Responses.json", -- The CLIENT's inbound data file; Tracker is the "Server" and will write responses to this file
	SOCKET_SERVER_NOT_FOUND = "Socket server was not initialized",
	FILE_SETTINGS = "NetworkSettings.ini",
	FILE_IMPORT_CODE = "StreamerbotCodeImport.txt",
}

Network.ConnectionTypes = {
	None = "None",
	Text = "Text",

	-- WebSockets WARNING: Bizhawk must be started with command line arguments to enable connections
	-- It must also be a custom/new build of Bizhawk that actually supports asynchronous web sockets (not released yet)
	WebSockets = "WebSockets",

	-- Http WARNING: If Bizhawk is not started with command line arguments to enable connections
	-- Then an internal Bizhawk error will crash the tracker. This cannot be bypassed with pcall() or other exception handling
	-- Consider turning off "AutoConnectStartup" if exploring Http
	Http = "Http",
}

Network.ConnectionState = {
	Closed = 0, -- The server (Tracker) is not currently connected nor trying to connect
	Listen = 1, -- The server (Tracker) is online and trying to connect, waiting for response from a client
	Established = 9, -- Both the server (Tracker) and client are connected; communication is open
}

-- Options related to Network (most unused); gets saved in NetworkSettings.ini
Network.Options = {
	["AutoConnectStartup"] = true,
	["ConnectionType"] = Network.ConnectionTypes.Text,
	["DataFolder"] = "",
	["WebSocketIP"] = "0.0.0.0", -- Localhost: 127.0.0.1
	["WebSocketPort"] = "8080",
	["HttpGet"] = "",
	["HttpPost"] = "",
	["CommandRoles"] = "Everyone", -- A comma-separated list of allowed roles for command events
	["CustomCommandRole"] = "", -- Currently unused, not supported
}

-- In some cases, allow a mismatch between Tracker code and Streamerbot code
-- This simply offers convenience for the end user, such that they aren't forced to update to continue using it
Network.DeprecatedVersions = {
	-- FAKE EXAMPLE: On version 1.0.0 of Streamerbot code, the message cap limit was assumed to be checked by the Tracker, not Streamerbot itself
	-- This override forces the Tracker to check the message cap
	-- ["1.0.0"] = function()
	-- 	RequestHandler.REQUIRES_MESSAGE_CAP = true
	-- end,
}

-- Connection object prototype
Network.IConnection = {
	Type = Network.ConnectionTypes.None,
	State = Network.ConnectionState.Closed,
	UpdateFrequency = -1, -- Number of seconds; 0 or less will prevent scheduled updates
	SendReceive = function(self) end,
	-- Don't override the follow functions
	SendReceiveOnSchedule = function(self, updateFunc)
		if (self.UpdateFrequency or 0) > 0 and (os.time() - Network.lastUpdateTime) >= self.UpdateFrequency then
			updateFunc = updateFunc or self.SendReceive
			if type(updateFunc) == "function" then
				updateFunc(self)
			end
			Network.lastUpdateTime = os.time()
		end
	end,
}
function Network.IConnection:new(o)
	o = o or {}
	setmetatable(o, self)
	self.__index = self
	return o
end

function Network.initialize()
	Network.Data = {}
	Network.iniParser = dofile(Paths.FOLDERS.DATA_FOLDER .. Paths.SLASH .. "Inifile.lua")

	dofile(Paths.FOLDERS.NETWORK_FOLDER .. Paths.SLASH .. "Json.lua")
	dofile(Paths.FOLDERS.NETWORK_FOLDER .. Paths.SLASH .. "EventData.lua")
	dofile(Paths.FOLDERS.NETWORK_FOLDER .. Paths.SLASH .. "EventHandler.lua")
	dofile(Paths.FOLDERS.NETWORK_FOLDER .. Paths.SLASH .. "RequestHandler.lua")
	NetworkUtils.setupJsonLibrary()
	Network.loadSettings()

	-- Clear and reload Event and Request information
	EventHandler.reset()
	RequestHandler.reset()
	EventHandler.addDefaultEvents()
	RequestHandler.loadRequestsData()
	RequestHandler.removedExcludedRequests()

	Network.requiresUpdating = false
	Network.lastUpdateTime = 0
	Network.loadConnectionSettings()
    if Network.Options["AutoConnectStartup"] then
        Network.tryConnect()
    end

end

function Network.delayedStartupActions() -- DEBUG
	EventHandler.onStartup()
end

--- Allow Network access references to various data objects used throughout the software
function Network.linkData(program, tracker, battleHandler, randomizerLogParser)
	if program == nil then
		return
	end
	Network.Data = {
		program = program,
		gameInfo = program.getGameInfo(),
		memoryAddresses = program.getAddresses(),
		tracker = tracker,
		battleHandler = battleHandler,
		seedLogger = program.getSeedLogger(),
		randomizerLogParser = randomizerLogParser,
	}
	EventData.initializeLookupTables()
end

---Returns a message regarding the status of the connection
---@return string
function Network.getConnectionStatusMsg()
	if Network.CurrentConnection.State == Network.ConnectionState.Established then
		return "Online: Connection established."
	elseif Network.CurrentConnection.State == Network.ConnectionState.Listen then
		return "Online: Waiting for connection..."
	else
		return "Offline."
	end
end

--Returns the text color key for the current connection status
---@return string
function Network.getConnectionStatusColor()
	if Network.CurrentConnection.State == Network.ConnectionState.Established then
		return "Positive text color"
	elseif Network.CurrentConnection.State == Network.ConnectionState.Listen then
		return "Intermediate text color"
	else
		return "Negative text color"
	end
end

---Checks current version of the Tracker's Network code against the Streamerbot code version
---@param externalVersion string
function Network.checkVersion(externalVersion)
	externalVersion = externalVersion or "0.0.0"
	Network.currentStreamerbotVersion = externalVersion
	local changeFunc = Network.DeprecatedVersions[externalVersion]
	if type(changeFunc) == "function" then
		changeFunc()
	end

	-- Convert verion strings to numbers such that "05" is less than "8"
	local major1, minor1, patch1 = string.match(Network.STREAMERBOT_VERSION, "(%d+)%.(%d+)%.?(%d*)")
	local major2, minor2, patch2 = string.match(externalVersion, "(%d+)%.(%d+)%.?(%d*)")
	major1 = tonumber(major1 or "") or 0
	major2 = tonumber(major2 or "") or 0
	minor1 = tonumber(minor1 or "") or 0
	minor2 = tonumber(minor2 or "") or 0
	patch1 = tonumber(patch1 or "") or 0
	patch2 = tonumber(patch2 or "") or 0

	-- If tracker code version is newer (greater) than external Streamerbot version, require an update
	Network.requiresUpdating = (major1 * 10000 + minor1 * 100 + patch1) > (major2 * 10000 + minor2 * 100 + patch2)
	if Network.requiresUpdating then
		Network.openUpdateRequiredPrompt()
	end
end

---@return boolean
function Network.isConnected()
	return Network.CurrentConnection.State > Network.ConnectionState.Closed
end

---@return table supportedTypes
function Network.getSupportedConnectionTypes()
	local supportedTypes = {
		Network.ConnectionTypes.Text,
		-- Network.ConnectionTypes.WebSockets, -- Not fully supported
		-- Network.ConnectionTypes.Http, -- Not fully supported
	}
	return supportedTypes
end

function Network.loadConnectionSettings()
	Network.CurrentConnection = Network.IConnection:new()
	if (Network.Options["ConnectionType"] or "") ~= "" then
		Network.changeConnection(Network.Options["ConnectionType"])
	end
end

---Changes the current connection type
---@param connectionType string A Network.ConnectionTypes enum
function Network.changeConnection(connectionType)
	connectionType = connectionType or Network.ConnectionTypes.None
	-- Create or swap to a new connection
	if Network.CurrentConnection.Type ~= connectionType then
		if Network.isConnected() then
			Network.closeConnections()
		end
		Network.CurrentConnection = Network.IConnection:new({ Type = connectionType })
		Network.Options["ConnectionType"] = connectionType
		Network.saveSettings()
	end
end

---Attempts to connect to the network using the current connection
---@return number connectionState The resulting Network.ConnectionState
function Network.tryConnect()
	local C = Network.CurrentConnection or {}
	-- Create or swap to a new connection
	if not C.Type then
		Network.changeConnection(Network.ConnectionTypes.None)
		C = Network.CurrentConnection
	end
	-- Don't try to connect if connection is fully established
	if C.State >= Network.ConnectionState.Established then
		return C.State
	end
	if C.Type == Network.ConnectionTypes.WebSockets then
		if true then return Network.ConnectionState.Closed end -- Not fully supported
		C.UpdateFrequency = Network.SOCKET_UPDATE_FREQUENCY
		C.SendReceive = Network.updateBySocket
		C.SocketIP = Network.Options["WebSocketIP"] or "0.0.0.0"
		C.SocketPort = tonumber(Network.Options["WebSocketPort"] or "") or 0
		local serverInfo
		if C.SocketIP ~= "0.0.0.0" and C.SocketPort ~= 0 then
			comm.socketServerSetIp(C.SocketIP)
			comm.socketServerSetPort(C.SocketPort)
			serverInfo = comm.socketServerGetInfo() or Network.SOCKET_SERVER_NOT_FOUND
			-- Might also test/try 'bool comm.socketServerIsConnected()'
		end
		local ableToConnect = NetworkUtils.containsText(serverInfo, Network.SOCKET_SERVER_NOT_FOUND)
		if ableToConnect then
			C.State = Network.ConnectionState.Listen
			comm.socketServerSetTimeout(500) -- # of milliseconds
		end
	elseif C.Type == Network.ConnectionTypes.Http then
		if true then return Network.ConnectionState.Closed end -- Not fully supported
		C.UpdateFrequency = Network.HTTP_UPDATE_FREQUENCY
		C.SendReceive = Network.updateByHttp
		C.HttpGetUrl = Network.Options["HttpGet"] or ""
		C.HttpPostUrl = Network.Options["HttpPost"] or ""
		if not (C.HttpGetUrl or "") ~= "" then
			-- Necessary for comm.httpTest()
			comm.httpSetGetUrl(C.HttpGetUrl)
		end
		if not (C.HttpPostUrl or "") ~= "" then
			-- Necessary for comm.httpTest()
			comm.httpSetPostUrl(C.HttpPostUrl)
		end
		local result
		if (C.HttpGetUrl or "") ~= "" and C.HttpPostUrl then
			-- See HTTP WARNING at the top of this file
			pcall(function() result = comm.httpTest() or "N/A" end)
		end
		local ableToConnect = NetworkUtils.containsText(result, "done testing")
		if ableToConnect then
			C.State = Network.ConnectionState.Listen
			comm.httpSetTimeout(500) -- # of milliseconds
		end
	elseif C.Type == Network.ConnectionTypes.Text then
		C.UpdateFrequency = Network.TEXT_UPDATE_FREQUENCY
		C.SendReceive = Network.updateByText
		local folder = Network.Options["DataFolder"] or ""
		C.InboundFile = folder .. Paths.SLASH .. Network.TEXT_INBOUND_FILE
		C.OutboundFile = folder .. Paths.SLASH .. Network.TEXT_OUTBOUND_FILE
		local ableToConnect = (folder or "") ~= "" and NetworkUtils.folderExists(folder)
		if ableToConnect then
			C.State = Network.ConnectionState.Listen
		end
	end
	if C.State == Network.ConnectionState.Listen then
		RequestHandler.addUpdateRequest(RequestHandler.IRequest:new({
			EventKey = EventHandler.CoreEventKeys.Start,
		}))
		RequestHandler.addUpdateRequest(RequestHandler.IRequest:new({
			EventKey = EventHandler.CoreEventKeys.GetRewards,
		}))
		RequestHandler.addUpdateRequest(RequestHandler.IRequest:new({
			EventKey = EventHandler.CoreEventKeys.UpdateEvents,
		}))
	end
	return C.State
end

---Updates the current connection state to the one provided
---@param connectionState number a Network.ConnectionState
function Network.updateConnectionState(connectionState)
	Network.CurrentConnection.State = connectionState
end

--- Closes any active connections and saves outstanding Requests
function Network.closeConnections()
	if Network.isConnected() then
		RequestHandler.addUpdateRequest(RequestHandler.IRequest:new({
			EventKey = EventHandler.CoreEventKeys.Stop,
		}))
		Network.CurrentConnection:SendReceive()
		Network.updateConnectionState(Network.ConnectionState.Closed)
	end
	RequestHandler.saveRequestsData()
end

--- Attempts to perform the scheduled network data update
function Network.update()
	if not Network.isConnected() then
		Network.exportFullStateOnSchedule()
		pcall(Network.processCommands)
		return
	end
	Network.CurrentConnection:SendReceiveOnSchedule()
	RequestHandler.saveRequestsDataOnSchedule()
	Network.exportFullStateOnSchedule()
	pcall(Network.processCommands)
end

Network.COMMAND_FILE = "tracker-command.json"
Network.STATE_EXPORT_FILE = "tracker-state.json"
Network.TRAINER_EXPORT_FILE = "tracker-trainer-data.json"
Network.EVO_EXPORT_FILE = "tracker-evo-data.json"
Network.lastExportTime = 0
Network.STATE_EXPORT_FREQUENCY = 2 -- seconds
Network.trainerDataExported = false -- flag to only export once per ROM load
Network.trainerDataGameName = nil -- track which game was exported

local RARE_CANDY_ID = 50

-- Cache: last known good party data (by PID) to fill in transient memory read gaps
local lastKnownParty = {} -- PID -> pokemon data

-- Level caps per game: caps[badgeCount] = level cap for next fight
-- badgeCount 0 = heading to first gym, 1 = beat first gym heading to second, etc.
local LEVEL_CAPS = {
	["Pokemon Platinum"]   = { [0]=14, [1]=22, [2]=30, [3]=32, [4]=36, [5]=41, [6]=44, [7]=50, [8]=78 },
	["Pokemon Diamond"]    = { [0]=14, [1]=22, [2]=28, [3]=32, [4]=36, [5]=41, [6]=44, [7]=49, [8]=66 },
	["Pokemon Pearl"]      = { [0]=14, [1]=22, [2]=28, [3]=32, [4]=36, [5]=41, [6]=44, [7]=49, [8]=66 },
	["Pokemon HeartGold"]  = { [0]=13, [1]=17, [2]=25, [3]=31, [4]=35, [5]=39, [6]=44, [7]=50, [8]=75 },
	["Pokemon SoulSilver"] = { [0]=13, [1]=17, [2]=25, [3]=31, [4]=35, [5]=39, [6]=44, [7]=50, [8]=75 },
	["Pokemon Black"]      = { [0]=14, [1]=20, [2]=24, [3]=29, [4]=33, [5]=39, [6]=43, [7]=48, [8]=75 },
	["Pokemon White"]      = { [0]=14, [1]=20, [2]=24, [3]=29, [4]=33, [5]=39, [6]=43, [7]=48, [8]=75 },
	["Pokemon Black 2"]    = { [0]=13, [1]=18, [2]=23, [3]=28, [4]=33, [5]=39, [6]=46, [7]=52, [8]=77 },
	["Pokemon White 2"]    = { [0]=13, [1]=18, [2]=23, [3]=28, [4]=33, [5]=39, [6]=46, [7]=52, [8]=77 },
}

--- Returns the current level cap based on badge count and game name
---@return number levelCap
local function getCurrentLevelCap()
	if not Network.Data or not Network.Data.gameInfo then return 100 end
	local gameName = Network.Data.gameInfo.NAME or ""
	local caps = LEVEL_CAPS[gameName]
	if not caps then return 100 end

	local badgeCount = 0
	if Network.Data.program then
		local badges = Network.Data.program.getBadges()
		if badges and badges.firstSet then
			for _, v in ipairs(badges.firstSet) do
				if v == 1 then badgeCount = badgeCount + 1 end
			end
		end
		if badges and badges.secondSet then
			for _, v in ipairs(badges.secondSet) do
				if v == 1 then badgeCount = badgeCount + 1 end
			end
		end
	end

	-- caps[8] = champion cap, caps[0..7] = gym caps
	if badgeCount > 8 then badgeCount = 8 end
	return caps[badgeCount] or 100
end

--- Adds Rare Candies to the player's bag by writing to memory.
--- Enforces the level cap: only adds enough candies to bring party to the cap.
---@param count number Requested number of Rare Candies
---@return boolean success, string message
function Network.addRareCandyToBag(count)
	if not Network.Data or not Network.Data.program then
		return false, "Tracker not initialized"
	end

	local battleHandler = Network.Data.battleHandler
	if battleHandler and battleHandler:isInBattle() then
		return false, "Cannot modify bag during battle"
	end

	local memoryAddresses = Network.Data.memoryAddresses
	if not memoryAddresses or not memoryAddresses.itemStartNoBattle then
		return false, "Memory addresses not available"
	end

	-- Calculate the actual number of candies needed to reach the level cap
	local levelCap = getCurrentLevelCap()
	local maxNeeded = 0
	local fullParty = Network.Data.program.getFullParty() or {}
	for _, pokemon in ipairs(fullParty) do
		if MiscUtils.validPokemonData(pokemon) and pokemon.curHP > 0 and (pokemon.isEgg or 0) == 0 then
			if pokemon.level < levelCap then
				maxNeeded = maxNeeded + (levelCap - pokemon.level)
			end
		end
	end

	if maxNeeded <= 0 then
		return false, "All Pokemon are already at or above the level cap (Lv." .. levelCap .. ")"
	end

	count = math.floor(count or 0)
	if count < 1 then
		return false, "Invalid count"
	end

	-- Enforce: never add more than what's needed to reach the cap
	count = math.min(count, maxNeeded)

	-- Scan the bag for existing Rare Candy slot or an empty slot
	local itemStart = memoryAddresses.itemStartNoBattle
	local currentAddress = itemStart
	local emptySlotAddress = nil
	local maxScan = 300 -- safety limit

	for _ = 1, maxScan do
		local idAndQuantity = Memory.read_u32_le(currentAddress)
		local id = bit.band(idAndQuantity, 0xFFFF)
		local quantity = bit.band(bit.rshift(idAndQuantity, 16), 0xFFFF)

		if id == RARE_CANDY_ID then
			-- Found existing Rare Candy slot, add to it
			local newQuantity = math.min(quantity + count, 999)
			local newValue = bit.bor(RARE_CANDY_ID, bit.lshift(newQuantity, 16))
			Memory.write_u32_le(currentAddress, newValue)
			print("Added " .. count .. " Rare Candies (total: " .. newQuantity .. ", cap: Lv." .. levelCap .. ")")
			return true, "Added " .. count .. " Rare Candies (cap: Lv." .. levelCap .. ")"
		elseif id == 0 then
			-- Found empty slot
			if not emptySlotAddress then
				emptySlotAddress = currentAddress
			end
			break
		end

		currentAddress = currentAddress + 4
	end

	-- No existing slot found, write to empty slot
	if emptySlotAddress then
		local newValue = bit.bor(RARE_CANDY_ID, bit.lshift(count, 16))
		Memory.write_u32_le(emptySlotAddress, newValue)
		print("Added " .. count .. " Rare Candies to new bag slot (cap: Lv." .. levelCap .. ")")
		return true, "Added " .. count .. " Rare Candies (cap: Lv." .. levelCap .. ")"
	end

	return false, "No empty bag slot found"
end

--- Checks for and processes commands from the dashboard
function Network.processCommands()
	if not NetworkUtils.JsonLibrary then return end

	local filepath = Paths.FOLDERS.DATA_FOLDER .. Paths.SLASH .. Network.COMMAND_FILE
	local commandData = NetworkUtils.decodeJsonFile(filepath)
	if not commandData or not commandData.command then return end

	-- Clear the command file immediately to prevent re-processing
	local file = io.open(filepath, "w")
	if file then
		file:write("[]")
		file:close()
	end

	local result = { success = false, message = "Unknown command" }

	if commandData.command == "addRareCandy" then
		local count = tonumber(commandData.count) or 0
		local success, message = Network.addRareCandyToBag(count)
		result = { success = success, message = message }
	end

	-- Write result back
	local resultPath = Paths.FOLDERS.DATA_FOLDER .. Paths.SLASH .. "tracker-command-result.json"
	NetworkUtils.encodeToJsonFile(resultPath, result)
end

--- Exports full game state to JSON file on a 2-second schedule
function Network.exportFullStateOnSchedule()
	if not Network.Data or not Network.Data.program then return end
	if (os.time() - Network.lastExportTime) < Network.STATE_EXPORT_FREQUENCY then return end
	Network.lastExportTime = os.time()
	Network.exportFullState()
end

--- Exports all trainer data from the ROM to trainer-data.json (once per ROM load)
function Network.exportTrainerData()
	if not Network.Data or not Network.Data.program then return end
	if not NetworkUtils.JsonLibrary then return end

	local gameInfo = Network.Data.gameInfo
	if not gameInfo then return end

	-- Only export once per game, check if already exported for this game
	local gameName = gameInfo.NAME or "Unknown"
	if Network.trainerDataExported and Network.trainerDataGameName == gameName then
		return
	end

	-- Read trainers from ROM
	local ok, trainers, trainerCount = pcall(function()
		return RomReader.readAllTrainers()
	end)

	if not ok or not trainers then
		print("Network: Failed to read trainer data from ROM")
		return
	end

	-- Build the important trainer ID map from TrainerData constants
	local importantTrainerMap = {}
	local gameCode = Memory.read_u32_le(MemoryAddresses.NDS_CONSTANTS.CARTRIDGE_HEADER + 0x0C)
	local trainerDataConst = TrainerData.TRAINERS[gameCode]
	if trainerDataConst and trainerDataConst.IMPORTANT_GROUPS then
		for _, group in ipairs(trainerDataConst.IMPORTANT_GROUPS) do
			for _, battle in ipairs(group.battles) do
				-- Handle nested tables (like BW first gym with multiple leaders)
				if battle.ids then
					for _, id in ipairs(battle.ids) do
						importantTrainerMap[id] = {
							groupName = group.groupName,
							trainerType = group.trainerType,
							name = battle.name or group.groupName,
							location = battle.location or "",
							badgeNumber = battle.badgeNumber or 0,
							iv = battle.iv or 0,
						}
					end
				elseif #battle > 0 then
					-- Nested sub-battles (e.g. BW first gym)
					for _, subBattle in ipairs(battle) do
						if subBattle.ids then
							for _, id in ipairs(subBattle.ids) do
								importantTrainerMap[id] = {
									groupName = group.groupName,
									trainerType = group.trainerType,
									name = subBattle.name or group.groupName,
									location = subBattle.location or "",
									badgeNumber = subBattle.badgeNumber or 0,
									iv = subBattle.iv or 0,
								}
							end
						end
					end
				end
			end
		end
	end

	-- Build export data
	local exportTrainers = {}
	for trainerID, trainer in pairs(trainers) do
		if trainer.pokemonCount > 0 and #trainer.pokemon > 0 then
			local pokemonExport = {}
			for _, mon in ipairs(trainer.pokemon) do
				local movesExport = {}
				for _, move in ipairs(mon.moves) do
					table.insert(movesExport, {
						id = move.id,
						name = move.name,
						type = move.type,
						category = move.category,
						power = move.power,
						accuracy = move.accuracy,
					})
				end

				-- Convert type table to array of strings
				local typeNames = {}
				if mon.types then
					for _, t in ipairs(mon.types) do
						if type(t) == "string" then
							table.insert(typeNames, t)
						end
					end
				end

				table.insert(pokemonExport, {
					speciesID = mon.speciesID,
					name = mon.name,
					types = typeNames,
					level = mon.level,
					form = mon.form,
					heldItem = mon.heldItem,
					heldItemName = mon.heldItemName,
					moves = movesExport,
					ability = mon.ability,
					abilityID = mon.abilityID,
				})
			end

			local metadata = importantTrainerMap[trainerID]
			local entry = {
				id = trainerID,
				trainerClass = trainer.trainerClass,
				pokemonCount = trainer.pokemonCount,
				pokemon = pokemonExport,
			}

			if metadata then
				entry.groupName = metadata.groupName
				entry.name = metadata.name
				entry.trainerType = metadata.trainerType
				entry.location = metadata.location
				entry.badgeNumber = metadata.badgeNumber
			end

			table.insert(exportTrainers, entry)
		end
	end

	local exportData = {
		gameName = gameName,
		gen = gameInfo.GEN or 0,
		trainerCount = trainerCount or 0,
		exportTimestamp = os.time(),
		trainers = exportTrainers,
	}

	local filepath = Paths.FOLDERS.DATA_FOLDER .. Paths.SLASH .. Network.TRAINER_EXPORT_FILE
	local success = NetworkUtils.encodeToJsonFile(filepath, exportData)
	if success then
		Network.trainerDataExported = true
		Network.trainerDataGameName = gameName
		print("Network: Exported " .. #exportTrainers .. " trainers to " .. Network.TRAINER_EXPORT_FILE)
	end
end

--- Exports all evolution data from the ROM to tracker-evo-data.json (once per ROM load)
function Network.exportEvoData()
	if Network.evoDataExported then return end

	local ok, evolutions = pcall(RomReader.readAllEvolutions)
	if not ok or not evolutions then
		Network.evoDataExported = true
		return
	end

	-- Convert to JSON-friendly format (string keys)
	local evoExport = {}
	local count = 0
	for speciesID, evoList in pairs(evolutions) do
		evoExport[tostring(speciesID)] = evoList
		count = count + 1
	end

	local gameInfo = Network.Data and Network.Data.gameInfo
	local export = {
		gameName = gameInfo and gameInfo.NAME or "Unknown",
		gen = gameInfo and gameInfo.GEN or 0,
		speciesCount = count,
		exportTimestamp = os.time(),
		evolutions = evoExport,
	}

	local filepath = Paths.FOLDERS.DATA_FOLDER .. Paths.SLASH .. Network.EVO_EXPORT_FILE
	NetworkUtils.encodeToJsonFile(filepath, export)
	Network.evoDataExported = true
	print("Network: Exported evolution data for " .. count .. " species to " .. Network.EVO_EXPORT_FILE)
end

--- Builds full game state and writes it to tracker-state.json
function Network.exportFullState()
	if not Network.Data or not Network.Data.program then return end
	if not NetworkUtils.JsonLibrary then return end

	-- Export trainer data once per ROM load
	if not Network.trainerDataExported then
		local ok, err = pcall(Network.exportTrainerData)
		if not ok then
			print("Network: exportTrainerData error: " .. tostring(err))
			Network.trainerDataExported = true -- prevent repeated failures
		end
	end

	-- Export evolution data once per ROM load
	if not Network.evoDataExported then
		local ok, err = pcall(Network.exportEvoData)
		if not ok then
			print("Network: exportEvoData error: " .. tostring(err))
			Network.evoDataExported = true
		end
	end

	local program = Network.Data.program
	local tracker = Network.Data.tracker
	local battleHandler = Network.Data.battleHandler
	local gameInfo = Network.Data.gameInfo

	-- Build party data with cache to prevent transient memory read gaps.
	-- getFullParty() and getBattleParty() skip slots that fail decryption,
	-- which causes pokemon to intermittently disappear. We cache each slot's
	-- last known good data (keyed by PID) and fill in any gaps.
	local partyData = {}
	local baseParty = program.getFullParty() or {}
	local battleParty = nil
	if battleHandler:isInBattle() then
		local ok, result = pcall(function() return battleHandler:getBattleParty() end)
		if ok and result and next(result) ~= nil then
			battleParty = result
		end
	end
	-- Merge: use battle data when available (matched by PID), fall back to base party
	local fullParty = {}
	if battleParty and #battleParty > 0 then
		local battleByPID = {}
		for _, bmon in ipairs(battleParty) do
			if bmon.pid and bmon.pid ~= 0 then
				battleByPID[bmon.pid] = bmon
			end
		end
		for i, baseMon in ipairs(baseParty) do
			local pid = baseMon.pid or 0
			local battleMon = pid ~= 0 and battleByPID[pid] or nil
			fullParty[i] = battleMon or baseMon
		end
	else
		fullParty = baseParty
	end
	-- Update cache with current good reads, and fill in any missing slots from cache
	local expectedSize = 6
	local currentPIDs = {}
	for _, mon in ipairs(fullParty) do
		local pid = mon.pid or 0
		if pid ~= 0 then
			lastKnownParty[pid] = mon
			currentPIDs[pid] = true
		end
	end
	-- If party is smaller than expected, try to recover missing slots from cache
	if #fullParty < expectedSize and next(lastKnownParty) ~= nil then
		-- Find cached PIDs that are missing from the current read
		local missing = {}
		for pid, mon in pairs(lastKnownParty) do
			if not currentPIDs[pid] and mon.pokemonID and mon.pokemonID > 0 then
				table.insert(missing, mon)
			end
		end
		-- Only fill up to expectedSize
		for _, mon in ipairs(missing) do
			if #fullParty >= expectedSize then break end
			table.insert(fullParty, mon)
		end
	end
	-- Evict stale cache entries when party composition changes (e.g. new run)
	if #fullParty >= expectedSize then
		for pid in pairs(lastKnownParty) do
			if not currentPIDs[pid] then
				lastKnownParty[pid] = nil
			end
		end
	end
	for i, pokemon in ipairs(fullParty) do
		local pokemonEntry = PokemonData.POKEMON[(pokemon.pokemonID or 0) + 1]
		local movesArray = {}
		for j, moveID in ipairs(pokemon.moveIDs or {}) do
			local moveEntry = MoveData.MOVES[moveID + 1]
			table.insert(movesArray, {
				id = moveID,
				name = moveEntry and moveEntry.name or "---",
				pp = pokemon.movePPs and pokemon.movePPs[j] or 0,
				type = moveEntry and moveEntry.type or "",
				category = moveEntry and moveEntry.category or "",
				power = moveEntry and moveEntry.power or 0,
				accuracy = moveEntry and moveEntry.accuracy or 0,
			})
		end
		local abilityEntry = AbilityData.ABILITIES[(pokemon.ability or 0) + 1]
		table.insert(partyData, {
			slot = i,
			pokemonID = pokemon.pokemonID,
			name = pokemonEntry and pokemonEntry.name or "Unknown",
			types = pokemonEntry and pokemonEntry.type or {},
			level = pokemon.level or 0,
			curHP = pokemon.curHP or 0,
			maxHP = pokemon.stats and pokemon.stats.HP or 0,
			stats = pokemon.stats or {},
			moves = movesArray,
			ability = abilityEntry and abilityEntry.name or "Unknown",
			abilityID = pokemon.ability or 0,
			nature = pokemon.nature or 0,
			heldItem = pokemon.heldItem or 0,
			heldItemName = (pokemon.heldItem and pokemon.heldItem > 0 and ItemData.ITEMS and ItemData.ITEMS[pokemon.heldItem] and ItemData.ITEMS[pokemon.heldItem].name) or "None",
			status = pokemon.status or 0,
			nickname = pokemon.nickname or "",
			experience = pokemon.experience or 0,
			friendship = pokemon.friendship or 0,
			isEgg = pokemon.isEgg or 0,
			pid = pokemon.pid or 0,
		})
	end

	-- Helper: build enemy data table from a pokemon data object
	local function buildEnemyData(enemyPoke)
		local pokemonEntry = PokemonData.POKEMON[enemyPoke.pokemonID + 1]
		local movesArray = {}
		for j, moveID in ipairs(enemyPoke.moveIDs or {}) do
			local moveEntry = MoveData.MOVES[moveID + 1]
			table.insert(movesArray, {
				id = moveID,
				name = moveEntry and moveEntry.name or "---",
				pp = enemyPoke.movePPs and enemyPoke.movePPs[j] or 0,
				type = moveEntry and moveEntry.type or "",
				category = moveEntry and moveEntry.category or "",
				power = moveEntry and moveEntry.power or 0,
				accuracy = moveEntry and moveEntry.accuracy or 0,
			})
		end
		local abilityEntry = AbilityData.ABILITIES[(enemyPoke.ability or 0) + 1]
		local catchRate = nil
		if program.isWildBattle() then
			local ok, cr = pcall(function() return RomReader.getSpeciesCatchRate(enemyPoke.pokemonID) end)
			if ok then catchRate = cr end
		end
		return {
			pokemonID = enemyPoke.pokemonID,
			name = pokemonEntry and pokemonEntry.name or "Unknown",
			types = pokemonEntry and pokemonEntry.type or {},
			level = enemyPoke.level or 0,
			curHP = enemyPoke.curHP or 0,
			maxHP = enemyPoke.stats and enemyPoke.stats.HP or 0,
			stats = enemyPoke.stats or {},
			moves = movesArray,
			ability = abilityEntry and abilityEntry.name or "Unknown",
			abilityID = enemyPoke.ability or 0,
			isWild = program.isWildBattle(),
			statStages = enemyPoke.statStages or nil,
			heldItem = enemyPoke.heldItem or 0,
			heldItemName = ((enemyPoke.heldItem or 0) > 0 and ItemData.ITEMS and ItemData.ITEMS[enemyPoke.heldItem] and ItemData.ITEMS[enemyPoke.heldItem].name) or "None",
			status = enemyPoke.status or 0,
			catchRate = catchRate,
		}
	end

	-- Build enemy data (if in battle)
	local enemyData = nil
	local enemiesArray = {}
	local isDoubleBattle = false
	if battleHandler:isInBattle() then
		-- Export all enemy slots (supports double/triple battles)
		local battleData = battleHandler:getBattleData()
		local enemyBattleData = battleData and battleData["enemy"]
		if enemyBattleData and enemyBattleData.slots then
			for slotIdx = 1, #enemyBattleData.slots do
				local slot = enemyBattleData.slots[slotIdx]
				local poke = slot and slot.activePokemon
				if poke and MiscUtils.validPokemonData(poke) then
					table.insert(enemiesArray, buildEnemyData(poke))
				end
			end
		end
		isDoubleBattle = #enemiesArray > 1
		-- Keep backward-compatible single enemy (first slot)
		if #enemiesArray > 0 then
			enemyData = enemiesArray[1]
		else
			-- Fallback: use program.getEnemyPokemon() for single battle
			local enemyPokemon = program.getEnemyPokemon()
			if enemyPokemon and MiscUtils.validPokemonData(enemyPokemon) then
				enemyData = buildEnemyData(enemyPokemon)
				enemiesArray = { enemyData }
			end
		end
	end

	-- Build badge data
	local badges = program.getBadges()
	local badgeList = {}
	if badges and badges.firstSet then
		for i, v in ipairs(badges.firstSet) do
			table.insert(badgeList, v)
		end
	end
	if badges and badges.secondSet then
		for i, v in ipairs(badges.secondSet) do
			table.insert(badgeList, v)
		end
	end

	-- Healing items
	local healingItems = program.getHealingItems() or {}
	local healingList = {}
	for itemID, qty in pairs(healingItems) do
		local itemEntry = ItemData.ITEMS and ItemData.ITEMS[itemID]
		table.insert(healingList, {
			id = itemID,
			name = itemEntry and itemEntry.name or ("Item " .. itemID),
			quantity = qty,
		})
	end

	-- Ball inventory: scan the Poke Ball pocket for ball IDs 1-16 + 576 Dream Ball
	-- During battle, bag data is at different addresses (berryBagStartBattle)
	local ballList = {}
	local memoryAddresses = Network.Data.memoryAddresses
	if memoryAddresses then
		-- Use battle addresses during battle, same as Program.lua bag scanning
		local berryStart = memoryAddresses.berryBagStart
		if battleHandler and battleHandler:isInBattle() and memoryAddresses.berryBagStartBattle then
			berryStart = memoryAddresses.berryBagStartBattle
			-- Sanity check: battle bag may not be set up yet in first few frames
			local testVal = Memory.read_u32_le(memoryAddresses.itemStartBattle or 0)
			local testId = bit.band(testVal, 0xFFFF)
			local testQty = bit.band(bit.rshift(testVal, 16), 0xFFFF)
			if testQty > 1000 or testId > 600 then
				berryStart = memoryAddresses.berryBagStart -- fall back to non-battle
			end
		end

		if berryStart then
			local BALL_IDS = {}
			for id = 1, 16 do BALL_IDS[id] = true end
			BALL_IDS[576] = true -- Dream Ball (Gen 5)

			local gen = gameInfo and gameInfo.GEN or 4
			if gen == 4 then
				-- Gen 4 bag layout: ...Medicine(40) → Berries(64) → PokeBalls(15) → BattleItems(30)...
				-- Poke Ball pocket is right after berries: berryStart + 64 slots × 4 bytes = +0x100
				local addr = berryStart + 0x100
				for _ = 1, 15 do
					local val = Memory.read_u32_le(addr)
					local id = bit.band(val, 0xFFFF)
					if id == 0 then break end
					local qty = bit.band(bit.rshift(val, 16), 0xFFFF)
					if BALL_IDS[id] and qty > 0 then
						local itemEntry = ItemData.ITEMS and ItemData.ITEMS[id]
						table.insert(ballList, {
							id = id,
							name = itemEntry and itemEntry.name or ("Ball " .. id),
							quantity = qty,
						})
					end
					addr = addr + 4
				end
			else
				-- Gen 5: Scan from berryStart through remaining pockets (skip empty slots)
				local addr = berryStart
				local consecutiveZeros = 0
				for _ = 1, 400 do
					local val = Memory.read_u32_le(addr)
					local id = bit.band(val, 0xFFFF)
					if id == 0 then
						consecutiveZeros = consecutiveZeros + 1
						if consecutiveZeros > 30 then break end
					else
						consecutiveZeros = 0
						local qty = bit.band(bit.rshift(val, 16), 0xFFFF)
						if BALL_IDS[id] and qty > 0 then
							local itemEntry = ItemData.ITEMS and ItemData.ITEMS[id]
							table.insert(ballList, {
								id = id,
								name = itemEntry and itemEntry.name or ("Ball " .. id),
								quantity = qty,
							})
						end
					end
					addr = addr + 4
				end
			end
		end
	end

	-- Get lead pokemon stat stages and active pokemon info (only available in battle)
	local leadStatStages = nil
	local activeBattlePID = nil
	local activeBattleSlot = nil
	if battleHandler:isInBattle() then
		-- Read active PID directly from battle memory (always current, even mid-switch)
		local ok, pid = pcall(function() return battleHandler:getActivePlayerPID() end)
		if ok and pid then
			activeBattlePID = pid
		end

		-- Fallback to cached playerPokemon PID
		local playerPokemon = program.getPlayerPokemon()
		if not activeBattlePID and playerPokemon then
			activeBattlePID = playerPokemon.pid or nil
		end

		-- Get stat stages from cached playerPokemon
		if playerPokemon and playerPokemon.statStages then
			leadStatStages = playerPokemon.statStages
		end

		-- Find which party slot matches the active PID
		if activeBattlePID then
			for idx, pokemon in ipairs(fullParty) do
				if pokemon.pid == activeBattlePID then
					activeBattleSlot = idx
					break
				end
			end
		end
	end

	-- Build encounter data
	local encountersExport = nil
	local locationData = gameInfo and gameInfo.LOCATION_DATA
	if locationData then
		local areaOrder = locationData.encounterAreaOrder or {}
		local vanillaEncounters = locationData.encounters or {}
		local allEncounterData = tracker.getAllEncounterData() or {}

		local routesExport = {}
		local addedRoutes = {}

		-- Routes from the ordered list first
		for _, routeName in ipairs(areaOrder) do
			addedRoutes[routeName] = true
			local routeInfo = { totalPokemon = 0, seen = {} }
			if vanillaEncounters[routeName] then
				routeInfo.totalPokemon = vanillaEncounters[routeName].totalPokemon or 0
			end
			local trackedArea = allEncounterData[routeName]
			if trackedArea and trackedArea.encountersSeen then
				for pokemonID, levels in pairs(trackedArea.encountersSeen) do
					local pokemonEntry = PokemonData.POKEMON[pokemonID + 1]
					table.insert(routeInfo.seen, {
						name = pokemonEntry and pokemonEntry.name or "Unknown",
						pokemonID = pokemonID,
						levels = levels
					})
				end
			end
			routesExport[routeName] = routeInfo
		end

		-- Extra routes with data not in ordered list
		for routeName, trackedArea in pairs(allEncounterData) do
			if not addedRoutes[routeName] then
				local routeInfo = { totalPokemon = 0, seen = {} }
				if vanillaEncounters[routeName] then
					routeInfo.totalPokemon = vanillaEncounters[routeName].totalPokemon or 0
				end
				if trackedArea.encountersSeen then
					for pokemonID, levels in pairs(trackedArea.encountersSeen) do
						local pokemonEntry = PokemonData.POKEMON[pokemonID + 1]
						table.insert(routeInfo.seen, {
							name = pokemonEntry and pokemonEntry.name or "Unknown",
							pokemonID = pokemonID,
							levels = levels
						})
					end
				end
				routesExport[routeName] = routeInfo
			end
		end

		encountersExport = {
			areaOrder = areaOrder,
			routes = routesExport
		}
	end

	-- Build state object
	local state = {
		timestamp = os.time(),
		gameName = gameInfo and gameInfo.NAME or "Unknown",
		gen = gameInfo and gameInfo.GEN or 0,
		party = partyData,
		enemy = enemyData,
		enemies = #enemiesArray > 0 and enemiesArray or nil,
		isDoubleBattle = isDoubleBattle,
		inBattle = battleHandler:isInBattle(),
		badges = badgeList,
		badgeCount = 0,
		progress = tracker.getProgress(),
		timerSeconds = tracker.getTimerSeconds(),
		location = tracker.getCurrentAreaName() or "",
		healingItems = healingList,
		ballItems = ballList,
		pokecenterCount = tracker.getPokecenterCount(),
		runOver = tracker.hasRunEnded(),
		leadStatStages = leadStatStages,
		activeBattlePID = activeBattlePID,
		activeBattleSlot = activeBattleSlot,
		encounters = encountersExport,
	}

	-- Count badges
	for _, v in ipairs(badgeList) do
		if v == 1 then state.badgeCount = state.badgeCount + 1 end
	end

	-- Write to file
	local filepath = Paths.FOLDERS.DATA_FOLDER .. Paths.SLASH .. Network.STATE_EXPORT_FILE
	NetworkUtils.encodeToJsonFile(filepath, state)
end

--- The update function used by the "Text" Network connection type
function Network.updateByText()
	local C = Network.CurrentConnection
	if not C.InboundFile or not C.OutboundFile or not NetworkUtils.JsonLibrary then
		return
	end

	EventHandler.checkForConfigChanges()
	local requestsAsJson = NetworkUtils.decodeJsonFile(C.InboundFile)
	RequestHandler.receiveJsonRequests(requestsAsJson)
	RequestHandler.processAllRequests()
	local responses = RequestHandler.getResponses()
	-- Prevent consecutive "empty" file writes
	if #responses > 0 or not C.InboundWasEmpty then
		local success = NetworkUtils.encodeToJsonFile(C.OutboundFile, responses)
		C.InboundWasEmpty = (success == false) -- false if no resulting json data
		RequestHandler.clearAllResponses()
	end
end

--- The update function used by the "Socket" Network connection type
function Network.updateBySocket()
	-- Not implemented. Requires asynchronous compatibility
	if true then return end

	local C = Network.CurrentConnection
	if C.SocketIP == "0.0.0.0" or C.SocketPort == 0 or not NetworkUtils.JsonLibrary then
		return
	end

	EventHandler.checkForConfigChanges()
	local input = ""
	local requestsAsJson = NetworkUtils.JsonLibrary.decode(input) or {}
	RequestHandler.receiveJsonRequests(requestsAsJson)
	RequestHandler.processAllRequests()
	local responses = RequestHandler.getResponses()
	if #responses > 0 then
		local output = NetworkUtils.JsonLibrary.encode(responses) or "[]"
		RequestHandler.clearAllResponses()
	end
end

--- The update function used by the "Http" Network connection type
function Network.updateByHttp()
	-- Not implemented. Requires asynchronous compatibility
	if true then return end

	local C = Network.CurrentConnection
	if (C.HttpGetUrl or "") == "" or (C.HttpPostUrl or "") == "" or not NetworkUtils.JsonLibrary then
		return
	end

	EventHandler.checkForConfigChanges()
	local resultGet = comm.httpGet(C.HttpGetUrl) or ""
	local requestsAsJson = NetworkUtils.JsonLibrary.decode(resultGet) or {}
	RequestHandler.receiveJsonRequests(requestsAsJson)
	RequestHandler.processAllRequests()
	local responses = RequestHandler.getResponses()
	if #responses > 0 then
		local payload = NetworkUtils.JsonLibrary.encode(responses) or "[]"
		local resultPost = comm.httpPost(C.HttpPostUrl, payload)
		RequestHandler.clearAllResponses()
	end
end

function Network.loadSettings()
	Network.MetaSettings = {}
	local filepath = Paths.FOLDERS.NETWORK_FOLDER .. Paths.SLASH .. Network.FILE_SETTINGS
	if not FormsUtils.fileExists(filepath) then
		return
	end

	local settings = Network.iniParser.parse(filepath) or {}
	-- Keep the meta data for saving settings later in a specified order
	Network.MetaSettings = settings

	-- [NETWORK]
	if settings.network ~= nil then
		for key, _ in pairs(Network.Options or {}) do
			local optionValue = settings.network[string.gsub(key, " ", "_")]
			if optionValue ~= nil then
				Network.Options[key] = optionValue
			end
		end
	end
end

function Network.saveSettings()
	local settings = Network.MetaSettings or {}
	settings.network = settings.network or {}

	-- [NETWORK]
	for key, val in pairs(Network.Options or {}) do
		local encodedKey = string.gsub(key, " ", "_")
		settings.network[encodedKey] = val
	end

	local filepath = Paths.FOLDERS.NETWORK_FOLDER .. Paths.SLASH .. Network.FILE_SETTINGS
	Network.iniParser.save(filepath, settings)
end

function Network.getStreamerbotCode()
	local filepath = Paths.FOLDERS.NETWORK_FOLDER .. Paths.SLASH .. Network.FILE_IMPORT_CODE
	return MiscUtils.readStringFromFile(filepath) or ""
end

---Required update check if an update needs total change Streamerbot Code (tracker can only change its own tracker code)
---This requires the user to re-import the StreamerbotCodeImport.txt (which the tracker dev needs to regenerate)
function Network.openUpdateRequiredPrompt()
	local form = forms.newform(350, 150, "Streamerbot Update Required", function()
		client.unpause()
	end)
	local clientCenter = FormsUtils.getCenter(350, 150)
	forms.setlocation(form, clientCenter.xPos, clientCenter.yPos)

	local x, y, lineHeight = 20, 20, 20
	local lb1 = forms.label(form, "Streamerbot Tracker Integration code requires an update.", x, y)
	y = y + lineHeight
	local lb2 = forms.label(form, "You must re-import the code to continue using Stream Connect.", x, y)
	y = y + lineHeight
	-- Bottom row buttons
	y = y + 10
	local btn1 = forms.button(form, "Show Me", function()
		forms.destroy(form)
		client.unpause()
		Network.openGetCodeWindow()
	end, 40, y)
	local btn2 = forms.button(form, "Turn Off Stream Connect", function()
		Network.Options["AutoConnectStartup"] = false
		Network.saveSettings()
		Network.closeConnections()
		forms.destroy(form)
		client.unpause()
	end, 150, y)

	-- Autosize form control elements
	forms.setproperty(lb1, "AutoSize", true)
	forms.setproperty(lb2, "AutoSize", true)
	forms.setproperty(btn1, "AutoSize", true)
	forms.setproperty(btn2, "AutoSize", true)
end

---Displays the full import code required to add actions/command triggers to Streamerbot.
---If the external Streamerbot code ever changes, this import code *must* be regenerated via export
function Network.openGetCodeWindow()
	local form = forms.newform(800, 600, "Import to Streamerbot", function()
		client.unpause()
	end)
	local clientCenter = FormsUtils.getCenter(800, 600)
	forms.setlocation(form, clientCenter.xPos, clientCenter.yPos)

	local x, y, lineHeight = 20, 15, 20
	local lb1 = forms.label(form, '1. On Streamerbot, click the IMPORT button at the top.', x, y)
	y = y + lineHeight
	local lb2 = forms.label(form, '2. Copy/paste the below code into the top textbox. Click "Import" then "OK".', x, y)
	y = y + lineHeight
	local lb3 = forms.label(form, '3. Restart Streamerbot (this is required).', x, y)
	y = y + lineHeight

	local codeText = Network.getStreamerbotCode()
	local txtbox1 = forms.textbox(form, codeText, 763, 442, "", x - 1, y, true, true, "Vertical")

	local lb4 = forms.label(form, string.format("Streamerbot Code Version: %s", Network.STREAMERBOT_VERSION), x, 530)
	local btn1 = forms.button(form, "Close", function()
		forms.destroy(form)
		client.unpause()
	end, 350, 530)

	-- Autosize form control elements
	forms.setproperty(lb1, "AutoSize", true)
	forms.setproperty(lb2, "AutoSize", true)
	forms.setproperty(lb3, "AutoSize", true)
	forms.setproperty(lb4, "AutoSize", true)
	forms.setproperty(btn1, "AutoSize", true)
end

---Opens an dialog prompt popup to configure Role Permissions used for commands. Several checkboxes
function Network.openCommandRolePermissionsPrompt()
	local form = forms.newform(320, 255, "Edit Command Roles", function()
		client.unpause()
	end)
	local clientCenter = FormsUtils.getCenter(320, 255)
	forms.setlocation(form, clientCenter.xPos, clientCenter.yPos)

	local x, y = 20, 15
	local lineHeight = 21
	local commandLabel = string.format("Select user roles that can use Tracker chat commands:")
	local lb1 = forms.label(form, commandLabel, x - 1, y - 1)
	forms.setproperty(lb1, "AutoSize", true)
	y = y + lineHeight

	-- Current role options, from the user settings
	local currentRoles = {}
	for _, roleKey in pairs(MiscUtils.split(Network.Options["CommandRoles"], ",", true) or {}) do
		currentRoles[roleKey] = true
	end
	-- All available role options, in a predefined order
	local orderedRoles = { "Broadcaster", "Moderator", "Vip", "Subscriber", --[["Custom",]] "Everyone" }
	local roleCheckboxes = {}
	local customRoleTextbox

	-- Enable or Disable all non-Everyone roles based on the state of Everyone role being allowed
	local function enableDisableAll()
		local allowEveryone = forms.ischecked(roleCheckboxes["Everyone"])
		for _, roleKey in ipairs(orderedRoles) do
			if roleKey ~= "Everyone" and roleKey ~= "Broadcaster" then
				forms.setproperty(roleCheckboxes[roleKey], "Enabled", not allowEveryone)
			end
		end
		if customRoleTextbox then
			forms.setproperty(customRoleTextbox, "Enabled", not allowEveryone)
		end
	end

	for i, roleKey in ipairs(orderedRoles) do
		local roleLabel = roleKey
		if roleKey == "Custom" then
			roleLabel = "Custom Role:"
			customRoleTextbox = forms.textbox(form, Network.Options["CustomCommandRole"], 120, 19, "", x + 143, y + lineHeight * (i - 1))
		end
		local clickFunc = (roleKey == "Everyone" and enableDisableAll) or nil
		roleCheckboxes[roleKey] = forms.checkbox(form, roleLabel, x, y + lineHeight * (i - 1))
		forms.setproperty(roleCheckboxes[roleKey], "AutoSize", true)
		if clickFunc then
			forms.addclick(roleCheckboxes[roleKey], clickFunc)
		end
		local roleAllowed = currentRoles["Everyone"] ~= nil or currentRoles[roleKey] ~= nil
		forms.setproperty(roleCheckboxes[roleKey], "Checked", roleAllowed)
	end
	forms.setproperty(roleCheckboxes["Broadcaster"], "Checked", true)
	forms.setproperty(roleCheckboxes["Broadcaster"], "Enabled", false)

	enableDisableAll()

	local buttonRowY = y + lineHeight * #orderedRoles + 15
	local btn1 = forms.button(form, "Save", function()
		if forms.ischecked(roleCheckboxes["Everyone"]) then
			Network.Options["CommandRoles"] = EventHandler.CommandRoles.Everyone
		else
			if forms.ischecked(roleCheckboxes["Custom"]) and customRoleTextbox then
				Network.Options["CustomCommandRole"] = forms.gettext(customRoleTextbox) or ""
			else
				Network.Options["CustomCommandRole"] = ""
			end
			local allowedRoles = {}
			for _, roleKey in ipairs(orderedRoles) do
				if forms.ischecked(roleCheckboxes[roleKey]) then
					if roleKey == "Custom" then
						if (Network.Options["CustomCommandRole"] or "") ~= "" then
							table.insert(allowedRoles, Network.Options["CustomCommandRole"])
						end
					else
						table.insert(allowedRoles, EventHandler.CommandRoles[roleKey])
					end
				end
			end
			Network.Options["CommandRoles"] = table.concat(allowedRoles, ",")
		end
		Network.saveSettings()
		RequestHandler.addUpdateRequest(RequestHandler.IRequest:new({
			EventKey = EventHandler.CoreEventKeys.UpdateEvents,
		}))
		forms.destroy(form)
		client.unpause()
	end, 30, buttonRowY)
	local btn2 = forms.button(form, "(Default)", function()
		for _, roleKey in ipairs(orderedRoles) do
			forms.setproperty(roleCheckboxes[roleKey], "Checked", true)
		end
		if customRoleTextbox then
			forms.settext(customRoleTextbox, "")
		end
		enableDisableAll()
	end, 120, buttonRowY)
	local btn3 = forms.button(form, "Cancel", function()
		forms.destroy(form)
		client.unpause()
	end, 210, buttonRowY)

	-- Autosize form control elements
	forms.setproperty(btn1, "AutoSize", true)
	forms.setproperty(btn2, "AutoSize", true)
	forms.setproperty(btn3, "AutoSize", true)
end

-- Not supported

-- [Web Sockets] Streamer.bot Docs
-- https://wiki.streamer.bot/en/Servers-Clients
-- https://wiki.streamer.bot/en/Servers-Clients/WebSocket-Server
-- https://wiki.streamer.bot/en/Servers-Clients/WebSocket-Server/Requests
-- https://wiki.streamer.bot/en/Servers-Clients/WebSocket-Server/Events
-- [Web Sockets] Bizhawk Docs
-- string comm.socketServerGetInfo 		-- returns the IP and port of the Lua socket server
-- bool comm.socketServerIsConnected 	-- socketServerIsConnected
-- string comm.socketServerResponse 	-- Receives a message from the Socket server. Formatted with msg length at start, e.g. "3 ABC"
-- int comm.socketServerSend 			-- sends a string to the Socket server
-- void comm.socketServerSetTimeout 	-- sets the timeout in milliseconds for receiving messages
-- bool comm.socketServerSuccessful 	-- returns the status of the last Socket server action

-- --- Registering an event is required to enable you to listen to events emitted by Streamer.bot:
-- --- https://wiki.streamer.bot/en/Servers-Clients/WebSocket-Server/Events
-- ---@param requestId string Example: "123"
-- ---@param eventSource string Example: "Command"
-- ---@param eventTypes table Example: { "Message", "Whisper" }
-- function Network.registerWebSocketEvent(requestId, eventSource, eventTypes)
-- 	local registerFormat = [[{"request":"Subscribe","id":"%s","events":{"%s":[%s]}}]]
-- 	local requestStr = string.format(registerFormat, requestId, eventSource, table.concat(eventTypes, ","))
-- 	local response = comm.socketServerSend(requestStr)
-- 	-- -1 = failed ?
-- end
Memory = {}

function Memory.inRange(addr)
	if addr == nil then
		return false
	end
	return (0x000000 <= addr and addr <= 0x3FFFFF)
end

function Memory.read_u32_le(addr)
	if Memory.inRange(addr) then
		return memory.read_u32_le(addr)
	else
		return 0x00000000
	end
end

function Memory.read_u16_le(addr)
	if Memory.inRange(addr) then
		return memory.read_u16_le(addr)
	else
		return 0x0000
	end
end

function Memory.read_u8(addr)
	if Memory.inRange(addr) then
		return memory.read_u8(addr)
	else
		return 0x00
	end
end

function Memory.write_u32_le(addr, value)
	if Memory.inRange(addr) then
		memory.write_u32_le(addr, value)
	end
end

function Memory.write_u16_le(addr, value)
	if Memory.inRange(addr) then
		memory.write_u16_le(addr, value)
	end
end

--- Reads a u32 from the ROM memory domain at the given offset
function Memory.readROMu32(offset)
	memory.usememorydomain("ROM")
	local val = memory.read_u32_le(offset)
	memory.usememorydomain("Main RAM")
	return val
end

--- Reads a u16 from the ROM memory domain at the given offset
function Memory.readROMu16(offset)
	memory.usememorydomain("ROM")
	local val = memory.read_u16_le(offset)
	memory.usememorydomain("Main RAM")
	return val
end

--- Reads a u8 from the ROM memory domain at the given offset
function Memory.readROMu8(offset)
	memory.usememorydomain("ROM")
	local val = memory.read_u8(offset)
	memory.usememorydomain("Main RAM")
	return val
end

function Memory.read_pointer(addr)
	local addressAtPtr = Memory.read_u32_le(addr)
	--cut off first 2 bytes
	addressAtPtr = bit.band(addressAtPtr, 0xFFFFFF)
	if Memory.inRange(addressAtPtr) then
		return addressAtPtr
	else
		return 0x00
	end
end

// Packet definitions for RuneScape 508 protocol
const PACKET_DEFINITIONS = {
    164: {
        name: 'Walk',
        fields: [
            { name: 'forceRun', type: 'byte', modifier: 'C' },
            { name: 'firstX', type: 'short', modifier: 'A' },
            { name: 'firstY', type: 'short' },
            { name: 'waypoints', type: 'waypoint_array' }
        ]
    },
    98: {
        name: 'Walk on Command',
        fields: [
            { name: 'firstX', type: 'short' },
            { name: 'forceRun', type: 'byte', modifier: 'S' },
            { name: 'firstY', type: 'short', modifier: 'A' }
        ]
    },
    248: {
        name: 'Mini Walk',
        fields: [
            { name: 'localX', type: 'byte', modifier: 'S' },
            { name: 'forceRun', type: 'byte', modifier: 'C' },
            { name: 'localY', type: 'byte', modifier: 'S' }
        ]
    },
    4: {
        name: 'Public Chat',
        fields: [
            { name: 'effects', type: 'byte', modifier: 'S' },
            { name: 'color', type: 'byte', modifier: 'S' },
            { name: 'messageLength', type: 'byte' },
            { name: 'message', type: 'string' }
        ]
    },
    14: {
        name: 'Player Option 1',
        fields: [
            { name: 'playerIndex', type: 'short', modifier: 'A' }
        ]
    },
    237: {
        name: 'Magic on Player',
        fields: [
            { name: 'playerIndex', type: 'short' },
            { name: 'spellId', type: 'short', modifier: 'A' }
        ]
    },
    249: {
        name: 'Magic on NPC',
        fields: [
            { name: 'npcIndex', type: 'short', modifier: 'A' },
            { name: 'spellId', type: 'short' }
        ]
    },
    131: {
        name: 'NPC Option 1',
        fields: [
            { name: 'npcIndex', type: 'short' }
        ]
    },
    17: {
        name: 'NPC Option 2',
        fields: [
            { name: 'npcIndex', type: 'short' }
        ]
    },
    122: {
        name: 'Item First Click',
        fields: [
            { name: 'interfaceId', type: 'short', modifier: 'A' },
            { name: 'slot', type: 'short', modifier: 'A' },
            { name: 'itemId', type: 'short' }
        ]
    },
    41: {
        name: 'Item Equip',
        fields: [
            { name: 'itemId', type: 'short' },
            { name: 'slot', type: 'short', modifier: 'A' },
            { name: 'interfaceId', type: 'short', modifier: 'A' }
        ]
    },
    117: {
        name: 'Item Drop',
        fields: [
            { name: 'interfaceId', type: 'short', modifier: 'A' },
            { name: 'itemId', type: 'short', modifier: 'A' },
            { name: 'slot', type: 'short' }
        ]
    },
    87: {
        name: 'Item on Item',
        fields: [
            { name: 'slot1', type: 'short' },
            { name: 'itemId1', type: 'short', modifier: 'A' },
            { name: 'itemId2', type: 'short' },
            { name: 'slot2', type: 'short', modifier: 'A' }
        ]
    },
    192: {
        name: 'Button Click',
        fields: [
            { name: 'buttonId', type: 'short' }
        ]
    }
};

// Byte modifier functions
const MODIFIERS = {
    A: {
        encode: (value) => value - 128,
        decode: (value) => value + 128,
        name: 'A (value - 128)'
    },
    C: {
        encode: (value) => -value,
        decode: (value) => -value,
        name: 'C (-value)'
    },
    S: {
        encode: (value) => 128 - value,
        decode: (value) => 128 - value,
        name: 'S (128 - value)'
    }
};

// Local storage management
function saveToRecent(packet) {
    let recent = JSON.parse(localStorage.getItem('recentPackets') || '[]');
    recent.unshift({
        hex: packet,
        timestamp: new Date().toISOString()
    });
    recent = recent.slice(0, 10); // Keep only last 10
    localStorage.setItem('recentPackets', JSON.stringify(recent));
    displayRecentPackets();
}

function displayRecentPackets() {
    const container = document.getElementById('recent-packets');
    if (!container) return;
    
    const recent = JSON.parse(localStorage.getItem('recentPackets') || '[]');
    container.innerHTML = recent.map(p => `
        <div class="recent-packet" onclick="loadRecentPacket('${p.hex}')">
            <code>${p.hex}</code>
            <span class="recent-packet-time">${new Date(p.timestamp).toLocaleTimeString()}</span>
        </div>
    `).join('');
}

function loadRecentPacket(hex) {
    document.getElementById('hex-input').value = hex;
    decodePacket();
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Packet decoding
function decodePacket() {
    const hexInput = document.getElementById('hex-input').value.trim();
    const resultDiv = document.getElementById('decode-result');
    
    if (!hexInput) {
        resultDiv.innerHTML = '<span style="color: var(--danger)">Please enter a hex packet</span>';
        return;
    }
    
    try {
        const bytes = hexInput.split(/[-\s]+/).map(h => parseInt(h, 16));
        if (bytes.some(b => isNaN(b))) {
            throw new Error('Invalid hex format');
        }
        
        const opcode = bytes[0];
        const payload = bytes.slice(1);
        
        let result = `Opcode: ${opcode} (0x${opcode.toString(16).toUpperCase()})`;
        
        const definition = PACKET_DEFINITIONS[opcode];
        if (definition) {
            result += ` - ${definition.name}\n`;
            result += `Payload: ${payload.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}\n\n`;
            
            let index = 0;
            result += 'Decoded Fields:\n';
            
            for (const field of definition.fields) {
                if (index >= payload.length) break;
                
                let value;
                let rawValue;
                
                if (field.type === 'byte') {
                    rawValue = payload[index++];
                    value = field.modifier ? MODIFIERS[field.modifier].decode(rawValue) : rawValue;
                } else if (field.type === 'short') {
                    if (index + 1 >= payload.length) break;
                    rawValue = (payload[index++] << 8) | payload[index++];
                    value = field.modifier ? MODIFIERS[field.modifier].decode(rawValue) : rawValue;
                } else if (field.type === 'waypoint_array') {
                    result += `  ${field.name}: `;
                    const waypoints = [];
                    while (index + 1 < payload.length) {
                        const x = payload[index++] + 128;
                        const y = payload[index++] + 128;
                        waypoints.push(`(${x}, ${y})`);
                    }
                    result += waypoints.join(' -> ') || 'none';
                    continue;
                } else if (field.type === 'string') {
                    const chars = [];
                    while (index < payload.length) {
                        chars.push(String.fromCharCode(payload[index++]));
                    }
                    value = chars.join('');
                    result += `  ${field.name}: "${value}"`;
                    continue;
                }
                
                result += `  ${field.name}: ${value}`;
                if (field.modifier) {
                    result += ` (raw: ${rawValue}, modifier: ${field.modifier})`;
                }
                result += '\n';
            }
        } else {
            result += '\nPayload bytes:\n';
            payload.forEach((byte, i) => {
                result += `  [${i}]: ${byte} (0x${byte.toString(16).toUpperCase().padStart(2, '0')})\n`;
            });
        }
        
        resultDiv.innerHTML = result;
        saveToRecent(hexInput);
        
    } catch (error) {
        resultDiv.innerHTML = `<span style="color: var(--danger)">Error: ${error.message}</span>`;
    }
}

// Packet building
function updateBuilderFields() {
    const opcode = parseInt(document.getElementById('opcode-select').value);
    const fieldsDiv = document.getElementById('builder-fields');
    
    if (!opcode || !PACKET_DEFINITIONS[opcode]) {
        fieldsDiv.innerHTML = '';
        document.getElementById('hex-preview').textContent = '--';
        return;
    }
    
    const definition = PACKET_DEFINITIONS[opcode];
    let html = '';
    
    for (const field of definition.fields) {
        if (field.type === 'waypoint_array') {
            html += `
                <div class="input-group">
                    <label>${field.name} (comma-separated coordinates, e.g., "100,200 105,202")</label>
                    <input type="text" id="field-${field.name}" data-field="${field.name}" onchange="updatePacketPreview()">
                </div>
            `;
        } else if (field.type === 'string') {
            html += `
                <div class="input-group">
                    <label>${field.name}</label>
                    <input type="text" id="field-${field.name}" data-field="${field.name}" onchange="updatePacketPreview()">
                </div>
            `;
        } else {
            html += `
                <div class="input-group">
                    <label>${field.name}${field.modifier ? ' (modifier: ' + field.modifier + ')' : ''}</label>
                    <input type="number" id="field-${field.name}" data-field="${field.name}" onchange="updatePacketPreview()">
                </div>
            `;
        }
    }
    
    fieldsDiv.innerHTML = html;
    updatePacketPreview();
}

function updatePacketPreview() {
    const opcode = parseInt(document.getElementById('opcode-select').value);
    if (!opcode || !PACKET_DEFINITIONS[opcode]) return;
    
    const definition = PACKET_DEFINITIONS[opcode];
    const bytes = [opcode];
    
    try {
        for (const field of definition.fields) {
            const input = document.getElementById(`field-${field.name}`);
            if (!input) continue;
            
            const value = input.value;
            if (!value) continue;
            
            if (field.type === 'byte') {
                let byteValue = parseInt(value);
                if (field.modifier) {
                    byteValue = MODIFIERS[field.modifier].encode(byteValue) & 0xFF;
                }
                bytes.push(byteValue);
            } else if (field.type === 'short') {
                let shortValue = parseInt(value);
                if (field.modifier) {
                    shortValue = MODIFIERS[field.modifier].encode(shortValue) & 0xFFFF;
                }
                bytes.push((shortValue >> 8) & 0xFF);
                bytes.push(shortValue & 0xFF);
            } else if (field.type === 'waypoint_array') {
                const waypoints = value.split(/\s+/).filter(w => w.includes(','));
                for (const wp of waypoints) {
                    const [x, y] = wp.split(',').map(n => parseInt(n));
                    bytes.push((x - 128) & 0xFF);
                    bytes.push((y - 128) & 0xFF);
                }
            } else if (field.type === 'string') {
                bytes.push(value.length);
                for (let i = 0; i < value.length; i++) {
                    bytes.push(value.charCodeAt(i));
                }
            }
        }
        
        const hex = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('-');
        document.getElementById('hex-preview').textContent = hex;
        
    } catch (error) {
        document.getElementById('hex-preview').textContent = 'Error: ' + error.message;
    }
}

function copyHex() {
    const hex = document.getElementById('hex-preview').textContent;
    if (hex && hex !== '--' && !hex.startsWith('Error:')) {
        navigator.clipboard.writeText(hex).then(() => {
            const button = document.getElementById('copy-button');
            button.textContent = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = 'Copy';
                button.classList.remove('copied');
            }, 2000);
        });
    }
}

// Display packet structures in reference tab
function displayPacketStructures() {
    const container = document.getElementById('packet-structures');
    if (!container) return;
    
    let html = '';
    
    for (const [opcode, def] of Object.entries(PACKET_DEFINITIONS)) {
        html += `
            <div class="packet-structure">
                <h4>${def.name} (Opcode: ${opcode})</h4>
        `;
        
        for (const field of def.fields) {
            html += `<div class="packet-structure-field">`;
            html += `${field.name}: ${field.type}`;
            if (field.modifier) {
                html += ` [${field.modifier}]`;
            }
            html += `</div>`;
        }
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// Initialize on load
window.onload = function() {
    displayRecentPackets();
    displayPacketStructures();
    
    // Initialize packet capture
    if (window.PacketCapture) {
        packetCapture = new PacketCapture();
    }
    
    // Test with the example packet
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        decodePacket();
    }
};

// Capture functions
function startCapture() {
    if (!packetCapture) {
        packetCapture = new PacketCapture();
    }
    
    packetCapture.startCapture();
    document.getElementById('start-capture-btn').disabled = true;
    document.getElementById('stop-capture-btn').disabled = false;
    document.getElementById('capture-status').textContent = 'Capturing...';
    
    // Start duration timer
    captureInterval = setInterval(updateCaptureDuration, 1000);
    
    // Simulate proxy if needed
    if (!window.activeProxy) {
        window.activeProxy = new PacketProxy('oldschool76.runescape.com', 43594);
        window.activeProxy.start(43595);
    }
}

function stopCapture() {
    if (!packetCapture) return;
    
    packetCapture.stopCapture();
    document.getElementById('start-capture-btn').disabled = false;
    document.getElementById('stop-capture-btn').disabled = true;
    document.getElementById('capture-status').textContent = 'Stopped';
    
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
}

function clearCapture() {
    if (!packetCapture) return;
    
    packetCapture.clear();
    document.getElementById('capture-tbody').innerHTML = '';
    document.getElementById('packet-count').textContent = '0';
    document.getElementById('capture-duration').textContent = '00:00';
}

function updateCaptureDuration() {
    if (!packetCapture || !packetCapture.captureStartTime) return;
    
    const duration = Date.now() - packetCapture.captureStartTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    
    document.getElementById('capture-duration').textContent = 
        `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
}

function updateCaptureDisplay(packet) {
    const tbody = document.getElementById('capture-tbody');
    const row = document.createElement('tr');
    
    // Time column
    const timeCell = document.createElement('td');
    timeCell.textContent = new Date(packet.captureTime).toLocaleTimeString();
    row.appendChild(timeCell);
    
    // Direction column
    const dirCell = document.createElement('td');
    dirCell.textContent = packet.direction === 'client' ? 'C→S' : 'S→C';
    dirCell.className = packet.direction === 'client' ? 'dir-client' : 'dir-server';
    row.appendChild(dirCell);
    
    // Opcode column
    const opcodeCell = document.createElement('td');
    opcodeCell.textContent = packet.opcode;
    row.appendChild(opcodeCell);
    
    // Name column
    const nameCell = document.createElement('td');
    const definition = PACKET_DEFINITIONS[packet.opcode];
    nameCell.textContent = definition ? definition.name : 'Unknown';
    row.appendChild(nameCell);
    
    // Data column
    const dataCell = document.createElement('td');
    const views = packetCapture.getPacketViews(packet);
    dataCell.textContent = views[captureView];
    dataCell.className = 'packet-data';
    row.appendChild(dataCell);
    
    tbody.insertBefore(row, tbody.firstChild);
    
    // Update packet count
    document.getElementById('packet-count').textContent = packetCapture.packets.length;
    
    // Limit displayed rows
    while (tbody.children.length > 100) {
        tbody.removeChild(tbody.lastChild);
    }
}

window.updateCaptureDisplay = updateCaptureDisplay;

function setCaptureView(view) {
    captureView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Refresh display
    refreshCaptureDisplay();
}

function refreshCaptureDisplay() {
    const tbody = document.getElementById('capture-tbody');
    tbody.innerHTML = '';
    
    if (packetCapture && packetCapture.packets.length > 0) {
        // Show last 100 packets
        const packetsToShow = packetCapture.packets.slice(-100).reverse();
        packetsToShow.forEach(packet => {
            updateCaptureDisplay(packet);
        });
    }
}

function updateCaptureFilter() {
    if (!packetCapture) return;
    
    // Get opcode filter
    const opcodeFilter = document.getElementById('opcode-filter').value;
    if (opcodeFilter) {
        const opcodes = opcodeFilter.split(',').map(o => parseInt(o.trim())).filter(o => !isNaN(o));
        packetCapture.setOpcodeFilter(opcodes);
    } else {
        packetCapture.setOpcodeFilter([]);
    }
    
    // Get direction filter
    const directionFilter = document.getElementById('direction-filter').value;
    packetCapture.setDirectionFilter(directionFilter);
}

function exportCapture() {
    if (!packetCapture || packetCapture.packets.length === 0) {
        alert('No packets to export');
        return;
    }
    
    const blob = packetCapture.exportPCAP();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsps-capture-${new Date().toISOString().replace(/[:.]/g, '-')}.pcap`;
    a.click();
    URL.revokeObjectURL(url);
}

function importPCAP(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (!packetCapture) {
            packetCapture = new PacketCapture();
        }
        
        packetCapture.importPCAP(e.target.result);
        refreshCaptureDisplay();
        document.getElementById('packet-count').textContent = packetCapture.packets.length;
    };
    reader.readAsArrayBuffer(file);
}
// Replay Engine Functions
let replayEngine = null;
let hexEditor = null;
let selectedPacketIndex = null;

// Initialize replay engine on load
document.addEventListener("DOMContentLoaded", function() {
    if (window.PacketReplayEngine) {
        replayEngine = new PacketReplayEngine();
        hexEditor = new HexEditor("hex-editor");
        
        hexEditor.onchange = function(newData) {
            if (selectedPacketIndex !== null) {
                replayEngine.modifyPacket(selectedPacketIndex, newData);
            }
        };
    }
});

function loadCaptureToReplay() {
    if (!packetCapture || !packetCapture.packets || packetCapture.packets.length === 0) {
        alert("No captured packets to load");
        return;
    }
    
    const sessionName = prompt("Session name:", `Capture ${new Date().toLocaleString()}`);
    if (!sessionName) return;
    
    replayEngine.loadFromCapture(packetCapture, sessionName);
    updateReplayUI();
}

function importSession(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            replayEngine.loadSessionFromFile(e.target.result);
            updateReplayUI();
        } catch (error) {
            alert("Failed to load session: " + error.message);
        }
    };
    reader.readAsText(file);
}

function saveReplaySession() {
    if (!replayEngine.currentSession) {
        alert("No session to save");
        return;
    }
    
    const filename = `${replayEngine.currentSession.name.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.json`;
    replayEngine.saveSession(filename);
}

function updatePlaybackSpeed(speed) {
    replayEngine.setSpeed(parseFloat(speed));
    document.getElementById("speed-display").textContent = speed + "x";
}

function seekToPacket(index) {
    replayEngine.seekToPacket(parseInt(index));
}

function updateReplayUI() {
    if (!replayEngine.currentSession) return;
    
    const session = replayEngine.currentSession;
    document.getElementById("session-name").textContent = session.name;
    document.getElementById("replay-packet-count").textContent = session.packets.length;
    document.getElementById("replay-progress").textContent = 
        `${replayEngine.currentPacketIndex + 1}/${session.packets.length}`;
    document.getElementById("modified-count").textContent = replayEngine.modifiedPackets.size;
    
    // Update seek slider
    const seekSlider = document.getElementById("packet-seek");
    seekSlider.max = session.packets.length - 1;
    seekSlider.value = replayEngine.currentPacketIndex;
    
    // Update packet list
    renderReplayPacketList();
}

window.updateReplayUI = updateReplayUI;

function renderReplayPacketList() {
    const listContainer = document.getElementById("replay-packet-list");
    listContainer.innerHTML = "";
    
    if (!replayEngine.currentSession) return;
    
    replayEngine.currentSession.packets.forEach((packet, index) => {
        const div = document.createElement("div");
        div.className = "replay-packet-item";
        
        if (index === replayEngine.currentPacketIndex) {
            div.classList.add("current");
        }
        
        if (replayEngine.modifiedPackets.has(index)) {
            div.classList.add("modified");
        }
        
        const definition = PACKET_DEFINITIONS[packet.opcode];
        const name = definition ? definition.name : "Unknown";
        
        div.innerHTML = `
            <span class="packet-index">${index}</span>
            <span class="packet-time">${(packet.timestamp / 1000).toFixed(2)}s</span>
            <span class="packet-dir ${packet.direction}">${packet.direction === "client" ? "C→S" : "S→C"}</span>
            <span class="packet-opcode">${packet.opcode}</span>
            <span class="packet-name">${name}</span>
        `;
        
        div.onclick = () => selectReplayPacket(index);
        
        listContainer.appendChild(div);
    });
    
    // Scroll current packet into view
    const currentItem = listContainer.querySelector(".current");
    if (currentItem) {
        currentItem.scrollIntoView({ block: "center", behavior: "smooth" });
    }
}

function selectReplayPacket(index) {
    selectedPacketIndex = index;
    const packet = replayEngine.currentSession.packets[index];
    
    // Update hex editor
    const modifiedData = replayEngine.modifiedPackets.get(index);
    hexEditor.setData(modifiedData || packet.data, packet.originalData);
    
    // Update UI
    document.querySelectorAll(".replay-packet-item").forEach((item, i) => {
        if (i === index) {
            item.classList.add("selected");
        } else {
            item.classList.remove("selected");
        }
    });
}

function resetCurrentPacket() {
    if (selectedPacketIndex === null) return;
    
    replayEngine.resetPacket(selectedPacketIndex);
    const packet = replayEngine.currentSession.packets[selectedPacketIndex];
    hexEditor.setData(packet.originalData, packet.originalData);
    updateReplayUI();
}

function applyModification() {
    if (selectedPacketIndex === null) return;
    
    const newData = hexEditor.getData();
    replayEngine.modifyPacket(selectedPacketIndex, newData);
    updateReplayUI();
}

// Handle replay events
window.onReplayPacket = function(packet, data, isModified) {
    // Visual feedback during replay
    const listItems = document.querySelectorAll(".replay-packet-item");
    if (listItems[packet.index]) {
        listItems[packet.index].classList.add("replaying");
        setTimeout(() => {
            listItems[packet.index].classList.remove("replaying");
        }, 500);
    }
};


// Protocol Differ Functions
let protocolDiffer = null;
let currentDiffFilter = "all";

// Initialize differ on load
document.addEventListener("DOMContentLoaded", function() {
    if (window.ProtocolDiffer) {
        protocolDiffer = new ProtocolDiffer();
        // Initial diff
        setTimeout(updateDiff, 100);
    }
});

function updateDiff() {
    const fromVersion = document.getElementById("from-version").value;
    const toVersion = document.getElementById("to-version").value;
    
    if (fromVersion === toVersion) {
        document.getElementById("diff-display").innerHTML = 
            "<p class=\"no-diff\">Select different versions to compare</p>";
        return;
    }
    
    const diff = protocolDiffer.compareVersions(fromVersion, toVersion);
    displayDiff(diff);
    updateDiffSummary(diff);
}

function displayDiff(diff) {
    const container = document.getElementById("diff-display");
    container.innerHTML = "";
    
    // Added packets
    if (diff.added.length > 0 && (currentDiffFilter === "all" || currentDiffFilter === "added")) {
        const section = createDiffSection("Added Packets", diff.added, "added");
        container.appendChild(section);
    }
    
    // Removed packets
    if (diff.removed.length > 0 && (currentDiffFilter === "all" || currentDiffFilter === "removed")) {
        const section = createDiffSection("Removed Packets", diff.removed, "removed");
        container.appendChild(section);
    }
    
    // Modified packets
    if (diff.modified.length > 0 && (currentDiffFilter === "all" || currentDiffFilter === "modified")) {
        const section = createModifiedSection(diff.modified);
        container.appendChild(section);
    }
    
    // Unchanged packets
    if (currentDiffFilter === "unchanged") {
        const section = createDiffSection("Unchanged Packets", diff.unchanged, "unchanged");
        container.appendChild(section);
    }
}

function createDiffSection(title, items, type) {
    const section = document.createElement("div");
    section.className = `diff-section ${type}`;
    
    const header = document.createElement("h3");
    header.textContent = `${title} (${items.length})`;
    section.appendChild(header);
    
    const list = document.createElement("div");
    list.className = "diff-list";
    
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "diff-item";
        
        const packet = item.packet || item.packet1;
        div.innerHTML = `
            <span class="opcode">${item.opcode}</span>
            <span class="name">${packet.name}</span>
            <span class="size">Size: ${packet.size === -1 ? "variable" : packet.size}</span>
            <span class="fields">${packet.fields.length} fields</span>
        `;
        
        list.appendChild(div);
    });
    
    section.appendChild(list);
    return section;
}

function createModifiedSection(items) {
    const section = document.createElement("div");
    section.className = "diff-section modified";
    
    const header = document.createElement("h3");
    header.textContent = `Modified Packets (${items.length})`;
    section.appendChild(header);
    
    const list = document.createElement("div");
    list.className = "diff-list";
    
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "diff-item modified";
        
        div.innerHTML = `
            <div class="diff-header">
                <span class="opcode">${item.opcode}</span>
                <span class="name">${item.packet1.name}</span>
            </div>
            <div class="diff-changes">
                ${item.changes.map(change => formatChange(change)).join("<br>")}
            </div>
        `;
        
        list.appendChild(div);
    });
    
    section.appendChild(list);
    return section;
}

function formatChange(change) {
    const icon = getChangeIcon(change.type);
    return `<span class="change ${change.type}">${icon} ${protocolDiffer.formatChange(change)}</span>`;
}

function getChangeIcon(type) {
    switch(type) {
        case "name": return "📝";
        case "size": return "📏";
        case "field_modified": return "🔄";
        case "field_added": return "➕";
        case "field_removed": return "➖";
        default: return "•";
    }
}

function updateDiffSummary(diff) {
    const summary = document.getElementById("diff-summary");
    summary.innerHTML = `
        <div class="summary-item">
            <span class="label">Version:</span>
            <span class="value">${diff.version1} → ${diff.version2}</span>
        </div>
        <div class="summary-item added">
            <span class="label">Added:</span>
            <span class="value">${diff.added.length}</span>
        </div>
        <div class="summary-item removed">
            <span class="label">Removed:</span>
            <span class="value">${diff.removed.length}</span>
        </div>
        <div class="summary-item modified">
            <span class="label">Modified:</span>
            <span class="value">${diff.modified.length}</span>
        </div>
        <div class="summary-item unchanged">
            <span class="label">Unchanged:</span>
            <span class="value">${diff.unchanged.length}</span>
        </div>
    `;
}

function filterDiff(filter) {
    currentDiffFilter = filter;
    
    // Update button states
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    event.target.classList.add("active");
    
    // Re-render diff
    updateDiff();
}

function generateMigrationGuide() {
    const fromVersion = document.getElementById("from-version").value;
    const toVersion = document.getElementById("to-version").value;
    
    if (fromVersion === toVersion) {
        alert("Select different versions to generate migration guide");
        return;
    }
    
    const guide = protocolDiffer.generateMigrationGuide(fromVersion, toVersion);
    displayMigrationGuide(guide);
}

function displayMigrationGuide(guide) {
    const container = document.getElementById("migration-guide");
    const content = document.getElementById("migration-content");
    
    content.innerHTML = `
        <h4>Migrating from ${guide.fromVersion} to ${guide.toVersion}</h4>
        
        <div class="breaking-changes">
            <h5>Breaking Changes (${guide.breakingChanges.length})</h5>
            ${guide.breakingChanges.map(change => `
                <div class="breaking-change">
                    <strong>Opcode ${change.opcode}:</strong> ${change.recommendation}
                </div>
            `).join("")}
        </div>
        
        <div class="migration-steps">
            <h5>Migration Steps</h5>
            ${guide.migrations.map(step => `
                <div class="migration-step">
                    <strong>Step ${step.step}:</strong> ${step.title}<br>
                    <small>${step.description}</small><br>
                    <code>Opcodes: ${step.opcodes.join(", ")}</code>
                </div>
            `).join("")}
        </div>
    `;
    
    container.style.display = "block";
}

function exportDiff(format) {
    const fromVersion = document.getElementById("from-version").value;
    const toVersion = document.getElementById("to-version").value;
    
    if (fromVersion === toVersion) {
        alert("Select different versions to export");
        return;
    }
    
    protocolDiffer.compareVersions(fromVersion, toVersion);
    const report = protocolDiffer.exportDiffReport(format);
    
    let filename, mimeType;
    if (format === "json") {
        filename = `protocol-diff-${fromVersion}-to-${toVersion}.json`;
        mimeType = "application/json";
    } else if (format === "markdown") {
        filename = `protocol-diff-${fromVersion}-to-${toVersion}.md`;
        mimeType = "text/markdown";
    }
    
    const blob = new Blob([report], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Encyclopedia Functions
let opcodeEncyclopedia = null;
let selectedOpcode = null;

// Initialize encyclopedia on load
document.addEventListener("DOMContentLoaded", function() {
    if (window.OpcodeEncyclopedia) {
        opcodeEncyclopedia = new OpcodeEncyclopedia();
        updateEncyclopediaStats();
        displayAllOpcodes();
    }
});

function updateEncyclopediaStats() {
    const totalOpcodes = Object.keys(opcodeEncyclopedia.opcodes).length;
    document.getElementById("total-opcodes").textContent = totalOpcodes;
    document.getElementById("documented-opcodes").textContent = totalOpcodes;
    
    const vulnCount = opcodeEncyclopedia.getVulnerabilities().length;
    document.getElementById("vuln-count").textContent = vulnCount;
}

function displayAllOpcodes() {
    const opcodes = Object.entries(opcodeEncyclopedia.opcodes)
        .map(([opcode, data]) => ({ opcode, data }));
    displayOpcodeList(opcodes);
}

function displayOpcodeList(opcodes) {
    const listContainer = document.getElementById("opcode-list");
    listContainer.innerHTML = "";
    
    opcodes.forEach(({ opcode, data }) => {
        const item = document.createElement("div");
        item.className = "opcode-item";
        
        const vulnerableClass = data.vulnerabilities && data.vulnerabilities.length > 0 ? "vulnerable" : "";
        
        item.innerHTML = `
            <div class="opcode-header ${vulnerableClass}">
                <span class="opcode-number">${opcode}</span>
                <span class="opcode-name">${data.name}</span>
                ${vulnerableClass ? "<span class=\"vuln-indicator\">⚠️</span>" : ""}
            </div>
            <div class="opcode-meta">
                <span class="category">${data.category}</span>
                <span class="direction">${data.direction}</span>
                <span class="size">Size: ${data.size === -1 ? "var" : data.size}</span>
            </div>
        `;
        
        item.onclick = () => showOpcodeDetail(opcode, data);
        listContainer.appendChild(item);
    });
}

function showOpcodeDetail(opcode, data) {
    selectedOpcode = opcode;
    const detailContainer = document.getElementById("opcode-detail");
    
    let html = `
        <div class="detail-header">
            <h3>Opcode ${opcode}: ${data.name}</h3>
            <div class="detail-actions">
                <button onclick="addCommunityNote(${opcode})">📝 Add Note</button>
                <button onclick="copyOpcodeLink(${opcode})">🔗 Copy Link</button>
            </div>
        </div>
        
        <div class="detail-info">
            <div class="info-row">
                <span class="label">Category:</span>
                <span class="value">${data.category}</span>
            </div>
            <div class="info-row">
                <span class="label">Direction:</span>
                <span class="value">${data.direction}</span>
            </div>
            <div class="info-row">
                <span class="label">Size:</span>
                <span class="value">${data.size === -1 ? "Variable" : data.size + " bytes"}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Description</h4>
            <p>${data.description}</p>
        </div>
    `;
    
    if (data.fields && data.fields.length > 0) {
        html += `
            <div class="detail-section">
                <h4>Packet Structure</h4>
                <table class="field-table">
                    <tr>
                        <th>Offset</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Modifier</th>
                        <th>Description</th>
                    </tr>
        `;
        
        let offset = 1; // Skip opcode byte
        data.fields.forEach(field => {
            const size = getFieldSize(field.type);
            html += `
                <tr>
                    <td>${offset}</td>
                    <td>${field.name}</td>
                    <td>${field.type}</td>
                    <td>${field.modifier || "-"}</td>
                    <td>${field.description}</td>
                </tr>
            `;
            offset += size;
        });
        
        html += "</table></div>";
    }
    
    if (data.notes) {
        html += `
            <div class="detail-section">
                <h4>Notes</h4>
                <p>${data.notes}</p>
            </div>
        `;
    }
    
    if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        html += `
            <div class="detail-section vulnerabilities">
                <h4>⚠️ Known Vulnerabilities</h4>
        `;
        
        data.vulnerabilities.forEach(vuln => {
            html += `
                <div class="vuln-item ${vuln.severity}">
                    <span class="vuln-severity">${vuln.severity.toUpperCase()}</span>
                    <span class="vuln-type">${vuln.type}</span>
                    <p>${vuln.description}</p>
                    <span class="vuln-status">${vuln.patched ? "✅ Patched" : "❌ Unpatched"}</span>
                </div>
            `;
        });
        
        html += "</div>";
    }
    
    if (data.examples && data.examples.length > 0) {
        html += `
            <div class="detail-section">
                <h4>Examples</h4>
        `;
        
        data.examples.forEach(example => {
            html += `
                <div class="example-item">
                    <code>${example.hex}</code>
                    <p>${example.description}</p>
                </div>
            `;
        });
        
        html += "</div>";
    }
    
    if (data.communityNotes && data.communityNotes.length > 0) {
        html += `
            <div class="detail-section community-notes">
                <h4>Community Notes</h4>
        `;
        
        data.communityNotes.forEach(note => {
            html += `
                <div class="note-item">
                    <div class="note-header">
                        <span class="note-author">${note.author}</span>
                        <span class="note-date">${new Date(note.date).toLocaleDateString()}</span>
                    </div>
                    <p>${note.text}</p>
                </div>
            `;
        });
        
        html += "</div>";
    }
    
    detailContainer.innerHTML = html;
}

function getFieldSize(type) {
    switch(type) {
        case "byte": return 1;
        case "short": return 2;
        case "int": return 4;
        case "long": return 8;
        default: return 1;
    }
}

function searchOpcodes(query) {
    if (!query) {
        displayAllOpcodes();
        return;
    }
    
    const results = opcodeEncyclopedia.search(query);
    displayOpcodeList(results);
}

function filterByCategory(category) {
    if (!category) {
        displayAllOpcodes();
        return;
    }
    
    const results = opcodeEncyclopedia.getByCategory(category);
    displayOpcodeList(results);
}

function showVulnerabilities() {
    const vulns = opcodeEncyclopedia.getVulnerabilities();
    const modal = document.getElementById("vuln-modal");
    const list = document.getElementById("vuln-list");
    
    list.innerHTML = "";
    
    vulns.forEach(({ opcode, name, vulnerability }) => {
        const item = document.createElement("div");
        item.className = `vuln-report-item ${vulnerability.severity}`;
        
        item.innerHTML = `
            <div class="vuln-report-header">
                <span class="vuln-opcode">Opcode ${opcode}: ${name}</span>
                <span class="vuln-severity">${vulnerability.severity.toUpperCase()}</span>
            </div>
            <div class="vuln-report-body">
                <p><strong>Type:</strong> ${vulnerability.type}</p>
                <p>${vulnerability.description}</p>
                <p><strong>Status:</strong> ${vulnerability.patched ? "✅ Patched" : "❌ Unpatched"}</p>
            </div>
        `;
        
        list.appendChild(item);
    });
    
    modal.style.display = "flex";
}

function closeVulnModal() {
    document.getElementById("vuln-modal").style.display = "none";
}

function addCommunityNote(opcode) {
    const author = prompt("Your name:");
    if (!author) return;
    
    const text = prompt("Your note:");
    if (!text) return;
    
    if (opcodeEncyclopedia.addCommunityNote(opcode, author, text)) {
        // Refresh detail view
        const data = opcodeEncyclopedia.opcodes[opcode];
        showOpcodeDetail(opcode, data);
    }
}

function copyOpcodeLink(opcode) {
    const url = window.location.origin + window.location.pathname + "#opcode-" + opcode;
    navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
    });
}

function exportEncyclopedia(format) {
    const data = opcodeEncyclopedia.exportDocumentation(format);
    const filename = `rsps-508-protocol-docs.${format === "json" ? "json" : "md"}`;
    const mimeType = format === "json" ? "application/json" : "text/markdown";
    
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Byte Visualizer Functions
let byteVisualizer = null;
let lastDecodedPacket = null;

// Initialize visualizer on load
document.addEventListener("DOMContentLoaded", function() {
    if (window.ByteStructureVisualizer) {
        byteVisualizer = new ByteStructureVisualizer("byte-visualizer");
    }
});

function visualizeLastPacket() {
    if (!lastDecodedPacket) return;
    
    const visualizerSection = document.getElementById("byte-visualizer");
    visualizerSection.style.display = "block";
    
    byteVisualizer.visualizePacket(
        lastDecodedPacket.hex,
        lastDecodedPacket.definition
    );
    
    // Scroll to visualizer
    visualizerSection.scrollIntoView({ behavior: "smooth" });
}

// Update the decode function to save last packet
const originalDecodePacket = window.decodePacket;
window.decodePacket = function() {
    const hexInput = document.getElementById("hex-input").value;
    const cleanHex = hexInput.replace(/[^0-9a-fA-F]/g, "");
    
    if (cleanHex.length < 2) {
        alert("Please enter a valid hex packet");
        return;
    }
    
    // Decode the packet
    originalDecodePacket();
    
    // Save for visualization
    const opcode = parseInt(cleanHex.substr(0, 2), 16);
    lastDecodedPacket = {
        hex: hexInput,
        opcode: opcode,
        definition: PACKET_DEFINITIONS[opcode]
    };
    
    // Show visualize button
    document.getElementById("visualize-btn").style.display = "inline-block";
};

// Protocol Fuzzer Functions
let protocolFuzzer = null;
let currentFuzzFilter = "all";

// Initialize fuzzer on load
document.addEventListener("DOMContentLoaded", function() {
    if (window.ProtocolFuzzer) {
        protocolFuzzer = new ProtocolFuzzer();
        populateFuzzerOpcodes();
    }
});

function populateFuzzerOpcodes() {
    const select = document.getElementById("fuzz-opcode");
    if (!select) return;
    
    Object.entries(PACKET_DEFINITIONS).forEach(([opcode, def]) => {
        const option = document.createElement("option");
        option.value = opcode;
        option.textContent = `${opcode} - ${def.name}`;
        select.appendChild(option);
    });
}

function updateFuzzerFields() {
    const opcode = document.getElementById("fuzz-opcode").value;
    if (!opcode) return;
    
    const definition = PACKET_DEFINITIONS[opcode];
    // Could show field information here if needed
}

function generateFuzzTests() {
    const opcode = document.getElementById("fuzz-opcode").value;
    const strategy = document.getElementById("fuzz-strategy").value;
    
    if (!opcode) {
        alert("Please select an opcode to fuzz");
        return;
    }
    
    const definition = PACKET_DEFINITIONS[opcode];
    protocolFuzzer.generateFuzzCases(definition, strategy);
    
    displayTestCases();
    updateFuzzStats();
}

function loadRegressionTests() {
    const regressionTests = protocolFuzzer.generateRegressionTests();
    protocolFuzzer.testCases = regressionTests;
    
    displayTestCases();
    updateFuzzStats();
}

function displayTestCases() {
    const container = document.getElementById("test-cases-list");
    container.innerHTML = "";
    
    protocolFuzzer.testCases.forEach((testCase, index) => {
        const div = document.createElement("div");
        div.className = "test-case-item";
        
        const hex = testCase.packet.map(b => b.toString(16).padStart(2, "0")).join(" ");
        
        div.innerHTML = `
            <div class="test-case-header">
                <span class="test-index">#${index + 1}</span>
                <span class="test-name">${testCase.name}</span>
                <span class="test-strategy">${testCase.strategy}</span>
            </div>
            <div class="test-case-body">
                <div class="test-description">${testCase.description}</div>
                <div class="test-packet">Packet: <code>${hex}</code></div>
                <div class="test-size">Size: ${testCase.packet.length} bytes</div>
            </div>
        `;
        
        container.appendChild(div);
    });
}

function updateFuzzStats() {
    document.getElementById("fuzz-case-count").textContent = protocolFuzzer.testCases.length;
    document.getElementById("fuzz-progress").textContent = 
        `${protocolFuzzer.currentTest}/${protocolFuzzer.testCases.length}`;
}

function startFuzzing() {
    if (protocolFuzzer.testCases.length === 0) {
        alert("No test cases generated");
        return;
    }
    
    document.getElementById("start-fuzz-btn").disabled = true;
    document.getElementById("stop-fuzz-btn").disabled = false;
    
    protocolFuzzer.runTests(
        (current, total, result) => {
            // Progress callback
            updateFuzzProgress(current, total, result);
        },
        (results) => {
            // Complete callback
            onFuzzingComplete(results);
        }
    );
}

function stopFuzzing() {
    protocolFuzzer.stopTests();
    document.getElementById("start-fuzz-btn").disabled = false;
    document.getElementById("stop-fuzz-btn").disabled = true;
}

function updateFuzzProgress(current, total, result) {
    document.getElementById("fuzz-progress").textContent = `${current}/${total}`;
    
    // Add result to display
    addFuzzResult(result);
    
    // Update vulnerability count
    const vulnCount = protocolFuzzer.results.filter(r => r.vulnerability).length;
    document.getElementById("fuzz-vuln-count").textContent = vulnCount;
}

function addFuzzResult(result) {
    const container = document.getElementById("fuzz-results");
    const div = document.createElement("div");
    
    let statusClass = "success";
    if (result.error) statusClass = "error";
    if (result.vulnerability) statusClass = "vulnerability";
    
    div.className = `fuzz-result-item ${statusClass}`;
    div.dataset.status = statusClass;
    
    const hex = result.testCase.packet.map(b => b.toString(16).padStart(2, "0")).join(" ");
    
    div.innerHTML = `
        <div class="result-header">
            <span class="result-test">${result.testCase.name}</span>
            <span class="result-status ${statusClass}">${statusClass.toUpperCase()}</span>
        </div>
        <div class="result-body">
            <div>Packet: <code>${hex}</code></div>
            ${result.error ? `<div class="error-msg">Error: ${result.error}</div>` : ""}
            ${result.vulnerability ? `
                <div class="vuln-info">
                    <strong>Vulnerability Found!</strong>
                    <span class="vuln-type">${result.vulnerability.type}</span>
                    <span class="vuln-severity">${result.vulnerability.severity}</span>
                    <p>${result.vulnerability.description}</p>
                </div>
            ` : ""}
        </div>
    `;
    
    container.insertBefore(div, container.firstChild);
    
    // Apply filter
    if (currentFuzzFilter !== "all" && statusClass !== currentFuzzFilter) {
        div.style.display = "none";
    }
}

function onFuzzingComplete(results) {
    document.getElementById("start-fuzz-btn").disabled = false;
    document.getElementById("stop-fuzz-btn").disabled = true;
    
    // Summary
    const vulnerabilities = results.filter(r => r.vulnerability);
    const errors = results.filter(r => r.error && !r.vulnerability);
    
    if (vulnerabilities.length > 0) {
        alert(`Fuzzing complete! Found ${vulnerabilities.length} potential vulnerabilities.`);
    } else {
        alert(`Fuzzing complete. No vulnerabilities found in ${results.length} tests.`);
    }
}

function clearFuzzResults() {
    document.getElementById("fuzz-results").innerHTML = "";
    document.getElementById("fuzz-vuln-count").textContent = "0";
    protocolFuzzer.results = [];
}

function filterFuzzResults(filter) {
    currentFuzzFilter = filter;
    
    // Update button states
    document.querySelectorAll(".result-filter").forEach(btn => {
        btn.classList.remove("active");
    });
    event.target.classList.add("active");
    
    // Filter results
    const items = document.querySelectorAll(".fuzz-result-item");
    items.forEach(item => {
        if (filter === "all" || item.dataset.status === filter) {
            item.style.display = "block";
        } else {
            item.style.display = "none";
        }
    });
}

function exportFuzzResults() {
    if (protocolFuzzer.results.length === 0) {
        alert("No results to export");
        return;
    }
    
    const format = confirm("Export as CSV? (Cancel for JSON)") ? "csv" : "json";
    const data = protocolFuzzer.exportResults(format);
    const extension = format === "csv" ? "csv" : "json";
    const mimeType = format === "csv" ? "text/csv" : "application/json";
    
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuzz-results-${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
}

// Packet Flow Diagram Functions
let packetFlow = null;
let customNodes = [];
let customEdges = [];

// Initialize flow diagram on load
document.addEventListener("DOMContentLoaded", function() {
    if (window.PacketFlowDiagram) {
        packetFlow = new PacketFlowDiagram("flow-diagram");
    }
});

function renderSelectedFlow() {
    const flowName = document.getElementById("flow-select").value;
    if (!flowName || !packetFlow) return;
    
    packetFlow.renderFlow(flowName);
}

function showFlowBuilder() {
    document.getElementById("flow-builder-modal").style.display = "flex";
    customNodes = [];
    customEdges = [];
    updateFlowBuilder();
}

function closeFlowBuilder() {
    document.getElementById("flow-builder-modal").style.display = "none";
}

function addFlowNode() {
    const nodeId = `node_${customNodes.length + 1}`;
    const node = {
        id: nodeId,
        label: `Node ${customNodes.length + 1}`,
        type: "process"
    };
    
    customNodes.push(node);
    updateFlowBuilder();
}

function addFlowEdge() {
    if (customNodes.length < 2) {
        alert("Add at least 2 nodes first");
        return;
    }
    
    const edge = {
        source: customNodes[0].id,
        target: customNodes[1].id
    };
    
    customEdges.push(edge);
    updateFlowBuilder();
}

function updateFlowBuilder() {
    // Update nodes list
    const nodesList = document.getElementById("flow-nodes-list");
    nodesList.innerHTML = "";
    
    customNodes.forEach((node, index) => {
        const div = document.createElement("div");
        div.className = "builder-node";
        div.innerHTML = `
            <input type="text" value="${node.label}" onchange="updateNodeLabel(${index}, this.value)">
            <select onchange="updateNodeType(${index}, this.value)">
                <option value="start" ${node.type === "start" ? "selected" : ""}>Start</option>
                <option value="process" ${node.type === "process" ? "selected" : ""}>Process</option>
                <option value="client" ${node.type === "client" ? "selected" : ""}>Client</option>
                <option value="server" ${node.type === "server" ? "selected" : ""}>Server</option>
                <option value="decision" ${node.type === "decision" ? "selected" : ""}>Decision</option>
                <option value="end" ${node.type === "end" ? "selected" : ""}>End</option>
            </select>
            <button onclick="removeNode(${index})">×</button>
        `;
        nodesList.appendChild(div);
    });
    
    // Update edges list
    const edgesList = document.getElementById("flow-edges-list");
    edgesList.innerHTML = "";
    
    customEdges.forEach((edge, index) => {
        const div = document.createElement("div");
        div.className = "builder-edge";
        div.innerHTML = `
            <select onchange="updateEdgeSource(${index}, this.value)">
                ${customNodes.map(n => 
                    `<option value="${n.id}" ${edge.source === n.id ? "selected" : ""}>${n.label}</option>`
                ).join("")}
            </select>
            →
            <select onchange="updateEdgeTarget(${index}, this.value)">
                ${customNodes.map(n => 
                    `<option value="${n.id}" ${edge.target === n.id ? "selected" : ""}>${n.label}</option>`
                ).join("")}
            </select>
            <button onclick="removeEdge(${index})">×</button>
        `;
        edgesList.appendChild(div);
    });
}

function updateNodeLabel(index, label) {
    customNodes[index].label = label;
}

function updateNodeType(index, type) {
    customNodes[index].type = type;
}

function removeNode(index) {
    const nodeId = customNodes[index].id;
    customNodes.splice(index, 1);
    
    // Remove edges connected to this node
    customEdges = customEdges.filter(e => e.source !== nodeId && e.target !== nodeId);
    
    updateFlowBuilder();
}

function updateEdgeSource(index, source) {
    customEdges[index].source = source;
}

function updateEdgeTarget(index, target) {
    customEdges[index].target = target;
}

function removeEdge(index) {
    customEdges.splice(index, 1);
    updateFlowBuilder();
}

function saveCustomFlow() {
    const name = document.getElementById("flow-name").value;
    const description = document.getElementById("flow-description").value;
    
    if (!name) {
        alert("Please enter a flow name");
        return;
    }
    
    if (customNodes.length === 0) {
        alert("Add at least one node");
        return;
    }
    
    // Add custom flow to flow diagram
    packetFlow.addCustomFlow(name, description, customNodes, customEdges);
    
    // Add to select dropdown
    const select = document.getElementById("flow-select");
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name + " (Custom)";
    select.appendChild(option);
    
    // Close modal and render new flow
    closeFlowBuilder();
    select.value = name;
    renderSelectedFlow();
}

// Bot Generator Functions
let botGenerator = null;
let generatedScript = "";

// Initialize bot generator on load
document.addEventListener("DOMContentLoaded", function() {
    if (window.BotScriptGenerator) {
        botGenerator = new BotScriptGenerator();
    }
    
    // Handle source radio buttons
    document.querySelectorAll("input[name=\"bot-source\"]").forEach(radio => {
        radio.addEventListener("change", (e) => {
            document.getElementById("manual-packets").style.display = 
                e.target.value === "manual" ? "block" : "none";
        });
    });
});

function generateBotScript() {
    if (!botGenerator) return;
    
    const source = document.querySelector("input[name=\"bot-source\"]:checked").value;
    const language = document.getElementById("bot-language").value;
    
    const options = {
        includeLogin: document.getElementById("bot-include-login").checked,
        includeLoop: document.getElementById("bot-include-loop").checked,
        includeComments: document.getElementById("bot-include-comments").checked,
        rateLimit: parseInt(document.getElementById("bot-rate-limit").value)
    };
    
    let packets = [];
    
    if (source === "capture") {
        // Get packets from capture
        if (!packetCapture || !packetCapture.packets || packetCapture.packets.length === 0) {
            alert("No captured packets available. Capture some packets first.");
            return;
        }
        packets = packetCapture.packets;
    } else {
        // Parse manual input
        const input = document.getElementById("bot-packets-input").value;
        packets = parseManualPackets(input);
        
        if (packets.length === 0) {
            alert("No valid packets found in manual input");
            return;
        }
    }
    
    try {
        if (source === "capture") {
            generatedScript = botGenerator.generateFromCapture(packets, language, options);
        } else {
            generatedScript = botGenerator.generateScript(packets, language, options);
        }
        
        displayBotScript(generatedScript, language);
    } catch (error) {
        alert("Error generating script: " + error.message);
    }
}

function parseManualPackets(input) {
    const lines = input.trim().split("\\n");
    const packets = [];
    
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine) {
            const hex = cleanLine.replace(/[^0-9a-fA-F]/g, "");
            if (hex.length >= 2) {
                const data = [];
                for (let i = 0; i < hex.length; i += 2) {
                    data.push(parseInt(hex.substr(i, 2), 16));
                }
                packets.push({ data: new Uint8Array(data) });
            }
        }
    });
    
    return packets;
}

function displayBotScript(script, language) {
    const output = document.getElementById("bot-script-output");
    
    // Add syntax highlighting class based on language
    output.className = `language-${language}`;
    output.textContent = script;
    
    // Enable action buttons
    document.getElementById("copy-bot-btn").disabled = false;
    document.getElementById("download-bot-btn").disabled = false;
    
    // Try to apply syntax highlighting if Prism.js is available
    if (window.Prism) {
        Prism.highlightElement(output);
    }
}

function copyBotScript() {
    if (!generatedScript) return;
    
    navigator.clipboard.writeText(generatedScript).then(() => {
        const btn = document.getElementById("copy-bot-btn");
        const originalText = btn.textContent;
        btn.textContent = "✅ Copied!";
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

function downloadBotScript() {
    if (!generatedScript || !botGenerator) return;
    
    const language = document.getElementById("bot-language").value;
    botGenerator.exportScript(generatedScript, language);
}

function loadBotTemplate(template) {
    const templates = {
        autofighter: {
            packets: [
                "83 00 64", // NPC Option 1 (Attack)
                "A4 81 12 34 56", // Walk
                "83 00 65", // Attack another NPC
            ],
            description: "Basic auto fighter that attacks NPCs"
        },
        woodcutter: {
            packets: [
                "A4 81 20 30 40", // Walk to tree
                "98 00 0A", // Object Option 1 (Chop)
                "A4 81 25 35 45", // Walk to bank
                "75 00 01 00 1C", // Item Drop (logs)
            ],
            description: "Woodcutting bot that chops and banks"
        },
        walker: {
            packets: [
                "A4 81 10 20 30", // Walk waypoint 1
                "A4 81 15 25 35", // Walk waypoint 2
                "A4 81 20 30 40", // Walk waypoint 3
                "62 80 81 82", // Walk on command
            ],
            description: "Path walking bot"
        },
        trader: {
            packets: [
                "8B 00 01", // Trade request
                "91 00 01 00 63 00 05", // Add item to trade
                "4C", // Accept trade
            ],
            description: "Automated trading bot"
        }
    };
    
    const tmpl = templates[template];
    if (!tmpl) return;
    
    // Switch to manual mode
    document.querySelector("input[name=\"bot-source\"][value=\"manual\"]").checked = true;
    document.getElementById("manual-packets").style.display = "block";
    
    // Load template packets
    document.getElementById("bot-packets-input").value = tmpl.packets.join("\\n");
    
    // Show description
    alert(`Template loaded: ${tmpl.description}`);
}

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
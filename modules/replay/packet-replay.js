// Packet Replay Engine with Modification
// Features: load sessions, inline hex editor, timing control, save modified sessions

class PacketReplayEngine {
    constructor() {
        this.sessions = [];
        this.currentSession = null;
        this.isPlaying = false;
        this.playbackSpeed = 1.0;
        this.currentPacketIndex = 0;
        this.playbackTimer = null;
        this.modifiedPackets = new Map(); // Track modifications
    }

    loadSession(packets, name = 'Unnamed Session') {
        const session = {
            id: Date.now(),
            name: name,
            packets: packets.map((pkt, idx) => ({
                ...pkt,
                index: idx,
                originalData: new Uint8Array(pkt.data) // Keep original for comparison
            })),
            createdAt: new Date().toISOString()
        };
        
        this.sessions.push(session);
        this.currentSession = session;
        this.currentPacketIndex = 0;
        return session;
    }

    loadFromCapture(packetCapture, name) {
        if (!packetCapture || !packetCapture.packets || packetCapture.packets.length === 0) {
            throw new Error('No packets to load');
        }
        
        return this.loadSession(packetCapture.packets, name);
    }

    play() {
        if (!this.currentSession || this.currentSession.packets.length === 0) {
            console.error('No session loaded');
            return;
        }

        this.isPlaying = true;
        this.scheduleNextPacket();
    }

    pause() {
        this.isPlaying = false;
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
    }

    stop() {
        this.pause();
        this.currentPacketIndex = 0;
        this.updateReplayDisplay();
    }

    setSpeed(speed) {
        this.playbackSpeed = Math.max(0.1, Math.min(10, speed));
    }

    scheduleNextPacket() {
        if (!this.isPlaying || this.currentPacketIndex >= this.currentSession.packets.length) {
            this.stop();
            return;
        }

        const packet = this.currentSession.packets[this.currentPacketIndex];
        const nextPacket = this.currentSession.packets[this.currentPacketIndex + 1];
        
        // Send current packet
        this.sendPacket(packet);
        
        // Calculate delay to next packet
        let delay = 100; // Default 100ms between packets
        if (nextPacket && packet.timestamp && nextPacket.timestamp) {
            delay = (nextPacket.timestamp - packet.timestamp) / this.playbackSpeed;
        }
        
        this.currentPacketIndex++;
        this.updateReplayDisplay();
        
        // Schedule next packet
        if (this.currentPacketIndex < this.currentSession.packets.length) {
            this.playbackTimer = setTimeout(() => this.scheduleNextPacket(), delay);
        }
    }

    sendPacket(packet) {
        // Check if packet has been modified
        const modifiedData = this.modifiedPackets.get(packet.index);
        const dataToSend = modifiedData || packet.data;
        
        // In a real implementation, this would send to the server
        console.log('Replaying packet:', {
            opcode: packet.opcode,
            direction: packet.direction,
            data: Array.from(dataToSend).map(b => b.toString(16).padStart(2, '0')).join(' '),
            modified: !!modifiedData
        });
        
        // Trigger UI update
        if (window.onReplayPacket) {
            window.onReplayPacket(packet, dataToSend, !!modifiedData);
        }
    }

    modifyPacket(packetIndex, newData) {
        if (!this.currentSession) return;
        
        const packet = this.currentSession.packets[packetIndex];
        if (!packet) return;
        
        // Store modification
        this.modifiedPackets.set(packetIndex, new Uint8Array(newData));
        
        // Update display
        this.updateReplayDisplay();
    }

    resetPacket(packetIndex) {
        this.modifiedPackets.delete(packetIndex);
        this.updateReplayDisplay();
    }

    exportModifiedSession() {
        if (!this.currentSession) return null;
        
        const modifiedSession = {
            ...this.currentSession,
            packets: this.currentSession.packets.map(pkt => {
                const modifiedData = this.modifiedPackets.get(pkt.index);
                return {
                    ...pkt,
                    data: modifiedData || pkt.data,
                    modified: !!modifiedData
                };
            }),
            exportedAt: new Date().toISOString(),
            modifications: this.modifiedPackets.size
        };
        
        return modifiedSession;
    }

    saveSession(filename) {
        const session = this.exportModifiedSession();
        if (!session) return;
        
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `replay-session-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    loadSessionFromFile(jsonData) {
        try {
            const session = JSON.parse(jsonData);
            
            // Convert data arrays back to Uint8Array
            session.packets = session.packets.map(pkt => ({
                ...pkt,
                data: new Uint8Array(pkt.data),
                originalData: new Uint8Array(pkt.originalData || pkt.data)
            }));
            
            this.sessions.push(session);
            this.currentSession = session;
            
            // Restore modifications if any
            if (session.packets.some(p => p.modified)) {
                session.packets.forEach((pkt, idx) => {
                    if (pkt.modified) {
                        this.modifiedPackets.set(idx, pkt.data);
                    }
                });
            }
            
            return session;
        } catch (e) {
            throw new Error('Invalid session file: ' + e.message);
        }
    }

    seekToPacket(index) {
        if (!this.currentSession) return;
        
        this.currentPacketIndex = Math.max(0, Math.min(index, this.currentSession.packets.length - 1));
        this.updateReplayDisplay();
    }

    updateReplayDisplay() {
        if (window.updateReplayUI) {
            window.updateReplayUI(this);
        }
    }
}

// Inline Hex Editor component
class HexEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = null;
        this.originalData = null;
        this.onchange = null;
    }

    setData(data, originalData = null) {
        this.data = new Uint8Array(data);
        this.originalData = originalData ? new Uint8Array(originalData) : new Uint8Array(data);
        this.render();
    }

    render() {
        if (!this.container || !this.data) return;
        
        this.container.innerHTML = '';
        
        const table = document.createElement('table');
        table.className = 'hex-editor-table';
        
        // Header
        const header = document.createElement('tr');
        header.innerHTML = '<th>Offset</th><th colspan="16">Hex</th><th>ASCII</th>';
        table.appendChild(header);
        
        // Data rows
        for (let offset = 0; offset < this.data.length; offset += 16) {
            const row = document.createElement('tr');
            
            // Offset column
            const offsetCell = document.createElement('td');
            offsetCell.className = 'hex-offset';
            offsetCell.textContent = offset.toString(16).padStart(4, '0');
            row.appendChild(offsetCell);
            
            // Hex columns
            for (let i = 0; i < 16; i++) {
                const cell = document.createElement('td');
                cell.className = 'hex-byte';
                
                if (offset + i < this.data.length) {
                    const byteValue = this.data[offset + i];
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = byteValue.toString(16).padStart(2, '0');
                    input.maxLength = 2;
                    input.className = 'hex-input';
                    
                    // Highlight modified bytes
                    if (this.originalData && byteValue !== this.originalData[offset + i]) {
                        input.classList.add('modified');
                    }
                    
                    const byteIndex = offset + i;
                    input.addEventListener('change', (e) => this.handleByteChange(byteIndex, e.target.value));
                    input.addEventListener('keydown', (e) => this.handleKeyNavigation(e, byteIndex));
                    
                    cell.appendChild(input);
                }
                
                row.appendChild(cell);
            }
            
            // ASCII column
            const asciiCell = document.createElement('td');
            asciiCell.className = 'hex-ascii';
            let ascii = '';
            for (let i = 0; i < 16 && offset + i < this.data.length; i++) {
                const byte = this.data[offset + i];
                ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
            }
            asciiCell.textContent = ascii;
            row.appendChild(asciiCell);
            
            table.appendChild(row);
        }
        
        this.container.appendChild(table);
    }

    handleByteChange(index, value) {
        const newValue = parseInt(value, 16);
        if (!isNaN(newValue) && newValue >= 0 && newValue <= 255) {
            this.data[index] = newValue;
            
            if (this.onchange) {
                this.onchange(this.data);
            }
            
            // Re-render to update ASCII display
            this.render();
        }
    }

    handleKeyNavigation(e, currentIndex) {
        let targetIndex = null;
        
        switch(e.key) {
            case 'ArrowLeft':
                targetIndex = currentIndex - 1;
                break;
            case 'ArrowRight':
                targetIndex = currentIndex + 1;
                break;
            case 'ArrowUp':
                targetIndex = currentIndex - 16;
                break;
            case 'ArrowDown':
                targetIndex = currentIndex + 16;
                break;
        }
        
        if (targetIndex !== null && targetIndex >= 0 && targetIndex < this.data.length) {
            e.preventDefault();
            const inputs = this.container.querySelectorAll('.hex-input');
            inputs[targetIndex].focus();
            inputs[targetIndex].select();
        }
    }

    getData() {
        return this.data;
    }

    reset() {
        if (this.originalData) {
            this.data = new Uint8Array(this.originalData);
            this.render();
        }
    }
}

// Export for use
window.PacketReplayEngine = PacketReplayEngine;
window.HexEditor = HexEditor;
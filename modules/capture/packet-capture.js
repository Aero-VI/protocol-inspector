// Live Packet Capture Integration for Protocol Inspector
// Features: proxy mode, pcap import/export, opcode filtering, hex/ASCII/interpreted view

class PacketCapture {
    constructor() {
        this.packets = [];
        this.isCapturing = false;
        this.filters = {
            opcodes: [],
            direction: 'both' // 'client', 'server', 'both'
        };
        this.maxPackets = 10000;
        this.captureStartTime = null;
    }

    startCapture() {
        this.isCapturing = true;
        this.captureStartTime = Date.now();
        this.packets = [];
    }

    stopCapture() {
        this.isCapturing = false;
    }

    addPacket(packet) {
        if (!this.isCapturing) return;
        
        // Apply opcode filter
        if (this.filters.opcodes.length > 0 && !this.filters.opcodes.includes(packet.opcode)) {
            return;
        }
        
        // Apply direction filter
        if (this.filters.direction !== 'both' && this.filters.direction !== packet.direction) {
            return;
        }
        
        // Add timestamp
        packet.timestamp = Date.now() - this.captureStartTime;
        packet.captureTime = new Date().toISOString();
        
        this.packets.push(packet);
        
        // Limit packet storage
        if (this.packets.length > this.maxPackets) {
            this.packets.shift();
        }
        
        // Trigger UI update
        if (window.updateCaptureDisplay) {
            window.updateCaptureDisplay(packet);
        }
    }

    setOpcodeFilter(opcodes) {
        this.filters.opcodes = opcodes;
    }

    setDirectionFilter(direction) {
        this.filters.direction = direction;
    }

    exportPCAP() {
        // Simple PCAP format export
        const pcapHeader = new ArrayBuffer(24);
        const view = new DataView(pcapHeader);
        
        // Magic number
        view.setUint32(0, 0xa1b2c3d4, false);
        // Version
        view.setUint16(4, 2, false);
        view.setUint16(6, 4, false);
        // Timestamp stuff
        view.setInt32(8, 0, false);
        view.setUint32(12, 0, false);
        // Snaplen
        view.setUint32(16, 65535, false);
        // Link type (147 = user-defined)
        view.setUint32(20, 147, false);
        
        const packets = [pcapHeader];
        
        this.packets.forEach(pkt => {
            const packetHeader = new ArrayBuffer(16);
            const headerView = new DataView(packetHeader);
            
            const ts = Math.floor(pkt.timestamp / 1000);
            const tsMicros = (pkt.timestamp % 1000) * 1000;
            
            headerView.setUint32(0, ts, false);
            headerView.setUint32(4, tsMicros, false);
            headerView.setUint32(8, pkt.data.length, false);
            headerView.setUint32(12, pkt.data.length, false);
            
            packets.push(packetHeader);
            packets.push(pkt.data);
        });
        
        return new Blob(packets);
    }

    importPCAP(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        let offset = 24; // Skip PCAP header
        
        this.packets = [];
        
        while (offset < arrayBuffer.byteLength) {
            const ts = view.getUint32(offset, false);
            const tsMicros = view.getUint32(offset + 4, false);
            const inclLen = view.getUint32(offset + 8, false);
            
            offset += 16; // Skip packet header
            
            const packetData = new Uint8Array(arrayBuffer, offset, inclLen);
            
            this.packets.push({
                timestamp: ts * 1000 + Math.floor(tsMicros / 1000),
                data: packetData,
                opcode: packetData[0],
                direction: 'imported',
                hex: Array.from(packetData).map(b => b.toString(16).padStart(2, '0')).join(' ')
            });
            
            offset += inclLen;
        }
    }

    getPacketViews(packet) {
        const views = {
            hex: '',
            ascii: '',
            interpreted: ''
        };
        
        // Hex view
        views.hex = Array.from(packet.data).map(b => b.toString(16).padStart(2, '0')).join(' ');
        
        // ASCII view
        views.ascii = Array.from(packet.data).map(b => {
            return (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        }).join('');
        
        // Interpreted view
        const definition = PACKET_DEFINITIONS[packet.opcode];
        if (definition) {
            views.interpreted = this.interpretPacket(packet.data, definition);
        } else {
            views.interpreted = 'Unknown opcode: ' + packet.opcode;
        }
        
        return views;
    }

    interpretPacket(data, definition) {
        let interpretation = `${definition.name} (Opcode ${data[0]})\n`;
        let offset = 1;
        
        definition.fields.forEach(field => {
            const value = this.readField(data, offset, field);
            interpretation += `  ${field.name}: ${value.value}\n`;
            offset += value.size;
        });
        
        return interpretation;
    }

    readField(data, offset, field) {
        let value, size;
        
        switch(field.type) {
            case 'byte':
                value = data[offset];
                size = 1;
                break;
            case 'short':
                value = (data[offset] << 8) | data[offset + 1];
                size = 2;
                break;
            case 'int':
                value = (data[offset] << 24) | (data[offset + 1] << 16) | 
                        (data[offset + 2] << 8) | data[offset + 3];
                size = 4;
                break;
            case 'string':
                // Read until null byte
                let str = '';
                size = 0;
                while (data[offset + size] !== 0 && offset + size < data.length) {
                    str += String.fromCharCode(data[offset + size]);
                    size++;
                }
                value = str;
                size++; // Include null terminator
                break;
            default:
                value = 'Unknown type';
                size = 1;
        }
        
        // Apply modifiers
        if (field.modifier) {
            value = this.applyModifier(value, field.modifier, field.type);
        }
        
        return { value, size };
    }

    applyModifier(value, modifier, type) {
        switch(modifier) {
            case 'A':
                return value + 128;
            case 'C':
                return -value;
            case 'S':
                return 128 - value;
            default:
                return value;
        }
    }

    clear() {
        this.packets = [];
    }
}

// WebSocket proxy implementation
class PacketProxy {
    constructor(targetHost, targetPort) {
        this.targetHost = targetHost;
        this.targetPort = targetPort;
        this.clients = new Set();
        this.capture = new PacketCapture();
    }

    start(proxyPort = 43595) {
        // This would require a Node.js backend for actual TCP proxying
        // For browser implementation, we'll use WebSocket
        console.log(`Proxy would start on port ${proxyPort}, forwarding to ${this.targetHost}:${this.targetPort}`);
        
        // Simulated WebSocket connection for demonstration
        this.simulateProxyCapture();
    }

    simulateProxyCapture() {
        // Simulate some packet captures
        const samplePackets = [
            { opcode: 164, direction: 'client', data: new Uint8Array([164, 0x81, 0x12, 0x34, 0x56]) }, // Walk
            { opcode: 4, direction: 'client', data: new Uint8Array([4, 0x80, 0x81, 5, 72, 101, 108, 108, 111]) }, // Chat
            { opcode: 73, direction: 'server', data: new Uint8Array([73, 0x00, 0x10, 0x20]) } // Server packet
        ];
        
        samplePackets.forEach((pkt, i) => {
            setTimeout(() => {
                this.capture.addPacket(pkt);
            }, i * 1000);
        });
    }
}

// Export for use in main app
window.PacketCapture = PacketCapture;
window.PacketProxy = PacketProxy;
// Byte Structure Visualizer
// Packet anatomy breakdown, data type annotations, bit field editor, endianness toggle

class ByteStructureVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.packet = null;
        this.definition = null;
        this.endianness = 'big'; // big-endian by default
        this.bitMode = false;
        this.selectedByte = null;
    }

    visualizePacket(hexData, opcodeDefinition) {
        this.packet = this.parseHexData(hexData);
        this.definition = opcodeDefinition;
        this.render();
    }

    parseHexData(hexString) {
        const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');
        const bytes = [];
        
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes.push(parseInt(cleanHex.substr(i, 2), 16));
        }
        
        return new Uint8Array(bytes);
    }

    render() {
        if (!this.container || !this.packet) return;
        
        this.container.innerHTML = '';
        
        // Controls
        const controls = document.createElement('div');
        controls.className = 'visualizer-controls';
        controls.innerHTML = `
            <button onclick="byteVisualizer.toggleEndianness()" class="control-btn">
                Endianness: ${this.endianness === 'big' ? 'Big-Endian' : 'Little-Endian'}
            </button>
            <button onclick="byteVisualizer.toggleBitMode()" class="control-btn ${this.bitMode ? 'active' : ''}">
                Bit View
            </button>
            <button onclick="byteVisualizer.exportStructure()">Export Structure</button>
        `;
        this.container.appendChild(controls);
        
        // Packet Overview
        const overview = document.createElement('div');
        overview.className = 'packet-overview';
        overview.innerHTML = `
            <div class="overview-item">
                <span class="label">Total Size:</span>
                <span class="value">${this.packet.length} bytes</span>
            </div>
            <div class="overview-item">
                <span class="label">Opcode:</span>
                <span class="value">${this.packet[0]} (0x${this.packet[0].toString(16).padStart(2, '0')})</span>
            </div>
            ${this.definition ? `
                <div class="overview-item">
                    <span class="label">Packet Type:</span>
                    <span class="value">${this.definition.name}</span>
                </div>
            ` : ''}
        `;
        this.container.appendChild(overview);
        
        // Main visualization
        const visualContainer = document.createElement('div');
        visualContainer.className = 'visualization-container';
        
        if (this.bitMode) {
            visualContainer.appendChild(this.renderBitView());
        } else {
            visualContainer.appendChild(this.renderByteView());
        }
        
        this.container.appendChild(visualContainer);
        
        // Detail panel
        const detailPanel = document.createElement('div');
        detailPanel.className = 'detail-panel';
        detailPanel.id = 'byte-detail-panel';
        detailPanel.innerHTML = '<div class="detail-placeholder">Click on a byte for details</div>';
        this.container.appendChild(detailPanel);
    }

    renderByteView() {
        const byteGrid = document.createElement('div');
        byteGrid.className = 'byte-grid';
        
        // Header
        const header = document.createElement('div');
        header.className = 'byte-row header';
        header.innerHTML = '<div class="offset-col">Offset</div>';
        
        for (let i = 0; i < 16; i++) {
            const col = document.createElement('div');
            col.className = 'byte-col';
            col.textContent = i.toString(16).toUpperCase();
            header.appendChild(col);
        }
        header.innerHTML += '<div class="ascii-col">ASCII</div>';
        byteGrid.appendChild(header);
        
        // Data rows
        for (let offset = 0; offset < this.packet.length; offset += 16) {
            const row = document.createElement('div');
            row.className = 'byte-row';
            
            // Offset
            const offsetCol = document.createElement('div');
            offsetCol.className = 'offset-col';
            offsetCol.textContent = offset.toString(16).padStart(4, '0').toUpperCase();
            row.appendChild(offsetCol);
            
            // Hex bytes
            let ascii = '';
            for (let i = 0; i < 16; i++) {
                const byteIndex = offset + i;
                const byteCol = document.createElement('div');
                byteCol.className = 'byte-col';
                
                if (byteIndex < this.packet.length) {
                    const byte = this.packet[byteIndex];
                    const byteElement = document.createElement('span');
                    byteElement.className = 'byte-value';
                    byteElement.textContent = byte.toString(16).padStart(2, '0').toUpperCase();
                    
                    // Color coding based on field type
                    const fieldInfo = this.getFieldAtOffset(byteIndex);
                    if (fieldInfo) {
                        byteElement.className += ' ' + this.getFieldClass(fieldInfo);
                        byteElement.title = `${fieldInfo.field.name} (${fieldInfo.field.type})`;
                    }
                    
                    byteElement.onclick = () => this.selectByte(byteIndex);
                    byteCol.appendChild(byteElement);
                    
                    // ASCII representation
                    ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
                }
                
                row.appendChild(byteCol);
            }
            
            // ASCII column
            const asciiCol = document.createElement('div');
            asciiCol.className = 'ascii-col';
            asciiCol.textContent = ascii;
            row.appendChild(asciiCol);
            
            byteGrid.appendChild(row);
        }
        
        return byteGrid;
    }

    renderBitView() {
        const bitContainer = document.createElement('div');
        bitContainer.className = 'bit-view-container';
        
        if (this.selectedByte === null) {
            bitContainer.innerHTML = '<p>Select a byte to view bit representation</p>';
            return bitContainer;
        }
        
        const byte = this.packet[this.selectedByte];
        
        // Bit representation
        const bitGrid = document.createElement('div');
        bitGrid.className = 'bit-grid';
        
        // Bit positions
        const posRow = document.createElement('div');
        posRow.className = 'bit-row';
        for (let i = 7; i >= 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'bit-cell header';
            cell.textContent = i;
            posRow.appendChild(cell);
        }
        bitGrid.appendChild(posRow);
        
        // Bit values
        const valRow = document.createElement('div');
        valRow.className = 'bit-row';
        for (let i = 7; i >= 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'bit-cell value';
            const bitValue = (byte >> i) & 1;
            cell.textContent = bitValue;
            cell.onclick = () => this.toggleBit(this.selectedByte, i);
            
            // Highlight significant bits
            if (bitValue === 1) {
                cell.classList.add('active');
            }
            
            valRow.appendChild(cell);
        }
        bitGrid.appendChild(valRow);
        
        bitContainer.appendChild(bitGrid);
        
        // Bit field interpretation
        const interpretation = document.createElement('div');
        interpretation.className = 'bit-interpretation';
        interpretation.innerHTML = `
            <div>Binary: <code>${byte.toString(2).padStart(8, '0')}</code></div>
            <div>Decimal: <code>${byte}</code></div>
            <div>Hex: <code>0x${byte.toString(16).padStart(2, '0').toUpperCase()}</code></div>
            <div>Signed: <code>${(byte << 24 >> 24)}</code></div>
        `;
        
        bitContainer.appendChild(interpretation);
        
        return bitContainer;
    }

    getFieldAtOffset(offset) {
        if (!this.definition || !this.definition.fields) return null;
        
        let currentOffset = 1; // Skip opcode
        
        for (const field of this.definition.fields) {
            const fieldSize = this.getFieldSize(field.type);
            
            if (offset >= currentOffset && offset < currentOffset + fieldSize) {
                return {
                    field: field,
                    fieldOffset: offset - currentOffset,
                    startOffset: currentOffset
                };
            }
            
            currentOffset += fieldSize;
        }
        
        return null;
    }

    getFieldSize(type) {
        switch (type) {
            case 'byte': return 1;
            case 'short': return 2;
            case 'int': return 4;
            case 'long': return 8;
            case 'string':
            case 'compressed_string':
            case 'waypoint_array':
                // Variable length - estimate based on remaining packet
                return this.packet.length - 1; // Simplified
            default: return 1;
        }
    }

    getFieldClass(fieldInfo) {
        const type = fieldInfo.field.type;
        switch (type) {
            case 'byte': return 'field-byte';
            case 'short': return 'field-short';
            case 'int': return 'field-int';
            case 'long': return 'field-long';
            case 'string': return 'field-string';
            default: return 'field-unknown';
        }
    }

    selectByte(index) {
        this.selectedByte = index;
        
        // Update visual selection
        document.querySelectorAll('.byte-value').forEach((el, i) => {
            if (i === index) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
        
        // Update detail panel
        this.updateDetailPanel(index);
        
        // Update bit view if active
        if (this.bitMode) {
            this.render();
        }
    }

    updateDetailPanel(byteIndex) {
        const panel = document.getElementById('byte-detail-panel');
        if (!panel) return;
        
        const byte = this.packet[byteIndex];
        const fieldInfo = this.getFieldAtOffset(byteIndex);
        
        let html = `
            <h4>Byte at offset ${byteIndex}</h4>
            <div class="byte-details">
                <div class="detail-row">
                    <span class="label">Hex:</span>
                    <span class="value">0x${byte.toString(16).padStart(2, '0').toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Decimal:</span>
                    <span class="value">${byte}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Binary:</span>
                    <span class="value">${byte.toString(2).padStart(8, '0')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">ASCII:</span>
                    <span class="value">${byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : 'Non-printable'}</span>
                </div>
        `;
        
        if (fieldInfo) {
            const field = fieldInfo.field;
            html += `
                <h5>Field Information</h5>
                <div class="field-details">
                    <div class="detail-row">
                        <span class="label">Field:</span>
                        <span class="value">${field.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Type:</span>
                        <span class="value">${field.type}</span>
                    </div>
                    ${field.modifier ? `
                        <div class="detail-row">
                            <span class="label">Modifier:</span>
                            <span class="value">${field.modifier}</span>
                        </div>
                    ` : ''}
                    ${field.description ? `
                        <div class="detail-row">
                            <span class="label">Description:</span>
                            <span class="value">${field.description}</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Show full field value if multi-byte
            if (this.getFieldSize(field.type) > 1) {
                const fieldValue = this.readFieldValue(fieldInfo.startOffset, field);
                html += `
                    <div class="detail-row">
                        <span class="label">Field Value:</span>
                        <span class="value">${fieldValue}</span>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        
        panel.innerHTML = html;
    }

    readFieldValue(offset, field) {
        let value;
        
        switch (field.type) {
            case 'byte':
                value = this.packet[offset];
                break;
            case 'short':
                if (this.endianness === 'big') {
                    value = (this.packet[offset] << 8) | this.packet[offset + 1];
                } else {
                    value = this.packet[offset] | (this.packet[offset + 1] << 8);
                }
                break;
            case 'int':
                if (this.endianness === 'big') {
                    value = (this.packet[offset] << 24) | (this.packet[offset + 1] << 16) |
                            (this.packet[offset + 2] << 8) | this.packet[offset + 3];
                } else {
                    value = this.packet[offset] | (this.packet[offset + 1] << 8) |
                            (this.packet[offset + 2] << 16) | (this.packet[offset + 3] << 24);
                }
                break;
            default:
                value = '(Complex type)';
        }
        
        // Apply modifier
        if (field.modifier && typeof value === 'number') {
            switch (field.modifier) {
                case 'A': value = value - 128; break;
                case 'C': value = -value; break;
                case 'S': value = 128 - value; break;
            }
        }
        
        return value;
    }

    toggleEndianness() {
        this.endianness = this.endianness === 'big' ? 'little' : 'big';
        this.render();
    }

    toggleBitMode() {
        this.bitMode = !this.bitMode;
        this.render();
    }

    toggleBit(byteIndex, bitPosition) {
        const mask = 1 << bitPosition;
        this.packet[byteIndex] ^= mask;
        this.render();
        this.selectByte(byteIndex);
    }

    exportStructure() {
        const structure = {
            opcode: this.packet[0],
            packet: this.definition ? this.definition.name : 'Unknown',
            size: this.packet.length,
            hex: Array.from(this.packet).map(b => b.toString(16).padStart(2, '0')).join(' '),
            fields: []
        };
        
        if (this.definition && this.definition.fields) {
            let offset = 1;
            this.definition.fields.forEach(field => {
                const size = this.getFieldSize(field.type);
                const value = this.readFieldValue(offset, field);
                
                structure.fields.push({
                    name: field.name,
                    type: field.type,
                    offset: offset,
                    size: size,
                    value: value,
                    hex: Array.from(this.packet.slice(offset, offset + size))
                        .map(b => b.toString(16).padStart(2, '0')).join(' ')
                });
                
                offset += size;
            });
        }
        
        const json = JSON.stringify(structure, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `packet-structure-${structure.opcode}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

window.ByteStructureVisualizer = ByteStructureVisualizer;
// Opcode Encyclopedia with Search
// Full 508 docs, searchable, community annotations, vulnerability tags

const OPCODE_ENCYCLOPEDIA = {
    // Client -> Server Packets
    0: {
        name: 'Idle',
        category: 'System',
        direction: 'client',
        size: 0,
        description: 'Sent when the client has been idle for a certain period',
        fields: [],
        notes: 'Used for anti-idle mechanisms',
        vulnerabilities: [],
        examples: []
    },
    4: {
        name: 'Public Chat',
        category: 'Communication',
        direction: 'client',
        size: -1,
        description: 'Sends a public chat message visible to nearby players',
        fields: [
            { name: 'effects', type: 'byte', modifier: 'S', description: 'Chat effects (color, animation)' },
            { name: 'color', type: 'byte', modifier: 'S', description: 'Text color' },
            { name: 'messageLength', type: 'byte', description: 'Length of the compressed message' },
            { name: 'message', type: 'compressed_string', description: 'Huffman encoded message text' }
        ],
        notes: 'Messages are Huffman compressed. Effects byte contains color and animation data.',
        vulnerabilities: [
            { 
                type: 'overflow',
                severity: 'low',
                description: 'Message length validation required to prevent buffer overflow',
                patched: true
            }
        ],
        examples: [
            { hex: '04 80 81 05 48 65 6C 6C 6F', description: 'Says "Hello" with default color' }
        ],
        communityNotes: [
            { author: 'Player123', date: '2024-01-15', text: 'Effect byte format: bits 0-3 = color, bits 4-7 = effect type' }
        ]
    },
    14: {
        name: 'Player Option 1',
        category: 'Player Interaction',
        direction: 'client',
        size: 2,
        description: 'First right-click option on a player (usually Follow)',
        fields: [
            { name: 'playerIndex', type: 'short', modifier: 'A', description: 'Target player index' }
        ],
        notes: 'Player index is offset by 128',
        vulnerabilities: [],
        examples: []
    },
    17: {
        name: 'NPC Option 2',
        category: 'NPC Interaction',
        direction: 'client',
        size: 2,
        description: 'Second right-click option on an NPC',
        fields: [
            { name: 'npcIndex', type: 'short', description: 'Target NPC index' }
        ],
        notes: 'Common for "Trade" or "Talk-to" options',
        vulnerabilities: [],
        examples: []
    },
    41: {
        name: 'Item Equip',
        category: 'Items',
        direction: 'client',
        size: 6,
        description: 'Equips an item from inventory',
        fields: [
            { name: 'itemId', type: 'short', description: 'Item ID to equip' },
            { name: 'slot', type: 'short', modifier: 'A', description: 'Inventory slot' },
            { name: 'interfaceId', type: 'short', modifier: 'A', description: 'Interface ID (usually 3214)' }
        ],
        notes: 'Validation required for equipment requirements',
        vulnerabilities: [
            {
                type: 'dupe',
                severity: 'critical',
                description: 'Early 508 had packet manipulation dupe with equip/unequip timing',
                patched: true
            }
        ],
        examples: []
    },
    87: {
        name: 'Item on Item',
        category: 'Items',
        direction: 'client',
        size: 8,
        description: 'Uses one item on another',
        fields: [
            { name: 'slot1', type: 'short', description: 'First item slot' },
            { name: 'itemId1', type: 'short', modifier: 'A', description: 'First item ID' },
            { name: 'itemId2', type: 'short', description: 'Second item ID' },
            { name: 'slot2', type: 'short', modifier: 'A', description: 'Second item slot' }
        ],
        notes: 'Used for crafting, herblore, cooking etc.',
        vulnerabilities: [],
        examples: [
            { hex: '00 0E 81 C3 07 5B 80 12', description: 'Use knife on logs' }
        ]
    },
    98: {
        name: 'Walk on Command',
        category: 'Movement',
        direction: 'client',
        size: 5,
        description: 'Walk to exact coordinates (minimap click)',
        fields: [
            { name: 'firstX', type: 'short', description: 'Target X coordinate' },
            { name: 'forceRun', type: 'byte', modifier: 'S', description: 'Force run flag (128 - value)' },
            { name: 'firstY', type: 'short', modifier: 'A', description: 'Target Y coordinate + 128' }
        ],
        notes: 'Coordinates are absolute world positions',
        vulnerabilities: [],
        examples: []
    },
    117: {
        name: 'Item Drop',
        category: 'Items',
        direction: 'client',
        size: 6,
        description: 'Drops an item from inventory',
        fields: [
            { name: 'interfaceId', type: 'short', modifier: 'A', description: 'Interface ID' },
            { name: 'itemId', type: 'short', modifier: 'A', description: 'Item ID + 128' },
            { name: 'slot', type: 'short', description: 'Inventory slot' }
        ],
        notes: 'Items appear to other players after a delay',
        vulnerabilities: [],
        examples: []
    },
    122: {
        name: 'Item First Click',
        category: 'Items',
        direction: 'client',
        size: 6,
        description: 'First click option on an item',
        fields: [
            { name: 'interfaceId', type: 'short', modifier: 'A', description: 'Interface ID' },
            { name: 'slot', type: 'short', modifier: 'A', description: 'Item slot + 128' },
            { name: 'itemId', type: 'short', description: 'Item ID' }
        ],
        notes: 'Common for "Bury", "Eat", "Drink" actions',
        vulnerabilities: [],
        examples: []
    },
    131: {
        name: 'NPC Option 1',
        category: 'NPC Interaction',
        direction: 'client',
        size: 2,
        description: 'First right-click option on an NPC (usually Attack)',
        fields: [
            { name: 'npcIndex', type: 'short', description: 'Target NPC index' }
        ],
        notes: 'Most NPCs have Attack as first option',
        vulnerabilities: [],
        examples: []
    },
    164: {
        name: 'Walk',
        category: 'Movement',
        direction: 'client',
        size: -1,
        description: 'Regular walking with waypoints',
        fields: [
            { name: 'forceRun', type: 'byte', modifier: 'C', description: 'Negative value forces run' },
            { name: 'firstX', type: 'short', modifier: 'A', description: 'First waypoint X + 128' },
            { name: 'firstY', type: 'short', description: 'First waypoint Y' },
            { name: 'waypoints', type: 'waypoint_array', description: 'Additional waypoints (3 bits X, 3 bits Y)' }
        ],
        notes: 'Waypoints are relative to first position, packed as 6 bits each',
        vulnerabilities: [
            {
                type: 'noclip',
                severity: 'high',
                description: 'Malformed waypoints could bypass collision in early versions',
                patched: true
            }
        ],
        examples: []
    },
    192: {
        name: 'Button Click',
        category: 'Interface',
        direction: 'client',
        size: 6,
        description: 'Clicks a button on an interface',
        fields: [
            { name: 'interfaceId', type: 'int', modifier: 'V1', description: 'Interface ID with special encoding' },
            { name: 'buttonId', type: 'short', modifier: 'LEA', description: 'Button child ID' }
        ],
        notes: 'Interface ID uses variable int encoding',
        vulnerabilities: [],
        examples: [
            { hex: 'C0 0C 58 00 00 81', description: 'Logout button click' }
        ]
    },
    237: {
        name: 'Magic on Player',
        category: 'Combat',
        direction: 'client',
        size: 4,
        description: 'Casts a spell on another player',
        fields: [
            { name: 'playerIndex', type: 'short', description: 'Target player index' },
            { name: 'spellId', type: 'short', modifier: 'A', description: 'Spell ID + 128' }
        ],
        notes: 'Requires runes and magic level checks server-side',
        vulnerabilities: [],
        examples: []
    },
    248: {
        name: 'Mini Walk',
        category: 'Movement',
        direction: 'client',
        size: 3,
        description: 'Short-range movement within current region',
        fields: [
            { name: 'localX', type: 'byte', modifier: 'S', description: 'Local X (128 - value)' },
            { name: 'forceRun', type: 'byte', modifier: 'C', description: 'Negative to force run' },
            { name: 'localY', type: 'byte', modifier: 'S', description: 'Local Y (128 - value)' }
        ],
        notes: 'More efficient for short movements',
        vulnerabilities: [],
        examples: []
    },
    249: {
        name: 'Magic on NPC',
        category: 'Combat',
        direction: 'client',
        size: 4,
        description: 'Casts a spell on an NPC',
        fields: [
            { name: 'npcIndex', type: 'short', modifier: 'A', description: 'Target NPC index + 128' },
            { name: 'spellId', type: 'short', description: 'Spell ID' }
        ],
        notes: 'Combat spells initiate combat, others have various effects',
        vulnerabilities: [],
        examples: []
    }
};

// Server -> Client packets would go here...

class OpcodeEncyclopedia {
    constructor() {
        this.opcodes = OPCODE_ENCYCLOPEDIA;
        this.searchIndex = this.buildSearchIndex();
        this.annotations = new Map(); // User annotations
    }

    buildSearchIndex() {
        const index = new Map();
        
        Object.entries(this.opcodes).forEach(([opcode, data]) => {
            // Index by name
            const nameLower = data.name.toLowerCase();
            if (!index.has(nameLower)) {
                index.set(nameLower, []);
            }
            index.get(nameLower).push(opcode);
            
            // Index by category
            const categoryLower = data.category.toLowerCase();
            if (!index.has(categoryLower)) {
                index.set(categoryLower, []);
            }
            index.get(categoryLower).push(opcode);
            
            // Index by keywords in description
            const words = data.description.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3) { // Skip short words
                    if (!index.has(word)) {
                        index.set(word, []);
                    }
                    index.get(word).push(opcode);
                }
            });
        });
        
        return index;
    }

    search(query) {
        const queryLower = query.toLowerCase();
        const results = new Set();
        
        // Direct opcode search
        if (!isNaN(query)) {
            const opcode = parseInt(query);
            if (this.opcodes[opcode]) {
                results.add(opcode.toString());
            }
        }
        
        // Text search
        const words = queryLower.split(/\s+/);
        words.forEach(word => {
            if (this.searchIndex.has(word)) {
                this.searchIndex.get(word).forEach(opcode => results.add(opcode));
            }
            
            // Partial match
            for (const [key, opcodes] of this.searchIndex.entries()) {
                if (key.includes(word)) {
                    opcodes.forEach(opcode => results.add(opcode));
                }
            }
        });
        
        return Array.from(results).map(opcode => ({
            opcode,
            data: this.opcodes[opcode]
        }));
    }

    getByCategory(category) {
        return Object.entries(this.opcodes)
            .filter(([_, data]) => data.category === category)
            .map(([opcode, data]) => ({ opcode, data }));
    }

    getVulnerabilities() {
        const vulns = [];
        
        Object.entries(this.opcodes).forEach(([opcode, data]) => {
            if (data.vulnerabilities && data.vulnerabilities.length > 0) {
                data.vulnerabilities.forEach(vuln => {
                    vulns.push({
                        opcode,
                        name: data.name,
                        vulnerability: vuln
                    });
                });
            }
        });
        
        return vulns.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[a.vulnerability.severity] - severityOrder[b.vulnerability.severity];
        });
    }

    addCommunityNote(opcode, author, text) {
        if (!this.opcodes[opcode]) return false;
        
        if (!this.opcodes[opcode].communityNotes) {
            this.opcodes[opcode].communityNotes = [];
        }
        
        this.opcodes[opcode].communityNotes.push({
            author,
            date: new Date().toISOString(),
            text
        });
        
        return true;
    }

    exportDocumentation(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.opcodes, null, 2);
        } else if (format === 'markdown') {
            return this.generateMarkdownDocs();
        }
    }

    generateMarkdownDocs() {
        let md = '# RuneScape 508 Protocol Documentation\n\n';
        
        // Group by category
        const categories = {};
        Object.entries(this.opcodes).forEach(([opcode, data]) => {
            if (!categories[data.category]) {
                categories[data.category] = [];
            }
            categories[data.category].push({ opcode, ...data });
        });
        
        Object.entries(categories).forEach(([category, packets]) => {
            md += `## ${category}\n\n`;
            
            packets.forEach(packet => {
                md += `### ${packet.opcode} - ${packet.name}\n\n`;
                md += `**Direction:** ${packet.direction}\n`;
                md += `**Size:** ${packet.size === -1 ? 'Variable' : packet.size + ' bytes'}\n\n`;
                md += `${packet.description}\n\n`;
                
                if (packet.fields.length > 0) {
                    md += '#### Fields\n\n';
                    md += '| Name | Type | Modifier | Description |\n';
                    md += '|------|------|----------|-------------|\n';
                    packet.fields.forEach(field => {
                        md += `| ${field.name} | ${field.type} | ${field.modifier || '-'} | ${field.description} |\n`;
                    });
                    md += '\n';
                }
                
                if (packet.notes) {
                    md += `**Notes:** ${packet.notes}\n\n`;
                }
                
                if (packet.vulnerabilities.length > 0) {
                    md += '#### Known Vulnerabilities\n\n';
                    packet.vulnerabilities.forEach(vuln => {
                        md += `- **${vuln.severity.toUpperCase()}**: ${vuln.description} (${vuln.patched ? 'Patched' : 'Unpatched'})\n`;
                    });
                    md += '\n';
                }
            });
        });
        
        return md;
    }
}

window.OpcodeEncyclopedia = OpcodeEncyclopedia;
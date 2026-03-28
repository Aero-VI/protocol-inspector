// Protocol Differ / Version Comparison Tool
// Compare 508 vs 317 vs 474 protocols

const PROTOCOL_VERSIONS = {
    317: {
        name: 'RuneScape 317',
        opcodes: {
            // Movement
            164: { name: 'Walk', size: -1, fields: ['firstX:short', 'forceRun:byte', 'firstY:short'] },
            98: { name: 'Walk on Command', size: -1, fields: ['firstX:short', 'forceRun:byte', 'firstY:short'] },
            // Combat
            249: { name: 'Magic on NPC', size: 4, fields: ['spellId:short:A', 'npcIndex:short'] },
            131: { name: 'NPC Option 1', size: 2, fields: ['npcIndex:short:LE128'] },
            // Items
            122: { name: 'Item First Click', size: 6, fields: ['interfaceId:short:A', 'slot:short', 'itemId:short:A'] },
            // Chat
            4: { name: 'Public Chat', size: -1, fields: ['effects:byte', 'color:byte', 'chatData:compressed'] },
            // Interfaces
            185: { name: 'Button Click', size: 2, fields: ['buttonId:short'] }
        }
    },
    474: {
        name: 'RuneScape 474',
        opcodes: {
            // Movement changes
            164: { name: 'Walk', size: -1, fields: ['forceRun:byte:C', 'firstX:short:A', 'firstY:short', 'waypoints:array'] },
            98: { name: 'Walk on Command', size: 5, fields: ['firstX:short', 'forceRun:byte:S', 'firstY:short:A'] },
            // New in 474
            77: { name: 'Camera Movement', size: 4, fields: ['yaw:short', 'pitch:short'] },
            // Items
            122: { name: 'Item First Click', size: 6, fields: ['interfaceId:short:A', 'slot:short:A', 'itemId:short'] },
            // Combat
            249: { name: 'Magic on NPC', size: 4, fields: ['npcIndex:short:A', 'spellId:short'] },
            // Interfaces
            185: { name: 'Button Click', size: 6, fields: ['interfaceId:int', 'buttonId:short'] }
        }
    },
    508: {
        name: 'RuneScape 508',
        opcodes: {
            // Current implementation
            164: { name: 'Walk', size: -1, fields: ['forceRun:byte:C', 'firstX:short:A', 'firstY:short', 'waypoints:array'] },
            98: { name: 'Walk on Command', size: 5, fields: ['firstX:short', 'forceRun:byte:S', 'firstY:short:A'] },
            248: { name: 'Mini Walk', size: 3, fields: ['localX:byte:S', 'forceRun:byte:C', 'localY:byte:S'] },
            // Chat
            4: { name: 'Public Chat', size: -1, fields: ['effects:byte:S', 'color:byte:S', 'messageLength:byte', 'message:string'] },
            // Combat
            249: { name: 'Magic on NPC', size: 4, fields: ['npcIndex:short:A', 'spellId:short'] },
            237: { name: 'Magic on Player', size: 4, fields: ['playerIndex:short', 'spellId:short:A'] },
            // Items
            122: { name: 'Item First Click', size: 6, fields: ['interfaceId:short:A', 'slot:short:A', 'itemId:short'] },
            41: { name: 'Item Equip', size: 6, fields: ['itemId:short', 'slot:short:A', 'interfaceId:short:A'] },
            117: { name: 'Item Drop', size: 6, fields: ['interfaceId:short:A', 'itemId:short:A', 'slot:short'] },
            // Interfaces
            192: { name: 'Button Click', size: 6, fields: ['interfaceId:int:V1', 'buttonId:short:LEA'] }
        }
    }
};

class ProtocolDiffer {
    constructor() {
        this.versions = PROTOCOL_VERSIONS;
        this.differences = [];
    }

    compareVersions(v1, v2) {
        const version1 = this.versions[v1];
        const version2 = this.versions[v2];
        
        if (!version1 || !version2) {
            throw new Error('Invalid protocol version');
        }

        const differences = {
            version1: v1,
            version2: v2,
            added: [],
            removed: [],
            modified: [],
            unchanged: []
        };

        // Find differences
        const v1Opcodes = Object.keys(version1.opcodes);
        const v2Opcodes = Object.keys(version2.opcodes);
        const allOpcodes = new Set([...v1Opcodes, ...v2Opcodes]);

        allOpcodes.forEach(opcode => {
            const packet1 = version1.opcodes[opcode];
            const packet2 = version2.opcodes[opcode];

            if (!packet1) {
                // Added in v2
                differences.added.push({
                    opcode,
                    packet: packet2,
                    type: 'added'
                });
            } else if (!packet2) {
                // Removed in v2
                differences.removed.push({
                    opcode,
                    packet: packet1,
                    type: 'removed'
                });
            } else {
                // Check if modified
                const isModified = this.isPacketModified(packet1, packet2);
                if (isModified) {
                    differences.modified.push({
                        opcode,
                        packet1,
                        packet2,
                        changes: this.getPacketChanges(packet1, packet2),
                        type: 'modified'
                    });
                } else {
                    differences.unchanged.push({
                        opcode,
                        packet: packet1,
                        type: 'unchanged'
                    });
                }
            }
        });

        this.differences = differences;
        return differences;
    }

    isPacketModified(p1, p2) {
        if (p1.name !== p2.name || p1.size !== p2.size) return true;
        if (p1.fields.length !== p2.fields.length) return true;
        
        return !p1.fields.every((f1, i) => f1 === p2.fields[i]);
    }

    getPacketChanges(p1, p2) {
        const changes = [];

        if (p1.name !== p2.name) {
            changes.push({ type: 'name', from: p1.name, to: p2.name });
        }

        if (p1.size !== p2.size) {
            changes.push({ type: 'size', from: p1.size, to: p2.size });
        }

        // Field changes
        const maxFields = Math.max(p1.fields.length, p2.fields.length);
        for (let i = 0; i < maxFields; i++) {
            const f1 = p1.fields[i];
            const f2 = p2.fields[i];

            if (!f1) {
                changes.push({ type: 'field_added', index: i, field: f2 });
            } else if (!f2) {
                changes.push({ type: 'field_removed', index: i, field: f1 });
            } else if (f1 !== f2) {
                changes.push({ type: 'field_modified', index: i, from: f1, to: f2 });
            }
        }

        return changes;
    }

    generateMigrationGuide(fromVersion, toVersion) {
        const diff = this.compareVersions(fromVersion, toVersion);
        const guide = {
            fromVersion,
            toVersion,
            breakingChanges: [],
            migrations: []
        };

        // Identify breaking changes
        diff.removed.forEach(item => {
            guide.breakingChanges.push({
                type: 'removed_packet',
                opcode: item.opcode,
                packet: item.packet,
                recommendation: `Remove handling for opcode ${item.opcode} (${item.packet.name})`
            });
        });

        diff.modified.forEach(item => {
            const breaking = item.changes.some(change => 
                change.type === 'size' || 
                change.type === 'field_removed' || 
                change.type === 'field_modified'
            );

            if (breaking) {
                guide.breakingChanges.push({
                    type: 'modified_packet',
                    opcode: item.opcode,
                    from: item.packet1,
                    to: item.packet2,
                    changes: item.changes,
                    recommendation: this.getMigrationRecommendation(item)
                });
            }
        });

        // Generate migration steps
        guide.migrations = this.generateMigrationSteps(diff);

        return guide;
    }

    getMigrationRecommendation(item) {
        const recommendations = [];
        
        item.changes.forEach(change => {
            switch(change.type) {
                case 'size':
                    recommendations.push(`Update packet size from ${change.from} to ${change.to}`);
                    break;
                case 'field_modified':
                    recommendations.push(`Update field ${change.index}: "${change.from}" → "${change.to}"`);
                    break;
                case 'field_added':
                    recommendations.push(`Add new field at index ${change.index}: "${change.field}"`);
                    break;
                case 'field_removed':
                    recommendations.push(`Remove field at index ${change.index}: "${change.field}"`);
                    break;
            }
        });

        return recommendations.join('; ');
    }

    generateMigrationSteps(diff) {
        const steps = [];

        // Step 1: Handle removed packets
        if (diff.removed.length > 0) {
            steps.push({
                step: 1,
                title: 'Remove deprecated packet handlers',
                opcodes: diff.removed.map(r => r.opcode),
                description: 'These packets are no longer used in the new version'
            });
        }

        // Step 2: Update modified packets
        if (diff.modified.length > 0) {
            steps.push({
                step: steps.length + 1,
                title: 'Update modified packet structures',
                opcodes: diff.modified.map(m => m.opcode),
                description: 'Update packet handlers to match new field structures'
            });
        }

        // Step 3: Implement new packets
        if (diff.added.length > 0) {
            steps.push({
                step: steps.length + 1,
                title: 'Implement new packet handlers',
                opcodes: diff.added.map(a => a.opcode),
                description: 'Add support for new packets introduced in this version'
            });
        }

        return steps;
    }

    exportDiffReport(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.differences, null, 2);
        } else if (format === 'markdown') {
            return this.generateMarkdownReport();
        } else if (format === 'html') {
            return this.generateHTMLReport();
        }
    }

    generateMarkdownReport() {
        const diff = this.differences;
        let md = `# Protocol Comparison: ${diff.version1} vs ${diff.version2}\n\n`;

        if (diff.added.length > 0) {
            md += `## Added Packets (${diff.added.length})\n\n`;
            diff.added.forEach(item => {
                md += `- **${item.opcode}**: ${item.packet.name}\n`;
            });
            md += '\n';
        }

        if (diff.removed.length > 0) {
            md += `## Removed Packets (${diff.removed.length})\n\n`;
            diff.removed.forEach(item => {
                md += `- **${item.opcode}**: ${item.packet.name}\n`;
            });
            md += '\n';
        }

        if (diff.modified.length > 0) {
            md += `## Modified Packets (${diff.modified.length})\n\n`;
            diff.modified.forEach(item => {
                md += `### ${item.opcode}: ${item.packet1.name}\n`;
                item.changes.forEach(change => {
                    md += `- ${this.formatChange(change)}\n`;
                });
                md += '\n';
            });
        }

        md += `## Summary\n\n`;
        md += `- Total packets in ${diff.version1}: ${Object.keys(PROTOCOL_VERSIONS[diff.version1].opcodes).length}\n`;
        md += `- Total packets in ${diff.version2}: ${Object.keys(PROTOCOL_VERSIONS[diff.version2].opcodes).length}\n`;
        md += `- Added: ${diff.added.length}\n`;
        md += `- Removed: ${diff.removed.length}\n`;
        md += `- Modified: ${diff.modified.length}\n`;
        md += `- Unchanged: ${diff.unchanged.length}\n`;

        return md;
    }

    formatChange(change) {
        switch(change.type) {
            case 'name':
                return `Name changed: "${change.from}" → "${change.to}"`;
            case 'size':
                return `Size changed: ${change.from} → ${change.to} bytes`;
            case 'field_modified':
                return `Field ${change.index} changed: "${change.from}" → "${change.to}"`;
            case 'field_added':
                return `Field ${change.index} added: "${change.field}"`;
            case 'field_removed':
                return `Field ${change.index} removed: "${change.field}"`;
            default:
                return JSON.stringify(change);
        }
    }

    generateHTMLReport() {
        // Generate HTML visualization
        const diff = this.differences;
        let html = `<div class="diff-report">`;
        html += `<h2>Protocol ${diff.version1} → ${diff.version2}</h2>`;
        
        // Stats
        html += `<div class="diff-stats">`;
        html += `<span class="stat added">+ ${diff.added.length} added</span>`;
        html += `<span class="stat removed">- ${diff.removed.length} removed</span>`;
        html += `<span class="stat modified">~ ${diff.modified.length} modified</span>`;
        html += `</div>`;
        
        // Detailed changes
        if (diff.added.length > 0) {
            html += `<div class="diff-section added">`;
            html += `<h3>Added Packets</h3>`;
            diff.added.forEach(item => {
                html += `<div class="diff-item">`;
                html += `<span class="opcode">${item.opcode}</span>`;
                html += `<span class="name">${item.packet.name}</span>`;
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        // Similar for removed and modified...
        
        html += `</div>`;
        return html;
    }
}

// Visual diff component
class ProtocolDiffViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.differ = new ProtocolDiffer();
    }

    render(v1, v2) {
        const diff = this.differ.compareVersions(v1, v2);
        this.container.innerHTML = this.differ.generateHTMLReport();
    }
}

window.ProtocolDiffer = ProtocolDiffer;
window.ProtocolDiffViewer = ProtocolDiffViewer;
// Protocol Fuzzer with Mutation Engine
// Malformed packet generation, server response tracking, vulnerability scan, regression tests

class ProtocolFuzzer {
    constructor() {
        this.strategies = {
            'boundary': this.boundaryStrategy,
            'random': this.randomStrategy,
            'overflow': this.overflowStrategy,
            'underflow': this.underflowStrategy,
            'format': this.formatStringStrategy,
            'injection': this.injectionStrategy,
            'modifier': this.modifierStrategy,
            'type_confusion': this.typeConfusionStrategy
        };
        
        this.testCases = [];
        this.results = [];
        this.isRunning = false;
        this.currentTest = 0;
    }

    generateFuzzCases(opcodeDefinition, strategy = 'all') {
        this.testCases = [];
        
        if (strategy === 'all') {
            Object.keys(this.strategies).forEach(strat => {
                this.generateForStrategy(opcodeDefinition, strat);
            });
        } else if (this.strategies[strategy]) {
            this.generateForStrategy(opcodeDefinition, strategy);
        }
        
        return this.testCases;
    }

    generateForStrategy(opcodeDefinition, strategy) {
        const opcode = parseInt(Object.keys(PACKET_DEFINITIONS).find(
            key => PACKET_DEFINITIONS[key] === opcodeDefinition
        ));
        
        if (!opcodeDefinition.fields || opcodeDefinition.fields.length === 0) {
            // Simple opcode, fuzz the opcode itself
            this.testCases.push({
                name: `${strategy}_opcode_${opcode}`,
                strategy: strategy,
                opcode: opcode,
                description: `Fuzzing opcode ${opcode} with ${strategy} strategy`,
                packet: this.strategies[strategy].call(this, [opcode], null, 0)
            });
            return;
        }
        
        // Fuzz each field
        opcodeDefinition.fields.forEach((field, fieldIndex) => {
            const basePacket = this.createBasePacket(opcode, opcodeDefinition);
            const cases = this.strategies[strategy].call(this, basePacket, field, fieldIndex);
            
            cases.forEach((testPacket, i) => {
                this.testCases.push({
                    name: `${strategy}_${opcode}_${field.name}_${i}`,
                    strategy: strategy,
                    opcode: opcode,
                    field: field.name,
                    fieldIndex: fieldIndex,
                    description: `Fuzzing ${field.name} field with ${strategy} strategy (case ${i})`,
                    packet: testPacket,
                    expected: 'error_or_ignore'
                });
            });
        });
    }

    createBasePacket(opcode, definition) {
        const packet = [opcode];
        let offset = 1;
        
        definition.fields.forEach(field => {
            switch (field.type) {
                case 'byte':
                    packet.push(0);
                    break;
                case 'short':
                    packet.push(0, 0);
                    break;
                case 'int':
                    packet.push(0, 0, 0, 0);
                    break;
                case 'string':
                    packet.push(72, 101, 108, 108, 111, 0); // "Hello\0"
                    break;
                default:
                    packet.push(0);
            }
        });
        
        return packet;
    }

    // Fuzzing strategies
    boundaryStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        const offset = this.getFieldOffset(fieldIndex);
        
        if (field) {
            switch (field.type) {
                case 'byte':
                    // Min/max byte values
                    cases.push(this.mutateAt(basePacket, offset, [0x00]));
                    cases.push(this.mutateAt(basePacket, offset, [0xFF]));
                    cases.push(this.mutateAt(basePacket, offset, [0x7F])); // Max signed
                    cases.push(this.mutateAt(basePacket, offset, [0x80])); // Min signed
                    break;
                    
                case 'short':
                    // Min/max short values
                    cases.push(this.mutateAt(basePacket, offset, [0x00, 0x00]));
                    cases.push(this.mutateAt(basePacket, offset, [0xFF, 0xFF]));
                    cases.push(this.mutateAt(basePacket, offset, [0x7F, 0xFF])); // Max signed
                    cases.push(this.mutateAt(basePacket, offset, [0x80, 0x00])); // Min signed
                    break;
                    
                case 'int':
                    // Min/max int values
                    cases.push(this.mutateAt(basePacket, offset, [0x00, 0x00, 0x00, 0x00]));
                    cases.push(this.mutateAt(basePacket, offset, [0xFF, 0xFF, 0xFF, 0xFF]));
                    cases.push(this.mutateAt(basePacket, offset, [0x7F, 0xFF, 0xFF, 0xFF]));
                    cases.push(this.mutateAt(basePacket, offset, [0x80, 0x00, 0x00, 0x00]));
                    break;
            }
        }
        
        return cases;
    }

    randomStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        const offset = this.getFieldOffset(fieldIndex);
        
        // Generate 10 random mutations
        for (let i = 0; i < 10; i++) {
            const mutated = [...basePacket];
            
            if (field) {
                const size = this.getFieldSize(field.type);
                for (let j = 0; j < size; j++) {
                    mutated[offset + j] = Math.floor(Math.random() * 256);
                }
            } else {
                // Random mutation of entire packet
                for (let j = 0; j < mutated.length; j++) {
                    if (Math.random() < 0.3) { // 30% chance to mutate each byte
                        mutated[j] = Math.floor(Math.random() * 256);
                    }
                }
            }
            
            cases.push(mutated);
        }
        
        return cases;
    }

    overflowStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        
        if (field && field.type === 'string') {
            // String overflow attempts
            const longString = 'A'.repeat(255);
            const veryLongString = 'A'.repeat(65535);
            
            cases.push([...basePacket.slice(0, -6), ...this.stringToBytes(longString)]);
            cases.push([...basePacket.slice(0, -6), ...this.stringToBytes(veryLongString)]);
        } else if (field) {
            // Numeric overflow - add extra bytes
            const offset = this.getFieldOffset(fieldIndex);
            const extended = [...basePacket];
            extended.splice(offset + 1, 0, 0xFF, 0xFF, 0xFF, 0xFF);
            cases.push(extended);
        }
        
        // Packet size overflow
        const oversized = [...basePacket];
        for (let i = 0; i < 1000; i++) {
            oversized.push(0xFF);
        }
        cases.push(oversized);
        
        return cases;
    }

    underflowStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        
        // Truncated packets
        if (basePacket.length > 1) {
            cases.push(basePacket.slice(0, Math.floor(basePacket.length / 2)));
            cases.push(basePacket.slice(0, 1)); // Only opcode
            cases.push([]); // Empty packet
        }
        
        if (field) {
            // Remove field bytes
            const offset = this.getFieldOffset(fieldIndex);
            const size = this.getFieldSize(field.type);
            const truncated = [...basePacket];
            truncated.splice(offset, size);
            cases.push(truncated);
        }
        
        return cases;
    }

    formatStringStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        
        if (field && field.type === 'string') {
            const formatStrings = [
                '%s%s%s%s%s',
                '%x%x%x%x',
                '%n%n%n%n',
                '%d%d%d%d',
                '%%%%%%%%%%',
                '\0\0\0\0\0',
                '${jndi:ldap://x}',
                '<script>alert(1)</script>',
                '../../../../../../etc/passwd',
                'A\0B\0C\0D\0E'
            ];
            
            formatStrings.forEach(fmt => {
                const offset = this.getFieldOffset(fieldIndex);
                const mutated = [...basePacket];
                const fmtBytes = this.stringToBytes(fmt);
                mutated.splice(offset, mutated.length - offset, ...fmtBytes);
                cases.push(mutated);
            });
        }
        
        return cases;
    }

    injectionStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        
        // SQL injection patterns
        const injections = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "1' UNION SELECT * FROM users--",
            String.fromCharCode(0) + "admin",
            "\r\n\r\n",
            "\xFF\xFE\xFD\xFC"
        ];
        
        if (field && field.type === 'string') {
            injections.forEach(injection => {
                const offset = this.getFieldOffset(fieldIndex);
                const mutated = [...basePacket];
                const injBytes = this.stringToBytes(injection);
                mutated.splice(offset, mutated.length - offset, ...injBytes);
                cases.push(mutated);
            });
        }
        
        return cases;
    }

    modifierStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        
        if (field && field.modifier) {
            const offset = this.getFieldOffset(fieldIndex);
            
            // Test edge cases for modifiers
            switch (field.modifier) {
                case 'A': // value + 128
                    cases.push(this.mutateAt(basePacket, offset, [0]));     // Results in 128
                    cases.push(this.mutateAt(basePacket, offset, [127]));   // Results in 255
                    cases.push(this.mutateAt(basePacket, offset, [128]));   // Results in 0 (overflow)
                    cases.push(this.mutateAt(basePacket, offset, [255]));   // Results in 127
                    break;
                    
                case 'C': // -value
                    cases.push(this.mutateAt(basePacket, offset, [0]));     // Results in 0
                    cases.push(this.mutateAt(basePacket, offset, [128]));   // Results in -128
                    cases.push(this.mutateAt(basePacket, offset, [255]));   // Results in -255
                    break;
                    
                case 'S': // 128 - value
                    cases.push(this.mutateAt(basePacket, offset, [0]));     // Results in 128
                    cases.push(this.mutateAt(basePacket, offset, [128]));   // Results in 0
                    cases.push(this.mutateAt(basePacket, offset, [255]));   // Results in -127
                    break;
            }
        }
        
        return cases;
    }

    typeConfusionStrategy(basePacket, field, fieldIndex) {
        const cases = [];
        
        if (field) {
            const offset = this.getFieldOffset(fieldIndex);
            
            // Try to confuse type interpretation
            switch (field.type) {
                case 'byte':
                    // Send multi-byte value where byte expected
                    cases.push(this.mutateAt(basePacket, offset, [0xFF, 0xFF]));
                    break;
                    
                case 'short':
                    // Send byte where short expected
                    const truncated = [...basePacket];
                    truncated.splice(offset + 1, 1);
                    cases.push(truncated);
                    
                    // Send int where short expected
                    cases.push(this.mutateAt(basePacket, offset, [0xFF, 0xFF, 0xFF, 0xFF]));
                    break;
                    
                case 'string':
                    // Send numeric data where string expected
                    cases.push(this.mutateAt(basePacket, offset, [0xFF, 0xFE, 0xFD, 0xFC]));
                    
                    // Missing null terminator
                    const noNull = [...basePacket];
                    if (noNull[noNull.length - 1] === 0) {
                        noNull[noNull.length - 1] = 0xFF;
                    }
                    cases.push(noNull);
                    break;
            }
        }
        
        return cases;
    }

    // Helper methods
    mutateAt(packet, offset, bytes) {
        const mutated = [...packet];
        bytes.forEach((byte, i) => {
            if (offset + i < mutated.length) {
                mutated[offset + i] = byte;
            }
        });
        return mutated;
    }

    getFieldOffset(fieldIndex) {
        // Simplified - would need actual field size calculation
        return 1 + fieldIndex * 2; 
    }

    getFieldSize(type) {
        switch (type) {
            case 'byte': return 1;
            case 'short': return 2;
            case 'int': return 4;
            case 'long': return 8;
            default: return 1;
        }
    }

    stringToBytes(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        bytes.push(0); // Null terminator
        return bytes;
    }

    // Test execution
    async runTests(onProgress, onComplete) {
        this.isRunning = true;
        this.results = [];
        this.currentTest = 0;
        
        for (const testCase of this.testCases) {
            if (!this.isRunning) break;
            
            const result = await this.executeTest(testCase);
            this.results.push(result);
            
            this.currentTest++;
            if (onProgress) {
                onProgress(this.currentTest, this.testCases.length, result);
            }
            
            // Small delay to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        this.isRunning = false;
        if (onComplete) {
            onComplete(this.results);
        }
    }

    async executeTest(testCase) {
        // In a real implementation, this would send to a server
        // For now, we'll simulate responses
        const result = {
            testCase: testCase,
            sent: new Date().toISOString(),
            response: null,
            error: null,
            vulnerability: null
        };
        
        try {
            // Simulate sending packet
            const response = await this.simulateSend(testCase.packet);
            result.response = response;
            
            // Check for vulnerabilities
            if (response.error && response.error.includes('crash')) {
                result.vulnerability = {
                    type: 'crash',
                    severity: 'high',
                    description: 'Server crash detected'
                };
            } else if (response.error && response.error.includes('overflow')) {
                result.vulnerability = {
                    type: 'overflow',
                    severity: 'medium',
                    description: 'Buffer overflow detected'
                };
            }
        } catch (error) {
            result.error = error.message;
        }
        
        return result;
    }

    async simulateSend(packet) {
        // Simulate various server responses
        const hex = packet.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Check for obvious issues
        if (packet.length === 0) {
            throw new Error('Empty packet');
        }
        
        if (packet.length > 1000) {
            return { error: 'Packet too large - possible overflow', code: 'OVERFLOW' };
        }
        
        if (packet.some(b => b === 0xFF && Math.random() < 0.1)) {
            return { error: 'Server crash', code: 'CRASH' };
        }
        
        // Normal response
        return {
            success: true,
            processed: packet.length,
            hex: hex
        };
    }

    stopTests() {
        this.isRunning = false;
    }

    exportResults(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.results, null, 2);
        } else if (format === 'csv') {
            return this.resultsToCSV();
        }
    }

    resultsToCSV() {
        let csv = 'Test Name,Strategy,Opcode,Field,Packet Size,Result,Vulnerability\n';
        
        this.results.forEach(result => {
            const tc = result.testCase;
            csv += `"${tc.name}","${tc.strategy}","${tc.opcode}","${tc.field || 'N/A}",`;
            csv += `"${tc.packet.length}","${result.error || 'Success'}",`;
            csv += `"${result.vulnerability ? result.vulnerability.type : 'None'}"\n`;
        });
        
        return csv;
    }

    generateRegressionTests() {
        // Generate tests from known vulnerabilities
        const regressionTests = [];
        
        // Add historical vulnerability test cases
        regressionTests.push({
            name: 'regression_item_dupe_508',
            description: 'Test for item duplication vulnerability in 508',
            packet: [41, 0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC], // Item equip with specific timing
            expected: 'no_dupe'
        });
        
        regressionTests.push({
            name: 'regression_walk_noclip',
            description: 'Test for walk through walls exploit',
            packet: [164, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], // Malformed waypoints
            expected: 'collision_enforced'
        });
        
        return regressionTests;
    }
}

window.ProtocolFuzzer = ProtocolFuzzer;
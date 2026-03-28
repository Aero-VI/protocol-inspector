// Bot Script Generator
// Packets → bot script in Java/Kotlin/Python, templates, API wrappers, rate limiting

class BotScriptGenerator {
    constructor() {
        this.languages = ['java', 'kotlin', 'python'];
        this.templates = {
            java: {
                imports: [
                    'import java.io.*;',
                    'import java.net.*;',
                    'import java.nio.ByteBuffer;',
                    'import java.util.*;'
                ],
                classTemplate: `
public class RSPSBot {
    private Socket socket;
    private DataOutputStream out;
    private DataInputStream in;
    private long lastPacketTime = 0;
    private int rateLimit = 100; // ms between packets
    
    public RSPSBot(String host, int port) throws IOException {
        this.socket = new Socket(host, port);
        this.out = new DataOutputStream(socket.getOutputStream());
        this.in = new DataInputStream(socket.getInputStream());
    }
    
    private void rateLimit() {
        long now = System.currentTimeMillis();
        long elapsed = now - lastPacketTime;
        if (elapsed < rateLimit) {
            try {
                Thread.sleep(rateLimit - elapsed);
            } catch (InterruptedException e) {}
        }
        lastPacketTime = System.currentTimeMillis();
    }
    
    {{METHODS}}
    
    public static void main(String[] args) {
        try {
            RSPSBot bot = new RSPSBot("localhost", 43594);
            {{MAIN_BODY}}
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}`
            },
            kotlin: {
                imports: [
                    'import java.io.*',
                    'import java.net.*',
                    'import kotlin.experimental.and'
                ],
                classTemplate: `
class RSPSBot(host: String, port: Int) {
    private val socket = Socket(host, port)
    private val out = DataOutputStream(socket.getOutputStream())
    private val input = DataInputStream(socket.getInputStream())
    private var lastPacketTime = 0L
    private val rateLimit = 100 // ms between packets
    
    private fun rateLimit() {
        val now = System.currentTimeMillis()
        val elapsed = now - lastPacketTime
        if (elapsed < rateLimit) {
            Thread.sleep(rateLimit - elapsed)
        }
        lastPacketTime = System.currentTimeMillis()
    }
    
    {{METHODS}}
    
    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            val bot = RSPSBot("localhost", 43594)
            {{MAIN_BODY}}
        }
    }
}`
            },
            python: {
                imports: [
                    'import socket',
                    'import struct',
                    'import time',
                    'from typing import List, Tuple'
                ],
                classTemplate: `
class RSPSBot:
    def __init__(self, host: str = "localhost", port: int = 43594):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((host, port))
        self.last_packet_time = 0
        self.rate_limit = 0.1  # seconds between packets
    
    def rate_limit_check(self):
        """Enforce rate limiting between packets"""
        now = time.time()
        elapsed = now - self.last_packet_time
        if elapsed < self.rate_limit:
            time.sleep(self.rate_limit - elapsed)
        self.last_packet_time = time.time()
    
    {{METHODS}}

if __name__ == "__main__":
    bot = RSPSBot()
    {{MAIN_BODY}}`
            }
        };
    }

    generateScript(packets, language, options = {}) {
        const template = this.templates[language];
        if (!template) {
            throw new Error(`Unsupported language: ${language}`);
        }

        const methods = this.generateMethods(packets, language);
        const mainBody = this.generateMainBody(packets, language, options);
        
        let script = template.imports.join('\n') + '\n\n';
        script += template.classTemplate
            .replace('{{METHODS}}', methods)
            .replace('{{MAIN_BODY}}', mainBody);
        
        return script;
    }

    generateMethods(packets, language) {
        const methods = new Set();
        const generatedMethods = [];
        
        // Generate unique methods for each packet type
        packets.forEach(packet => {
            const opcode = packet.data[0];
            const definition = PACKET_DEFINITIONS[opcode];
            
            if (definition && !methods.has(opcode)) {
                methods.add(opcode);
                generatedMethods.push(this.generateMethod(opcode, definition, language));
            }
        });
        
        // Add utility methods
        generatedMethods.push(this.generateUtilityMethods(language));
        
        return generatedMethods.join('\n\n');
    }

    generateMethod(opcode, definition, language) {
        switch (language) {
            case 'java':
                return this.generateJavaMethod(opcode, definition);
            case 'kotlin':
                return this.generateKotlinMethod(opcode, definition);
            case 'python':
                return this.generatePythonMethod(opcode, definition);
        }
    }

    generateJavaMethod(opcode, definition) {
        const methodName = this.camelCase(definition.name);
        const params = this.getMethodParams(definition, 'java');
        
        let method = `    public void ${methodName}(${params.join(', ')}) throws IOException {\n`;
        method += `        rateLimit();\n`;
        method += `        out.writeByte(${opcode}); // ${definition.name}\n`;
        
        definition.fields.forEach(field => {
            method += this.generateFieldWrite(field, 'java');
        });
        
        method += `        out.flush();\n`;
        method += `    }`;
        
        return method;
    }

    generateKotlinMethod(opcode, definition) {
        const methodName = this.camelCase(definition.name);
        const params = this.getMethodParams(definition, 'kotlin');
        
        let method = `    fun ${methodName}(${params.join(', ')}) {\n`;
        method += `        rateLimit()\n`;
        method += `        out.writeByte(${opcode}) // ${definition.name}\n`;
        
        definition.fields.forEach(field => {
            method += this.generateFieldWrite(field, 'kotlin');
        });
        
        method += `        out.flush()\n`;
        method += `    }`;
        
        return method;
    }

    generatePythonMethod(opcode, definition) {
        const methodName = this.snake_case(definition.name);
        const params = this.getMethodParams(definition, 'python');
        
        let method = `    def ${methodName}(self${params.length > 0 ? ', ' : ''}${params.join(', ')}):\n`;
        method += `        """Send ${definition.name} packet"""\n`;
        method += `        self.rate_limit_check()\n`;
        method += `        self.socket.send(bytes([${opcode}]))  # ${definition.name}\n`;
        
        definition.fields.forEach(field => {
            method += this.generateFieldWrite(field, 'python');
        });
        
        return method;
    }

    getMethodParams(definition, language) {
        const params = [];
        
        definition.fields.forEach(field => {
            const paramName = this.camelCase(field.name);
            const type = this.getFieldType(field.type, language);
            
            switch (language) {
                case 'java':
                    params.push(`${type} ${paramName}`);
                    break;
                case 'kotlin':
                    params.push(`${paramName}: ${type}`);
                    break;
                case 'python':
                    params.push(`${this.snake_case(field.name)}: ${type}`);
                    break;
            }
        });
        
        return params;
    }

    getFieldType(type, language) {
        const typeMap = {
            java: {
                'byte': 'byte',
                'short': 'short',
                'int': 'int',
                'long': 'long',
                'string': 'String'
            },
            kotlin: {
                'byte': 'Byte',
                'short': 'Short',
                'int': 'Int',
                'long': 'Long',
                'string': 'String'
            },
            python: {
                'byte': 'int',
                'short': 'int',
                'int': 'int',
                'long': 'int',
                'string': 'str'
            }
        };
        
        return typeMap[language][type] || typeMap[language]['int'];
    }

    generateFieldWrite(field, language) {
        const fieldName = language === 'python' ? this.snake_case(field.name) : this.camelCase(field.name);
        let write = '';
        
        // Apply modifier if needed
        let value = fieldName;
        if (field.modifier) {
            value = this.applyModifier(value, field.modifier, language);
        }
        
        switch (language) {
            case 'java':
                write = this.generateJavaWrite(field.type, value);
                break;
            case 'kotlin':
                write = this.generateKotlinWrite(field.type, value);
                break;
            case 'python':
                write = this.generatePythonWrite(field.type, value, field.modifier);
                break;
        }
        
        return `        ${write} // ${field.name}\n`;
    }

    generateJavaWrite(type, value) {
        switch (type) {
            case 'byte':
                return `out.writeByte(${value});`;
            case 'short':
                return `out.writeShort(${value});`;
            case 'int':
                return `out.writeInt(${value});`;
            case 'string':
                return `writeString(out, ${value});`;
            default:
                return `out.writeByte(${value});`;
        }
    }

    generateKotlinWrite(type, value) {
        switch (type) {
            case 'byte':
                return `out.writeByte(${value}.toInt())`;
            case 'short':
                return `out.writeShort(${value}.toInt())`;
            case 'int':
                return `out.writeInt(${value})`;
            case 'string':
                return `writeString(out, ${value})`;
            default:
                return `out.writeByte(${value}.toInt())`;
        }
    }

    generatePythonWrite(type, value, modifier) {
        let writeExpr = '';
        
        switch (type) {
            case 'byte':
                writeExpr = `struct.pack('b', ${value})`;
                break;
            case 'short':
                writeExpr = `struct.pack('>h', ${value})`;
                break;
            case 'int':
                writeExpr = `struct.pack('>i', ${value})`;
                break;
            case 'string':
                return `self.write_string(${value})`;
            default:
                writeExpr = `bytes([${value}])`;
        }
        
        return `self.socket.send(${writeExpr})`;
    }

    applyModifier(value, modifier, language) {
        switch (modifier) {
            case 'A':
                return language === 'python' ? `(${value} + 128)` : `(${value} + 128)`;
            case 'C':
                return language === 'python' ? `(-${value})` : `(-${value})`;
            case 'S':
                return language === 'python' ? `(128 - ${value})` : `(128 - ${value})`;
            default:
                return value;
        }
    }

    generateUtilityMethods(language) {
        switch (language) {
            case 'java':
                return `
    private void writeString(DataOutputStream out, String str) throws IOException {
        out.write(str.getBytes());
        out.writeByte(0); // Null terminator
    }
    
    private String readString(DataInputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int b;
        while ((b = in.read()) != 0 && b != -1) {
            sb.append((char) b);
        }
        return sb.toString();
    }`;

            case 'kotlin':
                return `
    private fun writeString(out: DataOutputStream, str: String) {
        out.write(str.toByteArray())
        out.writeByte(0) // Null terminator
    }
    
    private fun readString(input: DataInputStream): String {
        val sb = StringBuilder()
        var b: Int
        while (input.read().also { b = it } != 0 && b != -1) {
            sb.append(b.toChar())
        }
        return sb.toString()
    }`;

            case 'python':
                return `
    def write_string(self, s: str):
        """Write null-terminated string"""
        self.socket.send(s.encode() + b'\\0')
    
    def read_string(self) -> str:
        """Read null-terminated string"""
        chars = []
        while True:
            b = self.socket.recv(1)
            if not b or b == b'\\0':
                break
            chars.append(b)
        return b''.join(chars).decode()`;
        }
    }

    generateMainBody(packets, language, options) {
        const lines = [];
        
        if (options.includeLogin) {
            lines.push(this.generateLoginSequence(language));
        }
        
        // Generate calls for each packet
        packets.forEach(packet => {
            const opcode = packet.data[0];
            const definition = PACKET_DEFINITIONS[opcode];
            
            if (definition) {
                lines.push(this.generateMethodCall(definition, packet, language));
            }
        });
        
        if (options.includeLoop) {
            lines.push(this.generateMainLoop(language));
        }
        
        return lines.filter(l => l).join('\n            ');
    }

    generateMethodCall(definition, packet, language) {
        const methodName = language === 'python' ? 
            this.snake_case(definition.name) : 
            this.camelCase(definition.name);
        
        // Extract parameter values from packet
        const params = this.extractParams(definition, packet.data);
        
        switch (language) {
            case 'java':
            case 'kotlin':
                return `bot.${methodName}(${params.join(', ')});`;
            case 'python':
                return `bot.${methodName}(${params.join(', ')})`;
        }
    }

    extractParams(definition, data) {
        const params = [];
        let offset = 1; // Skip opcode
        
        definition.fields.forEach(field => {
            let value;
            
            switch (field.type) {
                case 'byte':
                    value = data[offset];
                    offset += 1;
                    break;
                case 'short':
                    value = (data[offset] << 8) | data[offset + 1];
                    offset += 2;
                    break;
                case 'string':
                    // Find null terminator
                    let str = '';
                    while (data[offset] !== 0 && offset < data.length) {
                        str += String.fromCharCode(data[offset]);
                        offset++;
                    }
                    value = `"${str}"`;
                    offset++; // Skip null
                    break;
                default:
                    value = 0;
            }
            
            params.push(value);
        });
        
        return params;
    }

    generateLoginSequence(language) {
        switch (language) {
            case 'java':
                return `// Login sequence
bot.sendHandshake();
bot.sendLoginRequest("username", "password");
Thread.sleep(1000); // Wait for login response`;

            case 'kotlin':
                return `// Login sequence
bot.sendHandshake()
bot.sendLoginRequest("username", "password")
Thread.sleep(1000) // Wait for login response`;

            case 'python':
                return `# Login sequence
bot.send_handshake()
bot.send_login_request("username", "password")
time.sleep(1)  # Wait for login response`;
        }
    }

    generateMainLoop(language) {
        switch (language) {
            case 'java':
                return `
// Main bot loop
while (true) {
    bot.sendIdle(); // Anti-idle
    Thread.sleep(30000); // 30 seconds
}`;

            case 'kotlin':
                return `
// Main bot loop
while (true) {
    bot.sendIdle() // Anti-idle
    Thread.sleep(30000) // 30 seconds
}`;

            case 'python':
                return `
# Main bot loop
while True:
    bot.send_idle()  # Anti-idle
    time.sleep(30)  # 30 seconds`;
        }
    }

    camelCase(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    }

    snake_case(str) {
        return str.replace(/\s+/g, '_').toLowerCase();
    }

    generateFromCapture(capturedPackets, language, options) {
        // Filter only client packets
        const clientPackets = capturedPackets.filter(p => p.direction === 'client');
        return this.generateScript(clientPackets, language, options);
    }

    exportScript(script, language) {
        const extensions = {
            'java': 'java',
            'kotlin': 'kt',
            'python': 'py'
        };
        
        const filename = `RSPSBot.${extensions[language]}`;
        const blob = new Blob([script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

window.BotScriptGenerator = BotScriptGenerator;
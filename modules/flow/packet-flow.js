// Packet Flow Diagram Generator
// Login sequence visualization, action mapping, SVG/PNG export, interactive nodes

class PacketFlowDiagram {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.flows = this.initializeFlows();
        this.currentFlow = null;
        this.svg = null;
        this.simulation = null;
    }

    initializeFlows() {
        return {
            login: {
                name: 'Login Sequence',
                description: 'Complete login flow from connection to game entry',
                nodes: [
                    { id: 'client_connect', label: 'Client Connect', type: 'start' },
                    { id: 'handshake_req', label: 'Handshake Request', type: 'client', opcode: 14 },
                    { id: 'handshake_resp', label: 'Handshake Response', type: 'server', opcode: 0 },
                    { id: 'login_req', label: 'Login Request', type: 'client', opcode: 16 },
                    { id: 'login_validate', label: 'Validate Credentials', type: 'process' },
                    { id: 'login_resp', label: 'Login Response', type: 'server', opcode: 2 },
                    { id: 'player_init', label: 'Player Init', type: 'server', opcode: 73 },
                    { id: 'map_region', label: 'Map Region', type: 'server', opcode: 73 },
                    { id: 'player_update', label: 'Player Update', type: 'server', opcode: 81 },
                    { id: 'game_ready', label: 'Game Ready', type: 'end' }
                ],
                edges: [
                    { source: 'client_connect', target: 'handshake_req' },
                    { source: 'handshake_req', target: 'handshake_resp' },
                    { source: 'handshake_resp', target: 'login_req' },
                    { source: 'login_req', target: 'login_validate' },
                    { source: 'login_validate', target: 'login_resp', condition: 'success' },
                    { source: 'login_resp', target: 'player_init' },
                    { source: 'player_init', target: 'map_region' },
                    { source: 'map_region', target: 'player_update' },
                    { source: 'player_update', target: 'game_ready' }
                ]
            },
            combat: {
                name: 'Combat Sequence',
                description: 'Player vs NPC combat flow',
                nodes: [
                    { id: 'player_idle', label: 'Player Idle', type: 'start' },
                    { id: 'npc_click', label: 'NPC Click', type: 'client', opcode: 131 },
                    { id: 'path_calc', label: 'Calculate Path', type: 'process' },
                    { id: 'player_walk', label: 'Player Walk', type: 'server', opcode: 164 },
                    { id: 'in_range', label: 'Check Range', type: 'decision' },
                    { id: 'attack_init', label: 'Attack Init', type: 'process' },
                    { id: 'combat_style', label: 'Combat Style', type: 'server' },
                    { id: 'damage_calc', label: 'Calculate Damage', type: 'process' },
                    { id: 'hit_splat', label: 'Hit Splat', type: 'server', opcode: 194 },
                    { id: 'npc_death', label: 'NPC Death Check', type: 'decision' },
                    { id: 'drop_items', label: 'Drop Items', type: 'server' },
                    { id: 'combat_end', label: 'Combat End', type: 'end' }
                ],
                edges: [
                    { source: 'player_idle', target: 'npc_click' },
                    { source: 'npc_click', target: 'path_calc' },
                    { source: 'path_calc', target: 'player_walk' },
                    { source: 'player_walk', target: 'in_range' },
                    { source: 'in_range', target: 'attack_init', condition: 'yes' },
                    { source: 'in_range', target: 'player_walk', condition: 'no' },
                    { source: 'attack_init', target: 'combat_style' },
                    { source: 'combat_style', target: 'damage_calc' },
                    { source: 'damage_calc', target: 'hit_splat' },
                    { source: 'hit_splat', target: 'npc_death' },
                    { source: 'npc_death', target: 'drop_items', condition: 'dead' },
                    { source: 'npc_death', target: 'attack_init', condition: 'alive' },
                    { source: 'drop_items', target: 'combat_end' }
                ]
            },
            trade: {
                name: 'Trading Sequence',
                description: 'Player to player trade flow',
                nodes: [
                    { id: 'trade_start', label: 'Trade Start', type: 'start' },
                    { id: 'trade_req', label: 'Trade Request', type: 'client', opcode: 139 },
                    { id: 'trade_notify', label: 'Notify Target', type: 'server' },
                    { id: 'trade_accept', label: 'Accept Trade', type: 'client' },
                    { id: 'trade_window', label: 'Open Trade Window', type: 'server' },
                    { id: 'add_item', label: 'Add Items', type: 'client', opcode: 145 },
                    { id: 'update_offer', label: 'Update Offers', type: 'server' },
                    { id: 'accept_1', label: 'First Accept', type: 'client' },
                    { id: 'confirm_window', label: 'Confirmation Window', type: 'server' },
                    { id: 'accept_2', label: 'Final Accept', type: 'client' },
                    { id: 'trade_complete', label: 'Trade Complete', type: 'server' },
                    { id: 'trade_end', label: 'Trade End', type: 'end' }
                ],
                edges: [
                    { source: 'trade_start', target: 'trade_req' },
                    { source: 'trade_req', target: 'trade_notify' },
                    { source: 'trade_notify', target: 'trade_accept' },
                    { source: 'trade_accept', target: 'trade_window' },
                    { source: 'trade_window', target: 'add_item' },
                    { source: 'add_item', target: 'update_offer' },
                    { source: 'update_offer', target: 'accept_1' },
                    { source: 'accept_1', target: 'confirm_window' },
                    { source: 'confirm_window', target: 'accept_2' },
                    { source: 'accept_2', target: 'trade_complete' },
                    { source: 'trade_complete', target: 'trade_end' }
                ]
            },
            teleport: {
                name: 'Teleport Sequence',
                description: 'Magic teleportation flow',
                nodes: [
                    { id: 'tele_start', label: 'Teleport Start', type: 'start' },
                    { id: 'spell_click', label: 'Spell Click', type: 'client', opcode: 185 },
                    { id: 'req_check', label: 'Check Requirements', type: 'process' },
                    { id: 'anim_start', label: 'Start Animation', type: 'server' },
                    { id: 'gfx_spawn', label: 'Spawn Graphics', type: 'server', opcode: 4 },
                    { id: 'fade_out', label: 'Fade Out', type: 'server' },
                    { id: 'update_pos', label: 'Update Position', type: 'process' },
                    { id: 'map_load', label: 'Load New Map', type: 'server', opcode: 73 },
                    { id: 'fade_in', label: 'Fade In', type: 'server' },
                    { id: 'tele_complete', label: 'Teleport Complete', type: 'end' }
                ],
                edges: [
                    { source: 'tele_start', target: 'spell_click' },
                    { source: 'spell_click', target: 'req_check' },
                    { source: 'req_check', target: 'anim_start' },
                    { source: 'anim_start', target: 'gfx_spawn' },
                    { source: 'gfx_spawn', target: 'fade_out' },
                    { source: 'fade_out', target: 'update_pos' },
                    { source: 'update_pos', target: 'map_load' },
                    { source: 'map_load', target: 'fade_in' },
                    { source: 'fade_in', target: 'tele_complete' }
                ]
            }
        };
    }

    renderFlow(flowName) {
        const flow = this.flows[flowName];
        if (!flow) return;
        
        this.currentFlow = flow;
        this.container.innerHTML = '';
        
        // Create controls
        const controls = document.createElement('div');
        controls.className = 'flow-controls';
        controls.innerHTML = `
            <h3>${flow.name}</h3>
            <p>${flow.description}</p>
            <div class="flow-actions">
                <button onclick="packetFlow.exportSVG()">Export SVG</button>
                <button onclick="packetFlow.exportPNG()">Export PNG</button>
                <button onclick="packetFlow.resetZoom()">Reset View</button>
            </div>
        `;
        this.container.appendChild(controls);
        
        // Create SVG container
        const width = 800;
        const height = 600;
        
        const svgContainer = document.createElement('div');
        svgContainer.className = 'flow-svg-container';
        this.container.appendChild(svgContainer);
        
        // Initialize D3
        this.svg = d3.select(svgContainer)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);
        
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        this.svg.call(zoom);
        
        // Create main group
        const g = this.svg.append('g');
        
        // Add arrow marker definition
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .append('path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999');
        
        // Create force simulation
        this.simulation = d3.forceSimulation(flow.nodes)
            .force('link', d3.forceLink(flow.edges)
                .id(d => d.id)
                .distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('y', d3.forceY(d => {
                // Arrange nodes vertically based on type
                const positions = {
                    'start': 50,
                    'client': 150,
                    'process': 250,
                    'server': 350,
                    'decision': 250,
                    'end': 550
                };
                return positions[d.type] || 300;
            }).strength(0.3));
        
        // Create edges
        const link = g.append('g')
            .selectAll('g')
            .data(flow.edges)
            .join('g');
        
        const linkPath = link.append('path')
            .attr('stroke', '#999')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowhead)');
        
        const linkLabel = link.append('text')
            .attr('font-size', 10)
            .attr('fill', '#999')
            .text(d => d.condition || '');
        
        // Create nodes
        const node = g.append('g')
            .selectAll('g')
            .data(flow.nodes)
            .join('g')
            .call(this.drag(this.simulation));
        
        // Node shapes based on type
        node.each(function(d) {
            const g = d3.select(this);
            
            switch(d.type) {
                case 'start':
                case 'end':
                    g.append('circle')
                        .attr('r', 25)
                        .attr('fill', d.type === 'start' ? '#3fb950' : '#f85149');
                    break;
                    
                case 'decision':
                    g.append('path')
                        .attr('d', 'M 0,-25 L 25,0 L 0,25 L -25,0 Z')
                        .attr('fill', '#f39c12');
                    break;
                    
                case 'process':
                    g.append('rect')
                        .attr('x', -40)
                        .attr('y', -20)
                        .attr('width', 80)
                        .attr('height', 40)
                        .attr('rx', 5)
                        .attr('fill', '#a371f7');
                    break;
                    
                case 'client':
                    g.append('rect')
                        .attr('x', -40)
                        .attr('y', -20)
                        .attr('width', 80)
                        .attr('height', 40)
                        .attr('fill', '#58a6ff');
                    break;
                    
                case 'server':
                    g.append('rect')
                        .attr('x', -40)
                        .attr('y', -20)
                        .attr('width', 80)
                        .attr('height', 40)
                        .attr('fill', '#ff7b72');
                    break;
            }
        });
        
        // Add labels
        node.append('text')
            .text(d => d.label)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-size', 11)
            .attr('fill', '#fff');
        
        // Add opcode labels
        node.append('text')
            .text(d => d.opcode ? `(${d.opcode})` : '')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.5em')
            .attr('font-size', 9)
            .attr('fill', '#ccc');
        
        // Add tooltips
        node.append('title')
            .text(d => {
                let tooltip = d.label;
                if (d.opcode) tooltip += `\nOpcode: ${d.opcode}`;
                if (d.type) tooltip += `\nType: ${d.type}`;
                return tooltip;
            });
        
        // Add click interaction
        node.on('click', (event, d) => {
            this.onNodeClick(d);
        });
        
        // Update positions on simulation tick
        this.simulation.on('tick', () => {
            linkPath.attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy);
                return `M ${d.source.x},${d.source.y} A ${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            
            linkLabel
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);
            
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    onNodeClick(node) {
        // Display node details
        const detailPanel = document.getElementById('flow-detail-panel');
        if (!detailPanel) return;
        
        let html = `
            <h4>${node.label}</h4>
            <div class="node-details">
                <p><strong>Type:</strong> ${node.type}</p>
                ${node.opcode ? `<p><strong>Opcode:</strong> ${node.opcode}</p>` : ''}
                ${node.id ? `<p><strong>ID:</strong> ${node.id}</p>` : ''}
            </div>
        `;
        
        if (node.opcode && PACKET_DEFINITIONS[node.opcode]) {
            const def = PACKET_DEFINITIONS[node.opcode];
            html += `
                <div class="packet-info">
                    <h5>Packet Details</h5>
                    <p><strong>Name:</strong> ${def.name}</p>
                    <p><strong>Size:</strong> ${def.size === -1 ? 'Variable' : def.size + ' bytes'}</p>
                    ${def.fields ? `<p><strong>Fields:</strong> ${def.fields.length}</p>` : ''}
                </div>
            `;
        }
        
        detailPanel.innerHTML = html;
    }

    exportSVG() {
        if (!this.svg) return;
        
        // Get SVG content
        const svgElement = this.svg.node();
        const svgData = new XMLSerializer().serializeToString(svgElement);
        
        // Create blob and download
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFlow.name.replace(/\s+/g, '-')}-flow.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportPNG() {
        if (!this.svg) return;
        
        const svgElement = this.svg.node();
        const { width, height } = svgElement.getBoundingClientRect();
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // Higher resolution
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        
        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#0d1117'; // Dark background
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.currentFlow.name.replace(/\s+/g, '-')}-flow.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
            
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    resetZoom() {
        if (!this.svg) return;
        
        this.svg.transition()
            .duration(750)
            .call(d3.zoom().transform, d3.zoomIdentity);
    }

    // Custom flow builder
    addCustomFlow(name, description, nodes, edges) {
        this.flows[name] = { name, description, nodes, edges };
    }
}

// D3.js placeholder for demo (would need actual D3 library)
if (typeof d3 === 'undefined') {
    window.d3 = {
        select: () => ({ 
            append: () => ({ 
                attr: () => ({ 
                    attr: () => ({}) 
                }),
                call: () => ({})
            }),
            selectAll: () => ({
                data: () => ({
                    join: () => ({
                        each: () => ({}),
                        append: () => ({
                            attr: () => ({}),
                            text: () => ({})
                        }),
                        on: () => ({}),
                        call: () => ({})
                    })
                })
            })
        }),
        forceSimulation: () => ({
            force: () => ({
                force: () => ({
                    force: () => ({
                        on: () => ({})
                    })
                })
            })
        }),
        drag: () => ({
            on: () => ({
                on: () => ({
                    on: () => ({})
                })
            })
        }),
        zoom: () => ({
            scaleExtent: () => ({
                on: () => ({})
            }),
            transform: {}
        }),
        zoomIdentity: {},
        forceLink: () => ({
            id: () => ({
                distance: () => ({})
            })
        }),
        forceManyBody: () => ({
            strength: () => ({})
        }),
        forceCenter: () => ({}),
        forceY: () => ({
            strength: () => ({})
        })
    };
}

window.PacketFlowDiagram = PacketFlowDiagram;
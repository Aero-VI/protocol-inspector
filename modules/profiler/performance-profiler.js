// Performance Profiler
// Packet frequency heatmap, bandwidth analyzer, latency calculator, optimization suggestions

class PerformanceProfiler {
    constructor() {
        this.stats = {
            packetFrequency: new Map(),
            bandwidthUsage: new Map(),
            latencyMeasurements: new Map(),
            timeWindows: []
        };
        
        this.currentWindow = {
            startTime: Date.now(),
            endTime: null,
            packets: [],
            totalBytes: 0
        };
        
        this.windowSize = 60000; // 1 minute windows
        this.maxWindows = 60; // Keep 1 hour of data
        
        this.heatmapCanvas = null;
        this.bandwidthChart = null;
    }

    addPacket(packet) {
        const now = Date.now();
        
        // Check if we need a new time window
        if (now - this.currentWindow.startTime > this.windowSize) {
            this.finalizeWindow();
            this.startNewWindow();
        }
        
        // Update current window
        this.currentWindow.packets.push(packet);
        this.currentWindow.totalBytes += packet.data.length;
        
        // Update frequency stats
        const opcode = packet.opcode || packet.data[0];
        if (!this.stats.packetFrequency.has(opcode)) {
            this.stats.packetFrequency.set(opcode, {
                count: 0,
                totalBytes: 0,
                avgSize: 0,
                timestamps: []
            });
        }
        
        const freqStat = this.stats.packetFrequency.get(opcode);
        freqStat.count++;
        freqStat.totalBytes += packet.data.length;
        freqStat.avgSize = freqStat.totalBytes / freqStat.count;
        freqStat.timestamps.push(now);
        
        // Keep only recent timestamps (last minute)
        freqStat.timestamps = freqStat.timestamps.filter(ts => now - ts < 60000);
        
        // Update bandwidth stats
        this.updateBandwidthStats(packet);
        
        // Update latency if we have response time
        if (packet.latency) {
            this.updateLatencyStats(opcode, packet.latency);
        }
    }

    updateBandwidthStats(packet) {
        const minute = Math.floor(Date.now() / 60000);
        
        if (!this.stats.bandwidthUsage.has(minute)) {
            this.stats.bandwidthUsage.set(minute, {
                sent: 0,
                received: 0,
                total: 0
            });
        }
        
        const bw = this.stats.bandwidthUsage.get(minute);
        if (packet.direction === 'client') {
            bw.sent += packet.data.length;
        } else {
            bw.received += packet.data.length;
        }
        bw.total += packet.data.length;
    }

    updateLatencyStats(opcode, latency) {
        if (!this.stats.latencyMeasurements.has(opcode)) {
            this.stats.latencyMeasurements.set(opcode, {
                min: Infinity,
                max: 0,
                avg: 0,
                samples: []
            });
        }
        
        const stat = this.stats.latencyMeasurements.get(opcode);
        stat.samples.push(latency);
        stat.min = Math.min(stat.min, latency);
        stat.max = Math.max(stat.max, latency);
        stat.avg = stat.samples.reduce((a, b) => a + b, 0) / stat.samples.length;
        
        // Keep only last 100 samples
        if (stat.samples.length > 100) {
            stat.samples.shift();
        }
    }

    finalizeWindow() {
        this.currentWindow.endTime = Date.now();
        this.stats.timeWindows.push({ ...this.currentWindow });
        
        // Limit stored windows
        if (this.stats.timeWindows.length > this.maxWindows) {
            this.stats.timeWindows.shift();
        }
    }

    startNewWindow() {
        this.currentWindow = {
            startTime: Date.now(),
            endTime: null,
            packets: [],
            totalBytes: 0
        };
    }

    generateHeatmap(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, width, height);
        
        // Get frequency data
        const frequencyData = Array.from(this.stats.packetFrequency.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 20); // Top 20
        
        if (frequencyData.length === 0) return;
        
        // Calculate grid dimensions
        const cols = 10;
        const rows = Math.ceil(frequencyData.length / cols);
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        
        // Find max frequency for normalization
        const maxFreq = Math.max(...frequencyData.map(([_, stat]) => stat.timestamps.length));
        
        // Draw heatmap
        frequencyData.forEach(([opcode, stat], index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * cellWidth;
            const y = row * cellHeight;
            
            // Calculate heat intensity
            const intensity = stat.timestamps.length / maxFreq;
            const hue = (1 - intensity) * 240; // Blue to red
            
            // Draw cell
            ctx.fillStyle = `hsl(${hue}, 100%, ${30 + intensity * 40}%)`;
            ctx.fillRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
            
            // Draw label
            ctx.fillStyle = intensity > 0.5 ? '#000' : '#fff';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const definition = PACKET_DEFINITIONS[opcode];
            const label = definition ? definition.name : `Op ${opcode}`;
            ctx.fillText(label, x + cellWidth / 2, y + cellHeight / 2 - 10);
            ctx.fillText(`${stat.timestamps.length}/min`, x + cellWidth / 2, y + cellHeight / 2 + 10);
        });
        
        // Draw legend
        this.drawHeatmapLegend(ctx, width, height);
    }

    drawHeatmapLegend(ctx, width, height) {
        const legendY = height - 30;
        const legendWidth = 200;
        const legendX = (width - legendWidth) / 2;
        
        // Gradient
        const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
        gradient.addColorStop(0, 'hsl(240, 100%, 30%)'); // Blue (low)
        gradient.addColorStop(1, 'hsl(0, 100%, 50%)'); // Red (high)
        
        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendWidth, 10);
        
        // Labels
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Low', legendX - 25, legendY + 7);
        ctx.textAlign = 'right';
        ctx.fillText('High', legendX + legendWidth + 25, legendY + 7);
    }

    generateBandwidthChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, width, height);
        
        // Get bandwidth data
        const bandwidthData = Array.from(this.stats.bandwidthUsage.entries())
            .sort((a, b) => a[0] - b[0])
            .slice(-60); // Last 60 minutes
        
        if (bandwidthData.length === 0) return;
        
        // Calculate scales
        const maxBandwidth = Math.max(...bandwidthData.map(([_, bw]) => bw.total));
        const xScale = width / Math.max(60, bandwidthData.length);
        const yScale = (height - 40) / maxBandwidth;
        
        // Draw axes
        ctx.strokeStyle = '#30363d';
        ctx.beginPath();
        ctx.moveTo(40, height - 20);
        ctx.lineTo(width - 10, height - 20);
        ctx.moveTo(40, 10);
        ctx.lineTo(40, height - 20);
        ctx.stroke();
        
        // Draw sent data
        ctx.strokeStyle = '#58a6ff';
        ctx.fillStyle = 'rgba(88, 166, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(40, height - 20);
        
        bandwidthData.forEach(([minute, bw], index) => {
            const x = 40 + index * xScale;
            const y = height - 20 - (bw.sent * yScale);
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(40 + (bandwidthData.length - 1) * xScale, height - 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw received data
        ctx.strokeStyle = '#f85149';
        ctx.fillStyle = 'rgba(248, 81, 73, 0.2)';
        ctx.beginPath();
        ctx.moveTo(40, height - 20);
        
        bandwidthData.forEach(([minute, bw], index) => {
            const x = 40 + index * xScale;
            const y = height - 20 - (bw.received * yScale);
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(40 + (bandwidthData.length - 1) * xScale, height - 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw labels
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        
        // Y-axis labels (bandwidth)
        ctx.textAlign = 'right';
        ctx.fillText(`${(maxBandwidth / 1024).toFixed(1)} KB`, 35, 15);
        ctx.fillText('0', 35, height - 15);
        
        // X-axis label
        ctx.textAlign = 'center';
        ctx.fillText('Time (minutes ago)', width / 2, height - 5);
        
        // Legend
        ctx.fillStyle = '#58a6ff';
        ctx.fillRect(width - 100, 10, 10, 10);
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Sent', width - 85, 18);
        
        ctx.fillStyle = '#f85149';
        ctx.fillRect(width - 100, 25, 10, 10);
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Received', width - 85, 33);
    }

    generateLatencyReport() {
        const report = {
            overall: {
                avgLatency: 0,
                p50: 0,
                p95: 0,
                p99: 0
            },
            byPacket: [],
            issues: []
        };
        
        // Calculate overall latency
        const allLatencies = [];
        this.stats.latencyMeasurements.forEach((stat, opcode) => {
            allLatencies.push(...stat.samples);
            
            report.byPacket.push({
                opcode: opcode,
                name: PACKET_DEFINITIONS[opcode]?.name || 'Unknown',
                min: stat.min,
                max: stat.max,
                avg: stat.avg,
                samples: stat.samples.length
            });
        });
        
        if (allLatencies.length > 0) {
            allLatencies.sort((a, b) => a - b);
            report.overall.avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
            report.overall.p50 = this.percentile(allLatencies, 50);
            report.overall.p95 = this.percentile(allLatencies, 95);
            report.overall.p99 = this.percentile(allLatencies, 99);
        }
        
        // Identify issues
        if (report.overall.p95 > 200) {
            report.issues.push({
                type: 'high_latency',
                severity: 'warning',
                description: '95th percentile latency exceeds 200ms',
                suggestion: 'Check network connection and server load'
            });
        }
        
        // Check for packet flooding
        this.stats.packetFrequency.forEach((stat, opcode) => {
            if (stat.timestamps.length > 100) { // More than 100/min
                report.issues.push({
                    type: 'packet_flood',
                    severity: 'warning',
                    description: `Opcode ${opcode} sent ${stat.timestamps.length} times/min`,
                    suggestion: 'Consider rate limiting or batching'
                });
            }
        });
        
        return report;
    }

    generateOptimizationSuggestions() {
        const suggestions = [];
        
        // Analyze packet patterns
        const frequentPackets = Array.from(this.stats.packetFrequency.entries())
            .filter(([_, stat]) => stat.timestamps.length > 30)
            .sort((a, b) => b[1].timestamps.length - a[1].timestamps.length);
        
        // Suggest batching for frequent small packets
        frequentPackets.forEach(([opcode, stat]) => {
            if (stat.avgSize < 10) {
                suggestions.push({
                    type: 'batching',
                    priority: 'medium',
                    packet: PACKET_DEFINITIONS[opcode]?.name || `Opcode ${opcode}`,
                    description: `Small packet (${stat.avgSize.toFixed(1)} bytes) sent frequently`,
                    recommendation: 'Consider batching multiple operations'
                });
            }
        });
        
        // Check bandwidth usage
        const recentBandwidth = Array.from(this.stats.bandwidthUsage.values()).slice(-5);
        if (recentBandwidth.length > 0) {
            const avgBandwidth = recentBandwidth.reduce((a, b) => a + b.total, 0) / recentBandwidth.length;
            
            if (avgBandwidth > 100000) { // 100KB/min
                suggestions.push({
                    type: 'bandwidth',
                    priority: 'high',
                    description: `High bandwidth usage: ${(avgBandwidth / 1024).toFixed(1)} KB/min`,
                    recommendation: 'Implement compression or reduce update frequency'
                });
            }
        }
        
        // Check for redundant packets
        const walkPackets = frequentPackets.filter(([opcode]) => 
            [164, 98, 248].includes(parseInt(opcode))
        );
        
        if (walkPackets.length > 0) {
            const totalWalkPackets = walkPackets.reduce((sum, [_, stat]) => 
                sum + stat.timestamps.length, 0
            );
            
            if (totalWalkPackets > 60) {
                suggestions.push({
                    type: 'pathfinding',
                    priority: 'medium',
                    description: `Excessive movement packets: ${totalWalkPackets}/min`,
                    recommendation: 'Optimize pathfinding to reduce waypoints'
                });
            }
        }
        
        return suggestions;
    }

    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[index];
    }

    reset() {
        this.stats = {
            packetFrequency: new Map(),
            bandwidthUsage: new Map(),
            latencyMeasurements: new Map(),
            timeWindows: []
        };
        
        this.currentWindow = {
            startTime: Date.now(),
            endTime: null,
            packets: [],
            totalBytes: 0
        };
    }

    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: this.stats.timeWindows.length * this.windowSize,
            packetStats: Array.from(this.stats.packetFrequency.entries()).map(([opcode, stat]) => ({
                opcode,
                name: PACKET_DEFINITIONS[opcode]?.name || 'Unknown',
                count: stat.count,
                totalBytes: stat.totalBytes,
                avgSize: stat.avgSize,
                frequency: stat.timestamps.length
            })),
            bandwidthStats: Array.from(this.stats.bandwidthUsage.entries()).map(([minute, bw]) => ({
                minute,
                ...bw
            })),
            latencyReport: this.generateLatencyReport(),
            optimizations: this.generateOptimizationSuggestions()
        };
        
        return JSON.stringify(report, null, 2);
    }
}

window.PerformanceProfiler = PerformanceProfiler;
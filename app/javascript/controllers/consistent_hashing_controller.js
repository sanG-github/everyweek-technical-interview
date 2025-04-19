import { Controller } from "@hotwired/stimulus"
import * as d3 from "d3"

// This Stimulus controller manages the traditional hashing visualization
export default class extends Controller {
  static targets = [
    "vizContainer", "hashTable",
    "serverCount", "keyCount", "keysRelocated",
  ]
  
  connect() {
    console.log("Traditional hashing controller connected")
    
    // Server color scheme - create more minimal palette with lower shades
    this.colors = [
      "#3b82f6", // blue
      "#f97316", // orange 
      "#10b981", // green
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#14b8a6", // teal
      "#f59e0b", // amber
      "#6366f1", // indigo
      "#64748b"  // slate
    ].map(color => d3.color(color).brighter(0.4).formatHex()) // make all colors lighter

    // Add CSS for animations
    this.addStyles()

    // Initialize the demo state
    this.initializeState()
    
    // Render visualizations with a small delay to ensure the DOM is ready
    setTimeout(() => {
      this.renderTraditionalHashingDemo()
      this.renderTraditionalHashTable()
    }, 300)
  }
  
  addStyles() {
    // Ensure our custom styles exist
    if (!document.getElementById('hashing-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'hashing-styles'
      styleEl.textContent = `
        .highlight-new {
          animation: pulse-effect 1.5s ease-in-out;
        }
        @keyframes pulse-effect {
          0% { transform: scale(1); }
          25% { transform: scale(1.3); }
          50% { transform: scale(1); }
          75% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        
        /* Smoother transitions for all interactive elements */
        .server-node circle, .key-node circle, 
        button, input {
          transition: all 0.2s ease-in-out;
        }
        
        /* Enhanced padding for better readability */
        .traditional-hashing-table td {
          padding: 0.85rem 1.25rem;
        }
        
        /* Minimalist table design */
        .traditional-hashing-table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
        }
        
        .traditional-hashing-table thead th {
          position: sticky;
          top: 0;
          background: #f9fafb;
          z-index: 1;
          padding: 0.85rem 1.25rem;
        }
        
        /* Drag interactions */
        .key-group, .server-group {
          cursor: grab;
        }
        
        .key-group:active, .server-group:active,
        .key-group.dragging, .server-group.dragging {
          cursor: grabbing !important;
        }
        
        .dragging circle { 
          stroke-width: 3px !important;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        
        .dragging line {
          stroke-width: 2px !important;
          stroke-opacity: 1 !important;
        }
        
        /* Ensure SVG elements receive pointer events */
        svg, g, circle, rect {
          pointer-events: auto;
        }
        
        /* Add visual cue for draggable elements */
        .key-group circle:hover, .server-group rect:hover {
          filter: brightness(1.05) drop-shadow(0 1px 2px rgba(0,0,0,0.1));
        }
      `
      document.head.appendChild(styleEl)
    }
  }
  
  initializeState() {
    // Traditional hashing state
    this.traditionalServers = 3
    this.traditionalKeys = {}
    this.traditionalPreviousAssignments = {}
    this.traditionalKeysRelocated = 0
    
    // Generate initial keys for traditional hashing
    for (let i = 1; i <= 10; i++) {
      const key = `key${i}`
      const hash = this.hashString(key)
      this.traditionalKeys[key] = hash
      this.traditionalPreviousAssignments[key] = hash % this.traditionalServers
    }
    
    // Update statistics displays
    this.updateStats()
  }
  
  // Traditional hashing demo methods
  addTraditionalServer(event) {
    event.preventDefault()
    
    this.traditionalPreviousAssignments = this.getCurrentTraditionalAssignments()
    this.traditionalServers++
    this.traditionalKeysRelocated = this.countTraditionalRelocations()
    
    this.updateStats()
    this.renderTraditionalHashingDemo()
    this.renderTraditionalHashTable()
  }
  
  removeTraditionalServer(event) {
    event.preventDefault()
    
    if (this.traditionalServers <= 1) return
    
    this.traditionalPreviousAssignments = this.getCurrentTraditionalAssignments()
    this.traditionalServers--
    this.traditionalKeysRelocated = this.countTraditionalRelocations()
    
    this.updateStats()
    this.renderTraditionalHashingDemo()
    this.renderTraditionalHashTable()
  }
  
  addTraditionalKey(event) {
    event.preventDefault()
    
    const keyCount = Object.keys(this.traditionalKeys).length
    const newKey = `key${keyCount + 1}`
    const hash = this.hashString(newKey)
    
    this.traditionalPreviousAssignments = this.getCurrentTraditionalAssignments()
    this.traditionalKeys[newKey] = hash
    this.traditionalKeysRelocated = 0 // No relocations when adding a key
    
    this.updateStats()
    this.renderTraditionalHashingDemo()
    this.renderTraditionalHashTable()
  }
  
  resetTraditional(event) {
    event.preventDefault()
    
    this.traditionalServers = 3
    this.traditionalKeys = {}
    this.traditionalPreviousAssignments = {}
    this.traditionalKeysRelocated = 0
    
    // Generate initial keys
    for (let i = 1; i <= 10; i++) {
      const key = `key${i}`
      const hash = this.hashString(key)
      this.traditionalKeys[key] = hash
      this.traditionalPreviousAssignments[key] = hash % this.traditionalServers
    }
    
    this.updateStats()
    this.renderTraditionalHashingDemo()
    this.renderTraditionalHashTable()
  }
  
  getCurrentTraditionalAssignments() {
    const assignments = {}
    for (const [key, hash] of Object.entries(this.traditionalKeys)) {
      assignments[key] = hash % this.traditionalServers
    }
    return assignments
  }
  
  countTraditionalRelocations() {
    let count = 0
    const currentAssignments = this.getCurrentTraditionalAssignments()
    
    for (const key in currentAssignments) {
      if (this.traditionalPreviousAssignments[key] !== currentAssignments[key]) {
        count++
      }
    }
    
    return count
  }
  
  renderTraditionalHashingDemo() {
    const container = this.vizContainerTarget
    container.innerHTML = ""
    
    const width = container.clientWidth || 600
    const height = container.clientHeight || 400
    const margin = { top: 60, right: 30, bottom: 30, left: 30 }

    console.log("width", width)
    console.log("height", height)
    
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
    
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    
    // Draw servers as boxes at the bottom
    const serverWidth = Math.min(80, innerWidth / this.traditionalServers - 10)
    const serverHeight = 40
    const serverSpacing = innerWidth / this.traditionalServers
    
    // Define the vertical gap between keys and servers
    const KEY_SERVER_GAP = 150
    
    // Store references to key and server positions for updating connections
    const serverPositions = {}
    const keyPositions = {}
    
    // Create server group with hover effects
    const serverGroups = svg.selectAll(".server-group")
      .data(Array.from({ length: this.traditionalServers }, (_, i) => i))
      .enter()
      .append("g")
      .attr("class", "server-group")
      .attr("transform", i => `translate(${i * serverSpacing}, 0)`)
      .attr("cursor", "grab")
    
    // Add server rectangles
    serverGroups.append("rect")
      .attr("y", innerHeight - serverHeight)
      .attr("width", serverWidth)
      .attr("height", serverHeight)
      .attr("fill", (d, i) => this.colors[i % this.colors.length])
      .attr("stroke", (d, i) => d3.color(this.colors[i % this.colors.length]).darker(0.2))
      .attr("stroke-width", 1.5)
      .attr("rx", 5)
      .attr("class", "server-rect")
    
    // Add server labels
    serverGroups.append("text")
      .attr("x", serverWidth / 2)
      .attr("y", innerHeight - serverHeight / 2 + 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("pointer-events", "none") // Prevents text from interfering with drag
      .text(d => `Server ${d}`)
    
    // Store initial server positions
    serverGroups.each(function(d) {
      const transform = d3.select(this).attr("transform")
      const translateX = transform ? parseFloat(transform.split("(")[1].split(",")[0]) : 0
      serverPositions[d] = {
        x: translateX + serverWidth / 2,
        y: innerHeight - serverHeight
      }
    })
    
    // Organize keys by server
    const keysByServer = {}
    
    Object.entries(this.traditionalKeys).forEach(([key, hash]) => {
      const serverIndex = hash % this.traditionalServers
      if (!keysByServer[serverIndex]) {
        keysByServer[serverIndex] = []
      }
      keysByServer[serverIndex].push(key)
    })
    
    // Draw keys as circles with lines to their assigned servers
    const keyRadius = 15
    const keySpacing = innerWidth / (Object.keys(this.traditionalKeys).length + 1)
    
    // Draw connecting lines first (so they're behind)
    const links = svg.selectAll(".key-line")
      .data(Object.entries(this.traditionalKeys))
      .enter()
      .append("line")
      .attr("class", "key-line")
      .attr("x1", (d, i) => (i + 1) * keySpacing)
      .attr("y1", innerHeight - serverHeight - KEY_SERVER_GAP)
      .attr("x2", ([key, hash]) => {
        const serverIndex = hash % this.traditionalServers
        return serverPositions[serverIndex].x
      })
      .attr("y2", innerHeight - serverHeight)
      .attr("stroke", ([key, hash]) => {
        const serverIndex = hash % this.traditionalServers
        return this.colors[serverIndex % this.colors.length]
      })
      .attr("stroke-opacity", 0.7)
      .attr("stroke-dasharray", ([key, hash]) => {
        const serverIndex = hash % this.traditionalServers
        return this.traditionalPreviousAssignments[key] !== serverIndex ? "5,5" : "none"
      })
      .attr("stroke-width", ([key, hash]) => {
        const serverIndex = hash % this.traditionalServers
        return this.traditionalPreviousAssignments[key] !== serverIndex ? 2 : 1
      })
    
    // Create key groups
    const keyGroups = svg.selectAll(".key-group")
      .data(Object.entries(this.traditionalKeys))
      .enter()
      .append("g")
      .attr("class", "key-group")
      .style("cursor", "grab")
    
    // Add key circles
    keyGroups.append("circle")
      .attr("cx", (d, i) => (i + 1) * keySpacing)
      .attr("cy", innerHeight - serverHeight - KEY_SERVER_GAP)
      .attr("r", keyRadius)
      .attr("fill", "#fff")
      .attr("stroke", ([key, hash]) => {
        const serverIndex = hash % this.traditionalServers
        return this.colors[serverIndex % this.colors.length]
      })
      .attr("stroke-width", 2)
    
    // Add key labels
    keyGroups.append("text")
      .attr("x", (d, i) => (i + 1) * keySpacing)
      .attr("y", innerHeight - serverHeight - KEY_SERVER_GAP + 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#333")
      .attr("pointer-events", "none") // Prevents text from interfering with drag
      .text(([key]) => key)
    
    // Store initial key positions
    keyGroups.each(function(d, i) {
      const [key, hash] = d
      keyPositions[key] = {
        x: (i + 1) * keySpacing,
        y: innerHeight - serverHeight - KEY_SERVER_GAP,
        serverIndex: hash % this.traditionalServers
      }
    }.bind(this))
    
    // Title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(`Traditional Hashing: key % ${this.traditionalServers} servers`)
    
    // Apply drag behavior to servers
    this.applyServerDrag(serverGroups, serverPositions, links, serverWidth, innerWidth)
    
    // Apply drag behavior to keys
    this.applyKeyDrag(keyGroups, keyPositions, links, keyRadius, innerWidth, innerHeight, serverHeight)
  }
  
  // Apply drag behavior to server elements
  applyServerDrag(serverGroups, serverPositions, links, serverWidth, innerWidth) {
    serverGroups.call(
      d3.drag()
        .on("start", function(event, d) {
          d3.select(this).raise().classed("dragging", true);
        })
        .on("drag", function(event, d) {
          // Calculate new position, constrained to SVG boundaries
          const newX = Math.max(0, Math.min(innerWidth - serverWidth, event.x));
          
          // Update server position
          d3.select(this)
            .attr("transform", `translate(${newX}, 0)`)
            .attr("cursor", "grabbing");
          
          // Update stored position
          serverPositions[d].x = newX + serverWidth / 2;
          
          // Update all links connected to this server
          links.filter(([key, hash]) => hash % this.traditionalServers === d)
            .attr("x2", serverPositions[d].x);
        }.bind(this))
        .on("end", function(event, d) {
          d3.select(this).classed("dragging", false).attr("cursor", "grab");
        })
    );
    
    // Add hover effects
    serverGroups
      .on("mouseenter", function() {
        d3.select(this).select("rect")
          .transition()
          .duration(100)
          .attr("stroke-width", 3);
      })
      .on("mouseleave", function() {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("stroke-width", 1.5);
      });
  }
  
  // Apply drag behavior to key elements
  applyKeyDrag(keyGroups, keyPositions, links, keyRadius, innerWidth, innerHeight, serverHeight) {
    const self = this; // Store reference to controller
    
    keyGroups.call(
      d3.drag()
        .on("start", function(event, d) {
          d3.select(this).raise().classed("dragging", true);
        })
        .on("drag", function(event, d) {
          const [key, hash] = d;
          
          // Calculate new position, constrained to SVG boundaries
          const newX = Math.max(keyRadius, Math.min(innerWidth - keyRadius, event.x));
          const newY = Math.max(keyRadius, Math.min(innerHeight - serverHeight - keyRadius, event.y));
          
          // Update key position
          d3.select(this).select("circle")
            .attr("cx", newX)
            .attr("cy", newY);
          
          d3.select(this).select("text")
            .attr("x", newX)
            .attr("y", newY + 5);
          
          // Update stored position
          keyPositions[key].x = newX;
          keyPositions[key].y = newY;
          
          // Update corresponding link
          const serverIndex = hash % self.traditionalServers;
          links.filter(d => d[0] === key)
            .attr("x1", newX)
            .attr("y1", newY);
          
          d3.select(this).attr("cursor", "grabbing");
        })
        .on("end", function(event, d) {
          d3.select(this).classed("dragging", false).attr("cursor", "grab");
        })
    );
    
    // Add hover effects
    keyGroups
      .on("mouseenter", function(event, [key, hash]) {
        d3.select(this).select("circle")
          .transition()
          .duration(100)
          .attr("r", keyRadius * 1.2)
          .attr("stroke-width", 3);
        
        links.filter(d => d[0] === key)
          .transition()
          .duration(100)
          .attr("stroke-width", 3)
          .attr("stroke-opacity", 1);
      })
      .on("mouseleave", function(event, [key, hash]) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", keyRadius)
          .attr("stroke-width", 2);
        
        const serverIndex = hash % self.traditionalServers;
        const wasRelocated = self.traditionalPreviousAssignments[key] !== serverIndex;
        
        links.filter(d => d[0] === key)
          .transition()
          .duration(200)
          .attr("stroke-width", wasRelocated ? 2 : 1)
          .attr("stroke-opacity", 0.7);
      });
  }
  
  renderTraditionalHashTable() {
    if (!this.hasHashTableTarget) return
    
    const tableContainer = this.hashTableTarget
    tableContainer.innerHTML = ""
    
    const table = document.createElement("table")
    table.className = "min-w-full divide-y divide-gray-200 text-sm traditional-hashing-table"
    
    // Create table header
    const thead = document.createElement("thead")
    thead.className = "bg-gray-50"
    
    const headerRow = document.createElement("tr")
    
    const headers = ["Key", "Hash Value", "Calculation", "Server Assignment", "Relocated?"]
    headers.forEach(text => {
      const th = document.createElement("th")
      th.scope = "col"
      th.className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
      th.textContent = text
      headerRow.appendChild(th)
    })
    
    thead.appendChild(headerRow)
    table.appendChild(thead)
    
    // Create table body
    const tbody = document.createElement("tbody")
    tbody.className = "bg-white divide-y divide-gray-200"
    
    // Current assignments
    const currentAssignments = this.getCurrentTraditionalAssignments()
    
    // Add rows for each key
    Object.entries(this.traditionalKeys).forEach(([key, hash], index) => {
      const serverIndex = currentAssignments[key]
      const wasRelocated = this.traditionalPreviousAssignments[key] !== serverIndex
      
      const row = document.createElement("tr")
      row.className = index % 2 === 0 ? "bg-white" : "bg-gray-50"
      
      // Key cell
      const keyCell = document.createElement("td")
      keyCell.className = "px-3 py-2 whitespace-nowrap"
      keyCell.textContent = key
      row.appendChild(keyCell)
      
      // Hash value cell
      const hashCell = document.createElement("td")
      hashCell.className = "px-3 py-2 whitespace-nowrap font-mono text-xs"
      hashCell.textContent = hash
      row.appendChild(hashCell)
      
      // Calculation cell
      const calcCell = document.createElement("td")
      calcCell.className = "px-3 py-2 whitespace-nowrap font-mono text-xs"
      calcCell.innerHTML = `${hash} % ${this.traditionalServers} = <strong>${serverIndex}</strong>`
      row.appendChild(calcCell)
      
      // Server assignment cell
      const serverCell = document.createElement("td")
      serverCell.className = "px-3 py-2 whitespace-nowrap"
      
      const serverBadge = document.createElement("span")
      serverBadge.className = "px-2 py-1 text-xs font-semibold rounded-full text-white"
      serverBadge.style.backgroundColor = this.colors[serverIndex % this.colors.length]
      serverBadge.textContent = `Server ${serverIndex}`
      
      serverCell.appendChild(serverBadge)
      row.appendChild(serverCell)
      
      // Relocated cell
      const relocatedCell = document.createElement("td")
      relocatedCell.className = "px-3 py-2 whitespace-nowrap"
      
      if (wasRelocated) {
        const badge = document.createElement("span")
        badge.className = "px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"
        badge.textContent = "Yes"
        relocatedCell.appendChild(badge)
      } else {
        relocatedCell.textContent = "-"
      }
      
      row.appendChild(relocatedCell)
      
      tbody.appendChild(row)
    })
    
    table.appendChild(tbody)
    tableContainer.appendChild(table)
  }
  
  // Update the statistics displays
  updateStats() {
    if (this.hasServerCountTarget) {
      this.serverCountTarget.textContent = this.traditionalServers
    }
    
    if (this.hasKeyCountTarget) {
      this.keyCountTarget.textContent = Object.keys(this.traditionalKeys).length
    }
    
    if (this.hasKeysRelocatedTarget) {
      this.keysRelocatedTarget.textContent = this.traditionalKeysRelocated
    }
  }
  
  // Helper method to calculate hash
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }
} 
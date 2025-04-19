import { Controller } from "@hotwired/stimulus"
import * as d3 from "d3"

// This Stimulus controller manages the consistent hashing visualization
export default class extends Controller {
  static targets = [
    "vizContainer", "hashTable",
    "serverCount", "keyCount", "virtualNodeCount", "keysRelocated",
    "consistentKeyInput", "hashExplanation"
  ]
  
  static values = {
    demoType: String
  }
  
  connect() {
    console.log("Consistent hashing controller connected for", this.demoTypeValue)
    
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

    // Initialize the demo state appropriate for this instance
    this.initializeState()
    
    // Render visualizations with a small delay to ensure the DOM is ready
    setTimeout(() => {
      if (this.demoTypeValue === "traditional") {
        this.renderTraditionalHashingDemo()
        this.renderTraditionalHashTable()
      } else {
        this.renderConsistentHashingDemo()
        this.renderConsistentHashTable()
      }
    }, 300)
  }
  
  addStyles() {
    // Ensure our custom styles exist
    if (!document.getElementById('consistent-hashing-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'consistent-hashing-styles'
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
        .consistent-hashing-table td {
          padding: 0.85rem 1.25rem;
        }
        
        /* Minimalist table design */
        .consistent-hashing-table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
        }
        
        .consistent-hashing-table thead th {
          position: sticky;
          top: 0;
          background: #f9fafb;
          z-index: 1;
          padding: 0.85rem 1.25rem;
        }
        
        /* Traditional hashing table styles */
        .traditional-hashing-table td {
          padding: 0.85rem 1.25rem;
        }
        
        .traditional-hashing-table thead th {
          padding: 0.85rem 1.25rem;
          position: sticky;
          top: 0;
          background: #f9fafb;
          z-index: 1;
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
    if (this.demoTypeValue === "traditional") {
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
    } else {
      // Consistent hashing state
      this.servers = []
      this.keys = {}
      this.virtualNodesEnabled = true
      this.virtualNodesPerServer = 3
      this.previousAssignments = {}
      this.keysRelocated = 0
      
      // Generate initial servers for consistent hashing
      for (let i = 1; i <= 3; i++) {
        this.addServerInternal(`server${i}`)
      }
      
      // Generate initial keys for consistent hashing
      for (let i = 1; i <= 10; i++) {
        const key = `key${i}`
        const hash = this.hashString(key)
        this.keys[key] = hash
        
        // Calculate initial assignment
        this.previousAssignments[key] = this.findServerForKey(key)
      }
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
  
  // Consistent hashing demo methods
  renderConsistentHashingDemo() {
    const container = this.vizContainerTarget
    container.innerHTML = ""
    
    const width = container.clientWidth || 600
    const height = container.clientHeight || 400
    
    // Use smaller of width/height to ensure circle fits
    const size = Math.min(width, height) - 60
    const centerX = width / 2
    const centerY = height / 2
    const radius = size / 2
    
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${centerX},${centerY})`)
    
    // Draw the hash ring
    svg.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 2)
    
    // Add tick marks around the circle for better visualization of position
    const tickCount = 12
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * 2 * Math.PI - Math.PI / 2
      const x1 = radius * Math.cos(angle)
      const y1 = radius * Math.sin(angle)
      const x2 = (radius + 5) * Math.cos(angle)
      const y2 = (radius + 5) * Math.sin(angle)
      
      svg.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "#d1d5db")
        .attr("stroke-width", 1)
    }
    
    // Get all points on the ring (servers and their virtual nodes)
    const ringPoints = this.getAllRingPoints()
    
    // Map of server IDs to colors
    const serverColors = {}
    this.servers.forEach((server, i) => {
      serverColors[server.id] = this.colors[i % this.colors.length]
    })
    
    // Group for all server nodes
    const serverGroup = svg.append("g").attr("class", "server-nodes")
    
    // Draw server nodes
    serverGroup.selectAll(".server-node")
      .data(ringPoints)
      .enter()
      .append("g")
      .attr("class", "server-node")
      .attr("transform", point => {
        const angle = (point.position / 0xFFFFFFFF) * 2 * Math.PI - Math.PI / 2
        const x = radius * Math.cos(angle)
        const y = radius * Math.sin(angle)
        return `translate(${x},${y})`
      })
      .filter(point => !(point.isVirtual && !this.virtualNodesEnabled))
      .each(function(point) {
        const serverColor = serverColors[point.serverId]
        
        // Server node circle
        d3.select(this)
          .append("circle")
          .attr("r", 0) // Start with radius 0 for animation
          .attr("fill", point.isVirtual ? d3.color(serverColor).brighter(0.5) : serverColor)
          .attr("stroke", d3.color(serverColor).darker(0.5))
          .attr("stroke-width", point.isVirtual ? 1 : 2)
          .attr("opacity", 0) // Start with opacity 0 for animation
          .style("cursor", "pointer")
          .transition()
          .duration(500)
          .attr("r", point.isVirtual ? 5 : 8) // Animate to final size
          .attr("opacity", point.isVirtual ? 0.7 : 1) // Animate to final opacity
          .on("end", function() {
            // Add hover effects after animation
            d3.select(this)
              .on("mouseenter", function() {
                d3.select(this)
                  .transition()
                  .duration(100)
                  .attr("r", point.isVirtual ? 7 : 10)
              })
              .on("mouseleave", function() {
                d3.select(this)
                  .transition()
                  .duration(200)
                  .attr("r", point.isVirtual ? 5 : 8)
              })
          })
        
        // Only add labels for physical nodes
        if (!point.isVirtual) {
          // Calculate angle for label positioning
          const angle = (point.position / 0xFFFFFFFF) * 2 * Math.PI - Math.PI / 2
          const labelRadius = radius + 20
          const labelX = labelRadius * Math.cos(angle)
          const labelY = labelRadius * Math.sin(angle)
          
          // Server label text
          svg.append("text")
            .attr("x", labelX)
            .attr("y", labelY)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "12px")
            .attr("fill", serverColor)
            .attr("font-weight", "bold")
            .attr("opacity", 0) // Start with opacity 0
            .text(point.serverId)
            .transition()
            .duration(500)
            .delay(300)
            .attr("opacity", 1) // Fade in
        }
      })
    
    // Group for all keys
    const keyGroup = svg.append("g").attr("class", "key-nodes")
    
    // Draw keys and their assignments
    keyGroup.selectAll(".key-node")
      .data(Object.entries(this.keys))
      .enter()
      .append("g")
      .attr("class", "key-node")
      .each(function([key, hash]) {
        const angle = (hash / 0xFFFFFFFF) * 2 * Math.PI - Math.PI / 2
        const keyX = (radius - 20) * Math.cos(angle)
        const keyY = (radius - 20) * Math.sin(angle)
        
        // Find the server for this key
        const serverId = this.findServerForKey(key)
        const wasRelocated = this.previousAssignments[key] !== serverId
        
        const serverColor = serverColors[serverId]
        
        // Draw a line from key to server position
        const serverPoint = ringPoints.find(p => p.serverId === serverId && !p.isVirtual)
        if (serverPoint) {
          const serverAngle = (serverPoint.position / 0xFFFFFFFF) * 2 * Math.PI - Math.PI / 2
          const serverX = radius * Math.cos(serverAngle)
          const serverY = radius * Math.sin(serverAngle)
          
          // Line from key to server
          const path = svg.append("path")
            .attr("d", d3.line()
              .x(d => d[0])
              .y(d => d[1])
              .curve(d3.curveBasis)([
                [keyX, keyY],
                [keyX * 0.5 + serverX * 0.5, keyY * 0.5 + serverY * 0.5],
                [serverX, serverY]
              ]))
            .attr("stroke", serverColor)
            .attr("stroke-width", wasRelocated ? 2 : 1)
            .attr("stroke-dasharray", wasRelocated ? "5,5" : "none")
            .attr("stroke-opacity", 0) // Start with opacity 0
            .attr("fill", "none")
            
          path.transition()
            .duration(600)
            .attr("stroke-opacity", 0.7) // Animate to final opacity
        }
        
        // Key circle
        const keyNode = d3.select(this)
          .append("circle")
          .attr("cx", keyX)
          .attr("cy", keyY)
          .attr("r", 0) // Start with radius 0 for animation
          .attr("fill", wasRelocated ? "#fecaca" : "#fee2e2")
          .attr("stroke", serverColor)
          .attr("stroke-width", wasRelocated ? 2 : 1)
          .attr("opacity", 0) // Start with opacity 0
          .attr("data-key", key) // Add data attribute for later reference
          .style("cursor", "pointer")
          .transition()
          .duration(500)
          .delay(function() { return Math.random() * 300; }) // Stagger animations
          .attr("r", 6) // Animate to final size
          .attr("opacity", 1) // Animate to final opacity
          .on("end", function() {
            // Add hover effects after animation
            d3.select(this)
              .on("mouseenter", function() {
                d3.select(this)
                  .transition()
                  .duration(100)
                  .attr("r", 8)
                  .attr("stroke-width", 2)
              })
              .on("mouseleave", function() {
                d3.select(this)
                  .transition()
                  .duration(200)
                  .attr("r", 6)
                  .attr("stroke-width", wasRelocated ? 2 : 1)
              })
          })
        
        // Key label
        d3.select(this)
          .append("text")
          .attr("x", keyX)
          .attr("y", keyY - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("fill", "#333")
          .attr("opacity", 0) // Start with opacity 0
          .attr("data-key", key) // Add data attribute for later reference
          .text(key)
          .transition()
          .duration(500)
          .delay(Math.random() * 300 + 200) // Stagger animations
          .attr("opacity", 1) // Fade in
      }.bind(this))
    
    // Title
    svg.append("text")
      .attr("x", 0)
      .attr("y", -radius - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("opacity", 0) // Start with opacity 0
      .text(`Consistent Hashing Ring${this.virtualNodesEnabled ? " with Virtual Nodes" : ""}`)
      .transition()
      .duration(500)
      .attr("opacity", 1) // Fade in
  }
  
  renderConsistentHashTable() {
    if (!this.hasHashTableTarget) return
    
    const tableContainer = this.hashTableTarget
    tableContainer.innerHTML = ""
    
    const table = document.createElement("table")
    table.className = "min-w-full divide-y divide-gray-200 text-sm consistent-hashing-table"
    
    // Create table header
    const thead = document.createElement("thead")
    thead.className = "bg-gray-50"
    
    const headerRow = document.createElement("tr")
    
    const headers = ["Key", "Hash Position", "Assigned To", "Finding Process", "Relocated?"]
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
    
    // Map of server IDs to colors
    const serverColors = {}
    this.servers.forEach((server, i) => {
      serverColors[server.id] = this.colors[i % this.colors.length]
    })
    
    // Get all points for ringPoints positions
    const ringPoints = this.getAllRingPoints()
    ringPoints.sort((a, b) => a.position - b.position)
    
    // Add rows for each key
    Object.entries(this.keys).forEach(([key, hash], index) => {
      const serverId = this.findServerForKey(key)
      const wasRelocated = this.previousAssignments[key] !== serverId
      
      const row = document.createElement("tr")
      row.className = index % 2 === 0 ? "bg-white" : "bg-gray-50"
      row.setAttribute("data-key", key) // For animation targeting
      
      // Key cell
      const keyCell = document.createElement("td")
      keyCell.className = "px-3 py-2 whitespace-nowrap"
      const keyBadge = document.createElement("span")
      keyBadge.className = "px-2 py-1 text-xs font-semibold rounded-md bg-gray-100"
      keyBadge.textContent = key
      keyCell.appendChild(keyBadge)
      row.appendChild(keyCell)
      
      // Hash position cell
      const hashCell = document.createElement("td")
      hashCell.className = "px-3 py-2 whitespace-nowrap font-mono text-xs"
      const hashValue = document.createElement("span")
      hashValue.className = "p-1 bg-gray-50 border border-gray-200 rounded"
      hashValue.textContent = hash
      hashCell.appendChild(hashValue)
      row.appendChild(hashCell)
      
      // Server assignment cell
      const serverCell = document.createElement("td")
      serverCell.className = "px-3 py-2 whitespace-nowrap"
      
      const serverBadge = document.createElement("span")
      serverBadge.className = "px-2 py-1 text-xs font-semibold rounded-full text-white"
      serverBadge.style.backgroundColor = serverColors[serverId]
      serverBadge.textContent = serverId
      
      serverCell.appendChild(serverBadge)
      row.appendChild(serverCell)
      
      // Finding process cell
      const processCell = document.createElement("td")
      processCell.className = "px-3 py-2 text-xs overflow-x-auto max-w-xs"
      
      // Find the node that's responsible for this key
      let found = false
      let processHTML = '<div class="flex items-center space-x-1 overflow-x-auto pb-1">'
      processHTML += '<span class="whitespace-nowrap">Start at position ' + hash + ' → </span>'
      
      for (const point of ringPoints) {
        if (point.position >= hash) {
          processHTML += `<span class="whitespace-nowrap px-1.5 py-0.5 rounded font-semibold" style="background-color: ${serverColors[point.serverId]}20; color: ${serverColors[point.serverId]}">${point.serverId}${point.isVirtual ? "<sup>v</sup>" : ""}</span>`
          found = true
          break
        } else {
          processHTML += `<span class="whitespace-nowrap px-1.5 py-0.5 rounded text-gray-500" style="background-color: #f3f4f6">${point.serverId}${point.isVirtual ? "<sup>v</sup>" : ""}</span>`
          processHTML += `<span class="text-gray-400">→</span>`
        }
      }
      
      // If we didn't find any node with a higher position, wrap around to the first
      if (!found && ringPoints.length > 0) {
        processHTML += `<span class="whitespace-nowrap text-gray-500">(wrapped)</span>`
        processHTML += `<span class="text-gray-400">→</span>`
        processHTML += `<span class="whitespace-nowrap px-1.5 py-0.5 rounded font-semibold" style="background-color: ${serverColors[ringPoints[0].serverId]}20; color: ${serverColors[ringPoints[0].serverId]}">${ringPoints[0].serverId}${ringPoints[0].isVirtual ? "<sup>v</sup>" : ""}</span>`
      }
      
      processHTML += '</div>'
      
      processCell.innerHTML = processHTML
      row.appendChild(processCell)
      
      // Relocated cell
      const relocatedCell = document.createElement("td")
      relocatedCell.className = "px-3 py-2 whitespace-nowrap"
      
      if (wasRelocated) {
        const badge = document.createElement("span")
        badge.className = "px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"
        badge.textContent = "Yes"
        
        const previousServerBadge = document.createElement("span")
        previousServerBadge.className = "ml-1 px-2 py-0.5 text-xs rounded-md bg-gray-100 text-gray-800"
        previousServerBadge.textContent = `From: ${this.previousAssignments[key] || "None"}`
        
        relocatedCell.appendChild(badge)
        relocatedCell.appendChild(previousServerBadge)
      } else {
        const badge = document.createElement("span")
        badge.className = "px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
        badge.textContent = "No"
        relocatedCell.appendChild(badge)
      }
      
      row.appendChild(relocatedCell)
      
      tbody.appendChild(row)
      
      // Apply fade-in animation to newly added rows
      row.style.opacity = "0"
      setTimeout(() => {
        row.style.transition = "opacity 0.5s ease-in-out"
        row.style.opacity = "1"
      }, 50 * index) // Stagger the animations
    })
    
    table.appendChild(tbody)
    tableContainer.appendChild(table)
  }
  
  // Helper methods for consistent hashing
  addConsistentServer(event) {
    event.preventDefault()
    
    const serverId = `server${this.servers.length + 1}`
    this.addServerInternal(serverId)
    
    this.updateStats()
    this.renderConsistentHashingDemo()
    this.renderConsistentHashTable()
  }
  
  addServerInternal(serverId) {
    // Calculate server's primary hash position
    const serverHash = this.hashString(serverId)
    
    // Store previous assignments to calculate relocations
    this.previousAssignments = {}
    Object.keys(this.keys).forEach(key => {
      this.previousAssignments[key] = this.findServerForKey(key)
    })
    
    // Add server with its virtual nodes
    this.servers.push({
      id: serverId,
      position: serverHash,
      virtualNodes: []
    })
    
    // Add virtual nodes
    for (let i = 0; i < this.virtualNodesPerServer; i++) {
      const virtualNodeId = `${serverId}-vn${i}`
      const virtualNodeHash = this.hashString(virtualNodeId)
      this.servers[this.servers.length - 1].virtualNodes.push({
        id: virtualNodeId,
        position: virtualNodeHash
      })
    }
    
    // Calculate how many keys were relocated
    this.keysRelocated = 0
    Object.keys(this.keys).forEach(key => {
      const newAssignment = this.findServerForKey(key)
      if (this.previousAssignments[key] !== newAssignment) {
        this.keysRelocated++
      }
    })
  }
  
  removeConsistentServer(event) {
    event.preventDefault()
    
    if (this.servers.length <= 1) return
    
    // Store previous assignments to calculate relocations
    this.previousAssignments = {}
    Object.keys(this.keys).forEach(key => {
      this.previousAssignments[key] = this.findServerForKey(key)
    })
    
    // Remove the last server
    this.servers.pop()
    
    // Calculate how many keys were relocated
    this.keysRelocated = 0
    Object.keys(this.keys).forEach(key => {
      const newAssignment = this.findServerForKey(key)
      if (this.previousAssignments[key] !== newAssignment) {
        this.keysRelocated++
      }
    })
    
    this.updateStats()
    this.renderConsistentHashingDemo()
    this.renderConsistentHashTable()
  }
  
  addConsistentKey(event) {
    event.preventDefault()
    
    const keyCount = Object.keys(this.keys).length
    const newKey = `key${keyCount + 1}`
    const hash = this.hashString(newKey)
    
    this.keys[newKey] = hash
    this.keysRelocated = 0 // No relocations when adding a key
    
    this.updateStats()
    this.renderConsistentHashingDemo()
    this.renderConsistentHashTable()
  }
  
  removeConsistentKey(event) {
    event.preventDefault()
    
    const keys = Object.keys(this.keys)
    if (keys.length === 0) return
    
    // Remove the last key
    const lastKey = keys[keys.length - 1]
    delete this.keys[lastKey]
    
    this.keysRelocated = 0 // No relocations when removing a key
    
    this.updateStats()
    this.renderConsistentHashingDemo()
    this.renderConsistentHashTable()
  }
  
  toggleVirtualNodes(event) {
    event.preventDefault()
    
    this.virtualNodesEnabled = !this.virtualNodesEnabled
    this.renderConsistentHashingDemo()
    this.renderConsistentHashTable()
  }
  
  resetConsistent(event) {
    event.preventDefault()
    
    // Clear existing servers and keys
    this.servers = []
    this.keys = {}
    this.previousAssignments = {}
    this.keysRelocated = 0
    
    // Generate initial servers
    for (let i = 1; i <= 3; i++) {
      this.addServerInternal(`server${i}`)
    }
    
    // Generate initial keys
    for (let i = 1; i <= 10; i++) {
      const key = `key${i}`
      const hash = this.hashString(key)
      this.keys[key] = hash
    }
    
    this.updateStats()
    this.renderConsistentHashingDemo()
    this.renderConsistentHashTable()
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
  
  // Get all points on the ring (servers and virtual nodes)
  getAllRingPoints() {
    const points = []
    
    this.servers.forEach(server => {
      // Add the server itself
      points.push({
        serverId: server.id,
        position: server.position,
        isVirtual: false
      })
      
      // Add virtual nodes
      server.virtualNodes.forEach(vn => {
        points.push({
          serverId: server.id,
          position: vn.position,
          isVirtual: true
        })
      })
    })
    
    return points
  }
  
  // Find the server responsible for a key
  findServerForKey(key) {
    const keyHash = this.keys[key]
    const ringPoints = this.getAllRingPoints()
    
    if (ringPoints.length === 0) return null
    
    // Sort the ring points by position
    ringPoints.sort((a, b) => a.position - b.position)
    
    // Find the first point with position greater than keyHash
    for (const point of ringPoints) {
      if (point.position >= keyHash) {
        return point.serverId
      }
    }
    
    // If no point has greater position, wrap around to the first point
    return ringPoints[0].serverId
  }
  
  // Update the statistics displays
  updateStats() {
    if (this.demoTypeValue === "traditional") {
      if (this.hasServerCountTarget) {
        this.serverCountTarget.textContent = this.traditionalServers
      }
      
      if (this.hasKeyCountTarget) {
        this.keyCountTarget.textContent = Object.keys(this.traditionalKeys).length
      }
      
      if (this.hasKeysRelocatedTarget) {
        this.keysRelocatedTarget.textContent = this.traditionalKeysRelocated
      }
    } else {
      if (this.hasServerCountTarget) {
        this.serverCountTarget.textContent = this.servers.length
      }
      
      if (this.hasKeyCountTarget) {
        this.keyCountTarget.textContent = Object.keys(this.keys).length
      }
      
      if (this.hasVirtualNodeCountTarget) {
        this.virtualNodeCountTarget.textContent = this.virtualNodesPerServer
      }
      
      if (this.hasKeysRelocatedTarget) {
        this.keysRelocatedTarget.textContent = this.keysRelocated
      }
    }
  }
  
  addKeyConsistent() {
    const keyInput = this.consistentKeyInputTarget.value.trim()
    if (!keyInput) return
    
    const key = keyInput
    
    if (this.keys[key]) {
      alert(`Key "${key}" already exists!`)
      return
    }
    
    // Calculate the hash value
    const hash = this.hashString(key)
    this.keys[key] = hash
    
    // Store the previous assignment as null (new key)
    this.previousAssignments[key] = null
    
    // Find server for this key and count it as a new assignment
    const serverId = this.findServerForKey(key)
    
    // Show the hash calculation process
    this.showHashCalculation(key, hash, serverId)
    
    this.consistentKeyInputTarget.value = ""
    
    // Update the visualization with smooth transitions
    this.renderConsistentHashingDemo()
    this.renderConsistentHashTable()
    this.updateStats()
    
    // Add a subtle highlight effect to the newly added key
    setTimeout(() => {
      const keyElements = document.querySelectorAll(`.key-node [data-key="${key}"]`)
      keyElements.forEach(el => {
        el.classList.add('highlight-new')
        setTimeout(() => el.classList.remove('highlight-new'), 1500)
      })
    }, 100)
  }
  
  showHashCalculation(key, hash, serverId) {
    if (!this.hasHashExplanationTarget) return
    
    const explanationContainer = this.hashExplanationTarget
    explanationContainer.innerHTML = ""
    explanationContainer.className = "mb-6 bg-white rounded-lg shadow-sm p-5 border border-gray-200"
    
    const title = document.createElement("h3")
    title.className = "font-medium text-gray-900 mb-4"
    title.textContent = `Hash Calculation Process for Key "${key}"`
    explanationContainer.appendChild(title)
    
    // Show hash calculation steps
    const steps = document.createElement("div")
    steps.className = "space-y-4 text-sm"
    
    // Step 1: Generate hash
    const step1 = document.createElement("div")
    step1.className = "flex items-start"
    
    const step1Number = document.createElement("span")
    step1Number.className = "flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3"
    step1Number.textContent = "1"
    
    const step1Text = document.createElement("div")
    step1Text.innerHTML = `
      <p class="font-medium">Generate hash for key "${key}"</p>
      <div class="mt-2 font-mono bg-gray-50 p-3 rounded border border-gray-200">
        <span class="text-purple-600">hash</span>(<span class="text-green-600">"${key}"</span>) = <span class="font-semibold">${hash}</span>
      </div>
    `
    
    step1.appendChild(step1Number)
    step1.appendChild(step1Text)
    steps.appendChild(step1)
    
    // Step 2: Search on the ring
    const step2 = document.createElement("div")
    step2.className = "flex items-start"
    
    const step2Number = document.createElement("span")
    step2Number.className = "flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3"
    step2Number.textContent = "2"
    
    const step2Text = document.createElement("div")
    const ringPoints = this.getAllRingPoints()
    ringPoints.sort((a, b) => a.position - b.position)
    
    let searchProcess = 'Start searching clockwise from position ' + hash + ' on the ring<br>'
    searchProcess += '<div class="mt-2 overflow-x-auto">'
    
    // Map of server IDs to colors
    const serverColors = {}
    this.servers.forEach((server, i) => {
      serverColors[server.id] = this.colors[i % this.colors.length]
    })
    
    let found = false
    
    for (const point of ringPoints) {
      if (point.position >= hash) {
        searchProcess += `Found server <span class="px-1.5 py-0.5 rounded font-semibold" style="background-color: ${serverColors[point.serverId]}20; color: ${serverColors[point.serverId]}">${point.serverId}</span> at position ${point.position}`
        found = true
        break
      }
    }
    
    if (!found && ringPoints.length > 0) {
      searchProcess += `Reached end of ring, wrapping around to server <span class="px-1.5 py-0.5 rounded font-semibold" style="background-color: ${serverColors[ringPoints[0].serverId]}20; color: ${serverColors[ringPoints[0].serverId]}">${ringPoints[0].serverId}</span> at position ${ringPoints[0].position}`
    }
    
    searchProcess += '</div>'
    
    step2Text.innerHTML = `
      <p class="font-medium">Search clockwise on the hash ring</p>
      <div class="mt-2 text-xs bg-gray-50 p-3 rounded border border-gray-200">
        ${searchProcess}
      </div>
    `
    
    step2.appendChild(step2Number)
    step2.appendChild(step2Text)
    steps.appendChild(step2)
    
    // Step 3: Assignment
    const step3 = document.createElement("div")
    step3.className = "flex items-start"
    
    const step3Number = document.createElement("span")
    step3Number.className = "flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3"
    step3Number.textContent = "3"
    
    const step3Text = document.createElement("div")
    step3Text.innerHTML = `
      <p class="font-medium">Assign key to server</p>
      <div class="mt-2 bg-gray-50 p-3 rounded border border-gray-200">
        Key <span class="px-2 py-0.5 bg-gray-100 rounded">${key}</span> is assigned to server 
        <span class="px-2 py-0.5 rounded font-semibold text-white" style="background-color: ${serverColors[serverId]}">${serverId}</span>
      </div>
    `
    
    step3.appendChild(step3Number)
    step3.appendChild(step3Text)
    steps.appendChild(step3)
    
    explanationContainer.appendChild(steps)
  }
} 
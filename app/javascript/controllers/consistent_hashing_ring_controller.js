import { Controller } from "@hotwired/stimulus"
import * as d3 from "d3"

// Stimulus controller for consistent hashing ring visualization
export default class extends Controller {
  static targets = [
    "vizContainer", "hashTable", "hashExplanation",
    "consistentKeyInput", "addServerBtn", "removeServerBtn", "addKeyBtn", 
    "removeKeyBtn", "resetBtn", "toggleVirtualNodesBtn"
  ]
  
  connect() {
    console.log("Consistent hashing ring controller connected")
    
    // Server color scheme
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
    ].map(color => d3.color(color).formatHex())
    
    // Add CSS for animations
    this.addStyles()

    // Initialize the demo state
    this.initializeState()
    
    // Render visualizations with a small delay to ensure the DOM is ready
    setTimeout(() => {
      try {
        this.renderConsistentHashingRing()
        this.renderConsistentHashTable()
      } catch (e) {
        console.error("Error initializing visualization:", e)
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
        
        /* Consistent hashing specific styles */
        .hash-ring path {
          stroke: #aaa;
          stroke-width: 2px;
          fill: none;
        }
        
        .hash-tick {
          stroke: #ccc;
          stroke-width: 1px;
        }
        
        .server-node rect {
          stroke-width: 1px;
          stroke: #000;
        }
        
        .virtual-node circle {
          stroke-width: 1px;
          stroke: #000;
          opacity: 0.8;
        }
        
        .key-node circle {
          stroke-width: 0;
          stroke: none;
          fill: #000;
        }
        
        .key-label {
          font-size: 10px;
          text-anchor: middle;
          pointer-events: none;
          fill: #000;
          font-weight: 500;
        }
        
        .server-label, .virtual-label {
          font-size: 10px;
          text-anchor: middle;
          pointer-events: none;
          fill: #333;
        }
        
        .hash-label {
          font-size: 9px;
          fill: #999;
        }
        
        .assignment-line {
          stroke: #999;
          stroke-width: 1px;
          stroke-dasharray: 3,3;
        }
        
        /* Hash table styles */
        .consistent-hash-table {
          border-collapse: collapse;
          width: 100%;
          font-size: 0.875rem;
          border: 1px solid #e5e7eb;
        }
        
        .consistent-hash-table th {
          background-color: #f3f4f6;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.75rem 1.5rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .consistent-hash-table td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
        
        .consistent-hash-table tr:hover {
          background-color: #f9fafb;
        }
        
        .hash-value {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          color: #374151;
        }
      `
      document.head.appendChild(styleEl)
    }
  }
  
  initializeState() {
    // Consistent hashing state
    this.consistentServers = []
    this.consistentKeys = {}
    this.virtualNodesEnabled = true
    this.virtualNodesPerServer = 3
    this.keysRelocated = 0
    this.previousAssignments = {}
    this.hashRange = 1000 // Reduced from Math.pow(2, 32) to 1000 for simpler visualization
    
    // Add initial servers (2 by default)
    for (let i = 1; i <= 2; i++) {
      this.addServer(`server${i}`)
    }
    
    // Add initial keys (5 by default with evenly distributed values)
    const keyHashes = [115, 309, 566, 720, 956]
    keyHashes.forEach((hash, index) => {
      const keyId = `key-${index + 1}`
      this.addKey(keyId, hash)
    })
  }
  
  // Helper method to generate consistent hash - simplified for demo
  hashString(str) {
    // Simplified hash function for more predictable visualization
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    // Get absolute value and ensure it's within our hash range
    return Math.abs(hash) % this.hashRange
  }
  
  // Add a server to the ring
  addServer(serverId) {
    // Record previous assignments before adding the server
    this.previousAssignments = this.getCurrentAssignments()
    
    const serverIndex = this.consistentServers.length
    const serverColor = this.colors[serverIndex % this.colors.length]
    
    // Calculate a better distributed hash for the server - more evenly spaced
    const basePosition = (serverIndex * (this.hashRange / 6)) % this.hashRange
    // Add minimal randomness to avoid exact collision
    const jitter = Math.floor((Math.random() * 0.1 - 0.05) * (this.hashRange / 10))
    const serverHash = (basePosition + jitter + this.hashRange) % this.hashRange
    
    const server = {
      id: serverId || `server${serverIndex + 1}`,
      color: serverColor,
      hash: serverHash,
      virtualNodes: []
    }
    
    // Add virtual nodes if enabled
    if (this.virtualNodesEnabled) {
      this.addVirtualNodesToServer(server)
    }
    
    this.consistentServers.push(server)
    
    // Recalculate key assignments and count relocations
    this.keysRelocated = this.countRelocations()
    
    return server
  }
  
  // Add virtual nodes to a server with uniform distribution
  addVirtualNodesToServer(server) {
    server.virtualNodes = []
    
    // Create evenly distributed virtual nodes across the entire ring
    for (let i = 0; i < this.virtualNodesPerServer; i++) {
      // Calculate offset to ensure better distribution
      // Use server id and virtual node index to create a unique but deterministic hash
      const vnodeId = `${server.id}-vn${i+1}`
      
      // Distribute virtual nodes uniformly around the whole ring
      // Each server will have its virtual nodes distributed at even intervals
      const ringSegment = this.hashRange / (this.consistentServers.length + 1) / this.virtualNodesPerServer
      const baseAngle = (server.hash + i * ringSegment * 2.5) % this.hashRange
      
      // Add some jitter to prevent exact alignment
      const jitter = Math.floor((Math.random() * 0.1) * ringSegment)
      const vnodeHash = (baseAngle + jitter) % this.hashRange
      
      server.virtualNodes.push({
        id: vnodeId,
        hash: vnodeHash
      })
    }
  }
  
  // Add a key to the ring
  addKey(keyId, specifiedHash = null) {
    // Use specified hash if provided, otherwise calculate from key name
    const hash = specifiedHash !== null ? specifiedHash : this.hashString(keyId)
    this.consistentKeys[keyId] = hash
    
    // Record previous assignments before adding the new key
    this.previousAssignments = this.getCurrentAssignments()
    
    return { id: keyId, hash }
  }
  
  // Remove a server from the ring
  removeServer(serverId) {
    const serverIndex = this.consistentServers.findIndex(server => server.id === serverId)
    if (serverIndex !== -1) {
      // Record previous assignments before removing
      this.previousAssignments = this.getCurrentAssignments()
      
      // Remove the server
      this.consistentServers.splice(serverIndex, 1)
      
      // Recalculate key assignments and count relocations
      this.keysRelocated = this.countRelocations()
    }
  }
  
  // Remove a key from the ring
  removeKey(keyId) {
    if (this.consistentKeys[keyId]) {
      // Record previous assignments before removing
      this.previousAssignments = this.getCurrentAssignments()
      
      // Remove the key
      delete this.consistentKeys[keyId]
    }
  }
  
  // Toggle virtual nodes
  toggleVirtualNodes() {
    this.virtualNodesEnabled = !this.virtualNodesEnabled
    
    // Record previous assignments before toggling
    this.previousAssignments = this.getCurrentAssignments()
    
    // Update virtual nodes for all servers
    this.consistentServers.forEach(server => {
      if (this.virtualNodesEnabled) {
        // Add virtual nodes with uniform distribution
        this.addVirtualNodesToServer(server)
      } else {
        // Remove virtual nodes
        server.virtualNodes = []
      }
    })
    
    // Recalculate key assignments and count relocations
    this.keysRelocated = this.countRelocations()
    
    // Update the visualization
    this.renderConsistentHashingRing()
    this.renderConsistentHashTable()
  }
  
  // Get current key to server assignments
  getCurrentAssignments() {
    const assignments = {}
    
    for (const [keyId, keyHash] of Object.entries(this.consistentKeys)) {
      const assignedServer = this.getServerForKey(keyId, keyHash)
      if (assignedServer) {
        assignments[keyId] = assignedServer.id
      }
    }
    
    return assignments
  }
  
  // Count how many keys were relocated after a change
  countRelocations() {
    let count = 0
    const currentAssignments = this.getCurrentAssignments()
    
    for (const [keyId, serverId] of Object.entries(currentAssignments)) {
      // Check if key existed before and has a different server assignment now
      if (this.previousAssignments[keyId] && this.previousAssignments[keyId] !== serverId) {
        count++
      }
    }
    
    return count
  }
  
  // Find which server a key is assigned to
  getServerForKey(keyId, keyHash) {
    if (this.consistentServers.length === 0) return null
    
    // Get all node positions on the ring (servers and virtual nodes)
    const allNodes = []
    
    this.consistentServers.forEach(server => {
      // Add the server itself if no virtual nodes
      if (!this.virtualNodesEnabled) {
        allNodes.push({
          hash: server.hash,
          server: server,
          isVirtual: false
        })
      }
      
      // Add virtual nodes if enabled
      if (this.virtualNodesEnabled) {
        server.virtualNodes.forEach(vNode => {
          allNodes.push({
            hash: vNode.hash,
            server: server,
            isVirtual: true,
            virtualNodeId: vNode.id
          })
        })
      }
    })
    
    // Sort nodes by hash value
    allNodes.sort((a, b) => a.hash - b.hash)
    
    // Find the first node that is >= the key hash
    for (const node of allNodes) {
      if (node.hash >= keyHash) {
        return node.server
      }
    }
    
    // If no node with higher hash is found, wrap around to the first node
    return allNodes[0]?.server || null
  }
  
  // Get explanation of hash assignment for a key
  getHashAssignmentExplanation(keyId, keyHash) {
    if (this.consistentServers.length === 0) return "No servers available"
    
    // Get all node positions on the ring
    const allNodes = []
    
    this.consistentServers.forEach(server => {
      if (!this.virtualNodesEnabled) {
        allNodes.push({
          hash: server.hash,
          serverId: server.id,
          isVirtual: false
        })
      }
      
      if (this.virtualNodesEnabled) {
        server.virtualNodes.forEach(vNode => {
          allNodes.push({
            hash: vNode.hash,
            serverId: server.id,
            isVirtual: true,
            virtualNodeId: vNode.id
          })
        })
      }
    })
    
    // Sort nodes by hash value
    allNodes.sort((a, b) => a.hash - b.hash)
    
    // Find the assignment
    let assignedNode = null
    for (const node of allNodes) {
      if (node.hash >= keyHash) {
        assignedNode = node
        break
      }
    }
    
    // If no node with higher hash found, wrap around
    if (!assignedNode) {
      assignedNode = allNodes[0]
    }
    
    // Generate explanation
    if (assignedNode) {
      if (assignedNode.isVirtual) {
        return `Hash ${keyHash} is assigned to ${assignedNode.serverId} via virtual node at position ${assignedNode.hash}`
      } else {
        return `Hash ${keyHash} is assigned to ${assignedNode.serverId} at position ${assignedNode.hash}`
      }
    }
    
    return "Error determining assignment"
  }
  
  // Render the consistent hashing ring visualization
  renderConsistentHashingRing() {
    const container = this.vizContainerTarget
    container.innerHTML = ""
    
    const width = container.clientWidth
    const height = container.clientHeight
    const margin = { top: 50, right: 20, bottom: 50, left: 20 }
    
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width/2},${height/2})`)
    
    const radius = Math.min(width, height) / 2 - Math.max(margin.top, margin.right, margin.bottom, margin.left)
    
    // Draw the hash ring circle more visibly
    svg.append("circle")
      .attr("class", "hash-ring")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 2)
    
    // Add tick marks for the hash range - only 8 ticks for cleaner look
    const numTicks = 8
    for (let i = 0; i < numTicks; i++) {
      const angle = (i / numTicks) * 2 * Math.PI
      const x1 = (radius - 5) * Math.sin(angle)
      const y1 = -(radius - 5) * Math.cos(angle)
      const x2 = (radius + 5) * Math.sin(angle)
      const y2 = -(radius + 5) * Math.cos(angle)
      
      svg.append("line")
        .attr("class", "hash-tick")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
      
      // Add hash position labels
      const hashValue = Math.floor((i / numTicks) * this.hashRange)
      const labelRadius = radius + 20
      const labelX = labelRadius * Math.sin(angle)
      const labelY = -labelRadius * Math.cos(angle)
      
      svg.append("text")
        .attr("class", "hash-label")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("dy", "0.3em")
        .text(hashValue)
    }
    
    // Create object to track node positions by hash
    const nodePositions = new Map()
    
    // Store server positions but don't draw them
    this.consistentServers.forEach((server, serverIndex) => {
      const angle = (server.hash / this.hashRange) * 2 * Math.PI
      const nodeX = radius * Math.sin(angle)
      const nodeY = -radius * Math.cos(angle)
      
      // Store node position
      nodePositions.set(server.hash, { x: nodeX, y: nodeY, serverId: server.id, isServer: true })
    })
    
    // Plot virtual nodes if enabled
    if (this.virtualNodesEnabled) {
      this.consistentServers.forEach(server => {
        server.virtualNodes.forEach(vNode => {
          const angle = (vNode.hash / this.hashRange) * 2 * Math.PI
          const nodeX = radius * Math.sin(angle)
          const nodeY = -radius * Math.cos(angle)
          
          // Store node position
          nodePositions.set(vNode.hash, { x: nodeX, y: nodeY, serverId: server.id, isVirtual: true })
          
          // Draw virtual node as a circle
          const nodeRadius = 6
          svg.append("g")
            .attr("class", "virtual-node")
            .attr("transform", `translate(${nodeX},${nodeY})`)
            .append("circle")
            .attr("r", nodeRadius)
            .attr("fill", server.color)
            .attr("stroke", "#000")
            .attr("stroke-width", 1)
        })
      })
    }
    
    // Plot keys on the ring as simple black dots with drag functionality
    const keyEntries = Object.entries(this.consistentKeys)
    const self = this // Store reference to controller for use in callbacks
    
    keyEntries.forEach(([keyId, keyHash], keyIndex) => {
      const angle = (keyHash / this.hashRange) * 2 * Math.PI
      const keyX = radius * Math.sin(angle)
      const keyY = -radius * Math.cos(angle)
      
      // Get assigned server for the key
      const assignedServer = this.getServerForKey(keyId, keyHash)
      
      // Create a group for the key and its label
      const keyGroup = svg.append("g")
        .attr("class", "key-node")
        .attr("transform", `translate(${keyX},${keyY})`)
        .attr("cursor", "grab")
      
      // Draw key node (smaller black dot)
      const keyRadius = 3.5
      keyGroup.append("circle")
        .attr("r", keyRadius)
        .attr("fill", "#000") // Simple black dot
      
      // Add key label with improved visibility
      // Calculate position for the label to be a bit further from the node
      const labelDistance = 12
      const labelX = 0
      const labelY = labelDistance
      
      // Add white background rectangle for better readability
      const label = keyGroup.append("text")
        .attr("class", "key-label")
        .attr("x", labelX)
        .attr("y", labelY)
        .text(keyHash) // Show hash value instead of key name
      
      // Get the bounding box of the text
      const bbox = label.node().getBBox()
      
      // Add a white background with a small padding
      keyGroup.insert("rect", "text")
        .attr("x", bbox.x - 2)
        .attr("y", bbox.y - 1)
        .attr("width", bbox.width + 4)
        .attr("height", bbox.height + 2)
        .attr("fill", "white")
        .attr("fill-opacity", 0.7)
        .attr("rx", 2)
      
      // Move the text to the front
      label.raise()
      
      // Add drag behavior to the key
      const dragHandler = d3.drag()
        .on("start", function(event) {
          d3.select(this).attr("cursor", "grabbing").classed("dragging", true)
        })
        .on("drag", function(event) {
          // Get the current position relative to the center
          const currentX = event.x
          const currentY = event.y
          
          // Calculate angle from center
          // In D3's coordinate system, 0 is at the top and angles go clockwise
          let angle = Math.atan2(currentX, -currentY)
          
          // Normalize angle to be between 0 and 2π
          if (angle < 0) angle += 2 * Math.PI
          
          // Convert angle to hash value (0 to hashRange)
          const newHash = Math.floor((angle / (2 * Math.PI)) * self.hashRange)
          
          // Update the hash value for this key
          self.consistentKeys[keyId] = newHash
          
          // Calculate new position on the circle using the same math as the initial placement
          const newX = radius * Math.sin(angle)
          const newY = -radius * Math.cos(angle)
          
          // Update position
          d3.select(this).attr("transform", `translate(${newX},${newY})`)
          
          // Update the label text with new hash
          d3.select(this).select("text").text(newHash)
        })
        .on("end", function(event) {
          d3.select(this).attr("cursor", "grab").classed("dragging", false)
          
          // Recalculate assignments
          self.previousAssignments = self.getCurrentAssignments()
          
          // Update the hash table to reflect changes
          self.renderConsistentHashTable()
        })
      
      // Apply drag behavior to the key group
      dragHandler(keyGroup)
    })
    
    // Create a server legend in the corner
    this.createServerLegend(svg, width, height)
  }
  
  // Create a legend showing server colors in the corner
  createServerLegend(svg, width, height) {
    const legendG = svg.append("g")
      .attr("class", "server-legend")
      .attr("transform", `translate(${-width/2 + 20}, ${-height/2 + 30})`)
    
    // Create a background for the legend
    legendG.append("rect")
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", 110)
      .attr("height", this.consistentServers.length * 25 + 10)
      .attr("fill", "white")
      .attr("fill-opacity", 0.9)
      .attr("rx", 5)
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1)
    
    // Add server items to the legend
    this.consistentServers.forEach((server, i) => {
      const itemG = legendG.append("g")
        .attr("transform", `translate(0, ${i * 25})`)
      
      // Add server square
      itemG.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 1)
        .attr("fill", server.color)
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
      
      // Add server label
      itemG.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .attr("font-size", "12px")
        .attr("fill", "#333")
        .text(server.id)
    })
  }
  
  // Render hash table showing server assignments
  renderConsistentHashTable() {
    const container = this.hashTableTarget
    if (!container) return
    
    container.innerHTML = ''
    
    // Create table structure - use the same HTML structure as traditional hashing
    const table = document.createElement('table')
    table.className = 'min-w-full divide-y divide-gray-200'
    
    // Create header
    const thead = document.createElement('thead')
    thead.className = 'bg-gray-50'
    const headerRow = document.createElement('tr')
    
    // Create column headers with same styling as traditional hashing
    const headers = ["HASH VALUE", "SERVER ASSIGNMENT", "RELOCATED?"]
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
    const tbody = document.createElement('tbody')
    tbody.className = 'bg-white divide-y divide-gray-200'
    
    // Convert to array of [keyId, hash] entries and sort by hash
    const hashEntries = Object.entries(this.consistentKeys)
      .map(([keyId, hash]) => ({ keyId, hash }))
      .sort((a, b) => a.hash - b.hash)
    
    // If no keys exist, show a message
    if (hashEntries.length === 0) {
      const emptyRow = document.createElement('tr')
      const emptyCell = document.createElement('td')
      emptyCell.colSpan = 3
      emptyCell.className = 'px-3 py-4 text-sm text-gray-500 text-center'
      emptyCell.textContent = 'Add hash values to see them here'
      emptyRow.appendChild(emptyCell)
      tbody.appendChild(emptyRow)
    } else {
      // Create rows for each key
      hashEntries.forEach(({ keyId, hash }, index) => {
        const row = document.createElement('tr')
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        
        // Hash value cell
        const hashCell = document.createElement('td')
        hashCell.className = 'px-3 py-2 whitespace-nowrap text-sm text-gray-900'
        hashCell.textContent = hash
        
        // Server assignment cell
        const serverCell = document.createElement('td')
        serverCell.className = 'px-3 py-2 whitespace-nowrap text-sm text-gray-500'
        const assignedServer = this.getServerForKey(keyId, hash)
        
        if (assignedServer) {
          const serverIndex = parseInt(assignedServer.id.replace('server', '')) - 1
          const serverBadge = document.createElement('span')
          serverBadge.className = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white'
          serverBadge.style.backgroundColor = assignedServer.color
          serverBadge.textContent = `Server ${serverIndex}`
          serverCell.appendChild(serverBadge)
        } else {
          serverCell.textContent = 'None'
        }
        
        // Relocated cell
        const relocatedCell = document.createElement('td')
        relocatedCell.className = 'px-3 py-2 whitespace-nowrap text-sm text-gray-500'
        const wasRelocated = this.previousAssignments[keyId] && 
                          this.previousAssignments[keyId] !== assignedServer?.id
        
        if (wasRelocated) {
          const badge = document.createElement("span")
          badge.className = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800"
          badge.textContent = "Yes"
          relocatedCell.appendChild(badge)
        } else {
          relocatedCell.textContent = "-"
        }

        row.appendChild(hashCell)
        row.appendChild(serverCell)
        row.appendChild(relocatedCell)
        
        tbody.appendChild(row)
      })
    }
    
    table.appendChild(tbody)
    
    // Replace existing table
    container.appendChild(table)
    
    // Update hash explanation
    this.updateHashExplanation()
  }
  
  // Update the hash explanation for a randomly selected key
  updateHashExplanation() {
    const container = this.hashExplanationTarget
    
    // Select a random key to explain
    const keyIds = Object.keys(this.consistentKeys)
    if (keyIds.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">Add some hash values to see assignment explanation.</p>'
      return
    }
    
    const randomKey = keyIds[Math.floor(Math.random() * keyIds.length)]
    const keyHash = this.consistentKeys[randomKey]
    
    // Get explanation
    const explanation = this.getHashAssignmentExplanation(randomKey, keyHash)
    
    // Create explanation display
    container.innerHTML = `
      <p class="text-sm bg-gray-50 p-3 rounded-md">
        <span class="font-medium">Hash Assignment Example:</span> ${explanation}
      </p>
    `
  }
  
  // Stimulus action methods
  addConsistentServer(event) {
    event.preventDefault()
    
    // Create a new server with auto-generated ID
    const serverId = `server${this.consistentServers.length + 1}`
    this.addServer(serverId)
    
    this.renderConsistentHashingRing()
    this.renderConsistentHashTable()
  }
  
  removeConsistentServer(event) {
    event.preventDefault()
    
    if (this.consistentServers.length <= 1) return
    
    // Remove the last server
    const lastServer = this.consistentServers[this.consistentServers.length - 1]
    this.removeServer(lastServer.id)
    
    this.renderConsistentHashingRing()
    this.renderConsistentHashTable()
  }
  
  addKeyConsistent(event) {
    event.preventDefault()
    
    // Get input from text field
    let input = this.consistentKeyInputTarget.value.trim()
    let specifiedHash = null
    let keyId = ''
    
    if (!input) {
      // Generate a random hash if nothing provided
      specifiedHash = Math.floor(Math.random() * this.hashRange)
      keyId = `key-${Date.now().toString().slice(-6)}`
    } else {
      // Try parsing as direct hash value first
      const hashValue = parseInt(input, 10)
      if (!isNaN(hashValue) && hashValue >= 0 && hashValue < this.hashRange) {
        // Input is a valid hash value
        specifiedHash = hashValue
        keyId = `key-${Date.now().toString().slice(-6)}`
      } 
      // Fall back to treating it as a key name
      else {
        keyId = input
      }
    }
    
    // Check if key already exists
    if (this.consistentKeys[keyId]) {
      // Add a suffix to make it unique
      keyId = `key-${Date.now().toString().slice(-6)}`
    }
    
    // Record previous assignments before adding new key
    this.previousAssignments = this.getCurrentAssignments()
    
    this.addKey(keyId, specifiedHash)
    
    // Clear input
    this.consistentKeyInputTarget.value = ''
    
    // Recalculate relocations just to be sure
    this.keysRelocated = this.countRelocations()
    
    this.renderConsistentHashingRing()
    this.renderConsistentHashTable()
  }
  
  removeConsistentKey(event) {
    event.preventDefault()
    
    const keyIds = Object.keys(this.consistentKeys)
    if (keyIds.length === 0) return
    
    // Remove the last added key
    const lastKey = keyIds[keyIds.length - 1]
    this.removeKey(lastKey)
    
    this.renderConsistentHashingRing()
    this.renderConsistentHashTable()
  }
  
  resetConsistent(event) {
    event.preventDefault()
    
    this.initializeState()
    
    this.renderConsistentHashingRing()
    this.renderConsistentHashTable()
  }
} 
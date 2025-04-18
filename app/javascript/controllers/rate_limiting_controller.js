import { Controller } from "@hotwired/stimulus"

// This Stimulus controller enhances the rate limiting UI experience
export default class extends Controller {
  connect() {
    console.log("Rate limiting controller connected")
  }
  
  // These methods add visual feedback during form submission
  
  makeRequest(event) {
    const button = event.currentTarget
    button.classList.add("animate-pulse")
    button.disabled = true
    
    // Re-enable after response is received or 2 seconds
    setTimeout(() => {
      button.classList.remove("animate-pulse")
      button.disabled = false
    }, 2000)
  }
  
  resetCounter(event) {
    const button = event.currentTarget
    button.classList.add("animate-pulse")
    button.disabled = true
    
    // Re-enable after response is received or 2 seconds
    setTimeout(() => {
      button.classList.remove("animate-pulse")
      button.disabled = false
    }, 2000)
  }
} 
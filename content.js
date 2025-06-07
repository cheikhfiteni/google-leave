// Google Meet Auto Leave Extension - Content Script

let recognition = null;
let isListening = false;
let isEnabled = true;
let leaveTimeout = null;

// Default phrases that trigger leaving
const defaultPhrases = [
  'great meeting you bye',
  'talk to you later',
  'see you later',
  'have a good day',
  'thanks everyone bye',
  'alright bye everyone',
  'catch you later',
  'bye bye'
];

// Initialize when page loads
function init() {
  console.log('Google Meet Auto Leave: Initializing...');
  
  // Wait for meet to fully load
  setTimeout(() => {
    if (isInMeeting()) {
      startListening();
    }
  }, 3000);
  
  // Watch for meeting state changes
  observeMeetingState();
}

// Check if user is currently in a meeting
function isInMeeting() {
  const meetingIndicators = [
    '[data-tooltip*="Leave call"]',
    '[aria-label*="Leave call"]',
    'button[jsname="CQylAd"]',
    '[data-call-end="true"]'
  ];
  
  return meetingIndicators.some(selector => document.querySelector(selector));
}

// Start speech recognition
function startListening() {
  if (!isEnabled || isListening || !('webkitSpeechRecognition' in window)) {
    return;
  }
  
  try {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      isListening = true;
      console.log('Google Meet Auto Leave: Listening started');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('Heard:', transcript);
      
      // Check if any trigger phrase is detected
      if (defaultPhrases.some(phrase => transcript.includes(phrase))) {
        console.log('Trigger phrase detected:', transcript);
        initiateLeaveSequence();
      }
    };
    
    recognition.onerror = (event) => {
      console.log('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        showNotification('Microphone access denied. Please allow microphone access and refresh the page.');
      }
      isListening = false;
    };
    
    recognition.onend = () => {
      isListening = false;
      // Restart if still in meeting and enabled
      if (isInMeeting() && isEnabled) {
        setTimeout(startListening, 1000);
      }
    };
    
    recognition.start();
  } catch (error) {
    console.error('Speech recognition setup failed:', error);
  }
}

// Stop speech recognition
function stopListening() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  isListening = false;
}

// Initiate the leave sequence with countdown
function initiateLeaveSequence() {
  if (leaveTimeout) {
    clearTimeout(leaveTimeout);
  }
  
  showCountdown(5);
  
  leaveTimeout = setTimeout(() => {
    leaveMeeting();
  }, 5000);
}

// Cancel the leave sequence
function cancelLeaveSequence() {
  if (leaveTimeout) {
    clearTimeout(leaveTimeout);
    leaveTimeout = null;
  }
  hideCountdown();
}

// Find and click the leave button
function leaveMeeting() {
  console.log('Attempting to leave meeting...');
  
  const leaveButton = findLeaveButton();
  if (leaveButton) {
    leaveButton.click();
    
    // Wait for confirmation dialog and click it
    setTimeout(() => {
      const confirmButton = findConfirmButton();
      if (confirmButton) {
        confirmButton.click();
        console.log('Meeting left successfully');
      }
    }, 1000);
  } else {
    console.log('Leave button not found');
    showNotification('Could not find leave button');
  }
}

// Find the main leave button with multiple fallback strategies
function findLeaveButton() {
  const selectors = [
    '[data-tooltip*="Leave call"]',
    '[aria-label*="Leave call"]',
    'button[jsname="CQylAd"]',
    '[data-call-end="true"]',
    'button[data-promo-anchor-id="leave-call"]'
  ];
  
  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button && isElementVisible(button)) {
      return button;
    }
  }
  
  // Fallback: look for red phone icon buttons
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const style = getComputedStyle(button);
    const hasRedBg = style.backgroundColor.includes('234, 67, 53') || 
                     style.backgroundColor.includes('rgb(220, 38, 38)');
    
    if (hasRedBg && isElementVisible(button)) {
      return button;
    }
  }
  
  return null;
}

// Find the confirmation button
function findConfirmButton() {
  const selectors = [
    'button[jsname="CQylAd"]',
    '[data-mdc-dialog-action="ok"]',
    'button:contains("Leave call")',
    'span:contains("Leave call")',
    '[role="button"]:contains("Leave")'
  ];
  
  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button && isElementVisible(button)) {
      return button;
    }
  }
  
  // Look for buttons in dialogs
  const dialogs = document.querySelectorAll('[role="dialog"], .dialog');
  for (const dialog of dialogs) {
    const buttons = dialog.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent.toLowerCase().includes('leave') && isElementVisible(button)) {
        return button;
      }
    }
  }
  
  return null;
}

// Check if element is visible
function isElementVisible(element) {
  return element && 
         element.offsetParent !== null && 
         getComputedStyle(element).display !== 'none' &&
         getComputedStyle(element).visibility !== 'hidden';
}

// Show countdown overlay
function showCountdown(seconds) {
  hideCountdown(); // Remove any existing countdown
  
  const overlay = document.createElement('div');
  overlay.id = 'meet-auto-leave-countdown';
  overlay.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    background: rgba(0, 0, 0, 0.9) !important;
    color: white !important;
    padding: 15px 20px !important;
    border-radius: 8px !important;
    z-index: 999999 !important;
    font-family: 'Google Sans', Arial, sans-serif !important;
    font-size: 14px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
  `;
  
  const text = document.createElement('span');
  text.textContent = `Leaving in ${seconds}s...`;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    background: #1a73e8 !important;
    color: white !important;
    border: none !important;
    padding: 4px 8px !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    font-size: 12px !important;
  `;
  
  cancelBtn.onclick = () => {
    cancelLeaveSequence();
  };
  
  overlay.appendChild(text);
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);
  
  // Update countdown
  let currentSeconds = seconds - 1;
  const interval = setInterval(() => {
    if (currentSeconds <= 0) {
      clearInterval(interval);
      hideCountdown();
    } else {
      text.textContent = `Leaving in ${currentSeconds}s...`;
      currentSeconds--;
    }
  }, 1000);
}

// Hide countdown overlay
function hideCountdown() {
  const existing = document.getElementById('meet-auto-leave-countdown');
  if (existing) {
    existing.remove();
  }
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    background: #1a73e8 !important;
    color: white !important;
    padding: 12px 16px !important;
    border-radius: 6px !important;
    z-index: 999999 !important;
    font-family: 'Google Sans', Arial, sans-serif !important;
    font-size: 14px !important;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// Watch for meeting state changes
function observeMeetingState() {
  const observer = new MutationObserver(() => {
    if (isInMeeting() && !isListening && isEnabled) {
      setTimeout(startListening, 1000);
    } else if (!isInMeeting() && isListening) {
      stopListening();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from popup
chrome.runtime.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    isEnabled = request.enabled;
    if (isEnabled && isInMeeting()) {
      startListening();
    } else {
      stopListening();
    }
    sendResponse({success: true});
  } else if (request.action === 'getStatus') {
    sendResponse({
      enabled: isEnabled,
      listening: isListening,
      inMeeting: isInMeeting()
    });
  }
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
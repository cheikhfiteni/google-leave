// Google Meet Auto Leave Extension - Popup Script

document.addEventListener('DOMContentLoaded', function() {
    const loadingDiv = document.getElementById('loading');
    const contentDiv = document.getElementById('content');
    const enableToggle = document.getElementById('enableToggle');
    const extensionStatus = document.getElementById('extension-status');
    const listeningStatus = document.getElementById('listening-status');
    const meetingStatus = document.getElementById('meeting-status');
    
    // Initialize popup
    init();
    
    async function init() {
      try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we're on Google Meet
        if (!tab.url.includes('meet.google.com')) {
          showNotMeetPage();
          return;
        }
        
        // Get status from content script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        
        if (response) {
          updateUI(response);
        } else {
          showContentScriptError();
        }
        
      } catch (error) {
        console.error('Error initializing popup:', error);
        showError();
      }
    }
    
    function updateUI(status) {
      loadingDiv.style.display = 'none';
      contentDiv.style.display = 'block';
      
      // Update toggle
      enableToggle.checked = status.enabled;
      
      // Update status indicators
      extensionStatus.textContent = status.enabled ? 'Active' : 'Disabled';
      extensionStatus.className = status.enabled ? 'status-value active' : 'status-value inactive';
      
      listeningStatus.textContent = status.listening ? 'Active' : 'Inactive';
      listeningStatus.className = status.listening ? 'status-value active' : 'status-value inactive';
      
      meetingStatus.textContent = status.inMeeting ? 'Yes' : 'No';
      meetingStatus.className = status.inMeeting ? 'status-value active' : 'status-value';
    }
    
    function showNotMeetPage() {
      loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #ea4335; font-weight: 500;">Not on Google Meet</p>
          <p style="font-size: 12px; color: #666; line-height: 1.4;">
            This extension only works on Google Meet pages.<br>
            Please navigate to a Google Meet call first.
          </p>
        </div>
      `;
    }
    
    function showContentScriptError() {
      loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #ea4335; font-weight: 500;">Extension Not Ready</p>
          <p style="font-size: 12px; color: #666; line-height: 1.4;">
            The extension is loading. Please refresh the Google Meet page and try again.
          </p>
        </div>
      `;
    }
    
    function showError() {
      loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #ea4335; font-weight: 500;">Error</p>
          <p style="font-size: 12px; color: #666; line-height: 1.4;">
            Something went wrong. Please refresh the page and try again.
          </p>
        </div>
      `;
    }
    
    // Handle toggle changes
    enableToggle.addEventListener('change', async function() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'toggle',
          enabled: enableToggle.checked
        });
        
        if (response && response.success) {
          // Update UI immediately
          extensionStatus.textContent = enableToggle.checked ? 'Active' : 'Disabled';
          extensionStatus.className = enableToggle.checked ? 'status-value active' : 'status-value inactive';
          
          // Update listening status after a short delay
          setTimeout(async () => {
            try {
              const statusResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
              if (statusResponse) {
                listeningStatus.textContent = statusResponse.listening ? 'Active' : 'Inactive';
                listeningStatus.className = statusResponse.listening ? 'status-value active' : 'status-value inactive';
              }
            } catch (error) {
              console.error('Error updating status:', error);
            }
          }, 1500);
        }
      } catch (error) {
        console.error('Error toggling extension:', error);
        // Revert toggle on error
        enableToggle.checked = !enableToggle.checked;
      }
    });
  });
document.addEventListener('DOMContentLoaded', () => {
  const broadcastForm = document.getElementById('broadcastForm');
  const broadcastStatus = document.getElementById('broadcastStatus');
  
  if (broadcastForm && broadcastStatus) {
    const progressBar = document.getElementById('bcProgress');
    const progressText = document.getElementById('bcProgressText');
    const bcTotal = document.getElementById('bcTotal');
    const bcSuccess = document.getElementById('bcSuccess');
    const bcFailed = document.getElementById('bcFailed');
    const bcStatusText = document.getElementById('bcStatusText');

    let pollInterval = null;

    broadcastForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const target = document.getElementById('target').value;
      const message = document.getElementById('message').value;

      if (!target || !message) return alert("Lengkapi form");

      broadcastForm.querySelector('button').disabled = true;

      try {
        const res = await fetch('/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, message })
        });
        const data = await res.json();
        
        if (data.success) {
          broadcastForm.style.display = 'none';
          broadcastStatus.style.display = 'block';
          startPolling(data.broadcastId);
        } else {
          alert("Error: " + data.error);
          broadcastForm.querySelector('button').disabled = false;
        }
      } catch (err) {
        alert("Gagal menghubungi server");
        broadcastForm.querySelector('button').disabled = false;
      }
    });

    function startPolling(id) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/admin/broadcast/status/${id}`);
          if (res.ok) {
            const bc = await res.json();
            updateUI(bc);
            if (bc.status === 'completed' || bc.status === 'failed' || bc.status === 'cancelled') {
              clearInterval(pollInterval);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 1000); // poll every 1s
    }

    function updateUI(bc) {
      progressBar.style.width = bc.progress + '%';
      progressText.textContent = bc.progress + '%';
      bcTotal.textContent = bc.total;
      bcSuccess.textContent = bc.success;
      bcFailed.textContent = bc.failed;
      bcStatusText.textContent = bc.status.toUpperCase();
    }
  }
});

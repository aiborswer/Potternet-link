// State
let selectedProgramFee = 0;
let currentPaymentMethod = 'GPay';
let registrationsCache = [];
let searchDebounceTimer = null;

// Carousel State
let currentSlideIndex = 0;
let carouselAutoPlayTimer = null;

// Program Fee Mapping
const PROGRAM_FEES = {
  'Khasi Bible School': 1500,
  'International School of Ministry': 2500
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchRegistrations();
  initCarousel();
});

// Carousel Functions
function initCarousel() {
  const slides = document.querySelectorAll('.carousel-slide');
  if (!slides || slides.length === 0) return;

  goToSlide(0);
  startCarouselAutoPlay();

  const container = document.getElementById('events-carousel');
  if (container) {
    container.addEventListener('mouseenter', () => pauseCarouselAutoPlay());
    container.addEventListener('mouseleave', () => startCarouselAutoPlay());
    
    // Touch swipe support for mobile devices
    let touchStartX = 0;
    let touchEndX = 0;
    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      pauseCarouselAutoPlay();
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 40) {
        nextCarouselSlide();
      } else if (touchEndX > touchStartX + 40) {
        prevCarouselSlide();
      }
      startCarouselAutoPlay();
    }, { passive: true });
  }
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.indicator-dot');
  if (!slides.length) return;

  currentSlideIndex = (index + slides.length) % slides.length;

  slides.forEach((slide, idx) => {
    if (idx === currentSlideIndex) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  dots.forEach((dot, idx) => {
    if (idx === currentSlideIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function nextCarouselSlide() {
  goToSlide(currentSlideIndex + 1);
}

function prevCarouselSlide() {
  goToSlide(currentSlideIndex - 1);
}

function startCarouselAutoPlay() {
  pauseCarouselAutoPlay();
  carouselAutoPlayTimer = setInterval(() => {
    nextCarouselSlide();
  }, 5000);
}

function pauseCarouselAutoPlay() {
  if (carouselAutoPlayTimer) {
    clearInterval(carouselAutoPlayTimer);
    carouselAutoPlayTimer = null;
  }
}

// Tab Switcher
function switchTab(tab) {
  const regSection = document.getElementById('section-register');
  const dirSection = document.getElementById('section-directory');
  const regBtn = document.getElementById('tab-register-btn');
  const dirBtn = document.getElementById('tab-directory-btn');

  if (tab === 'register') {
    regSection.style.display = 'block';
    dirSection.style.display = 'none';
    regBtn.classList.add('active');
    dirBtn.classList.remove('active');
  } else {
    regSection.style.display = 'none';
    dirSection.style.display = 'block';
    dirBtn.classList.add('active');
    regBtn.classList.remove('active');
    fetchRegistrations();
  }
}

// Program Change Handler
function handleProgramChange(program) {
  const fee = PROGRAM_FEES[program] || 0;
  selectedProgramFee = fee;
  
  document.getElementById('course-name-label').textContent = program;
  document.getElementById('course-fee-label').textContent = `₹${fee.toLocaleString('en-IN')}`;
  
  updateSubmitButtonLabel();
}

function updateSubmitButtonLabel() {
  const submitBtn = document.getElementById('btn-submit-form');
  if (!submitBtn) return;
  const payText = document.getElementById('btn-pay-text');
  const label = selectedProgramFee > 0 
    ? `Pay ₹${selectedProgramFee.toLocaleString('en-IN')} via ${currentPaymentMethod} & Register`
    : `Complete Registration & Pay`;
    
  if (payText) {
    payText.textContent = label;
  } else {
    submitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> <span id="btn-pay-text">${label}</span>`;
  }
}

// Payment Selection
function selectPaymentMethod(method) {
  currentPaymentMethod = method;

  // Update card styling
  document.querySelectorAll('.payment-option-card').forEach(el => el.classList.remove('selected'));
  if (method === 'GPay') document.getElementById('opt-gpay').classList.add('selected');
  if (method === 'PhonePe') document.getElementById('opt-phonepe').classList.add('selected');
  if (method === 'Net Banking') document.getElementById('opt-netbanking').classList.add('selected');

  // Update detail panels
  document.querySelectorAll('.payment-details-panel').forEach(p => p.classList.remove('active'));
  if (method === 'GPay') document.getElementById('panel-gpay').classList.add('active');
  if (method === 'PhonePe') document.getElementById('panel-phonepe').classList.add('active');
  if (method === 'Net Banking') document.getElementById('panel-netbanking').classList.add('active');

  updateSubmitButtonLabel();
}

// Fetch Registrations from backend (JSON file)
async function fetchRegistrations(query = '', programFilter = '') {
  try {
    let url = '/api/registrations?';
    if (query) url += `q=${encodeURIComponent(query)}&`;
    if (programFilter) url += `program=${encodeURIComponent(programFilter)}&`;

    const res = await fetch(url, {
      headers: {
        'bypass-tunnel-reminder': 'true'
      }
    });
    const result = await res.json();

    if (result.success) {
      registrationsCache = result.data;
      renderTable(result.data);
      const counterEl = document.getElementById('record-counter');
      if (counterEl) counterEl.textContent = result.data.length;
      const resultsCountEl = document.getElementById('results-count');
      if (resultsCountEl) resultsCountEl.textContent = result.data.length;
    }
  } catch (err) {
    console.error('Failed to fetch registrations:', err);
  }
}

// Render Table
function renderTable(list) {
  const tbody = document.getElementById('registrations-tbody');
  const noMsg = document.getElementById('no-results-msg');

  tbody.innerHTML = '';
  if (!list || list.length === 0) {
    noMsg.style.display = 'block';
    return;
  }
  noMsg.style.display = 'none';

  list.forEach(item => {
    const tr = document.createElement('tr');
    const isKhasi = item.program === 'Khasi Bible School';
    const badgeClass = isKhasi ? 'badge-khasi' : 'badge-isom';
    
    tr.innerHTML = `
      <td><strong style="color: var(--secondary); font-family: monospace;">${escapeHtml(item.id)}</strong></td>
      <td>
        <div style="font-weight: 600; color: #1e293b;">${escapeHtml(item.fullName)}</div>
        <small style="color: var(--text-muted);">${escapeHtml(item.churchAffiliation || 'N/A')}</small>
      </td>
      <td>
        <span class="badge-tag ${badgeClass}">${escapeHtml(item.program)}</span>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(item.studyMode || 'Regular')}</div>
      </td>
      <td>
        <div><i class="fa-solid fa-phone" style="font-size: 0.75rem; color: #64748b;"></i> ${escapeHtml(item.phone)}</div>
        <div><i class="fa-solid fa-envelope" style="font-size: 0.75rem; color: #64748b;"></i> <small>${escapeHtml(item.email)}</small></div>
      </td>
      <td>
        <div style="font-weight: 700; color: #15803d;">₹${(item.feeAmount || 0).toLocaleString('en-IN')}</div>
        <div style="font-size: 0.8rem; color: #475569;"><i class="fa-solid fa-wallet"></i> ${escapeHtml(item.paymentMethod)}</div>
        <small style="font-family: monospace; font-size: 0.75rem; color: #94a3b8;" title="${escapeHtml(item.transactionId || '')}">${(item.transactionId || '').substring(0, 18)}...</small>
      </td>
      <td>
        <span class="badge-tag badge-paid"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(item.paymentStatus || 'Completed')}</span>
      </td>
      <td>
        <button class="action-btn" onclick="viewRegistrationDetail('${escapeHtml(item.id)}')">
          <i class="fa-solid fa-eye"></i> View Slip
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Search debounce handler
function handleSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const q = document.getElementById('search-input').value.trim();
    const prog = document.getElementById('filter-program').value;
    
    const filterHint = document.getElementById('filter-status-hint');
    if (q || prog) {
      filterHint.textContent = `Active filter: "${q || 'All'}" in [${prog || 'All Programs'}]`;
    } else {
      filterHint.textContent = 'Active filter: None';
    }

    fetchRegistrations(q, prog);
  }, 250);
}

// Handle Form Submission
async function handleRegistrationSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('registration-form');
  const btn = document.getElementById('btn-submit-form');
  const alertContainer = document.getElementById('alert-container');

  alertContainer.innerHTML = '';
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.feeAmount = selectedProgramFee;

  // Button loading state
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment & Enrolling...`;

  try {
    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
      },
      body: JSON.stringify(data)
    });

    const res = await response.json();

    if (!response.ok || !res.success) {
      throw new Error(res.message || 'Registration failed');
    }

    // Success notification
    alertContainer.innerHTML = `
      <div class="notification-banner success">
        <i class="fa-solid fa-circle-check" style="font-size: 1.3rem;"></i>
        <div>
          <strong>Registration Successful!</strong>
          <div>Student registered under <b>${escapeHtml(res.data.id)}</b>. Data is saved in registrations.json.</div>
        </div>
      </div>
    `;

    // Refresh directory records count and cache
    fetchRegistrations();

    // Show slip modal
    showReceiptModal(res.data);

    // Reset form
    form.reset();
    const nameLabel = document.getElementById('course-name-label');
    if (nameLabel) nameLabel.textContent = 'Please select a program';
    const feeLabel = document.getElementById('course-fee-label');
    if (feeLabel) feeLabel.textContent = '₹0';
    selectedProgramFee = 0;
    selectPaymentMethod('GPay');

  } catch (error) {
    alertContainer.innerHTML = `
      <div class="notification-banner danger">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.3rem;"></i>
        <div>
          <strong>Unable to complete registration:</strong>
          <div>${escapeHtml(error.message)}</div>
        </div>
      </div>
    `;
  } finally {
    btn.disabled = false;
    updateSubmitButtonLabel();
  }
}

// Show modal slip
function showReceiptModal(record) {
  const modalBody = document.getElementById('modal-receipt-body');
  const formattedDate = new Date(record.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  modalBody.innerHTML = `
    <div class="receipt-header">
      <div class="success-check-icon">
        <i class="fa-solid fa-check"></i>
      </div>
      <h3 style="color: #1e293b; margin-bottom: 4px;">Potternet Ministry Registration Slip</h3>
      <p style="color: var(--text-muted); font-size: 0.85rem;">Official Fee & Enrollment Receipt</p>
    </div>

    <div class="receipt-grid">
      <div class="receipt-label">Registration ID:</div>
      <div class="receipt-val" style="color: var(--primary); font-family: monospace; font-size: 1.05rem;">${escapeHtml(record.id)}</div>

      <div class="receipt-label">Student Name:</div>
      <div class="receipt-val">${escapeHtml(record.fullName)}</div>

      <div class="receipt-label">Program Enrolled:</div>
      <div class="receipt-val" style="color: var(--secondary);">${escapeHtml(record.program)}</div>

      <div class="receipt-label">Study Mode:</div>
      <div class="receipt-val">${escapeHtml(record.studyMode || 'Regular')}</div>

      <div class="receipt-label">Contact Email:</div>
      <div class="receipt-val">${escapeHtml(record.email)}</div>

      <div class="receipt-label">Contact Phone:</div>
      <div class="receipt-val">${escapeHtml(record.phone)}</div>

      <div class="receipt-label">Home Church:</div>
      <div class="receipt-val">${escapeHtml(record.churchAffiliation || 'N/A')}</div>

      <div class="receipt-label">Payment Method:</div>
      <div class="receipt-val">${escapeHtml(record.paymentMethod)} ${record.bankName ? `(${escapeHtml(record.bankName)})` : ''}</div>

      <div class="receipt-label">Transaction ID:</div>
      <div class="receipt-val" style="font-family: monospace; font-size: 0.85rem;">${escapeHtml(record.transactionId)}</div>

      <div class="receipt-label">Amount Paid:</div>
      <div class="receipt-val" style="color: #15803d; font-size: 1.1rem;">₹${(record.feeAmount || 0).toLocaleString('en-IN')}</div>

      <div class="receipt-label">Payment Status:</div>
      <div class="receipt-val"><span class="badge-tag badge-paid"><i class="fa-solid fa-check"></i> ${escapeHtml(record.paymentStatus)}</span></div>

      <div class="receipt-label">Date & Time:</div>
      <div class="receipt-val" style="font-size: 0.85rem; color: #64748b;">${formattedDate}</div>
    </div>
  `;

  document.getElementById('receipt-modal').classList.add('active');
}

// View details for row click
function viewRegistrationDetail(regId) {
  const item = registrationsCache.find(r => r.id === regId);
  if (item) {
    showReceiptModal(item);
  } else {
    // Fetch directly from server
    fetch(`/api/registrations/${regId}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          showReceiptModal(res.data);
        }
      });
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Utility to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

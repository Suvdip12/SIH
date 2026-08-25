// ═══════════════════════════════════════════════════════
// SIH 2026 — University of Kalyani
// Main JavaScript — Three.js 3D Scene + Registration Form
// ═══════════════════════════════════════════════════════

// ─── THREE.JS 3D BACKGROUND ───
(function initThreeScene() {
  const canvas = document.getElementById('bg-canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.position.z = 50;

  // ── Particle System ──
  const particleCount = 2000;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    
    // Orange-ish colors
    const intensity = 0.3 + Math.random() * 0.7;
    colors[i * 3] = 1.0 * intensity;      // R
    colors[i * 3 + 1] = 0.42 * intensity;  // G
    colors[i * 3 + 2] = 0.0;               // B
    
    sizes[i] = Math.random() * 2 + 0.5;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // ── Floating Voxel Cubes ──
  const cubes = [];
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  
  for (let i = 0; i < 25; i++) {
    const edgesGeometry = new THREE.EdgesGeometry(cubeGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: new THREE.Color().setHSL(0.08, 1, 0.3 + Math.random() * 0.4),
      transparent: true,
      opacity: 0.3 + Math.random() * 0.4
    });
    
    const cube = new THREE.LineSegments(edgesGeometry, edgeMaterial);
    const scale = 0.5 + Math.random() * 2.5;
    cube.scale.set(scale, scale, scale);
    cube.position.set(
      (Math.random() - 0.5) * 120,
      (Math.random() - 0.5) * 120,
      (Math.random() - 0.5) * 80
    );
    cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    
    cube.userData = {
      rotSpeed: { x: (Math.random() - 0.5) * 0.01, y: (Math.random() - 0.5) * 0.01 },
      floatSpeed: 0.001 + Math.random() * 0.003,
      floatOffset: Math.random() * Math.PI * 2,
      originalY: cube.position.y
    };
    
    cubes.push(cube);
    scene.add(cube);
  }

  // ── Glowing Ring (like the poster's circular text) ──
  const ringGeometry = new THREE.TorusGeometry(18, 0.08, 8, 100);
  const ringMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff6b00, 
    transparent: true, 
    opacity: 0.25 
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI * 0.5;
  scene.add(ring);

  const ring2Geometry = new THREE.TorusGeometry(22, 0.06, 8, 100);
  const ring2Material = new THREE.MeshBasicMaterial({ 
    color: 0xff9500, 
    transparent: true, 
    opacity: 0.15 
  });
  const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
  ring2.rotation.x = Math.PI * 0.4;
  ring2.rotation.z = Math.PI * 0.1;
  scene.add(ring2);

  // ── Mouse Parallax ──
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Animate ──
  const clock = new THREE.Clock();
  
  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    
    // Smooth mouse follow
    targetX += (mouseX - targetX) * 0.02;
    targetY += (mouseY - targetY) * 0.02;
    
    // Camera parallax
    camera.position.x = targetX * 5;
    camera.position.y = -targetY * 5;
    camera.lookAt(0, 0, 0);
    
    // Rotate particles
    particles.rotation.y = elapsed * 0.02;
    particles.rotation.x = elapsed * 0.01;
    
    // Animate cubes
    cubes.forEach(cube => {
      cube.rotation.x += cube.userData.rotSpeed.x;
      cube.rotation.y += cube.userData.rotSpeed.y;
      cube.position.y = cube.userData.originalY + 
        Math.sin(elapsed * cube.userData.floatSpeed * 100 + cube.userData.floatOffset) * 3;
    });
    
    // Rotate rings
    ring.rotation.z = elapsed * 0.1;
    ring2.rotation.z = -elapsed * 0.08;
    
    // Pulse ring opacity
    ring.material.opacity = 0.15 + Math.sin(elapsed * 0.5) * 0.1;
    ring2.material.opacity = 0.1 + Math.cos(elapsed * 0.3) * 0.08;
    
    renderer.render(scene, camera);
  }
  
  animate();

  // ── Resize ──
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();


// ─── LOADING SCREEN ───
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 1500);
});


// ─── NAVBAR SCROLL EFFECT ───
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  
  // Update active nav link
  const sections = ['hero', 'about', 'register', 'contact'];
  const scrollPos = window.scrollY + 200;
  
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section && section.offsetTop <= scrollPos && section.offsetTop + section.offsetHeight > scrollPos) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.querySelector(`.nav-link[href="#${id}"]`)?.classList.add('active');
    }
  });
});

// Mobile Menu
const hamburger = document.getElementById('nav-hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
}


// ─── SMOOTH SCROLL ───
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    closeMobileMenu();
  }
}


// ─── COUNTDOWN TIMER ───
function updateCountdown() {
  const deadline = new Date('2026-08-26T23:59:59+05:30').getTime();
  const now = new Date().getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '00';
    document.getElementById('cd-hours').textContent = '00';
    document.getElementById('cd-minutes').textContent = '00';
    document.getElementById('cd-seconds').textContent = '00';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
  document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
  document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);


// ─── FETCH STATS ───
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-teams').textContent = data.total_teams || 0;
    document.getElementById('stat-members').textContent = data.total_members || 0;
  } catch (e) {
    // Silently fail — stats are non-critical
  }
}
fetchStats();


// ─── SCROLL REVEAL ANIMATION ───
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


// ═══════════════════════════════════════════════════════
// MULTI-STEP REGISTRATION FORM
// ═══════════════════════════════════════════════════════

let currentStep = 1;
let memberCount = 0;
const MAX_MEMBERS = 5; // 5 additional + 1 leader = 6 total

// ─── Step Navigation ───
function updateProgress() {
  document.querySelectorAll('.progress-step').forEach(step => {
    const stepNum = parseInt(step.dataset.step);
    step.classList.remove('active', 'completed');
    if (stepNum === currentStep) step.classList.add('active');
    if (stepNum < currentStep) step.classList.add('completed');
  });

  document.querySelectorAll('.progress-line').forEach((line, i) => {
    line.classList.toggle('active', i + 1 < currentStep);
  });

  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
  });
}

function nextStep() {
  if (!validateCurrentStep()) return;
  
  if (currentStep === 3) {
    buildReview();
  }
  
  if (currentStep < 4) {
    currentStep++;
    updateProgress();
    // Scroll form into view
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    updateProgress();
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}


// ─── Validation ───
function validateCurrentStep() {
  let valid = true;

  if (currentStep === 1) {
    valid = validateFields([
      { id: 'leader-name', msg: 'Full name is required' },
      { id: 'leader-email', msg: 'Valid email is required', type: 'email' },
      { id: 'leader-phone', msg: 'Phone number is required' },
      { id: 'leader-roll', msg: 'Roll number is required' },
      { id: 'leader-dept', msg: 'Department is required' },
      { id: 'leader-semester', msg: 'Semester is required' },
      { id: 'leader-gender', msg: 'Gender is required' }
    ]);
  }

  if (currentStep === 2) {
    valid = validateFields([
      { id: 'team-name', msg: 'Team name is required' },
      { id: 'edition', msg: 'Edition selection is required' }
    ]);
  }

  if (currentStep === 3) {
    // Validate all member fields
    const memberCards = document.querySelectorAll('.member-card');
    memberCards.forEach((card, i) => {
      const idx = i;
      const fields = [
        { id: `member-name-${idx}`, msg: 'Name is required' },
        { id: `member-email-${idx}`, msg: 'Valid email is required', type: 'email' },
        { id: `member-roll-${idx}`, msg: 'Roll number is required' },
        { id: `member-dept-${idx}`, msg: 'Department is required' },
        { id: `member-semester-${idx}`, msg: 'Semester is required' },
        { id: `member-gender-${idx}`, msg: 'Gender is required' }
      ];
      if (!validateFields(fields)) valid = false;
    });

    // Check at least 1 female member across all (leader + members)
    const leaderGender = document.getElementById('leader-gender').value;
    let hasFemale = leaderGender === 'Female';
    
    memberCards.forEach((card, i) => {
      const genderEl = document.getElementById(`member-gender-${i}`);
      if (genderEl && genderEl.value === 'Female') hasFemale = true;
    });

    if (!hasFemale) {
      showToast('At least one female member is required in the team', 'error');
      valid = false;
    }
  }

  return valid;
}

function validateFields(fields) {
  let valid = true;
  
  fields.forEach(field => {
    const el = document.getElementById(field.id);
    if (!el) return;
    
    const group = el.closest('.form-group');
    const errorSpan = group?.querySelector('.form-error');
    let isValid = true;
    
    if (!el.value.trim()) {
      isValid = false;
    } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) {
      isValid = false;
      field.msg = 'Enter a valid email address';
    }
    
    if (!isValid) {
      group?.classList.add('error');
      if (errorSpan) errorSpan.textContent = field.msg;
      valid = false;
    } else {
      group?.classList.remove('error');
      if (errorSpan) errorSpan.textContent = '';
    }
  });
  
  return valid;
}


// ─── Dynamic Member Addition ───
function addMember() {
  if (memberCount >= MAX_MEMBERS) return;
  
  const container = document.getElementById('members-container');
  const idx = memberCount;
  
  const card = document.createElement('div');
  card.className = 'member-card';
  card.id = `member-card-${idx}`;
  card.innerHTML = `
    <div class="member-card-header">
      <span class="member-card-title">Member ${idx + 2}</span>
      <button type="button" class="btn-remove-member" onclick="removeMember(${idx})">✕ Remove</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label for="member-name-${idx}">Full Name *</label>
        <input type="text" id="member-name-${idx}" required placeholder="Enter full name">
        <span class="form-error"></span>
      </div>
      <div class="form-group">
        <label for="member-email-${idx}">Email *</label>
        <input type="email" id="member-email-${idx}" required placeholder="email@example.com">
        <span class="form-error"></span>
      </div>
      <div class="form-group">
        <label for="member-phone-${idx}">Phone</label>
        <input type="tel" id="member-phone-${idx}" placeholder="+91 XXXXX XXXXX">
        <span class="form-error"></span>
      </div>
      <div class="form-group">
        <label for="member-roll-${idx}">Roll / Reg No. *</label>
        <input type="text" id="member-roll-${idx}" required placeholder="Enter roll number">
        <span class="form-error"></span>
      </div>
      <div class="form-group">
        <label for="member-dept-${idx}">Department *</label>
        <select id="member-dept-${idx}" required>
          <option value="">Select Department</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Information Technology">Information Technology</option>
          <option value="Electronics">Electronics</option>
          <option value="Electrical Engineering">Electrical Engineering</option>
          <option value="Mechanical Engineering">Mechanical Engineering</option>
          <option value="Civil Engineering">Civil Engineering</option>
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Biotechnology">Biotechnology</option>
          <option value="Environmental Science">Environmental Science</option>
          <option value="Commerce">Commerce</option>
          <option value="Business Administration">Business Administration</option>
          <option value="Other">Other</option>
        </select>
        <span class="form-error"></span>
      </div>
      <div class="form-group">
        <label for="member-semester-${idx}">Semester *</label>
        <select id="member-semester-${idx}" required>
          <option value="">Select Semester</option>
          <option value="1">1st Semester</option>
          <option value="2">2nd Semester</option>
          <option value="3">3rd Semester</option>
          <option value="4">4th Semester</option>
          <option value="5">5th Semester</option>
          <option value="6">6th Semester</option>
          <option value="7">7th Semester</option>
          <option value="8">8th Semester</option>
        </select>
        <span class="form-error"></span>
      </div>
      <div class="form-group">
        <label for="member-gender-${idx}">Gender *</label>
        <select id="member-gender-${idx}" required onchange="updateFemaleCount()">
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <span class="form-error"></span>
      </div>
    </div>
  `;
  
  container.appendChild(card);
  memberCount++;
  updateMemberCounts();
  
  // Animate in
  card.style.animation = 'stepFadeIn 0.4s ease';
}

function removeMember(idx) {
  const card = document.getElementById(`member-card-${idx}`);
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateX(-30px)';
    setTimeout(() => {
      card.remove();
      memberCount--;
      // Re-index remaining cards
      reindexMembers();
      updateMemberCounts();
    }, 300);
  }
}

function reindexMembers() {
  const container = document.getElementById('members-container');
  const cards = container.querySelectorAll('.member-card');
  memberCount = cards.length;
  
  cards.forEach((card, newIdx) => {
    card.id = `member-card-${newIdx}`;
    card.querySelector('.member-card-title').textContent = `Member ${newIdx + 2}`;
    card.querySelector('.btn-remove-member').setAttribute('onclick', `removeMember(${newIdx})`);
    
    // Update all field IDs and labels
    const fields = ['name', 'email', 'phone', 'roll', 'dept', 'semester', 'gender'];
    fields.forEach(field => {
      const input = card.querySelector(`[id^="member-${field}-"]`);
      if (input) {
        const oldId = input.id;
        input.id = `member-${field}-${newIdx}`;
        const label = card.querySelector(`label[for="${oldId}"]`);
        if (label) label.setAttribute('for', `member-${field}-${newIdx}`);
      }
    });
  });
}

function updateMemberCounts() {
  const totalMembers = memberCount + 1; // +1 for leader
  document.getElementById('member-count-display').textContent = 
    `Members: ${totalMembers}/6 (Leader counted)`;
  
  // Disable add button if max reached
  const addBtn = document.getElementById('add-member-btn');
  addBtn.disabled = memberCount >= MAX_MEMBERS;
  
  updateFemaleCount();
}

function updateFemaleCount() {
  let femaleCount = 0;
  
  if (document.getElementById('leader-gender').value === 'Female') femaleCount++;
  
  for (let i = 0; i < memberCount; i++) {
    const genderEl = document.getElementById(`member-gender-${i}`);
    if (genderEl && genderEl.value === 'Female') femaleCount++;
  }
  
  const countEl = document.getElementById('female-count');
  countEl.textContent = femaleCount;
  countEl.style.color = femaleCount > 0 ? '#4caf50' : '#ff4444';
}


// ─── Review Builder ───
function buildReview() {
  const review = document.getElementById('review-content');
  
  const leaderData = {
    name: document.getElementById('leader-name').value,
    email: document.getElementById('leader-email').value,
    phone: document.getElementById('leader-phone').value,
    roll: document.getElementById('leader-roll').value,
    dept: document.getElementById('leader-dept').value,
    semester: document.getElementById('leader-semester').value,
    gender: document.getElementById('leader-gender').value
  };
  
  const teamData = {
    name: document.getElementById('team-name').value,
    problemId: document.getElementById('problem-id').value || 'N/A',
    problemStatement: document.getElementById('problem-statement').value || 'N/A',
    edition: document.getElementById('edition').value
  };
  
  let membersHTML = '';
  for (let i = 0; i < memberCount; i++) {
    const name = document.getElementById(`member-name-${i}`)?.value || '';
    const email = document.getElementById(`member-email-${i}`)?.value || '';
    const dept = document.getElementById(`member-dept-${i}`)?.value || '';
    const gender = document.getElementById(`member-gender-${i}`)?.value || '';
    
    membersHTML += `
      <div class="review-row"><span class="review-label">Member ${i + 2}</span><span class="review-value">${name}</span></div>
      <div class="review-row"><span class="review-label">Email</span><span class="review-value">${email}</span></div>
      <div class="review-row"><span class="review-label">Department</span><span class="review-value">${dept}</span></div>
      <div class="review-row"><span class="review-label">Gender</span><span class="review-value">${gender}</span></div>
      ${i < memberCount - 1 ? '<hr style="border-color: rgba(255,255,255,0.05); margin: 10px 0;">' : ''}
    `;
  }
  
  review.innerHTML = `
    <div class="review-block">
      <h4>🏷️ Team Information</h4>
      <div class="review-row"><span class="review-label">Team Name</span><span class="review-value">${teamData.name}</span></div>
      <div class="review-row"><span class="review-label">Edition</span><span class="review-value">${teamData.edition}</span></div>
      <div class="review-row"><span class="review-label">Problem ID</span><span class="review-value">${teamData.problemId}</span></div>
      <div class="review-row"><span class="review-label">Problem Statement</span><span class="review-value">${teamData.problemStatement}</span></div>
    </div>
    
    <div class="review-block">
      <h4>👤 Team Leader</h4>
      <div class="review-row"><span class="review-label">Name</span><span class="review-value">${leaderData.name}</span></div>
      <div class="review-row"><span class="review-label">Email</span><span class="review-value">${leaderData.email}</span></div>
      <div class="review-row"><span class="review-label">Phone</span><span class="review-value">${leaderData.phone}</span></div>
      <div class="review-row"><span class="review-label">Roll No.</span><span class="review-value">${leaderData.roll}</span></div>
      <div class="review-row"><span class="review-label">Department</span><span class="review-value">${leaderData.dept}</span></div>
      <div class="review-row"><span class="review-label">Semester</span><span class="review-value">${leaderData.semester}</span></div>
      <div class="review-row"><span class="review-label">Gender</span><span class="review-value">${leaderData.gender}</span></div>
    </div>
    
    ${memberCount > 0 ? `
    <div class="review-block">
      <h4>👥 Team Members (${memberCount})</h4>
      ${membersHTML}
    </div>
    ` : ''}
    
    <div class="review-block" style="border-color: var(--orange-glow-soft);">
      <h4>📊 Summary</h4>
      <div class="review-row"><span class="review-label">Total Members</span><span class="review-value">${memberCount + 1} / 6</span></div>
    </div>
  `;
}


// ─── Form Submission ───
async function submitForm() {
  const confirmCheck = document.getElementById('confirm-check');
  if (!confirmCheck.checked) {
    showToast('Please confirm that all information is correct', 'warning');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.textContent = 'Submitting...';

  // Build payload
  const team = {
    team_name: document.getElementById('team-name').value.trim(),
    problem_id: document.getElementById('problem-id').value.trim() || null,
    problem_statement: document.getElementById('problem-statement').value.trim() || null,
    edition: document.getElementById('edition').value
  };

  const members = [];
  
  // Leader
  members.push({
    full_name: document.getElementById('leader-name').value.trim(),
    email: document.getElementById('leader-email').value.trim(),
    phone: document.getElementById('leader-phone').value.trim(),
    roll_number: document.getElementById('leader-roll').value.trim(),
    department: document.getElementById('leader-dept').value,
    semester: parseInt(document.getElementById('leader-semester').value),
    gender: document.getElementById('leader-gender').value,
    is_leader: true
  });

  // Other members
  for (let i = 0; i < memberCount; i++) {
    members.push({
      full_name: document.getElementById(`member-name-${i}`).value.trim(),
      email: document.getElementById(`member-email-${i}`).value.trim(),
      phone: document.getElementById(`member-phone-${i}`)?.value?.trim() || null,
      roll_number: document.getElementById(`member-roll-${i}`).value.trim(),
      department: document.getElementById(`member-dept-${i}`).value,
      semester: parseInt(document.getElementById(`member-semester-${i}`).value),
      gender: document.getElementById(`member-gender-${i}`).value,
      is_leader: false
    });
  }

  try {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, members })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Success!
    showSuccessModal(team.team_name, members.length);
    showToast('Team registered successfully! 🎉', 'success');
    
    // Reset form
    document.getElementById('registration-form').reset();
    document.getElementById('members-container').innerHTML = '';
    memberCount = 0;
    currentStep = 1;
    updateProgress();
    updateMemberCounts();
    
    // Refresh stats
    fetchStats();

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = '🚀 Submit Registration';
  }
}


// ─── Success Modal ───
function showSuccessModal(teamName, memberCount) {
  const modal = document.getElementById('success-modal');
  const info = document.getElementById('modal-team-info');
  
  info.innerHTML = `
    <div class="review-row"><span class="review-label">Team</span><span class="review-value" style="color: var(--orange-400)">${teamName}</span></div>
    <div class="review-row"><span class="review-label">Members</span><span class="review-value">${memberCount}</span></div>
    <div class="review-row"><span class="review-label">Status</span><span class="review-value" style="color: #4caf50">✓ Registered</span></div>
  `;
  
  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('success-modal').classList.remove('active');
}


// ─── Toast Notifications ───
function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}


// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  updateMemberCounts();
  
  // Clear field errors on input
  document.addEventListener('input', (e) => {
    const group = e.target.closest('.form-group');
    if (group) {
      group.classList.remove('error');
      const errorSpan = group.querySelector('.form-error');
      if (errorSpan) errorSpan.textContent = '';
    }
  });
  
  // Leader gender change listener
  document.getElementById('leader-gender').addEventListener('change', updateFemaleCount);
});

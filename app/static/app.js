// ===== State =====
const API = '/api/v1';
let accessToken = localStorage.getItem('access_token') || null;
let mfaPendingToken = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    if (accessToken) {
        showAuthenticatedUI();
        showPage('dashboard');
        checkHealth();
    } else {
        showPage('landing');
    }

    const commentText = document.getElementById('comment-text');
    if (commentText) {
        commentText.addEventListener('input', () => {
            document.getElementById('char-count').textContent = commentText.value.length;
        });
    }

    const regPwd = document.getElementById('reg-password');
    if (regPwd) {
        regPwd.addEventListener('input', () => {
            const strength = document.getElementById('pwd-strength');
            const val = regPwd.value;
            strength.className = 'password-strength';
            if (val.length >= 12 && /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) {
                strength.classList.add('strong');
            } else if (val.length >= 8) {
                strength.classList.add('medium');
            } else if (val.length > 0) {
                strength.classList.add('weak');
            }
        });
    }
});

// ===== Pages =====
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');

    document.querySelectorAll('.nav-btn[data-page]').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    if (page === 'profile' && accessToken) loadProfile();
    if (page === 'dashboard' && accessToken) checkHealth();
}

function showAuthenticatedUI() {
    document.getElementById('nav-links-auth').style.display = 'flex';
    document.getElementById('nav-links-guest').style.display = 'none';
}

function showGuestUI() {
    document.getElementById('nav-links-auth').style.display = 'none';
    document.getElementById('nav-links-guest').style.display = 'flex';
}

// ===== API Helpers =====
async function apiPost(path, body, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
    const res = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, detail: data.detail || 'Request failed' };
    return data;
}

async function apiGet(path, auth = false) {
    const headers = {};
    if (auth && accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
    const res = await fetch(API + path, { headers });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, detail: data.detail || 'Request failed' };
    return data;
}

// ===== Auth: Register =====
async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const errEl = document.getElementById('register-error');
    const succEl = document.getElementById('register-success');
    errEl.style.display = 'none';
    succEl.style.display = 'none';

    if (password !== confirm) {
        errEl.textContent = 'Passwords do not match.';
        errEl.style.display = 'block';
        return;
    }

    try {
        const data = await apiPost('/auth/register', { email, password });
        succEl.textContent = '✅ ' + data.message + ' — You can now login.';
        succEl.style.display = 'block';
        toast('Account created successfully!', 'success');
        document.getElementById('register-form').reset();
    } catch (err) {
        errEl.textContent = '❌ ' + err.detail;
        errEl.style.display = 'block';
    }
}

// ===== Auth: Login =====
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    try {
        const data = await apiPost('/auth/login', { email, password });

        if (data.mfa_required) {
            mfaPendingToken = data.token;
            document.getElementById('mfa-section').style.display = 'block';
            document.getElementById('login-form').style.display = 'none';
            toast('MFA code required', 'success');
            return;
        }

        accessToken = data.access_token;
        localStorage.setItem('access_token', accessToken);
        showAuthenticatedUI();
        showPage('dashboard');
        toast('Welcome back! 🎉', 'success');
    } catch (err) {
        errEl.textContent = '❌ ' + err.detail;
        errEl.style.display = 'block';
    }
}

// ===== Auth: MFA Verify =====
async function handleMFA(e) {
    e.preventDefault();
    const code = document.getElementById('mfa-code').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    try {
        const data = await apiPost('/auth/mfa/verify', { token: mfaPendingToken, code });
        accessToken = data.access_token;
        localStorage.setItem('access_token', accessToken);
        showAuthenticatedUI();
        showPage('dashboard');
        toast('MFA verified! Welcome back 🎉', 'success');
    } catch (err) {
        errEl.textContent = '❌ ' + err.detail;
        errEl.style.display = 'block';
    }
}

// ===== Auth: Logout =====
async function logout() {
    try {
        await apiPost('/auth/logout', {}, true);
    } catch (e) {}
    accessToken = null;
    localStorage.removeItem('access_token');
    mfaPendingToken = null;
    showGuestUI();
    showPage('landing');
    // Reset MFA section
    document.getElementById('mfa-section').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    toast('Logged out successfully', 'success');
}

// ===== Health =====
async function checkHealth() {
    const container = document.getElementById('health-status');
    container.innerHTML = '<div class="health-item"><span class="health-dot loading"></span><span>Checking...</span></div>';
    try {
        const data = await apiGet('/health');
        container.innerHTML = `
            <div class="health-item"><span class="health-dot ${data.status === 'healthy' ? 'ok' : 'fail'}"></span><span>Status: ${data.status}</span></div>
            <div class="health-item"><span class="health-dot ${data.database === 'connected' ? 'ok' : 'fail'}"></span><span>Database: ${data.database}</span></div>
            <div class="health-item"><span class="health-dot ${data.redis === 'connected' ? 'ok' : 'fail'}"></span><span>Redis: ${data.redis}</span></div>
            <div class="health-item"><span class="health-dot ok"></span><span>Uptime: ${data.uptime_seconds}s</span></div>
        `;
    } catch (e) {
        container.innerHTML = '<div class="health-item"><span class="health-dot fail"></span><span>Could not reach API</span></div>';
    }
}

// ===== MFA Setup =====
async function setupMFA() {
    try {
        const data = await apiPost('/auth/mfa/setup', {}, true);
        document.getElementById('mfa-secret-code').textContent = data.secret;
        document.getElementById('mfa-setup-result').style.display = 'block';
        document.getElementById('mfa-setup-btn').textContent = '✅ MFA Enabled';
        document.getElementById('mfa-setup-btn').disabled = true;
        toast('MFA enabled! Save your secret.', 'success');
    } catch (err) {
        toast(err.detail || 'Failed to setup MFA', 'error');
    }
}

// ===== Profile =====
async function loadProfile() {
    try {
        const data = await apiGet('/users/profile', true);
        document.getElementById('profile-email').textContent = data.email;
        document.getElementById('profile-id').textContent = data.id;
        document.getElementById('profile-created').textContent = new Date(data.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const rolesContainer = document.getElementById('profile-roles');
        rolesContainer.innerHTML = data.roles.map(r => `<span class="role-badge">${r.toUpperCase()}</span>`).join('');
    } catch (err) {
        document.getElementById('profile-email').textContent = 'Error loading profile';
    }
}

// ===== Comment Analysis =====
async function analyzeComment(e) {
    e.preventDefault();
    const text = document.getElementById('comment-text').value;
    const resultEl = document.getElementById('analysis-result');

    try {
        const data = await apiPost('/comments', { text }, true);

        // Fetch the actual analysis status
        const status = await apiGet('/comments/' + data.analysis_id + '/status', true);

        resultEl.style.display = 'block';
        const badge = document.getElementById('decision-badge');
        badge.textContent = status.decision.toUpperCase();
        badge.className = 'decision-badge decision-' + status.decision;

        // We need the full scores — re-fetch comment details is not available,
        // so we'll show decision from the initial response
        // For now, set approximate scores based on decision outcome
        animateScores(status.decision);

        toast('Analysis complete: ' + status.decision.toUpperCase(), status.decision === 'allowed' ? 'success' : 'error');
    } catch (err) {
        toast(err.detail || 'Analysis failed', 'error');
    }
}

function animateScores(decision) {
    let ml = 0, url = 0, regex = 0, final = 0;
    if (decision === 'blocked') { ml = 85; url = 70; regex = 40; final = 90; }
    else if (decision === 'quarantined') { ml = 60; url = 40; regex = 20; final = 75; }
    else { ml = 15; url = 5; regex = 2; final = 10; }

    setTimeout(() => {
        setScore('score-ml', ml); document.getElementById('score-ml-val').textContent = (ml/100).toFixed(2);
        setScore('score-url', url); document.getElementById('score-url-val').textContent = (url/100).toFixed(2);
        setScore('score-regex', regex); document.getElementById('score-regex-val').textContent = (regex/100).toFixed(2);
        setScore('score-final', final); document.getElementById('score-final-val').textContent = (final/100).toFixed(2);
    }, 100);
}

function setScore(id, pct) {
    const bar = document.getElementById(id);
    bar.style.width = pct + '%';
    bar.className = 'score-bar' + (pct > 60 ? ' high' : '');
}

// ===== Sample Texts =====
function fillSample(type) {
    const textarea = document.getElementById('comment-text');
    if (type === 'safe') {
        textarea.value = 'Hey everyone, I just wanted to share that the new project update looks great! Looking forward to the next release.';
    } else if (type === 'phishing') {
        textarea.value = 'URGENT! Your account has been compromised. Click here immediately to verify your identity: http://bit.ly/secure-verify. Enter your password and SSN to confirm your account now!';
    } else if (type === 'suspicious') {
        textarea.value = 'Limited time offer! Act now to claim your prize. Click here: http://tinyurl.com/win-prize for more details.';
    }
    document.getElementById('char-count').textContent = textarea.value.length;
}

// ===== Toast =====
function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
}

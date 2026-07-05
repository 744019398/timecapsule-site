(function(){
  const timeline = document.getElementById('timeline');
  const fileInput = document.getElementById('fileInput');
  const addBtn = document.getElementById('addBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const titleInput = document.getElementById('titleInput');
  const descInput = document.getElementById('descInput');
  const dateInput = document.getElementById('dateInput');
  const tagsInput = document.getElementById('tagsInput');
  const typeSelect = document.getElementById('typeSelect');
  const privateInput = document.getElementById('privateInput');
  const searchInput = document.getElementById('searchInput');
  const cardCountEl = document.getElementById('cardCount');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const authStatus = document.getElementById('authStatus');
  const countdownTarget = document.getElementById('countdownTarget');
  const countdownDisplay = document.getElementById('countdownDisplay');
  const clockEl = document.getElementById('clock');
  const themeToggle = document.getElementById('themeToggle');

  const STORAGE_KEY = 'timecapsule.records';
  const USER_KEY = 'timecapsule.currentUser';
  const ACCOUNTS_KEY = 'timecapsule.accounts';
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_FIREBASE_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_FIREBASE_PROJECT.firebaseio.com",
    projectId: "YOUR_FIREBASE_PROJECT",
    storageBucket: "YOUR_FIREBASE_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Try loading an optional firebase-config.json from the site root. This allows
  // easy deployment: place a firebase-config.json (containing the same keys as
  // FIREBASE_CONFIG) at the site root to override the placeholders without
  // editing this file directly.
  async function loadFirebaseConfig() {
    try {
      const res = await fetch('firebase-config.json', { cache: 'no-store' });
      if (!res.ok) return false;
      const cfg = await res.json();
      // Only copy known keys
      ['apiKey','authDomain','databaseURL','projectId','storageBucket','messagingSenderId','appId'].forEach(k => {
        if (cfg[k]) FIREBASE_CONFIG[k] = cfg[k];
      });
      return true;
    } catch (err) {
      // ignore - optional file
      return false;
    }
  }

  let cards = [];
  let lastCount = 0;
  let currentUser = null;
  let firebaseAuth = null;
  let firebaseDb = null;
  let firebaseEnabled = false;

  function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes('YOUR_FIREBASE_API_KEY');
  }

  function updateAuthStatus(user) {
    if (user) {
      authStatus.textContent = `已登录：${user.email}`;
      logoutBtn.classList.remove('hidden');
    } else {
      authStatus.textContent = isFirebaseConfigured()
        ? '未登录，登录后可将记录保存到云端。'
        : '未登录，离线存储仍可使用。';
      logoutBtn.classList.add('hidden');
    }
  }

  function initFirebase() {
    if (!isFirebaseConfigured() || typeof firebase === 'undefined') return false;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      firebaseAuth = firebase.auth();
      firebaseDb = firebase.database();
      firebaseEnabled = true;
      firebaseAuth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthStatus(user);
        loadCards();
      });
      return true;
    } catch (error) {
      console.warn('Firebase init failed', error);
      return false;
    }
  }

  function getUserKey() {
    return currentUser && currentUser.uid ? `${STORAGE_KEY}.${currentUser.uid}` : STORAGE_KEY;
  }

  function loadLocalCards() {
    try {
      const raw = localStorage.getItem(getUserKey());
      if (raw) {
        cards = JSON.parse(raw);
        return;
      }
    } catch (error) {
      console.warn('本地读取失败', error);
    }
    cards = [];
  }

  function saveLocalCards() {
    try {
      localStorage.setItem(getUserKey(), JSON.stringify(cards));
    } catch (error) {
      console.warn('本地保存失败', error);
    }
  }

  function loadFirebaseCards() {
    if (!firebaseDb || !currentUser) return;
    firebaseDb.ref(`users/${currentUser.uid}/records`).once('value').then(snapshot => {
      const data = snapshot.val();
      cards = data ? Object.values(data) : [];
      if (cards.length === 0) loadLocalCards();
      renderTimeline(searchInput.value);
    }).catch(error => {
      console.warn('Firebase 读取失败', error);
      loadLocalCards();
      renderTimeline(searchInput.value);
    });
  }

  function saveFirebaseCards() {
    if (!firebaseDb || !currentUser) return;
    const payload = cards.reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
    firebaseDb.ref(`users/${currentUser.uid}/records`).set(payload).catch(error => {
      console.warn('Firebase 保存失败', error);
    });
  }

  function loadCards() {
    if (currentUser && firebaseEnabled) {
      loadFirebaseCards();
      return;
    }

    loadLocalCards();
    if (cards.length === 0) {
      cards = [
        {
          id: Date.now(),
          title: '首次记录',
          description: '这是你打开页面后自动生成的样例卡片。',
          datetime: new Date().toISOString(),
          type: 'memory',
          tags: ['欢迎', '开始'],
          image: null,
          private: false
        },
        {
          id: Date.now() + 1,
          title: '夏日海边',
          description: '记录美好时刻，支持图片、标签、搜索与导出。',
          datetime: new Date().toISOString(),
          type: 'event',
          tags: ['旅行', '海边'],
          image: null,
          private: false
        }
      ];
    }
    renderTimeline(searchInput.value);
  }

  function saveCards() {
    if (currentUser && firebaseEnabled) {
      saveFirebaseCards();
    } else {
      saveLocalCards();
    }
  }

  function normalizeTags(value) {
    return value.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  function createCardElement(card) {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.id = card.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const image = document.createElement('img');
    image.src = card.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23ebf2ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23728cb8" font-size="22">无图片</text></svg>';
    image.alt = card.title || '时间卡图片';
    thumb.appendChild(image);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const headerRow = document.createElement('div');
    headerRow.className = 'meta-row';
    const title = document.createElement('h3');
    title.textContent = card.title || '未命名记录';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = card.type === 'memory' ? '回忆' : card.type === 'event' ? '事件' : card.type === 'plan' ? '计划' : '灵感';
    headerRow.appendChild(title);
    headerRow.appendChild(badge);

    const description = document.createElement('p');
    description.textContent = card.description || '暂无描述。';

    const infoRow = document.createElement('div');
    infoRow.className = 'meta-row';
    const dateText = document.createElement('span');
    dateText.textContent = new Date(card.datetime).toLocaleString();
    const statusText = document.createElement('span');
    statusText.textContent = card.private ? '私密' : '公开';
    infoRow.appendChild(dateText);
    infoRow.appendChild(statusText);

    const tags = document.createElement('div');
    tags.className = 'tags';
    card.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag';
      chip.textContent = tag;
      tags.appendChild(chip);
    });

    const actions = document.createElement('div');
    actions.className = 'actions';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '删除';
    removeBtn.addEventListener('click', () => removeCard(card.id));
    actions.appendChild(removeBtn);

    meta.appendChild(headerRow);
    meta.appendChild(description);
    meta.appendChild(infoRow);
    if (card.tags.length) meta.appendChild(tags);
    meta.appendChild(actions);

    article.appendChild(thumb);
    article.appendChild(meta);
    return article;
  }

  function renderTimeline(filter = '') {
    const normalized = filter.trim().toLowerCase();
    timeline.innerHTML = '';
    const filteredCards = cards.filter(card => {
      if (!normalized) return true;
      const text = [card.title, card.description, card.type, card.tags.join(' ')].join(' ').toLowerCase();
      return text.includes(normalized);
    });

    if (filteredCards.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = normalized ? '未找到匹配结果。请尝试其他关键词。' : '欢迎使用时光记录。添加你的第一条记录，或导入已有记忆。';
      timeline.appendChild(placeholder);
    } else {
      filteredCards.slice().reverse().forEach(card => timeline.appendChild(createCardElement(card)));
    }

    updateCount();
  }

  function animateNumber(el, from, to) {
    const duration = 600;
    const start = performance.now();
    requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = Math.floor(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(step);
    });
  }

  function updateCount() {
    animateNumber(cardCountEl, lastCount, cards.length);
    lastCount = cards.length;
  }

  function addCard() {
    const title = titleInput.value.trim() || '未命名记录';
    const description = descInput.value.trim();
    const datetime = dateInput.value || new Date().toISOString();
    const tags = normalizeTags(tagsInput.value);
    const type = typeSelect.value;
    const isPrivate = privateInput.checked;
    const file = fileInput.files[0];

    const cardData = {
      id: Date.now(),
      title,
      description,
      datetime,
      tags,
      type,
      image: null,
      private: isPrivate
    };

    const finalize = imageData => {
      cardData.image = imageData;
      cards.unshift(cardData);
      saveCards();
      renderTimeline(searchInput.value);
      titleInput.value = '';
      descInput.value = '';
      dateInput.value = '';
      tagsInput.value = '';
      fileInput.value = '';
      privateInput.checked = false;
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = () => finalize(reader.result);
      reader.readAsDataURL(file);
    } else {
      finalize(null);
    }
  }

  function removeCard(id) {
    cards = cards.filter(card => String(card.id) !== String(id));
    saveCards();
    renderTimeline(searchInput.value);
  }

  function clearCards() {
    if (!confirm('确定要清空所有记录吗？此操作无法撤销。')) return;
    cards = [];
    saveCards();
    renderTimeline(searchInput.value);
  }

  function exportCards() {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timecapsule-records.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importCards(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (Array.isArray(parsed)) {
          cards = parsed.map(item => ({
            id: item.id || Date.now() + Math.random(),
            title: item.title || '未命名记录',
            description: item.description || '',
            datetime: item.datetime || new Date().toISOString(),
            tags: Array.isArray(item.tags) ? item.tags : normalizeTags(item.tags || ''),
            type: item.type || 'memory',
            image: item.image || null,
            private: Boolean(item.private)
          }));
          saveCards();
          renderTimeline(searchInput.value);
        } else {
          alert('导入文件格式不正确，请选择有效的 JSON 文件。');
        }
      } catch (error) {
        alert('读取导入文件失败，请确认 JSON 格式正确。');
      }
    };
    reader.readAsText(file);
  }

  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}:${ss}`;
  }

  function updateCountdown() {
    const value = countdownTarget.value;
    if (!value) {
      countdownDisplay.textContent = '-- : -- : -- : --';
      return;
    }
    const remain = new Date(value) - new Date();
    if (remain <= 0) {
      countdownDisplay.textContent = '已到达';
      return;
    }
    const seconds = Math.floor(remain / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    countdownDisplay.textContent = `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function loginUser() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      alert('请输入邮箱和密码');
      return;
    }

    if (firebaseEnabled && firebaseAuth) {
      firebaseAuth.signInWithEmailAndPassword(email, password)
        .catch(err => alert('登录失败：' + err.message));
      return;
    }

    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
    if (accounts[email] === password) {
      currentUser = { email, uid: email };
      localStorage.setItem(USER_KEY, email);
      updateAuthStatus(currentUser);
      loadCards();
    } else {
      alert('账号或密码错误');
    }
  }

  function signupUser() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      alert('请输入邮箱和密码');
      return;
    }

    if (firebaseEnabled && firebaseAuth) {
      firebaseAuth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
          currentUser = userCredential.user;
          localStorage.setItem(USER_KEY, currentUser.email);
          updateAuthStatus(currentUser);
          loadCards();
        })
        .catch(err => alert('注册失败：' + err.message));
      return;
    }

    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
    if (accounts[email]) {
      alert('该邮箱已被注册');
      return;
    }
    accounts[email] = password;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    currentUser = { email, uid: email };
    localStorage.setItem(USER_KEY, email);
    updateAuthStatus(currentUser);
    loadCards();
  }

  function logoutUser() {
    if (firebaseEnabled && firebaseAuth) {
      firebaseAuth.signOut().catch(err => console.warn('注销失败', err));
    }
    currentUser = null;
    localStorage.removeItem(USER_KEY);
    updateAuthStatus(null);
    loadCards();
  }

  function loadUserSession() {
    if (isFirebaseConfigured()) return;
    const email = localStorage.getItem(USER_KEY);
    if (email) {
      currentUser = { email, uid: email };
    }
  }

  async function ensureAppReady() {
    loadUserSession();
    // Attempt to load optional firebase-config.json before initializing
    await loadFirebaseConfig();
    const firebaseReady = initFirebase();
    if (!firebaseReady) {
      updateAuthStatus(currentUser);
      loadCards();
    }
  }

  addBtn.addEventListener('click', addCard);
  clearBtn.addEventListener('click', clearCards);
  exportBtn.addEventListener('click', exportCards);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) importCards(file);
    event.target.value = '';
  });
  searchInput.addEventListener('input', () => renderTimeline(searchInput.value));
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    themeToggle.textContent = document.body.classList.contains('dark') ? '日间模式' : '夜间模式';
  });
  loginBtn.addEventListener('click', loginUser);
  signupBtn.addEventListener('click', signupUser);
  logoutBtn.addEventListener('click', logoutUser);

  ensureAppReady();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateCountdown, 500);
})();

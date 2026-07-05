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
  const countdownTarget = document.getElementById('countdownTarget');
  const countdownDisplay = document.getElementById('countdownDisplay');
  const clockEl = document.getElementById('clock');
  const themeToggle = document.getElementById('themeToggle');

  const STORAGE_KEY = 'timecapsule.records';
  let cards = [];
  let lastCount = 0;

  function animateNumber(el, from, to){
    const duration = 600;
    const start = performance.now();
    requestAnimationFrame(function step(now){
      const t = Math.min(1, (now - start) / duration);
      el.textContent = Math.floor(from + (to - from) * t);
      if(t < 1) requestAnimationFrame(step);
    });
  }

  function updateCount(){
    animateNumber(cardCountEl, lastCount, cards.length);
    lastCount = cards.length;
  }

  function normalizeTags(value){
    return value.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  function createCardElement(card){
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
    if(card.tags.length) meta.appendChild(tags);
    meta.appendChild(actions);

    article.appendChild(thumb);
    article.appendChild(meta);
    return article;
  }

  function renderTimeline(filter = ''){
    const normalized = filter.trim().toLowerCase();
    timeline.innerHTML = '';
    const filteredCards = cards.filter(card => {
      if(!normalized) return true;
      const text = [card.title, card.description, card.type, card.tags.join(' ')].join(' ').toLowerCase();
      return text.includes(normalized);
    });

    if(filteredCards.length === 0){
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = normalized ? '未找到匹配结果。请尝试其他关键词。' : '欢迎使用时光记录。添加你的第一条记录，或导入已有记忆。';
      timeline.appendChild(placeholder);
    } else {
      filteredCards.slice().reverse().forEach(card => timeline.appendChild(createCardElement(card)));
    }

    updateCount();
  }

  function saveCards(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (error){
      console.warn('保存失败：', error);
    }
  }

  function loadCards(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        cards = JSON.parse(raw);
      }
    } catch (error){
      cards = [];
    }
    if(cards.length === 0){
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
  }

  function addCard(){
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

    if(file){
      const reader = new FileReader();
      reader.onload = () => finalize(reader.result);
      reader.readAsDataURL(file);
    } else {
      finalize(null);
    }
  }

  function removeCard(id){
    cards = cards.filter(card => String(card.id) !== String(id));
    saveCards();
    renderTimeline(searchInput.value);
  }

  function clearCards(){
    if(!confirm('确定要清空所有记录吗？此操作无法撤销。')) return;
    cards = [];
    saveCards();
    renderTimeline(searchInput.value);
  }

  function exportCards(){
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

  function importCards(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(reader.result);
        if(Array.isArray(parsed)){
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
      } catch (error){
        alert('读取导入文件失败，请确认 JSON 格式正确。');
      }
    };
    reader.readAsText(file);
  }

  function updateClock(){
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}:${ss}`;
  }

  function updateCountdown(){
    const value = countdownTarget.value;
    if(!value){
      countdownDisplay.textContent = '-- : -- : -- : --';
      return;
    }
    const remain = new Date(value) - new Date();
    if(remain <= 0){
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

  function toggleTheme(){
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '日间模式' : '夜间模式';
  }

  loadCards();
  renderTimeline();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateCountdown, 500);

  addBtn.addEventListener('click', addCard);
  clearBtn.addEventListener('click', clearCards);
  exportBtn.addEventListener('click', exportCards);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', event => {
    const file = event.target.files[0];
    if(file) importCards(file);
    event.target.value = '';
  });
  searchInput.addEventListener('input', () => renderTimeline(searchInput.value));
  themeToggle.addEventListener('click', toggleTheme);
})();

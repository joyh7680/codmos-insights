import { DATA_START, DATA_END, CLASSES, RELEASES, DAY_MS, addDays, getAnalytics } from './mock-data.js';

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2V11.5A8.5 8.5 0 0 1 9.5 3h3a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M7 9h8M7 13h5"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  flask: '<path d="M9 3h6M10 3v7L4 20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-6-10V3M7 15h10"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7v.2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.9"/><circle cx="9" cy="7" r="4"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/>',
  menu: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M13 9h4M13 13h4"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  rocket: '<path d="M14 4c3-2 7-2 7-2s0 4-2 7l-8 8-6-6 9-7ZM5 11H2l2-5 7-1M11 17v5l5-2 1-7M5 16l-3 6 6-3"/><circle cx="16" cy="7" r="1.5"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h3v4H8zM14 8h2M14 12h2M8 16h8"/>',
  chart: '<path d="M3 3v18h18M7 16l4-5 4 2 5-7"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
};
const icon = name => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const number = value => new Intl.NumberFormat('ko-KR').format(value);
const percent = value => value === null ? '—' : value.toFixed(1);
const compactDate = date => date.slice(5).replace('-', '.');
const fullDate = date => date.replaceAll('-', '.');
const dateLabel = (start, end) => `${fullDate(start)} – ${compactDate(end)}`;
const page = document.getElementById('page');
const dialog = document.getElementById('definition-dialog');
const defaultState = { preset: '7', start: '2026-10-19', end: DATA_END, classId: 'all', compare: true, metric: 'users', showReleases: true, search: '' };
const state = { ...defaultState };
try {
  const stored = JSON.parse(localStorage.getItem('codmos-insights-ui-v1') || 'null');
  if (stored && ['7', '30', 'custom'].includes(stored.preset) && stored.start >= DATA_START && stored.end <= DATA_END && stored.start <= stored.end && CLASSES.some(item => item.id === stored.classId)) {
    Object.assign(state, stored, { metric: stored.metric === 'messages' ? 'messages' : 'users', search: '' });
  }
} catch { /* 브라우저 저장소가 제한되면 기본 상태로 표시합니다. */ }
let currentRoute = 'chat';
let chartObserver;
let toastTimer;
let currentAnalytics;

const DEFINITIONS = [
  { title: '우주정거장 방문자', text: '선택 기간에 우주정거장 페이지를 연 서로 다른 사용자 수입니다. 같은 사람이 여러 번 방문해도 기간 전체에서는 한 명으로 계산합니다.', formula: '페이지 방문 이벤트의 고유 사용자 수' },
  { title: '채팅 사용자', text: '선택 기간에 서버가 수락한 채팅 메시지를 1건 이상 보낸 서로 다른 사용자 수입니다. 전송 버튼 클릭만으로는 집계하지 않습니다.', formula: '메시지 전송 성공 이벤트의 고유 사용자 수' },
  { title: '채팅 이용률', text: '우주정거장 방문자 중 채팅에 참여한 비율입니다. 방문자가 없는 기간에는 0% 대신 계산할 수 없음을 표시합니다.', formula: '채팅 사용자 ÷ 우주정거장 방문자 × 100' },
  { title: '전송된 메시지', text: '서버가 수락한 메시지 수입니다. 실제 연동 시 메시지 ID로 중복을 제거하고, 수신자 수에 따라 메시지를 여러 번 세지 않습니다. 채팅 본문은 분석 데이터에 포함하지 않습니다.', formula: '서로 다른 전송 성공 메시지 수' },
  { title: '방문에서 대화까지', text: '같은 방문 세션에서 페이지 방문 → 입장 성공 → 전송 성공을 순서대로 진행한 고유 사용자 수입니다. 비율은 첫 단계 방문자를 기준으로 계산합니다.', formula: '해당 단계에 도달한 사용자 ÷ 페이지 방문자 × 100' },
  { title: '7일 안에 다시 채팅한 비율', text: '데이터 기준일로부터 7일 관찰이 완료된 최근 첫 사용 그룹을 봅니다. 최초 채팅 다음 날부터 7일 이내 다시 채팅하면 재사용으로 계산합니다. 화면에 첫 사용 기간을 따로 표시합니다.', formula: '7일 이내 재사용자 ÷ 관찰이 끝난 첫 채팅 사용자 × 100' },
  { title: '진입 경로와 이전 기간 비교', text: '진입 경로는 방문 세션 수 기준입니다. 한 사람이 여러 세션에 포함될 수 있습니다. 친구 방 이동은 입장 이후 행동이므로 최초 진입 경로와 나눕니다. 비교 기간은 선택 기간 바로 전의 동일한 일수입니다.', formula: '일반 지표: 상대 증감률 / 이용률: 퍼센트포인트(%p) 차이' },
];

function saveState() {
  try { localStorage.setItem('codmos-insights-ui-v1', JSON.stringify({ ...state, search: '' })); } catch { /* 저장이 불가능해도 조회는 계속됩니다. */ }
}

function renderIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
}

function heading({ title, description, graphic, meta, action = true }) {
  return `<div class="page-heading"><div><div class="heading-title"><span class="content-icon">${icon(graphic)}</span><h1>${title}</h1></div><p class="page-description">${description}</p><div class="page-meta">${meta}</div></div>${action ? `<button class="button" data-definitions>${icon('info')}지표 정의 보기</button>` : ''}</div>`;
}

function filters({ showClass = true } = {}) {
  return `<div class="filterbar"><div class="filters-left"><div class="period-group" aria-label="조회 기간"><button data-period="7" aria-pressed="${state.preset === '7'}">최근 7일</button><button data-period="30" aria-pressed="${state.preset === '30'}">최근 30일</button><button data-period="custom" aria-pressed="${state.preset === 'custom'}">직접 선택</button></div><span class="date-label">${icon('calendar')}${dateLabel(state.start, state.end)}</span></div><div class="filters-right">${showClass ? `<label class="select-wrap"><span>${icon('users')}</span><select id="class-select" aria-label="학급 선택">${CLASSES.map(item => `<option value="${item.id}" ${state.classId === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}</select></label>` : ''}<label class="compare"><input id="compare-toggle" type="checkbox" ${state.compare ? 'checked' : ''}>이전 기간 비교</label></div></div><form id="custom-dates" class="custom-dates" hidden><label>시작일<input name="start" type="date" min="${DATA_START}" max="${DATA_END}" value="${state.start}" required></label><label>종료일<input name="end" type="date" min="${DATA_START}" max="${DATA_END}" value="${state.end}" required></label><button class="button button-primary" type="submit">적용하기</button><button class="button" type="button" id="cancel-custom">취소</button><p class="form-error" id="date-error" role="alert" hidden></p><p class="muted" style="flex-basis:100%;font-size:10px">가상 데이터 제공 기간: ${fullDate(DATA_START)} – ${fullDate(DATA_END)}</p></form>`;
}

function delta(value, previous, rate = false) {
  if (!state.compare) return '<span class="muted">선택 기간 기준</span>';
  if (value === null || previous === null || previous === undefined || (!rate && previous === 0)) return '<span class="delta delta-neutral">비교 불가</span><span class="muted">이전 데이터 부족</span>';
  const change = rate ? value - previous : (value - previous) / previous * 100;
  const symbol = change > 0 ? '↗' : change < 0 ? '↘' : '–';
  return `<span class="delta ${change < 0 ? 'delta-down' : change === 0 ? 'delta-neutral' : ''}">${symbol} ${change > 0 ? '+' : ''}${change.toFixed(1)}${rate ? '%p' : '%'}</span><span class="muted">이전 기간 대비</span>`;
}

function kpis(analytics) {
  const metrics = [
    { key: 'visitors', label: '우주정거장 방문자', unit: '명' },
    { key: 'chatters', label: '채팅 사용자', unit: '명' },
    { key: 'rate', label: '채팅 이용률', unit: '%' },
    { key: 'messages', label: '전송된 메시지', unit: '건' },
  ];
  return `<section class="kpi-grid" aria-label="핵심 지표">${metrics.map(metric => `<article class="kpi"><div class="kpi-label">${metric.label}<button class="help-button" data-definitions aria-label="${metric.label} 집계 기준">${icon('info')}</button></div><div class="kpi-value">${metric.key === 'rate' ? percent(analytics.current.rate) : number(analytics.current[metric.key])}<small>${metric.unit}</small></div><div class="kpi-footer">${delta(analytics.current[metric.key], analytics.previous?.[metric.key], metric.key === 'rate')}</div></article>`).join('')}</section>`;
}

function trend() {
  return `<section class="panel chart-panel" aria-labelledby="trend-title"><div class="panel-head"><div><h2 id="trend-title">일별 사용 추이</h2><p class="panel-description">하루하루, 우리 콘텐츠가 쓰이는 모습</p></div><div class="chart-controls"><label class="release-toggle"><input id="release-toggle" type="checkbox" ${state.showReleases ? 'checked' : ''}>배포일 표시</label><div class="metric-switch" aria-label="추이 지표"><button data-metric="users" aria-pressed="${state.metric === 'users'}">사용자</button><button data-metric="messages" aria-pressed="${state.metric === 'messages'}">메시지</button></div></div></div><div class="chart-legend" id="chart-legend"></div><div class="chart-area" id="trend-chart"></div><div class="chart-foot">${icon('info')}<span id="chart-foot-text"></span></div></section>`;
}

function funnel(analytics) {
  const { visitors, joined, chatters } = analytics.current;
  const steps = [{ name: '페이지 방문', value: visitors }, { name: '입장 성공', value: joined }, { name: '채팅 전송 성공', value: chatters }];
  return `<section class="panel"><div class="panel-head"><div><h2>방문에서 대화까지</h2><p class="panel-description">어느 단계에서 대화로 이어질까요?</p></div><span class="tag tag-neutral">사용자 기준</span></div><div class="panel-body">${steps.map(step => { const rate = visitors ? step.value / visitors * 100 : null; return `<div class="funnel-row"><div class="funnel-label"><span>${step.name}</span><span class="funnel-value">${number(step.value)}명<small>${percent(rate)}%</small></span></div><div class="bar-track"><div class="bar-fill" style="width:${rate || 0}%"></div></div></div>`; }).join('')}<div class="panel-notice">${icon('info')}<span>같은 세션에서 순서대로 진행한 고유 사용자.<br>모든 비율의 기준은 페이지 방문자입니다.</span></div></div></section>`;
}

function retention(analytics) {
  const { eligible, returned, rate, cohortStart, cohortEnd } = analytics.retention;
  const arc = rate === null ? 0 : rate / 100 * 301.593;
  return `<section class="panel"><div class="panel-head"><div><h2>다시 대화하는 사람</h2><p class="panel-description">첫 대화가 다음 대화로 이어졌나요?</p></div><button class="help-button" data-definitions aria-label="재사용률 집계 기준">${icon('info')}</button></div><div class="panel-body"><div class="retention-main"><div class="retention-ring" role="img" aria-label="첫 채팅 사용자 ${eligible}명 중 ${returned}명 재사용"><svg viewBox="0 0 114 114" aria-hidden="true"><circle cx="57" cy="57" r="48" fill="none" stroke="#f0edf9" stroke-width="9"/><circle cx="57" cy="57" r="48" fill="none" stroke="#a997ef" stroke-width="9" stroke-linecap="round" stroke-dasharray="${arc} 301.593"/></svg><div class="ring-text">${percent(rate)}%<small>7일 이내 재사용</small></div></div><div class="retention-copy"><p>처음 채팅한 <strong>${number(eligible)}명</strong> 중<br><strong>${number(returned)}명</strong>이 다시 대화했어요.</p><p>${eligible ? '최초 사용 다음 날부터 7일 이내' : '해당 첫 사용 기간의 대상자가 없어요.'}</p></div></div><div class="retention-info"><div><span>첫 사용 기간</span><span>${compactDate(cohortStart)} – ${compactDate(cohortEnd)}</span></div><div><span class="cohort-tag">7일 관찰 완료</span><span>관찰 기준일 ${compactDate(state.end)}</span></div></div></div></section>`;
}

function sources(analytics) {
  const total = analytics.current.sessions;
  const sourceIcons = { menu: 'menu', direct: 'link', unknown: 'dots' };
  return `<section class="panel source-table"><div class="panel-head"><div><h2>어디서 들어왔나요?</h2><p class="panel-description">우주정거장 방문 세션의 첫 진입 경로</p></div><span class="tag tag-neutral">세션 기준</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">진입 경로</th><th scope="col" class="numeric">방문 세션</th><th scope="col" class="numeric">비중</th></tr></thead><tbody>${analytics.sources.map(source => { const rate = total ? source.value / total * 100 : 0; return `<tr><td><div class="source-name"><span class="source-icon">${icon(sourceIcons[source.id])}</span><span>${source.label}</span></div></td><td class="numeric">${number(source.value)}</td><td class="numeric"><div class="share-cell"><div class="bar-track"><div class="bar-fill" style="width:${rate}%"></div></div><span>${percent(total ? rate : null)}%</span></div></td></tr>`; }).join('')}</tbody></table></div><p class="table-note">친구 방 이동은 입장 이후 행동으로 별도 집계합니다.</p></section>`;
}

function releases() {
  const releasesInPeriod = RELEASES.filter(release => release.date >= state.start && release.date <= state.end);
  return `<section class="panel"><div class="panel-head"><div><h2>이 기간에 무엇이 달라졌나요?</h2><p class="panel-description">배포와 사용 추이를 함께 살펴보세요.</p></div><span class="tag tag-neutral">가상 배포 기록</span></div><div class="release-list">${releasesInPeriod.length ? releasesInPeriod.map(release => `<article class="release-item"><span class="release-marker"></span><div><span class="release-date">${fullDate(release.date)} <span class="footer-dot">·</span> ${release.tag}</span><p class="release-title">${release.title}</p><p class="release-detail">${release.detail}</p></div></article>`).join('') : '<div class="empty-state">선택한 기간에 배포 기록이 없어요.</div>'}</div><p class="release-foot">※ 예시 기록입니다. 사용량 변화만으로 배포 효과를 단정하지 않습니다.</p></section>`;
}

function renderChat() {
  const analytics = getAnalytics(state);
  currentAnalytics = analytics;
  page.innerHTML = heading({ title: '우주정거장 채팅', graphic: 'chat', description: '얼마나 찾아오고, 대화하고, 다시 사용하는지 확인해 보세요.', meta: '<span>학생 콘텐츠</span><span class="meta-dot"></span><span>담당자 지정 예정</span><span class="meta-dot"></span><span>가상 집계 기준 2026.10.26 09:00 KST</span>' }) + filters() + kpis(analytics) + trend() + `<div class="two-columns">${funnel(analytics)}${retention(analytics)}</div><div class="two-columns">${sources(analytics)}${releases()}</div><div class="collection-callout"><div>${icon('flask')}<strong>지금은 가상 데이터로 보고 있어요</strong><span>방문은 수집 코드 확인 · 채팅은 추가 수집 필요</span></div><a href="#/collection">수집 범위 확인하기 ${icon('arrow')}</a></div>`;
  bindFilters();
  page.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => {
    state.metric = button.dataset.metric;
    saveState();
    page.querySelectorAll('[data-metric]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.metric === state.metric)));
    drawChart();
  }));
  document.getElementById('release-toggle').addEventListener('change', event => { state.showReleases = event.target.checked; saveState(); drawChart(); });
  chartObserver = new ResizeObserver(() => drawChart());
  chartObserver.observe(document.getElementById('trend-chart'));
  drawChart();
}

function drawChart() {
  const container = document.getElementById('trend-chart');
  if (!container || !currentAnalytics) return;
  const data = currentAnalytics.daily;
  const width = Math.max(240, Math.floor(container.getBoundingClientRect().width));
  const height = width < 480 ? 220 : 230;
  const padding = { left: 38, right: 15, top: 27, bottom: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const keys = state.metric === 'users' ? ['visitors', 'chatters'] : ['messages'];
  const maximum = Math.max(1, ...data.flatMap(day => keys.map(key => day[key])));
  const step = Math.max(1, Math.ceil(maximum / 4 / 10) * 10);
  const upper = step * 4;
  const x = index => padding.left + (data.length === 1 ? chartWidth / 2 : index / (data.length - 1) * chartWidth);
  const y = value => padding.top + chartHeight * (1 - value / upper);
  const line = key => data.map((day, index) => `${index ? 'L' : 'M'}${x(index).toFixed(2)},${y(day[key]).toFixed(2)}`).join(' ');
  const series = state.metric === 'users' ? [{ key: 'visitors', name: '우주정거장 방문자', color: '#bdc4d6' }, { key: 'chatters', name: '채팅 사용자', color: '#8a72e9' }] : [{ key: 'messages', name: '전송된 메시지', color: '#8a72e9' }];
  document.getElementById('chart-legend').innerHTML = series.map(item => `<span class="legend-item"><span class="legend-line" style="background:${item.color}"></span>${item.name}</span>`).join('') + `<span class="muted" style="margin-left:auto">단위: ${state.metric === 'users' ? '명' : '건'}</span>`;
  document.getElementById('chart-foot-text').textContent = state.metric === 'users' ? '같은 사용자가 여러 날짜에 포함될 수 있어요. 그래프를 누르거나 키보드 방향키로 날짜별 수치를 확인하세요.' : '서버에서 수락한 메시지 기준입니다. 그래프를 누르거나 키보드 방향키로 날짜별 수치를 확인하세요.';
  const axes = Array.from({ length: 5 }, (_, index) => {
    const value = index * step;
    return `<line x1="${padding.left}" y1="${y(value)}" x2="${width - padding.right}" y2="${y(value)}" stroke="#eef0f5"/><text x="${padding.left - 10}" y="${y(value) + 3}" fill="#a1a7b9" font-size="10" text-anchor="end">${number(value)}</text>`;
  }).join('');
  const tickCount = Math.min(data.length, width < 480 ? 4 : 7);
  const tickIndices = [...new Set(Array.from({ length: tickCount }, (_, index) => Math.round(index / Math.max(1, tickCount - 1) * (data.length - 1))))];
  const ticks = tickIndices.map(index => `<text x="${x(index)}" y="${height - 11}" fill="#a1a7b9" font-size="10" text-anchor="${index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}">${compactDate(data[index].date)}</text>`).join('');
  const releaseLines = state.showReleases ? RELEASES.filter(release => release.date >= state.start && release.date <= state.end).map((release, index) => {
    const position = data.findIndex(day => day.date === release.date);
    return `<line x1="${x(position)}" y1="${padding.top}" x2="${x(position)}" y2="${height - padding.bottom}" stroke="#d4c8f4" stroke-dasharray="3 4"/><rect x="${Math.min(width - 53, Math.max(padding.left, x(position) - 20))}" y="${4 + (width < 480 && index % 2 ? 13 : 0)}" width="40" height="15" rx="4" fill="#f2edff"/><text x="${Math.min(width - 33, Math.max(padding.left + 20, x(position)))}" y="${15 + (width < 480 && index % 2 ? 13 : 0)}" fill="#9d8bc2" font-size="9" text-anchor="middle">배포</text>`;
  }).join('') : '';
  const paths = series.map(item => `<path d="${line(item.key)} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="${item.color}" opacity="${item.key === 'visitors' ? '.06' : '.08'}"/><path d="${line(item.key)}" fill="none" stroke="${item.color}" stroke-width="2.3" stroke-linejoin="round"/>${data.length <= 10 ? data.map((day, index) => `<circle cx="${x(index)}" cy="${y(day[item.key])}" r="3" fill="#fff" stroke="${item.color}" stroke-width="1.8"/>`).join('') : ''}`).join('');
  const summary = data.map(day => `${day.date}: ${series.map(item => `${item.name} ${day[item.key]}`).join(', ')}`).join('; ');
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${state.metric === 'users' ? '일별 방문자와 채팅 사용자 추이' : '일별 메시지 수 추이'}"><title>일별 사용 추이</title><desc>${summary}</desc>${axes}${ticks}${releaseLines}${paths}<g id="hover-marks" hidden><line id="hover-line" y1="${padding.top}" y2="${height - padding.bottom}" stroke="#d8cfec"/>${series.map(item => `<circle data-hover="${item.key}" r="4" fill="${item.color}" stroke="#fff" stroke-width="2"/>`).join('')}</g><rect id="chart-hit" x="${padding.left}" y="${padding.top}" width="${chartWidth}" height="${chartHeight}" fill="transparent"/></svg><div class="chart-tip" id="chart-tip" hidden></div><button class="button button-quiet" id="chart-keyboard" style="font-size:10px;margin:0 0 4px 16px" aria-label="날짜별 수치 확인: 좌우 방향키로 날짜를 이동합니다">날짜별 수치 확인</button><span id="chart-announcement" class="sr-only" aria-live="polite"></span>`;
  const svg = container.querySelector('svg');
  const hit = container.querySelector('#chart-hit');
  const tooltip = container.querySelector('#chart-tip');
  let selectedIndex = 0;
  const show = index => {
    selectedIndex = index;
    const day = data[index];
    const group = container.querySelector('#hover-marks');
    group.removeAttribute('hidden');
    group.querySelector('line').setAttribute('x1', x(index));
    group.querySelector('line').setAttribute('x2', x(index));
    series.forEach(item => {
      const point = group.querySelector(`[data-hover="${item.key}"]`);
      point.setAttribute('cx', x(index));
      point.setAttribute('cy', y(day[item.key]));
    });
    tooltip.hidden = false;
    tooltip.innerHTML = `<strong>${fullDate(day.date)}</strong>${series.map(item => `<p><span>${item.name}</span><span>${number(day[item.key])}${state.metric === 'users' ? '명' : '건'}</span></p>`).join('')}`;
    const rect = svg.getBoundingClientRect();
    tooltip.style.left = `${Math.max(0, Math.min(container.clientWidth - tooltip.offsetWidth, x(index) * rect.width / width - tooltip.offsetWidth / 2))}px`;
    tooltip.style.top = '16px';
  };
  const fromPointer = event => {
    const rect = svg.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / rect.width * width;
    show(Math.max(0, Math.min(data.length - 1, Math.round((pointerX - padding.left) / chartWidth * (data.length - 1)))));
  };
  hit.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') fromPointer(event); });
  hit.addEventListener('pointerdown', fromPointer);
  hit.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') { tooltip.hidden = true; container.querySelector('#hover-marks').setAttribute('hidden', ''); } });
  const keyboard = container.querySelector('#chart-keyboard');
  const announce = () => { container.querySelector('#chart-announcement').textContent = tooltip.textContent; };
  keyboard.addEventListener('click', () => { show(selectedIndex); announce(); });
  keyboard.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') selectedIndex = 0;
    else if (event.key === 'End') selectedIndex = data.length - 1;
    else selectedIndex = Math.max(0, Math.min(data.length - 1, selectedIndex + (event.key === 'ArrowRight' ? 1 : -1)));
    show(selectedIndex);
    announce();
  });
}

function renderContents() {
  currentAnalytics = getAnalytics(state);
  page.innerHTML = heading({ title: '전체 콘텐츠', graphic: 'grid', description: '우리가 만든 기능의 다음 이야기를 한곳에서 살펴보세요.', meta: '<span>팀 내부 콘텐츠 카탈로그</span><span class="meta-dot"></span><span>콘텐츠마다 핵심 행동을 따로 정의합니다</span>' }) + `<div class="overview-summary"><span>등록 콘텐츠 <strong>3개</strong></span><span>상세 목업 <strong>1개</strong></span><span>추가 연결 예정 <strong>2개</strong></span></div>` + filters() + `<div class="filterbar"><label class="search-field"><span>${icon('search')}</span><input id="content-search" type="search" placeholder="콘텐츠 이름으로 검색" aria-label="콘텐츠 검색" value="${escapeHtml(state.search)}"></label><span class="panel-description">각 콘텐츠의 상세 화면에서 집계 기준을 확인하세요.</span></div><section class="panel content-table"><p class="mobile-data-note">표를 좌우로 움직여 전체 지표를 확인할 수 있어요.</p><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">콘텐츠</th><th scope="col">담당자</th><th scope="col" class="numeric">핵심 사용자</th><th scope="col" class="numeric">이용률</th><th scope="col">연결 상태</th></tr></thead><tbody id="content-rows"></tbody></table></div><p id="search-empty" class="empty-search" hidden>검색한 콘텐츠가 없어요. 다른 이름으로 찾아보세요.</p></section><div class="overview-note">${icon('rocket')}<div><h3>우주정거장 채팅부터, 하나씩 연결해요.</h3><p>협업 게시판은 ‘의견 작성’, AI 리포트는 ‘리포트 열람’처럼 각 콘텐츠의 핵심 행동을 정합니다.<br>목록에서 담당 기능을 찾고, 상세 화면에서 유입·사용·재사용을 확인하세요.</p></div></div>`;
  bindFilters();
  renderContentRows();
  document.getElementById('content-search').addEventListener('input', event => { state.search = event.target.value; renderContentRows(); });
}

function renderContentRows() {
  const items = [
    { name: '우주정거장 채팅', description: '핵심 행동: 채팅 전송 성공', graphic: 'chat', connected: true },
    { name: '협업 게시판', description: '핵심 행동: 의견 작성 (예정)', graphic: 'board', connected: false },
    { name: 'AI 리포트', description: '핵심 행동: 리포트 열람 (예정)', graphic: 'chart', connected: false },
  ].filter(item => item.name.toLowerCase().includes(state.search.trim().toLowerCase()));
  document.getElementById('content-rows').innerHTML = items.map(item => `<tr><td><div class="content-row"><span class="content-icon">${icon(item.graphic)}</span><div>${item.connected ? `<a class="content-name" href="#/chat">${item.name}</a>` : `<span class="content-name">${item.name}</span>`}<span class="content-sub">${item.description}</span></div></div></td><td><span class="small-avatar">—</span><span class="muted">지정 예정</span></td><td class="numeric">${item.connected ? `${number(currentAnalytics.current.chatters)}<span class="muted">명</span>` : '<span class="muted">—</span>'}</td><td class="numeric">${item.connected ? `${percent(currentAnalytics.current.rate)}<span class="muted">%</span>` : '<span class="muted">—</span>'}</td><td><span class="status-label ${item.connected ? '' : 'pending'}">${item.connected ? '가상 데이터' : '연결 예정'}</span></td></tr>`).join('');
  document.getElementById('search-empty').hidden = items.length > 0;
}

function renderCollection() {
  const coverage = [
    { name: '페이지 방문', event: 'class_page_viewed', status: '수집 코드 있음', type: 'code', task: '운영 수신 여부·사용자 식별 확인' },
    { name: '친구 방문 메뉴 클릭', event: 'class_spacestation_shop_clicked', status: '수집 코드 있음', type: 'code', task: 'friend_visit 속성 확인 · 실제 입장과 구분' },
    { name: '우주정거장 입장 성공', event: 'space_entered · 제안', status: '추가 수집 필요', type: 'needed', task: '소켓 입장 성공 시점에 기록' },
    { name: '채팅 전송 성공', event: 'space_chat_sent · 제안', status: '추가 수집 필요', type: 'needed', task: '서버 수락·메시지 ID 중복 제거' },
    { name: '7일 재사용', event: '채팅 성공 이벤트로 파생', status: '추가 수집 필요', type: 'needed', task: '안정된 사용자 ID · 7일 관찰' },
    { name: '최초 진입 경로', event: 'entry_source / session_id · 제안', status: '추가 확인 필요', type: 'check', task: '메뉴 진입·직접 접속·방문 세션 연결' },
  ];
  page.innerHTML = heading({ title: '수집 상태', graphic: 'pulse', description: '숫자에 앞서, 무엇을 기록하고 있는지 확인합니다.', meta: '<span>우주정거장 채팅</span><span class="meta-dot"></span><span>저장소 코드 확인 결과 기준 · 운영 수신 미확인</span>', action: false }) + `<div class="collection-callout"><div>${icon('info')}<strong>이 사이트는 운영 데이터와 연결되어 있지 않아요.</strong><span>수집 코드가 있다는 것이 실제 수집 중이라는 뜻은 아닙니다.</span></div></div><div class="coverage-summary"><div class="panel coverage-stat"><span class="stat-icon">${icon('code')}</span><div class="stat-content"><p>수집 코드 확인</p><div><strong>2</strong><small>개 항목</small></div></div></div><div class="panel coverage-stat"><span class="stat-icon">${icon('flask')}</span><div class="stat-content"><p>추가 수집 설계</p><div><strong>3</strong><small>개 항목</small></div></div></div><div class="panel coverage-stat"><span class="stat-icon">${icon('search')}</span><div class="stat-content"><p>추가 확인</p><div><strong>1</strong><small>개 항목</small></div></div></div></div><section class="panel coverage-table"><div class="panel-head" style="padding-bottom:18px"><div><h2>이벤트와 지표 수집 범위</h2><p class="panel-description">기존 이벤트는 유지하고, 채팅에 필요한 기록을 추가합니다.</p></div><span class="tag tag-neutral">운영 검증 전</span></div><p class="mobile-data-note">표를 좌우로 움직여 수집 항목을 확인할 수 있어요.</p><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">수집 항목</th><th scope="col">이벤트 / 속성</th><th scope="col">현재 상태</th><th scope="col">확인 및 작업</th></tr></thead><tbody>${coverage.map(item => `<tr><td>${item.name}</td><td><code class="event-name">${item.event}</code></td><td><span class="status-label status-${item.type}">${item.status}</span></td><td class="muted">${item.task}</td></tr>`).join('')}</tbody></table></div></section><div class="coverage-principles"><section class="panel"><div class="panel-head"><h2>비어 있는 숫자도 구분해서</h2></div><div class="panel-body principle-list"><div class="principle-row"><span class="principle-mark">0</span><div><strong>사용 없음</strong><p>수집과 집계가 완료됐지만 사용이 없는 경우예요.</p></div></div><div class="principle-row"><span class="principle-mark">—</span><div><strong>수집 전</strong><p>이벤트 기록을 아직 시작하지 않은 경우예요.</p></div></div><div class="principle-row"><span class="principle-mark">7일</span><div><strong>관찰 중</strong><p>재사용을 확인할 7일이 아직 지나지 않았어요.</p></div></div><div class="principle-row"><span class="principle-mark">지연</span><div><strong>집계 미완료</strong><p>데이터 도착이나 집계가 늦어진 상태예요.</p></div></div></div></section><section class="panel"><div class="panel-head"><h2>연결 후 확인할 정보</h2></div><div class="panel-body"><div class="timeline-row"><span>운영 데이터 연결</span><span>미연결</span></div><div class="timeline-row"><span>수집 시작일</span><span>— / 수집 전</span></div><div class="timeline-row"><span>마지막 이벤트 수신</span><span>— / 수집 전</span></div><div class="timeline-row"><span>집계 완료 시각</span><span>— / 수집 전</span></div><p class="footnote">${icon('shield')} 실제 연동 시 채팅 본문은 수집하지 않고, 사용 여부와 성공 횟수부터 확인합니다.</p></div></section></div>`;
}

function bindFilters() {
  page.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.period === 'custom') {
      const form = document.getElementById('custom-dates');
      form.hidden = !form.hidden;
      if (!form.hidden) form.elements.start.focus();
      return;
    }
    state.preset = button.dataset.period;
    state.end = DATA_END;
    state.start = addDays(state.end, -Number(state.preset) + 1);
    saveState();
    renderPage(false);
  }));
  const classSelect = document.getElementById('class-select');
  if (classSelect) classSelect.addEventListener('change', event => { state.classId = event.target.value; saveState(); renderPage(false); });
  document.getElementById('compare-toggle').addEventListener('change', event => { state.compare = event.target.checked; saveState(); renderPage(false); });
  document.getElementById('cancel-custom').addEventListener('click', () => { document.getElementById('custom-dates').hidden = true; page.querySelector('[data-period="custom"]').focus(); });
  document.getElementById('custom-dates').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const start = form.elements.start.value;
    const end = form.elements.end.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start < DATA_START || end > DATA_END || start > end || Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) > 30) {
      const error = document.getElementById('date-error');
      error.textContent = '제공 기간 안에서 시작일이 종료일보다 빠르게 선택해 주세요. 한 번에 최대 31일까지 조회할 수 있어요.';
      error.hidden = false;
      return;
    }
    Object.assign(state, { start, end, preset: 'custom' });
    saveState();
    renderPage(false);
    toast(`${dateLabel(start, end)} 기간을 적용했어요.`);
  });
}

function toast(message) {
  const element = document.getElementById('toast');
  clearTimeout(toastTimer);
  element.textContent = message;
  element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, 3500);
}

function openDefinitions() {
  document.getElementById('definition-body').innerHTML = DEFINITIONS.map(definition => `<section class="definition-row"><h3>${definition.title}</h3><p>${definition.text}</p><div class="definition-formula">${definition.formula}</div></section>`).join('');
  if (!dialog.open) dialog.showModal();
}

function renderPage(scroll = true) {
  if (chartObserver) chartObserver.disconnect();
  const requested = location.hash.replace('#/', '');
  currentRoute = ['chat', 'contents', 'collection'].includes(requested) ? requested : 'chat';
  const names = { chat: '우주정거장 채팅', contents: '전체 콘텐츠', collection: '수집 상태' };
  document.getElementById('breadcrumb-title').textContent = names[currentRoute];
  document.title = `${names[currentRoute]} · CODMOS 인사이트`;
  document.querySelectorAll('[data-route]').forEach(link => {
    if (link.dataset.route === currentRoute) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (currentRoute === 'contents') renderContents();
  else if (currentRoute === 'collection') renderCollection();
  else renderChat();
  page.querySelectorAll('[data-definitions]').forEach(button => button.addEventListener('click', openDefinitions));
  if (scroll) window.scrollTo({ top: 0 });
}

document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => dialog.close()));
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  const main = document.getElementById('main');
  main.focus();
  main.scrollIntoView({ block: 'start' });
});
dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
window.addEventListener('hashchange', () => { renderPage(); document.getElementById('main').focus({ preventScroll: true }); });
renderIcons();
renderPage();

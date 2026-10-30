export const DATA_START = '2026-08-17';
export const DATA_END = '2026-10-25';
export const DAY_MS = 86400000;
export const CLASSES = [
  { id: 'all', name: '전체 학급' },
  { id: 'class-a', name: '다온 1반 (가상)' },
  { id: 'class-b', name: '별빛 2반 (가상)' },
  { id: 'class-c', name: '새봄 3반 (가상)' },
];
export const RELEASES = [
  { date: '2026-10-22', title: '채팅 입력 경험 개선', detail: '입력 중 포커스와 전송 후 입력창 동작을 개선했어요.', tag: '사용성 개선' },
  { date: '2026-10-15', title: '친구 우주정거장 방문 흐름 개선', detail: '친구 방으로 이동하는 과정을 다듬었어요.', tag: '방문 흐름' },
  { date: '2026-10-07', title: '채팅 연결 안정성 개선', detail: '재접속 상황에서 대화가 이어지는 경험을 개선했어요.', tag: '안정성 개선' },
];

export function addDays(date, offset) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
}

export function datesBetween(start, end) {
  const dates = [];
  for (let day = start; day <= end; day = addDays(day, 1)) dates.push(day);
  return dates;
}

function random(seed) {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function createRecords() {
  const records = [];
  const dates = datesBetween(DATA_START, DATA_END);
  dates.forEach((date, dayIndex) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const visitChance = weekday === 0 || weekday === 6 ? 0.095 : 0.32;
    for (let classIndex = 0; classIndex < 3; classIndex += 1) {
      for (let person = 0; person < 240; person += 1) {
        const id = classIndex * 240 + person + 1;
        const availableFrom = Math.floor(random(id * 104729) * 66);
        if (dayIndex < availableFrom) continue;
        const seed = id * 997 + dayIndex * 7919;
        if (random(seed) > visitChance) continue;
        const joined = random(seed + 137) > 0.045;
        const isChatter = joined && random(seed + 719) < (date >= '2026-10-22' ? 0.26 : 0.21);
        const sourceValue = random(seed + 31);
        records.push({
          date,
          userId: `mock-${id}`,
          classId: CLASSES[classIndex + 1].id,
          joined,
          messages: isChatter ? 1 + Math.floor(random(seed + 97) * 16) : 0,
          sessions: random(seed + 107) > 0.88 ? 2 : 1,
          source: sourceValue < 0.72 ? 'menu' : sourceValue < 0.91 ? 'direct' : 'unknown',
        });
      }
    }
  });
  return records;
}

export const RECORDS = createRecords();
const countUsers = records => new Set(records.map(record => record.userId)).size;

export function summarize(records) {
  const visitors = countUsers(records);
  const joined = countUsers(records.filter(record => record.joined));
  const chatters = countUsers(records.filter(record => record.messages > 0));
  return {
    visitors, joined, chatters,
    messages: records.reduce((sum, record) => sum + record.messages, 0),
    sessions: records.reduce((sum, record) => sum + record.sessions, 0),
    rate: visitors ? chatters / visitors * 100 : null,
  };
}

export function getAnalytics({ start, end, classId }) {
  const pool = RECORDS.filter(record => classId === 'all' || record.classId === classId);
  const count = Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1;
  const previousStart = addDays(start, -count);
  const previousEnd = addDays(start, -1);
  const records = pool.filter(record => record.date >= start && record.date <= end);
  const previous = pool.filter(record => record.date >= previousStart && record.date <= previousEnd);
  const daily = datesBetween(start, end).map(date => ({ date, ...summarize(records.filter(record => record.date === date)) }));
  const sources = [
    { id: 'menu', label: '학급 우주정거장 메뉴', note: '학급 메뉴를 통해 진입' },
    { id: 'direct', label: '직접 접속 / 새로고침', note: '이전 경로를 확인할 수 없는 접속' },
    { id: 'unknown', label: '기타 / 미확인', note: '경로 정보가 없는 세션' },
  ].map(source => ({ ...source, value: records.filter(record => record.source === source.id).reduce((sum, record) => sum + record.sessions, 0) }));
  const cohortStart = addDays(end, -13);
  const cohortEnd = addDays(end, -7);
  const firstChat = new Map();
  pool.filter(record => record.messages > 0 && record.date <= end).forEach(record => {
    if (!firstChat.has(record.userId)) firstChat.set(record.userId, record.date);
  });
  const cohort = [...firstChat].filter(([, date]) => date >= cohortStart && date <= cohortEnd);
  const returned = cohort.filter(([userId, date]) => pool.some(record => record.userId === userId && record.messages > 0 && record.date > date && record.date <= addDays(date, 7))).length;
  return {
    current: summarize(records),
    previous: previousStart >= DATA_START ? summarize(previous) : null,
    previousStart, previousEnd, daily, sources,
    retention: { cohortStart, cohortEnd, eligible: cohort.length, returned, rate: cohort.length ? returned / cohort.length * 100 : null },
  };
}

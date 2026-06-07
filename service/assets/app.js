const STORAGE_KEY = "monster-memo-hunt:v1";

const monsterNames = [
  "잠복한 미루기",
  "흐릿한 집중력",
  "서랍 속 과제",
  "늦잠의 그림자",
  "회의록 파수꾼",
  "메일 늪지기",
  "정리 안 된 책상",
  "마감의 파수병"
];

const difficultyLabels = {
  easy: "가벼움",
  normal: "보통",
  hard: "강함",
  boss: "보스급"
};

const state = {
  quests: [],
  filter: "all"
};

const form = document.querySelector("#quest-form");
const questList = document.querySelector("#quest-list");
const questSummary = document.querySelector("#quest-summary");
const template = document.querySelector("#quest-card-template");
const filterButtons = document.querySelectorAll(".filter");
const year = document.querySelector("#year");
const huntDate = document.querySelector("#hunt-date");
const huntTime = document.querySelector("#hunt-time");

function loadQuests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.quests = raw ? JSON.parse(raw) : [];
  } catch {
    state.quests = [];
  }
}

function saveQuests() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quests));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getRandomMonsterName() {
  return monsterNames[Math.floor(Math.random() * monsterNames.length)];
}

function getInitials(text) {
  return (text || "?").trim().slice(0, 1).toUpperCase();
}

function formatDeadline(deadline) {
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "시간 미정";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getTimeStatus(quest) {
  if (quest.done) return "토벌 완료";

  const now = Date.now();
  const deadline = new Date(quest.deadline).getTime();
  if (Number.isNaN(deadline)) return "대기 중";
  if (deadline < now) return "시간 초과";

  const minutes = Math.ceil((deadline - now) / 60000);
  if (minutes < 60) return `${minutes}분 남음`;

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours}시간 남음`;

  return `${Math.ceil(hours / 24)}일 남음`;
}

function getFilteredQuests() {
  if (state.filter === "open") return state.quests.filter((quest) => !quest.done);
  if (state.filter === "done") return state.quests.filter((quest) => quest.done);
  return state.quests;
}

function updateSummary() {
  const total = state.quests.length;
  const done = state.quests.filter((quest) => quest.done).length;
  const open = total - done;

  questSummary.textContent = total
    ? `전체 ${total}마리 · 대기 ${open}마리 · 토벌 ${done}마리`
    : "아직 등록된 몬스터가 없습니다.";
}

function renderQuests() {
  updateSummary();
  questList.innerHTML = "";

  const filteredQuests = getFilteredQuests().sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  if (!filteredQuests.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.quests.length
      ? "선택한 상태에 해당하는 몬스터가 없습니다."
      : "첫 번째 할 일을 몬스터로 등록해 보세요.";
    questList.append(empty);
    return;
  }

  filteredQuests.forEach((quest) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const timeStatus = getTimeStatus(quest);
    const isOverdue = timeStatus === "시간 초과";

    card.dataset.id = quest.id;
    card.classList.toggle("is-done", quest.done);
    card.querySelector(".monster-symbol").dataset.symbol = getInitials(quest.monsterName);
    card.querySelector(".monster-name").textContent = quest.monsterName;
    card.querySelector(".task-title").textContent = quest.title;
    card.querySelector(".task-note").textContent = quest.note || "메모 없음";
    card.querySelector(".deadline").textContent = `토벌 예정: ${formatDeadline(quest.deadline)}`;

    const badge = card.querySelector(".difficulty-badge");
    badge.textContent = difficultyLabels[quest.difficulty] || difficultyLabels.normal;
    badge.classList.add(quest.difficulty);

    const status = card.querySelector(".status-label");
    status.textContent = timeStatus;
    status.classList.toggle("is-overdue", isOverdue);

    const completeButton = card.querySelector(".complete-btn");
    completeButton.textContent = quest.done ? "토벌 취소" : "토벌 완료";
    completeButton.addEventListener("click", () => toggleQuest(quest.id));

    card.querySelector(".delete-btn").addEventListener("click", () => deleteQuest(quest.id));
    questList.append(card);
  });
}

function addQuest(event) {
  event.preventDefault();
  const data = new FormData(form);
  const title = String(data.get("taskTitle") || "").trim();
  const monsterName = String(data.get("monsterName") || "").trim() || getRandomMonsterName();
  const date = String(data.get("huntDate") || "");
  const time = String(data.get("huntTime") || "");

  if (!title || !date || !time) return;

  state.quests.push({
    id: makeId(),
    title,
    monsterName,
    difficulty: String(data.get("difficulty") || "normal"),
    note: String(data.get("taskNote") || "").trim(),
    deadline: `${date}T${time}`,
    done: false,
    createdAt: new Date().toISOString()
  });

  saveQuests();
  form.reset();
  setDefaultDateTime();
  renderQuests();
}

function toggleQuest(id) {
  state.quests = state.quests.map((quest) => (
    quest.id === id ? { ...quest, done: !quest.done } : quest
  ));
  saveQuests();
  renderQuests();
}

function deleteQuest(id) {
  state.quests = state.quests.filter((quest) => quest.id !== id);
  saveQuests();
  renderQuests();
}

function setFilter(nextFilter) {
  state.filter = nextFilter;
  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === nextFilter);
  });
  renderQuests();
}

function setDefaultDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  huntDate.value = `${yyyy}-${mm}-${dd}`;
  huntTime.value = `${hh}:${min}`;
}

form.addEventListener("submit", addQuest);
filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

year.textContent = new Date().getFullYear();
setDefaultDateTime();
loadQuests();
renderQuests();
setInterval(renderQuests, 60000);

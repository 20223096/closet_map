import { PURPOSE_TAGS, STORES, STYLE_TAGS } from "./data/stores.js";

const STORAGE_KEYS = {
  votes: "closet-map:votes",
  requests: "closet-map:requests",
  saved: "closet-map:saved",
};

const state = {
  selectedTags: new Set(),
  selectedStoreId: STORES[0].id,
  votes: readStorage(STORAGE_KEYS.votes, {}),
  requests: readStorage(STORAGE_KEYS.requests, []),
  saved: new Set(readStorage(STORAGE_KEYS.saved, [])),
  activePanel: "detail",
  kakaoReady: false,
};

const app = document.querySelector("#app");
let kakaoMap;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getFilteredStores() {
  if (!state.selectedTags.size) return STORES;
  return STORES.filter((store) =>
    [...state.selectedTags].every((tag) => store.tags.includes(tag)),
  );
}

function getStoreVotes(store) {
  const userVotes = state.votes[store.id] || {};
  const merged = structuredClone(store.votes);
  Object.entries(userVotes).forEach(([type, value]) => {
    merged[type][value] = (merged[type][value] || 0) + 8;
  });
  return merged;
}

function topVoteLabel(votes) {
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
}

function render() {
  const filteredStores = getFilteredStores();
  const selectedStore =
    STORES.find((store) => store.id === state.selectedStoreId) || filteredStores[0] || STORES[0];
  if (!filteredStores.some((store) => store.id === selectedStore.id)) {
    state.selectedStoreId = filteredStores[0]?.id || STORES[0].id;
  }

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">성수 스타일 지도</p>
          <h1>Closet Map</h1>
        </div>
        <nav class="tabs" aria-label="주요 화면">
          <button class="${state.activePanel === "detail" ? "active" : ""}" data-panel="detail">탐색</button>
          <button class="${state.activePanel === "request" ? "active" : ""}" data-panel="request">제보</button>
          <button class="${state.activePanel === "admin" ? "active" : ""}" data-panel="admin">관리</button>
        </nav>
      </header>

      <section class="workspace">
        <aside class="sidebar">
          <div class="control-row">
            <label for="areaSelect">지역</label>
            <select id="areaSelect">
              <option>성수</option>
              <option disabled>홍대 준비중</option>
              <option disabled>연남 준비중</option>
              <option disabled>한남 준비중</option>
            </select>
          </div>
          <div class="tag-panel">
            <h2>스타일</h2>
            <div class="chips">
              ${STYLE_TAGS.map((tag) => tagButton(tag)).join("")}
            </div>
          </div>
          <div class="tag-panel">
            <h2>방문 목적</h2>
            <div class="chips">
              ${PURPOSE_TAGS.map((tag) => tagButton(tag)).join("")}
            </div>
          </div>
          <button class="text-button" data-action="clearFilters">필터 초기화</button>
        </aside>

        <section class="map-stage" aria-label="옷가게 지도">
          <div id="kakaoMap" class="kakao-map" aria-hidden="true"></div>
          <div class="map-grid">
            ${filteredStores
              .map((store, index) => mapPin(store, index, store.id === state.selectedStoreId))
              .join("")}
          </div>
          <div class="map-list">
            ${filteredStores.map((store) => storeCard(store, store.id === selectedStore.id)).join("")}
          </div>
        </section>

        <aside class="detail-pane">
          ${state.activePanel === "detail" ? renderDetail(selectedStore) : ""}
          ${state.activePanel === "request" ? renderRequestForm() : ""}
          ${state.activePanel === "admin" ? renderAdminPanel() : ""}
        </aside>
      </section>
    </main>
  `;

  bindEvents();
  syncKakaoMap(filteredStores);
}

function tagButton(tag) {
  const active = state.selectedTags.has(tag) ? "active" : "";
  return `<button class="chip ${active}" data-tag="${tag}">${tag}</button>`;
}

function mapPin(store, index, active) {
  const positions = [
    [58, 38],
    [44, 58],
    [70, 62],
    [30, 36],
  ];
  const [left, top] = positions[index % positions.length];
  return `
    <button class="pin ${active ? "active" : ""}" style="left:${left}%;top:${top}%;" data-store-id="${store.id}" aria-label="${store.name}">
      <span>${index + 1}</span>
    </button>
  `;
}

function storeCard(store, active) {
  return `
    <button class="store-card ${active ? "active" : ""}" data-store-id="${store.id}">
      <img src="${store.imageUrl}" alt="" />
      <span>
        <strong>${store.name}</strong>
        <small>${store.storeType} · ${store.priceLabel} · ${store.sizeLabel}</small>
      </span>
    </button>
  `;
}

function renderDetail(store) {
  const votes = getStoreVotes(store);
  const saved = state.saved.has(store.id);
  return `
    <article class="store-detail">
      <img class="cover" src="${store.imageUrl}" alt="" />
      <div class="detail-title">
        <div>
          <p class="eyebrow">${store.area} · ${store.storeType}</p>
          <h2>${store.name}</h2>
        </div>
        <button class="icon-button ${saved ? "active" : ""}" data-action="toggleSave" title="저장">${saved ? "★" : "☆"}</button>
      </div>
      <p class="address">${store.address}</p>
      <div class="quick-actions">
        <a href="${store.kakaoDirectionsUrl}" target="_blank" rel="noreferrer">길찾기</a>
        <a href="${store.instagramUrl}" target="_blank" rel="noreferrer">Instagram</a>
      </div>
      <div class="meta-grid">
        <span><b>크기</b>${store.sizeLabel}</span>
        <span><b>가격</b>${store.priceLabel}</span>
        <span><b>피팅</b>${store.fittingAvailable ? "가능" : "확인 필요"}</span>
      </div>
      <div class="tagline">${store.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      <section class="copy-block">
        <h3>추천 대상</h3>
        <p>${store.recommendation}</p>
      </section>
      <section class="copy-block">
        <h3>방문 전 체크</h3>
        <p>${store.checklist}</p>
      </section>
      <section class="copy-block">
        <h3>큐레이션</h3>
        <p>${store.editorComment}</p>
      </section>
      <section class="vote-summary">
        <h3>투표 결과</h3>
        ${voteBars(votes)}
      </section>
      <section class="vote-box">
        <h3>간단 투표</h3>
        ${voteGroup("style", ["힙", "러블리", "미니멀", "빈티지", "스트릿", "페미닌", "캐주얼"])}
        ${voteGroup("size", ["작음", "보통", "큼"])}
        ${voteGroup("price", ["저렴", "보통", "비쌈"])}
        ${voteGroup("shopping", ["적음", "보통", "많음"])}
        ${voteGroup("comfort", ["부담됨", "보통", "편함"])}
      </section>
    </article>
  `;
}

function voteBars(votes) {
  const labels = {
    style: "스타일",
    size: "매장 크기",
    price: "가격대",
    shopping: "살 만한 옷",
    comfort: "구경 편의성",
  };

  return Object.entries(votes)
    .map(([type, values]) => {
      const top = topVoteLabel(values);
      const total = Object.values(values).reduce((sum, value) => sum + value, 0);
      const pct = Math.round(((values[top] || 0) / total) * 100);
      return `
        <div class="bar-row">
          <span>${labels[type]}</span>
          <strong>${top} ${pct}%</strong>
          <i style="width:${pct}%"></i>
        </div>
      `;
    })
    .join("");
}

function voteGroup(type, options) {
  const selected = state.votes[state.selectedStoreId]?.[type];
  return `
    <div class="segmented" data-vote-type="${type}">
      ${options
        .map(
          (option) =>
            `<button class="${selected === option ? "active" : ""}" data-vote-value="${option}">${option}</button>`,
        )
        .join("")}
    </div>
  `;
}

function renderRequestForm() {
  return `
    <form class="request-form" data-form="storeRequest">
      <h2>옷가게 제보</h2>
      <label>매장명<input name="name" required placeholder="예: 새로 발견한 쇼룸" /></label>
      <label>주소<input name="address" required placeholder="서울 성동구..." /></label>
      <label>Instagram<input name="instagramUrl" placeholder="https://instagram.com/..." /></label>
      <label>대표 태그<input name="tags" placeholder="미니멀, 쇼룸, 구경하기 좋은 곳" /></label>
      <label>설명<textarea name="description" rows="5" placeholder="분위기, 가격대, 방문 느낌"></textarea></label>
      <button class="primary-button" type="submit">제보 등록</button>
    </form>
  `;
}

function renderAdminPanel() {
  const requests = state.requests;
  return `
    <section class="admin-panel">
      <h2>등록 요청</h2>
      <div class="request-list">
        ${
          requests.length
            ? requests.map((request) => requestItem(request)).join("")
            : `<p class="empty">대기 중인 요청이 없습니다.</p>`
        }
      </div>
    </section>
  `;
}

function requestItem(request) {
  return `
    <article class="request-item">
      <p class="status ${request.status}">${request.status}</p>
      <h3>${request.name}</h3>
      <p>${request.address}</p>
      <small>${request.tags || "태그 없음"}</small>
      <div class="quick-actions">
        <button data-request-id="${request.id}" data-request-status="approved">승인</button>
        <button data-request-id="${request.id}" data-request-status="rejected">반려</button>
      </div>
    </article>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePanel = button.dataset.panel;
      render();
    });
  });

  document.querySelectorAll("[data-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;
      state.selectedTags.has(tag) ? state.selectedTags.delete(tag) : state.selectedTags.add(tag);
      render();
    });
  });

  document.querySelectorAll("[data-store-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStoreId = button.dataset.storeId;
      state.activePanel = "detail";
      render();
    });
  });

  document.querySelector("[data-action='clearFilters']")?.addEventListener("click", () => {
    state.selectedTags.clear();
    render();
  });

  document.querySelector("[data-action='toggleSave']")?.addEventListener("click", () => {
    state.saved.has(state.selectedStoreId)
      ? state.saved.delete(state.selectedStoreId)
      : state.saved.add(state.selectedStoreId);
    writeStorage(STORAGE_KEYS.saved, [...state.saved]);
    render();
  });

  document.querySelectorAll("[data-vote-value]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.closest("[data-vote-type]").dataset.voteType;
      state.votes[state.selectedStoreId] = {
        ...(state.votes[state.selectedStoreId] || {}),
        [type]: button.dataset.voteValue,
      };
      writeStorage(STORAGE_KEYS.votes, state.votes);
      render();
    });
  });

  document.querySelector("[data-form='storeRequest']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.requests.unshift({
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString(),
      name: formData.get("name"),
      address: formData.get("address"),
      instagramUrl: formData.get("instagramUrl"),
      tags: formData.get("tags"),
      description: formData.get("description"),
    });
    writeStorage(STORAGE_KEYS.requests, state.requests);
    state.activePanel = "admin";
    render();
  });

  document.querySelectorAll("[data-request-status]").forEach((button) => {
    button.addEventListener("click", () => {
      state.requests = state.requests.map((request) =>
        request.id === button.dataset.requestId
          ? { ...request, status: button.dataset.requestStatus }
          : request,
      );
      writeStorage(STORAGE_KEYS.requests, state.requests);
      render();
    });
  });
}

function syncKakaoMap(stores) {
  const appKey = localStorage.getItem("CLOSET_MAP_KAKAO_KEY");
  const mapNode = document.querySelector("#kakaoMap");
  if (!appKey || !mapNode) return;

  if (!window.kakao?.maps) {
    if (document.querySelector("[data-kakao-sdk]")) return;
    const script = document.createElement("script");
    script.dataset.kakaoSdk = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.onload = () => window.kakao.maps.load(() => syncKakaoMap(stores));
    document.head.appendChild(script);
    return;
  }

  const centerStore = stores.find((store) => store.id === state.selectedStoreId) || stores[0] || STORES[0];
  const center = new window.kakao.maps.LatLng(centerStore.lat, centerStore.lng);
  kakaoMap = new window.kakao.maps.Map(mapNode, {
    center,
    level: 4,
  });

  stores.forEach((store) => {
    const marker = new window.kakao.maps.Marker({
      map: kakaoMap,
      position: new window.kakao.maps.LatLng(store.lat, store.lng),
      title: store.name,
    });
    window.kakao.maps.event.addListener(marker, "click", () => {
      state.selectedStoreId = store.id;
      state.activePanel = "detail";
      render();
    });
  });
}

render();

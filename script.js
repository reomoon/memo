// ================================================
// 로그인 관리 시스템
// ================================================

class AuthManager {
    constructor() {
        this.user = null;
        this.sessionId = localStorage.getItem('sessionId');
        this.loadUser();
    }

    async loadUser() {
        if (this.sessionId) {
            try {
                const response = await fetch('/api/auth/user', {
                    headers: { 'x-session-id': this.sessionId }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.user = data.user;
                } else {
                    this.sessionId = null;
                    localStorage.removeItem('sessionId');
                }
            } catch (error) {
                console.error('사용자 정보 로드 실패:', error);
            }
        }
        this.updateUI();
    }

    async githubLogin(code) {
        try {
            const response = await fetch('/api/auth/github/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const data = await response.json();
            this.sessionId = data.sessionId;
            this.user = data.user;
            localStorage.setItem('sessionId', this.sessionId);
            this.updateUI();
            return true;
        } catch (error) {
            console.error('GitHub 로그인 실패:', error);
            return false;
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'x-session-id': this.sessionId }
            });
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }

        this.user = null;
        this.sessionId = null;
        localStorage.removeItem('sessionId');
        this.updateUI();
    }

    updateUI() {
        const loginPage = document.getElementById('loginPage');
        const memoApp = document.getElementById('memoApp');
        const userName = document.getElementById('userName');

        if (this.user) {
            loginPage.style.display = 'none';
            memoApp.style.display = 'block';
            userName.textContent = `${this.user.name || this.user.login}님 환영합니다`;
        } else {
            loginPage.style.display = 'flex';
            memoApp.style.display = 'none';
        }
    }

    isLoggedIn() {
        return this.user !== null;
    }
}

// ================================================
// API 호출 함수 (Serverless Functions 사용)
// ================================================

// 제목 자동 생성 API 호출
async function callGenerateTitle(body) {
    try {
        const response = await fetch('/api/generateTitle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body })
        });

        if (!response.ok) {
            throw new Error('제목 생성 실패');
        }

        const data = await response.json();
        return data.title;
    } catch (error) {
        console.error('제목 생성 오류:', error);
        throw error;
    }
}

// 메모 요약 API 호출
async function callSummarize(body) {
    try {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body })
        });

        if (!response.ok) {
            throw new Error('요약 생성 실패');
        }

        const data = await response.json();
        return data.summary;
    } catch (error) {
        console.error('요약 생성 오류:', error);
        throw error;
    }
}

// ================================================
// 메모 데이터 관리 클래스
// ================================================
class MemoManager {
    // 생성자: 메모 관리자 초기화
    constructor() {
        this.memos = this.loadMemos();        // localStorage에서 저장된 메모 불러오기
        this.currentPage = 1;                 // 현재 페이지 (기본값: 1)
        this.itemsPerPage = 10;               // 한 페이지에 표시할 메모 개수
        this.editingId = null;                // 현재 수정 중인 메모 ID
        this.selectedCategory = null;         // 선택된 카테고리 필터
    }

    // localStorage에서 메모 불러오기
    loadMemos() {
        const stored = localStorage.getItem('memos');
        return stored ? JSON.parse(stored) : [];  // 저장된 데이터가 있으면 파싱, 없으면 빈 배열
    }

    // 메모 목록을 localStorage에 저장하기
    saveMemos() {
        localStorage.setItem('memos', JSON.stringify(this.memos));
    }

    // 메모 추가하기
    addMemo(title, url, body, password = null) {
        const memo = {
            id: Date.now(),                    // 현재 시간을 고유 ID로 사용
            title,
            url,
            body,
            password: password ? this.hashPassword(password) : null,  // 비밀번호 해시
            category: '기타',                  // 기본 카테고리
            createdAt: new Date().toLocaleString('ko-KR')  // 생성 시간 기록
        };
        this.memos.unshift(memo);              // 배열의 맨 앞에 추가 (최신 메모가 위에 나타남)
        this.saveMemos();
        return memo;
    }

    // 자동 카테고리 분류 (AI 사용)
    async autoClassifyCategory(title, body) {
        try {
            const text = `${title} ${body}`;
            const response = await fetch('/api/classifyCategory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                return '기타';
            }

            const data = await response.json();
            return data.category || '기타';
        } catch (error) {
            console.error('카테고리 분류 오류:', error);
            return '기타';
        }
    }

    // 메모 수정하기
    updateMemo(id, title, url, body, password = null) {
        const memo = this.memos.find(m => m.id === id);  // 일치하는 메모 찾기
        if (memo) {
            memo.title = title;
            memo.url = url;
            memo.body = body;
            memo.password = password ? this.hashPassword(password) : memo.password;  // 새 비밀번호가 있으면 업데이트
            this.saveMemos();
        }
    }

    // 간단한 비밀번호 해시 함수
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // 비밀번호 검증
    verifyPassword(storedHash, inputPassword) {
        return this.hashPassword(inputPassword) === storedHash;
    }

    // 메모 삭제하기
    deleteMemo(id) {
        this.memos = this.memos.filter(m => m.id !== id);  // 해당 메모를 제외한 배열 생성
        this.saveMemos();
    }

    // 페이지에 해당하는 메모 목록 가져오기 (페이지네이션용)
    getMemos(page) {
        const start = (page - 1) * this.itemsPerPage;  // 시작 위치 계산
        const end = start + this.itemsPerPage;         // 종료 위치 계산
        
        // 카테고리 필터 적용
        let filtered = this.selectedCategory ? 
            this.memos.filter(m => m.category === this.selectedCategory) :
            this.memos;
        
        return filtered.slice(start, end);
    }

    // 총 페이지 수 계산하기
    getTotalPages() {
        // 카테고리 필터 적용
        let filtered = this.selectedCategory ? 
            this.memos.filter(m => m.category === this.selectedCategory) :
            this.memos;
        
        return Math.ceil(filtered.length / this.itemsPerPage);
    }

    // 사용 가능한 모든 카테고리 가져오기
    getCategories() {
        const categories = new Set(this.memos.map(m => m.category || '기타'));
        return Array.from(categories).sort();
    }
}

// ================================================
// UI 관리 클래스 (화면 표시 및 이벤트 처리)
// ================================================
class MemoUI {
    // 생성자: UI 초기화
    constructor(manager) {
        this.manager = manager;
        this.passwordProtected = false;  // 비밀번호 보호 활성화 여부
        
        // HTML 요소 참조 저장
        this.memoList = document.getElementById('memoList');
        this.pagination = document.getElementById('pagination');
        this.modal = document.getElementById('memoModal');
        this.memoForm = document.getElementById('memoForm');
        this.addMemoBtn = document.getElementById('addMemoBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.lockBtn = document.getElementById('lockBtn');
        this.modalTitle = document.getElementById('modalTitle');

        this.setupEventListeners();  // 이벤트 리스너 설정
        this.render();               // 초기 화면 렌더링
    }

    // 버튼 클릭 등의 이벤트 리스너 설정
    setupEventListeners() {
        // 메모 추가 버튼 클릭 → 모달 열기
        this.addMemoBtn.addEventListener('click', () => this.openAddModal());
        
        // 취소 버튼 클릭 → 모달 닫기
        this.cancelBtn.addEventListener('click', () => this.closeModal());

        // 잠금 아이콘 클릭 → 비밀번호 보호 토글
        this.lockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePasswordProtection();
        });
        
        // 폼 제출 (저장 버튼 클릭) → 메모 저장
        this.memoForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // 모달 배경 클릭 → 모달 닫기
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // 카테고리 토글 버튼 클릭
        const categoryToggle = document.getElementById('categoryToggle');
        const categoryList = document.getElementById('categoryList');
        categoryToggle.addEventListener('click', () => {
            categoryToggle.classList.toggle('active');
            categoryList.style.display = categoryToggle.classList.contains('active') ? 'flex' : 'none';
        });
    }

    // 비밀번호 보호 토글
    togglePasswordProtection() {
        this.passwordProtected = !this.passwordProtected;
        this.lockBtn.classList.toggle('active', this.passwordProtected);
        this.lockBtn.textContent = this.passwordProtected ? '🔒' : '🔓';
    }

    // 화면 다시 그리기 (메모 목록과 페이지네이션)
    render() {
        this.renderCategories();  // 카테고리 렌더링
        this.renderMemos();
        this.renderPagination();
    }

    // 카테고리 목록 렌더링
    renderCategories() {
        const categoryList = document.getElementById('categoryList');
        const categories = this.manager.getCategories();

        let html = '<button class="category-btn all-categories" onclick="app.filterByCategory(null)">모두보기</button>';
        
        categories.forEach(category => {
            const isActive = this.manager.selectedCategory === category ? 'active' : '';
            html += `<button class="category-btn ${isActive}" onclick="app.filterByCategory('${category}')">${category}</button>`;
        });

        categoryList.innerHTML = html;
    }

    // 메모 목록 렌더링
    renderMemos() {
        // 현재 페이지의 메모 목록 가져오기
        const memos = this.manager.getMemos(this.manager.currentPage);

        // 메모가 없는 경우
        if (memos.length === 0) {
            this.memoList.innerHTML = '<div class="empty-message">메모가 없습니다. 메모를 추가해보세요!</div>';
            return;
        }

        // 각 메모를 HTML로 변환하여 화면에 표시
        this.memoList.innerHTML = memos.map(memo => `
            <div class="memo-item">
                <!-- 메모 제목 -->
                <div class="memo-title">
                    ${this.escapeHtml(memo.title)}
                    ${memo.password ? ' 🔒' : ''}
                </div>
                <!-- 메모 카테고리 -->
                <div class="memo-category">${memo.category || '기타'}</div>
                <!-- 메모 URL (있는 경우만 표시, 잠금 메모는 숨김) -->
                ${memo.url && !memo.password ? `<a href="${this.escapeHtml(memo.url)}" class="memo-url" target="_blank" rel="noopener noreferrer">${this.escapeHtml(memo.url)}</a>` : ''}
                <!-- 메모 본문과 복사 버튼 -->
                <div class="memo-content-wrapper">
                    ${memo.password ? 
                        `<div class="memo-body memo-locked" data-id="${memo.id}">🔒 잠금 메모</div>` :
                        `<div class="memo-body">${this.escapeHtml(memo.body)}</div>`
                    }
                    <button class="copy-btn" title="복사하기" data-id="${memo.id}" ${memo.password ? 'style="display:none;"' : ''}>📋</button>
                </div>
                <!-- 저장된 날짜/시간 -->
                <div class="memo-date">${memo.createdAt}</div>
                <!-- 편집, 삭제 버튼 -->
                <div class="memo-footer">
                    <button class="edit-btn" data-id="${memo.id}">편집</button>
                    <button class="delete-btn" data-id="${memo.id}">삭제</button>
                </div>
            </div>
        `).join('');

        // 복사 버튼 이벤트 설정
        this.memoList.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const memo = this.manager.memos.find(m => m.id === parseInt(id));
                if (memo) {
                    this.copyToClipboard(memo.body);  // 본문 복사
                }
            });
        });

        // 잠긴 메모 클릭 - 비밀번호 입력
        this.memoList.querySelectorAll('.memo-locked').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const memo = this.manager.memos.find(m => m.id === id);
                if (memo && memo.password) {
                    this.unlockMemo(memo);  // 메모 잠금 해제
                }
            });
        });

        // 편집 버튼 이벤트 설정
        this.memoList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.openEditModal(id);  // 편집 모달 열기
            });
        });

        // 삭제 버튼 이벤트 설정
        this.memoList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.handleDelete(id);  // 삭제 처리
            });
        });
    }

    // 페이지네이션 렌더링 (페이지 번호 버튼)
    renderPagination() {
        const totalPages = this.manager.getTotalPages();

        // 페이지가 1개 이하면 페이지네이션 표시 안 함
        if (totalPages <= 1) {
            this.pagination.innerHTML = '';
            return;
        }

        let html = '';

        // 이전 버튼 (현재 페이지가 1이 아니면 표시)
        if (this.manager.currentPage > 1) {
            html += `<button onclick="app.previousPage()">이전</button>`;
        }

        // 페이지 번호 버튼들
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === this.manager.currentPage ? 'active' : '';
            html += `<button class="${activeClass}" onclick="app.goToPage(${i})">${i}</button>`;
        }

        // 다음 버튼 (현재 페이지가 마지막이 아니면 표시)
        if (this.manager.currentPage < totalPages) {
            html += `<button onclick="app.nextPage()">다음</button>`;
        }

        this.pagination.innerHTML = html;
    }

    // 새 메모 추가 모달 열기
    openAddModal() {
        this.manager.editingId = null;           // 편집 상태 초기화
        this.passwordProtected = false;          // 비밀번호 보호 초기화
        this.lockBtn.classList.remove('active');
        this.lockBtn.textContent = '🔓';
        this.modalTitle.textContent = '새 메모';
        this.memoForm.reset();                   // 폼 초기화
        this.modal.classList.add('show');        // 모달 표시
    }

    // 메모 편집 모달 열기
    openEditModal(id) {
        const memo = this.manager.memos.find(m => m.id === id);  // 메모 찾기
        if (!memo) return;

        this.manager.editingId = id;             // 수정 중인 메모 ID 저장
        this.passwordProtected = !!memo.password;  // 기존 비밀번호 있으면 표시
        this.lockBtn.classList.toggle('active', this.passwordProtected);
        this.lockBtn.textContent = this.passwordProtected ? '🔒' : '🔓';
        this.modalTitle.textContent = '메모 수정';
        // 폼에 메모 내용 채우기
        document.getElementById('memoTitle').value = memo.title;
        document.getElementById('memoUrl').value = memo.url || '';
        document.getElementById('memoBody').value = memo.body;
        this.modal.classList.add('show');        // 모달 표시
    }

    // 모달 닫기
    closeModal() {
        this.modal.classList.remove('show');
        this.manager.editingId = null;
        this.memoForm.reset();
    }

    // 폼 제출 처리 (메모 저장)
    async handleFormSubmit(e) {
        e.preventDefault();  // 기본 폼 제출 동작 방지

        // 폼에서 입력값 가져오기
        const title = document.getElementById('memoTitle').value.trim();
        const url = document.getElementById('memoUrl').value.trim();
        const body = document.getElementById('memoBody').value.trim();

        // 유효성 검사
        if (!title || !body) {
            alert('제목과 본문을 입력해주세요.');
            return;
        }

        // 비밀번호 보호가 활성화되었으면 4자리 비밀번호 입력받기
        let password = null;
        if (this.passwordProtected) {
            password = prompt('4자리 비밀번호를 입력하세요:');
            if (password === null) return;  // 취소 누르면 저장 안 함
            
            // 비밀번호 유효성 검사
            if (password.length !== 4 || !/^\d{4}$/.test(password)) {
                alert('4자리 숫자만 입력 가능합니다.');
                return;
            }
        }

        // 자동 카테고리 분류
        const category = await this.manager.autoClassifyCategory(title, body);

        // 수정인지 새로 추가인지 구분
        if (this.manager.editingId) {
            this.manager.updateMemo(this.manager.editingId, title, url, body, password);
            // 기존 메모의 카테고리 업데이트
            const memo = this.manager.memos.find(m => m.id === this.manager.editingId);
            if (memo) {
                memo.category = category;
                this.manager.saveMemos();
            }
            this.showToast('메모가 수정되었습니다.');
        } else {
            const memo = this.manager.addMemo(title, url, body, password);
            // 새 메모의 자동 분류 카테고리 적용
            memo.category = category;
            this.manager.saveMemos();
            this.showToast('메모가 저장되었습니다.');
        }

        this.closeModal();
        this.manager.currentPage = 1;  // 첫 페이지로 이동
        this.render();
    }

    // 메모 삭제 처리
    handleDelete(id) {
        // 사용자에게 삭제 확인
        const confirmed = confirm('이 메모를 삭제하시겠습니까?');
        if (confirmed) {
            this.manager.deleteMemo(id);
            this.showToast('메모가 삭제되었습니다.');
            this.render();
        }
    }

    // 텍스트를 클립보드에 복사
    copyToClipboard(text) {
        // 최신 브라우저의 Clipboard API 사용
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('본문이 복사되었습니다.');
        }).catch(() => {
            // 구형 브라우저 지원 (Fallback)
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('본문이 복사되었습니다.');
        });
    }

    // 알림 메시지 표시 (토스트)
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 2초 후 자동 제거
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // HTML 특수문자 이스케이프 (XSS 방지)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;  // textContent를 사용하면 자동으로 이스케이프됨
        return div.innerHTML;
    }

    // 제목 자동 생성 (AI 사용)
    async generateTitle() {
        const body = document.getElementById('memoBody').value.trim();
        if (!body) {
            alert('본문을 입력해주세요');
            return;
        }

        const titleInput = document.getElementById('memoTitle');
        const originalValue = titleInput.value;
        titleInput.value = '생성 중...';
        titleInput.disabled = true;

        try {
            const title = await callGenerateTitle(body);
            titleInput.value = title;
            this.showToast('제목이 생성되었습니다.');
        } catch (error) {
            console.error('제목 생성 오류:', error);
            alert('제목 생성 실패: ' + error.message);
            titleInput.value = originalValue;
        } finally {
            titleInput.disabled = false;
        }
    }

    // 메모 잠금 해제 (비밀번호 입력)
    unlockMemo(memo) {
        const password = prompt('비밀번호를 입력하세요:');
        if (password === null) return;  // 취소 누르면 종료

        // 비밀번호 검증
        if (this.manager.verifyPassword(memo.password, password)) {
            // 메모 본문을 실제 내용으로 바꾸기
            const memoBody = document.querySelector(`.memo-body[data-id="${memo.id}"]`);
            if (memoBody) {
                memoBody.classList.remove('memo-locked');
                memoBody.textContent = memo.body;
                memoBody.style.width = '320px';
                
                // 복사 버튼 표시
                const copyBtn = memoBody.parentElement.querySelector('.copy-btn');
                if (copyBtn) {
                    copyBtn.style.display = '';
                }
            }
        } else {
            alert('비밀번호가 틀렸습니다.');
        }
    }
}

// ================================================
// 메인 앱 클래스
// ================================================
class App {
    // 생성자: 앱 초기화
    constructor() {
        this.auth = new AuthManager();  // 로그인 관리자 생성
        this.manager = new MemoManager();  // 데이터 관리자 생성
        this.ui = new MemoUI(this.manager);  // UI 관리자 생성
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        // GitHub 로그인 버튼
        document.getElementById('githubLoginBtn').addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/github');
                const data = await response.json();
                window.location.href = data.authUrl;
            } catch (error) {
                console.error('GitHub 인증 URL 가져오기 실패:', error);
                alert('GitHub 로그인 실패');
            }
        });

        // 로그아웃 버튼
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            if (confirm('로그아웃하시겠습니까?')) {
                await this.auth.logout();
                location.reload();
            }
        });

        // URL에서 code 파라미터 확인 (GitHub 콜백)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code && !this.auth.user) {
            this.handleGithubCallback(code);
        }
    }

    async handleGithubCallback(code) {
        const success = await this.auth.githubLogin(code);
        if (success) {
            // URL에서 code 제거
            window.history.replaceState({}, document.title, window.location.pathname);
            this.ui.render();
        } else {
            alert('로그인 실패');
            this.auth.updateUI();
        }
    }

    // 카테고리 필터링
    filterByCategory(category) {
        this.manager.selectedCategory = category;
        this.manager.currentPage = 1;
        this.ui.render();
    }

    // 특정 페이지로 이동
    goToPage(page) {
        this.manager.currentPage = page;
        this.ui.render();
        window.scrollTo(0, 0);  // 페이지 맨 위로 스크롤
    }

    // 다음 페이지로 이동
    nextPage() {
        if (this.manager.currentPage < this.manager.getTotalPages()) {
            this.goToPage(this.manager.currentPage + 1);
        }
    }

    // 이전 페이지로 이동
    previousPage() {
        if (this.manager.currentPage > 1) {
            this.goToPage(this.manager.currentPage - 1);
        }
    }
}

// ================================================
// 앱 시작
// ================================================
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();  // 전역 app 객체 생성 (HTML에서 onclick으로 사용)
});

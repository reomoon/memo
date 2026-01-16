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

    // 새 메모 추가하기
    addMemo(title, url, body) {
        const memo = {
            id: Date.now(),                    // 현재 시간을 고유 ID로 사용
            title,
            url,
            body,
            createdAt: new Date().toLocaleString('ko-KR')  // 생성 시간 기록
        };
        this.memos.unshift(memo);              // 배열의 맨 앞에 추가 (최신 메모가 위에 나타남)
        this.saveMemos();
        return memo;
    }

    // 메모 수정하기
    updateMemo(id, title, url, body) {
        const memo = this.memos.find(m => m.id === id);  // 일치하는 메모 찾기
        if (memo) {
            memo.title = title;
            memo.url = url;
            memo.body = body;
            this.saveMemos();
        }
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
        return this.memos.slice(start, end);
    }

    // 총 페이지 수 계산하기
    getTotalPages() {
        return Math.ceil(this.memos.length / this.itemsPerPage);
    }
}

// ================================================
// UI 관리 클래스 (화면 표시 및 이벤트 처리)
// ================================================
class MemoUI {
    // 생성자: UI 초기화
    constructor(manager) {
        this.manager = manager;
        
        // HTML 요소 참조 저장
        this.memoList = document.getElementById('memoList');
        this.pagination = document.getElementById('pagination');
        this.modal = document.getElementById('memoModal');
        this.memoForm = document.getElementById('memoForm');
        this.addMemoBtn = document.getElementById('addMemoBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
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
        
        // 폼 제출 (저장 버튼 클릭) → 메모 저장
        this.memoForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // 모달 배경 클릭 → 모달 닫기
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    // 화면 다시 그리기 (메모 목록과 페이지네이션)
    render() {
        this.renderMemos();
        this.renderPagination();
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
                <div class="memo-title">${this.escapeHtml(memo.title)}</div>
                <!-- 메모 URL (있는 경우만 표시, 클릭하면 새창에서 열림) -->
                ${memo.url ? `<a href="${this.escapeHtml(memo.url)}" class="memo-url" target="_blank" rel="noopener noreferrer">${this.escapeHtml(memo.url)}</a>` : ''}
                <!-- 메모 본문과 복사 버튼 -->
                <div class="memo-content-wrapper">
                    <div class="memo-body">${this.escapeHtml(memo.body)}</div>
                    <button class="copy-btn" title="복사하기" data-id="${memo.id}">📋</button>
                </div>
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
        this.modalTitle.textContent = '새 메모';
        this.memoForm.reset();                   // 폼 초기화
        this.modal.classList.add('show');        // 모달 표시
    }

    // 메모 편집 모달 열기
    openEditModal(id) {
        const memo = this.manager.memos.find(m => m.id === id);  // 메모 찾기
        if (!memo) return;

        this.manager.editingId = id;             // 수정 중인 메모 ID 저장
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
    handleFormSubmit(e) {
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

        // 수정인지 새로 추가인지 구분
        if (this.manager.editingId) {
            this.manager.updateMemo(this.manager.editingId, title, url, body);
            this.showToast('메모가 수정되었습니다.');
        } else {
            this.manager.addMemo(title, url, body);
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
}

// ================================================
// 메인 앱 클래스
// ================================================
class App {
    // 생성자: 앱 초기화
    constructor() {
        this.manager = new MemoManager();  // 데이터 관리자 생성
        this.ui = new MemoUI(this.manager);  // UI 관리자 생성
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
const app = new App();  // 전역 app 객체 생성 (HTML에서 onclick으로 사용)

// 메모 데이터 관리
class MemoManager {
    constructor() {
        this.memos = this.loadMemos();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.editingId = null;
    }

    loadMemos() {
        const stored = localStorage.getItem('memos');
        return stored ? JSON.parse(stored) : [];
    }

    saveMemos() {
        localStorage.setItem('memos', JSON.stringify(this.memos));
    }

    addMemo(title, url, body) {
        const memo = {
            id: Date.now(),
            title,
            url,
            body,
            createdAt: new Date().toLocaleString('ko-KR')
        };
        this.memos.unshift(memo);
        this.saveMemos();
        return memo;
    }

    updateMemo(id, title, url, body) {
        const memo = this.memos.find(m => m.id === id);
        if (memo) {
            memo.title = title;
            memo.url = url;
            memo.body = body;
            this.saveMemos();
        }
    }

    deleteMemo(id) {
        this.memos = this.memos.filter(m => m.id !== id);
        this.saveMemos();
    }

    getMemos(page) {
        const start = (page - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.memos.slice(start, end);
    }

    getTotalPages() {
        return Math.ceil(this.memos.length / this.itemsPerPage);
    }
}

// UI 관리
class MemoUI {
    constructor(manager) {
        this.manager = manager;
        this.memoList = document.getElementById('memoList');
        this.pagination = document.getElementById('pagination');
        this.modal = document.getElementById('memoModal');
        this.memoForm = document.getElementById('memoForm');
        this.addMemoBtn = document.getElementById('addMemoBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.modalTitle = document.getElementById('modalTitle');

        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        this.addMemoBtn.addEventListener('click', () => this.openAddModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.memoForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    render() {
        this.renderMemos();
        this.renderPagination();
    }

    renderMemos() {
        const memos = this.manager.getMemos(this.manager.currentPage);

        if (memos.length === 0) {
            this.memoList.innerHTML = '<div class="empty-message">메모가 없습니다. 메모를 추가해보세요!</div>';
            return;
        }

        this.memoList.innerHTML = memos.map(memo => `
            <div class="memo-item">
                <div class="memo-title">${this.escapeHtml(memo.title)}</div>
                ${memo.url ? `<div class="memo-url">${this.escapeHtml(memo.url)}</div>` : ''}
                <div class="memo-content-wrapper">
                    <div class="memo-body">${this.escapeHtml(memo.body)}</div>
                    <button class="copy-btn" title="복사하기" data-id="${memo.id}">📋</button>
                </div>
                <div class="memo-footer">
                    <button class="edit-btn" data-id="${memo.id}">편집</button>
                    <button class="delete-btn" data-id="${memo.id}">삭제</button>
                </div>
            </div>
        `).join('');

        // 복사 버튼 이벤트
        this.memoList.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const memo = this.manager.memos.find(m => m.id === parseInt(id));
                if (memo) {
                    this.copyToClipboard(memo.body);
                }
            });
        });

        // 편집 버튼 이벤트
        this.memoList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.openEditModal(id);
            });
        });

        // 삭제 버튼 이벤트
        this.memoList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.handleDelete(id);
            });
        });
    }

    renderPagination() {
        const totalPages = this.manager.getTotalPages();

        if (totalPages <= 1) {
            this.pagination.innerHTML = '';
            return;
        }

        let html = '';

        // 이전 버튼
        if (this.manager.currentPage > 1) {
            html += `<button onclick="app.previousPage()">이전</button>`;
        }

        // 페이지 번호
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === this.manager.currentPage ? 'active' : '';
            html += `<button class="${activeClass}" onclick="app.goToPage(${i})">${i}</button>`;
        }

        // 다음 버튼
        if (this.manager.currentPage < totalPages) {
            html += `<button onclick="app.nextPage()">다음</button>`;
        }

        this.pagination.innerHTML = html;
    }

    openAddModal() {
        this.manager.editingId = null;
        this.modalTitle.textContent = '새 메모';
        this.memoForm.reset();
        this.modal.classList.add('show');
    }

    openEditModal(id) {
        const memo = this.manager.memos.find(m => m.id === id);
        if (!memo) return;

        this.manager.editingId = id;
        this.modalTitle.textContent = '메모 수정';
        document.getElementById('memoTitle').value = memo.title;
        document.getElementById('memoUrl').value = memo.url || '';
        document.getElementById('memoBody').value = memo.body;
        this.modal.classList.add('show');
    }

    closeModal() {
        this.modal.classList.remove('show');
        this.manager.editingId = null;
        this.memoForm.reset();
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const title = document.getElementById('memoTitle').value.trim();
        const url = document.getElementById('memoUrl').value.trim();
        const body = document.getElementById('memoBody').value.trim();

        if (!title || !body) {
            alert('제목과 본문을 입력해주세요.');
            return;
        }

        if (this.manager.editingId) {
            this.manager.updateMemo(this.manager.editingId, title, url, body);
            this.showToast('메모가 수정되었습니다.');
        } else {
            this.manager.addMemo(title, url, body);
            this.showToast('메모가 저장되었습니다.');
        }

        this.closeModal();
        this.manager.currentPage = 1;
        this.render();
    }

    handleDelete(id) {
        const confirmed = confirm('이 메모를 삭제하시겠습니까?');
        if (confirmed) {
            this.manager.deleteMemo(id);
            this.showToast('메모가 삭제되었습니다.');
            this.render();
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('본문이 복사되었습니다.');
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('본문이 복사되었습니다.');
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 앱 초기화
class App {
    constructor() {
        this.manager = new MemoManager();
        this.ui = new MemoUI(this.manager);
    }

    goToPage(page) {
        this.manager.currentPage = page;
        this.ui.render();
        window.scrollTo(0, 0);
    }

    nextPage() {
        if (this.manager.currentPage < this.manager.getTotalPages()) {
            this.goToPage(this.manager.currentPage + 1);
        }
    }

    previousPage() {
        if (this.manager.currentPage > 1) {
            this.goToPage(this.manager.currentPage - 1);
        }
    }
}

// 앱 시작
const app = new App();

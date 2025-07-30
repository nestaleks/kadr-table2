/**
 * Sick Leaves Module - Модуль лікарняних
 * Облік тимчасової непрацездатності співробітників
 */

class SickLeavesModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.employees = [];
        this.departments = [];
        this.positions = [];
        this.sickLeaves = [];
        this.selectedRecord = null;
        this.currentYear = new Date().getFullYear();
        this.searchQuery = '';
        this.filterStatus = 'all';
        
        // Типи лікарняних
        this.sickTypes = {
            'illness': { name: 'Хвороба', code: 'ТН' },
            'injury': { name: 'Травма', code: 'ТН' },
            'quarantine': { name: 'Карантин', code: 'К' },
            'childcare': { name: 'Догляд за хворою дитиною', code: 'ТН' },
            'disability': { name: 'Інвалідність', code: 'ІН' }
        };
    }

    async render() {
        await this.loadData();

        return `
            <div class="sick-leaves-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-hospital-user"></i> Лікарняні</h1>
                        <p>Облік тимчасової непрацездатності співробітників</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addSickLeaveBtn">
                            <i class="fas fa-plus"></i> Додати лікарняний
                        </button>
                        <button class="btn btn-secondary" id="sickLeaveCalendarBtn">
                            <i class="fas fa-calendar"></i> Календар
                        </button>
                        <button class="btn btn-secondary" id="exportSickLeavesBtn">
                            <i class="fas fa-download"></i> Експорт
                        </button>
                    </div>
                </div>

                <!-- Фільтри та пошук -->
                <div class="controls-panel">
                    <div class="search-controls">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Пошук за ПІБ співробітника...">
                            <i class="fas fa-search"></i>
                        </div>
                        <select id="statusFilter" class="filter-select">
                            <option value="all">Всі статуси</option>
                            <option value="active">Активні</option>
                            <option value="completed">Завершені</option>
                            <option value="cancelled">Скасовані</option>
                        </select>
                        <select id="yearFilter" class="filter-select">
                            ${this.generateYearOptions()}
                        </select>
                        <select id="departmentFilter" class="filter-select">
                            <option value="all">Всі підрозділи</option>
                            ${this.departments.map(dept => 
                                `<option value="${dept.id}">${dept.name}</option>`
                            ).join('')}
                        </select>
                        <select id="typeFilter" class="filter-select">
                            <option value="all">Всі типи</option>
                            ${Object.entries(this.sickTypes).map(([key, type]) => 
                                `<option value="${key}">${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.getActiveSickLeavesCount()}</span>
                        <span class="stat-label">Активних лікарняних</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getThisMonthCount()}</span>
                        <span class="stat-label">За цей місяць</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getThisYearCount()}</span>
                        <span class="stat-label">За цей рік</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getAverageDuration()}</span>
                        <span class="stat-label">Середня тривалість (днів)</span>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="sick-leaves-content">
                    <div id="sickLeavesContainer" class="sick-leaves-container">
                        ${this.renderSickLeavesTable()}
                    </div>
                </div>

                <!-- Модальне вікно лікарняного -->
                <div id="sickLeaveModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2 id="sickLeaveModalTitle">
                                <i class="fas fa-notes-medical"></i> Оформити лікарняний
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderSickLeaveForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveSickLeaveBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelSickLeaveBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно деталей -->
                <div id="sickLeaveDetailsModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2 id="detailsTitle">
                                <i class="fas fa-info-circle"></i> Деталі лікарняного
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="sickLeaveDetails"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editDetailsBtn">Редагувати</button>
                            <button class="btn btn-secondary" id="closeDetailsBtn">Закрити</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно календаря -->
                <div id="sickLeaveCalendarModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2>
                                <i class="fas fa-calendar"></i> Календар лікарняних ${this.currentYear}
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="sickLeaveCalendar">
                                ${this.renderSickLeaveCalendar()}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="closeCalendarBtn">Закрити</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        this.bindEvents();
        await this.loadSickLeaveData();
    }

    async loadData() {
        try {
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.positions = await this.database.getAll('positions');
        } catch (error) {
            console.error('Помилка завантаження даних лікарняних:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Додавання лікарняного
        document.getElementById('addSickLeaveBtn')?.addEventListener('click', () => {
            this.showSickLeaveModal();
        });

        // Календар
        document.getElementById('sickLeaveCalendarBtn')?.addEventListener('click', () => {
            this.showCalendarModal();
        });

        // Пошук та фільтри
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterRecords();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.filterRecords();
        });

        document.getElementById('yearFilter')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.loadSickLeaveData();
        });

        document.getElementById('departmentFilter')?.addEventListener('change', (e) => {
            this.filterDepartment = e.target.value;
            this.filterRecords();
        });

        document.getElementById('typeFilter')?.addEventListener('change', (e) => {
            this.filterType = e.target.value;
            this.filterRecords();
        });

        // Експорт
        document.getElementById('exportSickLeavesBtn')?.addEventListener('click', () => {
            this.exportSickLeaves();
        });

        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Збереження лікарняного
        document.getElementById('saveSickLeaveBtn')?.addEventListener('click', () => {
            this.saveSickLeave();
        });

        document.getElementById('cancelSickLeaveBtn')?.addEventListener('click', () => {
            this.hideSickLeaveModal();
        });

        // Деталі
        document.getElementById('editDetailsBtn')?.addEventListener('click', () => {
            this.editRecord();
        });

        document.getElementById('closeDetailsBtn')?.addEventListener('click', () => {
            this.hideDetailsModal();
        });

        // Календар
        document.getElementById('closeCalendarBtn')?.addEventListener('click', () => {
            this.hideCalendarModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                hrSystem.closeModal(modal);
            });
        });
    }

    renderSickLeavesTable() {
        const records = this.getFilteredRecords();
        
        if (records.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-notes-medical"></i>
                    <h3>Немає записів</h3>
                    <p>Додайте лікарняний для початку роботи</p>
                    <div class="empty-actions">
                        <button class="btn btn-primary" onclick="document.getElementById('addSickLeaveBtn').click()">
                            <i class="fas fa-plus"></i> Додати лікарняний
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="sick-leaves-table-wrapper">
                <table class="sick-leaves-table">
                    <thead>
                        <tr>
                            <th>Співробітник</th>
                            <th>Тип</th>
                            <th>Період</th>
                            <th>Днів</th>
                            <th>Номер листка</th>
                            <th>Діагноз/Причина</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(record => this.renderSickLeaveRow(record)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderSickLeaveRow(record) {
        const employee = this.employees.find(emp => emp.id === record.employeeId);
        const typeInfo = this.sickTypes[record.sickType];
        const duration = record.endDate ? 
            this.calculateDuration(record.startDate, record.endDate) : 
            this.calculateDuration(record.startDate, new Date().toISOString().split('T')[0]);

        return `
            <tr class="sick-leave-row" data-id="${record.id}">
                <td class="employee-info">
                    <div class="employee-name">${employee?.fullName || 'Невідомо'}</div>
                    <div class="employee-position">${employee?.personnelNumber || ''}</div>
                </td>
                <td class="record-type">
                    <div class="type-badge sick">
                        <i class="fas fa-notes-medical"></i>
                        ${typeInfo?.name || record.sickType}
                    </div>
                </td>
                <td class="period-cell">
                    <div class="period-dates">
                        ${this.formatDate(record.startDate)} ${record.endDate ? '- ' + this.formatDate(record.endDate) : '(продовжується)'}
                    </div>
                    <div class="period-duration">${duration} днів</div>
                </td>
                <td class="days-count">
                    <span class="days-number">${duration}</span>
                </td>
                <td class="certificate-cell">
                    <div class="certificate-number">${record.certificateNumber || 'Не вказано'}</div>
                </td>
                <td class="diagnosis-cell">
                    <div class="diagnosis-text">${record.diagnosis || 'Не вказано'}</div>
                </td>
                <td class="status-cell">
                    <span class="status-badge ${record.status}">
                        ${this.getStatusText(record.status)}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="sickLeavesModule.showDetails(${record.id})" title="Деталі">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="sickLeavesModule.editRecord(${record.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="sickLeavesModule.deleteRecord(${record.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderSickLeaveForm() {
        const sickLeave = this.selectedRecord || {};
        
        return `
            <form id="sickLeaveForm" class="sick-leave-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Співробітник *</label>
                        <select name="employeeId" required>
                            <option value="">Виберіть співробітника</option>
                            ${this.employees
                                .filter(emp => emp.status === 'active')
                                .map(emp => 
                                    `<option value="${emp.id}" ${sickLeave.employeeId === emp.id ? 'selected' : ''}>${emp.fullName}</option>`
                                ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Тип лікарняного *</label>
                        <select name="sickType" required>
                            ${Object.entries(this.sickTypes).map(([key, type]) => 
                                `<option value="${key}" ${sickLeave.sickType === key ? 'selected' : ''}>${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Дата початку *</label>
                        <input type="date" name="startDate" value="${sickLeave.startDate || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Дата закінчення</label>
                        <input type="date" name="endDate" value="${sickLeave.endDate || ''}">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Номер лікарняного листка</label>
                        <input type="text" name="certificateNumber" value="${sickLeave.certificateNumber || ''}">
                    </div>
                    <div class="form-group">
                        <label>Статус</label>
                        <select name="status">
                            <option value="active" ${sickLeave.status === 'active' ? 'selected' : ''}>Активний</option>
                            <option value="completed" ${sickLeave.status === 'completed' ? 'selected' : ''}>Завершений</option>
                            <option value="cancelled" ${sickLeave.status === 'cancelled' ? 'selected' : ''}>Скасований</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Діагноз/Причина</label>
                    <textarea name="diagnosis" rows="3">${sickLeave.diagnosis || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>Медичний заклад</label>
                    <input type="text" name="medicalInstitution" value="${sickLeave.medicalInstitution || ''}">
                </div>

                <div class="form-group">
                    <label>Лікар</label>
                    <input type="text" name="doctor" value="${sickLeave.doctor || ''}">
                </div>
            </form>
        `;
    }

    renderSickLeaveCalendar() {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];

        return `
            <div class="sick-leave-calendar">
                <div class="calendar-header">
                    <button class="btn btn-sm" onclick="sickLeavesModule.changeCalendarYear(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3>${this.currentYear}</h3>
                    <button class="btn btn-sm" onclick="sickLeavesModule.changeCalendarYear(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-grid">
                    ${months.map((month, index) => `
                        <div class="calendar-month">
                            <h4>${month}</h4>
                            <div class="month-content">
                                ${this.renderMonthSickLeaves(index + 1)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderMonthSickLeaves(month) {
        const monthSickLeaves = this.sickLeaves.filter(sick => {
            const startDate = new Date(sick.startDate);
            const endDate = sick.endDate ? new Date(sick.endDate) : new Date();
            const monthStart = new Date(this.currentYear, month - 1, 1);
            const monthEnd = new Date(this.currentYear, month, 0);
            
            return (startDate <= monthEnd && endDate >= monthStart);
        });

        if (monthSickLeaves.length === 0) {
            return '<div class="no-sick-leaves">Немає лікарняних</div>';
        }

        return monthSickLeaves.map(sick => {
            const employee = this.employees.find(emp => emp.id === sick.employeeId);
            return `
                <div class="calendar-sick-leave ${sick.status}">
                    <div class="sick-leave-employee">${employee?.fullName || 'Невідомо'}</div>
                    <div class="sick-leave-period">
                        ${this.formatDateShort(sick.startDate)} ${sick.endDate ? '- ' + this.formatDateShort(sick.endDate) : '(продовжується)'}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Допоміжні методи
    getFilteredRecords() {
        let records = [...this.sickLeaves];

        // Фільтрація за роком
        records = records.filter(record => {
            const startDate = new Date(record.startDate);
            return startDate.getFullYear() === this.currentYear;
        });

        // Пошук
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            records = records.filter(record => {
                const employee = this.employees.find(emp => emp.id === record.employeeId);
                return employee?.fullName.toLowerCase().includes(query);
            });
        }

        // Фільтр за статусом
        if (this.filterStatus !== 'all') {
            records = records.filter(record => record.status === this.filterStatus);
        }

        // Фільтр за підрозділом
        if (this.filterDepartment && this.filterDepartment !== 'all') {
            records = records.filter(record => {
                const employee = this.employees.find(emp => emp.id === record.employeeId);
                return employee?.departmentId == this.filterDepartment;
            });
        }

        // Фільтр за типом
        if (this.filterType && this.filterType !== 'all') {
            records = records.filter(record => record.sickType === this.filterType);
        }

        // Сортування за датою початку
        records.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        return records;
    }

    getActiveSickLeavesCount() {
        const today = new Date();
        return this.sickLeaves.filter(sick => {
            const startDate = new Date(sick.startDate);
            const endDate = sick.endDate ? new Date(sick.endDate) : new Date();
            return sick.status === 'active' && startDate <= today && endDate >= today;
        }).length;
    }

    getThisMonthCount() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        return this.sickLeaves.filter(sick => {
            const startDate = new Date(sick.startDate);
            return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
        }).length;
    }

    getThisYearCount() {
        const currentYear = new Date().getFullYear();
        return this.sickLeaves.filter(sick => {
            const startDate = new Date(sick.startDate);
            return startDate.getFullYear() === currentYear;
        }).length;
    }

    getAverageDuration() {
        if (this.sickLeaves.length === 0) return 0;
        
        const completedSickLeaves = this.sickLeaves.filter(sick => sick.endDate);
        if (completedSickLeaves.length === 0) return 0;
        
        const totalDuration = completedSickLeaves.reduce((sum, sick) => {
            return sum + this.calculateDuration(sick.startDate, sick.endDate);
        }, 0);
        
        return Math.round(totalDuration / completedSickLeaves.length);
    }

    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    getStatusText(status) {
        const statuses = {
            'active': 'Активний',
            'completed': 'Завершено',
            'cancelled': 'Скасовано'
        };
        return statuses[status] || status;
    }

    generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const selected = year === this.currentYear ? 'selected' : '';
            options += `<option value="${year}" ${selected}>${year}</option>`;
        }
        
        return options;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    formatDateShort(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    // Дії
    async loadSickLeaveData() {
        try {
            const allSickLeaves = await this.database.getAll('sickLeaves');
            
            this.sickLeaves = allSickLeaves.filter(s => {
                const startDate = new Date(s.startDate);
                return startDate.getFullYear() === this.currentYear;
            });
            
            this.updateSickLeavesView();
            this.updateStats();
        } catch (error) {
            console.error('Помилка завантаження лікарняних:', error);
            this.sickLeaves = [];
        }
    }

    showSickLeaveModal(sickLeave = null) {
        this.selectedRecord = sickLeave;
        const modal = document.getElementById('sickLeaveModal');
        const title = document.getElementById('sickLeaveModalTitle');
        
        title.innerHTML = sickLeave ? 
            '<i class="fas fa-edit"></i> Редагувати лікарняний' : 
            '<i class="fas fa-notes-medical"></i> Оформити лікарняний';

        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.renderSickLeaveForm();
        
        hrSystem.showModal(modal);
    }

    hideSickLeaveModal() {
        const modal = document.getElementById('sickLeaveModal');
        hrSystem.closeModal(modal);
        this.selectedRecord = null;
    }

    async saveSickLeave() {
        const form = document.getElementById('sickLeaveForm');
        const formData = new FormData(form);
        
        try {
            const sickLeaveData = {
                employeeId: parseInt(formData.get('employeeId')),
                sickType: formData.get('sickType'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate') || null,
                certificateNumber: formData.get('certificateNumber'),
                diagnosis: formData.get('diagnosis'),
                medicalInstitution: formData.get('medicalInstitution'),
                doctor: formData.get('doctor'),
                status: formData.get('status') || 'active'
            };

            if (this.selectedRecord?.id) {
                // Оновлення
                sickLeaveData.id = this.selectedRecord.id;
                sickLeaveData.updatedAt = new Date().toISOString();
                await this.database.update('sickLeaves', sickLeaveData);
                hrSystem.showNotification('Лікарняний оновлено', 'success');
            } else {
                // Додавання
                sickLeaveData.createdAt = new Date().toISOString();
                await this.database.add('sickLeaves', sickLeaveData);
                hrSystem.showNotification('Лікарняний додано', 'success');
            }

            await this.loadSickLeaveData();
            this.hideSickLeaveModal();

        } catch (error) {
            console.error('Помилка збереження лікарняного:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    filterRecords() {
        this.updateSickLeavesView();
    }

    updateSickLeavesView() {
        const container = document.getElementById('sickLeavesContainer');
        if (container) {
            container.innerHTML = this.renderSickLeavesTable();
        }
        this.updateStats();
    }

    updateStats() {
        const statsItems = document.querySelectorAll('.stat-item .stat-number');
        if (statsItems.length >= 4) {
            statsItems[0].textContent = this.getActiveSickLeavesCount();
            statsItems[1].textContent = this.getThisMonthCount();
            statsItems[2].textContent = this.getThisYearCount();
            statsItems[3].textContent = this.getAverageDuration();
        }
    }

    showCalendarModal() {
        const modal = document.getElementById('sickLeaveCalendarModal');
        const calendarDiv = document.getElementById('sickLeaveCalendar');
        calendarDiv.innerHTML = this.renderSickLeaveCalendar();
        hrSystem.showModal(modal);
    }

    hideCalendarModal() {
        const modal = document.getElementById('sickLeaveCalendarModal');
        hrSystem.closeModal(modal);
    }

    changeCalendarYear(delta) {
        this.currentYear += delta;
        document.querySelector('#sickLeaveCalendarModal .modal-header h2').innerHTML = 
            `<i class="fas fa-calendar"></i> Календар лікарняних ${this.currentYear}`;
        const calendarDiv = document.getElementById('sickLeaveCalendar');
        calendarDiv.innerHTML = this.renderSickLeaveCalendar();
    }

    async showDetails(id) {
        const sickLeave = this.sickLeaves.find(s => s.id === id);
        if (!sickLeave) return;

        const employee = this.employees.find(emp => emp.id === sickLeave.employeeId);
        const department = this.departments.find(d => d.id === employee?.departmentId);
        const typeInfo = this.sickTypes[sickLeave.sickType];
        const duration = sickLeave.endDate ? 
            this.calculateDuration(sickLeave.startDate, sickLeave.endDate) : 
            this.calculateDuration(sickLeave.startDate, new Date().toISOString().split('T')[0]);

        const detailsHtml = `
            <div class="sick-leave-details">
                <div class="detail-section">
                    <h3>Основна інформація</h3>
                    <div class="detail-row">
                        <label>Співробітник:</label>
                        <span>${employee?.fullName || 'Невідомо'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Підрозділ:</label>
                        <span>${department?.name || 'Не вказано'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Тип лікарняного:</label>
                        <span>${typeInfo?.name || sickLeave.sickType}</span>
                    </div>
                    <div class="detail-row">
                        <label>Статус:</label>
                        <span class="status-badge ${sickLeave.status}">${this.getStatusText(sickLeave.status)}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Період</h3>
                    <div class="detail-row">
                        <label>Дата початку:</label>
                        <span>${this.formatDate(sickLeave.startDate)}</span>
                    </div>
                    <div class="detail-row">
                        <label>Дата закінчення:</label>
                        <span>${sickLeave.endDate ? this.formatDate(sickLeave.endDate) : 'Продовжується'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Тривалість:</label>
                        <span>${duration} днів</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Медична інформація</h3>
                    <div class="detail-row">
                        <label>Номер лікарняного листка:</label>
                        <span>${sickLeave.certificateNumber || 'Не вказано'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Діагноз/Причина:</label>
                        <span>${sickLeave.diagnosis || 'Не вказано'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Медичний заклад:</label>
                        <span>${sickLeave.medicalInstitution || 'Не вказано'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Лікар:</label>
                        <span>${sickLeave.doctor || 'Не вказано'}</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('sickLeaveDetails').innerHTML = detailsHtml;
        const modal = document.getElementById('sickLeaveDetailsModal');
        hrSystem.showModal(modal);
    }

    async editRecord(id) {
        const sickLeave = this.sickLeaves.find(s => s.id === id);
        if (sickLeave) {
            this.showSickLeaveModal(sickLeave);
        }
    }

    async deleteRecord(id) {
        const sickLeave = this.sickLeaves.find(s => s.id === id);
        if (!sickLeave) return;

        const employee = this.employees.find(emp => emp.id === sickLeave.employeeId);
        const confirmMessage = `Ви впевнені, що хочете видалити лікарняний для ${employee?.fullName || 'співробітника'}?`;

        if (confirm(confirmMessage)) {
            try {
                await this.database.delete('sickLeaves', id);
                await this.loadSickLeaveData();
                hrSystem.showNotification('Лікарняний видалено', 'success');
            } catch (error) {
                console.error('Помилка видалення:', error);
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    hideDetailsModal() {
        const modal = document.getElementById('sickLeaveDetailsModal');
        hrSystem.closeModal(modal);
    }

    async exportSickLeaves() {
        try {
            const records = this.getFilteredRecords();
            const exportData = records.map(record => {
                const employee = this.employees.find(emp => emp.id === record.employeeId);
                const department = this.departments.find(d => d.id === employee?.departmentId);
                const duration = record.endDate ? 
                    this.calculateDuration(record.startDate, record.endDate) : 
                    this.calculateDuration(record.startDate, new Date().toISOString().split('T')[0]);
                
                return {
                    'ПІБ': employee?.fullName || '',
                    'Підрозділ': department?.name || '',
                    'Тип': this.sickTypes[record.sickType]?.name || record.sickType,
                    'Дата початку': this.formatDate(record.startDate),
                    'Дата закінчення': record.endDate ? this.formatDate(record.endDate) : 'Продовжується',
                    'Днів': duration,
                    'Номер листка': record.certificateNumber || '',
                    'Діагноз': record.diagnosis || '',
                    'Медзаклад': record.medicalInstitution || '',
                    'Лікар': record.doctor || '',
                    'Статус': this.getStatusText(record.status)
                };
            });

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Лікарняні_${this.currentYear}.json`;
            a.click();
            URL.revokeObjectURL(url);

            hrSystem.showNotification('Дані експортовано', 'success');

        } catch (error) {
            console.error('Помилка експорту:', error);
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }
}

// Глобальна змінна sickLeavesModule буде оголошена в hr-system.js
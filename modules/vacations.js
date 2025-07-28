/**
 * Vacations Module - Модуль відпусток та лікарняних
 * Облік всіх видів відпусток та тимчасової непрацездатності
 */

class VacationsModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.employees = [];
        this.departments = [];
        this.positions = [];
        this.vacations = [];
        this.sickLeaves = [];
        this.selectedRecord = null;
        this.currentView = 'all'; // all, vacations, sick
        this.currentYear = new Date().getFullYear();
        this.searchQuery = '';
        this.filterStatus = 'all';
        
        // Типи відпусток згідно українського законодавства
        this.vacationTypes = {
            'main': { name: 'Основна відпустка', days: 24, paid: true, code: 'В' },
            'additional': { name: 'Додаткова відпустка', days: 0, paid: true, code: 'ВД' },
            'unpaid': { name: 'Відпустка без збереження з/п', days: 0, paid: false, code: 'ВБ' },
            'maternity': { name: 'Відпустка по вагітності та пологах', days: 126, paid: true, code: 'ВР' },
            'childcare': { name: 'Відпустка по догляду за дитиною', days: 0, paid: false, code: 'ВД' },
            'study': { name: 'Навчальна відпустка', days: 0, paid: true, code: 'ВН' },
            'creative': { name: 'Творча відпустка', days: 0, paid: false, code: 'ВТ' }
        };

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
            <div class="vacations-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-calendar-check"></i> Відпустки та лікарняні</h1>
                        <p>Облік часу відсутності співробітників</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addVacationBtn">
                            <i class="fas fa-plus"></i> Подати відпустку
                        </button>
                        <button class="btn btn-warning" id="addSickLeaveBtn">
                            <i class="fas fa-notes-medical"></i> Лікарняний
                        </button>
                        <button class="btn btn-secondary" id="vacationCalendarBtn">
                            <i class="fas fa-calendar"></i> Календар
                        </button>
                        <button class="btn btn-secondary" id="exportVacationsBtn">
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
                            <option value="planned">Заплановано</option>
                            <option value="approved">Затверджено</option>
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
                    </div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="all" title="Всі">
                            <i class="fas fa-list"></i> Всі
                        </button>
                        <button class="view-btn" data-view="vacations" title="Відпустки">
                            <i class="fas fa-umbrella-beach"></i> Відпустки
                        </button>
                        <button class="view-btn" data-view="sick" title="Лікарняні">
                            <i class="fas fa-notes-medical"></i> Лікарняні
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.getActiveVacationsCount()}</span>
                        <span class="stat-label">Активних відпусток</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getActiveSickLeavesCount()}</span>
                        <span class="stat-label">Активних лікарняних</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getPendingApprovalsCount()}</span>
                        <span class="stat-label">Очікують затвердження</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getUpcomingVacationsCount()}</span>
                        <span class="stat-label">Найближчі відпустки</span>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="vacations-content">
                    <div id="vacationsContainer" class="vacations-container">
                        ${this.renderVacationsTable()}
                    </div>
                </div>

                <!-- Модальне вікно відпустки -->
                <div id="vacationModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2 id="vacationModalTitle">
                                <i class="fas fa-umbrella-beach"></i> Подати відпустку
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderVacationForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveVacationBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelVacationBtn">Скасувати</button>
                        </div>
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
                <div id="vacationDetailsModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2 id="detailsTitle">
                                <i class="fas fa-info-circle"></i> Деталі запису
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="vacationDetails"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-success" id="approveBtn" style="display: none;">Затвердити</button>
                            <button class="btn btn-danger" id="rejectBtn" style="display: none;">Відхилити</button>
                            <button class="btn btn-primary" id="editDetailsBtn">Редагувати</button>
                            <button class="btn btn-secondary" id="closeDetailsBtn">Закрити</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно календаря -->
                <div id="vacationCalendarModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2>
                                <i class="fas fa-calendar"></i> Календар відпусток ${this.currentYear}
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="vacationCalendar">
                                ${this.renderVacationCalendar()}
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
        await this.loadVacationData();
    }

    async loadData() {
        try {
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.positions = await this.database.getAll('positions');
        } catch (error) {
            console.error('Помилка завантаження даних відпусток:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Додавання відпустки/лікарняного
        document.getElementById('addVacationBtn')?.addEventListener('click', () => {
            this.showVacationModal();
        });

        document.getElementById('addSickLeaveBtn')?.addEventListener('click', () => {
            this.showSickLeaveModal();
        });

        // Календар
        document.getElementById('vacationCalendarBtn')?.addEventListener('click', () => {
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
            this.loadVacationData();
        });

        document.getElementById('departmentFilter')?.addEventListener('change', (e) => {
            this.filterDepartment = e.target.value;
            this.filterRecords();
        });

        // Перемикання вигляду
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.updateVacationsView();
            });
        });

        // Експорт
        document.getElementById('exportVacationsBtn')?.addEventListener('click', () => {
            this.exportVacations();
        });

        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Збереження відпустки
        document.getElementById('saveVacationBtn')?.addEventListener('click', () => {
            this.saveVacation();
        });

        document.getElementById('cancelVacationBtn')?.addEventListener('click', () => {
            this.hideVacationModal();
        });

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

        document.getElementById('approveBtn')?.addEventListener('click', () => {
            this.approveRecord();
        });

        document.getElementById('rejectBtn')?.addEventListener('click', () => {
            this.rejectRecord();
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

    renderVacationsTable() {
        const records = this.getFilteredRecords();
        
        if (records.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Немає записів</h3>
                    <p>Додайте відпустку або лікарняний для початку роботи</p>
                    <div class="empty-actions">
                        <button class="btn btn-primary" onclick="document.getElementById('addVacationBtn').click()">
                            <i class="fas fa-plus"></i> Подати відпустку
                        </button>
                        <button class="btn btn-warning" onclick="document.getElementById('addSickLeaveBtn').click()">
                            <i class="fas fa-notes-medical"></i> Лікарняний
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="vacations-table-wrapper">
                <table class="vacations-table">
                    <thead>
                        <tr>
                            <th>Співробітник</th>
                            <th>Тип</th>
                            <th>Період</th>
                            <th>Днів</th>
                            <th>Причина/Примітки</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(record => this.renderVacationRow(record)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderVacationRow(record) {
        const employee = this.employees.find(emp => emp.id === record.employeeId);
        const isVacation = record.type === 'vacation';
        const typeInfo = isVacation ? 
            this.vacationTypes[record.vacationType] : 
            this.sickTypes[record.sickType];

        return `
            <tr class="vacation-row ${record.type}" data-id="${record.id}">
                <td class="employee-info">
                    <div class="employee-name">${employee?.fullName || 'Невідомо'}</div>
                    <div class="employee-position">${employee?.personnelNumber || ''}</div>
                </td>
                <td class="record-type">
                    <div class="type-badge ${record.type}">
                        <i class="fas ${isVacation ? 'fa-umbrella-beach' : 'fa-notes-medical'}"></i>
                        ${typeInfo?.name || record.type}
                    </div>
                </td>
                <td class="period-cell">
                    <div class="period-dates">
                        ${this.formatDate(record.startDate)} - ${this.formatDate(record.endDate)}
                    </div>
                    <div class="period-duration">${this.calculateDuration(record.startDate, record.endDate)} днів</div>
                </td>
                <td class="days-count">
                    <span class="days-number">${record.totalDays}</span>
                </td>
                <td class="reason-cell">
                    <div class="reason-text">${record.reason || record.diagnosis || 'Не вказано'}</div>
                </td>
                <td class="status-cell">
                    <span class="status-badge ${record.status}">
                        ${this.getStatusText(record.status)}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="vacationsModule.showDetails(${record.id})" title="Деталі">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="vacationsModule.editRecord(${record.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${record.status === 'planned' ? `
                        <button class="btn-icon success" onclick="vacationsModule.quickApprove(${record.id})" title="Затвердити">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon danger" onclick="vacationsModule.deleteRecord(${record.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderVacationForm() {
        const vacation = this.selectedRecord || {};
        
        return `
            <form id="vacationForm" class="vacation-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Співробітник *</label>
                        <select name="employeeId" required>
                            <option value="">Виберіть співробітника</option>
                            ${this.employees
                                .filter(emp => emp.status === 'active')
                                .map(emp => 
                                    `<option value="${emp.id}" ${vacation.employeeId === emp.id ? 'selected' : ''}>${emp.fullName}</option>`
                                ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Тип відпустки *</label>
                        <select name="vacationType" required>
                            ${Object.entries(this.vacationTypes).map(([key, type]) => 
                                `<option value="${key}" ${vacation.vacationType === key ? 'selected' : ''}>${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Дата початку *</label>
                        <input type="date" name="startDate" value="${vacation.startDate || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Дата закінчення *</label>
                        <input type="date" name="endDate" value="${vacation.endDate || ''}" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Загально днів</label>
                        <input type="number" name="totalDays" value="${vacation.totalDays || ''}" min="1" readonly>
                    </div>
                    <div class="form-group">
                        <label>Статус</label>
                        <select name="status">
                            <option value="planned" ${vacation.status === 'planned' ? 'selected' : ''}>Заплановано</option>
                            <option value="approved" ${vacation.status === 'approved' ? 'selected' : ''}>Затверджено</option>
                            <option value="active" ${vacation.status === 'active' ? 'selected' : ''}>Активна</option>
                            <option value="completed" ${vacation.status === 'completed' ? 'selected' : ''}>Завершена</option>
                            <option value="cancelled" ${vacation.status === 'cancelled' ? 'selected' : ''}>Скасована</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Причина/Коментар</label>
                    <textarea name="reason" rows="3">${vacation.reason || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" name="isPaid" ${vacation.isPaid !== false ? 'checked' : ''}>
                        Оплачувана відпустка
                    </label>
                </div>

                <div class="form-group">
                    <label>Заміщуючий співробітник</label>
                    <select name="substituteId">
                        <option value="">Не вказано</option>
                        ${this.employees
                            .filter(emp => emp.status === 'active' && emp.id !== vacation.employeeId)
                            .map(emp => 
                                `<option value="${emp.id}" ${vacation.substituteId === emp.id ? 'selected' : ''}>${emp.fullName}</option>`
                            ).join('')}
                    </select>
                </div>
            </form>
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

    renderVacationCalendar() {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];

        return `
            <div class="vacation-calendar">
                <div class="calendar-header">
                    <button class="btn btn-sm" onclick="vacationsModule.changeCalendarYear(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3>${this.currentYear}</h3>
                    <button class="btn btn-sm" onclick="vacationsModule.changeCalendarYear(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-grid">
                    ${months.map((month, index) => `
                        <div class="calendar-month">
                            <h4>${month}</h4>
                            <div class="month-content">
                                ${this.renderMonthVacations(index + 1)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderMonthVacations(month) {
        const monthVacations = this.vacations.filter(vacation => {
            const startDate = new Date(vacation.startDate);
            const endDate = new Date(vacation.endDate);
            const monthStart = new Date(this.currentYear, month - 1, 1);
            const monthEnd = new Date(this.currentYear, month, 0);
            
            return (startDate <= monthEnd && endDate >= monthStart);
        });

        if (monthVacations.length === 0) {
            return '<div class="no-vacations">Немає відпусток</div>';
        }

        return monthVacations.map(vacation => {
            const employee = this.employees.find(emp => emp.id === vacation.employeeId);
            return `
                <div class="calendar-vacation ${vacation.status}">
                    <div class="vacation-employee">${employee?.fullName || 'Невідомо'}</div>
                    <div class="vacation-period">
                        ${this.formatDateShort(vacation.startDate)} - ${this.formatDateShort(vacation.endDate)}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Допоміжні методи
    getFilteredRecords() {
        let allRecords = [];
        
        // Додаємо відпустки
        if (this.currentView === 'all' || this.currentView === 'vacations') {
            allRecords = allRecords.concat(
                this.vacations.map(v => ({ ...v, type: 'vacation' }))
            );
        }
        
        // Додаємо лікарняні
        if (this.currentView === 'all' || this.currentView === 'sick') {
            allRecords = allRecords.concat(
                this.sickLeaves.map(s => ({ ...s, type: 'sick' }))
            );
        }

        // Фільтрація за роком
        allRecords = allRecords.filter(record => {
            const startDate = new Date(record.startDate);
            return startDate.getFullYear() === this.currentYear;
        });

        // Пошук
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            allRecords = allRecords.filter(record => {
                const employee = this.employees.find(emp => emp.id === record.employeeId);
                return employee?.fullName.toLowerCase().includes(query);
            });
        }

        // Фільтр за статусом
        if (this.filterStatus !== 'all') {
            allRecords = allRecords.filter(record => record.status === this.filterStatus);
        }

        // Фільтр за підрозділом
        if (this.filterDepartment && this.filterDepartment !== 'all') {
            allRecords = allRecords.filter(record => {
                const employee = this.employees.find(emp => emp.id === record.employeeId);
                return employee?.departmentId == this.filterDepartment;
            });
        }

        // Сортування за датою початку
        allRecords.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        return allRecords;
    }

    getActiveVacationsCount() {
        const today = new Date();
        return this.vacations.filter(vacation => {
            const startDate = new Date(vacation.startDate);
            const endDate = new Date(vacation.endDate);
            return vacation.status === 'active' && startDate <= today && endDate >= today;
        }).length;
    }

    getActiveSickLeavesCount() {
        const today = new Date();
        return this.sickLeaves.filter(sick => {
            const startDate = new Date(sick.startDate);
            const endDate = sick.endDate ? new Date(sick.endDate) : new Date();
            return sick.status === 'active' && startDate <= today && endDate >= today;
        }).length;
    }

    getPendingApprovalsCount() {
        return [...this.vacations, ...this.sickLeaves]
            .filter(record => record.status === 'planned').length;
    }

    getUpcomingVacationsCount() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        return this.vacations.filter(vacation => {
            const startDate = new Date(vacation.startDate);
            return vacation.status === 'approved' && startDate >= today && startDate <= nextWeek;
        }).length;
    }

    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    getStatusText(status) {
        const statuses = {
            'planned': 'Заплановано',
            'approved': 'Затверджено',
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
    async loadVacationData() {
        try {
            const allVacations = await this.database.getAll('vacations');
            const allSickLeaves = await this.database.getAll('sickLeaves');
            
            this.vacations = allVacations.filter(v => {
                const startDate = new Date(v.startDate);
                return startDate.getFullYear() === this.currentYear;
            });
            
            this.sickLeaves = allSickLeaves.filter(s => {
                const startDate = new Date(s.startDate);
                return startDate.getFullYear() === this.currentYear;
            });
            
            this.updateVacationsView();
            this.updateStats();
        } catch (error) {
            console.error('Помилка завантаження відпусток:', error);
            this.vacations = [];
            this.sickLeaves = [];
        }
    }

    showVacationModal(vacation = null) {
        this.selectedRecord = vacation;
        const modal = document.getElementById('vacationModal');
        const title = document.getElementById('vacationModalTitle');
        
        title.innerHTML = vacation ? 
            '<i class="fas fa-edit"></i> Редагувати відпустку' : 
            '<i class="fas fa-umbrella-beach"></i> Подати відпустку';

        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.renderVacationForm();
        
        // Додаємо обчислення днів
        this.setupDateCalculation();
        
        hrSystem.showModal(modal);
    }

    hideVacationModal() {
        const modal = document.getElementById('vacationModal');
        hrSystem.closeModal(modal);
        this.selectedRecord = null;
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

    setupDateCalculation() {
        const startDateInput = document.querySelector('[name="startDate"]');
        const endDateInput = document.querySelector('[name="endDate"]');
        const totalDaysInput = document.querySelector('[name="totalDays"]');
        
        const calculateDays = () => {
            if (startDateInput.value && endDateInput.value) {
                const days = this.calculateDuration(startDateInput.value, endDateInput.value);
                totalDaysInput.value = days;
            }
        };
        
        startDateInput?.addEventListener('change', calculateDays);
        endDateInput?.addEventListener('change', calculateDays);
    }

    async saveVacation() {
        const form = document.getElementById('vacationForm');
        const formData = new FormData(form);
        
        try {
            const vacationData = {
                employeeId: parseInt(formData.get('employeeId')),
                vacationType: formData.get('vacationType'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                totalDays: parseInt(formData.get('totalDays')),
                reason: formData.get('reason'),
                status: formData.get('status') || 'planned',
                isPaid: formData.get('isPaid') === 'on',
                substituteId: formData.get('substituteId') ? parseInt(formData.get('substituteId')) : null
            };

            if (this.selectedRecord?.id) {
                // Оновлення
                vacationData.id = this.selectedRecord.id;
                vacationData.updatedAt = new Date().toISOString();
                await this.database.update('vacations', vacationData);
                hrSystem.showNotification('Відпустку оновлено', 'success');
            } else {
                // Додавання
                vacationData.createdAt = new Date().toISOString();
                await this.database.add('vacations', vacationData);
                hrSystem.showNotification('Відпустку додано', 'success');
            }

            await this.loadVacationData();
            this.hideVacationModal();

        } catch (error) {
            console.error('Помилка збереження відпустки:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
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

            await this.loadVacationData();
            this.hideSickLeaveModal();

        } catch (error) {
            console.error('Помилка збереження лікарняного:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    filterRecords() {
        this.updateVacationsView();
    }

    updateVacationsView() {
        const container = document.getElementById('vacationsContainer');
        if (container) {
            container.innerHTML = this.renderVacationsTable();
        }
        this.updateStats();
    }

    updateStats() {
        const statsItems = document.querySelectorAll('.stat-item .stat-number');
        if (statsItems.length >= 4) {
            statsItems[0].textContent = this.getActiveVacationsCount();
            statsItems[1].textContent = this.getActiveSickLeavesCount();
            statsItems[2].textContent = this.getPendingApprovalsCount();
            statsItems[3].textContent = this.getUpcomingVacationsCount();
        }
    }

    showCalendarModal() {
        const modal = document.getElementById('vacationCalendarModal');
        const calendarDiv = document.getElementById('vacationCalendar');
        calendarDiv.innerHTML = this.renderVacationCalendar();
        hrSystem.showModal(modal);
    }

    hideCalendarModal() {
        const modal = document.getElementById('vacationCalendarModal');
        hrSystem.closeModal(modal);
    }

    changeCalendarYear(delta) {
        this.currentYear += delta;
        document.querySelector('#vacationCalendarModal .modal-header h2').innerHTML = 
            `<i class="fas fa-calendar"></i> Календар відпусток ${this.currentYear}`;
        const calendarDiv = document.getElementById('vacationCalendar');
        calendarDiv.innerHTML = this.renderVacationCalendar();
    }

    // Заглушки для майбутньої реалізації
    async showDetails(id) {
        console.log('Show details for record:', id);
        hrSystem.showNotification('Функція буде реалізована в наступній версії', 'info');
    }

    async editRecord(id) {
        const vacation = this.vacations.find(v => v.id === id);
        const sickLeave = this.sickLeaves.find(s => s.id === id);
        
        if (vacation) {
            this.showVacationModal(vacation);
        } else if (sickLeave) {
            this.showSickLeaveModal(sickLeave);
        }
    }

    async quickApprove(id) {
        try {
            const vacation = this.vacations.find(v => v.id === id);
            if (vacation) {
                vacation.status = 'approved';
                vacation.updatedAt = new Date().toISOString();
                await this.database.update('vacations', vacation);
                await this.loadVacationData();
                hrSystem.showNotification('Відпустку затверджено', 'success');
            }
        } catch (error) {
            console.error('Помилка затвердження:', error);
            hrSystem.showNotification('Помилка затвердження: ' + error.message, 'error');
        }
    }

    async deleteRecord(id) {
        const vacation = this.vacations.find(v => v.id === id);
        const sickLeave = this.sickLeaves.find(s => s.id === id);
        const record = vacation || sickLeave;
        const type = vacation ? 'відпустку' : 'лікарняний';
        const table = vacation ? 'vacations' : 'sickLeaves';

        if (!record) return;

        if (confirm(`Ви впевнені, що хочете видалити цей ${type}?`)) {
            try {
                await this.database.delete(table, id);
                await this.loadVacationData();
                hrSystem.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} видалено`, 'success');
            } catch (error) {
                console.error('Помилка видалення:', error);
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    hideDetailsModal() {
        const modal = document.getElementById('vacationDetailsModal');
        hrSystem.closeModal(modal);
    }

    async approveRecord() {
        hrSystem.showNotification('Функція буде реалізована в наступній версії', 'info');
    }

    async rejectRecord() {
        hrSystem.showNotification('Функція буде реалізована в наступній версії', 'info');
    }

    async exportVacations() {
        try {
            const records = this.getFilteredRecords();
            const exportData = records.map(record => {
                const employee = this.employees.find(emp => emp.id === record.employeeId);
                const department = this.departments.find(d => d.id === employee?.departmentId);
                const isVacation = record.type === 'vacation';
                
                return {
                    'ПІБ': employee?.fullName || '',
                    'Підрозділ': department?.name || '',
                    'Тип': isVacation ? 'Відпустка' : 'Лікарняний',
                    'Підтип': isVacation ? 
                        this.vacationTypes[record.vacationType]?.name : 
                        this.sickTypes[record.sickType]?.name,
                    'Дата початку': this.formatDate(record.startDate),
                    'Дата закінчення': record.endDate ? this.formatDate(record.endDate) : '',
                    'Днів': record.totalDays || this.calculateDuration(record.startDate, record.endDate || record.startDate),
                    'Статус': this.getStatusText(record.status),
                    'Причина': record.reason || record.diagnosis || ''
                };
            });

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Відпустки_${this.currentYear}.json`;
            a.click();
            URL.revokeObjectURL(url);

            hrSystem.showNotification('Дані експортовано', 'success');

        } catch (error) {
            console.error('Помилка експорту:', error);
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }
}

// Глобальна змінна vacationsModule оголошена в hr-system.js
/**
 * Schedules Module - Модуль управління графіками роботи
 */

class SchedulesModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.schedules = [];
        this.employees = [];
        this.scheduleTemplates = [];
        this.selectedSchedule = null;
        this.currentView = 'list'; // list, calendar, assignment
        this.searchQuery = '';
        this.filterType = 'all';
        this.currentDate = new Date();
    }

    async render() {
        await this.loadData();

        return `
            <div class="schedules-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-calendar-alt"></i> Графіки роботи</h1>
                        <p>Управління робочим часом та змінами</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addScheduleBtn">
                            <i class="fas fa-plus"></i> Створити графік
                        </button>
                        <button class="btn btn-secondary" id="templatesBtn">
                            <i class="fas fa-clipboard-list"></i> Шаблони
                        </button>
                        <button class="btn btn-secondary" id="assignSchedulesBtn">
                            <i class="fas fa-user-clock"></i> Призначити
                        </button>
                    </div>
                </div>

                <!-- Фільтри та пошук -->
                <div class="controls-panel">
                    <div class="search-controls">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Пошук за назвою графіка...">
                            <i class="fas fa-search"></i>
                        </div>
                        <select id="typeFilter" class="filter-select">
                            <option value="all">Всі типи</option>
                            <option value="fixed">Фіксований</option>
                            <option value="shift">Змінний</option>
                            <option value="flexible">Гнучкий</option>
                            <option value="remote">Віддалений</option>
                        </select>
                        <select id="statusFilter" class="filter-select">
                            <option value="all">Всі статуси</option>
                            <option value="active">Активні</option>
                            <option value="inactive">Неактивні</option>
                            <option value="draft">Чернетки</option>
                        </select>
                    </div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="list" title="Список">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="view-btn" data-view="calendar" title="Календар">
                            <i class="fas fa-calendar"></i>
                        </button>
                        <button class="view-btn" data-view="assignment" title="Призначення">
                            <i class="fas fa-users"></i>
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.schedules.filter(s => s.status === 'active').length}</span>
                        <span class="stat-label">Активних графіків</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getAssignedEmployeesCount()}</span>
                        <span class="stat-label">Співробітників з графіками</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.scheduleTemplates.length}</span>
                        <span class="stat-label">Шаблонів</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getTodayWorkingHours()}</span>
                        <span class="stat-label">Годин сьогодні</span>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="schedules-content">
                    <div id="schedulesContainer" class="schedules-container">
                        ${this.renderSchedulesView()}
                    </div>
                </div>

                <!-- Модальне вікно графіка -->
                <div id="scheduleModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2 id="scheduleModalTitle">
                                <i class="fas fa-calendar-plus"></i> Створити графік роботи
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="scheduleFormContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveScheduleBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelScheduleBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно шаблонів -->
                <div id="templatesModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2><i class="fas fa-clipboard-list"></i> Шаблони графіків</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="templatesContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="addTemplateBtn">Створити шаблон</button>
                            <button class="btn btn-secondary" id="closeTemplatesBtn">Закрити</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно призначення -->
                <div id="assignmentModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2><i class="fas fa-user-clock"></i> Призначення графіків</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="assignmentContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveAssignmentBtn">Зберегти призначення</button>
                            <button class="btn btn-secondary" id="cancelAssignmentBtn">Скасувати</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        this.bindEvents();
        this.initializeDefaultTemplates();
    }

    async loadData() {
        try {
            this.schedules = await this.database.getAll('schedules') || [];
            this.employees = await this.database.getAll('employees') || [];
            this.scheduleTemplates = await this.database.getAll('scheduleTemplates') || [];
        } catch (error) {
            console.error('Помилка завантаження даних графіків:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Основні кнопки
        document.getElementById('addScheduleBtn')?.addEventListener('click', () => {
            this.showScheduleModal();
        });

        document.getElementById('templatesBtn')?.addEventListener('click', () => {
            this.showTemplatesModal();
        });

        document.getElementById('assignSchedulesBtn')?.addEventListener('click', () => {
            this.showAssignmentModal();
        });

        // Пошук і фільтри
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterSchedules();
        });

        document.getElementById('typeFilter')?.addEventListener('change', (e) => {
            this.filterType = e.target.value;
            this.filterSchedules();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.filterSchedules();
        });

        // Перемикання видів
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.updateSchedulesView();
            });
        });

        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Збереження графіка
        document.getElementById('saveScheduleBtn')?.addEventListener('click', () => {
            this.saveSchedule();
        });

        document.getElementById('cancelScheduleBtn')?.addEventListener('click', () => {
            this.hideScheduleModal();
        });

        // Шаблони
        document.getElementById('addTemplateBtn')?.addEventListener('click', () => {
            this.createTemplateFromSchedule();
        });

        document.getElementById('closeTemplatesBtn')?.addEventListener('click', () => {
            this.hideTemplatesModal();
        });

        // Призначення
        document.getElementById('saveAssignmentBtn')?.addEventListener('click', () => {
            this.saveAssignments();
        });

        document.getElementById('cancelAssignmentBtn')?.addEventListener('click', () => {
            this.hideAssignmentModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
    }

    renderSchedulesView() {
        switch(this.currentView) {
            case 'calendar':
                return this.renderCalendarView();
            case 'assignment':
                return this.renderAssignmentView();
            default:
                return this.renderSchedulesList();
        }
    }

    renderSchedulesList() {
        if (this.schedules.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>Немає графіків роботи</h3>
                    <p>Створіть перший графік для організації робочого часу</p>
                    <button class="btn btn-primary" onclick="document.getElementById('addScheduleBtn').click()">
                        <i class="fas fa-plus"></i> Створити графік
                    </button>
                </div>
            `;
        }

        return `
            <div class="schedules-table-container">
                <table class="schedules-table">
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>Тип</th>
                            <th>Робочі дні</th>
                            <th>Час роботи</th>
                            <th>Співробітники</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.getFilteredSchedules().map(schedule => this.renderScheduleRow(schedule)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderScheduleRow(schedule) {
        const assignedCount = this.getScheduleAssignedCount(schedule.id);
        
        return `
            <tr class="schedule-row" data-id="${schedule.id}">
                <td>
                    <div class="schedule-name">${schedule.name}</div>
                    <div class="schedule-description">${schedule.description || ''}</div>
                </td>
                <td>
                    <span class="type-badge ${schedule.type}">
                        ${this.getScheduleTypeText(schedule.type)}
                    </span>
                </td>
                <td>${this.formatWorkingDays(schedule.workingDays)}</td>
                <td>${this.formatWorkingHours(schedule)}</td>
                <td>
                    <span class="assigned-count">${assignedCount}</span>
                    <i class="fas fa-users"></i>
                </td>
                <td>
                    <span class="status-badge ${schedule.status}">
                        ${this.getStatusText(schedule.status)}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="schedulesModule.editSchedule(${schedule.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="schedulesModule.duplicateSchedule(${schedule.id})" title="Дублювати">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-icon" onclick="schedulesModule.toggleScheduleStatus(${schedule.id})" title="Змінити статус">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button class="btn-icon danger" onclick="schedulesModule.deleteSchedule(${schedule.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderCalendarView() {
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        
        return `
            <div class="calendar-view">
                <div class="calendar-header">
                    <button class="btn btn-secondary" id="prevMonth">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3>${this.getMonthName(currentMonth)} ${currentYear}</h3>
                    <button class="btn btn-secondary" id="nextMonth">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-grid">
                    ${this.renderCalendarGrid()}
                </div>
                <div class="calendar-legend">
                    <div class="legend-item">
                        <span class="legend-color working"></span>
                        <span>Робочі дні</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color weekend"></span>
                        <span>Вихідні</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color holiday"></span>
                        <span>Свята</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderAssignmentView() {
        return `
            <div class="assignment-view">
                <div class="assignment-summary">
                    <h3>Призначення графіків співробітникам</h3>
                    <p>Перегляд та управління призначеннями робочих графіків</p>
                </div>
                
                <div class="assignment-table-container">
                    <table class="assignment-table">
                        <thead>
                            <tr>
                                <th>Співробітник</th>
                                <th>Поточний графік</th>
                                <th>Підрозділ</th>
                                <th>Дата призначення</th>
                                <th>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.employees.map(emp => this.renderEmployeeAssignmentRow(emp)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderEmployeeAssignmentRow(employee) {
        const assignment = this.getEmployeeScheduleAssignment(employee.id);
        const schedule = assignment ? this.schedules.find(s => s.id === assignment.scheduleId) : null;
        
        return `
            <tr class="assignment-row" data-employee-id="${employee.id}">
                <td>
                    <div class="employee-info">
                        <strong>${employee.fullName}</strong>
                        <small>${employee.personnelNumber}</small>
                    </div>
                </td>
                <td>
                    ${schedule ? 
                        `<span class="schedule-name">${schedule.name}</span>` : 
                        '<span class="no-schedule">Не призначено</span>'
                    }
                </td>
                <td>${this.getEmployeeDepartment(employee.id)}</td>
                <td>${assignment ? this.formatDate(assignment.assignedDate) : '-'}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="schedulesModule.assignScheduleToEmployee(${employee.id})" title="Призначити графік">
                        <i class="fas fa-calendar-plus"></i>
                    </button>
                    ${assignment ? `
                        <button class="btn-icon danger" onclick="schedulesModule.removeScheduleFromEmployee(${employee.id})" title="Скасувати призначення">
                            <i class="fas fa-calendar-minus"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    renderScheduleForm() {
        const schedule = this.selectedSchedule || {};
        
        return `
            <form id="scheduleForm" class="schedule-form">
                <div class="form-tabs">
                    <button type="button" class="tab-btn active" data-tab="basic">Основна інформація</button>
                    <button type="button" class="tab-btn" data-tab="timing">Час роботи</button>
                    <button type="button" class="tab-btn" data-tab="patterns">Шаблони змін</button>
                    <button type="button" class="tab-btn" data-tab="breaks">Перерви</button>
                </div>

                <div class="tab-content active" id="basicTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Назва графіка *</label>
                            <input type="text" name="name" value="${schedule.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Тип графіка</label>
                            <select name="type" required>
                                <option value="fixed" ${schedule.type === 'fixed' ? 'selected' : ''}>Фіксований (8 годин)</option>
                                <option value="shift" ${schedule.type === 'shift' ? 'selected' : ''}>Змінний</option>
                                <option value="flexible" ${schedule.type === 'flexible' ? 'selected' : ''}>Гнучкий</option>
                                <option value="remote" ${schedule.type === 'remote' ? 'selected' : ''}>Віддалений</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Статус</label>
                            <select name="status">
                                <option value="active" ${schedule.status === 'active' ? 'selected' : ''}>Активний</option>
                                <option value="inactive" ${schedule.status === 'inactive' ? 'selected' : ''}>Неактивний</option>
                                <option value="draft" ${schedule.status === 'draft' ? 'selected' : ''}>Чернетка</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Опис</label>
                        <textarea name="description" rows="3">${schedule.description || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Робочі дні</label>
                        <div class="weekdays-selector">
                            ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => `
                                <label class="weekday-label">
                                    <input type="checkbox" name="workingDays" value="${day}" 
                                           ${schedule.workingDays?.includes(day) ? 'checked' : ''}>
                                    <span>${this.getDayName(day)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="tab-content" id="timingTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Початок роботи</label>
                            <input type="time" name="startTime" value="${schedule.startTime || '09:00'}">
                        </div>
                        <div class="form-group">
                            <label>Кінець роботи</label>
                            <input type="time" name="endTime" value="${schedule.endTime || '18:00'}">
                        </div>
                        <div class="form-group">
                            <label>Години на день</label>
                            <input type="number" name="hoursPerDay" value="${schedule.hoursPerDay || 8}" min="1" max="24" step="0.5">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Години на тиждень</label>
                            <input type="number" name="hoursPerWeek" value="${schedule.hoursPerWeek || 40}" min="1" max="168" step="0.5">
                        </div>
                        <div class="form-group">
                            <label>Гнучкість початку (хвилин)</label>
                            <input type="number" name="flexibilityMinutes" value="${schedule.flexibilityMinutes || 0}" min="0" max="240">
                        </div>
                        <div class="form-group">
                            <label>Часовий пояс</label>
                            <select name="timezone">
                                <option value="Europe/Kiev" ${schedule.timezone === 'Europe/Kiev' ? 'selected' : ''}>Київ (UTC+2/+3)</option>
                                <option value="Europe/London" ${schedule.timezone === 'Europe/London' ? 'selected' : ''}>Лондон (UTC+0/+1)</option>
                                <option value="America/New_York" ${schedule.timezone === 'America/New_York' ? 'selected' : ''}>Нью-Йорк (UTC-5/-4)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="tab-content" id="patternsTab">
                    <div class="shift-patterns">
                        <h4>Зміни (для змінного графіка)</h4>
                        <div id="shiftsContainer">
                            ${this.renderShiftsEditor(schedule.shifts || [])}
                        </div>
                        <button type="button" class="btn btn-secondary" id="addShiftBtn">
                            <i class="fas fa-plus"></i> Додати зміну
                        </button>
                    </div>
                </div>

                <div class="tab-content" id="breaksTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Тривалість обіду (хвилин)</label>
                            <input type="number" name="lunchBreakMinutes" value="${schedule.lunchBreakMinutes || 60}" min="0" max="180">
                        </div>
                        <div class="form-group">
                            <label>Час обіду (початок)</label>
                            <input type="time" name="lunchBreakStart" value="${schedule.lunchBreakStart || '12:00'}">
                        </div>
                        <div class="form-group">
                            <label>Коротких перерв на день</label>
                            <input type="number" name="shortBreaksCount" value="${schedule.shortBreaksCount || 2}" min="0" max="6">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Тривалість короткої перерви (хвилин)</label>
                            <input type="number" name="shortBreakMinutes" value="${schedule.shortBreakMinutes || 15}" min="5" max="30">
                        </div>
                        <div class="form-group checkbox-group">
                            <label>
                                <input type="checkbox" name="autoBreaks" ${schedule.autoBreaks ? 'checked' : ''}>
                                Автоматично враховувати перерви
                            </label>
                        </div>
                    </div>
                </div>
            </form>
        `;
    }

    renderShiftsEditor(shifts) {
        if (shifts.length === 0) {
            return `
                <div class="empty-shifts">
                    <p>Немає налаштованих змін. Додайте зміни для змінного графіка.</p>
                </div>
            `;
        }

        return shifts.map((shift, index) => `
            <div class="shift-item" data-index="${index}">
                <div class="shift-header">
                    <h5>Зміна ${index + 1}: ${shift.name}</h5>
                    <button type="button" class="btn-icon danger" onclick="schedulesModule.removeShift(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="shift-details">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Назва зміни</label>
                            <input type="text" name="shifts[${index}][name]" value="${shift.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Початок</label>
                            <input type="time" name="shifts[${index}][startTime]" value="${shift.startTime}" required>
                        </div>
                        <div class="form-group">
                            <label>Кінець</label>
                            <input type="time" name="shifts[${index}][endTime]" value="${shift.endTime}" required>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Допоміжні методи
    getFilteredSchedules() {
        let filtered = [...this.schedules];

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(schedule => 
                schedule.name.toLowerCase().includes(query) ||
                (schedule.description && schedule.description.toLowerCase().includes(query))
            );
        }

        if (this.filterType !== 'all') {
            filtered = filtered.filter(schedule => schedule.type === this.filterType);
        }

        if (this.filterStatus !== 'all') {
            filtered = filtered.filter(schedule => schedule.status === this.filterStatus);
        }

        return filtered;
    }

    getScheduleTypeText(type) {
        const types = {
            fixed: 'Фіксований',
            shift: 'Змінний',
            flexible: 'Гнучкий',
            remote: 'Віддалений'
        };
        return types[type] || type;
    }

    getStatusText(status) {
        const statuses = {
            active: 'Активний',
            inactive: 'Неактивний',
            draft: 'Чернетка'
        };
        return statuses[status] || status;
    }

    getDayName(day) {
        const days = {
            monday: 'Пн',
            tuesday: 'Вт',
            wednesday: 'Ср',
            thursday: 'Чт',
            friday: 'Пт',
            saturday: 'Сб',
            sunday: 'Нд'
        };
        return days[day] || day;
    }

    formatWorkingDays(workingDays) {
        if (!workingDays || workingDays.length === 0) return 'Не вказано';
        return workingDays.map(day => this.getDayName(day)).join(', ');
    }

    formatWorkingHours(schedule) {
        if (schedule.type === 'shift') {
            return `${schedule.shifts?.length || 0} змін`;
        }
        return `${schedule.startTime || '09:00'} - ${schedule.endTime || '18:00'}`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    getAssignedEmployeesCount() {
        return this.employees.filter(emp => emp.scheduleId).length;
    }

    getTodayWorkingHours() {
        const today = new Date().getDay();
        const activeSchedules = this.schedules.filter(s => s.status === 'active');
        let totalHours = 0;
        
        activeSchedules.forEach(schedule => {
            if (schedule.workingDays?.includes(this.getDayByNumber(today))) {
                totalHours += schedule.hoursPerDay || 8;
            }
        });
        
        return totalHours;
    }

    getDayByNumber(dayNumber) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[dayNumber];
    }

    getScheduleAssignedCount(scheduleId) {
        return this.employees.filter(emp => emp.scheduleId === scheduleId).length;
    }

    getEmployeeScheduleAssignment(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        return employee?.scheduleId ? {
            scheduleId: employee.scheduleId,
            assignedDate: employee.scheduleAssignedDate || new Date().toISOString()
        } : null;
    }

    getEmployeeDepartment(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        return employee?.department || 'Не вказано';
    }

    getMonthName(monthIndex) {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        return months[monthIndex];
    }

    // Дії з графіками
    async showScheduleModal(schedule = null) {
        this.selectedSchedule = schedule;
        const modal = document.getElementById('scheduleModal');
        const title = document.getElementById('scheduleModalTitle');
        const content = document.getElementById('scheduleFormContent');
        
        title.innerHTML = schedule ? 
            '<i class="fas fa-calendar-edit"></i> Редагувати графік роботи' : 
            '<i class="fas fa-calendar-plus"></i> Створити графік роботи';

        content.innerHTML = this.renderScheduleForm();
        this.setupFormTabs();
        this.bindScheduleFormEvents();

        hrSystem.showModal(modal);
    }

    hideScheduleModal() {
        const modal = document.getElementById('scheduleModal');
        hrSystem.closeModal(modal);
        this.selectedSchedule = null;
    }

    async saveSchedule() {
        const form = document.getElementById('scheduleForm');
        const formData = new FormData(form);
        
        try {
            const scheduleData = this.processScheduleFormData(formData);
            
            if (this.selectedSchedule) {
                scheduleData.id = this.selectedSchedule.id;
                scheduleData.updatedAt = new Date().toISOString();
                await this.database.update('schedules', scheduleData);
                hrSystem.showNotification('Графік оновлено', 'success');
            } else {
                scheduleData.createdAt = new Date().toISOString();
                await this.database.add('schedules', scheduleData);
                hrSystem.showNotification('Графік створено', 'success');
            }

            await this.loadData();
            this.updateSchedulesView();
            this.hideScheduleModal();

        } catch (error) {
            console.error('Помилка збереження графіка:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    processScheduleFormData(formData) {
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            status: formData.get('status') || 'draft',
            description: formData.get('description'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            hoursPerDay: parseFloat(formData.get('hoursPerDay')) || 8,
            hoursPerWeek: parseFloat(formData.get('hoursPerWeek')) || 40,
            flexibilityMinutes: parseInt(formData.get('flexibilityMinutes')) || 0,
            timezone: formData.get('timezone') || 'Europe/Kiev',
            lunchBreakMinutes: parseInt(formData.get('lunchBreakMinutes')) || 60,
            lunchBreakStart: formData.get('lunchBreakStart'),
            shortBreaksCount: parseInt(formData.get('shortBreaksCount')) || 2,
            shortBreakMinutes: parseInt(formData.get('shortBreakMinutes')) || 15,
            autoBreaks: formData.get('autoBreaks') === 'on',
            workingDays: formData.getAll('workingDays'),
            shifts: this.extractShiftsData(formData)
        };
        
        return data;
    }

    extractShiftsData(formData) {
        const shifts = [];
        const formEntries = [...formData.entries()];
        
        formEntries.forEach(([key, value]) => {
            const match = key.match(/shifts\[(\d+)\]\[(\w+)\]/);
            if (match) {
                const index = parseInt(match[1]);
                const field = match[2];
                
                if (!shifts[index]) {
                    shifts[index] = {};
                }
                shifts[index][field] = value;
            }
        });
        
        return shifts.filter(shift => shift && shift.name);
    }

    async editSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (schedule) {
            await this.showScheduleModal(schedule);
        }
    }

    async duplicateSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (schedule) {
            const duplicatedSchedule = {
                ...schedule,
                name: schedule.name + ' (копія)',
                status: 'draft'
            };
            delete duplicatedSchedule.id;
            delete duplicatedSchedule.createdAt;
            delete duplicatedSchedule.updatedAt;
            
            await this.showScheduleModal(duplicatedSchedule);
        }
    }

    async toggleScheduleStatus(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (schedule) {
            const newStatus = schedule.status === 'active' ? 'inactive' : 'active';
            try {
                await this.database.update('schedules', {
                    ...schedule,
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                });
                
                await this.loadData();
                this.updateSchedulesView();
                hrSystem.showNotification(`Статус графіка змінено на "${this.getStatusText(newStatus)}"`, 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка зміни статусу: ' + error.message, 'error');
            }
        }
    }

    async deleteSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (!schedule) return;

        if (confirm(`Ви впевнені, що хочете видалити графік "${schedule.name}"?`)) {
            try {
                await this.database.delete('schedules', id);
                await this.loadData();
                this.updateSchedulesView();
                hrSystem.showNotification('Графік видалено', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    filterSchedules() {
        this.updateSchedulesView();
    }

    updateSchedulesView() {
        const container = document.getElementById('schedulesContainer');
        if (container) {
            container.innerHTML = this.renderSchedulesView();
        }
    }

    setupFormTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const tabId = btn.dataset.tab + 'Tab';
                document.getElementById(tabId)?.classList.add('active');
            });
        });
    }

    bindScheduleFormEvents() {
        // Додавання зміни
        document.getElementById('addShiftBtn')?.addEventListener('click', () => {
            this.addShift();
        });
    }

    addShift() {
        const container = document.getElementById('shiftsContainer');
        const currentShifts = container.querySelectorAll('.shift-item').length;
        
        const newShiftHtml = `
            <div class="shift-item" data-index="${currentShifts}">
                <div class="shift-header">
                    <h5>Зміна ${currentShifts + 1}: Нова зміна</h5>
                    <button type="button" class="btn-icon danger" onclick="schedulesModule.removeShift(${currentShifts})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="shift-details">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Назва зміни</label>
                            <input type="text" name="shifts[${currentShifts}][name]" value="Зміна ${currentShifts + 1}" required>
                        </div>
                        <div class="form-group">
                            <label>Початок</label>
                            <input type="time" name="shifts[${currentShifts}][startTime]" value="09:00" required>
                        </div>
                        <div class="form-group">
                            <label>Кінець</label>
                            <input type="time" name="shifts[${currentShifts}][endTime]" value="18:00" required>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', newShiftHtml);
    }

    removeShift(index) {
        const shiftElement = document.querySelector(`[data-index="${index}"]`);
        if (shiftElement) {
            shiftElement.remove();
        }
    }

    showTemplatesModal() {
        const modal = document.getElementById('templatesModal');
        const content = document.getElementById('templatesContent');
        content.innerHTML = this.renderTemplatesContent();
        hrSystem.showModal(modal);
    }

    hideTemplatesModal() {
        const modal = document.getElementById('templatesModal');
        hrSystem.closeModal(modal);
    }

    renderTemplatesContent() {
        return `
            <div class="templates-list">
                ${this.scheduleTemplates.map(template => `
                    <div class="template-item">
                        <div class="template-info">
                            <h4>${template.name}</h4>
                            <p>${template.description}</p>
                            <small>Тип: ${this.getScheduleTypeText(template.type)}</small>
                        </div>
                        <div class="template-actions">
                            <button class="btn btn-sm btn-primary" onclick="schedulesModule.useTemplate(${template.id})">
                                Використати
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="schedulesModule.deleteTemplate(${template.id})">
                                Видалити
                            </button>
                        </div>
                    </div>
                `).join('')}
                
                ${this.scheduleTemplates.length === 0 ? `
                    <div class="empty-templates">
                        <p>Немає збережених шаблонів</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    showAssignmentModal() {
        const modal = document.getElementById('assignmentModal');
        const content = document.getElementById('assignmentContent');
        content.innerHTML = this.renderAssignmentContent();
        hrSystem.showModal(modal);
    }

    hideAssignmentModal() {
        const modal = document.getElementById('assignmentModal');
        hrSystem.closeModal(modal);
    }

    renderAssignmentContent() {
        return `
            <div class="assignment-form">
                <div class="bulk-assignment">
                    <h4>Масове призначення</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Виберіть графік</label>
                            <select id="bulkScheduleSelect">
                                <option value="">Виберіть графік</option>
                                ${this.schedules.filter(s => s.status === 'active').map(schedule => 
                                    `<option value="${schedule.id}">${schedule.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Підрозділ</label>
                            <select id="bulkDepartmentSelect">
                                <option value="">Всі підрозділи</option>
                                ${this.getDepartments().map(dept => 
                                    `<option value="${dept.id}">${dept.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="button" class="btn btn-primary" id="bulkAssignBtn">
                                Призначити всім
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="individual-assignments">
                    <h4>Індивідуальні призначення</h4>
                    <div class="assignments-table">
                        ${this.renderIndividualAssignments()}
                    </div>
                </div>
            </div>
        `;
    }

    renderIndividualAssignments() {
        return `
            <table class="individual-table">
                <thead>
                    <tr>
                        <th>Співробітник</th>
                        <th>Поточний графік</th>
                        <th>Новий графік</th>
                        <th>Дата початку</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.employees.map(emp => `
                        <tr>
                            <td>${emp.fullName}</td>
                            <td>${this.getCurrentScheduleName(emp.scheduleId)}</td>
                            <td>
                                <select class="employee-schedule-select" data-employee-id="${emp.id}">
                                    <option value="">Не змінювати</option>
                                    ${this.schedules.filter(s => s.status === 'active').map(schedule => 
                                        `<option value="${schedule.id}">${schedule.name}</option>`
                                    ).join('')}
                                </select>
                            </td>
                            <td>
                                <input type="date" class="assignment-date" data-employee-id="${emp.id}" 
                                       value="${new Date().toISOString().split('T')[0]}">
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    getDepartments() {
        // Отримати унікальні підрозділи з співробітників
        const departments = [...new Set(this.employees.map(emp => emp.department).filter(Boolean))];
        return departments.map((name, index) => ({ id: index + 1, name }));
    }

    getCurrentScheduleName(scheduleId) {
        if (!scheduleId) return 'Не призначено';
        const schedule = this.schedules.find(s => s.id === scheduleId);
        return schedule ? schedule.name : 'Невідомий графік';
    }

    async initializeDefaultTemplates() {
        if (this.scheduleTemplates.length === 0) {
            const defaultTemplates = [
                {
                    name: 'Стандартний 5/2',
                    description: 'П\'ятиденний робочий тиждень з 9:00 до 18:00',
                    type: 'fixed',
                    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                    startTime: '09:00',
                    endTime: '18:00',
                    hoursPerDay: 8,
                    hoursPerWeek: 40,
                    lunchBreakMinutes: 60,
                    lunchBreakStart: '12:00'
                },
                {
                    name: 'Змінний 2/2',
                    description: 'Змінний графік два дні через два',
                    type: 'shift',
                    shifts: [
                        { name: 'Денна зміна', startTime: '08:00', endTime: '20:00' },
                        { name: 'Нічна зміна', startTime: '20:00', endTime: '08:00' }
                    ],
                    hoursPerDay: 12,
                    hoursPerWeek: 42
                },
                {
                    name: 'Гнучкий графік',
                    description: 'Гнучкий початок роботи з 8:00 до 10:00',
                    type: 'flexible',
                    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                    startTime: '09:00',
                    endTime: '18:00',
                    flexibilityMinutes: 120,
                    hoursPerDay: 8,
                    hoursPerWeek: 40
                }
            ];

            for (const template of defaultTemplates) {
                template.createdAt = new Date().toISOString();
                await this.database.add('scheduleTemplates', template);
            }
            
            await this.loadData();
        }
    }

    hideModal(modal) {
        hrSystem.closeModal(modal);
    }

    // Додаткові методи для призначення та шаблонів
    getCurrentScheduleName(scheduleId) {
        if (!scheduleId) return 'Не призначено';
        const schedule = this.schedules.find(s => s.id === scheduleId);
        return schedule ? schedule.name : 'Невідомий графік';
    }

    async useTemplate(templateId) {
        const template = this.scheduleTemplates.find(t => t.id === templateId);
        if (template) {
            const scheduleData = {
                ...template,
                name: template.name + ' (з шаблону)',
                status: 'draft'
            };
            delete scheduleData.id;
            delete scheduleData.createdAt;
            delete scheduleData.updatedAt;
            delete scheduleData.isDefault;
            
            await this.showScheduleModal(scheduleData);
            this.hideTemplatesModal();
        }
    }

    async deleteTemplate(templateId) {
        const template = this.scheduleTemplates.find(t => t.id === templateId);
        if (!template) return;

        if (confirm(`Ви впевнені, що хочете видалити шаблон "${template.name}"?`)) {
            try {
                await this.database.delete('scheduleTemplates', templateId);
                await this.loadData();
                this.showTemplatesModal(); // Оновити модальне вікно
                hrSystem.showNotification('Шаблон видалено', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка видалення шаблону: ' + error.message, 'error');
            }
        }
    }

    async assignScheduleToEmployee(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) return;

        const scheduleOptions = this.schedules.filter(s => s.status === 'active')
            .map(s => `<option value="${s.id}">${s.name}</option>`)
            .join('');

        const scheduleId = prompt(`Оберіть графік для ${employee.fullName}:\n\n${scheduleOptions}`);
        if (scheduleId) {
            try {
                await this.database.update('employees', {
                    ...employee,
                    scheduleId: parseInt(scheduleId),
                    scheduleAssignedDate: new Date().toISOString()
                });
                
                await this.loadData();
                this.updateSchedulesView();
                hrSystem.showNotification('Графік призначено', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка призначення: ' + error.message, 'error');
            }
        }
    }

    async removeScheduleFromEmployee(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) return;

        if (confirm(`Скасувати призначення графіка для ${employee.fullName}?`)) {
            try {
                await this.database.update('employees', {
                    ...employee,
                    scheduleId: null,
                    scheduleAssignedDate: null
                });
                
                await this.loadData();
                this.updateSchedulesView();
                hrSystem.showNotification('Призначення скасовано', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка скасування: ' + error.message, 'error');
            }
        }
    }

    async saveAssignments() {
        try {
            const assignments = [];
            const selects = document.querySelectorAll('.employee-schedule-select');
            
            for (const select of selects) {
                const employeeId = parseInt(select.dataset.employeeId);
                const scheduleId = select.value ? parseInt(select.value) : null;
                const dateInput = document.querySelector(`[data-employee-id="${employeeId}"].assignment-date`);
                const assignmentDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
                
                if (scheduleId) {
                    assignments.push({
                        employeeId,
                        scheduleId,
                        assignmentDate: new Date(assignmentDate).toISOString()
                    });
                }
            }

            // Оновити призначення для кожного співробітника
            for (const assignment of assignments) {
                const employee = this.employees.find(e => e.id === assignment.employeeId);
                if (employee) {
                    await this.database.update('employees', {
                        ...employee,
                        scheduleId: assignment.scheduleId,
                        scheduleAssignedDate: assignment.assignmentDate
                    });
                }
            }

            await this.loadData();
            this.updateSchedulesView();
            this.hideAssignmentModal();
            hrSystem.showNotification(`Призначено графіки для ${assignments.length} співробітників`, 'success');

        } catch (error) {
            hrSystem.showNotification('Помилка збереження призначень: ' + error.message, 'error');
        }
    }

    async createTemplateFromSchedule() {
        if (!this.selectedSchedule) {
            hrSystem.showNotification('Спочатку створіть або відредагуйте графік', 'warning');
            return;
        }

        const templateName = prompt('Введіть назву шаблону:', this.selectedSchedule.name + ' (шаблон)');
        if (!templateName) return;

        try {
            const templateData = {
                ...this.selectedSchedule,
                name: templateName,
                description: this.selectedSchedule.description || 'Створено з графіка',
                isDefault: false
            };
            
            delete templateData.id;
            delete templateData.createdAt;
            delete templateData.updatedAt;
            delete templateData.createdBy;
            
            templateData.createdAt = new Date().toISOString();
            
            await this.database.add('scheduleTemplates', templateData);
            await this.loadData();
            
            hrSystem.showNotification('Шаблон створено', 'success');
            this.showTemplatesModal();
            
        } catch (error) {
            hrSystem.showNotification('Помилка створення шаблону: ' + error.message, 'error');
        }
    }

    renderCalendarGrid() {
        // Реалізація календарної сітки буде додана пізніше
        return `
            <div class="calendar-placeholder">
                <p>Календарний вигляд буде реалізовано в наступній версії</p>
            </div>
        `;
    }
}

// Глобальна змінна schedulesModule оголошена в hr-system.js
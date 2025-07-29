/**
 * Timesheet Module - Модуль табелю робочого часу
 * Інтеграція з існуючим табелем
 */

class TimesheetModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.employees = [];
        this.departments = [];
        this.positions = [];
        this.timesheetData = [];
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.workCodes = {
            'Р': { name: 'Робочий день', type: 'work', hours: 8 },
            'ВЧ': { name: 'Вихідний час', type: 'work', hours: 8 },
            'РН': { name: 'Робота в нічний час', type: 'work', hours: 8 },
            'НУ': { name: 'Неявка поважна', type: 'absence', hours: 0 },
            'РВ': { name: 'Робота у вихідний', type: 'work', hours: 8 },
            'Ч': { name: 'Чергування', type: 'work', hours: 24 },
            'ТН': { name: 'Тимчасова непрацездатність', type: 'sick', hours: 0 },
            'ІН': { name: 'Інша непрацездатність', type: 'sick', hours: 0 },
            'ВБ': { name: 'Відпустка без збереження зарплати', type: 'vacation', hours: 0 },
            'В': { name: 'Відпустка', type: 'vacation', hours: 0 },
            'ВК': { name: 'Відрядження', type: 'business_trip', hours: 8 }
        };
    }

    async render() {
        await this.loadData();

        return `
            <div class="timesheet-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-calendar-alt"></i> Табель робочого часу</h1>
                        <p>Облік відпрацьованого часу співробітників</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="timesheet1CBtn">
                            <i class="fas fa-table"></i> Табель 1С формат
                        </button>
                        <button class="btn btn-secondary" id="originalTimesheetBtn">
                            <i class="fas fa-external-link-alt"></i> Звичайний табель
                        </button>
                        <button class="btn btn-info" id="generateTimesheetBtn">
                            <i class="fas fa-plus"></i> Створити табель
                        </button>
                        <button class="btn btn-success" id="exportTimesheetBtn">
                            <i class="fas fa-download"></i> Експорт Excel
                        </button>
                    </div>
                </div>

                <!-- Період та фільтри -->
                <div class="controls-panel">
                    <div class="period-controls">
                        <div class="form-group">
                            <label>Рік:</label>
                            <select id="yearSelect" class="form-control">
                                ${this.generateYearOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Місяць:</label>
                            <select id="monthSelect" class="form-control">
                                ${this.generateMonthOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Підрозділ:</label>
                            <select id="departmentFilter" class="form-control">
                                <option value="all">Всі підрозділи</option>
                                ${this.departments.map(dept => 
                                    `<option value="${dept.id}">${dept.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <button class="btn btn-secondary" id="loadTimesheetBtn">
                            <i class="fas fa-search"></i> Завантажити
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.employees.length}</span>
                        <span class="stat-label">Співробітників</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.calculateTotalWorkDays()}</span>
                        <span class="stat-label">Робочих днів</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.calculateTotalHours()}</span>
                        <span class="stat-label">Загально годин</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getDaysInMonth()}</span>
                        <span class="stat-label">Днів у місяці</span>
                    </div>
                </div>

                <!-- Легенда кодів -->
                <div class="legend-panel">
                    <h3><i class="fas fa-info-circle"></i> Умовні позначення</h3>
                    <div class="legend-grid">
                        ${Object.entries(this.workCodes).map(([code, info]) => `
                            <div class="legend-item ${info.type}">
                                <span class="legend-code">${code}</span>
                                <span class="legend-name">${info.name}</span>
                                <span class="legend-hours">${info.hours}г</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Табель -->
                <div class="timesheet-content">
                    <div id="timesheetContainer" class="timesheet-container">
                        ${this.renderTimesheet()}
                    </div>
                </div>

                <!-- Модальне вікно створення табеля -->
                <div id="generateTimesheetModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2><i class="fas fa-calendar-plus"></i> Створити табель</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Рік *</label>
                                    <select name="year" required>
                                        ${this.generateYearOptions()}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Місяць *</label>
                                    <select name="month" required>
                                        ${this.generateMonthOptions()}
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Підрозділ</label>
                                <select name="department">
                                    <option value="all">Всі підрозділи</option>
                                    ${this.departments.map(dept => 
                                        `<option value="${dept.id}">${dept.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="includeInactive"> 
                                    Включити неактивних співробітників
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="confirmGenerateBtn">Створити</button>
                            <button class="btn btn-secondary" id="cancelGenerateBtn">Скасувати</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        this.bindEvents();
        await this.loadTimesheetData();
    }

    async loadData() {
        try {
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.positions = await this.database.getAll('positions');
            this.businessTrips = await this.database.getAll('businessTrips');
            this.vacations = await this.database.getAll('vacations');
        } catch (error) {
            console.error('Помилка завантаження даних табелю:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Відкриття табеля у форматі 1С
        document.getElementById('timesheet1CBtn')?.addEventListener('click', () => {
            window.open('timesheet-1c-format.html', '_blank');
        });
        
        // Відкриття оригінального табеля
        document.getElementById('originalTimesheetBtn')?.addEventListener('click', () => {
            window.open('timesheet-original.html', '_blank');
        });

        // Створення нового табеля
        document.getElementById('generateTimesheetBtn')?.addEventListener('click', () => {
            this.showGenerateModal();
        });

        // Завантаження табеля за період
        document.getElementById('loadTimesheetBtn')?.addEventListener('click', () => {
            this.loadTimesheetForPeriod();
        });

        // Експорт
        document.getElementById('exportTimesheetBtn')?.addEventListener('click', () => {
            this.exportTimesheet();
        });

        // Зміна періоду
        document.getElementById('yearSelect')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
        });

        document.getElementById('monthSelect')?.addEventListener('change', (e) => {
            this.currentMonth = parseInt(e.target.value);
        });

        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Підтвердження створення
        document.getElementById('confirmGenerateBtn')?.addEventListener('click', () => {
            this.generateTimesheet();
        });

        // Скасування
        document.getElementById('cancelGenerateBtn')?.addEventListener('click', () => {
            this.hideGenerateModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                hrSystem.closeModal(modal);
            });
        });
    }

    renderTimesheet() {
        if (this.employees.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Вибір формату табеля</h3>
                    <p>Оберіть потрібний формат табеля робочого часу</p>
                    
                    <div class="timesheet-formats">
                        <div class="format-card primary">
                            <div class="format-icon">
                                <i class="fas fa-table"></i>
                            </div>
                            <h4>Формат 1С</h4>
                            <p>Стандартний табель у форматі 1С з українськими кодами відсутності</p>
                            <ul class="format-features">
                                <li><i class="fas fa-check"></i> Українські коди відсутності</li>
                                <li><i class="fas fa-check"></i> Автоматичний розрахунок</li>
                                <li><i class="fas fa-check"></i> Експорт в Excel</li>
                                <li><i class="fas fa-check"></i> Друк документа</li>
                            </ul>
                            <button class="btn btn-primary btn-large" onclick="document.getElementById('timesheet1CBtn').click()">
                                <i class="fas fa-arrow-right"></i> Відкрити табель 1С
                            </button>
                        </div>
                        
                        <div class="format-card secondary">
                            <div class="format-icon">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <h4>Звичайний формат</h4>
                            <p>Базовий табель з простим інтерфейсом</p>
                            <ul class="format-features">
                                <li><i class="fas fa-check"></i> Простий інтерфейс</li>
                                <li><i class="fas fa-check"></i> Швидке заповнення</li>
                                <li><i class="fas fa-check"></i> Експорт в Excel</li>
                            </ul>
                            <button class="btn btn-secondary btn-large" onclick="document.getElementById('originalTimesheetBtn').click()">
                                <i class="fas fa-arrow-right"></i> Відкрити звичайний табель
                            </button>
                        </div>
                    </div>
                    
                    <div class="or-divider">
                        <span>або</span>
                    </div>
                    
                    <button class="btn btn-info btn-large" onclick="document.getElementById('generateTimesheetBtn').click()">
                        <i class="fas fa-plus"></i> Створити новий табель в системі
                    </button>
                </div>
            `;
        }

        const daysInMonth = this.getDaysInMonth();
        const filteredEmployees = this.getFilteredEmployees();

        return `
            <div class="timesheet-table-wrapper">
                <table class="timesheet-table">
                    <thead>
                        <tr>
                            <th rowspan="2" class="employee-column">ПІБ</th>
                            <th rowspan="2" class="position-column">Посада</th>
                            <th rowspan="2" class="personnel-column">Таб. №</th>
                            <th colspan="${daysInMonth}" class="days-header">Дні місяця</th>
                            <th rowspan="2" class="total-column">Разом</th>
                        </tr>  
                        <tr class="days-row">
                            ${this.generateDaysHeader()}
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredEmployees.map(emp => this.renderEmployeeRows(emp)).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="summary-codes-row">
                            <td colspan="3" rowspan="2" class="summary-label">
                                <strong>Підсумок по підрозділу:</strong>
                                <div class="summary-stats">
                                    <div>Всього робочих днів: ${this.calculateTotalWorkDays()}</div>
                                    <div>Всього годин: ${this.calculateTotalHours()}</div>
                                </div>
                            </td>
                            ${this.generateSummaryRow('codes')}
                            <td class="total-cell" rowspan="2">
                                <div class="total-days"><strong>${this.calculateTotalWorkDays()} днів</strong></div>
                                <div class="total-hours"><strong>${this.calculateTotalHours()} год</strong></div>
                            </td>
                        </tr>
                        <tr class="summary-hours-row">
                            ${this.generateSummaryRow('hours')}
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    renderEmployeeRows(employee) {
        const position = this.positions.find(p => p.id === employee.positionId);
        const daysInMonth = this.getDaysInMonth();
        const employeeData = this.getEmployeeTimesheetData(employee.id);

        return `
            <tr class="employee-work-row" data-employee-id="${employee.id}">
                <td class="employee-name-cell" rowspan="2">
                    <div class="employee-name">${employee.fullName}</div>
                    <div class="employee-department">${this.getEmployeeDepartment(employee)}</div>
                </td>
                <td class="employee-position-cell" rowspan="2">
                    <div class="position-title">${position?.title || '-'}</div>
                </td>
                <td class="employee-personnel-cell" rowspan="2">
                    <div class="personnel-number">${employee.personnelNumber}</div>
                </td>
                ${this.generateEmployeeDays(employee.id, 'code')}
                <td class="total-cell" rowspan="2">
                    <div class="total-days">${this.calculateEmployeeDays(employee.id)} днів</div>
                    <div class="total-hours">${this.calculateEmployeeHours(employee.id)} год</div>
                </td>
            </tr>
            <tr class="employee-hours-row" data-employee-id="${employee.id}">
                ${this.generateEmployeeDays(employee.id, 'hours')}
            </tr>
        `;
    }

    generateDaysHeader() {
        const daysInMonth = this.getDaysInMonth();
        let header = '';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            header += `<th class="day-header ${isWeekend ? 'weekend' : ''}">${day}</th>`;
        }
        
        return header;
    }

    generateEmployeeDays(employeeId, type) {
        const daysInMonth = this.getDaysInMonth();
        const employeeData = this.getEmployeeTimesheetData(employeeId);
        let days = '';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayData = employeeData[day] || { code: '', hours: 0 };
            const date = new Date(this.currentYear, this.currentMonth - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            if (type === 'code') {
                days += `<td class="day-cell ${isWeekend ? 'weekend' : ''}" onclick="timesheetModule.editDay(${employeeId}, ${day})">
                    <span class="work-code ${dayData.code ? this.workCodes[dayData.code]?.type || '' : ''}">${dayData.code}</span>
                </td>`;
            } else {
                days += `<td class="hours-cell ${isWeekend ? 'weekend' : ''}">
                    <span class="work-hours">${dayData.hours || ''}</span>
                </td>`;
            }
        }
        
        return days;
    }

    generateSummaryRow(type = 'codes') {
        const daysInMonth = this.getDaysInMonth();
        let summary = '';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            if (type === 'codes') {
                const dayTotal = this.calculateDayTotal(day);
                summary += `<td class="summary-cell ${isWeekend ? 'weekend' : ''}">${dayTotal}</td>`;
            } else {
                const dayHours = this.calculateDayHours(day);
                summary += `<td class="summary-hours-cell ${isWeekend ? 'weekend' : ''}">${dayHours}</td>`;
            }
        }
        
        return summary;
    }

    getEmployeeDepartment(employee) {
        const department = this.departments.find(d => d.id === employee.departmentId);
        return department ? department.name : 'Не вказано';
    }

    calculateEmployeeDays(employeeId) {
        const employeeData = this.getEmployeeTimesheetData(employeeId);
        let workDays = 0;
        
        for (let day = 1; day <= this.getDaysInMonth(); day++) {
            const dayData = employeeData[day];
            if (dayData && dayData.code && this.workCodes[dayData.code]?.type === 'work') {
                workDays++;
            }
        }
        
        return workDays;
    }

    calculateDayHours(day) {
        const filteredEmployees = this.getFilteredEmployees();
        let totalHours = 0;
        
        filteredEmployees.forEach(emp => {
            const employeeData = this.getEmployeeTimesheetData(emp.id);
            const dayData = employeeData[day];
            if (dayData && dayData.hours) {
                totalHours += parseFloat(dayData.hours) || 0;
            }
        });
        
        return totalHours || '';
    }

    generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        
        for (let year = currentYear - 2; year <= currentYear + 1; year++) {
            const selected = year === this.currentYear ? 'selected' : '';
            options += `<option value="${year}" ${selected}>${year}</option>`;
        }
        
        return options;
    }

    generateMonthOptions() {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        
        return months.map((month, index) => {
            const value = index + 1;
            const selected = value === this.currentMonth ? 'selected' : '';
            return `<option value="${value}" ${selected}>${month}</option>`;
        }).join('');
    }

    // Допоміжні методи
    getDaysInMonth() {
        return new Date(this.currentYear, this.currentMonth, 0).getDate();
    }

    getFilteredEmployees() {
        const departmentFilter = document.getElementById('departmentFilter')?.value;
        let filtered = this.employees.filter(emp => emp.status === 'active');
        
        if (departmentFilter && departmentFilter !== 'all') {
            filtered = filtered.filter(emp => emp.departmentId == departmentFilter);
        }
        
        return filtered;
    }

    async loadTimesheetData() {
        try {
            const monthKey = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
            this.timesheetData = await this.database.getAll('timesheet') || [];
            this.timesheetData = this.timesheetData.filter(record => record.monthYear === monthKey);
        } catch (error) {
            console.error('Помилка завантаження табеля:', error);
            this.timesheetData = [];
        }
    }

    getEmployeeTimesheetData(employeeId) {
        const monthKey = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
        const employeeRecord = this.timesheetData.find(record => 
            record.employeeId === employeeId && record.monthYear === monthKey
        );
        
        return employeeRecord?.days || {};
    }

    calculateEmployeeTotal(employeeId) {
        const employeeData = this.getEmployeeTimesheetData(employeeId);
        let total = 0;
        
        Object.values(employeeData).forEach(day => {
            if (day.code && this.workCodes[day.code]?.type === 'work') {
                total += 1;
            }
        });
        
        return total;
    }

    calculateEmployeeHours(employeeId) {
        const employeeData = this.getEmployeeTimesheetData(employeeId);
        let hours = 0;
        
        Object.values(employeeData).forEach(day => {
            hours += day.hours || 0;
        });
        
        return hours;
    }

    calculateTotalWorkDays() {
        const filteredEmployees = this.getFilteredEmployees();
        let total = 0;
        
        filteredEmployees.forEach(emp => {
            total += this.calculateEmployeeTotal(emp.id);
        });
        
        return total;
    }

    calculateTotalHours() {
        const filteredEmployees = this.getFilteredEmployees();
        let total = 0;
        
        filteredEmployees.forEach(emp => {
            total += this.calculateEmployeeHours(emp.id);
        });
        
        return total;
    }

    calculateDayTotal(day) {
        const filteredEmployees = this.getFilteredEmployees();
        let total = 0;
        
        filteredEmployees.forEach(emp => {
            const employeeData = this.getEmployeeTimesheetData(emp.id);
            const dayData = employeeData[day];
            if (dayData?.hours) {
                total += dayData.hours;
            }
        });
        
        return total;
    }

    // Дії
    async loadTimesheetForPeriod() {
        this.currentYear = parseInt(document.getElementById('yearSelect').value);
        this.currentMonth = parseInt(document.getElementById('monthSelect').value);
        
        await this.loadTimesheetData();
        this.updateTimesheetView();
        
        hrSystem.showNotification(`Завантажено табель за ${this.getMonthName()} ${this.currentYear}`, 'info');
    }

    showGenerateModal() {
        const modal = document.getElementById('generateTimesheetModal');
        hrSystem.showModal(modal);
    }

    hideGenerateModal() {
        const modal = document.getElementById('generateTimesheetModal');
        hrSystem.closeModal(modal);
    }

    async generateTimesheet() {
        const modal = document.getElementById('generateTimesheetModal');
        const formData = new FormData(modal.querySelector('form') || modal);
        
        const year = parseInt(document.querySelector('[name="year"]').value);
        const month = parseInt(document.querySelector('[name="month"]').value);
        const department = document.querySelector('[name="department"]').value;
        const includeInactive = document.querySelector('[name="includeInactive"]').checked;
        
        try {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            
            // Отримуємо співробітників для табеля
            let employees = this.employees;
            if (department && department !== 'all') {
                employees = employees.filter(emp => emp.departmentId == department);
            }
            if (!includeInactive) {
                employees = employees.filter(emp => emp.status === 'active');
            }
            
            // Створюємо записи табеля для кожного співробітника
            for (const employee of employees) {
                const existingRecord = await this.database.getAll('timesheet')
                    .then(records => records.find(r => 
                        r.employeeId === employee.id && r.monthYear === monthKey
                    ));
                
                if (!existingRecord) {
                    const timesheetRecord = {
                        employeeId: employee.id,
                        monthYear: monthKey,
                        days: this.generateDefaultDays(year, month, employee.id),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    await this.database.add('timesheet', timesheetRecord);
                }
            }
            
            // Оновлюємо поточні параметри і перезавантажуємо
            this.currentYear = year;
            this.currentMonth = month;
            document.getElementById('yearSelect').value = year;
            document.getElementById('monthSelect').value = month;
            
            await this.loadTimesheetData();
            this.updateTimesheetView();
            this.hideGenerateModal();
            
            hrSystem.showNotification(`Табель на ${this.getMonthName()} ${year} створено для ${employees.length} співробітників`, 'success');
            
        } catch (error) {
            console.error('Помилка створення табеля:', error);
            hrSystem.showNotification('Помилка створення табеля: ' + error.message, 'error');
        }
    }

    generateDefaultDays(year, month, employeeId = null) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = {};
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            days[day] = {
                code: isWeekend ? '' : 'Р',
                hours: isWeekend ? 0 : 8
            };
        }
        
        // Автоматично заповнюємо відрядження, відпустки
        if (employeeId && (this.businessTrips || this.vacations)) {
            this.applyBusinessTripsToTimesheet(days, year, month, employeeId);
            this.applyVacationsToTimesheet(days, year, month, employeeId);
        }
        
        return days;
    }

    /**
     * Застосовує відрядження до табеля
     */
    applyBusinessTripsToTimesheet(days, year, month, employeeId) {
        if (!this.businessTrips) return;
        
        const monthTrips = this.businessTrips.filter(trip => {
            if (trip.employeeId !== employeeId) return false;
            if (trip.status !== 'approved' && trip.status !== 'in_progress' && trip.status !== 'completed') return false;
            
            const startDate = new Date(trip.startDate);
            const endDate = new Date(trip.endDate);
            
            // Перевіряємо чи відрядження перетинається з поточним місяцем
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);
            
            return startDate <= monthEnd && endDate >= monthStart;
        });
        
        monthTrips.forEach(trip => {
            const startDate = new Date(trip.startDate);
            const endDate = new Date(trip.endDate);
            
            // Визначаємо діапазон днів у поточному місяці
            const firstDay = Math.max(1, startDate.getMonth() === month - 1 && startDate.getFullYear() === year ? startDate.getDate() : 1);
            const lastDay = Math.min(new Date(year, month, 0).getDate(), 
                endDate.getMonth() === month - 1 && endDate.getFullYear() === year ? endDate.getDate() : new Date(year, month, 0).getDate());
            
            // Позначаємо дні відрядження
            for (let day = firstDay; day <= lastDay; day++) {
                days[day] = {
                    code: 'ВК',
                    hours: 8
                };
            }
        });
    }

    /**
     * Застосовує відпустки до табеля
     */
    applyVacationsToTimesheet(days, year, month, employeeId) {
        if (!this.vacations) return;
        
        const monthVacations = this.vacations.filter(vacation => {
            if (vacation.employeeId !== employeeId) return false;
            if (vacation.status !== 'approved' && vacation.status !== 'active') return false;
            
            const startDate = new Date(vacation.startDate);
            const endDate = new Date(vacation.endDate);
            
            // Перевіряємо чи відпустка перетинається з поточним місяцем
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);
            
            return startDate <= monthEnd && endDate >= monthStart;
        });
        
        monthVacations.forEach(vacation => {
            const startDate = new Date(vacation.startDate);
            const endDate = new Date(vacation.endDate);
            
            // Визначаємо діапазон днів у поточному місяці
            const firstDay = Math.max(1, startDate.getMonth() === month - 1 && startDate.getFullYear() === year ? startDate.getDate() : 1);
            const lastDay = Math.min(new Date(year, month, 0).getDate(), 
                endDate.getMonth() === month - 1 && endDate.getFullYear() === year ? endDate.getDate() : new Date(year, month, 0).getDate());
            
            // Позначаємо дні відпустки (якщо не зайняті відрядженням)
            for (let day = firstDay; day <= lastDay; day++) {
                if (days[day].code !== 'ВК') { // Не перезаписуємо відрядження
                    days[day] = {
                        code: vacation.type === 'unpaid' ? 'ВБ' : 'В',
                        hours: 0
                    };
                }
            }
        });
    }

    updateTimesheetView() {
        const container = document.getElementById('timesheetContainer');
        if (container) {
            container.innerHTML = this.renderTimesheet();
        }
        
        // Оновлюємо статистику
        this.updateStats();
    }

    updateStats() {
        const statsItems = document.querySelectorAll('.stat-item .stat-number');
        if (statsItems.length >= 4) {
            statsItems[0].textContent = this.employees.length;
            statsItems[1].textContent = this.calculateTotalWorkDays();
            statsItems[2].textContent = this.calculateTotalHours();
            statsItems[3].textContent = this.getDaysInMonth();
        }
    }

    async editDay(employeeId, day) {
        const employee = this.employees.find(e => e.id === employeeId);
        const currentData = this.getEmployeeTimesheetData(employeeId)[day] || { code: '', hours: 0 };
        
        // Створюємо модальне вікно для редагування
        const modalHTML = `
            <div class="modal" id="editDayModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> Редагування дня ${day}</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="edit-day-form">
                            <div class="employee-info">
                                <strong>${employee.fullName}</strong> - ${day} ${this.getMonthName(this.currentMonth - 1)} ${this.currentYear}
                            </div>
                            
                            <div class="form-group">
                                <label>Код роботи:</label>
                                <select id="dayCode" class="form-control">
                                    <option value="">Не вказано</option>
                                    ${Object.entries(this.workCodes).map(([code, info]) => 
                                        `<option value="${code}" ${currentData.code === code ? 'selected' : ''}>${code} - ${info.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Кількість годин:</label>
                                <input type="number" id="dayHours" class="form-control" 
                                       value="${currentData.hours || ''}" 
                                       min="0" max="24" step="0.5" 
                                       placeholder="Автоматично за кодом">
                                <small class="form-text">Залиште порожнім для автоматичного розрахунку за кодом</small>
                            </div>
                            
                            <div class="current-values">
                                <h4>Поточні значення:</h4>
                                <div>Код: <span id="currentCode">${currentData.code || 'Не вказано'}</span></div>
                                <div>Години: <span id="currentHours">${currentData.hours || 0}</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="saveDayBtn">Зберегти</button>
                        <button class="btn btn-danger" id="clearDayBtn">Очистити</button>
                        <button class="btn btn-secondary" id="cancelDayBtn">Скасувати</button>
                    </div>
                </div>
            </div>
        `;
        
        // Додаємо модальне вікно
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('editDayModal');
        modal.classList.add('show');
        
        // Обробники подій
        document.getElementById('dayCode').addEventListener('change', (e) => {
            const selectedCode = e.target.value;
            const codeInfo = this.workCodes[selectedCode];
            const hoursInput = document.getElementById('dayHours');
            
            if (codeInfo && hoursInput.value === '') {
                hoursInput.placeholder = `Автоматично: ${codeInfo.hours} годин`;
            }
        });
        
        document.getElementById('saveDayBtn').addEventListener('click', async () => {
            const code = document.getElementById('dayCode').value;
            const hours = parseFloat(document.getElementById('dayHours').value) || 
                         (code && this.workCodes[code] ? this.workCodes[code].hours : 0);
            
            await this.updateDayData(employeeId, day, code, hours);
            this.closeModal(modal);
        });
        
        document.getElementById('clearDayBtn').addEventListener('click', async () => {
            await this.updateDayData(employeeId, day, '', 0);
            this.closeModal(modal);
        });
        
        document.getElementById('cancelDayBtn').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        document.querySelector('#editDayModal .modal-close').addEventListener('click', () => {
            this.closeModal(modal);
        });
    }

    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }

    async updateDayData(employeeId, day, code, hours = null) {
        try {
            const monthKey = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
            
            // Знаходимо запис табеля
            let record = this.timesheetData.find(r => 
                r.employeeId === employeeId && r.monthYear === monthKey
            );
            
            if (!record) {
                // Створюємо новий запис
                record = {
                    employeeId: employeeId,
                    monthYear: monthKey,
                    days: this.generateDefaultDays(this.currentYear, this.currentMonth, employeeId),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                // Додаємо до бази
                const savedRecord = await this.database.add('timesheet', record);
                record.id = savedRecord.id;
                this.timesheetData.push(record);
            }
            
            // Оновлюємо день
            record.days[day] = {
                code: code,
                hours: hours !== null ? hours : (this.workCodes[code]?.hours || 0)
            };
            record.updatedAt = new Date().toISOString();
            
            // Зберігаємо в базі
            await this.database.update('timesheet', record);
            
            // Оновлюємо відображення
            this.updateTimesheetView();
            
            hrSystem.showNotification('День оновлено', 'success');
            
        } catch (error) {
            console.error('Помилка оновлення дня:', error);
            hrSystem.showNotification('Помилка оновлення: ' + error.message, 'error');
        }
    }

    async exportTimesheet() {
        try {
            const filteredEmployees = this.getFilteredEmployees();
            const daysInMonth = this.getDaysInMonth();
            
            // Підготовка даних для експорту
            const exportData = [];
            
            // Заголовки
            const headers = ['ПІБ', 'Посада', 'Таб. №'];
            for (let day = 1; day <= daysInMonth; day++) {
                headers.push(`${day}`);
            }
            headers.push('Разом');
            exportData.push(headers);
            
            // Дані співробітників
            filteredEmployees.forEach(emp => {
                const position = this.positions.find(p => p.id === emp.positionId);
                const employeeData = this.getEmployeeTimesheetData(emp.id);
                
                // Рядок з кодами
                const codeRow = [emp.fullName, position?.title || '-', emp.personnelNumber];
                for (let day = 1; day <= daysInMonth; day++) {
                    codeRow.push(employeeData[day]?.code || '');
                }
                codeRow.push(this.calculateEmployeeTotal(emp.id));
                exportData.push(codeRow);
                
                // Рядок з годинами
                const hoursRow = ['', '', ''];
                for (let day = 1; day <= daysInMonth; day++) {
                    hoursRow.push(employeeData[day]?.hours || '');
                }
                hoursRow.push(this.calculateEmployeeHours(emp.id));
                exportData.push(hoursRow);
            });
            
            // Експорт в JSON (можна розширити до Excel)
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Табель_${this.getMonthName()}_${this.currentYear}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            hrSystem.showNotification('Табель експортовано', 'success');
            
        } catch (error) {
            console.error('Помилка експорту табеля:', error);
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }

    getMonthName(monthIndex = null) {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        const index = monthIndex !== null ? monthIndex : this.currentMonth - 1;
        return months[index];
    }
}

// Глобальна змінна timesheetModule оголошена в hr-system.js
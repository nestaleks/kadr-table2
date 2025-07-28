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
            'В': { name: 'Відпустка', type: 'vacation', hours: 0 }
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
                        <tr class="summary-row">
                            <td colspan="3"><strong>Підсумок по підрозділу:</strong></td>
                            ${this.generateSummaryRow()}
                            <td class="total-cell"><strong>${this.calculateTotalHours()}</strong></td>
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
                <td class="employee-name">${employee.fullName}</td>
                <td class="employee-position">${position?.title || '-'}</td>
                <td class="employee-personnel">${employee.personnelNumber}</td>
                ${this.generateEmployeeDays(employee.id, 'code')}
                <td class="total-cell">${this.calculateEmployeeTotal(employee.id)}</td>
            </tr>
            <tr class="employee-hours-row" data-employee-id="${employee.id}">
                <td colspan="3"></td>
                ${this.generateEmployeeDays(employee.id, 'hours')}
                <td class="hours-total">${this.calculateEmployeeHours(employee.id)}</td>
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

    generateSummaryRow() {
        const daysInMonth = this.getDaysInMonth();
        let summary = '';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayTotal = this.calculateDayTotal(day);
            const date = new Date(this.currentYear, this.currentMonth - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            summary += `<td class="summary-cell ${isWeekend ? 'weekend' : ''}">${dayTotal}</td>`;
        }
        
        return summary;
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
                        days: this.generateDefaultDays(year, month),
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

    generateDefaultDays(year, month) {
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
        
        return days;
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
        // Тут можна додати модальне вікно для редагування дня
        // Поки що просто логуємо
        console.log(`Edit day ${day} for employee ${employeeId}`);
        
        // Простий prompt для демонстрації
        const employee = this.employees.find(e => e.id === employeeId);
        const currentData = this.getEmployeeTimesheetData(employeeId)[day] || { code: '', hours: 0 };
        
        const newCode = prompt(
            `Редагування дня ${day} для ${employee.fullName}\nПоточний код: ${currentData.code}\nВведіть новий код:`,
            currentData.code
        );
        
        if (newCode !== null) {
            await this.updateDayData(employeeId, day, newCode);
        }
    }

    async updateDayData(employeeId, day, code) {
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
                    days: this.generateDefaultDays(this.currentYear, this.currentMonth),
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
                hours: this.workCodes[code]?.hours || 0
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

    getMonthName() {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        return months[this.currentMonth - 1];
    }
}

// Глобальна змінна timesheetModule оголошена в hr-system.js
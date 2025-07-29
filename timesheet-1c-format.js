/**
 * Табель обліку робочого часу - формат 1С
 * Імплементація функціональності для роботи з табелем у форматі 1С
 */

class Timesheet1CFormat {
    constructor() {
        this.database = null;
        this.currentPeriod = {
            month: new Date().getMonth(),
            year: new Date().getFullYear()
        };
        this.employees = [];
        this.departments = [];
        this.currentDepartment = 'all';
        this.timesheetData = new Map(); // employeeId -> day -> {code, hours}
        this.selectedEmployees = new Set();
        
        // Коди робочого часу
        this.workCodes = {
            'Я': 'Явка на роботу',
            'В': 'Відпустка',
            'Л': 'Лікарняний',
            'К': 'Відрядження',
            'Н': 'Неявка невиправдана',
            'П': 'Прогул',
            'Р': 'Вихідний день',
            'С': 'Святковий день',
            'М': 'Відпустка по догляду за дитиною',
            'Д': 'Додаткова відпустка',
            'З': 'Запізнення',
            'О': 'Понаднормовий час'
        };
        
        this.init();
    }
    /**
     * Ініціалізація модуля
     */
    async init() {
        try {
            // Отримуємо доступ до бази даних
            this.database = hrDatabase || await initializeDatabase();
            
            // Завантажуємо дані
            await this.loadData();
            
            // Налаштовуємо обробники подій
            this.bindEvents();
            
            // Встановлюємо поточний період
            this.updatePeriodControls();
            
            console.log('Модуль табеля 1С формату ініціалізовано');
            
        } catch (error) {
            console.error('Помилка ініціалізації модуля табеля 1С:', error);
            this.showNotification('Помилка ініціалізації: ' + error.message, 'error');
        }
    }
    
    /**
     * Налаштування обробників подій
     */
    bindEvents() {
        // Генерація табеля
        document.getElementById('generateTimesheet')?.addEventListener('click', () => {
            this.openGenerateModal();
        });

        // Пошук співробітника
        document.getElementById('addEmployeeBtn')?.addEventListener('click', () => {
            this.openEmployeeSearchModal();
        });

        // Заповнення робочих днів
        document.getElementById('fillWorkingDays')?.addEventListener('click', () => {
            this.fillWorkingDays();
        });

        // Підрахунок підсумків
        document.getElementById('calculateTotals')?.addEventListener('click', () => {
            this.calculateTotals();
        });

        // Експорт в Excel
        document.getElementById('exportExcel')?.addEventListener('click', () => {
            this.exportToExcel();
        });

        // Друк
        document.getElementById('printTimesheet')?.addEventListener('click', () => {
            this.printTimesheet();
        });

        // Модальні вікна
        this.bindModalEvents();

        // Зміна періоду
        document.getElementById('periodMonth')?.addEventListener('change', () => {
            this.updateCurrentPeriod();
        });

        document.getElementById('periodYear')?.addEventListener('change', () => {
            this.updateCurrentPeriod();
        });
    }
    
    /**
     * Завантаження даних з бази
     */
    async loadData() {
        try {
            // Завантажуємо співробітників
            this.employees = await this.database.getAll('employees');
            
            // Завантажуємо підрозділи
            this.departments = await this.database.getAll('departments');
            
            // Завантажуємо табель для поточного періоду
            await this.loadTimesheetData();
            
            // Оновлюємо вкладки підрозділів
            this.updateDepartmentTabs();
            
        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            throw error;
        }
    }

    /**
     * Завантаження даних табеля для поточного періоду
     */
    async loadTimesheetData() {
        const monthYear = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}`;
        const timesheetRecords = await this.database.findByIndex('timesheet', 'monthYear', monthYear);
        
        this.timesheetData.clear();
        
        timesheetRecords.forEach(record => {
            if (!this.timesheetData.has(record.employeeId)) {
                this.timesheetData.set(record.employeeId, new Map());
            }
            
            const employeeData = this.timesheetData.get(record.employeeId);
            employeeData.set(record.date, {
                code: record.workCode || 'Я',
                hours: record.hoursWorked || 0
            });
        });
    }
    
    /**
     * Налаштування подій модальних вікон
     */
    bindModalEvents() {
        // Модальне вікно пошуку співробітника
        document.getElementById('closeSearchModal')?.addEventListener('click', () => {
            this.closeModal('employeeSearchModal');
        });

        document.getElementById('cancelSearch')?.addEventListener('click', () => {
            this.closeModal('employeeSearchModal');
        });

        document.getElementById('searchEmployeeBtn')?.addEventListener('click', () => {
            this.searchEmployees();
        });

        document.getElementById('employeeSearchInput')?.addEventListener('input', (e) => {
            if (e.target.value.length >= 2) {
                this.searchEmployees();
            }
        });

        document.getElementById('addSelectedEmployees')?.addEventListener('click', () => {
            this.addSelectedEmployeesToTimesheet();
        });

        // Модальне вікно генерації табеля
        document.getElementById('closeGenerateModal')?.addEventListener('click', () => {
            this.closeModal('generateTimesheetModal');
        });

        document.getElementById('cancelGenerate')?.addEventListener('click', () => {
            this.closeModal('generateTimesheetModal');
        });

        document.getElementById('confirmGenerate')?.addEventListener('click', () => {
            this.generateTimesheet();
        });

        // Фільтри пошуку
        document.getElementById('searchDepartmentFilter')?.addEventListener('change', () => {
            this.searchEmployees();
        });

        document.getElementById('searchStatusFilter')?.addEventListener('change', () => {
            this.searchEmployees();
        });

        // Автоматичні опції генерації
        document.querySelectorAll('#generateTimesheetModal input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateEstimatedCount();
            });
        });

        document.getElementById('generateMonth')?.addEventListener('change', () => {
            this.updateEstimatedCount();
        });

        document.getElementById('generateYear')?.addEventListener('change', () => {
            this.updateEstimatedCount();
        });
    }

    /**
     * Оновлення вкладок підрозділів
     */
    updateDepartmentTabs() {
        const tabsContainer = document.querySelector('#departmentsTabs .tabs-header');
        if (!tabsContainer) return;

        // Очищуємо існуючі вкладки (крім "Всі співробітники")
        const allTabs = tabsContainer.querySelectorAll('.tab-btn:not([data-department="all"])');
        allTabs.forEach(tab => tab.remove());

        // Додаємо вкладки для кожного підрозділу
        this.departments.forEach(dept => {
            const employeeCount = this.employees.filter(emp => emp.departmentId === dept.id).length;
            
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-btn';
            tabButton.dataset.department = dept.id;
            tabButton.innerHTML = `
                <i class="fas fa-building"></i> ${dept.name}
                <span class="employee-count">${employeeCount}</span>
            `;
            
            tabButton.addEventListener('click', () => {
                this.switchDepartment(dept.id);
            });
            
            tabsContainer.appendChild(tabButton);
        });

        // Обробник для вкладки "Всі співробітники"
        document.querySelector('[data-department="all"]')?.addEventListener('click', () => {
            this.switchDepartment('all');
        });
    }

    /**
     * Перемикання підрозділу
     */
    switchDepartment(departmentId) {
        this.currentDepartment = departmentId;
        
        // Оновлюємо активну вкладку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-department="${departmentId}"]`)?.classList.add('active');
        
        // Оновлюємо інформацію про поточний підрозділ
        this.updateCurrentDepartmentInfo();
        
        // Перегенеруємо таблицю
        this.renderTimesheetTable();
    }

    /**
     * Оновлення інформації про поточний підрозділ
     */
    updateCurrentDepartmentInfo() {
        const nameElement = document.getElementById('currentDepartmentName');
        const countElement = document.getElementById('departmentEmployeeCount');
        const workDaysElement = document.getElementById('departmentWorkDays');

        if (this.currentDepartment === 'all') {
            nameElement.textContent = 'Всі співробітники';
            countElement.textContent = this.employees.length;
        } else {
            const department = this.departments.find(d => d.id === this.currentDepartment);
            const deptEmployees = this.employees.filter(emp => emp.departmentId === this.currentDepartment);
            
            nameElement.textContent = department ? department.name : 'Невідомий підрозділ';
            countElement.textContent = deptEmployees.length;
        }
        
        // Підрахунок робочих днів у місяці
        const workDays = this.getWorkingDaysInMonth(this.currentPeriod.year, this.currentPeriod.month);
        workDaysElement.textContent = workDays;
    }
    
    /**
     * Відкриття модального вікна генерації табеля
     */
    openGenerateModal() {
        // Заповнюємо поточний період
        document.getElementById('generateMonth').value = this.currentPeriod.month;
        document.getElementById('generateYear').value = this.currentPeriod.year;
        
        // Заповнюємо підрозділи
        this.updateDepartmentCheckboxes();
        
        // Оновлюємо оцінку кількості
        this.updateEstimatedCount();
        
        this.showModal('generateTimesheetModal');
    }

    /**
     * Оновлення списку підрозділів для вибору
     */
    updateDepartmentCheckboxes() {
        const container = document.getElementById('departmentCheckboxes');
        if (!container) return;

        container.innerHTML = '';
        
        this.departments.forEach(dept => {
            const employeeCount = this.employees.filter(emp => emp.departmentId === dept.id).length;
            
            const checkbox = document.createElement('label');
            checkbox.innerHTML = `
                <input type="checkbox" value="${dept.id}" checked>
                ${dept.name} (${employeeCount} співр.)
            `;
            
            checkbox.querySelector('input').addEventListener('change', () => {
                this.updateEstimatedCount();
            });
            
            container.appendChild(checkbox);
        });
    }

    /**
     * Оновлення оціночної кількості співробітників
     */
    async updateEstimatedCount() {
        try {
            const month = parseInt(document.getElementById('generateMonth')?.value || this.currentPeriod.month);
            const year = parseInt(document.getElementById('generateYear')?.value || this.currentPeriod.year);
            
            const includeActive = document.getElementById('includeActiveEmployees')?.checked;
            const includeWorked = document.getElementById('includeWorkedInPeriod')?.checked;
            const includeInactive = document.getElementById('includeInactiveEmployees')?.checked;
            
            const selectedDepts = Array.from(document.querySelectorAll('#departmentCheckboxes input:checked'))
                .map(cb => parseInt(cb.value));
            
            let estimatedEmployees = new Set();
            
            // Активні співробітники
            if (includeActive) {
                this.employees
                    .filter(emp => emp.status === 'active' && selectedDepts.includes(emp.departmentId))
                    .forEach(emp => estimatedEmployees.add(emp.id));
            }
            
            // Співробітники, що працювали в періоді
            if (includeWorked) {
                const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
                const timesheetRecords = await this.database.findByIndex('timesheet', 'monthYear', monthYear);
                
                timesheetRecords.forEach(record => {
                    const employee = this.employees.find(emp => emp.id === record.employeeId);
                    if (employee && selectedDepts.includes(employee.departmentId)) {
                        estimatedEmployees.add(employee.id);
                    }
                });
            }
            
            // Неактивні співробітники
            if (includeInactive) {
                this.employees
                    .filter(emp => emp.status === 'inactive' && selectedDepts.includes(emp.departmentId))
                    .forEach(emp => estimatedEmployees.add(emp.id));
            }
            
            document.getElementById('estimatedCount').textContent = estimatedEmployees.size;
            
        } catch (error) {
            console.error('Помилка оновлення оціночної кількості:', error);
        }
    }

    /**
     * Генерація табеля
     */
    async generateTimesheet() {
        try {
            const month = parseInt(document.getElementById('generateMonth').value);
            const year = parseInt(document.getElementById('generateYear').value);
            
            const includeActive = document.getElementById('includeActiveEmployees').checked;
            const includeWorked = document.getElementById('includeWorkedInPeriod').checked;
            const includeInactive = document.getElementById('includeInactiveEmployees').checked;
            
            const selectedDepts = Array.from(document.querySelectorAll('#departmentCheckboxes input:checked'))
                .map(cb => parseInt(cb.value));
            
            let employeesToInclude = new Set();
            
            // Додаємо співробітників за критеріями
            if (includeActive) {
                this.employees
                    .filter(emp => emp.status === 'active' && selectedDepts.includes(emp.departmentId))
                    .forEach(emp => employeesToInclude.add(emp.id));
            }
            
            if (includeWorked) {
                const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
                const timesheetRecords = await this.database.findByIndex('timesheet', 'monthYear', monthYear);
                
                timesheetRecords.forEach(record => {
                    const employee = this.employees.find(emp => emp.id === record.employeeId);
                    if (employee && selectedDepts.includes(employee.departmentId)) {
                        employeesToInclude.add(employee.id);
                    }
                });
            }
            
            if (includeInactive) {
                this.employees
                    .filter(emp => emp.status === 'inactive' && selectedDepts.includes(emp.departmentId))
                    .forEach(emp => employeesToInclude.add(emp.id));
            }
            
            // Оновлюємо період
            this.currentPeriod = { month, year };
            this.updatePeriodControls();
            
            // Завантажуємо дані табеля для нового періоду
            await this.loadTimesheetData();
            
            // Генеруємо таблицю для відібраних співробітників
            await this.renderTimesheetTable(Array.from(employeesToInclude));
            
            this.closeModal('generateTimesheetModal');
            this.showNotification(`Табель згенеровано для ${employeesToInclude.size} співробітників`, 'success');
            
        } catch (error) {
            console.error('Помилка генерації табеля:', error);
            this.showNotification('Помилка генерації: ' + error.message, 'error');
        }
    }

    /**
     * Відкриття модального вікна пошуку співробітника
     */
    openEmployeeSearchModal() {
        // Заповнюємо фільтр підрозділів
        this.updateSearchDepartmentFilter();
        
        // Очищуємо попередні результати
        document.getElementById('searchResults').innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Введіть дані для пошуку співробітника</p>
            </div>
        `;
        
        document.getElementById('employeeSearchInput').value = '';
        this.selectedEmployees.clear();
        this.updateSelectedCount();
        
        this.showModal('employeeSearchModal');
    }

    /**
     * Оновлення фільтру підрозділів у пошуку
     */
    updateSearchDepartmentFilter() {
        const select = document.getElementById('searchDepartmentFilter');
        if (!select) return;

        // Очищуємо існуючі опції (крім "Всі підрозділи")
        const existingOptions = select.querySelectorAll('option:not([value=""])');
        existingOptions.forEach(option => option.remove());

        // Додаємо опції для кожного підрозділу
        this.departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    }

    /**
     * Пошук співробітників
     */
    async searchEmployees() {
        try {
            const searchTerm = document.getElementById('employeeSearchInput').value.toLowerCase();
            const departmentFilter = document.getElementById('searchDepartmentFilter').value;
            const statusFilter = document.getElementById('searchStatusFilter').value;
            
            let filteredEmployees = [...this.employees];
            
            // Фільтр за пошуковим терміном
            if (searchTerm) {
                filteredEmployees = filteredEmployees.filter(emp => 
                    emp.fullName.toLowerCase().includes(searchTerm) ||
                    emp.personnelNumber.toLowerCase().includes(searchTerm) ||
                    (emp.position && emp.position.toLowerCase().includes(searchTerm))
                );
            }
            
            // Фільтр за підрозділом
            if (departmentFilter) {
                filteredEmployees = filteredEmployees.filter(emp => 
                    emp.departmentId === parseInt(departmentFilter)
                );
            }
            
            // Фільтр за статусом
            if (statusFilter !== 'all') {
                if (statusFilter === 'active') {
                    filteredEmployees = filteredEmployees.filter(emp => emp.status === 'active');
                } else if (statusFilter === 'inactive') {
                    filteredEmployees = filteredEmployees.filter(emp => emp.status === 'inactive');
                } else if (statusFilter === 'worked') {
                    // Співробітники, що працювали в поточному періоді
                    const monthYear = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}`;
                    const timesheetRecords = await this.database.findByIndex('timesheet', 'monthYear', monthYear);
                    const workedEmployeeIds = new Set(timesheetRecords.map(r => r.employeeId));
                    
                    filteredEmployees = filteredEmployees.filter(emp => 
                        workedEmployeeIds.has(emp.id)
                    );
                }
            }
            
            this.renderSearchResults(filteredEmployees);
            
        } catch (error) {
            console.error('Помилка пошуку співробітників:', error);
            this.showNotification('Помилка пошуку: ' + error.message, 'error');
        }
    }

    /**
     * Відображення результатів пошуку
     */
    renderSearchResults(employees) {
        const container = document.getElementById('searchResults');
        
        if (employees.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-user-slash"></i>
                    <p>Співробітників не знайдено</p>
                </div>
            `;
            return;
        }
        
        const resultsHTML = employees.map(emp => {
            const department = this.departments.find(d => d.id === emp.departmentId);
            const isSelected = this.selectedEmployees.has(emp.id);
            
            return `
                <div class="search-result-item ${isSelected ? 'selected' : ''}" data-employee-id="${emp.id}">
                    <div class="employee-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="timesheet1c.toggleEmployeeSelection(${emp.id})">
                    </div>
                    <div class="employee-info">
                        <div class="employee-name">${emp.fullName}</div>
                        <div class="employee-details">
                            <span class="personnel-number">№${emp.personnelNumber}</span>
                            <span class="department">${department ? department.name : 'Невідомий підрозділ'}</span>
                            <span class="position">${emp.position || 'Не вказано'}</span>
                            <span class="status ${emp.status}">${emp.status === 'active' ? 'Активний' : 'Неактивний'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="search-results-list">${resultsHTML}</div>`;
    }

    /**
     * Перемикання вибору співробітника
     */
    toggleEmployeeSelection(employeeId) {
        if (this.selectedEmployees.has(employeeId)) {
            this.selectedEmployees.delete(employeeId);
        } else {
            this.selectedEmployees.add(employeeId);
        }
        
        this.updateSelectedCount();
        
        // Оновлюємо візуальний стан
        const item = document.querySelector(`[data-employee-id="${employeeId}"]`);
        if (item) {
            item.classList.toggle('selected', this.selectedEmployees.has(employeeId));
        }
    }

    /**
     * Оновлення лічильника вибраних співробітників
     */
    updateSelectedCount() {
        document.getElementById('selectedCount').textContent = this.selectedEmployees.size;
        document.getElementById('addSelectedEmployees').disabled = this.selectedEmployees.size === 0;
    }

    /**
     * Додавання вибраних співробітників до табеля
     */
    addSelectedEmployeesToTimesheet() {
        if (this.selectedEmployees.size === 0) return;
        
        this.closeModal('employeeSearchModal');
        
        // Перегенеруємо таблицю з урахуванням нових співробітників
        this.renderTimesheetTable();
        
        this.showNotification(`Додано ${this.selectedEmployees.size} співробітників до табеля`, 'success');
        this.selectedEmployees.clear();
    }

    /**
     * Генерація таблиці табеля
     */
    async renderTimesheetTable(specificEmployeeIds = null) {
        try {
            const table = document.getElementById('timesheetTable');
            if (!table) return;
            
            // Отримуємо співробітників для відображення
            let employeesToShow = this.employees;
            
            if (specificEmployeeIds) {
                employeesToShow = this.employees.filter(emp => specificEmployeeIds.includes(emp.id));
            } else if (this.currentDepartment !== 'all') {
                employeesToShow = this.employees.filter(emp => emp.departmentId === this.currentDepartment);
            }
            
            // Сортуємо за ПІБ
            employeesToShow.sort((a, b) => a.fullName.localeCompare(b.fullName));
            
            // Генеруємо заголовок таблиці
            const headerHTML = this.generateTableHeader();
            
            // Генеруємо рядки співробітників
            const rowsHTML = employeesToShow.map(emp => this.generateEmployeeRow(emp)).join('');
            
            // Генеруємо підсумковий рядок
            const summaryHTML = this.generateSummaryRow(employeesToShow);
            
            table.innerHTML = `
                ${headerHTML}
                ${rowsHTML}
                ${summaryHTML}
            `;
            
            // Оновлюємо статистику
            this.updateCurrentDepartmentInfo();
            this.updateTotalEmployees(employeesToShow.length);
            
        } catch (error) {
            console.error('Помилка генерації таблиці:', error);
            this.showNotification('Помилка відображення табеля: ' + error.message, 'error');
        }
    }

    /**
     * Генерація заголовка таблиці
     */
    generateTableHeader() {
        const daysInMonth = new Date(this.currentPeriod.year, this.currentPeriod.month + 1, 0).getDate();
        
        let daysHTML = '';
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentPeriod.year, this.currentPeriod.month, day);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            daysHTML += `
                <th class="day-cell ${isWeekend ? 'weekend' : ''}" data-day="${day}">
                    <div class="day-number">${day}</div>
                    <div class="day-name">${this.getDayName(dayOfWeek)}</div>
                </th>
            `;
        }
        
        return `
            <thead>
                <tr>
                    <th class="employee-header" rowspan="2">
                        <div>ПІБ / Підрозділ</div>
                    </th>
                    <th class="personnel-number-header" rowspan="2">
                        <div>Таб. №</div>
                    </th>
                    ${daysHTML}
                    <th class="summary-header" rowspan="2">
                        <div>Всього</div>
                    </th>
                </tr>
            </thead>
        `;
    }

    /**
     * Генерація рядка співробітника
     */
    generateEmployeeRow(employee) {
        const daysInMonth = new Date(this.currentPeriod.year, this.currentPeriod.month + 1, 0).getDate();
        const department = this.departments.find(d => d.id === employee.departmentId);
        
        let daysCells = '';
        let totalHours = 0;
        let totalDays = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const employeeData = this.timesheetData.get(employee.id);
            const dayData = employeeData ? employeeData.get(dateStr) : null;
            
            const code = dayData ? dayData.code : '';
            const hours = dayData ? dayData.hours : 0;
            
            if (code === 'Я' && hours > 0) {
                totalHours += hours;
                totalDays++;
            }
            
            const date = new Date(this.currentPeriod.year, this.currentPeriod.month, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            daysCells += `
                <td class="day-data-cell ${isWeekend ? 'weekend' : ''}" data-employee-id="${employee.id}" data-day="${day}" onclick="timesheet1c.editDay(${employee.id}, ${day})">
                    <div class="work-code">${code}</div>
                    <div class="work-hours">${hours > 0 ? hours : ''}</div>
                </td>
            `;
        }
        
        return `
            <tr class="employee-row" data-employee-id="${employee.id}">
                <td class="employee-name-cell">
                    <div class="employee-name">${employee.fullName}</div>
                    <div class="employee-department">${department ? department.name : 'Невідомий підрозділ'}</div>
                </td>
                <td class="personnel-number-cell">${employee.personnelNumber}</td>
                ${daysCells}
                <td class="summary-cell">
                    <div class="total-days">${totalDays}</div>
                    <div class="total-hours">${totalHours}г</div>
                </td>
            </tr>
        `;
    }

    /**
     * Генерація підсумкового рядка
     */
    generateSummaryRow(employees) {
        const daysInMonth = new Date(this.currentPeriod.year, this.currentPeriod.month + 1, 0).getDate();
        
        let daysSummary = '';
        let totalEmployeeDays = 0;
        let totalEmployeeHours = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            let dayEmployees = 0;
            let dayHours = 0;
            
            employees.forEach(emp => {
                const dateStr = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const employeeData = this.timesheetData.get(emp.id);
                const dayData = employeeData ? employeeData.get(dateStr) : null;
                
                if (dayData && dayData.code === 'Я' && dayData.hours > 0) {
                    dayEmployees++;
                    dayHours += dayData.hours;
                }
            });
            
            totalEmployeeDays += dayEmployees;
            totalEmployeeHours += dayHours;
            
            const date = new Date(this.currentPeriod.year, this.currentPeriod.month, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            daysSummary += `
                <td class="summary-day-cell ${isWeekend ? 'weekend' : ''}">
                    <div class="day-employees">${dayEmployees}</div>
                    <div class="day-total-hours">${dayHours}г</div>
                </td>
            `;
        }
        
        return `
            <tr class="summary-row">
                <td class="summary-label" colspan="2">
                    <strong>Всього по підрозділу:</strong>
                </td>
                ${daysSummary}
                <td class="grand-summary-cell">
                    <div class="grand-total-days"><strong>${totalEmployeeDays}</strong></div>
                    <div class="grand-total-hours"><strong>${totalEmployeeHours}г</strong></div>
                </td>
            </tr>
        `;
    }

    /**
     * Редагування дня для співробітника
     */
    editDay(employeeId, day) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;
        
        const dateStr = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const employeeData = this.timesheetData.get(employeeId);
        const dayData = employeeData ? employeeData.get(dateStr) : null;
        
        const currentCode = dayData ? dayData.code : '';
        const currentHours = dayData ? dayData.hours : 0;
        
        // Створюємо простий інлайн редактор
        const cell = document.querySelector(`[data-employee-id="${employeeId}"][data-day="${day}"]`);
        if (!cell) return;
        
        // Створюємо форму редагування
        const form = document.createElement('div');
        form.className = 'inline-edit-form';
        form.innerHTML = `
            <select class="code-select">
                ${Object.entries(this.workCodes).map(([code, desc]) => 
                    `<option value="${code}" ${code === currentCode ? 'selected' : ''}>${code}</option>`
                ).join('')}
            </select>
            <input type="number" class="hours-input" value="${currentHours}" min="0" max="24" step="0.5">
            <button type="button" class="save-btn" onclick="timesheet1c.saveDayEdit(${employeeId}, ${day})">✓</button>
            <button type="button" class="cancel-btn" onclick="timesheet1c.cancelDayEdit(${employeeId}, ${day})">✕</button>
        `;
        
        // Зберігаємо оригінальний контент
        cell.dataset.originalContent = cell.innerHTML;
        cell.innerHTML = '';
        cell.appendChild(form);
        
        // Фокусуємо на першому полі
        form.querySelector('.code-select').focus();
    }

    /**
     * Збереження редагування дня
     */
    async saveDayEdit(employeeId, day) {
        try {
            const cell = document.querySelector(`[data-employee-id="${employeeId}"][data-day="${day}"]`);
            if (!cell) return;
            
            const form = cell.querySelector('.inline-edit-form');
            const code = form.querySelector('.code-select').value;
            const hours = parseFloat(form.querySelector('.hours-input').value) || 0;
            
            const dateStr = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const monthYear = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}`;
            
            // Зберігаємо в базу даних
            const existingRecords = await this.database.findByIndex('timesheet', 'employeeId', employeeId);
            const existingRecord = existingRecords.find(r => r.date === dateStr);
            
            const recordData = {
                employeeId: employeeId,
                date: dateStr,
                monthYear: monthYear,
                workCode: code,
                hoursWorked: hours,
                updatedAt: new Date().toISOString()
            };
            
            if (existingRecord) {
                recordData.id = existingRecord.id;
                await this.database.update('timesheet', recordData);
            } else {
                recordData.createdAt = new Date().toISOString();
                await this.database.add('timesheet', recordData);
            }
            
            // Оновлюємо локальні дані
            if (!this.timesheetData.has(employeeId)) {
                this.timesheetData.set(employeeId, new Map());
            }
            this.timesheetData.get(employeeId).set(dateStr, { code, hours });
            
            // Перегенеруємо таблицю
            await this.renderTimesheetTable();
            
        } catch (error) {
            console.error('Помилка збереження:', error);
            this.showNotification('Помилка збереження: ' + error.message, 'error');
            this.cancelDayEdit(employeeId, day);
        }
    }

    /**
     * Скасування редагування дня
     */
    cancelDayEdit(employeeId, day) {
        const cell = document.querySelector(`[data-employee-id="${employeeId}"][data-day="${day}"]`);
        if (!cell) return;
        
        const originalContent = cell.dataset.originalContent;
        if (originalContent) {
            cell.innerHTML = originalContent;
            delete cell.dataset.originalContent;
        }
    }

    /**
     * Заповнення робочих днів
     */
    async fillWorkingDays() {
        try {
            const confirmation = confirm('Заповнити всі робочі дні кодом "Я" та 8 годинами для всіх відображених співробітників?');
            if (!confirmation) return;
            
            const daysInMonth = new Date(this.currentPeriod.year, this.currentPeriod.month + 1, 0).getDate();
            const monthYear = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}`;
            
            // Отримуємо співробітників для поточного підрозділу
            let employeesToFill = this.employees;
            if (this.currentDepartment !== 'all') {
                employeesToFill = this.employees.filter(emp => emp.departmentId === this.currentDepartment);
            }
            
            let updatedRecords = 0;
            
            for (const employee of employeesToFill) {
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(this.currentPeriod.year, this.currentPeriod.month, day);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    // Пропускаємо вихідні
                    if (isWeekend) continue;
                    
                    const dateStr = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    
                    // Перевіряємо, чи вже є запис
                    const existingRecords = await this.database.findByIndex('timesheet', 'employeeId', employee.id);
                    const existingRecord = existingRecords.find(r => r.date === dateStr);
                    
                    const recordData = {
                        employeeId: employee.id,
                        date: dateStr,
                        monthYear: monthYear,
                        workCode: 'Я',
                        hoursWorked: 8,
                        updatedAt: new Date().toISOString()
                    };
                    
                    if (existingRecord) {
                        recordData.id = existingRecord.id;
                        await this.database.update('timesheet', recordData);
                    } else {
                        recordData.createdAt = new Date().toISOString();
                        await this.database.add('timesheet', recordData);
                    }
                    
                    updatedRecords++;
                }
            }
            
            // Перезавантажуємо дані та перегенеруємо таблицю
            await this.loadTimesheetData();
            await this.renderTimesheetTable();
            
            this.showNotification(`Заповнено ${updatedRecords} робочих днів`, 'success');
            
        } catch (error) {
            console.error('Помилка заповнення робочих днів:', error);
            this.showNotification('Помилка заповнення: ' + error.message, 'error');
        }
    }

    /**
     * Підрахунок підсумків
     */
    calculateTotals() {
        // Оновлюємо підсумкову інформацію
        const workingDays = this.getWorkingDaysInMonth(this.currentPeriod.year, this.currentPeriod.month);
        const holidays = this.getHolidaysInMonth(this.currentPeriod.year, this.currentPeriod.month);
        
        document.getElementById('workingDaysInPeriod').textContent = workingDays;
        document.getElementById('holidaysInPeriod').textContent = holidays;
        
        // Перегенеруємо таблицю для оновлення підсумків
        this.renderTimesheetTable();
        
        this.showNotification('Підсумки оновлено', 'success');
    }

    /**
     * Експорт в Excel
     */
    exportToExcel() {
        try {
            // Підготовка даних для експорту
            const wb = XLSX.utils.book_new();
            
            // Дані заголовка
            const headerData = [
                ['ТАБЕЛЬ ОБЛІКУ РОБОЧОГО ЧАСУ'],
                [`За ${this.getMonthName(this.currentPeriod.month)} ${this.currentPeriod.year} року`],
                ['Підприємство:', document.getElementById('organizationName').value],
                ['Код ЄДРПОУ:', document.getElementById('edrpouCode').value],
                []
            ];
            
            // Заголовки таблиці
            const daysInMonth = new Date(this.currentPeriod.year, this.currentPeriod.month + 1, 0).getDate();
            const tableHeader = ['ПІБ', 'Таб. №'];
            
            for (let day = 1; day <= daysInMonth; day++) {
                tableHeader.push(day.toString());
            }
            tableHeader.push('Всього');
            
            headerData.push(tableHeader);
            
            // Дані співробітників
            let employeesToExport = this.employees;
            if (this.currentDepartment !== 'all') {
                employeesToExport = this.employees.filter(emp => emp.departmentId === this.currentDepartment);
            }
            
            employeesToExport.forEach(emp => {
                const row = [emp.fullName, emp.personnelNumber];
                
                let totalHours = 0;
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${this.currentPeriod.year}-${String(this.currentPeriod.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const employeeData = this.timesheetData.get(emp.id);
                    const dayData = employeeData ? employeeData.get(dateStr) : null;
                    
                    if (dayData) {
                        row.push(`${dayData.code}${dayData.hours > 0 ? '/' + dayData.hours : ''}`);
                        if (dayData.code === 'Я') totalHours += dayData.hours;
                    } else {
                        row.push('');
                    }
                }
                
                row.push(totalHours + 'г');
                headerData.push(row);
            });
            
            // Створюємо робочий лист
            const ws = XLSX.utils.aoa_to_sheet(headerData);
            XLSX.utils.book_append_sheet(wb, ws, 'Табель');
            
            // Зберігаємо файл
            const filename = `Табель_${this.currentPeriod.year}_${String(this.currentPeriod.month + 1).padStart(2, '0')}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            this.showNotification('Файл Excel створено', 'success');
            
        } catch (error) {
            console.error('Помилка експорту в Excel:', error);
            this.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }

    /**
     * Друк табеля
     */
    printTimesheet() {
        window.print();
    }

    /**
     * Допоміжні методи
     */
    updatePeriodControls() {
        document.getElementById('periodMonth').value = this.currentPeriod.month;
        document.getElementById('periodYear').value = this.currentPeriod.year;
    }

    updateCurrentPeriod() {
        this.currentPeriod = {
            month: parseInt(document.getElementById('periodMonth').value),
            year: parseInt(document.getElementById('periodYear').value)
        };
        
        this.loadTimesheetData().then(() => {
            this.renderTimesheetTable();
        });
    }

    updateTotalEmployees(count) {
        document.getElementById('totalEmployees').textContent = count;
    }

    getWorkingDaysInMonth(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDays = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
            }
        }
        
        return workingDays;
    }

    getHolidaysInMonth(year, month) {
        // Тут має бути логіка для визначення свят з виробничого календаря
        // Поки що повертаємо фіксоване значення
        return 1;
    }

    getDayName(dayOfWeek) {
        const names = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return names[dayOfWeek];
    }

    getMonthName(monthIndex) {
        const names = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        return names[monthIndex];
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showNotification(message, type = 'info') {
        // Використовуємо глобальну систему повідомлень, якщо доступна
        if (window.hrSystem) {
            window.hrSystem.showNotification(message, type);
        } else {
            // Простий fallback
            alert(message);
        }
    }
}

// Глобальний екземпляр для доступу з HTML
let timesheet1c = null;

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    timesheet1c = new Timesheet1CFormat();
});
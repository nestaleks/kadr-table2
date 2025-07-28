/**
 * Reports Module - Модуль звітності
 * Генерує різноманітні звіти для HR системи
 */

class ReportsModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.currentReport = null;
        this.reportData = null;
        this.filterData = {};
        
        // Типи звітів
        this.reportTypes = {
            'employees': {
                name: 'Звіт по співробітниках',
                icon: 'fas fa-users',
                description: 'Детальна інформація про всіх співробітників'
            },
            'payroll': {
                name: 'Звіт по зарплаті',
                icon: 'fas fa-money-bill-wave',
                description: 'Нарахування та утримання з заробітної плати'
            },
            'timesheet': {
                name: 'Звіт по табелю',
                icon: 'fas fa-clock',
                description: 'Облік робочого часу співробітників'
            },
            'vacations': {
                name: 'Звіт по відпустках',
                icon: 'fas fa-calendar-check',
                description: 'Відпустки та лікарняні співробітників'
            },
            'departments': {
                name: 'Звіт по підрозділах',
                icon: 'fas fa-sitemap',
                description: 'Структура підрозділів та штатний розпис'
            },
            'analytics': {
                name: 'Аналітичний звіт',
                icon: 'fas fa-chart-line',
                description: 'Статистика та аналітика HR процесів'
            }
        };

        // Формати експорту
        this.exportFormats = {
            'json': { name: 'JSON', icon: 'fas fa-code', extension: 'json' },
            'excel': { name: 'Excel', icon: 'fas fa-file-excel', extension: 'xlsx' },
            'pdf': { name: 'PDF', icon: 'fas fa-file-pdf', extension: 'pdf' },
            'csv': { name: 'CSV', icon: 'fas fa-file-csv', extension: 'csv' }
        };
    }

    async render() {
        return `
            <div class="reports-module">
                <div class="module-header">
                    <h2><i class="fas fa-chart-bar"></i>Звітність</h2>
                    <div class="header-actions">
                        <button class="btn btn-success" onclick="reportsModule.exportAllData()">
                            <i class="fas fa-download"></i>Експорт всіх даних
                        </button>
                    </div>
                </div>

                <!-- Report Selection -->
                <div class="report-types">
                    <h3><i class="fas fa-list"></i>Оберіть тип звіту</h3>
                    <div class="report-cards">
                        ${Object.entries(this.reportTypes).map(([key, report]) => `
                            <div class="report-card" onclick="reportsModule.selectReport('${key}')">
                                <div class="report-icon">
                                    <i class="${report.icon}"></i>
                                </div>
                                <div class="report-info">
                                    <h4>${report.name}</h4>
                                    <p>${report.description}</p>
                                </div>
                                <div class="report-action">
                                    <i class="fas fa-arrow-right"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Report Filters -->
                <div id="reportFilters" class="report-filters" style="display: none;">
                    <div class="filters-header">
                        <h3><i class="fas fa-filter"></i>Фільтри звіту</h3>
                        <button class="btn btn-secondary" onclick="reportsModule.clearFilters()">
                            <i class="fas fa-times"></i>Очистити
                        </button>
                    </div>
                    <div class="filters-content" id="filtersContent">
                        <!-- Динамічно генеруються фільтри -->
                    </div>
                    <div class="filters-actions">
                        <button class="btn btn-primary" onclick="reportsModule.generateReport()">
                            <i class="fas fa-play"></i>Згенерувати звіт
                        </button>
                        <button class="btn btn-secondary" onclick="reportsModule.cancelReport()">
                            <i class="fas fa-times"></i>Скасувати
                        </button>
                    </div>
                </div>

                <!-- Report Results -->
                <div id="reportResults" class="report-results" style="display: none;">
                    <div class="results-header">
                        <h3 id="reportTitle"><i class="fas fa-chart-bar"></i>Результати звіту</h3>
                        <div class="results-actions">
                            <div class="export-buttons" id="exportButtons">
                                ${Object.entries(this.exportFormats).map(([key, format]) => `
                                    <button class="btn btn-outline" onclick="reportsModule.exportReport('${key}')">
                                        <i class="${format.icon}"></i>${format.name}
                                    </button>
                                `).join('')}
                            </div>
                            <button class="btn btn-secondary" onclick="reportsModule.newReport()">
                                <i class="fas fa-plus"></i>Новий звіт
                            </button>
                        </div>
                    </div>
                    <div class="results-content" id="resultsContent">
                        <!-- Динамічно генерується контент звіту -->
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        // Ініціалізація модуля
        await this.loadInitialData();
    }

    async loadInitialData() {
        try {
            // Завантажуємо базові дані для звітів
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.positions = await this.database.getAll('positions');
            this.timesheets = await this.database.getAll('timesheets');
            this.payrolls = await this.database.getAll('payrolls');
            this.vacations = await this.database.getAll('vacations');
        } catch (error) {
            console.error('Помилка завантаження даних для звітів:', error);
        }
    }

    selectReport(reportType) {
        this.currentReport = reportType;
        this.showFilters(reportType);
    }

    showFilters(reportType) {
        const filtersDiv = document.getElementById('reportFilters');
        const filtersContent = document.getElementById('filtersContent');
        
        filtersDiv.style.display = 'block';
        filtersContent.innerHTML = this.generateFiltersHTML(reportType);
        
        // Scroll to filters
        filtersDiv.scrollIntoView({ behavior: 'smooth' });
    }

    generateFiltersHTML(reportType) {        
        const commonFilters = `
            <div class="filter-section">
                <h4><i class="fas fa-calendar"></i>Період</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Від дати:</label>
                        <input type="date" id="dateFrom" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>До дати:</label>
                        <input type="date" id="dateTo" class="form-input">
                    </div>
                </div>
            </div>
        `;

        const departmentFilter = `
            <div class="filter-section">
                <h4><i class="fas fa-sitemap"></i>Підрозділ</h4>
                <div class="form-group">
                    <select id="departmentFilter" class="form-input">
                        <option value="">Всі підрозділи</option>
                        ${this.departments.map(dept => 
                            `<option value="${dept.id}">${dept.name}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;

        const employeeFilter = `
            <div class="filter-section">
                <h4><i class="fas fa-user"></i>Співробітник</h4>
                <div class="form-group">
                    <select id="employeeFilter" class="form-input">
                        <option value="">Всі співробітники</option>
                        ${this.employees.map(emp => 
                            `<option value="${emp.id}">${emp.lastName} ${emp.firstName}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;

        switch (reportType) {
            case 'employees':
                return departmentFilter + `
                    <div class="filter-section">
                        <h4><i class="fas fa-user-check"></i>Статус</h4>
                        <div class="form-group">
                            <select id="statusFilter" class="form-input">
                                <option value="">Всі статуси</option>
                                <option value="active">Активні</option>
                                <option value="inactive">Неактивні</option>
                                <option value="vacation">У відпустці</option>
                            </select>
                        </div>
                    </div>
                `;

            case 'payroll':
                return commonFilters + departmentFilter + employeeFilter;

            case 'timesheet':
                return commonFilters + departmentFilter + employeeFilter;

            case 'vacations':
                return commonFilters + departmentFilter + employeeFilter + `
                    <div class="filter-section">
                        <h4><i class="fas fa-tags"></i>Тип відпустки</h4>
                        <div class="form-group">
                            <select id="vacationTypeFilter" class="form-input">
                                <option value="">Всі типи</option>
                                <option value="main">Основна відпустка</option>
                                <option value="additional">Додаткова відпустка</option>
                                <option value="unpaid">Без збереження з/п</option>
                                <option value="sick">Лікарняний</option>
                            </select>
                        </div>
                    </div>
                `;

            case 'departments':
                return `
                    <div class="filter-section">
                        <h4><i class="fas fa-info-circle"></i>Деталізація</h4>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="includeEmployees" checked>
                                Включити співробітників
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="includePositions" checked>
                                Включити посади
                            </label>
                        </div>
                    </div>
                `;

            case 'analytics':
                return commonFilters + `
                    <div class="filter-section">
                        <h4><i class="fas fa-chart-pie"></i>Метрики</h4>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="includeHourlyStats" checked>
                                Статистика робочого часу
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="includePayrollStats" checked>
                                Статистика зарплати
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="includeVacationStats" checked>
                                Статистика відпусток
                            </label>
                        </div>
                    </div>
                `;

            default:
                return commonFilters + departmentFilter;
        }
    }

    async generateReport() {
        try {
            // Збираємо фільтри
            this.collectFilters();
            
            // Показуємо індикатор завантаження
            this.showLoadingIndicator();
            
            // Генеруємо звіт залежно від типу
            let reportData;
            switch (this.currentReport) {
                case 'employees':
                    reportData = await this.generateEmployeesReport();
                    break;
                case 'payroll':
                    reportData = await this.generatePayrollReport();
                    break;
                case 'timesheet':
                    reportData = await this.generateTimesheetReport();
                    break;
                case 'vacations':
                    reportData = await this.generateVacationsReport();
                    break;
                case 'departments':
                    reportData = await this.generateDepartmentsReport();
                    break;
                case 'analytics':
                    reportData = await this.generateAnalyticsReport();
                    break;
                default:
                    throw new Error('Невідомий тип звіту');
            }
            
            this.reportData = reportData;
            this.showReportResults(reportData);
            
        } catch (error) {
            console.error('Помилка генерації звіту:', error);
            hrSystem.showNotification('Помилка генерації звіту: ' + error.message, 'error');
        }
    }

    collectFilters() {
        this.filterData = {};
        
        // Загальні фільтри
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const departmentFilter = document.getElementById('departmentFilter')?.value;
        const employeeFilter = document.getElementById('employeeFilter')?.value;
        
        if (dateFrom) this.filterData.dateFrom = dateFrom;
        if (dateTo) this.filterData.dateTo = dateTo;
        if (departmentFilter) this.filterData.departmentId = departmentFilter;
        if (employeeFilter) this.filterData.employeeId = employeeFilter;
        
        // Специфічні фільтри
        const statusFilter = document.getElementById('statusFilter')?.value;
        const vacationTypeFilter = document.getElementById('vacationTypeFilter')?.value;
        const includeEmployees = document.getElementById('includeEmployees')?.checked;
        const includePositions = document.getElementById('includePositions')?.checked;
        const includeHourlyStats = document.getElementById('includeHourlyStats')?.checked;
        const includePayrollStats = document.getElementById('includePayrollStats')?.checked;
        const includeVacationStats = document.getElementById('includeVacationStats')?.checked;
        
        if (statusFilter) this.filterData.status = statusFilter;
        if (vacationTypeFilter) this.filterData.vacationType = vacationTypeFilter;
        if (includeEmployees !== undefined) this.filterData.includeEmployees = includeEmployees;
        if (includePositions !== undefined) this.filterData.includePositions = includePositions;
        if (includeHourlyStats !== undefined) this.filterData.includeHourlyStats = includeHourlyStats;
        if (includePayrollStats !== undefined) this.filterData.includePayrollStats = includePayrollStats;
        if (includeVacationStats !== undefined) this.filterData.includeVacationStats = includeVacationStats;
    }

    async generateEmployeesReport() {
        let employees = [...this.employees];
        
        // Фільтрація по підрозділу
        if (this.filterData.departmentId) {
            employees = employees.filter(emp => emp.departmentId === this.filterData.departmentId);
        }
        
        // Фільтрація по статусу
        if (this.filterData.status) {
            employees = employees.filter(emp => {
                if (this.filterData.status === 'active') return emp.status === 'active';
                if (this.filterData.status === 'inactive') return emp.status === 'inactive';
                if (this.filterData.status === 'vacation') return emp.onVacation === true;
                return true;
            });
        }
        
        // Додаємо інформацію про підрозділи та посади
        const enrichedEmployees = employees.map(employee => {
            const department = this.departments.find(d => d.id === employee.departmentId);
            const position = this.positions.find(p => p.id === employee.positionId);
            
            return {
                ...employee,
                departmentName: department?.name || 'Не вказано',
                positionName: position?.name || 'Не вказано',
                salaryAmount: employee.salary?.amount || 0
            };
        });
        
        return {
            title: 'Звіт по співробітниках',
            summary: {
                totalEmployees: enrichedEmployees.length,
                activeEmployees: enrichedEmployees.filter(e => e.status === 'active').length,
                totalSalaryBudget: enrichedEmployees.reduce((sum, e) => sum + (e.salaryAmount || 0), 0)
            },
            data: enrichedEmployees,
            columns: [
                { key: 'personnelNumber', title: 'Таб. №', type: 'text' },
                { key: 'lastName', title: 'Прізвище', type: 'text' },
                { key: 'firstName', title: 'Ім\'я', type: 'text' },
                { key: 'middleName', title: 'По батькові', type: 'text' },
                { key: 'departmentName', title: 'Підрозділ', type: 'text' },
                { key: 'positionName', title: 'Посада', type: 'text' },
                { key: 'salaryAmount', title: 'Оклад', type: 'currency' },
                { key: 'hireDate', title: 'Дата прийняття', type: 'date' },
                { key: 'status', title: 'Статус', type: 'badge' }
            ]
        };
    }

    async generatePayrollReport() {
        let payrolls = [...this.payrolls];
        
        // Фільтрація по періоду
        if (this.filterData.dateFrom || this.filterData.dateTo) {
            payrolls = payrolls.filter(payroll => {
                const payrollDate = new Date(payroll.period + '-01');
                const fromDate = this.filterData.dateFrom ? new Date(this.filterData.dateFrom) : new Date('1900-01-01');
                const toDate = this.filterData.dateTo ? new Date(this.filterData.dateTo) : new Date('2100-01-01');
                
                return payrollDate >= fromDate && payrollDate <= toDate;
            });
        }
        
        // Фільтрація по співробітнику
        if (this.filterData.employeeId) {
            payrolls = payrolls.filter(p => p.employeeId === this.filterData.employeeId);
        }
        
        // Збагачуємо дані інформацією про співробітників
        const enrichedPayrolls = payrolls.map(payroll => {
            const employee = this.employees.find(e => e.id === payroll.employeeId);
            const department = this.departments.find(d => d.id === employee?.departmentId);
            
            return {
                ...payroll,
                employeeName: employee ? `${employee.lastName} ${employee.firstName}` : 'Невідомо',
                departmentName: department?.name || 'Не вказано',
                totalEarnings: (payroll.calculations?.basePay || 0) + (payroll.calculations?.overtime || 0) + (payroll.calculations?.bonus || 0),
                totalDeductions: (payroll.calculations?.personalIncomeTax || 0) + (payroll.calculations?.militaryTax || 0) + (payroll.calculations?.socialContributions || 0),
                netPay: payroll.calculations?.netPay || 0
            };
        });
        
        return {
            title: 'Звіт по зарплаті',
            summary: {
                totalRecords: enrichedPayrolls.length,
                totalEarnings: enrichedPayrolls.reduce((sum, p) => sum + p.totalEarnings, 0),
                totalDeductions: enrichedPayrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
                totalNetPay: enrichedPayrolls.reduce((sum, p) => sum + p.netPay, 0)
            },
            data: enrichedPayrolls,
            columns: [
                { key: 'period', title: 'Період', type: 'text' },
                { key: 'employeeName', title: 'Співробітник', type: 'text' },
                { key: 'departmentName', title: 'Підрозділ', type: 'text' },
                { key: 'totalEarnings', title: 'Нараховано', type: 'currency' },
                { key: 'totalDeductions', title: 'Утримано', type: 'currency' },
                { key: 'netPay', title: 'До виплати', type: 'currency' },
                { key: 'status', title: 'Статус', type: 'badge' }
            ]
        };
    }

    async generateTimesheetReport() {
        let timesheets = [...this.timesheets];
        
        // Фільтрація по періоду
        if (this.filterData.dateFrom || this.filterData.dateTo) {
            timesheets = timesheets.filter(timesheet => {
                const timesheetDate = new Date(timesheet.period + '-01');
                const fromDate = this.filterData.dateFrom ? new Date(this.filterData.dateFrom) : new Date('1900-01-01');
                const toDate = this.filterData.dateTo ? new Date(this.filterData.dateTo) : new Date('2100-01-01');
                
                return timesheetDate >= fromDate && timesheetDate <= toDate;
            });
        }
        
        // Фільтрація по співробітнику
        if (this.filterData.employeeId) {
            timesheets = timesheets.filter(t => t.employeeId === this.filterData.employeeId);
        }
        
        // Збагачуємо дані
        const enrichedTimesheets = timesheets.map(timesheet => {
            const employee = this.employees.find(e => e.id === timesheet.employeeId);
            const department = this.departments.find(d => d.id === employee?.departmentId);
            
            return {
                ...timesheet,
                employeeName: employee ? `${employee.lastName} ${employee.firstName}` : 'Невідомо',
                departmentName: department?.name || 'Не вказано',
                totalHours: timesheet.totalHours || 0,
                regularHours: timesheet.regularHours || 0,
                overtimeHours: timesheet.overtimeHours || 0
            };
        });
        
        return {
            title: 'Звіт по табелю робочого часу',
            summary: {
                totalRecords: enrichedTimesheets.length,
                totalHours: enrichedTimesheets.reduce((sum, t) => sum + t.totalHours, 0),
                totalRegularHours: enrichedTimesheets.reduce((sum, t) => sum + t.regularHours, 0),
                totalOvertimeHours: enrichedTimesheets.reduce((sum, t) => sum + t.overtimeHours, 0)
            },
            data: enrichedTimesheets,
            columns: [
                { key: 'period', title: 'Période', type: 'text' },
                { key: 'employeeName', title: 'Співробітник', type: 'text' },
                { key: 'departmentName', title: 'Підрозділ', type: 'text' },
                { key: 'totalHours', title: 'Всього годин', type: 'number' },
                { key: 'regularHours', title: 'Основні години', type: 'number' },
                { key: 'overtimeHours', title: 'Понаднормові', type: 'number' }
            ]
        };
    }

    async generateVacationsReport() {
        let vacations = [...this.vacations];
        
        // Фільтрація по періоду
        if (this.filterData.dateFrom || this.filterData.dateTo) {
            vacations = vacations.filter(vacation => {
                const startDate = new Date(vacation.startDate);
                const endDate = new Date(vacation.endDate);
                const fromDate = this.filterData.dateFrom ? new Date(this.filterData.dateFrom) : new Date('1900-01-01');
                const toDate = this.filterData.dateTo ? new Date(this.filterData.dateTo) : new Date('2100-01-01');
                
                return (startDate >= fromDate && startDate <= toDate) || 
                       (endDate >= fromDate && endDate <= toDate);
            });
        }
        
        // Фільтрація по співробітнику
        if (this.filterData.employeeId) {
            vacations = vacations.filter(v => v.employeeId === this.filterData.employeeId);
        }
        
        // Фільтрація по типу відпустки
        if (this.filterData.vacationType) {
            vacations = vacations.filter(v => v.type === this.filterData.vacationType);
        }
        
        // Збагачуємо дані
        const enrichedVacations = vacations.map(vacation => {
            const employee = this.employees.find(e => e.id === vacation.employeeId);
            const department = this.departments.find(d => d.id === employee?.departmentId);
            
            return {
                ...vacation,
                employeeName: employee ? `${employee.lastName} ${employee.firstName}` : 'Невідомо',
                departmentName: department?.name || 'Не вказано',
                duration: vacation.totalDays || 0
            };
        });
        
        return {
            title: 'Звіт по відпустках та лікарняних',
            summary: {
                totalRecords: enrichedVacations.length,
                totalDays: enrichedVacations.reduce((sum, v) => sum + v.duration, 0),
                mainVacations: enrichedVacations.filter(v => v.type === 'main').length,
                sickLeaves: enrichedVacations.filter(v => v.type === 'sick').length
            },
            data: enrichedVacations,
            columns: [
                { key: 'employeeName', title: 'Співробітник', type: 'text' },
                { key: 'departmentName', title: 'Підрозділ', type: 'text' },
                { key: 'type', title: 'Тип', type: 'vacation-badge' },
                { key: 'startDate', title: 'Початок', type: 'date' },
                { key: 'endDate', title: 'Кінець', type: 'date' },
                { key: 'duration', title: 'Днів', type: 'number' },
                { key: 'status', title: 'Статус', type: 'badge' }
            ]
        };
    }

    async generateDepartmentsReport() {
        const departmentsData = this.departments.map(department => {
            const employees = this.employees.filter(e => e.departmentId === department.id);
            const positions = this.filterData.includePositions ? 
                this.positions.filter(p => employees.some(e => e.positionId === p.id)) : [];
            
            return {
                ...department,
                employeeCount: employees.length,
                positionCount: positions.length,
                totalSalaryBudget: employees.reduce((sum, e) => sum + (e.salary?.amount || 0), 0),
                employees: this.filterData.includeEmployees ? employees : [],
                positions: this.filterData.includePositions ? positions : []
            };
        });
        
        return {
            title: 'Звіт по підрозділах',
            summary: {
                totalDepartments: departmentsData.length,
                totalEmployees: departmentsData.reduce((sum, d) => sum + d.employeeCount, 0),
                totalSalaryBudget: departmentsData.reduce((sum, d) => sum + d.totalSalaryBudget, 0)
            },
            data: departmentsData,
            columns: [
                { key: 'name', title: 'Назва підрозділу', type: 'text' },
                { key: 'code', title: 'Код', type: 'text' },
                { key: 'employeeCount', title: 'Співробітники', type: 'number' },
                { key: 'positionCount', title: 'Посади', type: 'number' },
                { key: 'totalSalaryBudget', title: 'Фонд оплати', type: 'currency' },
                { key: 'status', title: 'Статус', type: 'badge' }
            ]
        };
    }

    async generateAnalyticsReport() {
        const analytics = {
            employeeStats: {
                total: this.employees.length,
                active: this.employees.filter(e => e.status === 'active').length,
                inactive: this.employees.filter(e => e.status === 'inactive').length,
                onVacation: this.employees.filter(e => e.onVacation).length
            },
            departmentStats: this.departments.map(dept => ({
                name: dept.name,
                employeeCount: this.employees.filter(e => e.departmentId === dept.id).length,
                salaryBudget: this.employees
                    .filter(e => e.departmentId === dept.id)
                    .reduce((sum, e) => sum + (e.salary?.amount || 0), 0)
            })),
            salaryStats: {
                totalBudget: this.employees.reduce((sum, e) => sum + (e.salary?.amount || 0), 0),
                averageSalary: this.employees.length > 0 ? 
                    this.employees.reduce((sum, e) => sum + (e.salary?.amount || 0), 0) / this.employees.length : 0,
                minSalary: Math.min(...this.employees.map(e => e.salary?.amount || 0)),
                maxSalary: Math.max(...this.employees.map(e => e.salary?.amount || 0))
            }
        };
        
        return {
            title: 'Аналітичний звіт',
            summary: analytics.employeeStats,
            data: analytics,
            isAnalytics: true
        };
    }

    showLoadingIndicator() {
        const resultsDiv = document.getElementById('reportResults');
        const resultsContent = document.getElementById('resultsContent');
        
        resultsDiv.style.display = 'block';
        resultsContent.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Генерація звіту...</p>
            </div>
        `;
        
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    showReportResults(reportData) {
        const resultsDiv = document.getElementById('reportResults');
        const resultsContent = document.getElementById('resultsContent');
        const reportTitle = document.getElementById('reportTitle');
        
        reportTitle.innerHTML = `<i class="fas fa-chart-bar"></i>${reportData.title}`;
        
        if (reportData.isAnalytics) {
            resultsContent.innerHTML = this.generateAnalyticsHTML(reportData);
        } else {
            resultsContent.innerHTML = this.generateTableHTML(reportData);
        }
        
        resultsDiv.style.display = 'block';
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    generateTableHTML(reportData) {
        const summaryHTML = reportData.summary ? `
            <div class="report-summary">
                <h4><i class="fas fa-info-circle"></i>Підсумок</h4>
                <div class="summary-cards">
                    ${Object.entries(reportData.summary).map(([key, value]) => `
                        <div class="summary-card">
                            <div class="summary-value">${this.formatValue(value, 'auto')}</div>
                            <div class="summary-label">${this.getSummaryLabel(key)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        
        const tableHTML = `
            <div class="report-table-wrapper">
                <table class="report-table">
                    <thead>
                        <tr>
                            ${reportData.columns.map(col => 
                                `<th>${col.title}</th>`
                            ).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.data.map(row => `
                            <tr>
                                ${reportData.columns.map(col => 
                                    `<td>${this.formatCellValue(row[col.key], col.type)}</td>`
                                ).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        return summaryHTML + tableHTML;
    }

    generateAnalyticsHTML(reportData) {
        const data = reportData.data;
        
        return `
            <div class="analytics-dashboard">
                <div class="analytics-section">
                    <h4><i class="fas fa-users"></i>Статистика співробітників</h4>
                    <div class="analytics-cards">
                        <div class="analytics-card">
                            <div class="card-value">${data.employeeStats.total}</div>
                            <div class="card-label">Всього співробітників</div>
                        </div>
                        <div class="analytics-card active">
                            <div class="card-value">${data.employeeStats.active}</div>
                            <div class="card-label">Активні</div>
                        </div>
                        <div class="analytics-card inactive">
                            <div class="card-value">${data.employeeStats.inactive}</div>
                            <div class="card-label">Неактивні</div>
                        </div>
                        <div class="analytics-card vacation">
                            <div class="card-value">${data.employeeStats.onVacation}</div>
                            <div class="card-label">У відпустці</div>
                        </div>
                    </div>
                </div>
                
                <div class="analytics-section">
                    <h4><i class="fas fa-money-bill-wave"></i>Статистика зарплат</h4>
                    <div class="analytics-cards">
                        <div class="analytics-card">
                            <div class="card-value">${this.formatCurrency(data.salaryStats.totalBudget)}</div>
                            <div class="card-label">Загальний фонд</div>
                        </div>
                        <div class="analytics-card">
                            <div class="card-value">${this.formatCurrency(data.salaryStats.averageSalary)}</div>
                            <div class="card-label">Середня зарплата</div>
                        </div>
                        <div class="analytics-card">
                            <div class="card-value">${this.formatCurrency(data.salaryStats.minSalary)}</div>
                            <div class="card-label">Мінімальна</div>
                        </div>
                        <div class="analytics-card">
                            <div class="card-value">${this.formatCurrency(data.salaryStats.maxSalary)}</div>
                            <div class="card-label">Максимальна</div>
                        </div>
                    </div>
                </div>
                
                <div class="analytics-section">
                    <h4><i class="fas fa-sitemap"></i>Статистика по підрозділах</h4>
                    <div class="department-stats">
                        ${data.departmentStats.map(dept => `
                            <div class="department-stat">
                                <div class="dept-name">${dept.name}</div>
                                <div class="dept-metrics">
                                    <span class="metric">
                                        <i class="fas fa-users"></i>
                                        ${dept.employeeCount} співр.
                                    </span>
                                    <span class="metric">
                                        <i class="fas fa-money-bill"></i>
                                        ${this.formatCurrency(dept.salaryBudget)}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    formatCellValue(value, type) {
        if (value === null || value === undefined) return '-';
        
        switch (type) {
            case 'currency':
                return this.formatCurrency(value);
            case 'number':
                return Number(value).toLocaleString('uk-UA');
            case 'date':
                return new Date(value).toLocaleDateString('uk-UA');
            case 'badge':
                return this.formatStatusBadge(value);
            case 'vacation-badge':
                return this.formatVacationBadge(value);
            default:
                return String(value);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: 'UAH',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    formatStatusBadge(status) {
        const badges = {
            'active': '<span class="status-badge approved">Активний</span>',
            'inactive': '<span class="status-badge rejected">Неактивний</span>',
            'pending': '<span class="status-badge pending">Очікує</span>',
            'approved': '<span class="status-badge approved">Затверджено</span>',
            'rejected': '<span class="status-badge rejected">Відхилено</span>',
            'calculated': '<span class="status-badge calculated">Розраховано</span>',
            'paid': '<span class="status-badge approved">Виплачено</span>'
        };
        return badges[status] || `<span class="status-badge">${status}</span>`;
    }

    formatVacationBadge(type) {
        const badges = {
            'main': '<span class="vacation-type-badge main">Основна</span>',
            'additional': '<span class="vacation-type-badge additional">Додаткова</span>',
            'unpaid': '<span class="vacation-type-badge unpaid">Без збереження</span>',
            'sick': '<span class="vacation-type-badge sick">Лікарняний</span>'
        };
        return badges[type] || `<span class="vacation-type-badge">${type}</span>`;
    }

    formatValue(value, format) {
        if (format === 'currency' || (format === 'auto' && typeof value === 'number' && value > 1000)) {
            return this.formatCurrency(value);
        }
        return String(value);
    }

    getSummaryLabel(key) {
        const labels = {
            'totalEmployees': 'Всього співробітників',
            'activeEmployees': 'Активних співробітників',
            'totalSalaryBudget': 'Фонд оплати праці',
            'totalRecords': 'Всього записів',
            'totalEarnings': 'Всього нараховано',
            'totalDeductions': 'Всього утримано',
            'totalNetPay': 'Всього до виплати',
            'totalHours': 'Всього годин',
            'totalRegularHours': 'Основних годин',
            'totalOvertimeHours': 'Понаднормових годин',
            'totalDays': 'Всього днів',
            'mainVacations': 'Основних відпусток',
            'sickLeaves': 'Лікарняних',
            'totalDepartments': 'Всього підрозділів'
        };
        return labels[key] || key;
    }

    clearFilters() {
        // Очищуємо всі поля фільтрів
        document.querySelectorAll('#filtersContent input, #filtersContent select').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = input.id.includes('include');
            } else {
                input.value = '';
            }
        });
    }

    cancelReport() {
        document.getElementById('reportFilters').style.display = 'none';
        document.getElementById('reportResults').style.display = 'none';
        this.currentReport = null;
        this.reportData = null;
        this.filterData = {};
    }

    newReport() {
        this.cancelReport();
        document.querySelector('.report-types').scrollIntoView({ behavior: 'smooth' });
    }

    async exportReport(format) {
        if (!this.reportData) {
            hrSystem.showNotification('Немає даних для експорту', 'warning');
            return;
        }
        
        try {
            switch (format) {
                case 'json':
                    this.exportToJSON();
                    break;
                case 'csv':
                    this.exportToCSV();
                    break;
                case 'excel':
                    hrSystem.showNotification('Експорт в Excel буде доступний в наступній версії', 'info');
                    break;
                case 'pdf':
                    hrSystem.showNotification('Експорт в PDF буде доступний в наступній версії', 'info');
                    break;
                default:
                    throw new Error('Невідомий формат експорту');
            }
        } catch (error) {
            console.error('Помилка експорту:', error);
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }

    exportToJSON() {
        const data = {
            title: this.reportData.title,
            generatedAt: new Date().toISOString(),
            filters: this.filterData,
            summary: this.reportData.summary,
            data: this.reportData.data
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentReport}_report_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        hrSystem.showNotification('Звіт експортовано в JSON', 'success');
    }

    exportToCSV() {
        if (!this.reportData.columns || !this.reportData.data) {
            hrSystem.showNotification('Неможливо експортувати цей тип звіту в CSV', 'warning');
            return;
        }
        
        // Заголовки
        const headers = this.reportData.columns.map(col => col.title).join(',');
        
        // Дані
        const rows = this.reportData.data.map(row => 
            this.reportData.columns.map(col => {
                const value = row[col.key];
                // Екрануємо кавички та коми
                const cleanValue = String(value || '').replace(/"/g, '""');
                return `"${cleanValue}"`;
            }).join(',')
        );
        
        const csv = [headers, ...rows].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentReport}_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        hrSystem.showNotification('Звіт експортовано в CSV', 'success');
    }

    async exportAllData() {
        try {
            const allData = {
                employees: this.employees,
                departments: this.departments,
                positions: this.positions,
                timesheets: this.timesheets,
                payrolls: this.payrolls,
                vacations: this.vacations,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HR_Complete_Export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            hrSystem.showNotification('Всі дані успішно експортовано', 'success');
            
        } catch (error) {
            console.error('Помилка експорту всіх даних:', error);
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }
}
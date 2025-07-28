/**
 * Payroll Module - Модуль розрахунку зарплати
 * Відповідає українському законодавству з питань оплати праці
 */

class PayrollModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.employees = [];
        this.departments = [];
        this.positions = [];
        this.payrollRecords = [];
        this.timesheetData = [];
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.selectedPayroll = null;
        
        // Податкові ставки України (2025)
        this.taxRates = {
            personalIncomeTax: 0.18, // ПДФО 18%
            militaryTax: 0.015, // Військовий збір 1.5%
            pensionContribution: 0.22, // ЄСВ роботодавець 22%
            employeePensionContribution: 0.0025, // ЄСВ працівник 0.25%
            minWage: 8000, // Мінімальна зарплата 2025
            taxFreeMinimum: 2690 // Неоподатковуваний мінімум
        };
    }

    async render() {
        await this.loadData();

        return `
            <div class="payroll-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-calculator"></i> Розрахунок зарплати</h1>
                        <p>Нарахування та виплата заробітної плати</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="calculatePayrollBtn">
                            <i class="fas fa-play"></i> Розрахувати зарплату
                        </button>
                        <button class="btn btn-success" id="generatePayslipsBtn">
                            <i class="fas fa-file-alt"></i> Розрахункові листки
                        </button>
                        <button class="btn btn-secondary" id="exportPayrollBtn">
                            <i class="fas fa-download"></i> Експорт
                        </button>
                    </div>
                </div>

                <!-- Період та фільтри -->
                <div class="controls-panel">
                    <div class="period-controls">
                        <div class="form-group">
                            <label>Рік:</label>
                            <select id="payrollYear" class="form-control">
                                ${this.generateYearOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Місяць:</label>
                            <select id="payrollMonth" class="form-control">
                                ${this.generateMonthOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Підрозділ:</label>
                            <select id="payrollDepartmentFilter" class="form-control">
                                <option value="all">Всі підрозділи</option>
                                ${this.departments.map(dept => 
                                    `<option value="${dept.id}">${dept.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <button class="btn btn-secondary" id="loadPayrollBtn">
                            <i class="fas fa-search"></i> Завантажити
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.getFilteredEmployees().length}</span>
                        <span class="stat-label">Співробітників</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.formatCurrency(this.getTotalGrossPay())}</span>
                        <span class="stat-label">Нараховано</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.formatCurrency(this.getTotalNetPay())}</span>
                        <span class="stat-label">До виплати</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.formatCurrency(this.getTotalTaxes())}</span>
                        <span class="stat-label">Податки</span>
                    </div>
                </div>

                <!-- Налаштування розрахунку -->
                <div class="payroll-settings">
                    <div class="settings-header">
                        <h3><i class="fas fa-cogs"></i> Налаштування розрахунку</h3>
                        <button class="btn btn-sm btn-outline" id="toggleSettingsBtn">
                            <i class="fas fa-chevron-down"></i> Показати
                        </button>
                    </div>
                    <div class="settings-content" id="settingsContent" style="display: none;">
                        <div class="settings-grid">
                            <div class="setting-group">
                                <h4>Податкові ставки</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>ПДФО (%)</label>
                                        <input type="number" id="personalIncomeTax" value="${this.taxRates.personalIncomeTax * 100}" step="0.1" min="0" max="100">
                                    </div>
                                    <div class="form-group">
                                        <label>Військовий збір (%)</label>
                                        <input type="number" id="militaryTax" value="${this.taxRates.militaryTax * 100}" step="0.1" min="0" max="100">
                                    </div>
                                </div>
                            </div>
                            <div class="setting-group">
                                <h4>Соціальні внески</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>ЄСВ роботодавець (%)</label>
                                        <input type="number" id="pensionContribution" value="${this.taxRates.pensionContribution * 100}" step="0.1" min="0" max="100">
                                    </div>
                                    <div class="form-group">
                                        <label>ЄСВ працівник (%)</label>
                                        <input type="number" id="employeePensionContribution" value="${this.taxRates.employeePensionContribution * 100}" step="0.1" min="0" max="100">
                                    </div>
                                </div>
                            </div>
                            <div class="setting-group">
                                <h4>Мінімальні показники</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Мінімальна зарплата (грн)</label>
                                        <input type="number" id="minWage" value="${this.taxRates.minWage}" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label>Неоподатковуваний мінімум (грн)</label>
                                        <input type="number" id="taxFreeMinimum" value="${this.taxRates.taxFreeMinimum}" min="0">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="settings-actions">
                            <button class="btn btn-primary" id="saveSettingsBtn">Зберегти налаштування</button>
                            <button class="btn btn-secondary" id="resetSettingsBtn">Скинути до стандартних</button>
                        </div>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="payroll-content">
                    <div id="payrollContainer" class="payroll-container">
                        ${this.renderPayrollTable()}
                    </div>
                </div>

                <!-- Модальне вікно розрахунку -->
                <div id="calculatePayrollModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2><i class="fas fa-calculator"></i> Розрахунок зарплати</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="calculation-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Період розрахунку *</label>
                                        <div class="period-inputs">
                                            <select name="calcMonth" required>
                                                ${this.generateMonthOptions()}
                                            </select>
                                            <select name="calcYear" required>
                                                ${this.generateYearOptions()}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Підрозділ</label>
                                        <select name="calcDepartment">
                                            <option value="all">Всі підрозділи</option>
                                            ${this.departments.map(dept => 
                                                `<option value="${dept.id}">${dept.name}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="includeInactive">
                                        Включити неактивних співробітників
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="recalculate" checked>
                                        Перерахувати існуючі записи
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="confirmCalculateBtn">Розрахувати</button>
                            <button class="btn btn-secondary" id="cancelCalculateBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно деталей розрахунку -->
                <div id="payrollDetailsModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2 id="detailsTitle">
                                <i class="fas fa-receipt"></i> Деталі розрахунку
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="payrollDetails"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editPayrollBtn">Редагувати</button>
                            <button class="btn btn-secondary" id="printPayslipBtn">Друкувати листок</button>
                            <button class="btn btn-secondary" id="closeDetailsBtn">Закрити</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        this.bindEvents();
        await this.loadPayrollData();
    }

    async loadData() {
        try {
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.positions = await this.database.getAll('positions');
        } catch (error) {
            console.error('Помилка завантаження даних зарплати:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Розрахунок зарплати
        document.getElementById('calculatePayrollBtn')?.addEventListener('click', () => {
            this.showCalculateModal();
        });

        // Генерація листків
        document.getElementById('generatePayslipsBtn')?.addEventListener('click', () => {
            this.generatePayslips();
        });

        // Завантаження за період
        document.getElementById('loadPayrollBtn')?.addEventListener('click', () => {
            this.loadPayrollForPeriod();
        });

        // Експорт
        document.getElementById('exportPayrollBtn')?.addEventListener('click', () => {
            this.exportPayroll();
        });

        // Налаштування
        document.getElementById('toggleSettingsBtn')?.addEventListener('click', () => {
            this.toggleSettings();
        });

        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => {
            this.resetSettings();
        });

        // Зміна періоду
        document.getElementById('payrollYear')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
        });

        document.getElementById('payrollMonth')?.addEventListener('change', (e) => {
            this.currentMonth = parseInt(e.target.value);
        });

        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Підтвердження розрахунку
        document.getElementById('confirmCalculateBtn')?.addEventListener('click', () => {
            this.calculatePayroll();
        });

        // Скасування
        document.getElementById('cancelCalculateBtn')?.addEventListener('click', () => {
            this.hideCalculateModal();
        });

        // Редагування розрахунку
        document.getElementById('editPayrollBtn')?.addEventListener('click', () => {
            this.editPayrollRecord();
        });

        // Друк листка
        document.getElementById('printPayslipBtn')?.addEventListener('click', () => {
            this.printPayslip();
        });

        // Закриття деталей
        document.getElementById('closeDetailsBtn')?.addEventListener('click', () => {
            this.hideDetailsModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                hrSystem.closeModal(modal);
            });
        });
    }

    renderPayrollTable() {
        const filteredEmployees = this.getFilteredEmployees();
        
        if (filteredEmployees.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calculator"></i>
                    <h3>Немає даних для розрахунку</h3>
                    <p>Додайте співробітників або виберіть інший період</p>
                    <button class="btn btn-primary" onclick="document.getElementById('calculatePayrollBtn').click()">
                        <i class="fas fa-play"></i> Розрахувати зарплату
                    </button>
                </div>
            `;
        }

        return `
            <div class="payroll-table-wrapper">
                <table class="payroll-table">
                    <thead>
                        <tr>
                            <th>ПІБ</th>
                            <th>Посада</th>
                            <th>Таб. №</th>
                            <th>Відпрацьовано</th>
                            <th>Нараховано</th>
                            <th>ПДФО</th>
                            <th>Військовий збір</th>
                            <th>ЄСВ</th>
                            <th>До виплати</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredEmployees.map(emp => this.renderPayrollRow(emp)).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="payroll-summary">
                            <td colspan="4"><strong>Всього:</strong></td>
                            <td><strong>${this.formatCurrency(this.getTotalGrossPay())}</strong></td>
                            <td><strong>${this.formatCurrency(this.getTotalPDFO())}</strong></td>
                            <td><strong>${this.formatCurrency(this.getTotalMilitaryTax())}</strong></td>
                            <td><strong>${this.formatCurrency(this.getTotalESV())}</strong></td>
                            <td><strong>${this.formatCurrency(this.getTotalNetPay())}</strong></td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    renderPayrollRow(employee) {
        const position = this.positions.find(p => p.id === employee.positionId);
        const payrollRecord = this.getEmployeePayrollRecord(employee.id);
        const hoursWorked = this.getEmployeeWorkedHours(employee.id);

        return `
            <tr class="payroll-row" data-employee-id="${employee.id}">
                <td class="employee-name">${employee.fullName}</td>
                <td class="employee-position">${position?.title || '-'}</td>
                <td class="employee-personnel">${employee.personnelNumber}</td>
                <td class="hours-worked">${hoursWorked}г</td>
                <td class="gross-pay">${this.formatCurrency(payrollRecord?.calculations?.grossPay || 0)}</td>
                <td class="tax-pdfo">${this.formatCurrency(payrollRecord?.calculations?.personalIncomeTax || 0)}</td>
                <td class="tax-military">${this.formatCurrency(payrollRecord?.calculations?.militaryTax || 0)}</td>
                <td class="tax-esv">${this.formatCurrency(payrollRecord?.calculations?.pensionContribution || 0)}</td>
                <td class="net-pay">${this.formatCurrency(payrollRecord?.summary?.netPay || 0)}</td>
                <td class="payroll-status">
                    <span class="status-badge ${payrollRecord?.status || 'not-calculated'}">
                        ${this.getPayrollStatusText(payrollRecord?.status)}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="payrollModule.showDetails(${employee.id})" title="Деталі">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="payrollModule.recalculateEmployee(${employee.id})" title="Перерахувати">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="btn-icon" onclick="payrollModule.printPayslip(${employee.id})" title="Листок">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    // Розрахункові методи
    calculateEmployeePayroll(employee, hoursWorked, baseSalary) {
        const calculations = {};
        const summary = {};

        // Базова зарплата
        baseSalary = baseSalary || employee.salary?.amount || 0;
        
        // Розрахунок за відпрацьований час
        const monthlyHours = this.getMonthlyWorkingHours();
        const hourlyRate = baseSalary / monthlyHours;
        calculations.basePay = Math.round(hourlyRate * hoursWorked);

        // Надбавки та премії (поки статичні)
        calculations.bonuses = 0;
        calculations.allowances = 0;
        
        // Валовий дохід
        calculations.grossPay = calculations.basePay + calculations.bonuses + calculations.allowances;

        // Утримання
        // ЄСВ працівника
        calculations.employeePensionContribution = Math.round(
            calculations.grossPay * this.taxRates.employeePensionContribution
        );

        // База оподаткування ПДФО
        const taxableIncome = Math.max(0, calculations.grossPay - this.taxRates.taxFreeMinimum);
        
        // ПДФО 18%
        calculations.personalIncomeTax = Math.round(taxableIncome * this.taxRates.personalIncomeTax);
        
        // Військовий збір 1.5%
        calculations.militaryTax = Math.round(taxableIncome * this.taxRates.militaryTax);

        // ЄСВ роботодавця (не утримується з працівника, але рахується для роботодавця)
        calculations.pensionContribution = Math.round(
            calculations.grossPay * this.taxRates.pensionContribution
        );

        // Всього утримано
        summary.totalDeductions = 
            calculations.employeePensionContribution + 
            calculations.personalIncomeTax + 
            calculations.militaryTax;

        // До виплати
        summary.netPay = calculations.grossPay - summary.totalDeductions;

        // Витрати роботодавця
        summary.employerCosts = calculations.grossPay + calculations.pensionContribution;

        return { calculations, summary };
    }

    getMonthlyWorkingHours() {
        // Стандартний робочий місяць - 160-176 годин
        // Для спрощення беремо 168 годин (21 день * 8 годин)
        const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        let workingDays = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth - 1, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Не вихідні
                workingDays++;
            }
        }
        
        return workingDays * 8; // 8 годин на день
    }

    getEmployeeWorkedHours(employeeId) {
        const monthKey = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
        const timesheetRecord = this.timesheetData.find(record => 
            record.employeeId === employeeId && record.monthYear === monthKey
        );
        
        if (!timesheetRecord) return 0;
        
        let totalHours = 0;
        Object.values(timesheetRecord.days || {}).forEach(day => {
            totalHours += day.hours || 0;
        });
        
        return totalHours;
    }

    getEmployeePayrollRecord(employeeId) {
        const monthKey = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
        return this.payrollRecords.find(record => 
            record.employeeId === employeeId && record.monthYear === monthKey
        );
    }

    // Дії
    async showCalculateModal() {
        const modal = document.getElementById('calculatePayrollModal');
        
        // Встановлюємо поточний період
        modal.querySelector('[name="calcMonth"]').value = this.currentMonth;
        modal.querySelector('[name="calcYear"]').value = this.currentYear;
        
        hrSystem.showModal(modal);
    }

    hideCalculateModal() {
        const modal = document.getElementById('calculatePayrollModal');
        hrSystem.closeModal(modal);
    }

    async calculatePayroll() {
        const modal = document.getElementById('calculatePayrollModal');
        const month = parseInt(modal.querySelector('[name="calcMonth"]').value);
        const year = parseInt(modal.querySelector('[name="calcYear"]').value);
        const department = modal.querySelector('[name="calcDepartment"]').value;
        const includeInactive = modal.querySelector('[name="includeInactive"]').checked;
        const recalculate = modal.querySelector('[name="recalculate"]').checked;

        try {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            
            // Завантажуємо табель за період
            await this.loadTimesheetForPeriod(year, month);
            
            // Отримуємо співробітників
            let employees = this.employees;
            if (department && department !== 'all') {
                employees = employees.filter(emp => emp.departmentId == department);
            }
            if (!includeInactive) {
                employees = employees.filter(emp => emp.status === 'active');
            }

            let calculatedCount = 0;
            
            for (const employee of employees) {
                // Перевіряємо чи існує запис
                const existingRecord = this.payrollRecords.find(record => 
                    record.employeeId === employee.id && record.monthYear === monthKey
                );
                
                if (existingRecord && !recalculate) {
                    continue; // Пропускаємо якщо не перерахунковуємо
                }
                
                // Розрахунки
                const hoursWorked = this.getEmployeeWorkedHours(employee.id);
                const { calculations, summary } = this.calculateEmployeePayroll(employee, hoursWorked);
                
                const payrollRecord = {
                    employeeId: employee.id,
                    monthYear: monthKey,
                    period: { month, year },
                    hoursWorked,
                    calculations,
                    summary,
                    status: 'calculated',
                    calculatedAt: new Date().toISOString(),
                    calculatedBy: 'system'
                };

                if (existingRecord) {
                    // Оновлюємо
                    payrollRecord.id = existingRecord.id;
                    payrollRecord.updatedAt = new Date().toISOString();
                    await this.database.update('payroll', payrollRecord);
                    
                    // Оновлюємо в локальному масиві
                    const index = this.payrollRecords.findIndex(r => r.id === existingRecord.id);
                    this.payrollRecords[index] = payrollRecord;
                } else {
                    // Створюємо новий
                    payrollRecord.createdAt = new Date().toISOString();
                    const savedRecord = await this.database.add('payroll', payrollRecord);
                    payrollRecord.id = savedRecord.id;
                    this.payrollRecords.push(payrollRecord);
                }
                
                calculatedCount++;
            }

            // Оновлюємо період і перезавантажуємо
            this.currentYear = year;
            this.currentMonth = month;
            document.getElementById('payrollYear').value = year;
            document.getElementById('payrollMonth').value = month;
            
            this.updatePayrollView();
            this.hideCalculateModal();
            
            hrSystem.showNotification(
                `Розрахунок завершено для ${calculatedCount} співробітників за ${this.getMonthName()} ${year}`, 
                'success'
            );

        } catch (error) {
            console.error('Помилка розрахунку зарплати:', error);
            hrSystem.showNotification('Помилка розрахунку: ' + error.message, 'error');
        }
    }

    async loadTimesheetForPeriod(year, month) {
        try {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            const allTimesheet = await this.database.getAll('timesheet');
            this.timesheetData = allTimesheet.filter(record => record.monthYear === monthKey);
        } catch (error) {
            console.error('Помилка завантаження табеля:', error);
            this.timesheetData = [];
        }
    }

    async loadPayrollData() {
        try {
            const monthKey = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
            const allPayroll = await this.database.getAll('payroll');
            this.payrollRecords = allPayroll.filter(record => record.monthYear === monthKey);
        } catch (error) {
            console.error('Помилка завантаження зарплати:', error);
            this.payrollRecords = [];
        }
    }

    async loadPayrollForPeriod() {
        this.currentYear = parseInt(document.getElementById('payrollYear').value);
        this.currentMonth = parseInt(document.getElementById('payrollMonth').value);
        
        await this.loadPayrollData();
        await this.loadTimesheetForPeriod(this.currentYear, this.currentMonth);
        this.updatePayrollView();
        
        hrSystem.showNotification(`Завантажено дані за ${this.getMonthName()} ${this.currentYear}`, 'info');
    }

    // Допоміжні методи
    getFilteredEmployees() {
        const departmentFilter = document.getElementById('payrollDepartmentFilter')?.value;
        let filtered = this.employees.filter(emp => emp.status === 'active');
        
        if (departmentFilter && departmentFilter !== 'all') {
            filtered = filtered.filter(emp => emp.departmentId == departmentFilter);
        }
        
        return filtered;
    }

    getTotalGrossPay() {
        return this.payrollRecords.reduce((sum, record) => sum + (record.calculations?.grossPay || 0), 0);
    }

    getTotalNetPay() {
        return this.payrollRecords.reduce((sum, record) => sum + (record.summary?.netPay || 0), 0);
    }

    getTotalTaxes() {
        return this.payrollRecords.reduce((sum, record) => {
            const taxes = (record.calculations?.personalIncomeTax || 0) + 
                         (record.calculations?.militaryTax || 0) + 
                         (record.calculations?.employeePensionContribution || 0);
            return sum + taxes;
        }, 0);
    }

    getTotalPDFO() {
        return this.payrollRecords.reduce((sum, record) => sum + (record.calculations?.personalIncomeTax || 0), 0);
    }

    getTotalMilitaryTax() {
        return this.payrollRecords.reduce((sum, record) => sum + (record.calculations?.militaryTax || 0), 0);
    }

    getTotalESV() {
        return this.payrollRecords.reduce((sum, record) => sum + (record.calculations?.employeePensionContribution || 0), 0);
    }

    getPayrollStatusText(status) {
        const statuses = {
            'calculated': 'Розраховано',
            'approved': 'Затверджено', 
            'paid': 'Виплачено',
            'not-calculated': 'Не розраховано'
        };
        return statuses[status] || 'Невідомо';
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

    getMonthName() {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        return months[this.currentMonth - 1];
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: 'UAH',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    updatePayrollView() {
        const container = document.getElementById('payrollContainer');
        if (container) {
            container.innerHTML = this.renderPayrollTable();
        }
        this.updateStats();
    }

    updateStats() {
        const statsItems = document.querySelectorAll('.stat-item .stat-number');
        if (statsItems.length >= 4) {
            statsItems[0].textContent = this.getFilteredEmployees().length;
            statsItems[1].textContent = this.formatCurrency(this.getTotalGrossPay());
            statsItems[2].textContent = this.formatCurrency(this.getTotalNetPay());
            statsItems[3].textContent = this.formatCurrency(this.getTotalTaxes());
        }
    }

    toggleSettings() {
        const content = document.getElementById('settingsContent');
        const btn = document.getElementById('toggleSettingsBtn');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            btn.innerHTML = '<i class="fas fa-chevron-up"></i> Приховати';
        } else {
            content.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-chevron-down"></i> Показати';
        }
    }

    async saveSettings() {
        // Оновлюємо ставки з форми
        this.taxRates.personalIncomeTax = parseFloat(document.getElementById('personalIncomeTax').value) / 100;
        this.taxRates.militaryTax = parseFloat(document.getElementById('militaryTax').value) / 100;
        this.taxRates.pensionContribution = parseFloat(document.getElementById('pensionContribution').value) / 100;
        this.taxRates.employeePensionContribution = parseFloat(document.getElementById('employeePensionContribution').value) / 100;
        this.taxRates.minWage = parseFloat(document.getElementById('minWage').value);
        this.taxRates.taxFreeMinimum = parseFloat(document.getElementById('taxFreeMinimum').value);

        // Зберігаємо в localStorage
        localStorage.setItem('payrollTaxRates', JSON.stringify(this.taxRates));
        
        hrSystem.showNotification('Налаштування збережено', 'success');
    }

    resetSettings() {
        // Скидаємо до стандартних значень
        this.taxRates = {
            personalIncomeTax: 0.18,
            militaryTax: 0.015, 
            pensionContribution: 0.22,
            employeePensionContribution: 0.0025,
            minWage: 8000,
            taxFreeMinimum: 2690
        };
        
        // Оновлюємо поля форми
        document.getElementById('personalIncomeTax').value = 18;
        document.getElementById('militaryTax').value = 1.5;
        document.getElementById('pensionContribution').value = 22;
        document.getElementById('employeePensionContribution').value = 0.25;
        document.getElementById('minWage').value = 8000;
        document.getElementById('taxFreeMinimum').value = 2690;
        
        localStorage.removeItem('payrollTaxRates');
        
        hrSystem.showNotification('Налаштування скинуто до стандартних', 'info');
    }

    // Заглушки для майбутньої реалізації
    async showDetails(employeeId) {
        console.log('Show payroll details for employee:', employeeId);
        hrSystem.showNotification('Функція буде реалізована в наступній версії', 'info');
    }

    async recalculateEmployee(employeeId) {
        console.log('Recalculate payroll for employee:', employeeId);
        hrSystem.showNotification('Функція буде реалізована в наступній версії', 'info');
    }

    async printPayslip(employeeId) {
        console.log('Print payslip for employee:', employeeId);
        hrSystem.showNotification('Функція буде реалізована в наступній версії', 'info');
    }

    async generatePayslips() {
        hrSystem.showNotification('Генерація листків буде реалізована в наступній версії', 'info');
    }

    async exportPayroll() {
        try {
            const filteredEmployees = this.getFilteredEmployees();
            const exportData = filteredEmployees.map(emp => {
                const position = this.positions.find(p => p.id === emp.positionId);
                const department = this.departments.find(d => d.id === emp.departmentId);
                const payrollRecord = this.getEmployeePayrollRecord(emp.id);
                const hoursWorked = this.getEmployeeWorkedHours(emp.id);
                
                return {
                    'ПІБ': emp.fullName,
                    'Посада': position?.title || '',
                    'Підрозділ': department?.name || '',
                    'Табельний номер': emp.personnelNumber,
                    'Відпрацьовано годин': hoursWorked,
                    'Нараховано': payrollRecord?.calculations?.grossPay || 0,
                    'ПДФО': payrollRecord?.calculations?.personalIncomeTax || 0,
                    'Військовий збір': payrollRecord?.calculations?.militaryTax || 0,
                    'ЄСВ': payrollRecord?.calculations?.employeePensionContribution || 0,
                    'До виплати': payrollRecord?.summary?.netPay || 0,
                    'Статус': this.getPayrollStatusText(payrollRecord?.status)
                };
            });

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Зарплата_${this.getMonthName()}_${this.currentYear}.json`;
            a.click();
            URL.revokeObjectURL(url);

            hrSystem.showNotification('Дані експортовано', 'success');

        } catch (error) {
            console.error('Помилка експорту зарплати:', error);
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }

    hideDetailsModal() {
        const modal = document.getElementById('payrollDetailsModal');
        hrSystem.closeModal(modal);
    }

    editPayrollRecord() {
        hrSystem.showNotification('Редагування буде реалізовано в наступній версії', 'info');
    }
}

// Глобальна змінна payrollModule оголошена в hr-system.js
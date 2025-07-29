/**
 * Payslips Module - Модуль розрахункових листків
 * Створення, кастомізація та друк розрахункових листків
 */

class PayslipsModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.payslips = [];
        this.templates = [];
        this.employees = [];
        this.payrollData = [];
        this.companySettings = {};
        this.selectedPayslip = null;
        this.selectedTemplate = null;
        this.currentPeriod = this.getCurrentPeriod();
        this.previewMode = false;
    }

    async render() {
        await this.loadData();

        return `
            <div class="payslips-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-file-invoice"></i> Розрахункові листки</h1>
                        <p>Створення та управління розрахунковими листками</p>
                    </div>
                    <div class="header-actions">
                        <div class="period-selector">
                            <select id="periodSelect" class="form-control">
                                ${this.renderPeriodOptions()}
                            </select>
                        </div>
                        <button class="btn btn-primary" id="generatePayslipsBtn">
                            <i class="fas fa-plus"></i> Згенерувати листки
                        </button>
                        <button class="btn btn-secondary" id="templatesBtn">
                            <i class="fas fa-clipboard-list"></i> Шаблони
                        </button>
                        <button class="btn btn-secondary" id="bulkPrintBtn">
                            <i class="fas fa-print"></i> Масовий друк
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="payslips-stats">
                    <div class="stat-item">
                        <span class="stat-number">${this.payslips.length}</span>
                        <span class="stat-label">Всього листків</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getGeneratedCount()}</span>
                        <span class="stat-label">Згенеровано</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getSentCount()}</span>
                        <span class="stat-label">Відправлено</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.templates.length}</span>
                        <span class="stat-label">Шаблонів</span>
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
                            <option value="draft">Чернетка</option>
                            <option value="generated">Згенеровано</option>
                            <option value="sent">Відправлено</option>
                            <option value="printed">Надруковано</option>
                        </select>
                        <select id="departmentFilter" class="filter-select">
                            <option value="all">Всі підрозділи</option>
                            ${this.getDepartments().map(dept => 
                                `<option value="${dept.id}">${dept.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="list" title="Список">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="view-btn" data-view="grid" title="Сітка">
                            <i class="fas fa-th"></i>
                        </button>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="payslips-content">
                    <div id="payslipsContainer" class="payslips-container">
                        ${this.renderPayslipsList()}
                    </div>
                </div>

                <!-- Модальне вікно створення/редагування листка -->
                <div id="payslipModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2 id="payslipModalTitle">
                                <i class="fas fa-file-invoice"></i> Розрахунковий листок
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="payslipFormContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="savePayslipBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="previewPayslipBtn">Попередній перегляд</button>
                            <button class="btn btn-secondary" id="printPayslipBtn">Друк</button>
                            <button class="btn btn-secondary" id="cancelPayslipBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно шаблонів -->
                <div id="templatesModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2><i class="fas fa-clipboard-list"></i> Шаблони розрахunkових листків</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="templatesContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="createTemplateBtn">Створити шаблон</button>
                            <button class="btn btn-secondary" id="closeTemplatesBtn">Закрити</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно конструктора шаблонів -->
                <div id="templateBuilderModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2><i class="fas fa-wrench"></i> Конструктор шаблону</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="templateBuilderContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveTemplateBtn">Зберегти шаблон</button>
                            <button class="btn btn-secondary" id="previewTemplateBtn">Попередній перегляд</button>
                            <button class="btn btn-secondary" id="cancelTemplateBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно попереднього перегляду -->
                <div id="previewModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2><i class="fas fa-eye"></i> Попередній перегляд</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="previewContent" class="payslip-preview"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="printPreviewBtn">Друк</button>
                            <button class="btn btn-secondary" id="downloadPreviewBtn">Завантажити PDF</button>
                            <button class="btn btn-secondary" id="closePreviewBtn">Закрити</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadData();
        this.bindEvents();
    }

    async loadData() {
        try {
            this.payslips = await this.database.getAll('payslips') || [];
            this.templates = await this.database.getAll('payslipTemplates') || [];
            this.employees = await this.database.getAll('employees') || [];
            this.payrollData = await this.database.getAll('payroll') || [];
            
            // Отримуємо налаштування компанії
            const allSettings = await this.database.getAll('settings');
            this.companySettings = {};
            allSettings.forEach(setting => {
                this.companySettings[setting.key] = setting.value;
            });

            // Створюємо базовий шаблон, якщо його немає
            if (this.templates.length === 0) {
                await this.createDefaultTemplate();
                this.templates = await this.database.getAll('payslipTemplates') || [];
            }
        } catch (error) {
            console.error('Помилка завантаження даних розрахункових листків:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    async createDefaultTemplate() {
        try {
            const defaultTemplate = {
                name: 'Стандартний розрахунковий листок',
                type: 'standard',
                isDefault: true,
                description: 'Базовий шаблон відповідно до українського законодавства',
                structure: {
                    header: {
                        companyName: true,
                        period: true,
                        employeeInfo: true,
                        logo: false
                    },
                    earnings: [
                        { code: 'basic_salary', name: 'Основна заробітна плата', required: true, order: 1 },
                        { code: 'overtime', name: 'Доплата за понаднормові', required: false, order: 2 },
                        { code: 'bonus', name: 'Премія', required: false, order: 3 },
                        { code: 'vacation_pay', name: 'Відпускні', required: false, order: 4 }
                    ],
                    deductions: [
                        { code: 'income_tax', name: 'ПДФО', required: true, order: 1 },
                        { code: 'military_tax', name: 'Військовий збір', required: true, order: 2 },
                        { code: 'social_tax', name: 'ЄСВ', required: true, order: 3 },
                        { code: 'other', name: 'Інші утримання', required: false, order: 4 }
                    ],
                    footer: {
                        netSalary: true,
                        signature: true,
                        date: true,
                        notes: false
                    }
                },
                styling: {
                    fontSize: '12px',
                    fontFamily: 'Arial, sans-serif',
                    headerColor: '#2c3e50',
                    borderColor: '#bdc3c7',
                    backgroundColor: '#ffffff'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.database.add('payslipTemplates', defaultTemplate);
            console.log('Створено базовий шаблон розрахункового листка');
        } catch (error) {
            console.error('Помилка створення базового шаблону:', error);
        }
    }

    bindEvents() {
        // Основні дії
        document.getElementById('generatePayslipsBtn')?.addEventListener('click', () => {
            this.showGeneratePayslipsDialog();
        });

        document.getElementById('templatesBtn')?.addEventListener('click', () => {
            this.showTemplatesModal();
        });

        document.getElementById('bulkPrintBtn')?.addEventListener('click', () => {
            this.showBulkPrintDialog();
        });

        // Період
        document.getElementById('periodSelect')?.addEventListener('change', (e) => {
            this.currentPeriod = e.target.value;
            this.filterPayslips();
        });

        // Пошук та фільтри
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterPayslips();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.filterPayslips();
        });

        document.getElementById('departmentFilter')?.addEventListener('change', (e) => {
            this.departmentFilter = e.target.value;
            this.filterPayslips();
        });

        // Перемикання видів
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.updatePayslipsView();
            });
        });

        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Збереження листка
        document.getElementById('savePayslipBtn')?.addEventListener('click', () => {
            this.savePayslip();
        });

        document.getElementById('previewPayslipBtn')?.addEventListener('click', () => {
            this.previewPayslip();
        });

        document.getElementById('printPayslipBtn')?.addEventListener('click', () => {
            this.printPayslip();
        });

        document.getElementById('cancelPayslipBtn')?.addEventListener('click', () => {
            this.hidePayslipModal();
        });

        // Шаблони
        document.getElementById('createTemplateBtn')?.addEventListener('click', () => {
            this.showTemplateBuilder();
        });

        document.getElementById('closeTemplatesBtn')?.addEventListener('click', () => {
            this.hideTemplatesModal();
        });

        // Конструктор шаблонів
        document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
            this.saveTemplate();
        });

        document.getElementById('previewTemplateBtn')?.addEventListener('click', () => {
            this.previewTemplate();
        });

        document.getElementById('cancelTemplateBtn')?.addEventListener('click', () => {
            this.hideTemplateBuilder();
        });

        // Попередній перегляд
        document.getElementById('printPreviewBtn')?.addEventListener('click', () => {
            this.printPreview();
        });

        document.getElementById('downloadPreviewBtn')?.addEventListener('click', () => {
            this.downloadPreviewPDF();
        });

        document.getElementById('closePreviewBtn')?.addEventListener('click', () => {
            this.hidePreviewModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
    }

    renderPayslipsList() {
        const filteredPayslips = this.getFilteredPayslips();

        if (filteredPayslips.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-invoice"></i>
                    <h3>Немає розрахункових листків</h3>
                    <p>Згенеруйте розрахункові листки для поточного періоду</p>
                    <button class="btn btn-primary" onclick="document.getElementById('generatePayslipsBtn').click()">
                        <i class="fas fa-plus"></i> Згенерувати листки
                    </button>
                </div>
            `;
        }

        if (this.currentView === 'grid') {
            return this.renderPayslipsGrid(filteredPayslips);
        }

        return `
            <div class="payslips-table-container">
                <table class="payslips-table">
                    <thead>
                        <tr>
                            <th>Співробітник</th>
                            <th>Посада</th>
                            <th>Підрозділ</th>
                            <th>Період</th>
                            <th>До виплати</th>
                            <th>Статус</th>
                            <th>Дата створення</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredPayslips.map(payslip => this.renderPayslipRow(payslip)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPayslipRow(payslip) {
        const employee = this.employees.find(e => e.id === payslip.employeeId);
        const totalAmount = this.calculateTotalAmount(payslip);
        
        return `
            <tr class="payslip-row" data-id="${payslip.id}">
                <td>
                    <div class="employee-info">
                        <strong>${employee?.fullName || 'Невідомий співробітник'}</strong>
                        <small>Таб. №${employee?.personnelNumber || 'N/A'}</small>
                    </div>
                </td>
                <td>${employee?.position || 'Не вказано'}</td>
                <td>${employee?.department || 'Не вказано'}</td>
                <td>${this.formatPeriod(payslip.period)}</td>
                <td class="amount">
                    <strong>${totalAmount.toLocaleString('uk-UA')} грн</strong>
                </td>
                <td>
                    <span class="status-badge ${payslip.status}">
                        ${this.getStatusText(payslip.status)}
                    </span>
                </td>
                <td>${this.formatDate(payslip.createdAt)}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="payslipsModule.viewPayslip(${payslip.id})" title="Переглянути">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="payslipsModule.editPayslip(${payslip.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="payslipsModule.printPayslip(${payslip.id})" title="Друк">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn-icon" onclick="payslipsModule.exportToPDF(${payslip.id})" title="Експорт в PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn-icon" onclick="payslipsModule.sendPayslip(${payslip.id})" title="Відправити">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <button class="btn-icon danger" onclick="payslipsModule.deletePayslip(${payslip.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderPayslipsGrid(payslips) {
        return `
            <div class="payslips-grid">
                ${payslips.map(payslip => this.renderPayslipCard(payslip)).join('')}
            </div>
        `;
    }

    renderPayslipCard(payslip) {
        const employee = this.employees.find(e => e.id === payslip.employeeId);
        const totalAmount = this.calculateTotalAmount(payslip);
        
        return `
            <div class="payslip-card" data-id="${payslip.id}">
                <div class="card-header">
                    <div class="employee-avatar">
                        ${employee?.photo ? 
                            `<img src="${employee.photo}" alt="${employee.fullName}">` :
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <span class="status-badge ${payslip.status}">
                        ${this.getStatusText(payslip.status)}
                    </span>
                </div>
                <div class="card-content">
                    <h4>${employee?.fullName || 'Невідомий'}</h4>
                    <p class="employee-position">${employee?.position || 'Не вказано'}</p>
                    <p class="payslip-period">${this.formatPeriod(payslip.period)}</p>
                    <div class="payslip-amount">
                        <strong>${totalAmount.toLocaleString('uk-UA')} грн</strong>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="payslipsModule.viewPayslip(${payslip.id})">
                        <i class="fas fa-eye"></i> Переглянути
                    </button>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="payslipsModule.printPayslip(${payslip.id})" title="Друк">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn-icon" onclick="payslipsModule.sendPayslip(${payslip.id})" title="Відправити">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPayslipForm() {
        const payslip = this.selectedPayslip || this.createDefaultPayslip();
        const employee = this.employees.find(e => e.id === payslip.employeeId);
        
        return `
            <div class="payslip-form">
                <div class="form-tabs">
                    <button type="button" class="tab-btn active" data-tab="basic">Основна інформація</button>
                    <button type="button" class="tab-btn" data-tab="earnings">Нарахування</button>
                    <button type="button" class="tab-btn" data-tab="deductions">Утримання</button>
                    <button type="button" class="tab-btn" data-tab="template">Шаблон</button>
                </div>

                <div class="tab-content active" id="basicTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Співробітник *</label>
                            <select name="employeeId" required ${this.selectedPayslip ? 'disabled' : ''}>
                                <option value="">Оберіть співробітника</option>
                                ${this.employees.map(emp => 
                                    `<option value="${emp.id}" ${payslip.employeeId === emp.id ? 'selected' : ''}>${emp.fullName} (${emp.personnelNumber})</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Період *</label>
                            <input type="month" name="period" value="${payslip.period}" required>
                        </div>
                        <div class="form-group">
                            <label>Шаблон</label>
                            <select name="templateId">
                                <option value="">Стандартний шаблон</option>
                                ${this.templates.map(template => 
                                    `<option value="${template.id}" ${payslip.templateId === template.id ? 'selected' : ''}>${template.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>

                    ${employee ? `
                        <div class="employee-details">
                            <h4>Інформація про співробітника</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Посада:</label>
                                    <span>${employee.position || 'Не вказано'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Підрозділ:</label>
                                    <span>${employee.department || 'Не вказано'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Оклад:</label>
                                    <span>${employee.salary?.amount || 0} грн</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="tab-content" id="earningsTab">
                    <h4>Нарахування</h4>
                    <div id="earningsContainer">
                        ${this.renderEarningsSection(payslip.earnings || [])}
                    </div>
                    <button type="button" class="btn btn-secondary" id="addEarningBtn">
                        <i class="fas fa-plus"></i> Додати нарахування
                    </button>
                </div>

                <div class="tab-content" id="deductionsTab">
                    <h4>Утримання</h4>
                    <div id="deductionsContainer">
                        ${this.renderDeductionsSection(payslip.deductions || [])}
                    </div>
                    <button type="button" class="btn btn-secondary" id="addDeductionBtn">
                        <i class="fas fa-plus"></i> Додати утримання
                    </button>
                </div>

                <div class="tab-content" id="templateTab">
                    <div class="template-settings">
                        <h4>Налаштування відображення</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="showCompanyLogo" ${payslip.settings?.showCompanyLogo ? 'checked' : ''}>
                                    Показувати логотип компанії
                                </label>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="showWorkingDays" ${payslip.settings?.showWorkingDays ? 'checked' : ''}>
                                    Показувати відпрацьовані дні
                                </label>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="showVacationBalance" ${payslip.settings?.showVacationBalance ? 'checked' : ''}>
                                    Показувати залишок відпустки
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="payslip-summary">
                    <div class="summary-row">
                        <span>Всього нараховано:</span>
                        <strong id="totalEarnings">0.00 грн</strong>
                    </div>
                    <div class="summary-row">
                        <span>Всього утримано:</span>
                        <strong id="totalDeductions">0.00 грн</strong>
                    </div>
                    <div class="summary-row total">
                        <span>До виплати:</span>
                        <strong id="totalPayment">0.00 грн</strong>
                    </div>
                </div>
            </div>
        `;
    }

    renderEarningsSection(earnings) {
        if (earnings.length === 0) {
            return `
                <div class="empty-section">
                    <p>Немає нарахувань. Додайте нарахування для цього періоду.</p>
                </div>
            `;
        }

        return earnings.map((earning, index) => `
            <div class="earning-item" data-index="${index}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Тип нарахування</label>
                        <select name="earnings[${index}][type]" required>
                            <option value="salary" ${earning.type === 'salary' ? 'selected' : ''}>Основна зарплата</option>
                            <option value="bonus" ${earning.type === 'bonus' ? 'selected' : ''}>Премія</option>
                            <option value="overtime" ${earning.type === 'overtime' ? 'selected' : ''}>Надурочні</option>
                            <option value="vacation" ${earning.type === 'vacation' ? 'selected' : ''}>Відпускні</option>
                            <option value="sickleave" ${earning.type === 'sickleave' ? 'selected' : ''}>Лікарняні</option>
                            <option value="allowance" ${earning.type === 'allowance' ? 'selected' : ''}>Доплата</option>
                            <option value="other" ${earning.type === 'other' ? 'selected' : ''}>Інше</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Опис</label>
                        <input type="text" name="earnings[${index}][description]" value="${earning.description || ''}" placeholder="Опис нарахування">
                    </div>
                    <div class="form-group">
                        <label>Сума (грн)</label>
                        <input type="number" name="earnings[${index}][amount]" value="${earning.amount || 0}" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-danger btn-sm" onclick="payslipsModule.removeEarning(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderDeductionsSection(deductions) {
        if (deductions.length === 0) {
            return `
                <div class="empty-section">
                    <p>Немає утримань. Додайте обов'язкові утримання (ПДФО, військовий збір).</p>
                </div>
            `;
        }

        return deductions.map((deduction, index) => `
            <div class="deduction-item" data-index="${index}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Тип утримання</label>
                        <select name="deductions[${index}][type]" required>
                            <option value="income_tax" ${deduction.type === 'income_tax' ? 'selected' : ''}>ПДФО (18%)</option>
                            <option value="military_tax" ${deduction.type === 'military_tax' ? 'selected' : ''}>Військовий збір (1.5%)</option>
                            <option value="pension" ${deduction.type === 'pension' ? 'selected' : ''}>ЄСВ</option>
                            <option value="union" ${deduction.type === 'union' ? 'selected' : ''}>Профспілки</option>
                            <option value="advance" ${deduction.type === 'advance' ? 'selected' : ''}>Аванс</option>
                            <option value="loan" ${deduction.type === 'loan' ? 'selected' : ''}>Позика</option>
                            <option value="other" ${deduction.type === 'other' ? 'selected' : ''}>Інше</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Опис</label>
                        <input type="text" name="deductions[${index}][description]" value="${deduction.description || ''}" placeholder="Опис утримання">
                    </div>
                    <div class="form-group">
                        <label>Сума (грн)</label>
                        <input type="number" name="deductions[${index}][amount]" value="${deduction.amount || 0}" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-danger btn-sm" onclick="payslipsModule.removeDeduction(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Основні методи роботи з листками
    async generatePayslipsForPeriod(period, employeeIds = null) {
        try {
            const employees = employeeIds ? 
                this.employees.filter(e => employeeIds.includes(e.id)) : 
                this.employees.filter(e => e.status === 'active');

            const generatedCount = 0;
            
            for (const employee of employees) {
                // Перевіряємо чи вже існує листок для цього періоду
                const existing = this.payslips.find(p => 
                    p.employeeId === employee.id && p.period === period
                );
                
                if (existing) {
                    continue; // Пропускаємо якщо вже існує
                }

                // Отримуємо дані зарплати з модуля payroll
                const payrollRecord = this.payrollData.find(p => 
                    p.employeeId === employee.id && p.period === period
                );

                if (!payrollRecord) {
                    console.warn(`Немає даних зарплати для ${employee.fullName} за ${period}`);
                    continue;
                }

                // Створюємо розрахунковий листок
                const payslip = {
                    employeeId: employee.id,
                    period: period,
                    templateId: null, // Використовуємо стандартний шаблон
                    status: 'generated',
                    earnings: this.generateEarningsFromPayroll(payrollRecord),
                    deductions: this.generateDeductionsFromPayroll(payrollRecord),
                    settings: {
                        showCompanyLogo: true,
                        showWorkingDays: true,
                        showVacationBalance: true
                    },
                    createdAt: new Date().toISOString(),
                    generatedAt: new Date().toISOString()
                };

                await this.database.add('payslips', payslip);
                generatedCount++;
            }

            await this.loadData();
            this.updatePayslipsView();
            
            hrSystem.showNotification(`Згенеровано ${generatedCount} розрахункових листків`, 'success');
            
        } catch (error) {
            console.error('Помилка генерації листків:', error);
            hrSystem.showNotification('Помилка генерації: ' + error.message, 'error');
        }
    }

    generateEarningsFromPayroll(payrollRecord) {
        const earnings = [];
        
        if (payrollRecord.baseSalary > 0) {
            earnings.push({
                type: 'salary',
                description: 'Основна заробітна плата',
                amount: payrollRecord.baseSalary
            });
        }
        
        if (payrollRecord.bonus > 0) {
            earnings.push({
                type: 'bonus',
                description: 'Премія',
                amount: payrollRecord.bonus
            });
        }
        
        if (payrollRecord.overtime > 0) {
            earnings.push({
                type: 'overtime',
                description: 'Доплата за надурочні',
                amount: payrollRecord.overtime
            });
        }
        
        return earnings;
    }

    generateDeductionsFromPayroll(payrollRecord) {
        const deductions = [];
        
        if (payrollRecord.incomeTax > 0) {
            deductions.push({
                type: 'income_tax',
                description: 'Податок на доходи фізичних осіб (18%)',
                amount: payrollRecord.incomeTax
            });
        }
        
        if (payrollRecord.militaryTax > 0) {
            deductions.push({
                type: 'military_tax',
                description: 'Військовий збір (1.5%)',
                amount: payrollRecord.militaryTax
            });
        }
        
        if (payrollRecord.socialTax > 0) {
            deductions.push({
                type: 'pension',
                description: 'Єдиний соціальний внесок',
                amount: payrollRecord.socialTax
            });
        }
        
        return deductions;
    }

    calculateTotalAmount(payslip) {
        const totalEarnings = (payslip.earnings || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalDeductions = (payslip.deductions || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        return totalEarnings - totalDeductions;
    }

    // Методи роботи з шаблонами

    // Допоміжні методи
    getCurrentPeriod() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    renderPeriodOptions() {
        const options = [];
        const currentDate = new Date();
        
        // Генеруємо опції для останніх 12 місяців
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const text = `${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;
            const selected = value === this.currentPeriod ? 'selected' : '';
            
            options.push(`<option value="${value}" ${selected}>${text}</option>`);
        }
        
        return options.join('');
    }

    getMonthName(monthIndex) {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        return months[monthIndex];
    }

    formatPeriod(period) {
        const [year, month] = period.split('-');
        return `${this.getMonthName(parseInt(month) - 1)} ${year}`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    getStatusText(status) {
        const statuses = {
            draft: 'Чернетка',
            generated: 'Згенеровано',
            sent: 'Відправлено',
            printed: 'Надруковано'
        };
        return statuses[status] || status;
    }

    getFilteredPayslips() {
        let filtered = [...this.payslips];

        // Фільтр за періодом
        if (this.currentPeriod) {
            filtered = filtered.filter(p => p.period === this.currentPeriod);
        }

        // Пошук
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(payslip => {
                const employee = this.employees.find(e => e.id === payslip.employeeId);
                return employee && employee.fullName.toLowerCase().includes(query);
            });
        }

        // Фільтр за статусом
        if (this.statusFilter && this.statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === this.statusFilter);
        }

        // Фільтр за підрозділом
        if (this.departmentFilter && this.departmentFilter !== 'all') {
            filtered = filtered.filter(payslip => {
                const employee = this.employees.find(e => e.id === payslip.employeeId);
                return employee && employee.departmentId == this.departmentFilter;
            });
        }

        return filtered;
    }

    getDepartments() {
        // Отримуємо унікальні підрозділи з співробітників
        const departments = [...new Set(this.employees.map(emp => emp.department).filter(Boolean))];
        return departments.map((name, index) => ({ id: index + 1, name }));
    }

    getGeneratedCount() {
        return this.payslips.filter(p => p.status === 'generated').length;
    }

    getSentCount() {
        return this.payslips.filter(p => p.status === 'sent').length;
    }

    createDefaultPayslip() {
        return {
            employeeId: null,
            period: this.currentPeriod,
            templateId: null,
            status: 'draft',
            earnings: [],
            deductions: [],
            settings: {
                showCompanyLogo: true,
                showWorkingDays: true,
                showVacationBalance: true
            }
        };
    }

    // Дії з листками
    async viewPayslip(id) {
        const payslip = this.payslips.find(p => p.id === id);
        if (payslip) {
            this.selectedPayslip = payslip;
            this.previewPayslip();
        }
    }

    async editPayslip(id) {
        const payslip = this.payslips.find(p => p.id === id);
        if (payslip) {
            this.selectedPayslip = payslip;
            this.showPayslipModal();
        }
    }

    async deletePayslip(id) {
        const payslip = this.payslips.find(p => p.id === id);
        if (!payslip) return;

        const employee = this.employees.find(e => e.id === payslip.employeeId);
        if (confirm(`Ви впевнені, що хочете видалити розрахунковий листок для ${employee?.fullName} за ${this.formatPeriod(payslip.period)}?`)) {
            try {
                await this.database.delete('payslips', id);
                await this.loadData();
                this.updatePayslipsView();
                hrSystem.showNotification('Розрахунковий листок видалено', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    // Модальні вікна та інтерфейс
    showPayslipModal(payslip = null) {
        this.selectedPayslip = payslip;
        const modal = document.getElementById('payslipModal');
        const title = document.getElementById('payslipModalTitle');
        const content = document.getElementById('payslipFormContent');
        
        title.innerHTML = payslip ? 
            '<i class="fas fa-file-invoice"></i> Редагувати розрахунковий листок' : 
            '<i class="fas fa-file-invoice"></i> Створити розрахунковий листок';

        content.innerHTML = this.renderPayslipForm();
        this.setupFormTabs();
        this.bindPayslipFormEvents();

        hrSystem.showModal(modal);
    }

    hidePayslipModal() {
        const modal = document.getElementById('payslipModal');
        hrSystem.closeModal(modal);
        this.selectedPayslip = null;
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

    bindPayslipFormEvents() {
        // Додавання нарахувань та утримань
        document.getElementById('addEarningBtn')?.addEventListener('click', () => {
            this.addEarning();
        });

        document.getElementById('addDeductionBtn')?.addEventListener('click', () => {
            this.addDeduction();
        });

        // Автоматичний перерахунок сум
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[name*="[amount]"]')) {
                this.recalculateTotals();
            }
        });
    }

    addEarning() {
        const container = document.getElementById('earningsContainer');
        const index = container.querySelectorAll('.earning-item').length;
        
        const newEarningHtml = `
            <div class="earning-item" data-index="${index}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Тип нарахування</label>
                        <select name="earnings[${index}][type]" required>
                            <option value="salary">Основна зарплата</option>
                            <option value="bonus">Премія</option>
                            <option value="overtime">Надурочні</option>
                            <option value="vacation">Відпускні</option>
                            <option value="sickleave">Лікарняні</option>
                            <option value="allowance">Доплата</option>
                            <option value="other">Інше</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Опис</label>
                        <input type="text" name="earnings[${index}][description]" placeholder="Опис нарахування">
                    </div>
                    <div class="form-group">
                        <label>Сума (грн)</label>
                        <input type="number" name="earnings[${index}][amount]" value="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-danger btn-sm" onclick="payslipsModule.removeEarning(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', newEarningHtml);
        this.recalculateTotals();
    }

    addDeduction() {
        const container = document.getElementById('deductionsContainer');
        const index = container.querySelectorAll('.deduction-item').length;
        
        const newDeductionHtml = `
            <div class="deduction-item" data-index="${index}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Тип утримання</label>
                        <select name="deductions[${index}][type]" required>
                            <option value="income_tax">ПДФО (18%)</option>
                            <option value="military_tax">Військовий збір (1.5%)</option>
                            <option value="pension">ЄСВ</option>
                            <option value="union">Профспілки</option>
                            <option value="advance">Аванс</option>
                            <option value="loan">Позика</option>
                            <option value="other">Інше</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Опис</label>
                        <input type="text" name="deductions[${index}][description]" placeholder="Опис утримання">
                    </div>
                    <div class="form-group">
                        <label>Сума (грн)</label>
                        <input type="number" name="deductions[${index}][amount]" value="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-danger btn-sm" onclick="payslipsModule.removeDeduction(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', newDeductionHtml);
        this.recalculateTotals();
    }

    removeEarning(index) {
        const item = document.querySelector(`[data-index="${index}"].earning-item`);
        if (item) {
            item.remove();
            this.recalculateTotals();
        }
    }

    removeDeduction(index) {
        const item = document.querySelector(`[data-index="${index}"].deduction-item`);
        if (item) {
            item.remove();
            this.recalculateTotals();
        }
    }

    recalculateTotals() {
        const earningInputs = document.querySelectorAll('input[name*="earnings"][name*="[amount]"]');
        const deductionInputs = document.querySelectorAll('input[name*="deductions"][name*="[amount]"]');
        
        let totalEarnings = 0;
        let totalDeductions = 0;
        
        earningInputs.forEach(input => {
            totalEarnings += parseFloat(input.value) || 0;
        });
        
        deductionInputs.forEach(input => {
            totalDeductions += parseFloat(input.value) || 0;
        });
        
        const totalPayment = totalEarnings - totalDeductions;
        
        document.getElementById('totalEarnings').textContent = totalEarnings.toLocaleString('uk-UA') + ' грн';
        document.getElementById('totalDeductions').textContent = totalDeductions.toLocaleString('uk-UA') + ' грн';
        document.getElementById('totalPayment').textContent = totalPayment.toLocaleString('uk-UA') + ' грн';
    }

    updatePayslipsView() {
        const container = document.getElementById('payslipsContainer');
        if (container) {
            container.innerHTML = this.renderPayslipsList();
        }
    }

    filterPayslips() {
        this.updatePayslipsView();
    }

    // Заглушки для методів, які будуть реалізовані
    async savePayslip() {
        hrSystem.showNotification('Функція збереження буде реалізована', 'info');
    }

    async previewPayslip() {
        hrSystem.showNotification('Функція попереднього перегляду буде реалізована', 'info');
    }

    /**
     * Друк розрахункового листка
     */
    async printPayslip(id) {
        try {
            const payslip = this.payslips.find(p => p.id === id);
            if (!payslip) {
                hrSystem.showNotification('Розрахунковий листок не знайдено', 'error');
                return;
            }

            const employee = this.employees.find(e => e.id === payslip.employeeId);
            const template = this.templates.find(t => t.id === payslip.templateId);
            
            if (!employee || !template) {
                hrSystem.showNotification('Не вдалося знайти дані для друку', 'error');
                return;
            }

            // Створюємо вікно для друку
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            const printContent = this.generatePrintablePayslip(payslip, employee, template);
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Розрахунковий листок - ${employee.fullName}</title>
                    <meta charset="utf-8">
                    <style>
                        ${this.getPrintStyles(template.styling)}
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${printContent}
                </body>
                </html>
            `);
            
            printWindow.document.close();

            // Оновлюємо статус листка
            if (payslip.status !== 'printed') {
                payslip.status = 'printed';
                payslip.printedAt = new Date().toISOString();
                await this.database.update('payslips', payslip);
                await this.loadData();
                this.updatePayslipsView();
            }

        } catch (error) {
            hrSystem.showNotification('Помилка друку: ' + error.message, 'error');
        }
    }

    /**
     * Генерація HTML для друку
     */
    generatePrintablePayslip(payslip, employee, template) {
        const companySettings = this.getCompanySettings();
        
        return `
            <div class="payslip-print">
                ${template.structure.header.companyName ? `
                    <div class="print-header">
                        <h1>${companySettings.companyName || 'Назва компанії'}</h1>
                        ${companySettings.edrpouCode ? `<p>Код ЄДРПОУ: ${companySettings.edrpouCode}</p>` : ''}
                    </div>
                ` : ''}
                
                ${template.structure.header.period ? `
                    <div class="print-period">
                        <h2>Розрахунковий листок за ${this.formatPeriod(payslip.period)}</h2>
                    </div>
                ` : ''}
                
                ${template.structure.header.employeeInfo ? `
                    <div class="print-employee">
                        <table class="employee-table">
                            <tr>
                                <td><strong>ПІБ:</strong></td>
                                <td>${employee.fullName}</td>
                            </tr>
                            <tr>
                                <td><strong>Табельний номер:</strong></td>
                                <td>${employee.personnelNumber || 'Не вказано'}</td>
                            </tr>
                            <tr>
                                <td><strong>Посада:</strong></td>
                                <td>${employee.position || 'Не вказано'}</td>
                            </tr>
                            <tr>
                                <td><strong>Підрозділ:</strong></td>
                                <td>${employee.department || 'Не вказано'}</td>
                            </tr>
                        </table>
                    </div>
                ` : ''}
                
                <div class="print-earnings">
                    <h3>Нарахування</h3>
                    <table class="amounts-table">
                        <thead>
                            <tr>
                                <th>Найменування</th>
                                <th>Сума (грн)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payslip.earnings.map(earning => `
                                <tr>
                                    <td>${earning.name}</td>
                                    <td class="amount">${earning.amount.toLocaleString('uk-UA', {minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td><strong>Всього нараховано:</strong></td>
                                <td class="amount"><strong>${payslip.totals.totalEarnings.toLocaleString('uk-UA', {minimumFractionDigits: 2})}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div class="print-deductions">
                    <h3>Утримання</h3>
                    <table class="amounts-table">
                        <thead>
                            <tr>
                                <th>Найменування</th>
                                <th>Сума (грн)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payslip.deductions.map(deduction => `
                                <tr>
                                    <td>${deduction.name}</td>
                                    <td class="amount">${deduction.amount.toLocaleString('uk-UA', {minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td><strong>Всього утримано:</strong></td>
                                <td class="amount"><strong>${payslip.totals.totalDeductions.toLocaleString('uk-UA', {minimumFractionDigits: 2})}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                ${template.structure.footer.netSalary ? `
                    <div class="print-net-salary">
                        <h2>До виплати: ${payslip.totals.netSalary.toLocaleString('uk-UA', {minimumFractionDigits: 2})} грн</h2>
                    </div>
                ` : ''}
                
                <div class="print-footer">
                    ${template.structure.footer.signature ? `
                        <div class="signature-section">
                            <p>Підпис: _____________________</p>
                        </div>
                    ` : ''}
                    ${template.structure.footer.date ? `
                        <div class="date-section">
                            <p>Дата: ${new Date().toLocaleDateString('uk-UA')}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Стилі для друку
     */
    getPrintStyles(styling) {
        return `
            @page {
                margin: 20mm;
                size: A4;
            }
            
            body {
                font-family: ${styling.fontFamily};
                font-size: ${styling.fontSize};
                line-height: 1.4;
                color: #000;
                margin: 0;
                padding: 0;
            }
            
            .payslip-print {
                width: 100%;
                max-width: 210mm;
                margin: 0 auto;
            }
            
            .print-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid ${styling.borderColor};
            }
            
            .print-header h1 {
                color: ${styling.headerColor};
                margin: 0 0 10px 0;
                font-size: 18px;
            }
            
            .print-period {
                text-align: center;
                margin-bottom: 20px;
            }
            
            .print-period h2 {
                color: ${styling.headerColor};
                margin: 0;
                font-size: 16px;
            }
            
            .print-employee {
                margin-bottom: 20px;
            }
            
            .employee-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .employee-table td {
                padding: 5px;
                border: 1px solid #ddd;
            }
            
            .employee-table td:first-child {
                width: 150px;
                background: #f8f9fa;
            }
            
            .print-earnings, .print-deductions {
                margin-bottom: 20px;
            }
            
            .print-earnings h3, .print-deductions h3 {
                color: ${styling.headerColor};
                margin: 0 0 10px 0;
                font-size: 14px;
                border-bottom: 1px solid ${styling.borderColor};
                padding-bottom: 5px;
            }
            
            .amounts-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
            }
            
            .amounts-table th,
            .amounts-table td {
                padding: 8px;
                border: 1px solid #ddd;
                text-align: left;
            }
            
            .amounts-table th {
                background: #f8f9fa;
                font-weight: bold;
            }
            
            .amounts-table .amount {
                text-align: right;
                width: 120px;
            }
            
            .total-row {
                background: #f0f0f0;
            }
            
            .print-net-salary {
                text-align: center;
                margin: 30px 0;
                padding: 15px;
                border: 3px solid ${styling.borderColor};
                background: #f8f9fa;
            }
            
            .print-net-salary h2 {
                color: ${styling.headerColor};
                margin: 0;
                font-size: 18px;
            }
            
            .print-footer {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
            }
            
            .signature-section,
            .date-section {
                flex: 1;
            }
            
            .date-section {
                text-align: right;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        `;
    }

    /**
     * Експорт в PDF (базова реалізація)
     */
    async exportToPDF(id) {
        try {
            const payslip = this.payslips.find(p => p.id === id);
            if (!payslip) {
                hrSystem.showNotification('Розрахунковий листок не знайдено', 'error');
                return;
            }

            const employee = this.employees.find(e => e.id === payslip.employeeId);
            const template = this.templates.find(t => t.id === payslip.templateId);
            
            if (!employee || !template) {
                hrSystem.showNotification('Не вдалося знайти дані для експорту', 'error');
                return;
            }

            // Використовуємо window.print() з CSS для PDF
            // У реальному проекті тут би використовувалася бібліотека як jsPDF або puppeteer
            const printContent = this.generatePrintablePayslip(payslip, employee, template);
            
            const pdfWindow = window.open('', '_blank', 'width=800,height=600');
            pdfWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PDF - ${employee.fullName} - ${this.formatPeriod(payslip.period)}</title>
                    <meta charset="utf-8">
                    <style>
                        ${this.getPrintStyles(template.styling)}
                    </style>
                </head>
                <body>
                    ${printContent}
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()" style="margin-right: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Друкувати / Зберегти як PDF
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Закрити
                        </button>
                    </div>
                </body>
                </html>
            `);
            
            pdfWindow.document.close();

        } catch (error) {
            hrSystem.showNotification('Помилка експорту в PDF: ' + error.message, 'error');
        }
    }

    /**
     * Отримання налаштувань компанії
     */
    getCompanySettings() {
        return {
            companyName: this.companySettings.companyName || 'ТОВ "Моя компанія"',
            edrpouCode: this.companySettings.edrpouCode || '12345678',
            currency: this.companySettings.currency || 'UAH'
        };
    }

    async sendPayslip(id) {
        hrSystem.showNotification('Функція відправки буде реалізована', 'info');
    }

    /**
     * Відкриття діалогу генерації розрахункових листків
     */
    showGeneratePayslipsDialog() {
        const modalHTML = `
            <div class="modal" id="generatePayslipsModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus"></i> Генерація розрахункових листків</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="generate-form">
                            <div class="form-group">
                                <label>Період</label>
                                <select id="generatePeriod" class="form-control">
                                    ${this.renderPeriodOptions()}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Шаблон розрахункового листка</label>
                                <select id="generateTemplate" class="form-control">
                                    ${this.renderTemplateOptions()}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Співробітники</label>
                                <div class="employees-selection">
                                    <div class="selection-header">
                                        <label>
                                            <input type="checkbox" id="selectAllEmployees" checked>
                                            Вибрати всіх співробітників
                                        </label>
                                        <span class="selected-count">(${this.employees.length} обрано)</span>
                                    </div>
                                    <div class="employees-list" id="employeesSelectionList">
                                        ${this.renderEmployeesSelection()}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Налаштування</label>
                                <div class="options-group">
                                    <label>
                                        <input type="checkbox" id="overwriteExisting">
                                        Перезаписати існуючі листки за цей період
                                    </label>
                                    <label>
                                        <input type="checkbox" id="autoCalculate" checked>
                                        Автоматично розрахувати суми на основі даних з payroll
                                    </label>
                                    <label>
                                        <input type="checkbox" id="markAsGenerated" checked>
                                        Позначити статус як "Згенеровано"
                                    </label>
                                </div>
                            </div>
                            
                            <div class="generation-summary" id="generationSummary">
                                <h4>Підсумок генерації:</h4>
                                <div class="summary-item">
                                    <span>Період:</span> <span id="summaryPeriod">${this.formatPeriod(this.currentPeriod)}</span>
                                </div>
                                <div class="summary-item">
                                    <span>Шаблон:</span> <span id="summaryTemplate">Стандартний</span>
                                </div>
                                <div class="summary-item">
                                    <span>Співробітників:</span> <span id="summaryEmployeesCount">${this.employees.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="confirmGenerateBtn">
                            <i class="fas fa-cog fa-spin" style="display: none;" id="generateSpinner"></i>
                            <i class="fas fa-plus" id="generateIcon"></i>
                            Згенерувати листки
                        </button>
                        <button class="btn btn-secondary" id="cancelGenerateBtn">
                            Скасувати
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('generatePayslipsModal');
        modal.classList.add('show');
        
        this.bindGenerateModalEvents();
    }

    renderTemplateOptions() {
        if (this.templates.length === 0) {
            return '<option value="">Немає доступних шаблонів</option>';
        }
        
        return this.templates.map(template => 
            `<option value="${template.id}" ${template.isDefault ? 'selected' : ''}>${template.name}</option>`
        ).join('');
    }

    renderEmployeesSelection() {
        return this.employees.map(employee => `
            <div class="employee-item">
                <label>
                    <input type="checkbox" class="employee-checkbox" value="${employee.id}" checked>
                    <span class="employee-info">
                        <strong>${employee.fullName}</strong>
                        <small>${employee.position || 'Посада не вказана'} • ${employee.department || 'Підрозділ не вказаний'}</small>
                    </span>
                </label>
            </div>
        `).join('');
    }

    bindGenerateModalEvents() {
        // Вибір всіх співробітників
        document.getElementById('selectAllEmployees')?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.employee-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            this.updateSelectedCount();
        });

        // Окремі чекбокси співробітників
        document.querySelectorAll('.employee-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedCount();
                this.updateSelectAllState();
            });
        });

        // Оновлення підсумку при зміні параметрів
        document.getElementById('generatePeriod')?.addEventListener('change', (e) => {
            document.getElementById('summaryPeriod').textContent = this.formatPeriod(e.target.value);
        });

        document.getElementById('generateTemplate')?.addEventListener('change', (e) => {
            const template = this.templates.find(t => t.id == e.target.value);
            document.getElementById('summaryTemplate').textContent = template ? template.name : 'Не вибрано';
        });

        // Генерація
        document.getElementById('confirmGenerateBtn')?.addEventListener('click', () => {
            this.generatePayslips();
        });

        // Скасування
        document.getElementById('cancelGenerateBtn')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('generatePayslipsModal'));
        });

        // Закриття модального вікна
        document.querySelector('#generatePayslipsModal .modal-close')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('generatePayslipsModal'));
        });
    }

    updateSelectedCount() {
        const selectedCount = document.querySelectorAll('.employee-checkbox:checked').length;
        document.querySelector('.selected-count').textContent = `(${selectedCount} обрано)`;
        document.getElementById('summaryEmployeesCount').textContent = selectedCount;
    }

    updateSelectAllState() {
        const allCheckboxes = document.querySelectorAll('.employee-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.employee-checkbox:checked');
        const selectAllCheckbox = document.getElementById('selectAllEmployees');
        
        if (checkedCheckboxes.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (checkedCheckboxes.length === allCheckboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
        }
    }

    /**
     * Генерація розрахункових листків
     */
    async generatePayslips() {
        const generateBtn = document.getElementById('confirmGenerateBtn');
        const generateSpinner = document.getElementById('generateSpinner');
        const generateIcon = document.getElementById('generateIcon');
        
        try {
            // Показуємо спінер
            generateSpinner.style.display = 'inline-block';
            generateIcon.style.display = 'none';
            generateBtn.disabled = true;

            // Збираємо параметри генерації
            const period = document.getElementById('generatePeriod').value;
            const templateId = parseInt(document.getElementById('generateTemplate').value);
            const selectedEmployeeIds = Array.from(document.querySelectorAll('.employee-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            const overwriteExisting = document.getElementById('overwriteExisting').checked;
            const autoCalculate = document.getElementById('autoCalculate').checked;
            const markAsGenerated = document.getElementById('markAsGenerated').checked;

            if (!templateId) {
                hrSystem.showNotification('Оберіть шаблон розрахункового листка', 'error');
                return;
            }

            if (selectedEmployeeIds.length === 0) {
                hrSystem.showNotification('Оберіть хоча б одного співробітника', 'error');
                return;
            }

            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                hrSystem.showNotification('Вибраний шаблон не знайдено', 'error');
                return;
            }

            // Перевіряємо існуючі листки
            const existingPayslips = this.payslips.filter(p => 
                p.period === period && selectedEmployeeIds.includes(p.employeeId)
            );

            if (existingPayslips.length > 0 && !overwriteExisting) {
                if (!confirm(`Знайдено ${existingPayslips.length} існуючих листків за цей період. Продовжити без перезапису?`)) {
                    return;
                }
            }

            let generated = 0;
            let updated = 0;
            let errors = 0;

            // Генеруємо листки для кожного співробітника
            for (const employeeId of selectedEmployeeIds) {
                try {
                    const employee = this.employees.find(e => e.id === employeeId);
                    if (!employee) continue;

                    // Перевіряємо чи існує листок
                    const existingPayslip = existingPayslips.find(p => p.employeeId === employeeId);
                    
                    if (existingPayslip && overwriteExisting) {
                        // Оновлюємо існуючий
                        const updatedPayslip = await this.updatePayslipFromPayroll(existingPayslip, template, autoCalculate);
                        if (markAsGenerated) {
                            updatedPayslip.status = 'generated';
                        }
                        updatedPayslip.updatedAt = new Date().toISOString();
                        
                        await this.database.update('payslips', updatedPayslip);
                        updated++;
                    } else if (!existingPayslip) {
                        // Створюємо новий
                        const newPayslip = await this.createPayslipFromTemplate(employee, template, period, autoCalculate);
                        if (markAsGenerated) {
                            newPayslip.status = 'generated';
                        }
                        
                        await this.database.add('payslips', newPayslip);
                        generated++;
                    }
                } catch (error) {
                    console.error(`Помилка генерації листка для співробітника ${employeeId}:`, error);
                    errors++;
                }
            }

            // Перезавантажуємо дані
            await this.loadData();
            this.updatePayslipsView();

            // Сховуємо модальне вікно
            this.hideModal(document.getElementById('generatePayslipsModal'));

            // Показуємо результат
            let resultMessage = '';
            if (generated > 0) resultMessage += `Створено: ${generated} листків. `;
            if (updated > 0) resultMessage += `Оновлено: ${updated} листків. `;
            if (errors > 0) resultMessage += `Помилок: ${errors}.`;
            
            if (generated > 0 || updated > 0) {
                hrSystem.showNotification(resultMessage || 'Листки успішно згенеровано', 'success');
            } else {
                hrSystem.showNotification('Жодних листків не було створено або оновлено', 'warning');
            }

        } catch (error) {
            hrSystem.showNotification('Помилка генерації листків: ' + error.message, 'error');
        } finally {
            // Приховуємо спінер
            generateSpinner.style.display = 'none';
            generateIcon.style.display = 'inline-block';
            generateBtn.disabled = false;
        }
    }

    /**
     * Створення розрахункового листка на основі шаблону
     */
    async createPayslipFromTemplate(employee, template, period, autoCalculate = true) {
        const payslip = {
            employeeId: employee.id,
            templateId: template.id,
            period: period,
            status: 'draft',
            earnings: [],
            deductions: [],
            totals: {
                totalEarnings: 0,
                totalDeductions: 0,
                netSalary: 0
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                autoCalculated: autoCalculate
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (autoCalculate) {
            // Отримуємо дані з payroll для автоматичного розрахунку
            await this.populatePayslipFromPayroll(payslip, employee, template, period);
        } else {
            // Створюємо порожні поля на основі шаблону
            this.populatePayslipFromTemplate(payslip, template);
        }

        return payslip;
    }

    /**
     * Заповнення листка даними з payroll модуля
     */
    async populatePayslipFromPayroll(payslip, employee, template, period) {
        try {
            // Отримуємо payroll дані за період
            const payrollRecords = await this.database.findByIndex('payroll', 'monthYear', period);
            const employeePayroll = payrollRecords.find(p => p.employeeId === employee.id);

            if (employeePayroll) {
                // Заповнюємо нарахування
                template.structure.earnings.forEach(earningTemplate => {
                    const amount = this.getPayrollAmount(employeePayroll, earningTemplate.code);
                    if (amount > 0 || earningTemplate.required) {
                        payslip.earnings.push({
                            code: earningTemplate.code,
                            name: earningTemplate.name,
                            amount: amount,
                            isCalculated: true
                        });
                    }
                });

                // Заповнюємо утримання
                template.structure.deductions.forEach(deductionTemplate => {
                    const amount = this.getPayrollDeduction(employeePayroll, deductionTemplate.code);
                    if (amount > 0 || deductionTemplate.required) {
                        payslip.deductions.push({
                            code: deductionTemplate.code,
                            name: deductionTemplate.name,
                            amount: amount,
                            isCalculated: true
                        });
                    }
                });
            } else {
                // Якщо немає payroll даних, створюємо порожні поля
                this.populatePayslipFromTemplate(payslip, template);
            }

            this.calculatePayslipTotals(payslip);

        } catch (error) {
            console.error('Помилка заповнення листка з payroll:', error);
            this.populatePayslipFromTemplate(payslip, template);
        }
    }

    /**
     * Заповнення листка на основі шаблону (без автоматичних розрахунків)
     */
    populatePayslipFromTemplate(payslip, template) {
        // Додаємо поля нарахувань з шаблону
        template.structure.earnings.forEach(earningTemplate => {
            payslip.earnings.push({
                code: earningTemplate.code,
                name: earningTemplate.name,
                amount: 0,
                isCalculated: false
            });
        });

        // Додаємо поля утримань з шаблону
        template.structure.deductions.forEach(deductionTemplate => {
            payslip.deductions.push({
                code: deductionTemplate.code,
                name: deductionTemplate.name,
                amount: 0,
                isCalculated: false
            });
        });

        this.calculatePayslipTotals(payslip);
    }

    /**
     * Отримання суми нарахування з payroll даних
     */
    getPayrollAmount(payrollData, code) {
        // Мапінг кодів нарахувань до полів payroll
        const earningsMapping = {
            'basic_salary': 'baseSalary',
            'overtime': 'overtimePay',
            'bonus': 'bonus',
            'vacation_pay': 'vacationPay',
            'sick_pay': 'sickPay',
            'allowance': 'allowances'
        };

        const field = earningsMapping[code];
        return field && payrollData[field] ? payrollData[field] : 0;
    }

    /**
     * Отримання суми утримання з payroll даних
     */
    getPayrollDeduction(payrollData, code) {
        // Мапінг кодів утримань до полів payroll
        const deductionsMapping = {
            'income_tax': 'incomeTax',
            'military_tax': 'militaryTax',
            'social_tax': 'socialTax',
            'pension': 'pensionContribution',
            'union': 'unionDues',
            'advance': 'advance',
            'other': 'otherDeductions'
        };

        const field = deductionsMapping[code];
        return field && payrollData[field] ? payrollData[field] : 0;
    }

    /**
     * Розрахунок підсумків листка
     */
    calculatePayslipTotals(payslip) {
        payslip.totals.totalEarnings = payslip.earnings.reduce((sum, item) => sum + (item.amount || 0), 0);
        payslip.totals.totalDeductions = payslip.deductions.reduce((sum, item) => sum + (item.amount || 0), 0);
        payslip.totals.netSalary = payslip.totals.totalEarnings - payslip.totals.totalDeductions;
    }

    calculateTotalAmount(payslip) {
        return payslip.totals ? payslip.totals.netSalary : 0;
    }

    /**
     * Оновлення існуючого листка з payroll даних
     */
    async updatePayslipFromPayroll(payslip, template, autoCalculate) {
        if (autoCalculate) {
            const employee = this.employees.find(e => e.id === payslip.employeeId);
            if (employee) {
                // Очищуємо поточні дані
                payslip.earnings = [];
                payslip.deductions = [];
                
                // Заповнюємо заново
                await this.populatePayslipFromPayroll(payslip, employee, template, payslip.period);
            }
        }
        
        return payslip;
    }

    /**
     * Відкриття модального вікна шаблонів
     */
    showTemplatesModal() {
        const modalHTML = `
            <div class="modal" id="templatesModal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2><i class="fas fa-clipboard-list"></i> Шаблони розрахункових листків</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="templates-toolbar">
                            <button class="btn btn-primary" id="createTemplateBtn">
                                <i class="fas fa-plus"></i> Новий шаблон
                            </button>
                            <button class="btn btn-secondary" id="templateBuilderBtn">
                                <i class="fas fa-tools"></i> Конструктор шаблонів
                            </button>
                            <button class="btn btn-secondary" id="importTemplateBtn">
                                <i class="fas fa-upload"></i> Імпорт
                            </button>
                        </div>
                        
                        <div class="templates-list">
                            ${this.renderTemplatesList()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Показуємо модальне вікно
        const modal = document.getElementById('templatesModal');
        modal.classList.add('show');
        
        // Обробники подій
        this.bindTemplatesModalEvents();
    }

    renderTemplatesList() {
        if (this.templates.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>Немає шаблонів</h3>
                    <p>Створіть перший шаблон розрахункового листка</p>
                </div>
            `;
        }

        return `
            <div class="templates-grid">
                ${this.templates.map(template => this.renderTemplateCard(template)).join('')}
            </div>
        `;
    }

    renderTemplateCard(template) {
        return `
            <div class="template-card" data-id="${template.id}">
                <div class="template-header">
                    <h4>${template.name}</h4>
                    ${template.isDefault ? '<span class="badge default">За замовчуванням</span>' : ''}
                </div>
                <div class="template-info">
                    <p>${template.description || 'Без опису'}</p>
                    <small>Тип: ${template.type}</small>
                </div>
                <div class="template-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="payslipsModule.editTemplate(${template.id})">
                        <i class="fas fa-edit"></i> Редагувати
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="payslipsModule.previewTemplate(${template.id})">
                        <i class="fas fa-eye"></i> Переглянути
                    </button>
                    ${!template.isDefault ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="payslipsModule.deleteTemplate(${template.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    bindTemplatesModalEvents() {
        document.getElementById('createTemplateBtn')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('templatesModal'));
            this.openTemplateBuilder();
        });

        document.getElementById('templateBuilderBtn')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('templatesModal'));
            this.openTemplateBuilder();
        });

        // Закриття модального вікна
        document.querySelector('#templatesModal .modal-close')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('templatesModal'));
        });
    }

    /**
     * Відкриття конструктора шаблонів
     */
    openTemplateBuilder(templateId = null) {
        let template = null;
        if (templateId) {
            template = this.templates.find(t => t.id === templateId);
        } else {
            // Створюємо новий шаблон на основі базового
            template = {
                name: 'Новий шаблон',
                type: 'custom',
                isDefault: false,
                description: '',
                structure: {
                    header: {
                        companyName: true,
                        period: true,
                        employeeInfo: true,
                        logo: false
                    },
                    earnings: [
                        { code: 'basic_salary', name: 'Основна заробітна плата', required: true, order: 1 }
                    ],
                    deductions: [
                        { code: 'income_tax', name: 'ПДФО', required: true, order: 1 }
                    ],
                    footer: {
                        netSalary: true,
                        signature: true,
                        date: true,
                        notes: false
                    }
                },
                styling: {
                    fontSize: '12px',
                    fontFamily: 'Arial, sans-serif',
                    headerColor: '#2c3e50',
                    borderColor: '#bdc3c7',
                    backgroundColor: '#ffffff'
                }
            };
        }

        const modalHTML = `
            <div class="modal" id="templateBuilderModal">
                <div class="modal-content extra-large">
                    <div class="modal-header">
                        <h2><i class="fas fa-tools"></i> Конструктор шаблонів</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="template-builder">
                            <div class="builder-sidebar">
                                <div class="builder-section">
                                    <h3>Основні налаштування</h3>
                                    <div class="form-group">
                                        <label>Назва шаблону</label>
                                        <input type="text" id="templateName" class="form-control" value="${template.name}">
                                    </div>
                                    <div class="form-group">
                                        <label>Опис</label>
                                        <textarea id="templateDescription" class="form-control" rows="3">${template.description || ''}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" id="templateIsDefault" ${template.isDefault ? 'checked' : ''}>
                                            Використовувати за замовчуванням
                                        </label>
                                    </div>
                                </div>

                                <div class="builder-section">
                                    <h3>Заголовок</h3>
                                    ${this.renderHeaderFields(template.structure.header)}
                                </div>

                                <div class="builder-section">
                                    <h3>Нарахування</h3>
                                    <div class="earnings-fields" id="earningsFieldsBuilder">
                                        ${this.renderEarningsFields(template.structure.earnings)}
                                    </div>
                                    <button class="btn btn-sm btn-outline-primary" id="addEarningFieldBuilder">
                                        <i class="fas fa-plus"></i> Додати поле
                                    </button>
                                </div>

                                <div class="builder-section">
                                    <h3>Утримання</h3>
                                    <div class="deductions-fields" id="deductionsFieldsBuilder">
                                        ${this.renderDeductionsFields(template.structure.deductions)}
                                    </div>
                                    <button class="btn btn-sm btn-outline-primary" id="addDeductionFieldBuilder">
                                        <i class="fas fa-plus"></i> Додати поле
                                    </button>
                                </div>

                                <div class="builder-section">
                                    <h3>Підвал</h3>
                                    ${this.renderFooterFields(template.structure.footer)}
                                </div>

                                <div class="builder-section">
                                    <h3>Стилізація</h3>
                                    ${this.renderStylingFields(template.styling)}
                                </div>
                            </div>

                            <div class="builder-preview">
                                <div class="preview-header">
                                    <h3>Попередній перегляд</h3>
                                    <button class="btn btn-sm btn-secondary" id="refreshPreview">
                                        <i class="fas fa-sync"></i> Оновити
                                    </button>
                                </div>
                                <div class="preview-content" id="templatePreview">
                                    ${this.renderTemplatePreview(template)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="saveTemplateBtn">
                            <i class="fas fa-save"></i> Зберегти шаблон
                        </button>
                        <button class="btn btn-secondary" id="cancelTemplateBtn">
                            Скасувати
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Показуємо модальне вікно
        const modal = document.getElementById('templateBuilderModal');
        modal.classList.add('show');
        
        // Зберігаємо поточний шаблон для редагування
        this.currentTemplate = template;
        this.currentTemplateId = templateId;
        
        // Обробники подій
        this.bindTemplateBuilderEvents();
    }

    renderHeaderFields(header) {
        return `
            <div class="field-group">
                <label><input type="checkbox" ${header.companyName ? 'checked' : ''} data-field="companyName"> Назва компанії</label>
                <label><input type="checkbox" ${header.period ? 'checked' : ''} data-field="period"> Період</label>
                <label><input type="checkbox" ${header.employeeInfo ? 'checked' : ''} data-field="employeeInfo"> Інформація про співробітника</label>
                <label><input type="checkbox" ${header.logo ? 'checked' : ''} data-field="logo"> Логотип компанії</label>
            </div>
        `;
    }

    renderEarningsFields(earnings) {
        return earnings.map((earning, index) => `
            <div class="field-item" data-index="${index}">
                <div class="field-row">
                    <input type="text" value="${earning.code}" placeholder="Код" class="field-code">
                    <input type="text" value="${earning.name}" placeholder="Назва" class="field-name">
                    <label><input type="checkbox" ${earning.required ? 'checked' : ''} class="field-required"> Обов'язкове</label>
                    <button class="btn btn-sm btn-danger remove-field" onclick="payslipsModule.removeBuilderField(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderDeductionsFields(deductions) {
        return deductions.map((deduction, index) => `
            <div class="field-item" data-index="${index}">
                <div class="field-row">
                    <input type="text" value="${deduction.code}" placeholder="Код" class="field-code">
                    <input type="text" value="${deduction.name}" placeholder="Назва" class="field-name">
                    <label><input type="checkbox" ${deduction.required ? 'checked' : ''} class="field-required"> Обов'язкове</label>
                    <button class="btn btn-sm btn-danger remove-field" onclick="payslipsModule.removeBuilderField(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderFooterFields(footer) {
        return `
            <div class="field-group">
                <label><input type="checkbox" ${footer.netSalary ? 'checked' : ''} data-field="netSalary"> Сума до виплати</label>
                <label><input type="checkbox" ${footer.signature ? 'checked' : ''} data-field="signature"> Підпис</label>
                <label><input type="checkbox" ${footer.date ? 'checked' : ''} data-field="date"> Дата</label>
                <label><input type="checkbox" ${footer.notes ? 'checked' : ''} data-field="notes"> Примітки</label>
            </div>
        `;
    }

    renderStylingFields(styling) {
        return `
            <div class="styling-group">
                <div class="form-group">
                    <label>Розмір шрифту</label>
                    <select id="templateFontSize" class="form-control">
                        <option value="10px" ${styling.fontSize === '10px' ? 'selected' : ''}>10px</option>
                        <option value="12px" ${styling.fontSize === '12px' ? 'selected' : ''}>12px</option>
                        <option value="14px" ${styling.fontSize === '14px' ? 'selected' : ''}>14px</option>
                        <option value="16px" ${styling.fontSize === '16px' ? 'selected' : ''}>16px</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Шрифт</label>
                    <select id="templateFontFamily" class="form-control">
                        <option value="Arial, sans-serif" ${styling.fontFamily.includes('Arial') ? 'selected' : ''}>Arial</option>
                        <option value="Times New Roman, serif" ${styling.fontFamily.includes('Times') ? 'selected' : ''}>Times New Roman</option>
                        <option value="Calibri, sans-serif" ${styling.fontFamily.includes('Calibri') ? 'selected' : ''}>Calibri</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Колір заголовка</label>
                    <input type="color" id="templateHeaderColor" class="form-control" value="${styling.headerColor}">
                </div>
                <div class="form-group">
                    <label>Колір рамки</label>
                    <input type="color" id="templateBorderColor" class="form-control" value="${styling.borderColor}">
                </div>
            </div>
        `;
    }

    renderTemplatePreview(template) {
        const styling = template.styling;
        return `
            <div class="payslip-preview" style="font-size: ${styling.fontSize}; font-family: ${styling.fontFamily}; border: 2px solid ${styling.borderColor};">
                ${template.structure.header.companyName ? '<div class="preview-header" style="color: ' + styling.headerColor + '; background: #f8f9fa; padding: 15px; text-align: center;"><h3>Назва компанії</h3></div>' : ''}
                
                ${template.structure.header.period ? '<div class="preview-period" style="text-align: center; margin: 10px 0;"><strong>Розрахунковий листок за [період]</strong></div>' : ''}
                
                ${template.structure.header.employeeInfo ? '<div class="preview-employee" style="margin: 15px 0;"><strong>ПІБ:</strong> [Прізвище Ім\'я По батькові]<br><strong>Посада:</strong> [Посада]<br><strong>Підрозділ:</strong> [Підрозділ]</div>' : ''}
                
                <div class="preview-earnings" style="margin: 20px 0;">
                    <h4 style="color: ${styling.headerColor}; border-bottom: 1px solid ${styling.borderColor}; padding-bottom: 5px;">Нарахування</h4>
                    ${template.structure.earnings.map(earning => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ddd;">
                            <span>${earning.name}</span>
                            <span>[сума]</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="preview-deductions" style="margin: 20px 0;">
                    <h4 style="color: ${styling.headerColor}; border-bottom: 1px solid ${styling.borderColor}; padding-bottom: 5px;">Утримання</h4>
                    ${template.structure.deductions.map(deduction => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ddd;">
                            <span>${deduction.name}</span>
                            <span>[сума]</span>
                        </div>
                    `).join('')}
                </div>
                
                ${template.structure.footer.netSalary ? '<div class="preview-total" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border: 2px solid ' + styling.borderColor + '; text-align: center;"><strong style="font-size: 18px;">До виплати: [сума] грн</strong></div>' : ''}
                
                <div class="preview-footer" style="margin-top: 30px; display: flex; justify-content: space-between;">
                    ${template.structure.footer.signature ? '<div>Підпис: _________________</div>' : ''}
                    ${template.structure.footer.date ? '<div>Дата: [дата]</div>' : ''}
                </div>
            </div>
        `;
    }

    bindTemplateBuilderEvents() {
        // Збереження шаблону
        document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
            this.saveTemplate();
        });

        // Скасування
        document.getElementById('cancelTemplateBtn')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('templateBuilderModal'));
        });

        // Оновлення попереднього перегляду
        document.getElementById('refreshPreview')?.addEventListener('click', () => {
            this.refreshTemplatePreview();
        });

        // Додавання полів
        document.getElementById('addEarningFieldBuilder')?.addEventListener('click', () => {
            this.addBuilderField('earnings');
        });

        document.getElementById('addDeductionFieldBuilder')?.addEventListener('click', () => {
            this.addBuilderField('deductions');
        });

        // Закриття модального вікна
        document.querySelector('#templateBuilderModal .modal-close')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('templateBuilderModal'));
        });
    }

    addBuilderField(type) {
        const container = document.getElementById(`${type}FieldsBuilder`);
        const index = container.querySelectorAll('.field-item').length;
        
        const fieldHTML = `
            <div class="field-item" data-index="${index}">
                <div class="field-row">
                    <input type="text" value="" placeholder="Код" class="field-code">
                    <input type="text" value="" placeholder="Назва" class="field-name">
                    <label><input type="checkbox" class="field-required"> Обов'язкове</label>
                    <button class="btn btn-sm btn-danger remove-field" onclick="payslipsModule.removeBuilderField(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', fieldHTML);
    }

    removeBuilderField(button) {
        const fieldItem = button.closest('.field-item');
        if (fieldItem) {
            fieldItem.remove();
        }
    }

    refreshTemplatePreview() {
        const template = this.collectTemplateData();
        const previewContainer = document.getElementById('templatePreview');
        previewContainer.innerHTML = this.renderTemplatePreview(template);
    }

    collectTemplateData() {
        const template = {
            name: document.getElementById('templateName').value,
            description: document.getElementById('templateDescription').value,
            isDefault: document.getElementById('templateIsDefault').checked,
            type: 'custom',
            structure: {
                header: {},
                earnings: [],
                deductions: [],
                footer: {}
            },
            styling: {
                fontSize: document.getElementById('templateFontSize').value,
                fontFamily: document.getElementById('templateFontFamily').value,
                headerColor: document.getElementById('templateHeaderColor').value,
                borderColor: document.getElementById('templateBorderColor').value,
                backgroundColor: '#ffffff'
            }
        };

        // Збираємо налаштування заголовка
        document.querySelectorAll('.builder-section:nth-child(2) input[type="checkbox"]').forEach(checkbox => {
            template.structure.header[checkbox.dataset.field] = checkbox.checked;
        });

        // Збираємо поля нарахувань
        document.querySelectorAll('#earningsFieldsBuilder .field-item').forEach(item => {
            const code = item.querySelector('.field-code').value;
            const name = item.querySelector('.field-name').value;
            const required = item.querySelector('.field-required').checked;
            
            if (code && name) {
                template.structure.earnings.push({ code, name, required, order: template.structure.earnings.length + 1 });
            }
        });

        // Збираємо поля утримань
        document.querySelectorAll('#deductionsFieldsBuilder .field-item').forEach(item => {
            const code = item.querySelector('.field-code').value;
            const name = item.querySelector('.field-name').value;
            const required = item.querySelector('.field-required').checked;
            
            if (code && name) {
                template.structure.deductions.push({ code, name, required, order: template.structure.deductions.length + 1 });
            }
        });

        // Збираємо налаштування підвалу
        document.querySelectorAll('.builder-section:nth-last-child(2) input[type="checkbox"]').forEach(checkbox => {
            template.structure.footer[checkbox.dataset.field] = checkbox.checked;
        });

        return template;
    }

    async saveTemplate() {
        try {
            const template = this.collectTemplateData();

            if (!template.name.trim()) {
                hrSystem.showNotification('Введіть назву шаблону', 'error');
                return;
            }

            if (template.structure.earnings.length === 0) {
                hrSystem.showNotification('Додайте хоча б одне поле нарахування', 'error');
                return;
            }

            template.createdAt = new Date().toISOString();
            template.updatedAt = new Date().toISOString();

            if (this.currentTemplateId) {
                // Оновлюємо існуючий шаблон
                template.id = this.currentTemplateId;
                await this.database.update('payslipTemplates', template);
                hrSystem.showNotification('Шаблон оновлено успішно', 'success');
            } else {
                // Створюємо новий шаблон
                await this.database.add('payslipTemplates', template);
                hrSystem.showNotification('Шаблон створено успішно', 'success');
            }

            await this.loadData();
            this.hideModal(document.getElementById('templateBuilderModal'));

        } catch (error) {
            hrSystem.showNotification('Помилка збереження шаблону: ' + error.message, 'error');
        }
    }

    async editTemplate(id) {
        this.hideModal(document.getElementById('templatesModal'));
        this.openTemplateBuilder(id);
    }

    async deleteTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;

        if (confirm(`Ви впевнені, що хочете видалити шаблон "${template.name}"?`)) {
            try {
                await this.database.delete('payslipTemplates', id);
                await this.loadData();
                
                // Оновлюємо список шаблонів в модальному вікні
                const templatesList = document.querySelector('#templatesModal .templates-list');
                if (templatesList) {
                    templatesList.innerHTML = this.renderTemplatesList();
                }
                
                hrSystem.showNotification('Шаблон видалено успішно', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка видалення шаблону: ' + error.message, 'error');
            }
        }
    }

    async previewTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;

        const modalHTML = `
            <div class="modal" id="templatePreviewModal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2><i class="fas fa-eye"></i> Попередній перегляд шаблону: ${template.name}</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="template-preview-container">
                            ${this.renderTemplatePreview(template)}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="payslipsModule.hideModal(document.getElementById('templatePreviewModal'))">
                            Закрити
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('templatePreviewModal');
        modal.classList.add('show');

        // Закриття модального вікна
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.hideModal(modal);
        });
    }

    /**
     * Діалог масового друку
     */
    showBulkPrintDialog() {
        const modalHTML = `
            <div class="modal" id="bulkPrintModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-print"></i> Масовий друк розрахункових листків</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="bulk-print-form">
                            <div class="form-group">
                                <label>Період</label>
                                <select id="bulkPrintPeriod" class="form-control">
                                    ${this.renderPeriodOptions()}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Статус листків</label>
                                <select id="bulkPrintStatus" class="form-control">
                                    <option value="all">Всі статуси</option>
                                    <option value="generated" selected>Згенеровані</option>
                                    <option value="draft">Чернетки</option>
                                    <option value="sent">Відправлені</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Підрозділ</label>
                                <select id="bulkPrintDepartment" class="form-control">
                                    <option value="all">Всі підрозділи</option>
                                    ${this.getDepartments().map(dept => 
                                        `<option value="${dept.id}">${dept.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Параметри друку</label>
                                <div class="options-group">
                                    <label>
                                        <input type="checkbox" id="bulkPrintSeparatePages" checked>
                                        Кожен листок на окремій сторінці
                                    </label>
                                    <label>
                                        <input type="checkbox" id="bulkPrintUpdateStatus">
                                        Позначити як "Надруковано" після друку
                                    </label>
                                    <label>
                                        <input type="checkbox" id="bulkPrintSortByName" checked>
                                        Сортувати за ПІБ співробітника
                                    </label>
                                </div>
                            </div>
                            
                            <div class="preview-section">
                                <h4>Попередній перегляд:</h4>
                                <div class="bulk-preview" id="bulkPrintPreview">
                                    <p>Вибрано листків: <span id="bulkPreviewCount">0</span></p>
                                    <div class="preview-list" id="bulkPreviewList">
                                        <!-- Список буде заповнений динамічно -->
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm" id="refreshBulkPreview">
                                    <i class="fas fa-sync"></i> Оновити попередній перегляд
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="confirmBulkPrintBtn">
                            <i class="fas fa-print"></i> Друкувати всі
                        </button>
                        <button class="btn btn-success" id="bulkExportPDFBtn">
                            <i class="fas fa-file-pdf"></i> Експортувати в PDF
                        </button>
                        <button class="btn btn-secondary" id="cancelBulkPrintBtn">
                            Скасувати
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('bulkPrintModal');
        modal.classList.add('show');
        
        this.bindBulkPrintModalEvents();
        this.updateBulkPrintPreview();
    }

    bindBulkPrintModalEvents() {
        // Оновлення попереднього перегляду при зміні параметрів
        ['bulkPrintPeriod', 'bulkPrintStatus', 'bulkPrintDepartment'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.updateBulkPrintPreview();
            });
        });

        // Ручне оновлення попереднього перегляду
        document.getElementById('refreshBulkPreview')?.addEventListener('click', () => {
            this.updateBulkPrintPreview();
        });

        // Масовий друк
        document.getElementById('confirmBulkPrintBtn')?.addEventListener('click', () => {
            this.performBulkPrint();
        });

        // Масовий експорт в PDF
        document.getElementById('bulkExportPDFBtn')?.addEventListener('click', () => {
            this.performBulkExportPDF();
        });

        // Закриття
        document.getElementById('cancelBulkPrintBtn')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('bulkPrintModal'));
        });

        document.querySelector('#bulkPrintModal .modal-close')?.addEventListener('click', () => {
            this.hideModal(document.getElementById('bulkPrintModal'));
        });
    }

    updateBulkPrintPreview() {
        const period = document.getElementById('bulkPrintPeriod')?.value;
        const status = document.getElementById('bulkPrintStatus')?.value;
        const department = document.getElementById('bulkPrintDepartment')?.value;

        let filteredPayslips = this.payslips.filter(payslip => {
            if (period && payslip.period !== period) return false;
            if (status !== 'all' && payslip.status !== status) return false;
            
            if (department !== 'all') {
                const employee = this.employees.find(e => e.id === payslip.employeeId);
                if (!employee || employee.departmentId != department) return false;
            }
            
            return true;
        });

        // Сортування за ПІБ
        if (document.getElementById('bulkPrintSortByName')?.checked) {
            filteredPayslips.sort((a, b) => {
                const empA = this.employees.find(e => e.id === a.employeeId);
                const empB = this.employees.find(e => e.id === b.employeeId);
                return (empA?.fullName || '').localeCompare(empB?.fullName || '');
            });
        }

        // Оновлюємо лічильник
        document.getElementById('bulkPreviewCount').textContent = filteredPayslips.length;

        // Оновлюємо список
        const previewList = document.getElementById('bulkPreviewList');
        if (filteredPayslips.length === 0) {
            previewList.innerHTML = '<p class="text-muted">Немає листків для друку за вибраними критеріями</p>';
        } else {
            previewList.innerHTML = `
                <div class="preview-items">
                    ${filteredPayslips.slice(0, 10).map(payslip => {
                        const employee = this.employees.find(e => e.id === payslip.employeeId);
                        return `
                            <div class="preview-item">
                                <span class="employee-name">${employee?.fullName || 'Невідомий'}</span>
                                <span class="payslip-period">${this.formatPeriod(payslip.period)}</span>
                                <span class="payslip-amount">${this.calculateTotalAmount(payslip).toLocaleString('uk-UA')} грн</span>
                            </div>
                        `;
                    }).join('')}
                    ${filteredPayslips.length > 10 ? `<p class="text-muted">... та ще ${filteredPayslips.length - 10} листків</p>` : ''}
                </div>
            `;
        }

        // Зберігаємо відфільтровані листки для подальшого використання
        this.bulkPrintPayslips = filteredPayslips;
    }

    async performBulkPrint() {
        if (!this.bulkPrintPayslips || this.bulkPrintPayslips.length === 0) {
            hrSystem.showNotification('Немає листків для друку', 'warning');
            return;
        }

        try {
            const separatePages = document.getElementById('bulkPrintSeparatePages')?.checked;
            const updateStatus = document.getElementById('bulkPrintUpdateStatus')?.checked;

            // Створюємо HTML для друку
            let printContent = '';
            const templates = new Map();

            for (let i = 0; i < this.bulkPrintPayslips.length; i++) {
                const payslip = this.bulkPrintPayslips[i];
                const employee = this.employees.find(e => e.id === payslip.employeeId);
                
                if (!templates.has(payslip.templateId)) {
                    templates.set(payslip.templateId, this.templates.find(t => t.id === payslip.templateId));
                }
                const template = templates.get(payslip.templateId);
                
                if (employee && template) {
                    printContent += this.generatePrintablePayslip(payslip, employee, template);
                    
                    if (separatePages && i < this.bulkPrintPayslips.length - 1) {
                        printContent += '<div style="page-break-after: always;"></div>';
                    }
                }
            }

            // Відкриваємо вікно друку
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            const firstTemplate = templates.values().next().value;
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Масовий друк розрахункових листків - ${this.formatPeriod(this.bulkPrintPayslips[0].period)}</title>
                    <meta charset="utf-8">
                    <style>
                        ${this.getPrintStyles(firstTemplate?.styling || {})}
                        .payslip-print:not(:last-child) {
                            margin-bottom: 40px;
                        }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${printContent}
                </body>
                </html>
            `);
            
            printWindow.document.close();

            // Оновлюємо статуси листків
            if (updateStatus) {
                for (const payslip of this.bulkPrintPayslips) {
                    if (payslip.status !== 'printed') {
                        payslip.status = 'printed';
                        payslip.printedAt = new Date().toISOString();
                        await this.database.update('payslips', payslip);
                    }
                }
                
                await this.loadData();
                this.updatePayslipsView();
            }

            // Закриваємо модальне вікно
            this.hideModal(document.getElementById('bulkPrintModal'));

            hrSystem.showNotification(`Надіслано на друк ${this.bulkPrintPayslips.length} листків`, 'success');

        } catch (error) {
            hrSystem.showNotification('Помилка масового друку: ' + error.message, 'error');
        }
    }

    async performBulkExportPDF() {
        if (!this.bulkPrintPayslips || this.bulkPrintPayslips.length === 0) {
            hrSystem.showNotification('Немає листків для експорту', 'warning');
            return;
        }

        try {
            // Створюємо HTML для PDF
            let pdfContent = '';
            const templates = new Map();

            for (let i = 0; i < this.bulkPrintPayslips.length; i++) {
                const payslip = this.bulkPrintPayslips[i];
                const employee = this.employees.find(e => e.id === payslip.employeeId);
                
                if (!templates.has(payslip.templateId)) {
                    templates.set(payslip.templateId, this.templates.find(t => t.id === payslip.templateId));
                }
                const template = templates.get(payslip.templateId);
                
                if (employee && template) {
                    pdfContent += this.generatePrintablePayslip(payslip, employee, template);
                    
                    if (i < this.bulkPrintPayslips.length - 1) {
                        pdfContent += '<div style="page-break-after: always;"></div>';
                    }
                }
            }

            // Відкриваємо вікно для PDF
            const pdfWindow = window.open('', '_blank', 'width=800,height=600');
            const firstTemplate = templates.values().next().value;
            
            pdfWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PDF Експорт - ${this.formatPeriod(this.bulkPrintPayslips[0].period)} - ${this.bulkPrintPayslips.length} листків</title>
                    <meta charset="utf-8">
                    <style>
                        ${this.getPrintStyles(firstTemplate?.styling || {})}
                        .payslip-print:not(:last-child) {
                            margin-bottom: 40px;
                        }
                    </style>
                </head>
                <body>
                    ${pdfContent}
                    <div style="text-align: center; margin-top: 20px; page-break-inside: avoid;">
                        <button onclick="window.print()" style="margin-right: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Зберегти як PDF / Друкувати
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Закрити
                        </button>
                        <p style="margin-top: 10px; font-size: 12px; color: #666;">
                            Всього листків: ${this.bulkPrintPayslips.length} | Період: ${this.formatPeriod(this.bulkPrintPayslips[0].period)}
                        </p>
                    </div>
                </body>
                </html>
            `);
            
            pdfWindow.document.close();

            // Закриваємо модальне вікно
            this.hideModal(document.getElementById('bulkPrintModal'));

            hrSystem.showNotification(`Підготовлено до експорту ${this.bulkPrintPayslips.length} листків`, 'success');

        } catch (error) {
            hrSystem.showNotification('Помилка експорту в PDF: ' + error.message, 'error');
        }
    }

    hideModal(modal) {
        hrSystem.closeModal(modal);
    }
}

// Глобальна змінна payslipsModule оголошена в hr-system.js
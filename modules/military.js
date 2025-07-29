/**
 * Military Registry Module - Модуль військового обліку
 */

class MilitaryModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.employees = [];
        this.departments = [];
        this.filteredData = [];
        this.currentView = 'table';
        this.editingId = null;
        
        // Текстові відповідники для кодів
        this.statusTexts = {
            'liable': 'Військовозобов\'язаний',
            'not_liable': 'Не військовозобов\'язаний',
            'limited': 'Обмежено придатний',
            'unfit': 'Непридатний до військової служби'
        };
        
        this.branchTexts = {
            'ground_forces': 'Сухопутні війська',
            'navy': 'ВМС України',
            'air_force': 'Повітряні Сили',
            'special_operations': 'ССО',
            'territorial_defense': 'ТрО',
            'other': 'Інше'
        };
        
        this.healthTexts = {
            'A': 'А - придатний',
            'B': 'Б - з обмеженнями',
            'C': 'В - обмежено придатний',
            'D': 'Г - тимчасово непридатний',
            'E': 'Д - непридатний'
        };
    }

    async render() {
        await this.loadData();

        return `
            <div class="military-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-shield-alt"></i> Військовий облік</h1>
                        <p>Облік військовозобов'язаних співробітників відповідно до чинного законодавства України</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addRegistrationBtn">
                            <i class="fas fa-plus"></i> Додати до обліку
                        </button>
                        <button class="btn btn-secondary" id="exportRegistryBtn">
                            <i class="fas fa-file-excel"></i> Експорт в Excel
                        </button>
                        <button class="btn btn-secondary" id="printRegistryBtn">
                            <i class="fas fa-print"></i> Друк реєстру
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon liable">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number" id="liableCount">${this.getStatusCount('liable')}</div>
                            <div class="stat-label">Військовозобов'язаних</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon limited">
                            <i class="fas fa-user-minus"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number" id="limitedCount">${this.getStatusCount('limited')}</div>
                            <div class="stat-label">Обмежено придатних</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon unfit">
                            <i class="fas fa-user-times"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number" id="unfitCount">${this.getStatusCount('unfit')}</div>
                            <div class="stat-label">Непридатних</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon not-liable">
                            <i class="fas fa-user-slash"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number" id="notLiableCount">${this.getStatusCount('not_liable')}</div>
                            <div class="stat-label">Не військовозобов'язаних</div>
                        </div>
                    </div>
                </div>

                <!-- Фільтри та пошук -->
                <div class="controls-panel">
                    <div class="search-section">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Пошук за ПІБ, посадою, військовим званням...">
                            <i class="fas fa-search search-icon"></i>
                        </div>
                        <div class="filters">
                            <select id="statusFilter" class="filter-select">
                                <option value="all">Всі статуси</option>
                                <option value="liable">Військовозобов'язані</option>
                                <option value="not_liable">Не військовозобов'язані</option>
                                <option value="limited">Обмежено придатні</option>
                                <option value="unfit">Непридатні</option>
                            </select>
                            <select id="departmentFilter" class="filter-select">
                                <option value="all">Всі підрозділи</option>
                                ${this.departments.map(dept => 
                                    `<option value="${dept.id}">${dept.name}</option>`
                                ).join('')}
                            </select>
                            <select id="branchFilter" class="filter-select">
                                <option value="all">Всі роди військ</option>
                                <option value="ground_forces">Сухопутні війська</option>
                                <option value="navy">ВМС</option>
                                <option value="air_force">Повітряні Сили</option>
                                <option value="special_operations">ССО</option>
                                <option value="territorial_defense">ТрО</option>
                                <option value="other">Інше</option>
                            </select>
                            <select id="healthFilter" class="filter-select">
                                <option value="all">Всі категорії здоров'я</option>
                                <option value="A">А - придатний</option>
                                <option value="B">Б - з обмеженнями</option>
                                <option value="C">В - обмежено придатний</option>
                                <option value="D">Г - тимчасово непридатний</option>
                                <option value="E">Д - непридатний</option>
                            </select>
                        </div>
                    </div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="table" title="Таблиця">
                            <i class="fas fa-table"></i>
                        </button>
                        <button class="view-btn" data-view="cards" title="Картки">
                            <i class="fas fa-th-large"></i>
                        </button>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="content-area">
                    <div id="tableView" class="table-view">
                        <div class="table-container">
                            ${this.renderTable()}
                        </div>
                    </div>

                    <div id="cardsView" class="cards-view" style="display: none;">
                        <div class="cards-grid" id="cardsGrid">
                            ${this.renderCards()}
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно додавання/редагування -->
                <div id="militaryModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2 id="modalTitle">
                                <i class="fas fa-shield-alt"></i> Додати до військового обліку
                            </h2>
                            <button class="modal-close" id="closeModal">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderForm()}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="saveMilitaryBtn">
                                <i class="fas fa-save"></i> Зберегти
                            </button>
                            <button type="button" class="btn btn-secondary" id="cancelBtn">
                                <i class="fas fa-times"></i> Скасувати
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно перегляду -->
                <div id="viewModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="viewModalTitle">
                                <i class="fas fa-eye"></i> Перегляд військового обліку
                            </h2>
                            <button class="modal-close" id="closeViewModal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="viewModalContent">
                                <!-- Контент заповнюється динамічно -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="editFromViewBtn">
                                <i class="fas fa-edit"></i> Редагувати
                            </button>
                            <button type="button" class="btn btn-secondary" id="closeViewBtn">
                                <i class="fas fa-times"></i> Закрити
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.applyFilters();
    }

    async loadData() {
        try {
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.filteredData = [...this.employees];
        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            throw error;
        }
    }

    bindEvents() {
        // Кнопки дій
        document.getElementById('addRegistrationBtn')?.addEventListener('click', () => {
            this.openAddModal();
        });
        
        document.getElementById('exportRegistryBtn')?.addEventListener('click', () => {
            this.exportToExcel();
        });
        
        document.getElementById('printRegistryBtn')?.addEventListener('click', () => {
            this.printRegistry();
        });
        
        // Пошук та фільтри
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.applyFilters();
        });
        
        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('departmentFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('branchFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('healthFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Перемикання видів
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });
        
        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Основне модальне вікно
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeModal('militaryModal');
        });
        
        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.closeModal('militaryModal');
        });
        
        document.getElementById('saveMilitaryBtn')?.addEventListener('click', () => {
            this.saveMilitaryData();
        });
        
        // Модальне вікно перегляду
        document.getElementById('closeViewModal')?.addEventListener('click', () => {
            this.closeModal('viewModal');
        });
        
        document.getElementById('closeViewBtn')?.addEventListener('click', () => {
            this.closeModal('viewModal');
        });
        
        document.getElementById('editFromViewBtn')?.addEventListener('click', () => {
            this.editFromView();
        });
        
        // Закриття по кліку поза вікном
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Вибір співробітника
        document.getElementById('employeeSelect')?.addEventListener('change', (e) => {
            this.handleEmployeeSelect(e.target.value);
        });
    }

    getStatusCount(status) {
        return this.employees.filter(emp => emp.military?.status === status).length;
    }

    renderTable() {
        if (this.filteredData.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Нічого не знайдено</h3>
                    <p>Спробуйте змінити параметри пошуку або фільтрів</p>
                </div>
            `;
        }

        return `
            <table class="registry-table">
                <thead>
                    <tr>
                        <th>ПІБ</th>
                        <th>Посада</th>
                        <th>Підрозділ</th>
                        <th>Статус</th>
                        <th>Військове звання</th>
                        <th>ВОС</th>
                        <th>Військовий квиток</th>
                        <th>Рід військ</th>
                        <th>Військкомат</th>
                        <th>Категорія здоров'я</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredData.map(emp => this.renderTableRow(emp)).join('')}
                </tbody>
            </table>
        `;
    }

    renderTableRow(employee) {
        const department = this.departments.find(d => d.id === employee.departmentId);
        const military = employee.military || {};
        
        return `
            <tr>
                <td>
                    <div class="employee-name">
                        <strong>${employee.fullName}</strong>
                        <small>Таб. №${employee.personnelNumber}</small>
                    </div>
                </td>
                <td>${employee.position || 'Не вказано'}</td>
                <td>${department ? department.name : 'Невідомий підрозділ'}</td>
                <td>
                    ${military.status ? `<span class="status-badge ${military.status}">${this.statusTexts[military.status]}</span>` : 'Не вказано'}
                </td>
                <td>${military.rank || 'Не вказано'}</td>
                <td>${military.specialty || 'Не вказано'}</td>
                <td>${military.idNumber || 'Не вказано'}</td>
                <td>${military.branch ? this.branchTexts[military.branch] : 'Не вказано'}</td>
                <td>${military.commissariat || 'Не вказано'}</td>
                <td>
                    ${military.healthCategory ? `<span class="health-category ${military.healthCategory}">${military.healthCategory}</span>` : 'Не вказано'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="militaryModule.viewEmployee(${employee.id})" title="Переглянути">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="militaryModule.editEmployee(${employee.id})" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="militaryModule.deleteEmployee(${employee.id})" title="Видалити з обліку">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderCards() {
        if (this.filteredData.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Нічого не знайдено</h3>
                    <p>Спробуйте змінити параметри пошуку або фільтрів</p>
                </div>
            `;
        }

        return this.filteredData.map(emp => this.renderCard(emp)).join('');
    }

    renderCard(employee) {
        const department = this.departments.find(d => d.id === employee.departmentId);
        const military = employee.military || {};
        
        return `
            <div class="military-card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${employee.fullName}</div>
                        <div class="card-subtitle">${employee.position} • ${department ? department.name : 'Невідомий підрозділ'}</div>
                    </div>
                    ${military.status ? `<span class="status-badge ${military.status}">${this.statusTexts[military.status]}</span>` : ''}
                </div>
                <div class="card-body">
                    <div class="card-field">
                        <div class="card-field-label">Військове звання</div>
                        <div class="card-field-value">${military.rank || 'Не вказано'}</div>
                    </div>
                    <div class="card-field">
                        <div class="card-field-label">ВОС</div>
                        <div class="card-field-value">${military.specialty || 'Не вказано'}</div>
                    </div>
                    <div class="card-field">
                        <div class="card-field-label">Військовий квиток</div>
                        <div class="card-field-value">${military.idNumber || 'Не вказано'}</div>
                    </div>
                    <div class="card-field">
                        <div class="card-field-label">Рід військ</div>
                        <div class="card-field-value">${military.branch ? this.branchTexts[military.branch] : 'Не вказано'}</div>
                    </div>
                    <div class="card-field">
                        <div class="card-field-label">Військкомат</div>
                        <div class="card-field-value">${military.commissariat || 'Не вказано'}</div>
                    </div>
                    <div class="card-field">
                        <div class="card-field-label">Категорія здоров'я</div>
                        <div class="card-field-value">
                            ${military.healthCategory ? `<span class="health-category ${military.healthCategory}">${military.healthCategory}</span> ${this.healthTexts[military.healthCategory]}` : 'Не вказано'}
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="card-field-value">Таб. №${employee.personnelNumber}</div>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="militaryModule.viewEmployee(${employee.id})" title="Переглянути">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="militaryModule.editEmployee(${employee.id})" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="militaryModule.deleteEmployee(${employee.id})" title="Видалити з обліку">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderForm() {
        return `
            <form id="militaryForm">
                <input type="hidden" id="employeeId" name="employeeId">
                
                <!-- Основна інформація -->
                <div class="form-section">
                    <h3><i class="fas fa-user"></i> Вибір співробітника</h3>
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="employeeSelect">Співробітник *</label>
                            <select id="employeeSelect" name="employeeSelect" required>
                                <option value="">Виберіть співробітника</option>
                                ${this.employees
                                    .filter(emp => emp.status === 'active')
                                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                                    .map(emp => {
                                        const department = this.departments.find(d => d.id === emp.departmentId);
                                        return `<option value="${emp.id}">${emp.fullName} - ${emp.position} (${department ? department.name : 'Невідомий підрозділ'})</option>`;
                                    }).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Військові дані -->
                <div class="form-section">
                    <h3><i class="fas fa-shield-alt"></i> Військові дані</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="militaryStatus">Статус військовозобов'язаності *</label>
                            <select id="militaryStatus" name="militaryStatus" required>
                                <option value="">Виберіть статус</option>
                                <option value="liable">Військовозобов'язаний</option>
                                <option value="not_liable">Не військовозобов'язаний</option>
                                <option value="limited">Обмежено придатний</option>
                                <option value="unfit">Непридатний до військової служби</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="militaryRank">Військове звання</label>
                            <input type="text" id="militaryRank" name="militaryRank" placeholder="Наприклад: старший солдат">
                        </div>
                        <div class="form-group">
                            <label for="militarySpecialty">Військово-облікова спеціальність</label>
                            <input type="text" id="militarySpecialty" name="militarySpecialty" placeholder="Наприклад: стрілець">
                        </div>
                    </div>
                </div>

                <!-- Документи -->
                <div class="form-section">
                    <h3><i class="fas fa-id-card"></i> Військовий квиток</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="militaryIdNumber">Номер військового квитка</label>
                            <input type="text" id="militaryIdNumber" name="militaryIdNumber" placeholder="Серія та номер">
                        </div>
                        <div class="form-group">
                            <label for="militaryIdDate">Дата видачі</label>
                            <input type="date" id="militaryIdDate" name="militaryIdDate">
                        </div>
                        <div class="form-group">
                            <label for="militaryIdIssuedBy">Ким виданий</label>
                            <input type="text" id="militaryIdIssuedBy" name="militaryIdIssuedBy" placeholder="Військовий комісаріат">
                        </div>
                    </div>
                </div>

                <!-- Служба -->
                <div class="form-section">
                    <h3><i class="fas fa-flag"></i> Військова служба</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="militaryBranch">Склад (рід військ)</label>
                            <select id="militaryBranch" name="militaryBranch">
                                <option value="">Виберіть склад</option>
                                <option value="ground_forces">Сухопутні війська</option>
                                <option value="navy">Військово-Морські Сили</option>
                                <option value="air_force">Повітряні Сили</option>
                                <option value="special_operations">Сили спеціальних операцій</option>
                                <option value="territorial_defense">Сили територіальної оборони</option>
                                <option value="other">Інше</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="militaryRegistrationDate">Дата останньої приписки</label>
                            <input type="date" id="militaryRegistrationDate" name="militaryRegistrationDate">
                        </div>
                        <div class="form-group">
                            <label for="militaryCommissariat">Військовий комісаріат</label>
                            <input type="text" id="militaryCommissariat" name="militaryCommissariat" placeholder="Назва військкомату">
                        </div>
                    </div>
                </div>

                <!-- Медичні дані -->
                <div class="form-section">
                    <h3><i class="fas fa-heartbeat"></i> Медичні дані</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="bloodType">Група крові</label>
                            <select id="bloodType" name="bloodType">
                                <option value="">Виберіть групу крові</option>
                                <option value="I+">I (Rh+)</option>
                                <option value="I-">I (Rh-)</option>
                                <option value="II+">II (Rh+)</option>
                                <option value="II-">II (Rh-)</option>
                                <option value="III+">III (Rh+)</option>
                                <option value="III-">III (Rh-)</option>
                                <option value="IV+">IV (Rh+)</option>
                                <option value="IV-">IV (Rh-)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="healthCategory">Стан здоров'я (категорія)</label>
                            <select id="healthCategory" name="healthCategory">
                                <option value="">Виберіть категорію</option>
                                <option value="A">А - придатний до військової служби</option>
                                <option value="B">Б - придатний з незначними обмеженнями</option>
                                <option value="C">В - обмежено придатний</option>
                                <option value="D">Г - тимчасово непридатний</option>
                                <option value="E">Д - непридатний до військової служби</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Примітки -->
                <div class="form-section">
                    <div class="form-group full-width">
                        <label for="militaryNotes">Примітки щодо військової служби</label>
                        <textarea id="militaryNotes" name="militaryNotes" rows="3" placeholder="Додаткова інформація про військову службу, звільнення, мобілізацію тощо"></textarea>
                    </div>
                </div>
            </form>
        `;
    }

    applyFilters() {
        const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const departmentFilter = document.getElementById('departmentFilter')?.value || 'all';
        const branchFilter = document.getElementById('branchFilter')?.value || 'all';
        const healthFilter = document.getElementById('healthFilter')?.value || 'all';
        
        this.filteredData = this.employees.filter(emp => {
            // Пошук за текстом
            if (searchQuery) {
                const searchText = `${emp.fullName} ${emp.position} ${emp.military?.rank || ''} ${emp.military?.specialty || ''}`.toLowerCase();
                if (!searchText.includes(searchQuery)) return false;
            }
            
            // Фільтр за статусом
            if (statusFilter !== 'all' && emp.military?.status !== statusFilter) {
                return false;
            }
            
            // Фільтр за підрозділом
            if (departmentFilter !== 'all' && emp.departmentId !== parseInt(departmentFilter)) {
                return false;
            }
            
            // Фільтр за родом військ
            if (branchFilter !== 'all' && emp.military?.branch !== branchFilter) {
                return false;
            }
            
            // Фільтр за категорією здоров'я
            if (healthFilter !== 'all' && emp.military?.healthCategory !== healthFilter) {
                return false;
            }
            
            return true;
        });
        
        this.updateView();
    }

    switchView(view) {
        this.currentView = view;
        
        // Оновлюємо кнопки
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
        
        // Перемикаємо вигляд
        document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';
        document.getElementById('cardsView').style.display = view === 'cards' ? 'block' : 'none';
        
        this.updateView();
    }

    updateView() {
        if (this.currentView === 'table') {
            document.querySelector('.table-container').innerHTML = this.renderTable();
        } else {
            document.getElementById('cardsGrid').innerHTML = this.renderCards();
        }
    }

    openAddModal() {
        this.editingId = null;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-shield-alt"></i> Додати до військового обліку';
        this.clearForm();
        this.showModal('militaryModal');
    }

    viewEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;
        
        this.renderViewModal(employee);
        this.showModal('viewModal');
    }

    editEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;
        
        this.editingId = employeeId;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Редагувати військові дані';
        this.populateForm(employee);
        this.showModal('militaryModal');
    }

    async deleteEmployee(employeeId) {
        if (!confirm('Видалити військові дані цього співробітника? Дію неможливо відмінити.')) {
            return;
        }
        
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) return;
            
            // Очищуємо військові дані
            employee.military = null;
            
            // Оновлюємо в базі даних
            await this.database.update('employees', employee);
            
            // Оновлюємо локальні дані
            await this.loadData();
            this.updateStatistics();
            this.applyFilters();
            
            this.showNotification('Військові дані видалено', 'success');
            
        } catch (error) {
            console.error('Помилка видалення:', error);
            this.showNotification('Помилка видалення: ' + error.message, 'error');
        }
    }

    renderViewModal(employee) {
        const department = this.departments.find(d => d.id === employee.departmentId);
        const military = employee.military || {};
        
        document.getElementById('viewModalTitle').innerHTML = `<i class="fas fa-eye"></i> ${employee.fullName}`;
        
        document.getElementById('viewModalContent').innerHTML = `
            <div class="info-section">
                <h4><i class="fas fa-user"></i> Основна інформація</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">ПІБ</div>
                        <div class="info-value">${employee.fullName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Табельний номер</div>
                        <div class="info-value">${employee.personnelNumber}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Посада</div>
                        <div class="info-value">${employee.position || 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Підрозділ</div>
                        <div class="info-value">${department ? department.name : 'Невідомий підрозділ'}</div>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-shield-alt"></i> Військові дані</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Статус військовозобов'язаності</div>
                        <div class="info-value ${military.status ? '' : 'empty'}">${military.status ? this.statusTexts[military.status] : 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Військове звання</div>
                        <div class="info-value ${military.rank ? '' : 'empty'}">${military.rank || 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">ВОС</div>
                        <div class="info-value ${military.specialty ? '' : 'empty'}">${military.specialty || 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Рід військ</div>
                        <div class="info-value ${military.branch ? '' : 'empty'}">${military.branch ? this.branchTexts[military.branch] : 'Не вказано'}</div>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-id-card"></i> Документи</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Номер військового квитка</div>
                        <div class="info-value ${military.idNumber ? '' : 'empty'}">${military.idNumber || 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Дата видачі</div>
                        <div class="info-value ${military.idDate ? '' : 'empty'}">${military.idDate ? new Date(military.idDate).toLocaleDateString('uk-UA') : 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Ким виданий</div>
                        <div class="info-value ${military.idIssuedBy ? '' : 'empty'}">${military.idIssuedBy || 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Дата приписки</div>
                        <div class="info-value ${military.registrationDate ? '' : 'empty'}">${military.registrationDate ? new Date(military.registrationDate).toLocaleDateString('uk-UA') : 'Не вказано'}</div>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-flag"></i> Служба та облік</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Військовий комісаріат</div>
                        <div class="info-value ${military.commissariat ? '' : 'empty'}">${military.commissariat || 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Група крові</div>
                        <div class="info-value ${military.bloodType ? '' : 'empty'}">${military.bloodType || 'Не вказано'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Категорія здоров'я</div>
                        <div class="info-value ${military.healthCategory ? '' : 'empty'}">${military.healthCategory ? this.healthTexts[military.healthCategory] : 'Не вказано'}</div>
                    </div>
                </div>
            </div>
            
            ${military.notes ? `
                <div class="info-section">
                    <h4><i class="fas fa-sticky-note"></i> Примітки</h4>
                    <div class="info-value">${military.notes}</div>
                </div>
            ` : ''}
        `;
        
        // Зберігаємо ID для редагування
        document.getElementById('editFromViewBtn').dataset.employeeId = employee.id;
    }

    editFromView() {
        const employeeId = parseInt(document.getElementById('editFromViewBtn').dataset.employeeId);
        this.closeModal('viewModal');
        this.editEmployee(employeeId);
    }

    handleEmployeeSelect(employeeId) {
        if (!employeeId) return;
        
        const employee = this.employees.find(emp => emp.id === parseInt(employeeId));
        if (employee && employee.military) {
            // Заповнюємо форму існуючими даними
            this.populateFormFromEmployee(employee);
        }
    }

    populateFormFromEmployee(employee) {
        const military = employee.military;
        if (!military) return;
        
        document.getElementById('militaryStatus').value = military.status || '';
        document.getElementById('militaryRank').value = military.rank || '';
        document.getElementById('militarySpecialty').value = military.specialty || '';
        document.getElementById('militaryIdNumber').value = military.idNumber || '';
        document.getElementById('militaryIdDate').value = military.idDate || '';
        document.getElementById('militaryIdIssuedBy').value = military.idIssuedBy || '';
        document.getElementById('militaryBranch').value = military.branch || '';
        document.getElementById('militaryRegistrationDate').value = military.registrationDate || '';
        document.getElementById('militaryCommissariat').value = military.commissariat || '';
        document.getElementById('bloodType').value = military.bloodType || '';
        document.getElementById('healthCategory').value = military.healthCategory || '';
        document.getElementById('militaryNotes').value = military.notes || '';
    }

    populateForm(employee) {
        document.getElementById('employeeId').value = employee.id;
        document.getElementById('employeeSelect').value = employee.id;
        this.populateFormFromEmployee(employee);
    }

    clearForm() {
        document.getElementById('militaryForm').reset();
        document.getElementById('employeeId').value = '';
    }

    async saveMilitaryData() {
        try {
            const formData = new FormData(document.getElementById('militaryForm'));
            
            let employeeId = this.editingId || parseInt(formData.get('employeeSelect'));
            if (!employeeId) {
                this.showNotification('Виберіть співробітника', 'warning');
                return;
            }
            
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                this.showNotification('Співробітник не знайдений', 'error');
                return;
            }
            
            // Збираємо військові дані
            const militaryData = {
                status: formData.get('militaryStatus'),
                rank: formData.get('militaryRank'),
                specialty: formData.get('militarySpecialty'),
                idNumber: formData.get('militaryIdNumber'),
                idDate: formData.get('militaryIdDate') || null,
                idIssuedBy: formData.get('militaryIdIssuedBy'),
                branch: formData.get('militaryBranch'),
                registrationDate: formData.get('militaryRegistrationDate') || null,
                commissariat: formData.get('militaryCommissariat'),
                bloodType: formData.get('bloodType'),
                healthCategory: formData.get('healthCategory'),
                notes: formData.get('militaryNotes')
            };
            
            // Оновлюємо співробітника
            employee.military = militaryData;
            employee.updatedAt = new Date().toISOString();
            
            // Зберігаємо в базу даних
            await this.database.update('employees', employee);
            
            // Оновлюємо дані
            await this.loadData();
            this.updateStatistics();
            this.applyFilters();
            
            this.closeModal('militaryModal');
            this.showNotification('Військові дані збережено', 'success');
            
        } catch (error) {
            console.error('Помилка збереження:', error);
            this.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    updateStatistics() {
        document.getElementById('liableCount').textContent = this.getStatusCount('liable');
        document.getElementById('limitedCount').textContent = this.getStatusCount('limited');
        document.getElementById('unfitCount').textContent = this.getStatusCount('unfit');
        document.getElementById('notLiableCount').textContent = this.getStatusCount('not_liable');
    }

    exportToExcel() {
        try {
            const wb = XLSX.utils.book_new();
            
            // Підготовка даних
            const data = [
                ['РЕЄСТР ВІЙСЬКОВОГО ОБЛІКУ'],
                ['Станом на', new Date().toLocaleDateString('uk-UA')],
                [],
                [
                    'ПІБ',
                    'Табельний номер',
                    'Посада',
                    'Підрозділ',
                    'Статус',
                    'Військове звання',
                    'ВОС',
                    'Номер військового квитка',
                    'Дата видачі',
                    'Ким виданий',
                    'Рід військ',
                    'Дата приписки',
                    'Військкомат',
                    'Група крові',
                    'Категорія здоров\'я',
                    'Примітки'
                ]
            ];
            
            // Додаємо дані співробітників
            this.filteredData.forEach(emp => {
                const department = this.departments.find(d => d.id === emp.departmentId);
                const military = emp.military || {};
                
                data.push([
                    emp.fullName,
                    emp.personnelNumber,
                    emp.position || '',
                    department ? department.name : '',
                    military.status ? this.statusTexts[military.status] : '',
                    military.rank || '',
                    military.specialty || '',
                    military.idNumber || '',
                    military.idDate ? new Date(military.idDate).toLocaleDateString('uk-UA') : '',
                    military.idIssuedBy || '',
                    military.branch ? this.branchTexts[military.branch] : '',
                    military.registrationDate ? new Date(military.registrationDate).toLocaleDateString('uk-UA') : '',
                    military.commissariat || '',
                    military.bloodType || '',
                    military.healthCategory ? this.healthTexts[military.healthCategory] : '',
                    military.notes || ''
                ]);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Військовий облік');
            
            // Зберігаємо файл
            const filename = `Військовий_облік_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            this.showNotification('Реєстр експортовано в Excel', 'success');
            
        } catch (error) {
            console.error('Помилка експорту:', error);
            this.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }

    printRegistry() {
        window.print();
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
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Глобальний екземпляр для доступу з HTML
let militaryModule = null;
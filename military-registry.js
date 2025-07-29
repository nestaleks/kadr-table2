/**
 * Система військового обліку
 * Модуль для управління військовозобов'язаними співробітниками
 */

class MilitaryRegistry {
    constructor() {
        this.database = null;
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
        
        this.init();
    }
    
    /**
     * Ініціалізація системи
     */
    async init() {
        try {
            // Ініціалізуємо базу даних
            this.database = hrDatabase || await initializeDatabase();
            
            // Завантажуємо дані
            await this.loadData();
            
            // Налаштовуємо обробники подій
            this.bindEvents();
            
            // Оновлюємо інтерфейс
            this.updateStatistics();
            this.renderRegistry();
            this.populateFilters();
            
            console.log('Система військового обліку ініціалізована');
            
        } catch (error) {
            console.error('Помилка ініціалізації військового обліку:', error);
            this.showNotification('Помилка ініціалізації системи: ' + error.message, 'error');
        }
    }
    
    /**
     * Завантаження даних з бази
     */
    async loadData() {
        try {
            // Завантажуємо всіх співробітників
            this.employees = await this.database.getAll('employees');
            
            // Завантажуємо підрозділи
            this.departments = await this.database.getAll('departments');
            
            // Фільтруємо лише співробітників з встановленим чекбоксом військовозобов'язаності
            this.filteredData = this.employees.filter(emp => emp.military?.isLiable === true);
            
        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            throw error;
        }
    }
    
    /**
     * Налаштування обробників подій
     */
    bindEvents() {
        // Кнопка повернення до HR системи
        document.getElementById('backToHRBtn')?.addEventListener('click', () => {
            window.location.href = 'hr-system.html';
        });
        
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
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.handleFilter();
        });
        
        document.getElementById('departmentFilter')?.addEventListener('change', (e) => {
            this.handleFilter();
        });
        
        document.getElementById('branchFilter')?.addEventListener('change', (e) => {
            this.handleFilter();
        });
        
        document.getElementById('healthFilter')?.addEventListener('change', (e) => {
            this.handleFilter();
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
    
    /**
     * Налаштування подій модальних вікон
     */
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
    
    /**
     * Оновлення статистики
     */
    updateStatistics() {
        const stats = {
            liable: 0,
            limited: 0,
            unfit: 0,
            notLiable: 0
        };
        
        // Враховуємо лише співробітників з встановленим чекбоксом військовозобов'язаності
        this.employees
            .filter(emp => emp.military?.isLiable === true)
            .forEach(emp => {
                const status = emp.military?.status;
                if (status === 'liable') stats.liable++;
                else if (status === 'limited') stats.limited++;
                else if (status === 'unfit') stats.unfit++;
                else if (status === 'not_liable') stats.notLiable++;
            });
        
        document.getElementById('liableCount').textContent = stats.liable;
        document.getElementById('limitedCount').textContent = stats.limited;
        document.getElementById('unfitCount').textContent = stats.unfit;
        document.getElementById('notLiableCount').textContent = stats.notLiable;
    }
    
    /**
     * Заповнення фільтрів
     */
    populateFilters() {
        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            // Очищуємо існуючі опції (крім "Всі підрозділи")
            const existingOptions = departmentFilter.querySelectorAll('option:not([value="all"])');
            existingOptions.forEach(option => option.remove());
            
            // Додаємо опції для кожного підрозділу
            this.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                departmentFilter.appendChild(option);
            });
        }
        
        // Заповнюємо список співробітників у модальному вікні
        this.populateEmployeeSelect();
    }
    
    /**
     * Заповнення списку співробітників
     */
    populateEmployeeSelect() {
        const employeeSelect = document.getElementById('employeeSelect');
        if (!employeeSelect) return;
        
        // Очищуємо список
        employeeSelect.innerHTML = '<option value="">Виберіть співробітника</option>';
        
        // Додаємо активних співробітників з встановленим чекбоксом військовозобов'язаності
        this.employees
            .filter(emp => emp.status === 'active' && emp.military?.isLiable === true)
            .sort((a, b) => a.fullName.localeCompare(b.fullName))
            .forEach(emp => {
                const department = this.departments.find(d => d.id === emp.departmentId);
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.fullName} - ${emp.position} (${department ? department.name : 'Невідомий підрозділ'})`;
                employeeSelect.appendChild(option);
            });
    }
    
    /**
     * Обробка пошуку
     */
    handleSearch(query) {
        this.applyFilters();
    }
    
    /**
     * Обробка фільтрів
     */
    handleFilter() {
        this.applyFilters();
    }
    
    /**
     * Застосування фільтрів
     */
    applyFilters() {
        const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const departmentFilter = document.getElementById('departmentFilter')?.value || 'all';
        const branchFilter = document.getElementById('branchFilter')?.value || 'all';
        const healthFilter = document.getElementById('healthFilter')?.value || 'all';
        
        this.filteredData = this.employees
            .filter(emp => emp.military?.isLiable === true) // Спочатку фільтруємо лише військовозобов'язаних
            .filter(emp => {
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
        
        this.renderRegistry();
    }
    
    /**
     * Перемикання виду відображення
     */
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
        
        this.renderRegistry();
    }
    
    /**
     * Відображення реєстру
     */
    renderRegistry() {
        if (this.currentView === 'table') {
            this.renderTable();
        } else {
            this.renderCards();
        }
    }
    
    /**
     * Відображення таблиці
     */
    renderTable() {
        const tbody = document.getElementById('registryTableBody');
        if (!tbody) return;
        
        if (this.filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Нічого не знайдено</h3>
                        <p>Спробуйте змінити параметри пошуку або фільтрів</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredData.map(emp => {
            const department = this.departments.find(d => d.id === emp.departmentId);
            const military = emp.military || {};
            
            return `
                <tr>
                    <td>
                        <div class="employee-name">
                            <strong>${emp.fullName}</strong>
                            <small>Таб. №${emp.personnelNumber}</small>
                        </div>
                    </td>
                    <td>${emp.position || 'Не вказано'}</td>
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
                            <button class="action-btn view" onclick="militaryRegistry.viewEmployee(${emp.id})" title="Переглянути">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="militaryRegistry.editEmployee(${emp.id})" title="Редагувати">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="militaryRegistry.deleteEmployee(${emp.id})" title="Видалити з обліку">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * Відображення карток
     */
    renderCards() {
        const container = document.getElementById('cardsGrid');
        if (!container) return;
        
        if (this.filteredData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Нічого не знайдено</h3>
                    <p>Спробуйте змінити параметри пошуку або фільтрів</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredData.map(emp => {
            const department = this.departments.find(d => d.id === emp.departmentId);
            const military = emp.military || {};
            
            return `
                <div class="military-card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${emp.fullName}</div>
                            <div class="card-subtitle">${emp.position} • ${department ? department.name : 'Невідомий підрозділ'}</div>
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
                        <div class="card-field-value">Таб. №${emp.personnelNumber}</div>
                        <div class="action-buttons">
                            <button class="action-btn view" onclick="militaryRegistry.viewEmployee(${emp.id})" title="Переглянути">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="militaryRegistry.editEmployee(${emp.id})" title="Редагувати">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="militaryRegistry.deleteEmployee(${emp.id})" title="Видалити з обліку">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Відкриття модального вікна додавання
     */
    openAddModal() {
        this.editingId = null;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-shield-alt"></i> Додати до військового обліку';
        this.clearForm();
        this.showModal('militaryModal');
    }
    
    /**
     * Перегляд співробітника
     */
    viewEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;
        
        this.renderViewModal(employee);
        this.showModal('viewModal');
    }
    
    /**
     * Редагування співробітника
     */
    editEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;
        
        this.editingId = employeeId;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Редагувати військові дані';
        this.populateForm(employee);
        this.showModal('militaryModal');
    }
    
    /**
     * Видалення з обліку
     */
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
            this.renderRegistry();
            
            this.showNotification('Військові дані видалено', 'success');
            
        } catch (error) {
            console.error('Помилка видалення:', error);
            this.showNotification('Помилка видалення: ' + error.message, 'error');
        }
    }
    
    /**
     * Відображення модального вікна перегляду
     */
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
    
    /**
     * Редагування з модального вікна перегляду
     */
    editFromView() {
        const employeeId = parseInt(document.getElementById('editFromViewBtn').dataset.employeeId);
        this.closeModal('viewModal');
        this.editEmployee(employeeId);
    }
    
    /**
     * Обробка вибору співробітника
     */
    handleEmployeeSelect(employeeId) {
        if (!employeeId) return;
        
        const employee = this.employees.find(emp => emp.id === parseInt(employeeId));
        if (employee && employee.military) {
            // Заповнюємо форму існуючими даними
            this.populateFormFromEmployee(employee);
        }
    }
    
    /**
     * Заповнення форми даними співробітника
     */
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
    
    /**
     * Заповнення форми для редагування
     */
    populateForm(employee) {
        document.getElementById('employeeId').value = employee.id;
        document.getElementById('employeeSelect').value = employee.id;
        this.populateFormFromEmployee(employee);
    }
    
    /**
     * Очищення форми
     */
    clearForm() {
        document.getElementById('militaryForm').reset();
        document.getElementById('employeeId').value = '';
    }
    
    /**
     * Збереження військових даних
     */
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
            this.renderRegistry();
            
            this.closeModal('militaryModal');
            this.showNotification('Військові дані збережено', 'success');
            
        } catch (error) {
            console.error('Помилка збереження:', error);
            this.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }
    
    /**
     * Експорт в Excel
     */
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
    
    /**
     * Друк реєстру
     */
    printRegistry() {
        window.print();
    }
    
    /**
     * Показати модальне вікно
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * Закрити модальне вікно
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    /**
     * Показати повідомлення
     */
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

// Глобальний екземпляр
let militaryRegistry = null;

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    militaryRegistry = new MilitaryRegistry();
});
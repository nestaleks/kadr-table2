/**
 * HR & Payroll Manager - Main Application
 * Головний файл управління HR системою
 */

class HRSystem {
    constructor() {
        this.database = null;
        this.currentModule = 'dashboard';
        this.modules = new Map();
        this.notifications = [];
        
        this.init();
    }

    /**
     * Ініціалізація системи
     */
    async init() {
        try {
            // Ініціалізуємо базу даних
            this.database = await initializeDatabase();
            
            // Налаштовуємо інтерфейс
            this.setupUI();
            
            // Реєструємо обробники подій
            this.bindEvents();
            
            // Завантажуємо початковий модуль
            await this.loadModule('dashboard');
            
            this.showNotification('Система успішно завантажена', 'success');
            
        } catch (error) {
            console.error('Помилка ініціалізації HR системи:', error);
            this.showNotification('Помилка завантаження системи: ' + error.message, 'error');
        }
    }

    /**
     * Налаштування інтерфейсу
     */
    setupUI() {
        // Приховуємо спінер завантаження
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }

        // Налаштовуємо поточну дату в заголовку
        this.updateUserInfo();
    }

    /**
     * Реєстрація обробників подій
     */
    bindEvents() {
        // Навігація
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = link.dataset.module;
                if (module) {
                    this.loadModule(module);
                }
            });
        });

        // Швидкі дії
        document.getElementById('addEmployeeQuick')?.addEventListener('click', () => {
            this.loadModule('employees', { action: 'add' });
        });

        document.getElementById('openTimesheetQuick')?.addEventListener('click', () => {
            this.loadModule('timesheet');
        });

        document.getElementById('calculatePayrollQuick')?.addEventListener('click', () => {
            this.loadModule('payroll', { action: 'calculate' });
        });

        // Налаштування
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Бекап
        document.getElementById('backupBtn')?.addEventListener('click', () => {
            this.openBackupModal();
        });

        // Модальні вікна
        this.setupModalEvents();
    }

    /**
     * Налаштування модальних вікон
     */
    setupModalEvents() {
        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Закриття по кліку поза модальним вікном
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Налаштування бекапу
        this.setupBackupEvents();
        
        // Налаштування settings
        this.setupSettingsEvents();
    }

    /**
     * Налаштування подій бекапу
     */
    setupBackupEvents() {
        document.getElementById('exportDataBtn')?.addEventListener('click', async () => {
            try {
                const data = await this.database.exportData();
                this.downloadJSON(data, `HR_Backup_${new Date().toISOString().split('T')[0]}.json`);
                this.showNotification('Дані успішно експортовані', 'success');
            } catch (error) {
                this.showNotification('Помилка експорту: ' + error.message, 'error');
            }
        });

        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        document.getElementById('importFileInput')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    if (confirm('УВАГА! Це замінить всі поточні дані. Продовжити?')) {
                        await this.database.importData(data);
                        this.showNotification('Дані успішно імпортовані', 'success');
                        location.reload(); // Перезавантажуємо сторінку
                    }
                } catch (error) {
                    this.showNotification('Помилка імпорту: ' + error.message, 'error');
                }
                e.target.value = ''; // Очищуємо input
            }
        });

        document.getElementById('clearDataBtn')?.addEventListener('click', async () => {
            if (confirm('УВАГА! Це видалить всі дані назавжди! Ви впевнені?')) {
                if (confirm('Остання можливість відмінити. Видалити всі дані?')) {
                    try {
                        // Очищаємо всі таблиці
                        for (const storeName of Object.values(this.database.stores)) {
                            const allRecords = await this.database.getAll(storeName);
                            for (const record of allRecords) {
                                await this.database.delete(storeName, record.id || record.key);
                            }
                        }
                        
                        // Ініціалізуємо початкові дані
                        await this.database.initializeDefaultData();
                        
                        this.showNotification('Всі дані очищені', 'success');
                        location.reload();
                    } catch (error) {
                        this.showNotification('Помилка очищення: ' + error.message, 'error');
                    }
                }
            }
        });
    }

    /**
     * Налаштування подій settings
     */
    setupSettingsEvents() {
        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('cancelSettings')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('settingsModal'));
        });
    }

    /**
     * Завантаження модуля
     */
    async loadModule(moduleName, options = {}) {
        try {
            // Оновлюємо навігацію
            this.setActiveNavItem(moduleName);
            
            // Оновлюємо хлібні крихти
            this.updateBreadcrumb(moduleName);
            
            // Показуємо спінер
            const moduleContent = document.getElementById('moduleContent');
            moduleContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Завантаження модуля...</p></div>';
            
            // Завантажуємо модуль
            let moduleInstance;
            switch (moduleName) {
                case 'dashboard':
                    moduleInstance = new DashboardModule(this.database, options);
                    break;
                case 'employees':
                    moduleInstance = new EmployeesModule(this.database, options);
                    employeesModule = moduleInstance; // Глобальна змінна для доступу з HTML
                    break;
                case 'departments':
                    moduleInstance = new DepartmentsModule(this.database, options);
                    departmentsModule = moduleInstance; // Глобальна змінна для доступу з HTML
                    break;
                case 'positions':
                    moduleInstance = new PositionsModule(this.database, options);
                    positionsModule = moduleInstance; // Глобальна змінна для доступу з HTML
                    break;
                case 'timesheet':
                    moduleInstance = new TimesheetModule(this.database, options);
                    timesheetModule = moduleInstance; // Глобальна змінна для доступу з HTML
                    break;
                case 'payroll':
                    moduleInstance = new PayrollModule(this.database, options);
                    payrollModule = moduleInstance; // Глобальна змінна для доступу з HTML
                    break;
                case 'vacations':
                    moduleInstance = new VacationsModule(this.database, options);
                    vacationsModule = moduleInstance; // Глобальна змінна для доступу з HTML
                    break;
                case 'sickLeaves':
                    moduleInstance = new SickLeavesModule(this.database, options);
                    break;
                case 'reports':
                    moduleInstance = new ReportsModule(this.database, options);
                    reportsModule = moduleInstance; // Глобальна змінна для доступу з HTML
                    break;
                default:
                    // Для невідомих модулів показуємо заглушку
                    moduleInstance = new BaseModule(this.database, options);
                    moduleInstance.render = () => `
                        <div class="module-placeholder">
                            <i class="fas fa-tools"></i>
                            <h2>Модуль "${moduleName}" в розробці</h2>
                            <p>Цей модуль буде доступний в наступних версіях системи</p>
                        </div>
                    `;
                    break;
            }
            
            // Рендеримо модуль
            const content = await moduleInstance.render();
            moduleContent.innerHTML = content;
            
            // Ініціалізуємо модуль
            await moduleInstance.init();
            
            // Зберігаємо посилання на модуль
            this.modules.set(moduleName, moduleInstance);
            this.currentModule = moduleName;
            
        } catch (error) {
            console.error(`Помилка завантаження модуля ${moduleName}:`, error);
            this.showNotification(`Помилка завантаження модуля: ${error.message}`, 'error');
            
            // Показуємо помилку в контенті
            document.getElementById('moduleContent').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Помилка завантаження модуля</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Встановлення активного пункту навігації
     */
    setActiveNavItem(moduleName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-module="${moduleName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * Оновлення хлібних крихт
     */
    updateBreadcrumb(moduleName) {
        const moduleNames = {
            dashboard: 'Дашборд',
            employees: 'Співробітники',
            departments: 'Підрозділи',
            positions: 'Посади',
            timesheet: 'Табель',
            schedules: 'Графіки роботи',
            payroll: 'Розрахунок з/п',
            payslips: 'Розрахункові листки',
            vacations: 'Відпустки',
            sickLeaves: 'Лікарняні',
            reports: 'Звітність',
            analytics: 'Аналітика'
        };
        
        const breadcrumb = document.getElementById('breadcrumbPath');
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <i class="fas fa-home"></i> Головна / ${moduleNames[moduleName] || moduleName}
            `;
        }
    }

    /**
     * Оновлення інформації користувача
     */
    updateUserInfo() {
        const currentUser = document.getElementById('currentUser');
        if (currentUser) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('uk-UA', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            currentUser.textContent = `Адміністратор (${timeString})`;
        }
    }

    /**
     * Відкриття модального вікна налаштувань
     */
    async openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const content = document.getElementById('settingsContent');
        
        // Завантажуємо поточні налаштування
        try {
            const settings = await this.database.getAll('settings');
            const settingsMap = new Map(settings.map(s => [s.key, s.value]));
            
            // Групуємо налаштування за категоріями
            const categories = {};
            settings.forEach(setting => {
                if (!categories[setting.category]) {
                    categories[setting.category] = [];
                }
                categories[setting.category].push(setting);
            });
            
            let tabsHTML = '<div class="settings-tabs">';
            let contentHTML = '';
            
            // Вкладки категорій
            Object.keys(categories).forEach((category, index) => {
                const categoryNames = {
                    general: 'Загальні',
                    timesheet: 'Табель',
                    payroll: 'Зарплата',
                    vacation: 'Відпустки'
                };
                const categoryName = categoryNames[category] || category;
                const isActive = index === 0 ? 'active' : '';
                
                tabsHTML += `<button class="settings-tab ${isActive}" data-category="${category}">${categoryName}</button>`;
            });
            tabsHTML += '</div>';
            
            // Контент вкладок
            Object.keys(categories).forEach((category, index) => {
                const isActive = index === 0 ? 'active' : '';
                contentHTML += `<div class="tab-content ${isActive}" id="${category}Tab">`;
                
                const categoryNames = {
                    general: 'Загальні налаштування',
                    timesheet: 'Налаштування табеля',
                    payroll: 'Налаштування зарплати',
                    vacation: 'Налаштування відпусток'
                };
                
                contentHTML += `<h3>${categoryNames[category] || category}</h3>`;
                
                categories[category].forEach(setting => {
                    const value = settingsMap.get(setting.key) || '';
                    
                    contentHTML += `<div class="form-group">`;
                    contentHTML += `<label>${setting.description}:</label>`;
                    
                    if (setting.type === 'number') {
                        contentHTML += `<input type="number" id="${setting.key}" value="${value}" class="form-input" step="0.1">`;
                    } else if (setting.key === 'currency') {
                        contentHTML += `
                            <select id="${setting.key}" class="form-input">
                                <option value="UAH" ${value === 'UAH' ? 'selected' : ''}>Гривня (UAH)</option>
                                <option value="USD" ${value === 'USD' ? 'selected' : ''}>Долар (USD)</option>
                                <option value="EUR" ${value === 'EUR' ? 'selected' : ''}>Євро (EUR)</option>
                            </select>`;
                    } else {
                        contentHTML += `<input type="text" id="${setting.key}" value="${value}" class="form-input">`;
                    }
                    
                    contentHTML += `</div>`;
                });
                
                contentHTML += '</div>';
            });
            
            content.innerHTML = tabsHTML + contentHTML;
            
            // Додаємо обробники для вкладок
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const category = e.target.dataset.category;
                    
                    // Оновлюємо активну вкладку
                    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    
                    e.target.classList.add('active');
                    document.getElementById(category + 'Tab').classList.add('active');
                });
            });
            
            this.showModal(modal);
            
        } catch (error) {
            this.showNotification('Помилка завантаження налаштувань: ' + error.message, 'error');
        }
    }

    /**
     * Відкриття модального вікна бекапу
     */
    openBackupModal() {
        const modal = document.getElementById('backupModal');
        this.showModal(modal);
    }

    /**
     * Показати модальне вікно
     */
    showModal(modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Закрити модальне вікно
     */
    closeModal(modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    /**
     * Збереження налаштувань
     */
    async saveSettings() {
        try {
            // Отримуємо всі налаштування з бази
            const allSettings = await this.database.getAll('settings');
            
            // Оновлюємо кожне налаштування
            for (const setting of allSettings) {
                const inputElement = document.getElementById(setting.key);
                if (inputElement) {
                    let value = inputElement.value;
                    
                    // Конвертуємо числові значення
                    if (setting.type === 'number') {
                        value = parseFloat(value) || 0;
                    }
                    
                    // Оновлюємо налаштування в базі
                    await this.database.update('settings', {
                        key: setting.key,
                        value: value,
                        type: setting.type,
                        description: setting.description,
                        category: setting.category,
                        updatedAt: new Date().toISOString()
                    });
                }
            }
            
            this.showNotification('Налаштування збережено', 'success');
            this.closeModal(document.getElementById('settingsModal'));
            
        } catch (error) {
            this.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    /**
     * Показати повідомлення
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notifications');
        const id = Date.now();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">${this.getNotificationTitle(type)}</span>
                <button class="notification-close" onclick="hrSystem.closeNotification(${id})">&times;</button>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        notification.dataset.id = id;
        container.appendChild(notification);
        
        // Автоматичне закриття
        setTimeout(() => {
            this.closeNotification(id);
        }, duration);
        
        // Зберігаємо в історії
        this.notifications.push({
            id,
            message,
            type,
            timestamp: new Date()
        });
    }

    /**
     * Закрити повідомлення
     */
    closeNotification(id) {
        const notification = document.querySelector(`[data-id="${id}"]`);
        if (notification) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    /**
     * Отримати заголовок повідомлення
     */
    getNotificationTitle(type) {
        const titles = {
            success: 'Успіх',
            error: 'Помилка',
            warning: 'Попередження',
            info: 'Інформація'
        };
        return titles[type] || 'Повідомлення';
    }

    /**
     * Завантаження JSON файлу
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Базовий клас для модулів
class BaseModule {
    constructor(database, options = {}) {
        this.database = database;
        this.options = options;
    }

    async render() {
        return '<div>Базовий модуль</div>';
    }

    async init() {
        // Базова ініціалізація
    }
}

// Глобальний екземпляр системи
let hrSystem = null;

// Глобальні змінні для модулів (доступ з HTML)
let employeesModule = null;
let departmentsModule = null;
let positionsModule = null;
let timesheetModule = null;
let payrollModule = null;
let vacationsModule = null;
let reportsModule = null;

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    hrSystem = new HRSystem();
});
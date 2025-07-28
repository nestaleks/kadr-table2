/**
 * HR & Payroll Manager - Database Architecture
 * Система управління базою даних для HR системи
 * Використовує IndexedDB для зберігання даних локально
 */

class HRDatabase {
    constructor() {
        this.dbName = 'HR_PayrollDB';
        this.dbVersion = 1;
        this.db = null;
        
        // Назви таблиць (stores)
        this.stores = {
            employees: 'employees',
            departments: 'departments', 
            positions: 'positions',
            timesheet: 'timesheet',
            payroll: 'payroll',
            vacations: 'vacations',
            sickLeaves: 'sickLeaves',
            settings: 'settings'
        };
    }

    /**
     * Ініціалізація бази даних
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Помилка відкриття бази даних: ' + request.error));
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('База даних успішно відкрита');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createTables();
            };
        });
    }

    /**
     * Створення таблиць бази даних
     */
    createTables() {
        // Таблиця співробітників
        if (!this.db.objectStoreNames.contains(this.stores.employees)) {
            const employeesStore = this.db.createObjectStore(this.stores.employees, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            // Індекси для швидкого пошуку
            employeesStore.createIndex('personnelNumber', 'personnelNumber', { unique: true });
            employeesStore.createIndex('fullName', 'fullName', { unique: false });
            employeesStore.createIndex('departmentId', 'departmentId', { unique: false });
            employeesStore.createIndex('positionId', 'positionId', { unique: false });
            employeesStore.createIndex('status', 'status', { unique: false });
        }

        // Таблиця підрозділів
        if (!this.db.objectStoreNames.contains(this.stores.departments)) {
            const departmentsStore = this.db.createObjectStore(this.stores.departments, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            departmentsStore.createIndex('name', 'name', { unique: true });
            departmentsStore.createIndex('parentId', 'parentId', { unique: false });
        }

        // Таблиця посад
        if (!this.db.objectStoreNames.contains(this.stores.positions)) {
            const positionsStore = this.db.createObjectStore(this.stores.positions, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            positionsStore.createIndex('title', 'title', { unique: false });
            positionsStore.createIndex('departmentId', 'departmentId', { unique: false });
        }

        // Таблиця табеля робочого часу
        if (!this.db.objectStoreNames.contains(this.stores.timesheet)) {
            const timesheetStore = this.db.createObjectStore(this.stores.timesheet, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            timesheetStore.createIndex('employeeId', 'employeeId', { unique: false });
            timesheetStore.createIndex('date', 'date', { unique: false });
            timesheetStore.createIndex('monthYear', 'monthYear', { unique: false });
        }

        // Таблиця розрахунку зарплати
        if (!this.db.objectStoreNames.contains(this.stores.payroll)) {
            const payrollStore = this.db.createObjectStore(this.stores.payroll, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            payrollStore.createIndex('employeeId', 'employeeId', { unique: false });
            payrollStore.createIndex('monthYear', 'monthYear', { unique: false });
            payrollStore.createIndex('payrollDate', 'payrollDate', { unique: false });
        }

        // Таблиця відпусток
        if (!this.db.objectStoreNames.contains(this.stores.vacations)) {
            const vacationsStore = this.db.createObjectStore(this.stores.vacations, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            vacationsStore.createIndex('employeeId', 'employeeId', { unique: false });
            vacationsStore.createIndex('startDate', 'startDate', { unique: false });
            vacationsStore.createIndex('year', 'year', { unique: false });
        }

        // Таблиця лікарняних
        if (!this.db.objectStoreNames.contains(this.stores.sickLeaves)) {
            const sickLeavesStore = this.db.createObjectStore(this.stores.sickLeaves, {
                keyPath: 'id',
                autoIncrement: true
            });
            
            sickLeavesStore.createIndex('employeeId', 'employeeId', { unique: false });
            sickLeavesStore.createIndex('startDate', 'startDate', { unique: false });
        }

        // Таблиця налаштувань
        if (!this.db.objectStoreNames.contains(this.stores.settings)) {
            const settingsStore = this.db.createObjectStore(this.stores.settings, {
                keyPath: 'key',
                autoIncrement: false
            });
        }

        console.log('Всі таблиці створені успішно');
    }

    /**
     * Універсальний метод для додавання запису
     */
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.add(data);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Помилка додавання: ' + request.error));
            };
        });
    }

    /**
     * Універсальний метод для оновлення запису
     */
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.put(data);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Помилка оновлення: ' + request.error));
            };
        });
    }

    /**
     * Універсальний метод для отримання запису за ID
     */
    async getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Помилка отримання: ' + request.error));
            };
        });
    }

    /**
     * Універсальний метод для отримання всіх записів
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Помилка отримання всіх записів: ' + request.error));
            };
        });
    }

    /**
     * Універсальний метод для видалення запису
     */
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = () => {
                reject(new Error('Помилка видалення: ' + request.error));
            };
        });
    }

    /**
     * Пошук записів за індексом
     */
    async findByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            
            const request = index.getAll(value);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Помилка пошуку: ' + request.error));
            };
        });
    }

    /**
     * Ініціалізація початкових даних
     */
    async initializeDefaultData() {
        try {
            // Створюємо головний підрозділ
            const mainDepartment = {
                name: 'Головний підрозділ',
                description: 'Основний підрозділ організації',
                parentId: null,
                managerId: null,
                createdAt: new Date().toISOString()
            };
            
            const deptId = await this.add(this.stores.departments, mainDepartment);
            
            // Створюємо базові посади
            const defaultPositions = [
                {
                    title: 'Директор',
                    description: 'Керівник організації',
                    departmentId: deptId,
                    baseSalary: 0,
                    createdAt: new Date().toISOString()
                },
                {
                    title: 'Менеджер',
                    description: 'Менеджер підрозділу',
                    departmentId: deptId,
                    baseSalary: 0,
                    createdAt: new Date().toISOString()
                },
                {
                    title: 'Спеціаліст',
                    description: 'Спеціаліст',
                    departmentId: deptId,
                    baseSalary: 0,
                    createdAt: new Date().toISOString()
                }
            ];
            
            for (const position of defaultPositions) {
                await this.add(this.stores.positions, position);
            }
            
            // Базові налаштування
            const defaultSettings = [
                { 
                    key: 'companyName', 
                    value: 'ТОВ "Моя компанія"',
                    type: 'string',
                    description: 'Назва компанії',
                    category: 'general',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'currency', 
                    value: 'UAH',
                    type: 'string',
                    description: 'Валюта системи',
                    category: 'general',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'edrpouCode', 
                    value: '12345678',
                    type: 'string',
                    description: 'Код ЄДРПОУ',
                    category: 'general',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'workingHoursPerDay', 
                    value: 8,
                    type: 'number',
                    description: 'Робочих годин на день',
                    category: 'timesheet',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'workingDaysPerWeek', 
                    value: 5,
                    type: 'number',
                    description: 'Робочих днів на тиждень',
                    category: 'timesheet',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'vacationDaysPerYear', 
                    value: 24,
                    type: 'number',
                    description: 'Днів відпустки на рік',
                    category: 'vacation',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'taxRate', 
                    value: 18,
                    type: 'number',
                    description: 'Ставка ПДФО (%)',
                    category: 'payroll',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'militaryTax', 
                    value: 1.5,
                    type: 'number',
                    description: 'Військовий збір (%)',
                    category: 'payroll',
                    createdAt: new Date().toISOString()
                },
                { 
                    key: 'socialTax', 
                    value: 22,
                    type: 'number',
                    description: 'ЄСВ (%)',
                    category: 'payroll',
                    createdAt: new Date().toISOString()
                }
            ];
            
            for (const setting of defaultSettings) {
                await this.add(this.stores.settings, setting);
            }
            
            console.log('Початкові дані створені успішно');
            
        } catch (error) {
            console.error('Помилка ініціалізації початкових даних:', error);
        }
    }

    /**
     * Бекап бази даних
     */
    async exportData() {
        const data = {};
        
        for (const storeName of Object.values(this.stores)) {
            data[storeName] = await this.getAll(storeName);
        }
        
        return {
            version: this.dbVersion,
            timestamp: new Date().toISOString(),
            data: data
        };
    }

    /**
     * Відновлення з бекапу
     */
    async importData(backupData) {
        try {
            // Очищаємо всі таблиці
            for (const storeName of Object.values(this.stores)) {
                const allRecords = await this.getAll(storeName);
                for (const record of allRecords) {
                    await this.delete(storeName, record.id || record.key);
                }
            }
            
            // Відновлюємо дані
            for (const [storeName, records] of Object.entries(backupData.data)) {
                for (const record of records) {
                    await this.add(storeName, record);
                }
            }
            
            console.log('Дані успішно відновлені з бекапу');
            
        } catch (error) {
            console.error('Помилка відновлення з бекапу:', error);
            throw error;
        }
    }
}

// Глобальний екземпляр бази даних
let hrDatabase = null;

/**
 * Ініціалізація бази даних
 */
async function initializeDatabase() {
    try {
        hrDatabase = new HRDatabase();
        await hrDatabase.init();
        
        // Перевіряємо, чи є початкові дані
        const departments = await hrDatabase.getAll('departments');
        if (departments.length === 0) {
            await hrDatabase.initializeDefaultData();
        }
        
        console.log('HR база даних готова до роботи');
        return hrDatabase;
        
    } catch (error) {
        console.error('Помилка ініціалізації бази даних:', error);
        throw error;
    }
}

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HRDatabase, initializeDatabase };
}

// Ініціалізація відбувається через hr-system.js
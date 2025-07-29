/**
 * HR & Payroll Manager - Data Schemas
 * Схеми даних для всіх таблиць HR системи
 */

/**
 * Схема співробітника
 */
const EmployeeSchema = {
    // Основна інформація
    id: null, // auto-increment
    personnelNumber: '', // табельний номер (унікальний)
    
    // Персональні дані
    lastName: '', // прізвище
    firstName: '', // ім'я
    middleName: '', // по батькові
    fullName: '', // повне ім'я (автоматично)
    
    // Контактна інформація
    phone: '',
    email: '',
    address: '',
    
    // Документи
    passport: {
        series: '',
        number: '',
        issuedBy: '',
        issuedDate: null
    },
    taxNumber: '', // ІПН
    
    // Особисті дані
    birthDate: null,
    gender: 'ч', // ч/ж
    maritalStatus: 'неодружений', // неодружений/одружений/розлучений/вдівець
    children: 0, // кількість дітей
    
    // Робота
    departmentId: null, // ID підрозділу
    positionId: null, // ID посади
    hireDate: null, // дата прийому
    dismissalDate: null, // дата звільнення (null якщо працює)
    status: 'active', // active/dismissed/vacation/sick
    
    // Зарплата
    salary: {
        type: 'monthly', // monthly/hourly/piece
        amount: 0, // базова ставка
        currency: 'UAH'
    },
    
    // Графік роботи
    schedule: {
        type: 'standard', // standard/shift/flexible
        hoursPerDay: 8,
        daysPerWeek: 5,
        startTime: '09:00',
        endTime: '18:00'
    },
    
    // Відпустки
    vacation: {
        totalDays: 24, // днів на рік
        usedDays: 0, // використано днів
        remainingDays: 24 // залишок днів
    },
    
    // Військові дані
    military: {
        isLiable: false, // чи є військовозобов'язаним (чекбокс)
        status: '', // liable/not_liable/limited/unfit
        rank: '', // військове звання
        specialty: '', // ВОС
        idNumber: '', // номер військового квитка
        idDate: null, // дата видачі
        idIssuedBy: '', // ким виданий
        branch: '', // рід військ
        registrationDate: null, // дата приписки
        commissariat: '', // військкомат
        bloodType: '', // група крові  
        healthCategory: '', // A/B/C/D/E
        notes: '' // примітки
    },
    
    // Метадані
    photo: null, // base64 або URL
    notes: '', // примітки
    createdAt: null,
    updatedAt: null,
    createdBy: null
};

/**
 * Схема підрозділу
 */
const DepartmentSchema = {
    id: null, // auto-increment
    name: '', // назва підрозділу
    description: '', // опис
    parentId: null, // батьківський підрозділ (для ієрархії)
    managerId: null, // ID керівника підрозділу
    
    // Контактна інформація
    phone: '',
    email: '',
    address: '',
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    isActive: true
};

/**
 * Схема посади
 */
const PositionSchema = {
    id: null, // auto-increment
    title: '', // назва посади
    description: '', // опис обов'язків
    departmentId: null, // ID підрозділу
    
    // Зарплатні параметри
    baseSalary: 0, // базова зарплата
    minSalary: 0, // мінімальна зарплата
    maxSalary: 0, // максимальна зарплата
    
    // Вимоги
    requirements: {
        education: '', // освіта
        experience: 0, // досвід в роках
        skills: [] // навички
    },
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    isActive: true
};

/**
 * Схема табеля робочого часу
 */
const TimesheetSchema = {
    id: null, // auto-increment
    employeeId: null, // ID співробітника
    
    // Дата
    date: null, // конкретна дата
    day: 0, // день місяця (1-31)
    month: 0, // місяць (0-11)
    year: 0, // рік
    monthYear: '', // 'YYYY-MM' для індексування
    
    // Робочий час
    workCode: '', // код роботи (Р, ВЧ, РН, НУ, РВ, Ч, ТН, ІН, ВБ)
    hours: 0, // кількість годин
    isWeekend: false, // чи вихідний день
    isHoliday: false, // чи святковий день
    
    // Деталі
    startTime: null, // час початку
    endTime: null, // час закінчення
    breakTime: 0, // час перерви в хвилинах
    overtime: 0, // понаднормові години
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    createdBy: null
};

/**
 * Схема розрахунку зарплати
 */
const PayrollSchema = {
    id: null, // auto-increment
    employeeId: null, // ID співробітника
    
    // Період
    month: 0, // місяць (0-11)
    year: 0, // рік
    monthYear: '', // 'YYYY-MM'
    payrollDate: null, // дата розрахунку
    
    // Нарахування
    earnings: {
        baseSalary: 0, // основна зарплата
        overtime: 0, // понаднормові
        nightWork: 0, // нічні години
        eveningWork: 0, // вечірні години
        holidayWork: 0, // святкові дні
        bonus: 0, // премії
        allowances: 0, // доплати
        vacation: 0, // відпускні
        sickPay: 0, // лікарняні
        total: 0 // загальна сума нарахувань
    },
    
    // Утримання
    deductions: {
        incomeTax: 0, // ПДФО
        militaryTax: 0, // військовий збір
        socialTax: 0, // ЄСВ
        other: 0, // інші утримання
        total: 0 // загальна сума утримань
    },
    
    // Підсумок
    summary: {
        totalEarnings: 0, // загальні нарахування
        totalDeductions: 0, // загальні утримання
        netPay: 0, // до виплати
        hoursWorked: 0, // відпрацьовано годин
        daysWorked: 0 // відпрацьовано днів
    },
    
    // Статус
    status: 'calculated', // calculated/approved/paid
    approvedBy: null,
    paidDate: null,
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    notes: ''
};

/**
 * Схема відпустки
 */
const VacationSchema = {
    id: null, // auto-increment
    employeeId: null, // ID співробітника
    
    // Тип відпустки
    type: 'basic', // basic/additional/study/maternity/unpaid
    
    // Період
    startDate: null, // дата початку
    endDate: null, // дата закінчення
    totalDays: 0, // кількість днів
    year: 0, // рік відпустки
    
    // Розрахунок
    calculation: {
        averageSalary: 0, // середня зарплата
        vacationPay: 0, // сума відпускних
        calculationPeriod: 12 // період розрахунку в місяцях
    },
    
    // Статус
    status: 'planned', // planned/approved/active/completed/cancelled
    appliedDate: null, // дата подачі заяви
    approvedDate: null,
    approvedBy: null,
    
    // Метадані
    notes: '',
    createdAt: null,
    updatedAt: null
};

/**
 * Схема лікарняного
 */
/**
 * Схема графіка роботи
 */
const ScheduleSchema = {
    id: null, // auto-increment
    name: '', // назва графіка
    description: '', // опис
    type: 'fixed', // тип: fixed, shift, flexible, remote
    status: 'active', // статус: active, inactive, draft
    
    // Робочі дні та час
    workingDays: [], // масив днів тижня: ['monday', 'tuesday', ...]
    startTime: '09:00', // початок роботи
    endTime: '18:00', // кінець роботи
    hoursPerDay: 8, // годин на день
    hoursPerWeek: 40, // годин на тиждень
    
    // Гнучкість
    flexibilityMinutes: 0, // гнучкість початку в хвилинах
    timezone: 'Europe/Kiev', // часовий пояс
    
    // Перерви
    lunchBreakMinutes: 60, // тривалість обіду
    lunchBreakStart: '12:00', // початок обіду
    shortBreaksCount: 2, // кількість коротких перерв
    shortBreakMinutes: 15, // тривалість короткої перерви
    autoBreaks: false, // автоматично враховувати перерви
    
    // Зміни (для змінного графіка)
    shifts: [], // масив об'єктів: [{name, startTime, endTime}]
    
    // Метадані
    createdAt: null, // дата створення
    updatedAt: null, // дата оновлення
    createdBy: null // хто створив
};

/**
 * Схема шаблону графіка роботи
 */
const ScheduleTemplateSchema = {
    id: null, // auto-increment
    name: '', // назва шаблону
    description: '', // опис шаблону
    type: 'fixed', // тип графіка
    
    // Налаштування (як у ScheduleSchema)
    workingDays: [],
    startTime: '09:00',
    endTime: '18:00',
    hoursPerDay: 8,
    hoursPerWeek: 40,
    flexibilityMinutes: 0,
    timezone: 'Europe/Kiev',
    lunchBreakMinutes: 60,
    lunchBreakStart: '12:00',
    shortBreaksCount: 2,
    shortBreakMinutes: 15,
    autoBreaks: false,
    shifts: [],
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    isDefault: false // чи є стандартним шаблоном
};

/**
 * Схема виробничого календаря
 */
const ProductionCalendarSchema = {
    id: null, // auto-increment
    year: null, // рік календаря
    month: null, // місяць (0-11)
    day: null, // день місяця
    date: null, // повна дата в форматі ISO
    
    // Тип дня
    type: 'working', // working, weekend, holiday, shortened
    
    // Кількість робочих годин
    workingHours: 8, // стандартно 8 годин
    
    // Додаткова інформація
    isHoliday: false, // чи є святковим днем
    holidayId: null, // ID пов'язаного свята
    
    // Налаштування
    isTransferred: false, // чи перенесений з іншого дня
    originalDate: null, // оригінальна дата (для перенесених)
    
    // Метадані
    createdAt: null,
    updatedAt: null
};

/**
 * Схема свята
 */
const HolidaySchema = {
    id: null, // auto-increment
    name: '', // назва свята
    date: null, // дата свята (ISO формат)
    type: 'national', // national, religious, professional, memorial, company
    
    // Налаштування
    isRecurring: false, // чи щорічне свято
    isWorkingDay: false, // чи робочий день (якщо випадає на вихідний)
    shortenPreviousDay: 'none', // none, 1hour, 2hours
    
    // Інформація
    description: '', // опис свята
    
    // Локалізація (для міжнародних компаній)
    country: 'UA', // код країни
    region: null, // регіон (якщо регіональне свято)
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    createdBy: null // хто створив
};

/**
 * Схема налаштувань робочого дня
 */
const WorkingDayAdjustmentSchema = {
    id: null, // auto-increment
    date: null, // дата (ISO формат)
    
    // Налаштування
    type: 'working', // working, weekend, holiday, shortened
    workingHours: null, // кількість годин (null = автоматично)
    
    // Причина зміни
    reason: 'manual', // manual, holiday_transfer, government_decree
    description: '', // опис причини
    
    // Пов'язані дані
    relatedHolidayId: null, // якщо пов'язано зі святом
    governmentDecreeNumber: null, // номер постанови уряду
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    createdBy: null
};

const SickLeaveSchema = {
    id: null, // auto-increment
    employeeId: null, // ID співробітника
    
    // Лікарняний лист
    certificateNumber: '', // номер лікарняного листа
    
    // Період
    startDate: null, // дата початку
    endDate: null, // дата закінчення
    totalDays: 0, // кількість днів
    
    // Розрахунок
    calculation: {
        averageSalary: 0, // середня зарплата
        sickPay: 0, // сума допомоги
        insurancePart: 0, // частина від соціального страхування
        employerPart: 0, // частина від роботодавця
        calculationPeriod: 12 // період розрахунку
    },
    
    // Деталі
    diagnosis: '', // діагноз (опціонально)
    medicalInstitution: '', // медичний заклад
    
    // Статус
    status: 'active', // active/completed/cancelled
    
    // Метадані
    notes: '',
    createdAt: null,
    updatedAt: null
};

/**
 * Схема відрядження
 */
const BusinessTripSchema = {
    id: null, // auto-increment
    employeeId: null, // ID співробітника
    
    // Основна інформація
    title: '', // назва відрядження
    purpose: '', // мета відрядження
    destination: '', // місце призначення
    
    // Дати
    startDate: null, // дата початку
    endDate: null, // дата закінчення
    duration: 0, // кількість днів (автоматично)
    
    // Фінанси
    budget: 0, // загальний бюджет
    advancePayment: 0, // аванс
    totalExpenses: 0, // загальні витрати
    expensesList: [], // список витрат [{category, amount, description, date}]
    
    // Документи
    orderNumber: '', // номер наказу
    orderDate: null, // дата наказу
    reportSubmitted: false, // чи подано звіт
    reportDate: null, // дата подання звіту
    
    // Статус
    status: 'planned', // planned/approved/in_progress/completed/cancelled
    approvedBy: null, // ID того хто затвердив
    approvedDate: null, // дата затвердження
    
    // Транспорт
    transport: {
        type: '', // airplane/train/bus/car/other
        tickets: [], // квитки [{type, cost, from, to, date}]
        totalTransportCost: 0
    },
    
    // Проживання
    accommodation: {
        hotel: '', // назва готелю
        checkIn: null,
        checkOut: null,
        costPerNight: 0,
        totalNights: 0,
        totalCost: 0
    },
    
    // Примітки
    notes: '',
    
    // Метадані
    createdAt: null,
    updatedAt: null,
    createdBy: null
};

/**
 * Схема налаштувань
 */
const SettingsSchema = {
    key: '', // ключ налаштування
    value: null, // значення (може бути будь-якого типу)
    type: 'string', // string/number/boolean/object/array
    description: '', // опис налаштування
    category: 'general', // general/payroll/vacation/tax
    updatedAt: null
};

/**
 * Допоміжні функції для роботи зі схемами
 */
const SchemaHelpers = {
    /**
     * Створити новий об'єкт за схемою з значеннями за замовчуванням
     */
    createFromSchema(schema) {
        const obj = {};
        for (const [key, defaultValue] of Object.entries(schema)) {
            if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
                obj[key] = this.createFromSchema(defaultValue);
            } else {
                obj[key] = defaultValue;
            }
        }
        return obj;
    },

    /**
     * Валідація об'єкта за схемою
     */
    validate(obj, schema) {
        const errors = [];
        
        for (const [key, schemaValue] of Object.entries(schema)) {
            if (!(key in obj)) {
                errors.push(`Відсутнє поле: ${key}`);
                continue;
            }
            
            const objValue = obj[key];
            const schemaType = typeof schemaValue;
            const objType = typeof objValue;
            
            if (schemaType !== objType && schemaValue !== null) {
                errors.push(`Невірний тип поля ${key}: очікується ${schemaType}, отримано ${objType}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Очистити об'єкт від зайвих полів за схемою
     */
    sanitize(obj, schema) {
        const clean = {};
        for (const key of Object.keys(schema)) {
            if (key in obj) {
                clean[key] = obj[key];
            }
        }
        return clean;
    }
};

// Експорт схем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EmployeeSchema,
        DepartmentSchema,
        PositionSchema,
        TimesheetSchema,
        PayrollSchema,
        VacationSchema,
        SickLeaveSchema,
        BusinessTripSchema,
        SettingsSchema,
        SchemaHelpers
    };
}
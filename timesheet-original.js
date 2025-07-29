class TimesheetGenerator {
    constructor() {
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.workingDays = [];
        this.weekends = [];
        this.holidays = [];
        this.employees = [];
        this.employeeCounter = 1;
        
        this.initializeEvents();
        this.generateTable();
    }

    initializeEvents() {
        document.getElementById('month').value = this.currentMonth;
        document.getElementById('year').value = this.currentYear;
        
        document.getElementById('generateTable').addEventListener('click', () => {
            this.generateTable();
        });
        
        document.getElementById('exportExcel').addEventListener('click', () => {
            this.exportToExcel();
        });
        
        document.getElementById('addEmployee').addEventListener('click', () => {
            this.addEmployee();
        });
    }

    getDaysInMonth(month, year) {
        return new Date(year, month + 1, 0).getDate();
    }

    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // Неділя або субота
    }

    generateTable() {
        const month = parseInt(document.getElementById('month').value);
        const year = parseInt(document.getElementById('year').value);
        const daysInMonth = this.getDaysInMonth(month, year);
        
        this.currentMonth = month;
        this.currentYear = year;
        
        const container = document.getElementById('timesheet-container');
        
        // Створюємо основну таблицю
        const table = document.createElement('table');
        table.className = 'timesheet-table';
        table.id = 'timesheetTable';
        
        // Заголовок таблиці
        const headerRow1 = document.createElement('tr');
        const headerRow2 = document.createElement('tr');
        
        // Основні колонки + колонка для видалення
        const basicHeaders = ['№ п/п', 'ПІБ', 'Посада', 'Табельний номер', 'Стать', 'Дії'];
        basicHeaders.forEach(header => {
            const th1 = document.createElement('th');
            th1.textContent = header;
            th1.rowSpan = 2;
            th1.className = 'basic-header';
            headerRow1.appendChild(th1);
        });
        
        // Дні місяця
        const daysHeader = document.createElement('th');
        daysHeader.textContent = 'Дні місяця';
        daysHeader.colSpan = daysInMonth;
        daysHeader.className = 'days-header';
        headerRow1.appendChild(daysHeader);
        
        // Підсумкові колонки
        const summaryHeaders = [
            'Відпрацьовано за місяць (днів)',
            'Відпрацьовано за місяць (годин всього)',
            'з них надурочно',
            'з них нічних',
            'з них вечірніх', 
            'з них святкових',
            'Вихідних та святкових днів',
            'Основна та додаткова відпустки',
            'Відпустка навч./творчі',
            'Відпустка без збереження з/п',
            'Відпустка вагітність/пологи',
            'Відпустка догляд до 3 років',
            'Додаткова відпустка (діти)',
            'Тимчасова непрацездатність',
            'Відрядження',
            'Інші причини неявок'
        ];
        
        summaryHeaders.forEach(header => {
            const th1 = document.createElement('th');
            th1.textContent = header;
            th1.rowSpan = 2;
            th1.className = 'summary-header';
            headerRow1.appendChild(th1);
        });
        
        // Дні місяця (другий рядок заголовка)
        for (let day = 1; day <= daysInMonth; day++) {
            const th2 = document.createElement('th');
            th2.textContent = day;
            th2.className = 'day-header';
            
            const date = new Date(year, month, day);
            if (this.isWeekend(date)) {
                th2.classList.add('weekend');
            }
            
            headerRow2.appendChild(th2);
        }
        
        table.appendChild(headerRow1);
        table.appendChild(headerRow2);
        
        // Додаємо рядки працівників
        this.employees.forEach((employee, index) => {
            this.createEmployeeRow(table, employee, index, daysInMonth);
        });
        
        container.innerHTML = '';
        container.appendChild(table);
    }

    createEmployeeRow(table, employee, index, daysInMonth) {
        const dataRow = document.createElement('tr');
        dataRow.id = `employeeRow_${employee.id}`;
        dataRow.className = 'employee-row';
        
        // Основні дані
        const basicData = [
            { value: employee.number, type: 'number', readonly: true },
            { value: employee.fullName, type: 'text', readonly: true },
            { value: employee.position, type: 'text', readonly: true },
            { value: employee.personnelNumber, type: 'text', readonly: true },
            { value: employee.gender, type: 'text', readonly: true }
        ];
        
        basicData.forEach((data, fieldIndex) => {
            const td = document.createElement('td');
            td.className = 'basic-data';
            const input = document.createElement('input');
            input.type = data.type;
            input.value = data.value;
            input.readOnly = data.readonly;
            input.id = `employee_${employee.id}_field_${fieldIndex}`;
            td.appendChild(input);
            dataRow.appendChild(td);
        });
        
        // Кнопка видалення
        const actionTd = document.createElement('td');
        actionTd.className = 'action-cell';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Видалити';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => this.removeEmployee(employee.id));
        actionTd.appendChild(deleteBtn);
        dataRow.appendChild(actionTd);
        
        // Дні місяця з двома рядками
        for (let day = 1; day <= daysInMonth; day++) {
            const td = document.createElement('td');
            td.className = 'day-cell';
            
            // Верхній рядок для текстового позначення
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'day-text-input';
            textInput.maxLength = 3;
            textInput.placeholder = '';
            textInput.id = `employee_${employee.id}_day_${day}_text`;
            textInput.addEventListener('input', () => this.calculateTotals(employee.id));
            
            // Нижній рядок для числового значення
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.className = 'day-number-input';
            numberInput.min = '0';
            numberInput.max = '24';
            numberInput.step = '0.5';
            numberInput.id = `employee_${employee.id}_day_${day}_number`;
            numberInput.addEventListener('input', () => this.calculateTotals(employee.id));
            
            const date = new Date(this.currentYear, this.currentMonth, day);
            if (this.isWeekend(date)) {
                td.classList.add('weekend');
                textInput.value = 'В'; // Вихідний
                numberInput.value = '0';
            }
            
            // Контейнер для двох рядків
            const cellContainer = document.createElement('div');
            cellContainer.className = 'day-cell-container';
            cellContainer.appendChild(textInput);
            cellContainer.appendChild(numberInput);
            
            td.appendChild(cellContainer);
            dataRow.appendChild(td);
        }
        
        // Підсумкові колонки
        const summaryHeaders = [
            'Відпрацьовано за місяць (днів)',
            'Відпрацьовано за місяць (годин всього)',
            'з них надурочно',
            'з них нічних',
            'з них вечірніх', 
            'з них святкових',
            'Вихідних та святкових днів',
            'Основна та додаткова відпустки',
            'Відпустка навч./творчі',
            'Відпустка без збереження з/п',
            'Відпустка вагітність/пологи',
            'Відпустка догляд до 3 років',
            'Додаткова відпустка (діти)',
            'Тимчасова непрацездатність',
            'Відрядження',
            'Інші причини неявок'
        ];
        
        summaryHeaders.forEach((header, index) => {
            const td = document.createElement('td');
            td.className = 'summary-cell';
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'summary-input';
            input.id = `employee_${employee.id}_summary_${index}`;
            input.min = '0';
            input.readOnly = true;
            td.appendChild(input);
            dataRow.appendChild(td);
        });
        
        table.appendChild(dataRow);
    }

    addEmployee() {
        const fullName = document.getElementById('fullName').value.trim();
        const position = document.getElementById('position').value.trim();
        const personnelNumber = document.getElementById('personnelNumber').value.trim();
        const gender = document.getElementById('gender').value;
        
        if (!fullName || !position || !personnelNumber) {
            alert('Будь ласка, заповніть всі поля!');
            return;
        }
        
        const employee = {
            id: Date.now(), // Унікальний ID
            number: this.employeeCounter++,
            fullName: fullName,
            position: position,
            personnelNumber: personnelNumber,
            gender: gender
        };
        
        this.employees.push(employee);
        
        // Очищуємо форму
        document.getElementById('fullName').value = '';
        document.getElementById('position').value = '';
        document.getElementById('personnelNumber').value = '';
        document.getElementById('gender').value = 'Ч';
        
        // Перегенеруємо таблицю
        this.generateTable();
    }
    
    removeEmployee(employeeId) {
        if (confirm('Ви впевнені, що хочете видалити цього працівника?')) {
            this.employees = this.employees.filter(emp => emp.id !== employeeId);
            this.generateTable();
        }
    }


    calculateTotals(employeeId) {
        const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
        
        let workedDays = 0;
        let totalHours = 0;
        let overtimeHours = 0;
        let nightHours = 0;
        let eveningHours = 0;
        let holidayHours = 0;
        let weekendDays = 0;
        let basicVacation = 0;
        let educationalVacation = 0;
        let unpaidVacation = 0;
        let maternityVacation = 0;
        let childCareVacation = 0;
        let additionalVacation = 0;
        let sickLeave = 0;
        let businessTrip = 0;
        let otherAbsences = 0;
        
        // Рахуємо для конкретного працівника
        for (let day = 1; day <= daysInMonth; day++) {
            const textInput = document.getElementById(`employee_${employeeId}_day_${day}_text`);
            const numberInput = document.getElementById(`employee_${employeeId}_day_${day}_number`);
            
            if (!textInput || !numberInput) continue;
            
            const textValue = textInput.value.trim().toUpperCase();
            const numberValue = parseFloat(numberInput.value) || 0;
            const date = new Date(this.currentYear, this.currentMonth, day);
            
            if (this.isWeekend(date)) {
                weekendDays++;
            }
            
            if (textValue && numberValue > 0) {
                switch (textValue) {
                    case 'Р':
                        workedDays++;
                        totalHours += numberValue;
                        break;
                    case 'ВЧ':
                        workedDays++;
                        totalHours += numberValue;
                        eveningHours += numberValue;
                        break;
                    case 'РН':
                        workedDays++;
                        totalHours += numberValue;
                        nightHours += numberValue;
                        break;
                    case 'НУ':
                        workedDays++;
                        totalHours += numberValue;
                        overtimeHours += numberValue;
                        break;
                    case 'РВ':
                        additionalVacation += numberValue;
                        break;
                    case 'Ч':
                        additionalVacation += numberValue;
                        break;
                    case 'ТН':
                        sickLeave += numberValue;
                        break;
                    case 'ІН':
                        otherAbsences += numberValue;
                        break;
                    case 'ВБ':
                        businessTrip += numberValue;
                        break;
                }
            }
        }
        
        // Оновлення підсумкових полів для конкретного працівника
        const updateSummary = (index, value) => {
            const input = document.getElementById(`employee_${employeeId}_summary_${index}`);
            if (input) input.value = value;
        };
        
        updateSummary(0, workedDays); // Відпрацьовано днів
        updateSummary(1, totalHours); // Відпрацьовано годин всього
        updateSummary(2, overtimeHours); // Надурочно
        updateSummary(3, nightHours); // Нічних
        updateSummary(4, eveningHours); // Вечірніх
        updateSummary(5, holidayHours); // Святкових
        updateSummary(6, weekendDays); // Вихідних днів
        updateSummary(7, basicVacation); // Основна відпустка
        updateSummary(8, educationalVacation); // Навч. відпустка
        updateSummary(9, unpaidVacation); // Без збереження з/п
        updateSummary(10, maternityVacation); // Материнська
        updateSummary(11, childCareVacation); // Догляд за дитиною
        updateSummary(12, additionalVacation); // Додаткова відпустка
        updateSummary(13, sickLeave); // Лікарняний
        updateSummary(14, businessTrip); // Відрядження
        updateSummary(15, otherAbsences); // Інші причини
    }

    exportToExcel() {
        const table = document.getElementById('timesheetTable');
        if (!table) {
            alert('Спочатку згенеруйте табель!');
            return;
        }

        // Створюємо workbook
        const wb = XLSX.utils.book_new();
        
        // Перетворюємо таблицю в worksheet
        const ws = XLSX.utils.table_to_sheet(table);
        
        // Налаштування стилів
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Встановлюємо ширину колонок
        const colWidths = [];
        colWidths[0] = { wch: 5 };  // № п/п
        colWidths[1] = { wch: 25 }; // ПІБ
        colWidths[2] = { wch: 20 }; // Посада
        colWidths[3] = { wch: 15 }; // Табельний номер
        colWidths[4] = { wch: 8 };  // Стать
        
        // Дні місяця
        const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
        for (let i = 0; i < daysInMonth; i++) {
            colWidths[5 + i] = { wch: 4 };
        }
        
        // Підсумкові колонки
        for (let i = 5 + daysInMonth; i <= range.e.c; i++) {
            colWidths[i] = { wch: 12 };
        }
        
        ws['!cols'] = colWidths;
        
        // Додаємо worksheet до workbook
        const monthNames = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        
        const sheetName = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // Експортуємо файл
        const fileName = `Табель_${monthNames[this.currentMonth]}_${this.currentYear}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    new TimesheetGenerator();
});
# Employee Payroll Management System

A simple full-stack payroll application built with HTML, CSS, JavaScript, Node.js, Express.js and SQLite.

## Features
- Dashboard with employee count, payroll count and paid salary total
- Add, edit, search and delete employee records
- Save salary details: basic salary, allowance and deduction
- Automatically calculate net salary
- Generate one payroll record per employee per month
- Track Pending/Paid status and mark pending payroll as paid
- Filter salary reports by month and year
- Export reports as CSV and print reports

## Requirements
- Node.js 18 or later
- npm

## Run the project
1. Extract the ZIP file.
2. Open the extracted folder in VS Code.
3. Open Terminal in that folder.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the server:

   ```bash
   npm start
   ```

6. Open this address in your browser:

   `http://localhost:3000`

The SQLite database file `payroll.db` is created automatically the first time the server starts. Keep `database.js` and `payroll.db` in the project folder.

## Database tables
- `employees`: employee contact and job details
- `employee_salaries`: salary components and calculated net salary; includes `employee_id` as a foreign key to connect each salary record to an employee
- `payroll`: monthly payroll, payment date and payment status

The supplied table 2 did not include an employee identifier. This project adds `employee_id` as a foreign key so each salary record can be associated with its employee. The payroll table uses an auto-increment `payroll_id` primary key and foreign keys to employees and employee salaries. A unique constraint prevents duplicate payroll for the same employee, month and year.

## Salary formula
`Net Salary = Basic Salary + Allowance - Deduction`

## Project structure
```text
employee-payroll-management-system/
├── index.html
├── database.js
├── server.js
├── package.json
├── README.md
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Notes
- The project is intended as an academic demonstration/local application.
- No login/authentication is included.
- Do not use real employee personal or salary information in a public deployment without adding appropriate security, access control, validation and backups.

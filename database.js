const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "payroll.db"));
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    joining_date DATE
  );

  CREATE TABLE IF NOT EXISTS employee_salaries (
    salary_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
    deduction DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS payroll (
    payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    salary_id INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    payment_date DATE,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    UNIQUE(employee_id, month, year),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (salary_id) REFERENCES employee_salaries(salary_id)
  );
`);

module.exports = db;
const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

// Dashboard summary
app.get("/api/dashboard", (req, res) => {
  const employees = db.prepare("SELECT COUNT(*) AS count FROM employees").get().count;
  const payrolls = db.prepare("SELECT COUNT(*) AS count FROM payroll").get().count;
  const paid = db.prepare("SELECT COALESCE(SUM(es.net_salary), 0) AS total FROM payroll p JOIN employee_salaries es ON es.salary_id = p.salary_id WHERE p.payment_status = 'Paid'").get().total;
  const latest = db.prepare(`
    SELECT p.payroll_id, e.name, p.month, p.year, es.net_salary, p.payment_status
    FROM payroll p
    JOIN employees e ON e.employee_id = p.employee_id
    JOIN employee_salaries es ON es.salary_id = p.salary_id
    ORDER BY p.year DESC, p.month DESC, p.payroll_id DESC LIMIT 6
  `).all();
  res.json({ employees, payrolls, paid, latest });
});

// Employee records
app.get("/api/employees", (req, res) => {
  const rows = db.prepare(`
    SELECT e.*,
      (SELECT es.basic_salary FROM employee_salaries es
       WHERE es.employee_id = e.employee_id ORDER BY es.salary_id DESC LIMIT 1) AS basic_salary
    FROM employees e ORDER BY e.employee_id DESC
  `).all();
  res.json(rows);
});

app.post("/api/employees", (req, res) => {
  const { name, phone_number, department, designation, email, joining_date } = req.body;
  if (!name || !department || !designation) {
    return res.status(400).json({ error: "Name, department and designation are required." });
  }
  try {
    const result = db.prepare(`
      INSERT INTO employees (name, phone_number, department, designation, email, joining_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), phone_number || "", department.trim(), designation.trim(), email || "", joining_date || null);
    res.status(201).json({ employee_id: result.lastInsertRowid, message: "Employee added successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/employees/:id", (req, res) => {
  const { name, phone_number, department, designation, email, joining_date } = req.body;
  try {
    const result = db.prepare(`
      UPDATE employees SET name=?, phone_number=?, department=?, designation=?, email=?, joining_date=?
      WHERE employee_id=?
    `).run(name, phone_number || "", department, designation, email || "", joining_date || null, req.params.id);
    if (!result.changes) return res.status(404).json({ error: "Employee not found." });
    res.json({ message: "Employee updated successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/employees/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM employees WHERE employee_id=?").run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: "Employee not found." });
    res.json({ message: "Employee deleted successfully." });
  } catch (error) {
    res.status(400).json({ error: "Could not delete employee. Remove their payroll records first." });
  }
});

// Salary details
app.get("/api/salaries", (req, res) => {
  res.json(db.prepare(`
    SELECT es.*, e.name, e.department
    FROM employee_salaries es JOIN employees e ON e.employee_id = es.employee_id
    ORDER BY es.salary_id DESC
  `).all());
});

app.post("/api/salaries", (req, res) => {
  const employee_id = number(req.body.employee_id);
  const basic_salary = number(req.body.basic_salary);
  const allowance = number(req.body.allowance);
  const deduction = number(req.body.deduction);
  if (!employee_id || basic_salary < 0 || allowance < 0 || deduction < 0) {
    return res.status(400).json({ error: "Choose an employee and enter valid non-negative salary amounts." });
  }
  const employee = db.prepare("SELECT employee_id FROM employees WHERE employee_id=?").get(employee_id);
  if (!employee) return res.status(404).json({ error: "Employee not found." });
  const net_salary = basic_salary + allowance - deduction;
  if (net_salary < 0) return res.status(400).json({ error: "Deduction cannot exceed basic salary plus allowance." });
  const result = db.prepare(`
    INSERT INTO employee_salaries (employee_id, basic_salary, allowance, deduction, net_salary)
    VALUES (?, ?, ?, ?, ?)
  `).run(employee_id, basic_salary, allowance, deduction, net_salary);
  res.status(201).json({ salary_id: result.lastInsertRowid, net_salary, message: "Salary details saved." });
});

// Monthly payroll
app.get("/api/payroll", (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, e.name, e.department, es.basic_salary, es.allowance, es.deduction, es.net_salary
    FROM payroll p
    JOIN employees e ON e.employee_id = p.employee_id
    JOIN employee_salaries es ON es.salary_id = p.salary_id
    ORDER BY p.year DESC, p.month DESC, p.payroll_id DESC
  `).all();
  res.json(rows);
});

app.post("/api/payroll", (req, res) => {
  const employee_id = number(req.body.employee_id);
  const month = number(req.body.month);
  const year = number(req.body.year);
  const payment_status = req.body.payment_status === "Paid" ? "Paid" : "Pending";
  const payment_date = req.body.payment_date || null;

  if (!employee_id || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return res.status(400).json({ error: "Select an employee and enter a valid month and year." });
  }
  const salary = db.prepare(`
    SELECT * FROM employee_salaries WHERE employee_id=? ORDER BY salary_id DESC LIMIT 1
  `).get(employee_id);
  if (!salary) return res.status(400).json({ error: "Add salary details for this employee before generating payroll." });

  try {
    const result = db.prepare(`
      INSERT INTO payroll (employee_id, salary_id, month, year, payment_date, payment_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, salary.salary_id, month, year, payment_date, payment_status);
    res.status(201).json({ payroll_id: result.lastInsertRowid, message: "Monthly payroll generated." });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Payroll for this employee and month already exists." });
    }
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/payroll/:id/status", (req, res) => {
  const status = req.body.payment_status === "Paid" ? "Paid" : "Pending";
  const payment_date = status === "Paid" ? (req.body.payment_date || new Date().toISOString().slice(0, 10)) : null;
  const result = db.prepare("UPDATE payroll SET payment_status=?, payment_date=? WHERE payroll_id=?")
    .run(status, payment_date, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Payroll record not found." });
  res.json({ message: "Payment status updated." });
});

app.get("/api/reports", (req, res) => {
  const { month, year } = req.query;
  let sql = `
    SELECT p.payroll_id, e.name, e.department, e.designation, p.month, p.year,
      p.payment_date, p.payment_status, es.basic_salary, es.allowance, es.deduction, es.net_salary
    FROM payroll p
    JOIN employees e ON e.employee_id = p.employee_id
    JOIN employee_salaries es ON es.salary_id = p.salary_id
  `;
  const conditions = [];
  const params = [];
  if (month) { conditions.push("p.month=?"); params.push(number(month)); }
  if (year) { conditions.push("p.year=?"); params.push(number(year)); }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY p.year DESC, p.month DESC, e.name";
  res.json(db.prepare(sql).all(...params));
});

app.listen(PORT, () => {
  console.log(`Payroll Management System running at http://localhost:${PORT}`);
});
const $ = (id) => document.getElementById(id);
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
let employees = [], payrollRows = [], reportRows = [];

function money(value) {
  return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(Number(value || 0));
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function toast(message, isError=false) {
  const el = $("toast"); el.textContent = message;
  el.style.background = isError ? "#9b3434" : "#202b3a";
  el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2800);
}
async function api(url, options={}) {
  const response = await fetch(url, { headers:{"Content-Type":"application/json"}, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function person(name) {
  const initial = escapeHtml((name || "?").trim().charAt(0).toUpperCase());
  return `<div class="person"><span class="person-icon">${initial}</span>${escapeHtml(name)}</div>`;
}
function statusBadge(status) { return `<span class="status ${status === "Paid" ? "Paid" : "Pending"}">${escapeHtml(status)}</span>`; }

function navigate(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `${page}-page`));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $("page-title").textContent = ({dashboard:"Dashboard",employees:"Employees",salary:"Salary Setup",payroll:"Monthly Payroll",reports:"Salary Reports"})[page];
  if (page === "dashboard") loadDashboard();
  if (page === "employees") loadEmployees();
  if (page === "salary") loadSalaries();
  if (page === "payroll") loadPayroll();
  if (page === "reports") loadReports();
}
document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => navigate(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.go)));

async function loadDashboard() {
  try {
    const d = await api("/api/dashboard");
    $("total-employees").textContent = d.employees;
    $("total-payrolls").textContent = d.payrolls;
    $("total-paid").textContent = money(d.paid);
    $("recent-table").innerHTML = d.latest.length ? d.latest.map(r => `<tr><td>${person(r.name)}</td><td>${months[r.month-1]} ${r.year}</td><td><strong>${money(r.net_salary)}</strong></td><td>${statusBadge(r.payment_status)}</td></tr>`).join("") : `<tr><td colspan="4" class="muted">No payroll records yet.</td></tr>`;
  } catch (e) { toast(e.message, true); }
}
async function loadEmployees() {
  try {
    employees = await api("/api/employees");
    renderEmployees(employees);
    const options = `<option value="">Choose employee</option>` + employees.map(e => `<option value="${e.employee_id}">${escapeHtml(e.name)} (#${e.employee_id})</option>`).join("");
    $("salary-employee").innerHTML = options;
    $("payroll-employee").innerHTML = options;
    $("employee-count").textContent = `${employees.length} employee(s)`;
  } catch (e) { toast(e.message, true); }
}
function renderEmployees(rows) {
  $("employees-table").innerHTML = rows.length ? rows.map(e => `<tr>
    <td>${person(e.name)}</td><td>${escapeHtml(e.department)}</td><td>${escapeHtml(e.designation)}</td>
    <td>${escapeHtml(e.phone_number || "—")}</td><td>${e.basic_salary == null ? "—" : money(e.basic_salary)}</td>
    <td><button class="action-btn edit-employee" data-id="${e.employee_id}">Edit</button> <button class="action-btn danger-btn delete-employee" data-id="${e.employee_id}">Delete</button></td>
  </tr>`).join("") : `<tr><td colspan="6" class="muted">No employees added yet. Select “Add employee” to begin.</td></tr>`;
}
$("employee-search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  renderEmployees(employees.filter(x => [x.name,x.department,x.designation,x.email].join(" ").toLowerCase().includes(q)));
});
function showEmployeeForm(employee=null) {
  $("employee-form-panel").classList.remove("hidden");
  $("employee-form-title").textContent = employee ? "Edit employee" : "Add new employee";
  $("employee-id").value = employee?.employee_id || "";
  $("emp-name").value = employee?.name || ""; $("emp-phone").value = employee?.phone_number || "";
  $("emp-department").value = employee?.department || ""; $("emp-designation").value = employee?.designation || "";
  $("emp-email").value = employee?.email || ""; $("emp-date").value = employee?.joining_date || "";
  $("employee-form-panel").scrollIntoView({behavior:"smooth",block:"start"});
}
function hideEmployeeForm() { $("employee-form-panel").classList.add("hidden"); $("employee-form").reset(); $("employee-id").value=""; }
$("show-employee-form").addEventListener("click", () => showEmployeeForm());
$("cancel-employee").addEventListener("click", hideEmployeeForm);
$("cancel-employee-2").addEventListener("click", hideEmployeeForm);
$("employee-form").addEventListener("submit", async e => {
  e.preventDefault();
  const id = $("employee-id").value;
  const body = {name:$("emp-name").value,phone_number:$("emp-phone").value,department:$("emp-department").value,designation:$("emp-designation").value,email:$("emp-email").value,joining_date:$("emp-date").value};
  try {
    await api(id ? `/api/employees/${id}` : "/api/employees", {method:id?"PUT":"POST",body:JSON.stringify(body)});
    toast(id ? "Employee updated." : "Employee added."); hideEmployeeForm(); await loadEmployees(); await loadDashboard();
  } catch (err) { toast(err.message,true); }
});
$("employees-table").addEventListener("click", async e => {
  const edit = e.target.closest(".edit-employee"), del = e.target.closest(".delete-employee");
  if (edit) { const employee=employees.find(x=>x.employee_id===Number(edit.dataset.id)); showEmployeeForm(employee); }
  if (del && confirm("Delete this employee? This is not possible if payroll or salary records are linked.")) {
    try { await api(`/api/employees/${del.dataset.id}`,{method:"DELETE"}); toast("Employee deleted."); await loadEmployees(); }
    catch(err){toast(err.message,true);}
  }
});

async function loadSalaries() {
  await loadEmployees();
  try {
    const rows = await api("/api/salaries");
    $("salary-table").innerHTML = rows.length ? rows.map(s=>`<tr><td>${person(s.name)}</td><td>${money(s.basic_salary)}</td><td>${money(s.allowance)}</td><td>${money(s.deduction)}</td><td><strong>${money(s.net_salary)}</strong></td></tr>`).join("") : `<tr><td colspan="5" class="muted">No salary details saved yet.</td></tr>`;
  } catch(e){toast(e.message,true);}
}
function updateNetPreview() {
  const net = Number($("basic-salary").value||0)+Number($("allowance").value||0)-Number($("deduction").value||0);
  $("net-preview").textContent = money(Math.max(0,net));
}
["basic-salary","allowance","deduction"].forEach(id => $(id).addEventListener("input",updateNetPreview));
$("salary-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const body={employee_id:$("salary-employee").value,basic_salary:$("basic-salary").value,allowance:$("allowance").value,deduction:$("deduction").value};
  try{const d=await api("/api/salaries",{method:"POST",body:JSON.stringify(body)});toast(`Salary saved. Net salary: ${money(d.net_salary)}`);$("salary-form").reset();updateNetPreview();await loadSalaries();}
  catch(err){toast(err.message,true);}
});

function setupMonths() {
  $("payroll-month").innerHTML = `<option value="">Select month</option>`+months.map((m,i)=>`<option value="${i+1}">${m}</option>`).join("");
  $("report-month").innerHTML = `<option value="">All months</option>`+months.map((m,i)=>`<option value="${i+1}">${m}</option>`).join("");
  const now=new Date();$("payroll-month").value=now.getMonth()+1;$("payroll-year").value=now.getFullYear();
}
async function loadPayroll() {
  await loadEmployees();
  try {
    payrollRows=await api("/api/payroll");
    $("payroll-table").innerHTML=payrollRows.length?payrollRows.map(p=>`<tr><td>${person(p.name)}</td><td>${months[p.month-1]} ${p.year}</td><td>${money(p.basic_salary)}</td><td>${money(p.allowance)}</td><td>${money(p.deduction)}</td><td><strong>${money(p.net_salary)}</strong></td><td>${statusBadge(p.payment_status)}</td><td>${p.payment_status==="Paid"?"—":`<button class="action-btn mark-paid" data-id="${p.payroll_id}">Mark paid</button>`}</td></tr>`).join(""):`<tr><td colspan="8" class="muted">No payroll records generated yet.</td></tr>`;
  }catch(e){toast(e.message,true);}
}
$("payroll-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const body={employee_id:$("payroll-employee").value,month:$("payroll-month").value,year:$("payroll-year").value,payment_status:$("payroll-status").value,payment_date:$("payment-date").value};
  try{await api("/api/payroll",{method:"POST",body:JSON.stringify(body)});toast("Monthly payroll generated.");$("payment-date").value="";await loadPayroll();await loadDashboard();}
  catch(err){toast(err.message,true);}
});
$("payroll-table").addEventListener("click",async e=>{
  const btn=e.target.closest(".mark-paid");if(!btn)return;
  try{await api(`/api/payroll/${btn.dataset.id}/status`,{method:"PATCH",body:JSON.stringify({payment_status:"Paid"})});toast("Payment marked as paid.");await loadPayroll();await loadDashboard();}
  catch(err){toast(err.message,true);}
});

async function loadReports() {
  try { reportRows=await api("/api/reports");renderReports(reportRows); }
  catch(e){toast(e.message,true);}
}
function renderReports(rows) {
  $("reports-table").innerHTML=rows.length?rows.map(r=>`<tr><td>${person(r.name)}</td><td>${escapeHtml(r.department)}</td><td>${months[r.month-1]} ${r.year}</td><td>${money(r.basic_salary)}</td><td>${money(r.allowance)}</td><td>${money(r.deduction)}</td><td><strong>${money(r.net_salary)}</strong></td><td>${statusBadge(r.payment_status)}</td></tr>`).join(""):`<tr><td colspan="8" class="muted">No report data matches your filters.</td></tr>`;
  $("report-total").textContent=money(rows.reduce((sum,r)=>sum+Number(r.net_salary),0));
}
$("filter-report").addEventListener("click",async()=>{
  const params=new URLSearchParams();if($("report-month").value)params.set("month",$("report-month").value);if($("report-year").value)params.set("year",$("report-year").value);
  try{reportRows=await api(`/api/reports?${params}`);renderReports(reportRows);}catch(e){toast(e.message,true);}
});
$("export-report").addEventListener("click",()=>{
  if(!reportRows.length){toast("There are no report rows to export.",true);return;}
  const columns=["Employee","Department","Designation","Month","Year","Payment Date","Status","Basic Salary","Allowance","Deduction","Net Salary"];
  const keys=["name","department","designation","month","year","payment_date","payment_status","basic_salary","allowance","deduction","net_salary"];
  const csv=[columns.join(","),...reportRows.map(r=>keys.map(k=>`"${String(k==="month"?months[r[k]-1]:r[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));link.download="payroll-report.csv";link.click();URL.revokeObjectURL(link.href);
});
$("print-report").addEventListener("click",()=>window.print());

setupMonths();
loadDashboard();
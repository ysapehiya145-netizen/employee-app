const express = require("express");
const mongoose = require("mongoose");
const client = require("prom-client");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
client.collectDefaultMetrics();
const reqCounter = new client.Counter({
  name: "employee_requests_total",
  help: "Total requests",
  labelNames: ["method", "route"],
});
const MONGO_URL = process.env.MONGO_URL ||
  "mongodb://admin:password@localhost:27017/company?authSource=admin";
mongoose.connect(MONGO_URL).then(() => console.log("Mongo connected"));
const Employee = mongoose.model("Employee", {
  name: String, email: String, role: String, department: String,
});
app.get("/", (req, res) => res.send(`
  <h2>Add Employee</h2>
  <form method="POST" action="/employees">
    <input name="name" placeholder="Name" required><br>
    <input name="email" placeholder="Email" required><br>
    <input name="role" placeholder="Role"><br>
    <input name="department" placeholder="Department"><br>
    <button>Add</button>
  </form>
  <a href="/employees">View all</a>`));
app.post("/employees", async (req, res) => {
  reqCounter.inc({ method: "POST", route: "/employees" });
  await Employee.create(req.body);
  res.redirect("/employees");
});
app.get("/employees", async (req, res) => {
  reqCounter.inc({ method: "GET", route: "/employees" });
  res.json(await Employee.find());
});
app.get("/employees/:id", async (req, res) => {
  reqCounter.inc({ method: "GET", route: "/employees/:id" });
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid employee ID" });
  }
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  res.json(employee);
});
app.put("/employees/:id", async (req, res) => {
  reqCounter.inc({ method: "PUT", route: "/employees/:id" });
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid employee ID" });
  }
  const fields = ["name", "email", "role", "department"];
  const updates = Object.fromEntries(
    fields
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]])
  );
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Provide at least one employee field to update" });
  }
  const employee = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  res.json(employee);
});
app.get("/health", (req, res) => res.send("ok"));
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
app.listen(3000, () => console.log("App on 3000"));
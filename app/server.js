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
app.get("/health", (req, res) => res.send("ok"));
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
app.listen(3000, () => console.log("App on 3000"));
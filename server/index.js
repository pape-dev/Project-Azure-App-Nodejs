import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Test de santé
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Récupérer tous les employés
app.get("/api/employees", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM employees");
    console.log(`Récupération de ${rows.length} employé(s)`);
    
    // Convertir les noms de colonnes snake_case en camelCase si nécessaire
    const employees = rows.map((row) => ({
      id: row.id,
      firstName: row.firstName || row.first_name,
      lastName: row.lastName || row.last_name,
      email: row.email,
      phone: row.phone,
      department: row.department,
      position: row.position,
      status: row.status,
      hireDate: row.hireDate || row.hire_date,
      salary: row.salary,
      avatar: row.avatar,
    }));
    
    res.json(employees);
  } catch (error) {
    console.error("Erreur lors de la récupération des employés :", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

// Insérer un nouvel employé
app.post("/api/employees", async (req, res) => {
  const {
    id,
    firstName,
    lastName,
    email,
    phone,
    department,
    position,
    status,
    hireDate,
    salary,
    avatar,
  } = req.body;

  if (
    !id ||
    !firstName ||
    !lastName ||
    !email ||
    !department ||
    !position ||
    !status ||
    !hireDate ||
    salary == null
  ) {
    return res.status(400).json({ error: "Données employé manquantes" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO employees 
        (id, firstName, lastName, email, phone, department, position, status, hireDate, salary, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        firstName,
        lastName,
        email,
        phone || null,
        department,
        position,
        status,
        hireDate,
        salary,
        avatar || null,
      ]
    );

    res.status(201).json({
      message: "Employé créé",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Erreur lors de l'insertion de l'employé :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer tous les contacts
app.get("/api/contact", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM contact ORDER BY created_at DESC");
    console.log(`Récupération de ${rows.length} contact(s)`);
    res.json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des contacts :", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

// Insérer un nouveau contact
app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "Données contact manquantes" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO contact (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name, email, subject, message]
    );

    res.status(201).json({
      message: "Contact créé",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Erreur lors de l'insertion du contact :", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur API démarré sur http://localhost:${PORT}`);
});



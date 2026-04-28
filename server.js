// ==============================
// IMPORTS
// ==============================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// ==============================
// CONFIG
// ==============================
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "MON_SECRET_JWT_2026";

// ==============================
// MONGODB (ENV VARIABLE)
// ==============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connecté ✅"))
  .catch(err => console.log("Erreur MongoDB ❌", err));

// ==============================
// SCHEMA ASSIGNMENT
// ==============================
const AssignmentSchema = new mongoose.Schema({
  nom: String,
  rendu: Boolean,
  auteur: String,
  matiere: String,
  note: Number,
  remarques: String,
  image: String,
  prof: String,
  dateCreation: {
    type: Date,
    default: Date.now
  }
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);

// ==============================
// ADMIN FIXE
// ==============================
const admin = {
  email: "admin@assignment.com",
  passwordHash: bcrypt.hashSync("Admin123!", 10)
};

// ==============================
// MIDDLEWARE JWT
// ==============================
function verifierToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "Token manquant" });
  }

  const token = header.split(" ")[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token invalide" });
    }

    req.user = decoded;
    next();
  });
}

// ==============================
// LOGIN ADMIN
// ==============================
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email !== admin.email) {
    return res.status(401).json({ message: "Email incorrect" });
  }

  const valide = bcrypt.compareSync(password, admin.passwordHash);

  if (!valide) {
    return res.status(401).json({ message: "Mot de passe incorrect" });
  }

  const token = jwt.sign(
    { email: admin.email, role: "admin" },
    SECRET,
    { expiresIn: "24h" }
  );

  res.json({ token, user: admin.email });
});

// ==============================
// ROUTE TEST
// ==============================
app.get('/', (req, res) => {
  res.send("API Assignments opérationnelle ✅");
});

// ==============================
// GET ALL
// ==============================
app.get('/assignments', async (req, res) => {
  const data = await Assignment.find().sort({ dateCreation: -1 });
  res.json(data);
});

// ==============================
// GET ONE
// ==============================
app.get('/assignments/:id', async (req, res) => {
  try {
    const data = await Assignment.findById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(404).json({ message: "Assignment introuvable" });
  }
});

// ==============================
// GENERATE 1000
// ==============================
app.get('/generate', async (req, res) => {

  await Assignment.deleteMany({});

  const matieres = [
    {
      nom: "Angular",
      prof: "Michel Buffa",
      image: "https://angular.io/assets/images/logos/angular/angular.png"
    },
    {
      nom: "Base de données",
      prof: "Mme SQL",
      image: "https://cdn-icons-png.flaticon.com/512/4248/4248443.png"
    },
    {
      nom: "Java",
      prof: "M. Java",
      image: "https://cdn-icons-png.flaticon.com/512/226/226777.png"
    },
    {
      nom: "Technologies Web",
      prof: "M. Web",
      image: "https://cdn-icons-png.flaticon.com/512/1055/1055687.png"
    }
  ];

  const data = [];

  for (let i = 1; i <= 1000; i++) {
    const m = matieres[Math.floor(Math.random() * matieres.length)];
    const note = Math.floor(Math.random() * 21);

    data.push({
      nom: "Assignment " + i,
      rendu: note > 0 ? Math.random() > 0.5 : false,
      auteur: "Etudiant " + i,
      matiere: m.nom,
      prof: m.prof,
      image: m.image,
      note: note,
      remarques: "Travail numéro " + i
    });
  }

  await Assignment.insertMany(data);

  res.send("1000 assignments générés ✅");
});

// ==============================
// ADD (PROTÉGÉ)
// ==============================
app.post('/assignments', verifierToken, async (req, res) => {

  if (req.body.rendu && (!req.body.note || req.body.note <= 0)) {
    return res.status(400).json({
      message: "Impossible de rendre sans note"
    });
  }

  const nouveau = new Assignment(req.body);
  await nouveau.save();

  res.json(nouveau);
});

// ==============================
// UPDATE (PROTÉGÉ)
// ==============================
app.put('/assignments/:id', verifierToken, async (req, res) => {

  if (req.body.rendu && (!req.body.note || req.body.note <= 0)) {
    return res.status(400).json({
      message: "Impossible de rendre sans note"
    });
  }

  const modif = await Assignment.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(modif);
});

// ==============================
// DELETE (PROTÉGÉ)
// ==============================
app.delete('/assignments/:id', verifierToken, async (req, res) => {

  await Assignment.findByIdAndDelete(req.params.id);

  res.json({ message: "Supprimé ✅" });
});

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
  console.log("Serveur lancé sur le port " + PORT);
});
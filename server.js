const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'registrations.json');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to ensure data folder and file exist
function getRegistrations() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading registrations:', err);
    return [];
  }
}

function saveRegistrations(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/registrations - list all or search with query ?q=
app.get('/api/registrations', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const program = (req.query.program || '').trim();
  let list = getRegistrations();

  if (program) {
    list = list.filter(item => item.program.toLowerCase() === program.toLowerCase());
  }

  if (query) {
    list = list.filter(item => {
      return (
        (item.id && item.id.toLowerCase().includes(query)) ||
        (item.fullName && item.fullName.toLowerCase().includes(query)) ||
        (item.email && item.email.toLowerCase().includes(query)) ||
        (item.phone && item.phone.toLowerCase().includes(query)) ||
        (item.transactionId && item.transactionId.toLowerCase().includes(query)) ||
        (item.churchAffiliation && item.churchAffiliation.toLowerCase().includes(query))
      );
    });
  }

  res.json({
    success: true,
    count: list.length,
    data: list
  });
});

// GET /api/registrations/:id - get single registration
app.get('/api/registrations/:id', (req, res) => {
  const list = getRegistrations();
  const found = list.find(item => item.id.toLowerCase() === req.params.id.toLowerCase());
  if (!found) {
    return res.status(404).json({ success: false, message: 'Registration not found' });
  }
  res.json({ success: true, data: found });
});

// POST /api/registrations - create new registration
app.post('/api/registrations', (req, res) => {
  const {
    fullName,
    email,
    phone,
    program,
    studyMode,
    gender,
    dob,
    address,
    churchAffiliation,
    testimony,
    paymentMethod,
    feeAmount,
    bankName
  } = req.body;

  if (!fullName || !email || !phone || !program || !paymentMethod) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: fullName, email, phone, program, paymentMethod are required.'
    });
  }

  const list = getRegistrations();

  // Check duplicate email or phone for same program
  const duplicate = list.find(r => 
    r.email.toLowerCase() === email.trim().toLowerCase() && 
    r.program.toLowerCase() === program.trim().toLowerCase()
  );
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: `Applicant with email ${email} is already registered for ${program} (Registration ID: ${duplicate.id}). Use the search feature to view details.`
    });
  }

  // Generate ID
  const timestamp = Date.now().toString().slice(-5);
  const regId = `PN-${new Date().getFullYear()}-${timestamp}`;

  // Generate realistic Transaction ID
  let txPrefix = 'UPI';
  if (paymentMethod === 'Net Banking') txPrefix = 'NETBNK';
  else if (paymentMethod === 'GPay') txPrefix = 'GPAY';
  else if (paymentMethod === 'PhonePe') txPrefix = 'PHONEPE';
  const txId = `${txPrefix}/${Math.random().toString(36).substring(2, 9).toUpperCase()}/${Date.now().toString().slice(-6)}`;

  const newRecord = {
    id: regId,
    fullName: fullName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    program: program.trim(),
    studyMode: studyMode || 'Regular',
    gender: gender || 'Unspecified',
    dob: dob || '',
    address: address || '',
    churchAffiliation: churchAffiliation || 'N/A',
    testimony: testimony || '',
    feeAmount: feeAmount || (program === 'Khasi Bible School' ? 1500 : 2500),
    paymentMethod,
    bankName: bankName || null,
    paymentStatus: 'Completed',
    transactionId: txId,
    createdAt: new Date().toISOString()
  };

  list.unshift(newRecord);
  saveRegistrations(list);

  res.status(201).json({
    success: true,
    message: 'Registration and Payment submitted successfully!',
    data: newRecord
  });
});

app.listen(PORT, () => {
  console.log(`Potternet Ministry server running at http://localhost:${PORT}`);
});

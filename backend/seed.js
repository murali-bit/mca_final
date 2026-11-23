import db from './db.js';
import crypto from 'node:crypto';

console.log('Seeding Germin8 SQLite Database...');

// 1. Seed Users
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, phone, name, email, role)
  VALUES (?, ?, ?, ?, ?)
`);

insertUser.run('usr_staff_01', '9876543210', 'Sumit Staff', 'staff@germin8.in', 'staff');
insertUser.run('usr_admin_01', '9999999999', 'Super Admin', 'admin@germin8.in', 'superadmin');

// 2. Seed Clients
const insertClient = db.prepare(`
  INSERT OR REPLACE INTO clients (id, cin, name, email, address, pan, fy)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertClient.run(
  'client_lessonboard',
  'U80904KA2018PTC119370',
  'LESSONBOARD EDU SOLUTIONS PRIVATE LIMITED',
  'compliance@lessonboard.in',
  'FLAT NO 4153 LEVEL 15, PRESTIGE SONG OF THE SOUTH, BEGUR KOPPA MAIN ROAD, BANGALORE, Karnataka, 560068',
  'AAOFJ5797P',
  '2025-26'
);

insertClient.run(
  'client_germin8',
  'U72900MH2021PTC355555',
  'GERMIN8 SOLUTIONS PRIVATE LIMITED',
  'contact@germin8.in',
  'B-404, BUSINESS PARK, ANDHERI EAST, MUMBAI, Maharashtra, 400069',
  'AABCG1234M',
  '2025-26'
);

insertClient.run(
  'client_cartrendz',
  'U50100KA2019PTC120000',
  'CARTRENDZ PRIVATE LIMITED',
  'accounts@cartrendz.in',
  'NO 45, 1ST MAIN, INDIRANAGAR, BANGALORE, Karnataka, 560038',
  'AACCC8888K',
  '2025-26'
);

// 3. Seed an initial ADT-1 draft for Lessonboard
const sampleFormData = {
  cin: "U80904KA2018PTC119370",
  companyName: "LESSONBOARD EDU SOLUTIONS PRIVATE LIMITED",
  companyAddress: "FLAT NO 4153 LEVEL 15, PRESTIGE SONG OF THE SOUTH, BEGUR KOPPA MAIN ROAD, BANGALORE, Karnataka, 560068",
  companyEmail: "compliance@lessonboard.in",
  natureOfAppointment: "Re-appointment of Auditors in AGM",
  agmDate: "30/09/2026",
  dateOfAppointment: "30/09/2026",
  jointAuditors: "No",
  numAuditorsAppointed: "1",
  auditorCategory: "Auditor's Firm",
  firmRegistrationNumber: "018971S",
  firmName: "Jain S A K and Co",
  firmPan: "AAOFJ5797P",
  firmAddr1: "S3, 2nd Floor White House",
  firmAddr2: "St Marks Road, Bangalore",
  firmCountry: "India",
  firmPin: "560001",
  firmCity: "Bangalore",
  firmDistrict: "Bangalore",
  firmState: "Karnataka",
  firmEmail: "sumit@jainsak.com",
  membershipNumber: "235818",
  auditorName: "Sumit Jain",
  periodFrom: "01/04/2025",
  periodTo: "31/03/2026",
  numFinancialYears: "1",
  resolutionNumber: "04",
  resolutionDate: "30/09/2026",
  signatoryDesignation: "Director",
  signatoryIdentifier: "08302207"
};

const insertDraft = db.prepare(`
  INSERT OR REPLACE INTO adt1_drafts (id, user_id, client_id, cin, form_data, status)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertDraft.run(
  'draft_lessonboard_adt1',
  'usr_staff_01',
  'client_lessonboard',
  'U80904KA2018PTC119370',
  JSON.stringify(sampleFormData),
  'draft'
);

console.log('Database seeded successfully:');
console.log('- Users: 2');
console.log('- Clients: 3');
console.log('- ADT-1 Drafts: 1');


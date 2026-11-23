import db from './db.js';

console.log('Seeding Germin8 SQLite Database...');

// Login users only. Clients and drafts are created by people using the dashboard.
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, phone, name, email, role)
  VALUES (?, ?, ?, ?, ?)
`);

insertUser.run('usr_staff_01', '9876543210', 'Sumit Staff', 'staff@germin8.in', 'staff');
insertUser.run('usr_admin_01', '9999999999', 'Super Admin', 'admin@germin8.in', 'superadmin');

console.log('Database seeded successfully:');
console.log('- Users: 2');

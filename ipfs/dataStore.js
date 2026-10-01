import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import User from './user.model.js';
import Officials from './army.model.js';
import { getDbStatus } from './dbconnect.js';

const DATA_DIR = path.resolve('./data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OFFICIALS_FILE = path.join(DATA_DIR, 'officials.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLocalFile(file, defaultContent) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.warn(`Error reading ${file}:`, e.message);
  }
  fs.writeFileSync(file, JSON.stringify(defaultContent, null, 2));
  return defaultContent;
}

function saveLocalFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Initial seed data
const initialUsers = [
  {
    _id: "usr_army_01",
    name: "Major Vikram Sharma (Retd.)",
    email: "officer@army.mil",
    password: bcrypt.hashSync("Password123", 10),
    role: "Veteran"
  },
  {
    _id: "usr_army_02",
    name: "Sepoy Amit Kumar",
    email: "defence.user@gmail.com",
    password: bcrypt.hashSync("Password123", 10),
    role: "Personnel"
  }
];

const initialOfficials = [
  {
    _id: "off_cert_01",
    officialId: "ARMY-CERT-01",
    department: "Indian Army Cyber Group (CERT-Army)",
    password: "DefShield@2025",
    phone: "+91-9876543210",
    phoneNumber: "+91-9876543210",
    securityCode: "123456",
    role: "Analyst"
  },
  {
    _id: "off_cert_02",
    officialId: "DEF-ADMIN-01",
    department: "Defence Cyber Agency (DCA)",
    password: "DCAadmin@2025",
    phone: "+91-9811223344",
    phoneNumber: "+91-9811223344",
    securityCode: "123456",
    role: "Admin"
  }
];

// Initialize local stores
loadLocalFile(USERS_FILE, initialUsers);
loadLocalFile(OFFICIALS_FILE, initialOfficials);

export const DataStore = {
  async findUserByEmail(email) {
    if (getDbStatus()) {
      try {
        return await User.findOne({ email });
      } catch (e) {
        console.warn("MongoDB query failed, falling back to local store:", e.message);
      }
    }
    const users = loadLocalFile(USERS_FILE, initialUsers);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  async findUserById(id) {
    if (getDbStatus()) {
      try {
        return await User.findById(id).select("-password");
      } catch (e) {
        console.warn("MongoDB query failed, falling back to local store:", e.message);
      }
    }
    const users = loadLocalFile(USERS_FILE, initialUsers);
    const u = users.find(u => u._id === id);
    if (u) {
      const { password, ...rest } = u;
      return rest;
    }
    return null;
  },

  async createUser(userData) {
    if (getDbStatus()) {
      try {
        const u = await User.create(userData);
        await u.save();
        return u;
      } catch (e) {
        console.warn("MongoDB create failed, falling back to local store:", e.message);
      }
    }
    const users = loadLocalFile(USERS_FILE, initialUsers);
    const newUser = {
      _id: "usr_" + Date.now(),
      ...userData
    };
    users.push(newUser);
    saveLocalFile(USERS_FILE, users);
    return newUser;
  },

  async findOfficialById(officialId) {
    if (getDbStatus()) {
      try {
        return await Officials.findOne({ officialId });
      } catch (e) {
        console.warn("MongoDB query failed, falling back to local store:", e.message);
      }
    }
    const officials = loadLocalFile(OFFICIALS_FILE, initialOfficials);
    return officials.find(o => o.officialId.toUpperCase() === officialId.toUpperCase());
  }
};

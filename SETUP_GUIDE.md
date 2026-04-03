# Permission Management System
## Complete Setup Guide

---

## FOLDER STRUCTURE
```
pms/
├── backend/
│   ├── config/
│   │   ├── db.js              ← MySQL connection
│   │   └── schema.sql         ← Full database schema (run this first)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── coordinatorController.js
│   │   ├── hodController.js
│   │   ├── principalController.js
│   │   ├── branchAdminController.js
│   │   └── centralAdminController.js
│   ├── middleware/
│   │   └── auth.js            ← Session + role protection
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── coordinatorRoutes.js
│   │   ├── hodRoutes.js
│   │   ├── principalRoutes.js
│   │   ├── branchAdminRoutes.js
│   │   └── centralAdminRoutes.js
│   ├── .env                   ← ⚠️ Set your DB password here
│   ├── package.json
│   └── server.js              ← Main entry point
│
└── frontend/
    ├── src/
    │   ├── components/common/
    │   │   ├── ProtectedRoute.jsx
    │   │   ├── Sidebar.jsx + .css
    │   │   └── ApprovalPanel.jsx + .css
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── auth/LoginPage.jsx + .css
    │   │   ├── student/StudentDashboard, NewPermission, MyPermissions
    │   │   ├── coordinator/CoordinatorDashboard.jsx
    │   │   ├── hod/HODDashboard.jsx
    │   │   ├── principal/PrincipalDashboard.jsx
    │   │   ├── branchadmin/BranchAdminDashboard.jsx
    │   │   └── centraladmin/CentralAdminDashboard.jsx
    │   ├── styles/global.css
    │   ├── utils/api.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## PREREQUISITES
Install these before starting:
1. Node.js (v18 or above)  →  https://nodejs.org
2. MySQL (v8 or above)     →  https://dev.mysql.com/downloads/
3. Git (optional)

---

## STEP 1 — Set Up Database

Open MySQL Workbench or MySQL terminal and run:

```sql
source /path/to/pms/backend/config/schema.sql
```

OR copy-paste the entire schema.sql file content into MySQL and execute.

This will:
- Create the database: `permission_management_system`
- Create all 8 tables
- Insert default roles
- Insert sample branches (CSE-AI, CSE, ECE)
- Create the Central Admin account

### Default Central Admin Login:
- Email:    `centraladmin@college.edu`
- Password: `password`
⚠️  Change this password immediately after first login!

---

## STEP 2 — Configure Backend

Open `backend/.env` and update:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_ACTUAL_MYSQL_PASSWORD    ← Change this
DB_NAME=permission_management_system
SESSION_SECRET=any_random_string_here     ← Change this
```

---

## STEP 3 — Install Backend Dependencies

Open terminal in the `backend/` folder:

```bash
cd pms/backend
npm install
```

This installs: express, mysql2, bcryptjs, express-session, pdfkit, multer, cors, dotenv, nodemon

---

## STEP 4 — Install Frontend Dependencies

Open another terminal in `frontend/` folder:

```bash
cd pms/frontend
npm install
```

This installs: react, react-dom, react-router-dom, axios, react-hot-toast, lucide-react, date-fns, vite

---

## STEP 5 — Start the Application

### Terminal 1 — Backend:
```bash
cd pms/backend
npm run dev
```
You should see:
```
✅ MySQL Database connected successfully
🚀 PMS Backend running on http://localhost:5000
```

### Terminal 2 — Frontend:
```bash
cd pms/frontend
npm run dev
```
You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

---

## STEP 6 — Create Test Users

Login as Central Admin first, then:

1. **Add a Branch Admin** via Central Admin → (API call or DB insert)
2. **Login as Branch Admin**
3. **Add users** in this order:
   - HOD (for branch)
   - Coordinator (for a section)
   - Students (for that section)

### Quick DB Insert for Testing (run in MySQL):

```sql
USE permission_management_system;

-- Get role IDs
-- roles: student=1, coordinator=2, hod=3, principal=4, branch_admin=5, central_admin=6

-- Add a Principal (password: Test@123)
INSERT INTO users (name, email, password_hash, role_id)
VALUES ('Dr. Principal', 'principal@college.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4);

-- Add a Branch Admin for CSE-AI (branch_id=1)
INSERT INTO users (name, email, password_hash, role_id, branch_id)
VALUES ('CSE-AI Admin', 'cseai.admin@college.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 5, 1);

-- Add HOD for CSE-AI
INSERT INTO users (name, email, password_hash, role_id, branch_id)
VALUES ('Dr. HOD CSE-AI', 'hod.cseai@college.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 1);

-- Add Coordinator for Section A (section_id=1)
INSERT INTO users (name, email, password_hash, role_id, branch_id, section_id)
VALUES ('Mr. Coordinator', 'coord.a@college.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, 1, 1);

-- Add a Student in CSE-AI Section A
INSERT INTO users (name, email, password_hash, role_id, branch_id, section_id, roll_number)
VALUES ('Ravi Kumar', 'ravi@college.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 1, '21CS001');
```

Note: All passwords above are `password` (bcrypt hash for easy testing).

---

## STEP 7 — Test the Full Flow

1. Login as **Student** → Submit a permission (AI or Manual)
2. Login as **Coordinator** → See it in Pending → Approve / Forward to HOD
3. Login as **HOD** → See forwarded request → Approve / Forward to Principal
4. Login as **Principal** → Final approval
5. Login back as **Student** → See Approved status → Download PDF

---

## API ENDPOINTS REFERENCE

### Auth
| Method | Endpoint              | Access |
|--------|-----------------------|--------|
| POST   | /api/auth/login       | Public |
| POST   | /api/auth/logout      | All    |
| GET    | /api/auth/me          | All    |

### Student
| Method | Endpoint                              |
|--------|---------------------------------------|
| GET    | /api/student/dashboard-stats          |
| POST   | /api/student/permissions              |
| GET    | /api/student/permissions              |
| GET    | /api/student/permissions/:id/logs     |
| GET    | /api/student/permissions/:id/pdf      |

### Coordinator / HOD / Principal
| Method | Endpoint                    |
|--------|-----------------------------|
| GET    | /api/[role]/dashboard-stats |
| GET    | /api/[role]/pending         |
| GET    | /api/[role]/history         |
| POST   | /api/[role]/action/:id      |

### Branch Admin
| Method | Endpoint                          |
|--------|-----------------------------------|
| GET    | /api/branch-admin/users           |
| POST   | /api/branch-admin/users           |
| PATCH  | /api/branch-admin/users/:id/toggle|
| POST   | /api/branch-admin/override/:id    |
| GET    | /api/branch-admin/permissions     |

### Central Admin
| Method | Endpoint                                 |
|--------|------------------------------------------|
| GET    | /api/central-admin/principals            |
| POST   | /api/central-admin/principals            |
| PATCH  | /api/central-admin/principals/:id/toggle |
| GET    | /api/central-admin/branches              |
| POST   | /api/central-admin/branches              |
| GET    | /api/central-admin/logs                  |

---

## COMMON ISSUES & FIXES

### "Cannot connect to MySQL"
- Check DB_PASSWORD in .env
- Make sure MySQL service is running
- Try: `mysql -u root -p` to test connection

### "npm install" fails
- Make sure Node.js v18+ is installed
- Run: `node --version`

### Port already in use
- Backend: Change PORT in .env (default 5000)
- Frontend: Change port in vite.config.js (default 3000)

### Student can't submit (no coordinator found)
- Make sure a coordinator is assigned to the same section_id as the student

---

## FUTURE ENHANCEMENTS (Phase 2)
- [ ] Email notifications (NodeMailer — free)
- [ ] Bulk user import via CSV
- [ ] Section management UI
- [ ] Attendance integration with Vignan Ecap
- [ ] Analytics dashboard (charts)
- [ ] Mobile responsive improvements
- [ ] Cloud deployment

---

## TECH STACK SUMMARY
| Layer     | Technology            |
|-----------|-----------------------|
| Frontend  | React 18 + Vite       |
| Backend   | Node.js + Express     |
| Database  | MySQL 8               |
| Auth      | Session-based (bcrypt)|
| PDF       | PDFKit                |
| Hosting   | Localhost (Phase 1)   |
| Cost      | 100% FREE ✅          |

---

Built for: Vignan's Foundation for Science, Technology and Research
Project: Permission Management System

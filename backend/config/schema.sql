-- ============================================================
-- Permission Management System - Database Schema
-- Run this file in MySQL to set up the entire database
-- ============================================================

CREATE DATABASE IF NOT EXISTS permission_management_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE permission_management_system;

-- ============================================================
-- TABLE 1: ROLES
-- Stores all system roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  role_id      INT PRIMARY KEY AUTO_INCREMENT,
  role_name    ENUM(
                 'student',
                 'coordinator',
                 'hod',
                 'principal',
                 'branch_admin',
                 'central_admin'
               ) NOT NULL UNIQUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate roles
INSERT INTO roles (role_name) VALUES
  ('student'),
  ('coordinator'),
  ('hod'),
  ('principal'),
  ('branch_admin'),
  ('central_admin')
ON DUPLICATE KEY UPDATE role_name = role_name;

-- ============================================================
-- TABLE 2: BRANCHES
-- Stores all college departments (CSE, CSE-AI, ECE, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  branch_id    INT PRIMARY KEY AUTO_INCREMENT,
  branch_name  VARCHAR(100) NOT NULL,
  branch_code  VARCHAR(20)  NOT NULL UNIQUE,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 3: SECTIONS
-- Each branch has multiple sections (A, B, C...)
-- ============================================================
CREATE TABLE IF NOT EXISTS sections (
  section_id   INT PRIMARY KEY AUTO_INCREMENT,
  branch_id    INT NOT NULL,
  section_name VARCHAR(10) NOT NULL,     -- A, B, C
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_section (branch_id, section_name)
);

-- ============================================================
-- TABLE 4: USERS
-- Central users table for ALL roles
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id       INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INT NOT NULL,
  branch_id     INT,                     -- NULL for central_admin
  section_id    INT,                     -- only for students
  roll_number   VARCHAR(50),             -- only for students
  phone         VARCHAR(15),
  is_active     BOOLEAN DEFAULT TRUE,
  is_assistant  BOOLEAN DEFAULT FALSE,   -- TRUE if Assistant HOD
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (role_id)    REFERENCES roles(role_id),
  FOREIGN KEY (branch_id)  REFERENCES branches(branch_id),
  FOREIGN KEY (section_id) REFERENCES sections(section_id)
);

-- ============================================================
-- TABLE 5: PERMISSION REQUESTS
-- Heart of the system - every permission application lives here
-- ============================================================
CREATE TABLE IF NOT EXISTS permission_requests (
  request_id          INT PRIMARY KEY AUTO_INCREMENT,
  student_id          INT NOT NULL,

  -- Letter content
  letter_type         ENUM('ai', 'manual') NOT NULL,
  subject             VARCHAR(300) NOT NULL,
  letter_content      TEXT NOT NULL,
  reason_summary      VARCHAR(500) NOT NULL,

  -- Dates
  from_date           DATE NOT NULL,
  to_date             DATE NOT NULL,         -- expiry date

  -- Period-wise info (for future attendance use)
  periods_affected    VARCHAR(100),          -- e.g. "3,4,5,6,7"

  -- Current workflow position
  current_holder_role ENUM(
                        'coordinator',
                        'hod',
                        'principal',
                        'completed'
                      ) DEFAULT 'coordinator',
  current_holder_id   INT,                   -- specific user holding it

  -- Status
  status              ENUM(
                        'pending',
                        'approved',
                        'rejected',
                        'returned'           -- sent back for correction
                      ) DEFAULT 'pending',

  -- Proof / Attachment
  attachment_type     ENUM('file', 'drive_link', 'none') DEFAULT 'none',
  attachment_url      VARCHAR(500),          -- file path or Drive link

  -- Flags
  is_edited_by_student BOOLEAN DEFAULT FALSE,
  viewed_by_coordinator BOOLEAN DEFAULT FALSE,  -- locks student editing

  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id)        REFERENCES users(user_id),
  FOREIGN KEY (current_holder_id) REFERENCES users(user_id)
);

-- ============================================================
-- TABLE 6: APPROVAL LOGS
-- Audit trail - every single action is recorded here
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_logs (
  log_id       INT PRIMARY KEY AUTO_INCREMENT,
  request_id   INT NOT NULL,
  action_by    INT NOT NULL,               -- user_id who acted
  action_role  ENUM(
                 'coordinator',
                 'hod',
                 'principal',
                 'branch_admin',
                 'central_admin'
               ) NOT NULL,
  action_type  ENUM(
                 'submitted',              -- student submits
                 'viewed',                 -- coordinator/hod/principal viewed
                 'approved',
                 'rejected',
                 'returned',              -- sent back for correction
                 'forwarded',             -- forwarded to next level
                 'edited',               -- student edited a returned request
                 'override'              -- admin override
               ) NOT NULL,
  remarks      TEXT,
  forwarded_to ENUM('hod', 'principal'),   -- if action is 'forwarded'
  action_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (request_id) REFERENCES permission_requests(request_id)
    ON DELETE CASCADE,
  FOREIGN KEY (action_by)  REFERENCES users(user_id)
);

-- ============================================================
-- TABLE 7: ADMIN ACTIONS
-- Tracks structural changes by Branch Admin & Central Admin
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  action_id    INT PRIMARY KEY AUTO_INCREMENT,
  admin_id     INT NOT NULL,
  admin_role   ENUM('branch_admin', 'central_admin') NOT NULL,
  action_type  ENUM(
                 'add_user',
                 'remove_user',
                 'assign_hod',
                 'assign_coordinator',
                 'assign_principal',
                 'disable_user',
                 'enable_user',
                 'override_permission'
               ) NOT NULL,
  target_user_id INT,
  branch_id    INT,
  remarks      TEXT,
  action_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id)      REFERENCES users(user_id),
  FOREIGN KEY (target_user_id) REFERENCES users(user_id),
  FOREIGN KEY (branch_id)     REFERENCES branches(branch_id)
);

-- ============================================================
-- TABLE 8: NOTIFICATIONS
-- In-app notifications for all users
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id         INT NOT NULL,
  title           VARCHAR(200) NOT NULL,
  message         TEXT NOT NULL,
  type            ENUM(
                    'status_update',
                    'returned',
                    'approved',
                    'rejected',
                    'reminder',
                    'system'
                  ) NOT NULL,
  request_id      INT,                     -- linked permission (optional)
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)    REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES permission_requests(request_id)
    ON DELETE SET NULL
);

-- ============================================================
-- SEED DATA: Central Admin (first user, created manually)
-- Password: Admin@123 (bcrypt hash)
-- CHANGE THIS PASSWORD AFTER FIRST LOGIN
-- ============================================================
INSERT INTO users (name, email, password_hash, role_id, is_active)
VALUES (
  'Central Admin',
  'centraladmin@college.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
  (SELECT role_id FROM roles WHERE role_name = 'central_admin'),
  TRUE
);

-- ============================================================
-- SAMPLE BRANCH (for testing)
-- ============================================================
INSERT INTO branches (branch_name, branch_code) VALUES
  ('Computer Science Engineering - AI', 'CSE-AI'),
  ('Computer Science Engineering', 'CSE'),
  ('Electronics and Communication Engineering', 'ECE');

-- ============================================================
-- SAMPLE SECTIONS for CSE-AI
-- ============================================================
INSERT INTO sections (branch_id, section_name) VALUES
  (1, 'A'),
  (1, 'B'),
  (1, 'C'),
  (2, 'A'),
  (2, 'B');

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_requests_student    ON permission_requests(student_id);
CREATE INDEX idx_requests_status     ON permission_requests(status);
CREATE INDEX idx_requests_holder     ON permission_requests(current_holder_id);
CREATE INDEX idx_logs_request        ON approval_logs(request_id);
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX idx_users_role          ON users(role_id);
CREATE INDEX idx_users_section       ON users(section_id);

-- ============================================================
-- END OF SCHEMA
-- ============================================================

# LabEval RUET — Continuous Lab Performance Evaluation System

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5.2-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9.6-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> An automated, role-based continuous laboratory assessment, administrative management, and grade compilation platform built for engineering and science academic curriculums.

---

## 📌 Overview

In traditional engineering and laboratory-intensive degree programs, continuous lab assessment involves evaluating multiple dynamic components: daily physical attendance, regular lab report submissions, ongoing experiment performance, lab quizzes, term-final lab tests, and viva/presentation evaluations. Managing these streams via manual paper registers or unstandardized spreadsheets is error-prone, administratively exhausting, and lacks transparency for enrolled students.

**LabEval RUET** solves this problem by delivering a centralized, secure web platform tailored to academic institutions such as the **Rajshahi University of Engineering & Technology (RUET)**. It equips faculty members with intuitive tools to manage course grading schemes, record real-time classroom data, enforce academic attendance rules, and export official result sheets, while providing students with a transparent portal to track their academic standing and submission history. Furthermore, a dedicated **Administrator Console** empowers department heads and system admins to oversee faculty rosters, student registries, and active course deployments.

### Who Is It For?
- **System Administrators**: Centrally oversee faculty, student cohorts, active courses, enrollment distributions, and system-wide evaluation health.
- **Course Instructors & Evaluators**: Easily maintain student rosters, log attendance and report submissions simultaneously, grade daily experiment work with custom caps, and instantly compile final semester grade sheets out of **75 marks**.
- **Students**: Monitor attendance percentages, review report submission records, view continuous assessment scores, and request gated access to full marks breakdowns.
- **Academic Departments**: Standardize continuous laboratory grading workflows and generate formatted landscape PDF result sheets ready for official submission.

---

## ✨ Key Features

### 🛡️ Master Administrator Console
- **System Analytics Hub**: High-level statistical overview tracking total registered students, faculty members, active courses, and logged lab sessions.
- **Enrollment Analytics**: Department-wise and academic series distribution cards showing real-time cohort statistics.
- **Faculty Management**: Searchable directory of instructors, department filters, add new faculty members, edit profiles, reset passwords, and remove faculty records.
- **Student Registry**: Searchable student database by roll number or name, filterable by department and series batch, with full CRUD and cascade data management.
- **Course Directory Oversight**: Global view of all courses across departments, inspecting assessment schemes out of 75 and purging obsolete offerings.

### 🔑 Unified, Modern Multi-Role Authentication
- **Segmented Role Selector**: Effortlessly switch between **Student** 🎓, **Instructor** 👨‍🏫, and **Administrator** 🛡️ with custom gradient themes.
- **Dynamic Mode Switcher**: Smooth sliding toggle between *Sign In* and *Create Account* (with live password confirmation and minimum length validation).
- **Quick Demo Fillers**: One-click demo credential autofill buttons for Student (`2204001`), Teacher (`T-101`), and Admin (`admin`) for rapid testing.
- **Visual Polish & Privacy**: Password visibility toggles, glassmorphic frosted cards, ambient background blobs, and instant theme switching.

### 👨‍🏫 Instructor Portal
- **Course & Batch Management**: Create and manage courses filtered by department (e.g., `ETE`, `CSE`, `EEE`) and academic series batch (e.g., `Series 22`).
- **Dynamic Marking Schemes (Total = 75 Marks)**: Configure custom weight distributions across 6 core evaluation components per course:
  - *Attendance* (Default: 5)
  - *Lab Reports* (Default: 10)
  - *Continuous Performance* (Default: 5)
  - *Lab Quizzes* (Default: 30)
  - *Lab Tests* (Default: 20)
  - *Others / Assignments / Presentations* (Default: 5)
- **Fast-Track Attendance & Report Tracking**:
  - Unified grid interface to mark **Attendance (Present/Absent)** and toggle **Report Submission** simultaneously.
  - Automatic Day incrementing (`Day-1`, `Day-2`, ..., `Day-N`).
  - Roll Group splitting (`Roll 01–30` and `Roll 31–60`) for clean navigation in large cohorts.
  - Quick action controls: *Select All*, *Mark All Present*, *Mark All Absent*, and a stateful *Undo* queue.
- **Continuous Evaluation Portals**:
  - Dedicated grading sheets for **Daily Performance**, **Lab Quizzes**, **Final Lab Tests**, and **Others** (Assignments, Presentations, Projects).
  - Built-in validation preventing mark entry that exceeds the course's configured maximum caps.
  - Bulk mark pasting mode for fast data entry from spreadsheet clipboards.
- **Automated Grade Compilation & Auditing**:
  - Real-time aggregation applying standardized institutional attendance & report scaling formulas.
  - Visual non-collegiate warning indicators for students with $< 60\%$ attendance.
- **Official Result Exporting**:
  - **Landscape PDF Export**: Formatted official mark sheet featuring the RUET institutional header, course metadata, student names, component breakdowns, and signatures.
  - **Excel Export (.xlsx)**: One-click export to formatted spreadsheets via SheetJS.
- **Student Access Control**: Review, approve, or reject student marks access requests per course.

### 🎓 Student Portal
- **Automated Course Discovery**: View active courses matching the student's department and series.
- **Secure Access Request Workflow**: Request permission from instructors to unlock comprehensive grade analytics.
- **Visual Performance Analytics**:
  - Overarching score badge out of 75 with dynamic color coding (Green $\ge 80\%$, Blue $\ge 60\%$, Yellow $\ge 40\%$, Red $< 40\%$).
  - Segmented progress bars for each evaluation category.
- **Audit Trails & History**: Expandable history drawers displaying exact dates of presence/absence, report submission statuses, and experiment marks across each lab session.

---

## 🏗️ System Architecture

LabEval is architected as a decoupled client-server application communicating via RESTful HTTP APIs with JSON payloads and Bearer token authorization.

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 19 + Vite + Tailwind CSS)"]
        UI_Guest[Landing / About / Contact]
        UI_Auth[Unified Multi-Role Auth Portal]
        UI_Admin[Admin Console & Resource Management]
        UI_Teacher[Teacher Dashboard & Evaluation Sheets]
        UI_Student[Student Portal & Marks Breakdown]
        Axios_Client[Axios Client + JWT Interceptors]
    end

    subgraph Server ["Backend (Node.js + Express 5)"]
        Auth_MW[Auth & Role Guard Middleware]
        Route_Auth[/api/auth/*]
        Route_Admin[/api/admin/*]
        Route_Teacher[/api/teacher/*]
        Route_Student[/api/student/*]
        Calc_Engine[Results Compilation & Scoring Engine]
    end

    subgraph Storage ["Database (MongoDB Atlas)"]
        DB_Users[(Admins, Teachers, Students)]
        DB_Courses[(Courses & Assessment Configs)]
        DB_Records[(Attendance, Reports, Performance, Quiz, Test, Others)]
        DB_Requests[(Access Requests)]
    end

    UI_Guest --> UI_Auth
    UI_Auth --> Axios_Client
    UI_Admin --> Axios_Client
    UI_Teacher --> Axios_Client
    UI_Student --> Axios_Client
    Axios_Client -->|Bearer JWT HTTP Requests| Server

    Server --> Route_Auth
    Server --> Route_Admin
    Server --> Route_Teacher
    Server --> Route_Student

    Route_Admin --> Auth_MW
    Route_Teacher --> Auth_MW
    Route_Student --> Auth_MW

    Auth_MW --> Calc_Engine
    Calc_Engine --> DB_Records
    Route_Admin --> DB_Users
    Route_Admin --> DB_Courses
    Route_Teacher --> DB_Courses
    Route_Teacher --> DB_Requests
    Route_Student --> DB_Requests
    Route_Auth --> DB_Users
```

---

## 📐 Evaluation & Scoring Engine

Final scores are computed out of **75 marks** based on academic grading guidelines:

$$\text{Final Score} = M_{\text{att}} + M_{\text{rep}} + M_{\text{perf}} + M_{\text{quiz}} + M_{\text{test}} + M_{\text{others}}$$

### 1. Attendance Marks ($M_{\text{att}}$, Max = $C_{\text{att}}$)
Calculated from attendance percentage: $P_{\text{att}} = \left(\frac{\text{Classes Present}}{\text{Total Classes Taken}}\right) \times 100$

$$M_{\text{att}} = \begin{cases} 
C_{\text{att}} & \text{if } P_{\text{att}} \ge 90\% \\
0.90 \times C_{\text{att}} & \text{if } 80\% \le P_{\text{att}} < 90\% \\
0.80 \times C_{\text{att}} & \text{if } 70\% \le P_{\text{att}} < 80\% \\
0.70 \times C_{\text{att}} & \text{if } 60\% \le P_{\text{att}} < 70\% \\
0 & \text{if } P_{\text{att}} < 60\% \quad (\text{Non-Collegiate Warning})
\end{cases}$$

### 2. Lab Report Marks ($M_{\text{rep}}$, Max = $C_{\text{rep}}$)
Calculated from report submission percentage: $P_{\text{rep}} = \left(\frac{\text{Reports Submitted}}{\text{Total Assigned Reports}}\right) \times 100$

$$M_{\text{rep}} = \begin{cases} 
C_{\text{rep}} & \text{if } P_{\text{rep}} \ge 90\% \\
0.90 \times C_{\text{rep}} & \text{if } 80\% \le P_{\text{rep}} < 90\% \\
0.80 \times C_{\text{rep}} & \text{if } 70\% \le P_{\text{rep}} < 80\% \\
0.70 \times C_{\text{rep}} & \text{if } 60\% \le P_{\text{rep}} < 70\% \\
0 & \text{if } P_{\text{rep}} < 60\%
\end{cases}$$

### 3. Continuous Performance Marks ($M_{\text{perf}}$, Max = $C_{\text{perf}}$)
Arithmetic mean of recorded daily laboratory experiment marks:

$$M_{\text{perf}} = \frac{\sum_{i=1}^{N} \text{Experiment Mark}_i}{N}$$

### 4. Quizzes, Tests & Others
- **Quiz & Test**: Retrieved directly from the latest recorded evaluation entry.
- **Others**: Cumulative sum of sub-evaluations (Assignment, Presentation, Project), capped at $C_{\text{others}}$:
  $$M_{\text{others}} = \min\left(\sum \text{Other Marks}, C_{\text{others}}\right)$$

---

## 🛠️ Technology Stack

| Category | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.2.6` | Component-driven user interface architecture |
| **Build Tool** | Vite | `^8.0.12` | Next-generation frontend tooling and fast HMR |
| **Routing** | React Router DOM | `^7.15.1` | Client-side declarative routing and protected route wrappers |
| **Styling** | Tailwind CSS | `^4.3.0` | Utility-first CSS engine with PostCSS integration |
| **UI Components** | DaisyUI | `^5.5.20` | Semantic component styling classes |
| **Animations** | Framer Motion | `^12.40.0` | Fluid layout animations and stagger effects |
| **Icons** | Lucide React | `^1.16.0` | Comprehensive lightweight SVG icon library |
| **HTTP Client** | Axios | `^1.16.1` | Promise-based HTTP client with request interceptors |
| **Data Export** | jsPDF / jspdf-autotable | `^4.2.1` / `^5.0.8` | Client-side landscape PDF document generation |
| **Spreadsheets** | XLSX (SheetJS) | `^0.18.5` | Excel workbook generation and parsing |
| **Backend Runtime** | Node.js / Express | `^5.2.1` | Asynchronous RESTful API web server |
| **Database** | MongoDB / Mongoose | `^9.6.2` | Document database and object schema modeling |
| **Authentication** | JSON Web Tokens | `^9.0.3` | Signed token-based authentication |
| **Security** | bcryptjs | `^3.0.3` | Password salting and one-way hashing |
| **Middleware** | CORS / cookie-parser / morgan | `^2.8.6` / `^1.4.7` / `^1.10.1` | Cross-origin protection, cookie parsing, HTTP logging |

---

## 📁 Project Structure

```text
LabEval/
├── backend/
│   ├── config/
│   │   └── db.js                       # Mongoose MongoDB connection setup
│   ├── controllers/
│   │   ├── adminController.js          # Admin stats, teacher/student/course CRUD
│   │   ├── authController.js           # Multi-role registration & login logic
│   │   ├── courseController.js         # Course CRUD & assessment config endpoints
│   │   ├── requestController.js        # Student marks access request workflow
│   │   ├── studentController.js        # Student dashboard metrics & summary
│   │   ├── studentCourseController.js  # Course list & marks breakdown for students
│   │   ├── teacherController.js        # Daily logs (Attendance, Performance, Quiz, etc.)
│   │   └── teacherResultController.js  # Results aggregation & calculation compiler
│   ├── middleware/
│   │   └── authMiddleware.js           # JWT verification & role authorization guards
│   ├── models/
│   │   ├── Admin.js                    # Administrator profile schema with bcrypt hashing
│   │   ├── Attendance.js               # Attendance session model
│   │   ├── Course.js                   # Course schema & assessmentConfig subdocument
│   │   ├── FinalResult.js              # Aggregated result document schema
│   │   ├── Others.js                   # Miscellaneous marks (Assignment/Presentation)
│   │   ├── Performance.js              # Daily experiment performance model
│   │   ├── Quiz.js                     # Quiz marks model
│   │   ├── Report.js                   # Lab report submission model
│   │   ├── Request.js                  # Student access request permissions model
│   │   ├── Student.js                  # Student profile schema with bcrypt hashing
│   │   ├── Teacher.js                  # Teacher profile schema with bcrypt hashing
│   │   └── Test.js                     # Final lab test marks model
│   ├── seeder.js                       # Database seeding script for mock records & Super Admin
│   ├── import_ete_students.js          # Batch student import utility script
│   ├── server.js                       # Express app entry point & CORS configuration
│   ├── package.json                    # Backend dependencies and run scripts
│   └── .env.example                    # Backend environment variable template
├── frontend/
│   ├── public/
│   │   └── RUET.png                    # Official RUET institutional insignia
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js                # Axios instance with Bearer JWT interceptor
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx      # Multi-role route guard component
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # User auth state, multi-role login, register, logout
│   │   │   └── ThemeContext.jsx        # Dark/light theme state & class switcher
│   │   ├── layouts/
│   │   │   ├── DashboardLayout.jsx     # Sidebar, topbar, and portal layout (Admin/Teacher/Student)
│   │   │   └── LandingLayout.jsx       # Public navbar and footer layout
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.jsx  # Admin analytics, teacher, student, and course management
│   │   │   ├── auth/
│   │   │   │   └── AuthPage.jsx        # Unified customized multi-role authentication portal
│   │   │   ├── public/
│   │   │   │   ├── Home.jsx            # Modern landing page with feature cards
│   │   │   │   ├── About.jsx           # System mission and institutional info
│   │   │   │   └── Contact.jsx         # Institutional contact info and support form
│   │   │   ├── student/
│   │   │   │   ├── StudentDashboard.jsx# Student course list & request management
│   │   │   │   └── StudentMarksPage.jsx# Interactive marks dashboard & audit logs
│   │   │   └── teacher/
│   │   │       ├── TeacherDashboard.jsx# Course selector & module navigation hub
│   │   │       ├── Courses.jsx         # Course registration & weight configuration
│   │   │       ├── Attendance.jsx      # Dual Attendance & Report logging grid
│   │   │       ├── Performance.jsx     # Daily experiment performance grading
│   │   │       ├── Quiz.jsx            # Quiz mark entry sheet
│   │   │       ├── Test.jsx            # Lab test mark entry sheet
│   │   │       ├── Others.jsx          # Assignment / presentation grading & bulk paste
│   │   │       └── FinalResult.jsx     # Cumulative board with PDF & Excel export
│   │   ├── App.jsx                     # Route definitions and provider assembly
│   │   ├── main.jsx                    # React DOM entry point
│   │   └── index.css                   # Global styles & Tailwind theme directives
│   ├── package.json                    # Frontend dependencies and Vite scripts
│   ├── vite.config.js                  # Vite build configuration
│   └── .env.example                    # Frontend environment variable template
├── er_diagram.png                      # Visual database entity-relationship diagram
├── workflow_flowchart.png              # Visual application workflow flowchart
├── team_contributions.png              # Team project contribution chart
├── PROJECT_REPORT.md                   # Detailed technical project working documentation
├── netlify.toml                        # Netlify deployment SPA routing configuration
└── README.md                           # Main repository documentation
```

---

## 🔌 API Reference

All protected endpoints require an `Authorization: Bearer <JWT>` header.

### 🔑 Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/student-register` | Register a new student account | Public |
| `POST` | `/api/auth/student-login` | Authenticate student and issue JWT | Public |
| `POST` | `/api/auth/teacher-register` | Register a new teacher account | Public |
| `POST` | `/api/auth/teacher-login` | Authenticate teacher and issue JWT | Public |
| `POST` | `/api/auth/admin-register` | Register a new administrator account | Public |
| `POST` | `/api/auth/admin-login` | Authenticate administrator and issue JWT | Public |

### 🛡️ Administrator Routes (`/api/admin`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | System overview stats & cohort distribution | Admin |
| `GET` | `/api/admin/teachers` | List all teachers with department & search filters | Admin |
| `POST` | `/api/admin/teachers` | Register a new faculty member | Admin |
| `PUT` | `/api/admin/teachers/:id` | Update teacher profile or reset password | Admin |
| `DELETE` | `/api/admin/teachers/:id` | Delete teacher and purge allocated courses | Admin |
| `GET` | `/api/admin/students` | List students with search, dept, and series filters | Admin |
| `POST` | `/api/admin/students` | Register a new student | Admin |
| `PUT` | `/api/admin/students/:id` | Update student profile or reset password | Admin |
| `DELETE` | `/api/admin/students/:id` | Delete student and cascade purge evaluation logs | Admin |
| `GET` | `/api/admin/courses` | List all courses across departments and faculty | Admin |
| `DELETE` | `/api/admin/courses/:id` | Purge course and associated evaluation records | Admin |

### 👨‍🏫 Teacher Routes (`/api/teacher`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teacher/courses` | List all courses owned by authenticated teacher | Teacher |
| `POST` | `/api/teacher/courses` | Create a new course with default config | Teacher |
| `DELETE` | `/api/teacher/courses/:id` | Remove a course and unassign from teacher | Teacher |
| `GET` | `/api/teacher/courses/:id/config` | Get assessment mark breakdown limits | Teacher |
| `PATCH` | `/api/teacher/courses/:id/config` | Update assessment mark breakdown (sum must equal 75) | Teacher |
| `GET` | `/api/teacher/students/any` | Fetch student roster by `department` and `series` | Teacher |
| `POST` | `/api/teacher/attendance/bulk` | Bulk save attendance and report submission records | Teacher |
| `POST` | `/api/teacher/attendance` | Save or update a single attendance record | Teacher |
| `POST` | `/api/teacher/report` | Save or update a single report submission record | Teacher |
| `POST` | `/api/teacher/performance` | Save or update daily experiment performance marks | Teacher |
| `POST` | `/api/teacher/quiz` | Save or update quiz marks | Teacher |
| `POST` | `/api/teacher/test` | Save or update lab test marks | Teacher |
| `POST` | `/api/teacher/others` | Save or update miscellaneous marks (Assignment/Viva) | Teacher |
| `GET` | `/api/teacher/records/:model/:courseId` | Get recorded history for a specific evaluation model | Teacher |
| `GET` | `/api/teacher/results/:courseId` | Compile and retrieve final result calculations | Teacher |
| `GET` | `/api/teacher/requests` | List pending/all student access requests | Teacher |
| `PATCH` | `/api/teacher/requests/:id` | Update student request status (`Accepted` / `Rejected`) | Teacher |

### 🎓 Student Routes (`/api/student`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/student/courses` | Get matching courses with summaries and request statuses | Student |
| `POST` | `/api/student/request` | Submit or re-submit a marks access request | Student |
| `GET` | `/api/student/requests` | List access request history for the logged-in student | Student |
| `GET` | `/api/student/marks/:courseCode` | Retrieve comprehensive marks breakdown *(gated by Approved request)* | Student |

---

## 🔐 Security Implementation

- **Role-Based Access Control (RBAC)**: Custom Express middleware (`protect`, `teacherOnly`, and `adminOnly`) validates token payloads and blocks unauthorized cross-role endpoint execution.
- **Client Route Guards**: React `ProtectedRoute` enforces role-level boundary access, routing users strictly to `/admin`, `/teacher`, or `/student`.
- **Password Salting & Hashing**: Passwords are encrypted before database persistence using `bcryptjs` with 10 salt rounds across Admins, Teachers, and Students.
- **Scoped Student Marks Access**: Student requests are explicitly gated; students cannot query detailed course marks unless their request is reviewed and set to `Accepted` by the course teacher.
- **CORS Protection**: Origin sanitation in `server.js` verifies incoming origins against configured frontend URLs, preventing trailing-slash mismatches and cross-site scripting vulnerabilities.
- **Strict Mark Boundary Enforcement**: Backend upsert controllers validate submitted marks against the course's `assessmentConfig` schema before persisting records.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MongoDB**: A running local instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI

---

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jahid1915/LabEval.git
   cd LabEval
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   ```

   Create a `.env` file in the `backend/` directory based on `.env.example`:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/labeval?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```

   Create a `.env` file in the `frontend/` directory based on `.env.example`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

---

### Database Seeding (Optional)

To seed initial sample courses, teachers, student rosters, and a default Super Admin account into your MongoDB instance:
```bash
cd backend
node seeder.js
```

> **Default Seeded Accounts**:
> - **Super Admin**: `username: admin` | `password: admin123`
> - **Faculty**: `teacherId: T-101` | `password: password123`
> - **Student**: `rollNumber: 2204001` | `password: password123`

---

### Running Locally

To run both services, launch the backend and frontend in separate terminal windows:

- **Terminal 1 (Backend API Server)**:
  ```bash
  cd backend
  npm run dev
  ```
  *Server runs at `http://localhost:5000`*

- **Terminal 2 (Frontend Client)**:
  ```bash
  cd frontend
  npm run dev
  ```
  *Client runs at `http://localhost:5173`*

---

## 🌐 Deployment

### Frontend (Netlify / Vercel)
- The frontend is pre-configured with SPA fallback rewrite rules in both `netlify.toml` and `vercel.json` to ensure client-side routes resolve properly.
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variable**: `VITE_API_BASE_URL=https://your-backend-api-url.com/api`

### Backend (Render / Railway / VPS)
- Node.js runtime environment hosting the Express server.
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT=5000`
  - `MONGO_URI=<Your MongoDB Connection String>`
  - `JWT_SECRET=<Your Production JWT Secret>`
  - `NODE_ENV=production`
  - `FRONTEND_URL=https://your-frontend-domain.netlify.app`

---

## 🧪 Testing

Automated testing suites are not currently included in this repository. Unit and integration test coverage (e.g. using Jest / Vitest / Supertest) can be integrated as part of future updates.

---

## 📈 Roadmap & Future Enhancements

- [ ] **Multi-Teacher Collaboration**: Allow co-instructors or lab assistants to co-manage lab marks under shared course privileges.
- [ ] **Email & Push Notifications**: Automated email notifications to students upon access request approval or attendance warning triggers.
- [ ] **Direct Student Report Submission**: File upload portal allowing students to submit PDF lab reports directly into cloud storage (e.g. S3 / Cloudinary).
- [ ] **Automated CI/CD Workflows**: GitHub Actions pipeline for automated linting, building, and deployment validation.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project (`https://github.com/jahid1915/LabEval/fork`)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

## 👨‍💻 Author & Maintainer

**Jahid Hasan**
- **GitHub**: [@jahid1915](https://github.com/jahid1915)
- **Email**: `jahidhasan29004@gmail.com`

---

## ⭐ Acknowledgements

- **Rajshahi University of Engineering & Technology (RUET)** for academic domain inspiration and institutional workflows.
- [Lucide Icons](https://lucide.dev/) for clean UI iconography.
- [Tailwind CSS](https://tailwindcss.com/) & [DaisyUI](https://daisyui.com/) for UI utility classes.
- [Framer Motion](https://www.framer.com/motion/) for micro-interactions and layout transitions.

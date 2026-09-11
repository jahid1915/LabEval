# LabEval: Continuous Lab Performance Evaluation System
## Project Report & Working Documentation

This document describes the structure, architecture, features, database schemas, and the complete working procedure of **LabEval**, a web application designed to automate and simplify continuous laboratory performance tracking, marks calculation, and final grade compilation for academic courses.

---

## 1. Table of Contents
1. [System Overview & Purpose](#2-system-overview--purpose)
2. [Technology Stack](#3-technology-stack)
3. [Core Features & Functionalities](#4-core-features--functionalities)
4. [System Architecture & Working Procedure](#5-system-architecture--working-procedure)
   - [Phase 1: Account Setup & Auth](#phase-1-account-setup--authentication)
   - [Phase 2: Course Creation & Marking Schemes](#phase-2-course-creation--marking-schemes)
   - [Phase 3: Student Request & Approval Flow](#phase-3-student-request--approval-flow)
   - [Phase 4: Attendance & Lab Report Tracking](#phase-4-attendance--lab-report-tracking)
   - [Phase 5: Lab Performance & Quiz & Lab Test Grades](#phase-5-daily-lab-performance--term-marks-entry)
   - [Phase 6: Automatic Marks Aggregation & Scoring Logic](#phase-6-automatic-marks-aggregation--scoring-logic)
   - [Phase 7: Final Result Sheets & Exporting Options](#phase-7-final-result-sheets--exporting-options)
   - [Phase 8: Student Progress & Marks Portal](#phase-8-student-progress--marks-portal)
5. [Database Schema & Models](#6-database-schema--models)
6. [Visual Flowcharts & Diagrams](#7-visual-flowcharts--diagrams)

---

## 2. System Overview & Purpose
In traditional engineering and science courses, laboratory assessments consist of multiple components: attendance, timely lab report submissions, daily/continuous performance during experiments, quizzes, final lab tests, and other viva/presentation marks. Managing these manually using spreadsheet documents is error-prone, time-consuming, and lacks transparency for students.

**LabEval** provides a unified platform where:
*   **Teachers** can easily set up customized marking schemes per course, register attendance, record report submissions, score daily performance, track quizzes and exams, and compile final results sheets.
*   **Students** gain real-time visibility into their marks breakdown, attendance rates, report submission history, and warning flags if they fall below the required attendance threshold.

---

## 3. Technology Stack
The application is built using a modern decoupled architecture:

*   **Frontend**: 
    *   **React (Vite)**: Component-based UI framework for single-page applications.
    *   **Tailwind CSS**: Utility-first styling framework for responsive design.
    *   **Framer Motion**: Smooth animations and transitions.
    *   **Axios**: Promise-based HTTP client for API communications.
*   **Backend**:
    *   **Node.js & Express.js**: Asynchronous RESTful API framework.
    *   **JSON Web Tokens (JWT) & Cookies**: Secure stateful sessions and role-based route protection.
*   **Database**:
    *   **MongoDB (Mongoose)**: Document-oriented database for storing user data, course configurations, and evaluation records.

---

## 4. Core Features & Functionalities

### For Teachers
1.  **Course Management**: 
    *   Create courses categorized by Course Code, Department, and academic Series (e.g., ETE 2200, Series 22, ETE).
    *   Dynamic configurations for assessment weight distributions.
2.  **Flexible Marks Schemes (Assessment Configuration)**: 
    *   By default, the final marks are evaluated out of **75**.
    *   Teachers can dynamically configure the weight of 6 core components: Attendance, Lab Reports, Continuous Performance, Lab Quizzes, Lab Tests, and Others (e.g. Viva).
3.  **Student Management & Access Control**:
    *   View pending, approved, and rejected access requests from students.
    *   Filter student data by series and department.
4.  **Integrated Attendance & Report Tracker**:
    *   Mark student attendance (Present/Absent) on specific dates/days (e.g., Day 1, Day 2).
    *   Simultaneously toggle daily report submission status (Submitted/Missing) for each student.
    *   Supports Roll Group partitioning (Roll 01-30 and Roll 31-60) for clean UI layout in large classrooms.
    *   Actions: select all, mark all present/absent, and a history-based Undo queue.
5.  **Continuous Grading Portals**:
    *   Enter daily lab performance grades.
    *   Enter quiz marks, test marks, and other extra marks.
    *   Validates entered marks dynamically against the configured component limits to prevent human error.
6.  **Results Aggregation & Compilation**:
    *   Computes final results instantly.
    *   Translates attendance rates and report submission rates into scaled marks.
    *   Highlights warning badges for students with attendance rates below 60%.
7.  **Data Export**: Export student evaluation records to Excel spreadsheets or print/download as PDF documents.

### For Students
1.  **Course Discovery**: Browse a list of all courses matching their department and academic series.
2.  **Secure Access Requests**: Send a request to the teacher of a course to view marks.
3.  **Visual Progress Dashboard**:
    *   Visual progress circle indicating overall score out of 75.
    *   Breakdown card with progress bars showing performance in each marked category.
4.  **Detailed Audits & History**: Expandable records showing exactly which days the student was present/absent, which days reports were submitted/missing, and daily experiment marks.

---

## 5. System Architecture & Working Procedure

The workflow is divided into logical phases to orchestrate communication between the frontend client and backend databases:

```
[Student Portal] --(1. Access Request)--> [Teacher Approval]
                                                |
                                      (2. Configures Course)
                                                |
                                      (3. Logs Daily Data)
                                                |
                                     (4. Auto-Calculate Marks)
                                                |
                                      (5. View/Export Report)
```

### Phase 1: Account Setup & Authentication
1.  Users visit the homepage where they choose to enter either the **Teacher Portal** or **Student Portal**.
2.  Users log in with their credentials (validated using encrypted bcrypt hashes on the backend). 
3.  Upon authentication, a JSON Web Token (JWT) is generated, enabling access to protected dashboard layouts.
4.  Frontend route guards ([ProtectedRoute.jsx](file:///d:/Lab%20Performance/frontend/src/components/ProtectedRoute.jsx)) verify the user's role before serving component dashboards.

### Phase 2: Course Creation & Marking Schemes
1.  A logged-in teacher navigates to the **My Courses** page ([Courses.jsx](file:///d:/Lab%20Performance/frontend/src/pages/teacher/Courses.jsx)) to register their active courses.
2.  For each course, the teacher can define a customized marks breakdown using the configuration dashboard:
    *   **Default Distribution**: Attendance (5), Lab Report (10), Lab Performance (5), Lab Quiz (30), Lab Test (20), Others (5) = **75 Marks**.
    *   If a course does not require quizzes or reports, the teacher can adjust these weights (e.g. setting Quiz to 0 and Lab Test to 50), provided the total remains **75**.
3.  This scheme is saved under the course's `assessmentConfig` object.

### Phase 3: Student Request & Approval Flow
To maintain privacy, students cannot see course marks automatically:
1.  On the **Student Dashboard** ([StudentDashboard.jsx](file:///d:/Lab%20Performance/frontend/src/pages/student/StudentDashboard.jsx)), a student is presented with courses matching their own department and academic series.
2.  The student clicks **Request Marks** which inserts a record into the [Request](file:///d:/Lab%20Performance/backend/models/Request.js) database.
3.  The course teacher sees the pending request on their request management dashboard.
4.  If the teacher clicks **Approve**, the status transitions to `Accepted`. The student is then authorized to view the detailed marks breakdown. If clicked **Reject**, the student is blocked and must re-request.

### Phase 4: Attendance & Lab Report Tracking
1.  For each lab session, the teacher navigates to the **Attendance & Report** tracking page ([Attendance.jsx](file:///d:/Lab%20Performance/frontend/src/pages/teacher/Attendance.jsx)).
2.  The teacher enters the current **Class Day** (e.g., `Day-1`, `Day-2`) and the current **Date**.
3.  To accommodate large lab classes, students are grouped into batches (e.g., Roll 01-30, Roll 31-60).
4.  The teacher updates the status of students. To save time, when a student is marked as **Present**, their Report status is automatically initialized as **Submitted** for the current day.
5.  Clicking **Save Records** triggers a bulk payload to `POST /api/teacher/attendance/bulk` which upserts entries into both the [Attendance](file:///d:/Lab%20Performance/backend/models/Attendance.js) and [Report](file:///d:/Lab%20Performance/backend/models/Report.js) collections in a single roundtrip.

### Phase 5: Daily Lab Performance & Term Marks Entry
Teachers track grades throughout the semester on targeted sheets:
1.  **Lab Performance** ([Performance.jsx](file:///d:/Lab%20Performance/frontend/src/pages/teacher/Performance.jsx)): Teachers record individual grades for the day's experiment/activity.
2.  **Quiz Marks** ([Quiz.jsx](file:///d:/Lab%20Performance/frontend/src/pages/teacher/Quiz.jsx)): Recorded once or twice during the term.
3.  **Lab Test** ([Test.jsx](file:///d:/Lab%20Performance/frontend/src/pages/teacher/Test.jsx)): Recorded during the final examinations.
4.  **Others** ([Others.jsx](file:///d:/Lab%20Performance/frontend/src/pages/teacher/Others.jsx)): Catch-all sheet for vivas, presentation grades, or project defense evaluations.
5.  **Dynamic Caps**: When entering grades, the backend controller (`saveLabRecord` in [teacherController.js](file:///d:/Lab%20Performance/backend/controllers/teacherController.js)) cross-references the course's `assessmentConfig`. If the teacher inputs marks exceeding the limit (e.g., entering 35 for a Quiz capped at 30), the server returns an HTTP 400 error to prevent recording incorrect data.

### Phase 6: Automatic Marks Aggregation & Scoring Logic
When results are queried, the backend compiler ([teacherResultController.js](file:///d:/Lab%20Performance/backend/controllers/teacherResultController.js)) runs aggregation logic to calculate cumulative student marks out of **75**:

1.  **Attendance Mark** (Max = `cfg.attendance`):
    *   Calculated as: $\text{Attendance Percentage} = \frac{\text{Classes Present}}{\text{Total Classes Taken}} \times 100$
    *   Scaled using academic guidelines:
        *   Attendance $\ge 90\% \rightarrow$ Full Marks (`cfg.attendance`)
        *   $80\% \le \text{Attendance} < 90\% \rightarrow 90\%$ of configured maximum mark.
        *   $70\% \le \text{Attendance} < 80\% \rightarrow 80\%$ of configured maximum mark.
        *   $60\% \le \text{Attendance} < 70\% \rightarrow 70\%$ of configured maximum mark.
        *   Attendance $< 60\% \rightarrow$ **0 Marks** (Warning: Student is non-collegiate).
2.  **Lab Report Mark** (Max = `cfg.report`):
    *   Calculated as: $\text{Report Submission Percentage} = \frac{\text{Reports Submitted}}{\text{Total Reports Assigned}} \times 100$
    *   Scaled using the same threshold percentages (Full marks for $\ge 90\%$, scaling down, or 0 marks for $< 60\%$).
3.  **Lab Performance Mark** (Max = `cfg.performance`):
    *   Calculated as the average marks across all submitted experiment records:
        $$\text{Performance Mark} = \frac{\sum(\text{Daily Experiment Marks})}{\text{Total Experiment Records Recorded}}$$
4.  **Quiz & Test Marks** (Max = `cfg.quiz`, `cfg.test`):
    *   Retrieved directly from the latest recorded database entries.
5.  **Others Mark** (Max = `cfg.others`):
    *   Sum of all miscellaneous sub-records, capped at the configured component maximum limit.
6.  **Cumulative Total**:
    *   $$\text{Total Score} = \text{Attendance Mark} + \text{Report Mark} + \text{Performance Mark} + \text{Quiz Mark} + \text{Test Mark} + \text{Others Mark}$$

### Phase 7: Final Result Sheets & Exporting Options
1.  Teachers review the compiled grades on the **Final Results** board ([FinalResult.jsx](file:///d:/Lab%20Performance/frontend/src/pages/teacher/FinalResult.jsx)).
2.  The board highlights student entries who are struggling or non-collegiate with warning banners (e.g. `Attendance below 60%`).
3.  **Export to Excel**: Formats the compiled grid into an `.xlsx` file containing roll numbers, student names, individual component marks, and totals.
4.  **Export to PDF / Print**: Generates a clean, print-friendly grid page of the marks sheet suitable for signing and submitting to the department head or controller of examinations.

### Phase 8: Student Progress & Marks Portal
1.  Once a student's access request is approved, they open the course page from their portal.
2.  The student sees a visual dashboard layout ([StudentMarksPage.jsx](file:///d:/Lab%20Performance/frontend/src/pages/student/StudentMarksPage.jsx)):
    *   An overarching score indicator out of 75 (color-coded: Green $\ge 80\%$, Blue $\ge 60\%$, Yellow $\ge 40\%$, Red $< 40\%$).
    *   Visual progress bars for each assessment category.
    *   Detailed, interactive dropdown sections displaying exact history (dates of presence/absence, report submission dates, and individual experiment marks).

---

## 6. Database Schema & Models
The data is mapped across relational document schemas in MongoDB:

### A. [Teacher Schema](file:///d:/Lab%20Performance/backend/models/Teacher.js)
Stores profile credentials and identity keys for academic staff.
*   `name` (String, Required): Full name of the teacher.
*   `teacherId` (String, Required, Unique, Uppercase): Short identifier code (e.g., `AIS`).
*   `department` (String, Required): Designated department name (e.g., `ETE`).
*   `contactNo` (String, Required): Contact number.
*   `password` (String, Required): Encrypted bcrypt hash.
*   `role` (String, Default: `'teacher'`): User authorization level.
*   `allocatedCourses` (Array): Sub-document array caching references to active courses:
    *   `courseCode`, `courseName`, `series`.

### B. [Student Schema](file:///d:/Lab%20Performance/backend/models/Student.js)
Stores academic profile and credentials of students.
*   `name` (String, Required): Student's full name.
*   `series` (String, Required): Batch series identifier (e.g. `22`).
*   `rollNumber` (String, Required, Unique): Academic roll identifier (e.g. `2211001`).
*   `department` (String, Required): Main department name (e.g. `ETE`).
*   `contactNo` (String, Required): Contact details.
*   `password` (String, Required): Encrypted password.
*   `role` (String, Default: `'student'`): User authorization level.
*   `enrolledCourses` (Array): Tracks student's custom list of course codes.

### C. [Course Schema](file:///d:/Lab%20Performance/backend/models/Course.js)
Defines courses and customized weights for grading calculations.
*   `teacherId` (String, Required): Refers to the instructor (e.g., `AIS`).
*   `courseCode` (String, Required): Designated code (e.g., `ETE2200`).
*   `courseName` (String, Required): Course title.
*   `series` (String, Required): Targeted student year batch.
*   `department` (String, Required): Host department.
*   `assessmentConfig` (Sub-document): Custom marks limits:
    *   `performance` (Number, Default: 5)
    *   `quiz` (Number, Default: 30)
    *   `report` (Number, Default: 10)
    *   `attendance` (Number, Default: 5)
    *   `test` (Number, Default: 20)
    *   `others` (Number, Default: 5)
*   *Indexes*: Unique compound index on `{ teacherId, courseCode, series }`.

### D. [Attendance Schema](file:///d:/Lab%20Performance/backend/models/Attendance.js)
Logs individual session attendance logs.
*   `student` (ObjectId, Ref: 'Student'): Target student link.
*   `course` (String, Required): Link to Course Code.
*   `date` (Date, Required): Date of class session.
*   `dayName` (String, Required): Name of the class day (e.g., `Day-1`).
*   `status` (String, Enum: `['Present', 'Absent']`): Attendance outcome.
*   `teacher` (ObjectId, Ref: 'Teacher'): Submitting teacher.

### E. [Report Schema](file:///d:/Lab%20Performance/backend/models/Report.js)
Logs individual daily report submissions.
*   `student` (ObjectId, Ref: 'Student'): Target student.
*   `course` (String, Required): Target Course Code.
*   `date` (Date, Required): Submission date.
*   `dayName` (String, Required): Class Day title (e.g., `Day-1`).
*   `status` (String, Enum: `['Submitted', 'Not Submitted']`): Submission status.
*   `teacher` (ObjectId, Ref: 'Teacher'): Link to evaluator.

### F. [Performance Schema](file:///d:/Lab%20Performance/backend/models/Performance.js)
*   `student` (ObjectId, Ref: 'Student')
*   `course` (String)
*   `date` (Date)
*   `dayName` (String)
*   `marks` (Number): Grades achieved during daily checks.
*   `teacher` (ObjectId, Ref: 'Teacher')

### G. [Quiz Schema](file:///d:/Lab%20Performance/backend/models/Quiz.js) & [Test Schema](file:///d:/Lab%20Performance/backend/models/Test.js)
*   `student` (ObjectId, Ref: 'Student')
*   `course` (String)
*   `date` (Date)
*   `marks` (Number): Grades received.
*   `teacher` (ObjectId, Ref: 'Teacher')

### H. [Others Schema](file:///d:/Lab%20Performance/backend/models/Others.js)
*   `student` (ObjectId, Ref: 'Student')
*   `course` (String)
*   `date` (Date)
*   `marks` (Number): Grades.
*   `type` (String): Miscellaneous label (e.g., `Viva`, `Presentation`).
*   `teacher` (ObjectId, Ref: 'Teacher')

### I. [Request Schema](file:///d:/Lab%20Performance/backend/models/Request.js)
Maintains course accessibility permissions.
*   `student` (ObjectId, Ref: 'Student', Required)
*   `course` (String, Required): Course Code requesting access to.
*   `status` (String, Enum: `['Pending', 'Accepted', 'Rejected']`): Request progress.
*   `teacher` (String, Required): Target teacher code.
*   *Indexes*: Unique compound index on `{ student, course }`.

---

## 7. Visual Flowcharts & Diagrams
The repository includes graphical assets visualizing system structures:

*   **Database Entity Relations**: View the database fields and schema relationships visually at [er_diagram.png](file:///d:/Lab%20Performance/er_diagram.png).
*   **System Action Flowchart**: View the web app workflow transitions and checks in the flowchart at [workflow_flowchart.png](file:///d:/Lab%20Performance/workflow_flowchart.png).
*   **Team Work Distribution**: See individual contribution breakdowns at [team_contributions.png](file:///d:/Lab%20Performance/team_contributions.png).

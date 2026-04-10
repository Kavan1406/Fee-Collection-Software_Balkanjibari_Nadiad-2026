# Balkan-Ji-Bari, Nadiad - Fee Collection System
## Technical Documentation & System Overview

This document provides a comprehensive overview of the student fee management and dashboard system, designed for developers and administrators.

---

## 1. System Overview
The **Balkan-Ji-Bari Fee Collection System** is a full-stack web application designed to manage student registrations, enrollments, and fee payments. It features a robust multi-role dashboard system for Administrators, Staff, and Students.

### Core Objectives:
- Automate student self-registration and administrative approval.
- Manage year-round course enrollments and batch timings.
- Securely process and track fee payments (Cash & Online).
- Generate professional ID cards and fee receipts.

---

## 2. Technology Stack

### Backend
- **Framework**: Django 4.x + Django Rest Framework (DRF)
- **Database**: PostgreSQL (Hosted on Render)
- **Authentication**: JWT (SimpleJWT) + Two-Factor Authentication (django-otp)
- **Security**: Argon2 Password Hashing, CORS, SSL Enforcement
- **Storage**: Cloudflare R2 / S3-compatible storage for media (Photos/PDFs)
- **Utilities**: Gunicorn (WSGI), Whitenoise (Static Files)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State/Auth**: Context API with persisted JWT storage

---

## 3. Architecture & Data Flow

### Workflow: Student Life Cycle
1.  **Registration**: A prospective student fills a public registration form. Data is stored in `StudentRegistrationRequest`.
2.  **Approval**: Admin reviews the request. Upon "Approval", the system:
    - Creates a `User` account.
    - Creates a `Student` profile.
    - Assigns a unique `student_id` (e.g., `STU059`).
3.  **Enrollment**: Students are enrolled in specific `Subjects` with designated `Batch Times`.
4.  **Payment**: Fees are recorded.
    - **Cash**: Recorded manually by Staff/Admin.
    - **Online**: Integrated with Razorpay, verified via Webhooks/Signatures.
5.  **Output**: System generates a unique `receipt_number` (`RCP-YYYY-XXXX`) and allows PDF downloads.

---

## 4. RBAC (Role-Based Access Control)

The system uses a custom `User` model with defined roles and granular permissions.

### Roles:
- **ADMIN**:
  - Full access to all modules (Dashboard, Students, Payments, Analytics, Reports, Users, Settings).
  - Can accept/reject registration requests.
  - Can manage Staff accounts and permissions.
- **STAFF**:
  - Access is granular based on flags: `can_edit`, `can_manage_students`, `can_manage_payments`.
  - Typically manages daily student inquiries and cash fee collection.
- **STUDENT**:
  - Restricted "Self-Service" access.
  - View own Profile, Courses, and Payment History.
  - Download ID cards and Receipts.

---

## 5. Security Implementation

- **JWT Authentication**: Secure stateless authentication using Access and Refresh tokens.
- **2FA (Two-Factor Authentication)**: Admin accounts can enable TOTP (Google Authenticator) for an extra layer of security.
- **Immutability**: Payment records are designed to be immutable. Once a receipt is generated, it cannot be edited; it can only be marked as `is_deleted` for audit trails.
- **Sensitive Data**: Passwords are hashed using `Argon2`. `.env` files manage secrets.

---

## 6. Database Schema (Key Tables)

- `users`: Core authentication table (Custom `AbstractUser`).
- `students`: Detailed profile information linked to `users`.
- `subjects`: Course catalogue with fee structures.
- `enrollments`: Junction table linking Students to Subjects and Batch Times.
- `payments`: Transaction records with Razorpay and Receipt details.
- `student_registration_requests`: Pre-approval storage for new applications.

---

## 7. Performance & Scaling

- **Connection Pooling**: Optimized with `CONN_MAX_AGE` for database efficiency.
- **Static Assets**: Cloudflare R2 provides fast global delivery of student photos and generated PDFs.
- **Deployment**:
  - **Backend**: Render (Global/Singapore region to match DB).
  - **Frontend**: Vercel (Optimized Next.js hosting).

---

## 8. Developer Quickstart

### Backend Setup:
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python manage.py migrate`
4. `python manage.py runserver`

### Frontend Setup:
1. `npm install`
2. `npm run dev`

### Deployment (Render):
- Build Command: `./build.sh`
- Start Command: `gunicorn config.wsgi:application`
- Environment Variables: Ensure `DATABASE_URL` and `SECRET_KEY` are set.

---
*Documentation prepared on March 9, 2026.*

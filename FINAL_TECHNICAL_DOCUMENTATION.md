# Technical Documentation: Balkan-Ji-Bari Fee Collection System

## 1. Project Overview
The **Balkan-Ji-Bari Fee Collection System** is a comprehensive, full-stack web application designed to streamline student registration, enrollment, and fee management. It provides a secure and efficient platform for administrators, staff, and students to manage academic and financial records.

## 2. Technology Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Context API
- **API Client**: [Axios](https://axios-http.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **UI Components**: custom-built using Radix UI primitives
- **Visualization**: [Recharts](https://recharts.org/) for analytics dashboards

### Backend
- **Framework**: [Django](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Production) / SQLite (Local)
- **Authentication**: JWT (JSON Web Tokens) with `djangorestframework-simplejwt`
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA for Admin/Staff
- **Storage**: [Cloudinary](https://cloudinary.com/) for student photos and media

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Version Control**: Git

## 3. Key Features

### 3.1. User Role System (RBAC)
The system implements Role-Based Access Control with four primary roles:
- **Admin**: Full system access, including user management and reporting.
- **Staff**: Operational access for student registration and fee processing.
- **Accountant**: Focused access for financial tracking and student ledgers.
- **Student**: Personalized dashboard for viewing subjects, payments, and profile.

### 3.2. Student Registration Workflow
1. **Application**: Prospective students submit registration requests through a public/private portal.
2. **Review**: Admins or Staff review requests, checking student details and payment methods.
3. **Approval**: Upon approval, the system automatically:
   - Generates a unique Student ID (e.g., STU001).
   - Creates a secure User account for the student.
   - Generates an ID Card and initial Welcome materials.

### 3.3. Fee Management System
- **Subject-based Billing**: Fees are calculated based on enrolled subjects.
- **Payment Processing**: Supports Offline (Cash/Check) and Online payment methods.
- **Automatic Receipts**: Generates downloadable PDF receipts for every transaction.
- **Student Ledger**: A detailed history of all financial transactions (debits and credits).

### 3.4. Security Features
- **JWT-based Auth**: Secure communication between frontend and backend.
- **2FA Support**: Extra layer of security for administrative accounts.
- **CORS Configuration**: Hardened settings for secure cross-origin requests between Vercel and Render.

## 4. System Architecture
- **API-First Design**: The backend serves as a stateless RESTful API.
- **Decoupled Architecture**: Frontend and Backend are hosted independently, communicating over HTTPS.
- **Cloud-Native Media**: Images are offloaded to Cloudinary CDN for optimal performance and secure storage.

## 5. Recent Improvements
- **Robust Error Handling**: Enhanced registration endpoint to handle large data and system constraints without failure.
- **Cloudinary Integration**: Optimized photo URL generation for reliable image loading across all dashboards.
- **CORS Hardening**: Resolved cross-origin issues for seamless live deployments.

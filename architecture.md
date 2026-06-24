Project: TaskTracer (EVS Task Tracking SaaS)
Purpose: Multi-tenant SaaS platform allowing EVS workers to complete daily duties while supervisors verify completion with timestamps, photos, and reports.

Supports:
- Web Application (desktop & mobile browser)
- Native Mobile Apps (iOS + Android)
- Multi-company SaaS platform

1. Architecture Overview

+--------------------------+
|       Web App (Next)     |
+-------------+------------+
              |
+-------------v------------+
|     API Server (Node)    |
|      Express + Socket    |
+------+------+------------+
       |      |
+------v--+  +v------------------+   +-------------------+
| MongoDB |  | Redis (Upstash)   |   | Cloudinary        |
| Atlas   |  | Cache + Pub/Sub   |   | File Storage      |
+---------+  +-------------------+   +-------------------+

2. Infrastructure
Frontend Hosting
- Vercel (Next.js optimized, global CDN)

Backend Hosting
- Render (Node.js API + Socket.io)

Database
- MongoDB Atlas (managed, backups, scaling)

Cache & Queues
- Redis (Upstash or managed Redis)
- Used for rate limiting, pub/sub, session caching

File Storage (Photos / Proof)
- Cloudinary

3. Applications
3.1 Web Application
- Next.js 14 + TailwindCSS + Zustand
- Users: Supervisors, Admins, Associates (optional)
- Features: dashboards, scheduling, reporting, staff management

3.2 Mobile Application
- React Native (Expo) + SQLite offline storage
- Primary users: EVS Associates
- Features: task list, photo proof, QR scan, offline mode, auto-sync

4. Multi-Tenant SaaS Model
Each company is a tenant.
All records include tenantId.
Example:
{
  tenantId: "hospitalA",
  associateId: "user1",
  duty: "Clean restroom",
  status: "completed"
}

5. Authentication
- Self-hosted JWT auth
- bcrypt password hashing
- Access + refresh tokens

6. Real-Time System
- Socket.io for live updates
- Flow: complete task -> API -> Redis pub/sub -> Socket.io broadcast

7. Offline Support
- Local SQLite DB
- Offline task queue
- Auto-sync when online

8. File Upload Flow
- App requests signed upload params
- Client uploads directly to Cloudinary
- Client sends Cloudinary secure URL back to API
- Task marked completed

9. Core Services
- Auth Service
- Task Service
- Schedule Service
- Supervisor Service
- Reporting Service
- Billing Service (Square)

10. Deployment
CI/CD
- GitHub Actions
- Build + test on push
- Deploy backend to Render
- Deploy web app to Vercel

11. Security
- HTTPS everywhere
- JWT auth + role permissions
- Encrypted passwords
- Signed upload parameters
- Tenant data isolation

12. Folder Structure
- backend/
  - controllers/
  - services/
  - models/
  - routes/
  - sockets/

- web/
  - app/
  - components/
  - hooks/
  - store/

- mobile/
  - screens/
  - components/
  - store/
  - offline/

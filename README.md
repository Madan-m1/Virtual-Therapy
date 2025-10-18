# 🧠 Virtual Therapy Platform for Conflict-Affected Regions

A secure, scalable, and accessible virtual mental health support system empowering individuals in conflict zones to connect with therapists remotely.

## 🌍 Overview

In regions affected by war or crisis, millions face mental trauma but lack access to professional care. This project bridges that gap through a tech-driven, AI-assisted therapy platform — enabling users to connect with certified therapists, book sessions, and access emotional support securely and privately.

## ✨ Features (As of Review-II)

- ✅ **Dual Authentication System** — Separate login/registration for Users and Therapists  
- ✅ **Role-Based Access Control** — Secure JWT authentication with role-specific permissions  
- ✅ **Session Booking System** — Users can book therapy sessions with therapists  
- ✅ **Therapist Dashboard** — View, manage, and track booked appointments  
- ✅ **User Dashboard** — View and cancel sessions, browse therapists dynamically  
- ✅ **MongoDB Integration** — Secure, connected backend data flow  
- ✅ **Modern UI** — Calm, minimalist design with Tailwind CSS  
- ✅ **Responsive Frontend** — Built with React.js and role-aware navigation  

## 🧩 System Architecture

Frontend (React + Tailwind)  
↓  
Backend (Node.js + Express)  
↓  
Database (MongoDB Atlas)  
↓  
AI Service (Flask / Python – upcoming)

### 🔄 Flow

1. Users/Therapists → Register/Login → JWT Token → Access Role-Based Dashboards  
2. Users → Fetch Therapist List → Book Session  
3. Therapist Dashboard Updates in Real-Time  

## ⚙️ Tech Stack

| Layer               | Technology                                      |
|--------------------|--------------------------------------------------|
| **Frontend**        | React.js, TailwindCSS, Axios, React Router      |
| **Backend**         | Node.js, Express.js, JWT, bcrypt                |
| **Database**        | MongoDB Atlas                                   |
| **AI Integration**  | Python, Flask, Hugging Face Transformers (upcoming) |
| **Real-Time Comm.** | WebRTC, Socket.io (upcoming)                    |
| **Deployment**      | Render (Backend), Vercel (Frontend)             |

## 🧠 Key Modules

| Module             | Description                                                  |
|--------------------|--------------------------------------------------------------|
| **Authentication** | Secure login & registration for users and therapists         |
| **Session Mgmt.**  | Book, view, and cancel therapy sessions                      |
| **Role-Based Access** | Different dashboards and permissions for each role       |
| **Database Design** | Linked collections for users, therapists, and sessions      |
| **UI/UX Design**   | Calm, mental-health-themed interface with Tailwind CSS       |

## 🧪 Demo Flow

1. Register as a **User** or **Therapist**  
2. Login using your credentials  
3. **User** → Dashboard → Select a Therapist → Book Session  
4. **Therapist** → Dashboard → View Appointments Instantly  
5. Logout securely via Navbar  

## 🚀 Upcoming Milestones (Phase 6+)

- 🔹 Real-Time Video/Chat using WebRTC + Socket.io  
- 🔹 Emotion/Sentiment Analysis via Flask AI Microservice  
- 🔹 Resource Library for trauma coping strategies  
- 🔹 NGO Collaboration Portal for multi-user device sharing  
- 🔹 Deployment on Render + Vercel for public access  

## 📂 Repository Structure

Virtual-Therapy/  
├── backend/  
│   ├── models/  
│   ├── routes/  
│   ├── controllers/  
│   └── index.js  
├── frontend/  
│   ├── src/  
│   │   ├── pages/  
│   │   ├── components/  
│   │   ├── services/  
│   │   └── App.js  
│   └── tailwind.config.js  
├── README.md  
└── package.json  

## 📸 UI Preview

- 🧍‍♂️ **User Dashboard** – Book and view therapy sessions  
- 👩‍⚕️ **Therapist Dashboard** – Manage and track appointments  
- 🎨 **Login/Register Pages** – Minimal, soothing gradient UI  

## 📜 License

This project is open-source under the **MIT License**.  
Use, adapt, and contribute freely.

## 🤝 Contributing

Contributions are always welcome!

1. Fork the repo  
2. Create a new branch (`feature/add-something`)  
3. Commit your changes  
4. Open a Pull Request  

## 📞 Contact

- 👤 **Developer**: Madan Kumar  
- 📧 **Email**: madan.20242mca0309@presidencyuniversity.in  
- 🔗 **GitHub**: [Madan-m1/Virtual-Therapy](https://github.com/Madan-m1/Virtual-Therapy)

> 🌱 *“Healing begins with connection — and technology can help make that connection possible.”*
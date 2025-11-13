# 🧠 Virtual Therapy Platform for Conflict-Affected Regions

A secure, scalable, and accessible virtual mental health support system empowering individuals in conflict zones to connect with therapists remotely.

## 🌍 Overview

Millions of people living in conflict or crisis zones face extreme psychological trauma and limited access to mental health professionals.  
This project bridges that gap by providing a tech-driven virtual therapy platform where:

- Users can connect with certified therapists  
- Sessions can be booked and managed easily  
- Communication remains secure and private  
- AI-driven insights can assist therapists (upcoming)  

## ✨ Features (Completed as of Review-II)

- ✅ **Dual Authentication System** — Separate login/registration for Users & Therapists  
- ✅ **Role-Based Access Control** — Secure JWT tokens with role-specific permissions  
- ✅ **Session Booking System** — Users can book therapy sessions  
- ✅ **Therapist Dashboard** — View, accept, and manage appointments  
- ✅ **User Dashboard** — View, track, and cancel booked sessions  
- ✅ **MongoDB Integration** — Clean and connected schema  
- ✅ **Modern UI/UX** — Calm design using Tailwind CSS  
- ✅ **Responsive Frontend** — Built with React.js  

## 🧩 System Architecture

Frontend (React + TailwindCSS)  
↓  
Backend (Node.js + Express)  
↓  
Database (MongoDB Atlas)  
↓  
AI Microservice (Flask / Python – upcoming)  

### 🔄 Application Flow

1. User/Therapist → Register/Login → JWT issued  
2. Role-based dashboard access  
3. User views therapist list → books session  
4. Therapist dashboard updates in real time  
5. Secure logout via navbar  

## ⚙️ Tech Stack

| Layer               | Technologies                                   |
|---------------------|------------------------------------------------|
| **Frontend**        | React.js, TailwindCSS, Axios, React Router     |
| **Backend**         | Node.js, Express.js, JWT, bcrypt               |
| **Database**        | MongoDB Atlas                                  |
| **AI Integration**  | Python, Flask, Hugging Face Transformers (upcoming) |
| **Real-Time Comm.** | WebRTC, Socket.io (upcoming)                   |
| **Deployment**      | Render (Backend), Vercel (Frontend)            |

## 🧠 Key Modules

| Module              | Description                                                  |
|---------------------|--------------------------------------------------------------|
| **Authentication**  | Secure registration/login for Users & Therapists             |
| **Session Mgmt.**   | Book, view, manage, and cancel therapy sessions              |
| **Role-Based Access** | Dashboard-level and API-level permission control           |
| **Database Design** | Structured collections for Users, Therapists, Sessions       |
| **UI/UX Design**    | Minimal, mental-health-focused interface                     |

## 🧪 Demo Flow

1. Register as **User** or **Therapist**  
2. Login with email & password  
3. **User** → Choose Therapist → Book Session  
4. **Therapist** → View New Bookings → Manage Sessions  
5. Logout securely via navbar  

## 🚀 Upcoming Milestones (Phase 6+)

- 🔹 Real-Time Video + Chat using WebRTC & Socket.io  
- 🔹 Emotion/Sentiment Analysis via Python AI microservice  
- 🔹 Resource Library for trauma coping strategies  
- 🔹 NGO Collaboration Mode (multi-user per device)  
- 🔹 Deployment on Render + Vercel (public access)  

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

- 🧍‍♂️ **User Dashboard** — Book & view therapy sessions  
- 👩‍⚕️ **Therapist Dashboard** — Manage incoming appointments  
- 🔐 **Login/Register Pages** — Clean, soothing gradient UI  

*(Screenshots will be added after UI polishing)*  

## 📜 License

This project is open-source under the **MIT License**.  
You are free to use, modify, and contribute.  

## 🤝 Contributing

Contributions are welcome!  

1. Fork the repository  
2. Create a new branch:  
   ```bash
   git checkout -b feature/your-feature 
3. Commit your changes  
4. Open a Pull Request  

## 📞 Contact

- 👤 **Developer**: Madan Kumar  
- 📧 **Email**: madan.20242mca0309@presidencyuniversity.in  
- 🔗 **GitHub**: [Madan-m1/Virtual-Therapy](https://github.com/Madan-m1/Virtual-Therapy)

> 🌱 *“Healing begins with connection — and technology can help make that connection possible.”*
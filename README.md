# Personal Library Management System

A modern, responsive web application for tracking your personal reading journey. Search for books, manage your reading list, track progress, and discover new titles with a beautiful, intuitive interface.

## ✨ Features

- **Book Search**: Search and discover books using the OpenLibrary API
- **Personal Library**: Organize books by reading status (Want to Read, Currently Reading, Completed)
- **Reading Progress**: Track your reading progress with page counters and completion percentages  
- **Responsive Design**: Fully mobile-responsive with card-based layouts for small screens
- **Modern UI**: Clean, modern interface inspired by popular reading platforms
- **Dark/Light Theme**: Toggle between light and dark modes
- **Reading Analytics**: View reading statistics and progress over time

## 🛠️ Tech Stack

### Frontend
- **React** with **TypeScript** - Modern React with full type safety
- **Responsive Design** - Mobile-first approach with CSS Grid/Flexbox
- **Modern CSS** - Styled components or CSS modules for component styling

### Backend  
- **Express.js** with **TypeScript** - RESTful API with full type safety
- **PostgreSQL** - Robust relational database for data persistence
- **Prisma ORM** - Type-safe database access and migrations
- **JWT Authentication** - Secure user authentication and authorization

### External APIs
- **OpenLibrary API** - Book search, metadata, and cover images

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd library-project
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies  
   cd ../frontend
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb library_db
   
   # Set up environment variables
   cp backend/.env.example backend/.env
   # Edit .env with your database credentials
   
   # Run database migrations
   cd backend
   npx prisma migrate dev
   ```

4. **Start the development servers**
   ```bash
   # Start backend server (port 3001)
   cd backend
   npm run dev
   
   # Start frontend server (port 3000)
   cd ../frontend  
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 Mobile Responsiveness

The application is built with a mobile-first approach:
- **Responsive Grid**: Book displays adapt from grid to single-column on mobile
- **Card Layout**: Tables transform into card-based layouts on smaller screens
- **Touch-Friendly**: All interactive elements are optimized for touch input
- **Responsive Navigation**: Sidebar collapses into hamburger menu on mobile

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Books
- `GET /api/books/search` - Search books via OpenLibrary
- `POST /api/books` - Add book to database
- `GET /api/books/:id` - Get book details

### User Library
- `GET /api/user/books` - Get user's personal library
- `POST /api/user/books` - Add book to personal library
- `PUT /api/user/books/:id` - Update reading status/progress
- `DELETE /api/user/books/:id` - Remove book from library

## 🗂️ Project Structure

```
library-project/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   ├── prisma/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── types/
│   └── package.json
├── PLAN.md
└── README.md
```

## 🎨 UI Design

The interface draws inspiration from modern reading platforms featuring:
- Clean, card-based book display
- Intuitive sidebar navigation
- Reading progress indicators
- Trending authors and popular content sections
- Seamless search experience

## 📊 Database Schema

Key entities include:
- **Users** - User accounts and authentication
- **Books** - Book metadata from OpenLibrary
- **UserBooks** - User's personal library with reading status
- **Authors** - Author information and relationships
- **ReadingProgress** - Detailed progress tracking

## 🔮 Future Enhancements

- Reading goals and challenges
- Book recommendations algorithm
- Social features (friends, book clubs)
- Advanced analytics and insights
- Offline reading support (PWA)
- Book review and rating system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenLibrary](https://openlibrary.org/) for providing the book data API
- Design inspiration from modern reading platforms
- The React and Node.js communities for excellent tooling
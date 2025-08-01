# 🌸 Phool - AI-Powered Flower Identification App

![Phool Logo](https://images.unsplash.com/photo-1496062031456-07b8f162a322?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxyb3NlfGVufDB8fHx8MTc1NDA0MDE5NHww&ixlib=rb-4.1.0&q=85&w=200&h=200)

A beautiful, AI-powered Progressive Web App for identifying flowers and discovering their fascinating stories, built with React, FastAPI, and Google Gemini AI.

## ✨ Features

- 🤖 **AI-Powered Identification**: Uses Google Gemini API for accurate flower identification
- 📱 **Progressive Web App**: Installable on mobile devices with offline capabilities
- 📷 **Camera Integration**: Take photos or upload images for identification
- 🔐 **User Authentication**: Secure login system with Emergent authentication
- 📚 **Comprehensive Information**: Detailed flower data including:
  - Scientific classification
  - Care instructions
  - Cultural significance
  - Historical stories and legends
  - Cultivation tips
- 💾 **Local History**: Save and review past identifications
- 🎨 **Beautiful UI**: Modern, responsive design with flower-themed styling
- 🌍 **Mobile Optimized**: Touch-friendly interface optimized for mobile devices

## 🚀 Live Demo

- **Web App**: [Your deployed URL here]
- **PWA Installation**: Visit the web app on mobile and tap "Add to Home Screen"

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful UI components
- **PWA** - Service worker for offline functionality

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB** - NoSQL database for user data
- **Google Gemini API** - AI-powered flower identification
- **Emergent Authentication** - Secure user authentication system

### Mobile
- **Progressive Web App (PWA)** - App-like experience on mobile
- **Camera API** - Native camera integration
- **Local Storage** - Offline data persistence

## 📁 Project Structure

```
phool-flower-app/
├── frontend/                 # React PWA application
│   ├── public/              # Static assets
│   │   ├── manifest.json    # PWA manifest
│   │   ├── sw.js           # Service worker
│   │   └── index.html      # HTML template
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── lib/           # Utility functions
│   │   ├── hooks/         # Custom React hooks
│   │   ├── App.js         # Main application component
│   │   ├── App.css        # Application styles
│   │   └── index.js       # Application entry point
│   ├── package.json       # Dependencies and scripts
│   └── tailwind.config.js # Tailwind configuration
├── backend/                # FastAPI backend
│   ├── server.py          # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── android/              # Android TWA (for Play Store)
├── docs/                 # Documentation
└── README.md            # This file
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB (local or cloud)
- Google Gemini API key

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Create .env file with:
# GEMINI_API_KEY=your_google_gemini_api_key
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=phool_db

python server.py
```

### Environment Variables
Create `.env` files in both frontend and backend directories:

**Backend (.env):**
```env
GEMINI_API_KEY=your_google_gemini_api_key
MONGO_URL=mongodb://localhost:27017
DB_NAME=phool_db
```

**Frontend (.env):**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 📱 Mobile App Development

### PWA Installation
The app is already optimized as a PWA. Users can install it directly from their mobile browser.

### Android App (Play Store)
For Play Store deployment, we use Trusted Web Activities (TWA):

1. **Setup Android Studio**
2. **Create TWA Project**
3. **Configure Digital Asset Links**
4. **Build and Sign APK**

Detailed instructions in `/android/README.md`

## 🔑 API Keys Required

1. **Google Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create a new API key
   - Add to backend `.env` file

2. **Emergent Authentication**
   - Automatically configured
   - No additional setup required

## 🧪 Testing

### Backend Tests
```bash
cd backend
python backend_test.py
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Mobile Testing
1. Deploy to HTTPS environment
2. Test on actual mobile devices
3. Verify camera functionality
4. Test PWA installation

## 🚀 Deployment

### Web Deployment (Emergent Platform)
1. Click "Deploy" in Emergent interface
2. Wait for deployment completion
3. Share HTTPS URL for mobile testing

### Play Store Deployment
1. Create TWA wrapper
2. Build signed APK
3. Submit to Google Play Console
4. Complete store listing

## 📊 Features Roadmap

- [ ] Social sharing of identifications
- [ ] Offline identification capability
- [ ] Plant care reminders
- [ ] Augmented reality flower overlay
- [ ] Community flower database
- [ ] Multiple language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- Google Gemini AI for flower identification
- Emergent platform for hosting and authentication
- Unsplash for beautiful flower imagery
- shadcn/ui for beautiful UI components
- The open-source community for amazing tools

## 📞 Support

For support, email your-email@example.com or create an issue in this repository.

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Made with ❤️ for flower enthusiasts everywhere** 🌻🌺🌹
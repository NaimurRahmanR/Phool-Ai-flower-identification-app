import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Camera, Upload, History, Flower, Loader2, ChevronLeft, User, LogOut } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('splash');
  const [selectedImage, setSelectedImage] = useState(null);
  const [identificationResult, setIdentificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [identificationHistory, setIdentificationHistory] = useState([]);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Load history and auth data from local storage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('phool-history');
    if (savedHistory) {
      setIdentificationHistory(JSON.parse(savedHistory));
    }
    
    const savedSessionToken = localStorage.getItem('phool-session-token');
    if (savedSessionToken) {
      setSessionToken(savedSessionToken);
      fetchUserProfile(savedSessionToken);
    }
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('phool-history', JSON.stringify(identificationHistory));
  }, [identificationHistory]);

  // Parse URL fragment for authentication callback
  useEffect(() => {
    const handleAuthCallback = () => {
      const fragment = window.location.hash;
      console.log('Current URL fragment:', fragment);
      
      if (fragment.includes('session_id=')) {
        const sessionId = fragment.split('session_id=')[1].split('&')[0];
        console.log('Found session ID:', sessionId);
        authenticateWithSession(sessionId);
        // Clear the fragment
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleAuthCallback();
    
    // Also listen for hash changes
    window.addEventListener('hashchange', handleAuthCallback);
    return () => window.removeEventListener('hashchange', handleAuthCallback);
  }, []);

  // Splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentView('main');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
        headers: {
          'X-Session-ID': token
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const authenticateWithSession = async (sessionId) => {
    console.log('Authenticating with session ID:', sessionId);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId })
      });

      console.log('Auth response status:', response.status);

      if (response.ok) {
        const authData = await response.json();
        console.log('Authentication successful:', authData.user);
        setUser(authData.user);
        setSessionToken(authData.session_token);
        localStorage.setItem('phool-session-token', authData.session_token);
        setError(null); // Clear any previous errors
      } else {
        const errorData = await response.text();
        console.error('Authentication failed:', errorData);
        setError('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication error. Please check your connection.');
    }
  };

  const handleLogin = () => {
    try {
      const currentUrl = window.location.origin;
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(currentUrl)}`;
      console.log('Attempting login redirect to:', authUrl);
      console.log('Current URL for localhost check:', currentUrl);
      
      // TEMPORARY TEST: Force localhost behavior for testing
      const isLocalhost = currentUrl.includes('localhost') || true; // Force true for testing
      
      // For localhost, show deployment message
      if (isLocalhost) {
        console.log('Localhost detected (or forced for testing), showing error message');
        setError('⚠️ Login requires HTTPS deployment. Click "Deploy" button in Emergent to test authentication with a live HTTPS URL.');
        return;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Try popup approach first (better for user experience)
      try {
        const popup = window.open(
          authUrl,
          'phool-login',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (popup) {
          // Monitor popup for completion
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              // Check for authentication success
              window.location.reload();
            }
          }, 1000);
          
          // Fallback: close popup after 5 minutes
          setTimeout(() => {
            if (!popup.closed) {
              popup.close();
              clearInterval(checkClosed);
              setError('Login timeout. Please try again.');
            }
          }, 300000);
        } else {
          throw new Error('Popup blocked');
        }
      } catch (popupError) {
        console.log('Popup failed, trying direct redirect:', popupError);
        // Fallback to direct redirect
        window.location.href = authUrl;
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please ensure popups are allowed and try again.');
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/logout`, {
          method: 'POST',
          headers: {
            'X-Session-ID': sessionToken
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSessionToken(null);
      localStorage.removeItem('phool-session-token');
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      // Check for mobile devices and request rear camera
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraMode(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported in this browser.';
      } else {
        errorMessage += 'Please ensure you are using HTTPS and camera permissions are granted.';
      }
      
      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraMode(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        setSelectedImage({
          file: blob,
          preview: canvas.toDataURL()
        });
        stopCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage({
          file: file,
          preview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const identifyFlower = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage.file);

      const headers = {};
      if (sessionToken) {
        headers['X-Session-ID'] = sessionToken;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/identify-flower`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to identify flower');
      }

      const result = await response.json();
      setIdentificationResult(result);
      
      // Add to history
      setIdentificationHistory(prev => [result, ...prev.slice(0, 49)]); // Keep last 50
      
    } catch (error) {
      setError('Failed to identify flower. Please try again.');
      console.error('Identification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetApp = () => {
    setSelectedImage(null);
    setIdentificationResult(null);
    setError(null);
    stopCamera();
  };

  const SplashScreen = () => (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="flower-icon">
          <Flower size={80} />
        </div>
        <h1 className="app-title">Phool</h1>
        <p className="app-subtitle">Discover the world of flowers</p>
        <div className="loading-dots">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </div>
  );

  const HistoryView = () => (
    <div className="history-view">
      <div className="header">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView('main')}
          className="back-btn"
        >
          <ChevronLeft size={20} />
          Back
        </Button>
        <h2>Identification History</h2>
      </div>
      
      {identificationHistory.length === 0 ? (
        <div className="empty-history">
          <Flower size={48} />
          <p>No flowers identified yet</p>
          <Button onClick={() => setCurrentView('main')}>
            Start Identifying
          </Button>
        </div>
      ) : (
        <div className="history-list">
          {identificationHistory.map((item) => (
            <Card key={item.id} className="history-item">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.flower_name}</CardTitle>
                    <p className="text-sm text-gray-600">{item.scientific_name}</p>
                  </div>
                  <Badge variant={
                    item.confidence === 'High' ? 'default' :
                    item.confidence === 'Medium' ? 'secondary' : 'outline'
                  }>
                    {item.confidence}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{item.basic_facts.substring(0, 150)}...</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(item.timestamp).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (currentView === 'splash') {
    return <SplashScreen />;
  }

  if (currentView === 'history') {
    return <HistoryView />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <Flower size={32} />
            <h1>Phool</h1>
          </div>
          <div className="header-actions">
            {user ? (
              <div className="user-menu">
                <div className="user-info">
                  <img src={user.picture} alt={user.name} className="user-avatar" />
                  <span className="user-name">{user.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  <LogOut size={18} />
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleLogin}
                className="login-btn"
              >
                <User size={18} />
                Login
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('history')}
              className="history-btn"
            >
              <History size={18} />
              History
            </Button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {!selectedImage && !isCameraMode && (
          <div className="welcome-section">
            <h2>Identify Any Flower</h2>
            <p>Upload a photo or take a picture to discover detailed information about flowers</p>
            
            <div className="action-buttons">
              <Button 
                onClick={startCamera}
                className="action-btn camera-btn"
                size="lg"
              >
                <Camera size={24} />
                Take Photo
              </Button>
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="action-btn upload-btn"
                size="lg"
              >
                <Upload size={24} />
                Upload Image
              </Button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />
          </div>
        )}

        {isCameraMode && (
          <div className="camera-section">
            {cameraError ? (
              <div className="camera-error">
                <p>{cameraError}</p>
                <Button onClick={stopCamera} variant="outline">
                  Back to Upload
                </Button>
              </div>
            ) : (
              <>
                <div className="camera-container">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="camera-video"
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
                
                <div className="camera-controls">
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                  <Button onClick={capturePhoto} className="capture-btn">
                    Capture
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {selectedImage && !identificationResult && (
          <div className="image-preview-section">
            <div className="image-preview">
              <img src={selectedImage.preview} alt="Selected flower" />
            </div>
            
            <div className="preview-actions">
              <Button variant="outline" onClick={resetApp}>
                Choose Different Image
              </Button>
              <Button 
                onClick={identifyFlower} 
                disabled={isLoading}
                className="identify-btn"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                {isLoading ? 'Identifying...' : 'Identify Flower'}
              </Button>
            </div>
          </div>
        )}

        {identificationResult && (
          <div className="results-section">
            <div className="result-header">
              <img src={selectedImage.preview} alt="Identified flower" className="result-image" />
              <div className="result-title">
                <h2>{identificationResult.flower_name}</h2>
                <p className="scientific-name">{identificationResult.scientific_name}</p>
                <Badge variant={
                  identificationResult.confidence === 'High' ? 'default' :
                  identificationResult.confidence === 'Medium' ? 'secondary' : 'outline'
                }>
                  {identificationResult.confidence} Confidence
                </Badge>
              </div>
            </div>

            <Tabs defaultValue="facts" className="result-tabs">
              <TabsList className="tabs-list">
                <TabsTrigger value="facts">Facts</TabsTrigger>
                <TabsTrigger value="care">Care</TabsTrigger>
                <TabsTrigger value="culture">Culture</TabsTrigger>
                <TabsTrigger value="story">Story</TabsTrigger>
              </TabsList>
              
              <TabsContent value="facts" className="tab-content">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="info-item">
                      <strong>Family:</strong> {identificationResult.family}
                    </div>
                    <div className="info-item">
                      <strong>Facts:</strong> {identificationResult.basic_facts}
                    </div>
                    <div className="info-item">
                      <strong>Season:</strong> {identificationResult.seasonal_info}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="care" className="tab-content">
                <Card>
                  <CardHeader>
                    <CardTitle>Care Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="info-item">
                      <strong>General Care:</strong> {identificationResult.care_instructions}
                    </div>
                    <div className="info-item">
                      <strong>Cultivation Tips:</strong> {identificationResult.cultivation_tips}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="culture" className="tab-content">
                <Card>
                  <CardHeader>
                    <CardTitle>Cultural Significance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{identificationResult.symbolic_meanings}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="story" className="tab-content">
                <Card>
                  <CardHeader>
                    <CardTitle>Interesting History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{identificationResult.interesting_story}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="result-actions">
              <Button variant="outline" onClick={resetApp}>
                Identify Another Flower
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <Button onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
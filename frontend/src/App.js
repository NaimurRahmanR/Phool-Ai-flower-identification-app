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
  const [hasCameraDevice, setHasCameraDevice] = useState(true); // Assume true initially

  // Check for camera availability on component mount
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasCameraDevice(videoDevices.length > 0);
          console.log('Camera devices found:', videoDevices.length);
        }
      } catch (error) {
        console.log('Could not check camera availability:', error);
        setHasCameraDevice(true); // Assume camera is available if we can't check
      }
    };

    checkCameraAvailability();
  }, []);

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
      
      // For localhost, show deployment message
      if (currentUrl.includes('localhost')) {
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
    console.log('Starting camera with improved error handling...');
    
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('📷 Camera not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
      return;
    }
    
    // Check available devices first
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoDevices.length);
      
      if (videoDevices.length === 0) {
        setCameraError('📷 No camera found on this device. Please use the "Upload Image" option to identify flowers from your photo gallery.');
        return;
      }
    } catch (enumError) {
      console.log('Could not enumerate devices:', enumError);
      // Continue anyway, as some browsers don't support enumeration
    }
    
    // Try progressively simpler camera constraints
    const constraintOptions = [
      // Try rear camera first (mobile)
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      },
      // Try any camera with preferred resolution
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      // Try any camera with basic resolution
      {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      },
      // Try any available camera
      { video: true }
    ];
    
    for (let i = 0; i < constraintOptions.length; i++) {
      try {
        console.log(`Trying camera constraints option ${i + 1}:`, constraintOptions[i]);
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
        console.log('Camera access granted with constraints:', constraintOptions[i]);
        
        // Success! Set up the video stream
        setStream(mediaStream);
        setIsCameraMode(true);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Handle video loading with better error handling
          const handleVideoLoad = () => {
            videoRef.current.play().catch(playError => {
              console.error('Video play error:', playError);
              setCameraError('📷 Unable to display camera feed. Please refresh and try again.');
              stopCamera();
            });
          };
          
          const handleVideoError = (videoError) => {
            console.error('Video element error:', videoError);
            setCameraError('📷 Camera display error. Please refresh and try again.');
            stopCamera();
          };
          
          videoRef.current.onloadedmetadata = handleVideoLoad;
          videoRef.current.onerror = handleVideoError;
          
          // Timeout if video doesn't load within 10 seconds
          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState === 0) {
              setCameraError('📷 Camera loading timeout. Please try again or use "Upload Image" instead.');
              stopCamera();
            }
          }, 10000);
        }
        
        return; // Success, exit the function
        
      } catch (error) {
        console.log(`Camera constraints option ${i + 1} failed:`, error.name, error.message);
        
        // If this is the last option, handle the error
        if (i === constraintOptions.length - 1) {
          console.error('All camera constraints failed. Final error:', error);
          
          let errorMessage = '📷 Unable to access camera. ';
          
          switch (error.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
              errorMessage = '📷 Camera permission denied.\n\n' +
                '✅ To fix this:\n' +
                '1. Look for a camera icon in your browser address bar\n' +
                '2. Click it and select "Always allow camera access"\n' +
                '3. Refresh the page and try again\n\n' +
                '💡 Or use "Upload Image" to identify flowers from your gallery.';
              break;
              
            case 'NotFoundError':
            case 'DevicesNotFoundError':
              errorMessage = '📷 No camera detected on this device.\n\n' +
                '✅ What you can do:\n' +
                '• Use "Upload Image" to identify flowers from your photo gallery\n' +
                '• Try on a different device with a camera\n' +
                '• Check if your camera is being used by another app';
              break;
              
            case 'NotReadableError':
            case 'TrackStartError':
              errorMessage = '📷 Camera is currently in use.\n\n' +
                '✅ To fix this:\n' +
                '1. Close other apps that might be using the camera\n' +
                '2. Close other browser tabs with camera access\n' +
                '3. Try again\n\n' +
                '💡 Or use "Upload Image" as an alternative.';
              break;
              
            case 'OverconstrainedError':
            case 'ConstraintNotSatisfiedError':
              errorMessage = '📷 Camera configuration issue.\n\n' +
                '✅ This usually resolves by:\n' +
                '1. Refreshing the page\n' +
                '2. Trying again\n' +
                '3. Using "Upload Image" instead';
              break;
              
            case 'NotSupportedError':
              errorMessage = '📷 Camera not supported in this browser.\n\n' +
                '✅ Please try:\n' +
                '• Chrome, Firefox, Safari, or Edge browser\n' +
                '• Use "Upload Image" to identify flowers from your gallery';
              break;
              
            case 'SecurityError':
              errorMessage = '📷 Camera blocked by security settings.\n\n' +
                '✅ This might help:\n' +
                '1. Make sure you\'re using HTTPS (secure connection)\n' +
                '2. Check browser camera permissions\n' +
                '3. Use "Upload Image" as an alternative';
              break;
              
            default:
              errorMessage = `📷 Camera error: ${error.message || 'Unknown error'}\n\n` +
                '✅ Please:\n' +
                '1. Refresh the page and try again\n' +
                '2. Use "Upload Image" to identify flowers from your gallery\n' +
                '3. Try on a different device if the issue persists';
          }
          
          setCameraError(errorMessage);
        }
      }
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
                <div className="error-title">Camera Access Issue</div>
                <p>{cameraError}</p>
                <div className="alternative-action">
                  <Button 
                    onClick={() => {
                      stopCamera();
                      fileInputRef.current?.click();
                    }} 
                    className="camera-alternative-btn"
                  >
                    <Upload size={18} />
                    Try Upload Instead
                  </Button>
                  <Button 
                    onClick={stopCamera} 
                    variant="outline"
                    style={{ marginLeft: '1rem' }}
                  >
                    Back to Main
                  </Button>
                </div>
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
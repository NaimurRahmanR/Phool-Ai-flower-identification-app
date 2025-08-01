import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Camera, Upload, History, Flower, Loader2, ChevronLeft } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('splash');
  const [selectedImage, setSelectedImage] = useState(null);
  const [identificationResult, setIdentificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [identificationHistory, setIdentificationHistory] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [stream, setStream] = useState(null);

  // Load history from local storage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('phool-history');
    if (savedHistory) {
      setIdentificationHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('phool-history', JSON.stringify(identificationHistory));
  }, [identificationHistory]);

  // Splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentView('main');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraMode(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraMode(false);
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

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/identify-flower`, {
        method: 'POST',
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
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('history')}
            className="history-btn"
          >
            <History size={18} />
            History
          </Button>
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
              style={{ display: 'none' }}
            />
          </div>
        )}

        {isCameraMode && (
          <div className="camera-section">
            <div className="camera-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
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
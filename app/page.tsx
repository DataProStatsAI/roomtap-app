'use client';

import { supabase } from '../lib/supabaseClient';
import { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
}

interface Listing {
  id: number;
  title: string;
  price: number;
  location: string;
  description: string;
  images: string[];
  voiceNote?: string;
  voiceNoteDuration?: number;
  userId: string;
  userName: string;
  userEmail: string;
  isVisible: boolean;
  createdAt: string;
  views: number;
  latitude: number | null;
  longitude: number | null;
  category: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  distance?: string | null;
  averageRating?: number;
  reviewCount?: number;
}

interface Message {
  id: number;
  listingId: number;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  message: string;
  listingTitle: string;
  isRead: boolean;
  createdAt: string;
}

interface Review {
  id: number;
  listingId: number;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function Home() {
  const [currentUser] = useState<User>({
    id: 'guest_' + Date.now(),
    name: 'Guest User',
    email: 'guest@roomtap.com',
    isLoggedIn: true
  });
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [activeTab, setActiveTab] = useState('explore');
  const [newMessage, setNewMessage] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [locationError, setLocationError] = useState('');
  const [useGPS, setUseGPS] = useState(false);
  const [hoveredListingId, setHoveredListingId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [newListing, setNewListing] = useState({
    title: '',
    price: '',
    location: '',
    description: '',
    images: [] as string[],
    category: 'room',
    bedrooms: 1,
    bathrooms: 1,
    amenities: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null
  });

  const categories = [
    { id: 'all', name: 'All', icon: '🏠' },
    { id: 'room', name: 'Room', icon: '🛏️' },
    { id: 'apartment', name: 'Apartment', icon: '🏢' },
    { id: 'house', name: 'House', icon: '🏡' },
    { id: 'studio', name: 'Studio', icon: '🎨' },
    { id: 'shared', name: 'Shared Space', icon: '👥' }
  ];

  const amenitiesList = [
    'WiFi', 'Parking', 'Air Conditioning', 'Heating', 'Washer/Dryer', 
    'Dishwasher', 'Pool', 'Gym', 'Pet Friendly', 'Furnished', 
    'Utilities Included', 'Security', 'Balcony', 'Elevator'
  ];

  const loadListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        const mappedListings = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          location: item.location,
          description: item.description || '',
          images: item.images || [],
          voiceNote: item.voice_note_url,
          voiceNoteDuration: item.voice_note_duration,
          userId: item.user_id,
          userName: item.user_name,
          userEmail: item.user_email,
          isVisible: item.is_visible,
          createdAt: item.created_at,
          views: item.views || 0,
          latitude: item.latitude,
          longitude: item.longitude,
          category: item.category || 'room',
          bedrooms: item.bedrooms || 1,
          bathrooms: item.bathrooms || 1,
          amenities: item.amenities || []
        }));
        setListings(mappedListings);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        const mappedReviews = data.map((item: any) => ({
          id: item.id,
          listingId: item.listing_id,
          userId: item.user_id,
          userName: item.user_name,
          rating: item.rating,
          comment: item.comment,
          createdAt: item.created_at
        }));
        setReviews(mappedReviews);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('roomtap_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadListings();
      await loadReviews();
      loadFavorites();
      
      setTimeout(() => {
        setShowSplash(false);
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }, 2500);
    };
    
    init();
    
    const interval = setInterval(() => {
      if (!isLoading) {
        loadListings();
        loadReviews();
      }
    }, 10000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(interval);
    };
  }, []);

  const getUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError('');
          setUseGPS(true);
          addNotification('Location detected! Showing nearby listings.', 'success');
        },
        (error) => {
          let errorMessage = 'Unable to get your location. ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please allow location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
          }
          setLocationError(errorMessage);
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getCoordinatesFromAddress = (address: string) => {
    const areaCoordinates: {[key: string]: {lat: number, lng: number}} = {
      'avondale': {lat: -17.7989, lng: 31.0335},
      'belvedere': {lat: -17.8150, lng: 31.0230},
      'cbd': {lat: -17.8292, lng: 31.0522},
      'borrowdale': {lat: -17.7560, lng: 31.0900},
      'harare': {lat: -17.8252, lng: 31.0335}
    };
    const lowerAddress = address.toLowerCase();
    for (const [area, coords] of Object.entries(areaCoordinates)) {
      if (lowerAddress.includes(area)) return coords;
    }
    return {lat: -17.8252, lng: 31.0335};
  };

  const addNotification = (message: string, type: string) => {
    const newNotif = {
      id: Date.now(),
      message,
      type,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  };

  const toggleFavorite = (listingId: number) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(listingId) 
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];
      localStorage.setItem('roomtap_favorites', JSON.stringify(newFavorites));
      addNotification(
        prev.includes(listingId) ? 'Removed from favorites' : 'Added to favorites',
        'success'
      );
      return newFavorites;
    });
  };

  const addReview = async (listingId: number) => {
    if (!newReview.comment.trim()) {
      alert('Please write a review');
      return;
    }
    
    const reviewData = {
      listing_id: listingId,
      user_id: currentUser.id,
      user_name: currentUser.name,
      rating: newReview.rating,
      comment: newReview.comment
    };
    
    try {
      const { error } = await supabase.from('reviews').insert([reviewData]);
      if (error) throw error;
      
      const newReviewObj = {
        id: Date.now(),
        listingId,
        userId: currentUser.id,
        userName: currentUser.name,
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: new Date().toISOString()
      };
      setReviews(prev => [newReviewObj, ...prev]);
      setNewReview({ rating: 5, comment: '' });
      addNotification('Review posted successfully!', 'success');
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Failed to post review. Please try again.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewListing(prev => ({ 
          ...prev, 
          images: [...prev.images, reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setNewListing(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setNewListing(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceNoteUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      let duration = 0;
      timerRef.current = setInterval(() => {
        duration++;
        setRecordingDuration(duration);
        if (duration >= 30) stopRecording();
      }, 1000);
    } catch (err) {
      alert("Please allow microphone access");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };
  
  const deleteVoiceNote = () => {
    setVoiceNoteUrl('');
    setRecordingDuration(0);
  };

  const addListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newListing.images.length === 0) {
      alert('Please add at least one image');
      return;
    }
    
    const coords = getCoordinatesFromAddress(newListing.location);
    
    const listingData = {
      title: newListing.title,
      price: Number(newListing.price),
      location: newListing.location,
      description: newListing.description || "No description provided",
      images: newListing.images,
      voice_note_url: voiceNoteUrl,
      voice_note_duration: recordingDuration,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_email: currentUser.email,
      is_visible: true,
      latitude: coords.lat,
      longitude: coords.lng,
      category: newListing.category,
      bedrooms: newListing.bedrooms,
      bathrooms: newListing.bathrooms,
      amenities: newListing.amenities
    };
    
    try {
      const { error } = await supabase.from('listings').insert([listingData]);
      if (error) throw error;
      
      addNotification('Listing published successfully!', 'success');
      await loadListings();
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      alert('Failed to save listing. Please try again.');
    }
    
    setNewListing({ 
      title: '', price: '', location: '', description: '', images: [], 
      category: 'room', bedrooms: 1, bathrooms: 1, amenities: [],
      latitude: null, longitude: null 
    });
    setVoiceNoteUrl('');
    setRecordingDuration(0);
    setShowForm(false);
  };

  const deleteListing = async (id: number, userId: string) => {
    if (currentUser.id !== userId) {
      alert('You can only delete your own listings!');
      return;
    }
    if (confirm('Delete this listing?')) {
      try {
        const { error } = await supabase.from('listings').delete().eq('id', id);
        if (error) throw error;
        
        await loadListings();
        addNotification('Listing deleted', 'info');
      } catch (error) {
        console.error('Error deleting listing:', error);
        alert('Failed to delete listing');
      }
    }
  };

  const toggleVisibility = async (id: number, userId: string) => {
    if (currentUser.id !== userId) {
      alert('You can only manage your own listings!');
      return;
    }
    
    const listing = listings.find(l => l.id === id);
    if (!listing) return;
    
    const newVisibility = !listing.isVisible;
    
    try {
      const { error } = await supabase
        .from('listings')
        .update({ is_visible: newVisibility })
        .eq('id', id);
      
      if (error) throw error;
      
      await loadListings();
      addNotification(`Listing ${newVisibility ? 'visible' : 'hidden'}`, 'info');
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Failed to update listing');
    }
  };

  const incrementViews = async (id: number) => {
    const listing = listings.find(l => l.id === id);
    if (listing) {
      const newViews = listing.views + 1;
      await supabase.from('listings').update({ views: newViews }).eq('id', id);
      await loadListings();
    }
  };

  const sendMessage = async (e: React.FormEvent, listing: Listing) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const messageData = {
      listing_id: listing.id,
      from_user_id: currentUser.id,
      from_user_name: currentUser.name,
      to_user_id: listing.userId,
      to_user_name: listing.userName,
      message: newMessage,
      listing_title: listing.title,
      is_read: false
    };
    
    try {
      const { error } = await supabase.from('messages').insert([messageData]);
      if (error) throw error;
      
      setNewMessage('');
      setSelectedListing(null);
      addNotification(`Message sent to ${listing.userName}!`, 'success');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const filteredListings = listings.filter(l => {
    if (!l.isVisible) return false;
    
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) || 
                         l.location.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    const matchesPrice = l.price >= priceRange.min && l.price <= priceRange.max;
    if (!matchesPrice) return false;
    
    if (selectedCategory !== 'all' && l.category !== selectedCategory) return false;
    
    if (useGPS && userLocation && l.latitude !== null && l.longitude !== null) {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, l.latitude, l.longitude);
      if (distance > searchRadius) return false;
    }
    
    return true;
  }).map(listing => ({
    ...listing,
    distance: userLocation && listing.latitude !== null && listing.longitude !== null ? 
      calculateDistance(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude).toFixed(1) : null,
    averageRating: reviews.filter(r => r.listingId === listing.id).reduce((sum, r) => sum + r.rating, 0) / 
                   (reviews.filter(r => r.listingId === listing.id).length || 1),
    reviewCount: reviews.filter(r => r.listingId === listing.id).length
  }));

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch(sortBy) {
      case 'price_low': return a.price - b.price;
      case 'price_high': return b.price - a.price;
      case 'views': return b.views - a.views;
      case 'distance': 
        if (a.distance && b.distance) return parseFloat(a.distance) - parseFloat(b.distance);
        return 0;
      case 'rating': return (b.averageRating || 0) - (a.averageRating || 0);
      case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default: return 0;
    }
  });

  const myListings = listings.filter(l => l.userId === currentUser.id);
  const userMessages = messages.filter(m => m.toUserId === currentUser.id && !m.isRead);
  const totalViews = myListings.reduce((sum, l) => sum + l.views, 0);
  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  const placeholderImg = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80";

  // SPLASH SCREEN
  if (showSplash) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'bounce 1s ease-in-out infinite' }}>🏠</div>
          <h1 style={{
            color: 'white',
            fontSize: '48px',
            margin: '0',
            fontWeight: 'bold',
            letterSpacing: '2px'
          }}>
            RoomTap
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '16px',
            marginTop: '10px'
          }}>
            Find Your Perfect Space
          </p>
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // LOADING SCREEN
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>🏠</div>
          <div style={{ width: '40px', height: '40px', border: '4px solid white', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '20px', color: 'white' }}>Loading accommodations...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // MAIN APP - CLEAN WHITE BACKGROUND
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* CLEAN HEADER - NOT TOO LONG */}
      <header style={{ 
        background: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 20px', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ 
            cursor: 'pointer', 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }} onClick={() => setActiveTab('explore')}>
            🏠 RoomTap
          </h2>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <button onClick={() => setActiveTab('explore')} style={{ 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'explore' ? '#667eea' : '#6b7280', 
              cursor: 'pointer', 
              fontWeight: activeTab === 'explore' ? '600' : '400', 
              fontSize: '14px',
              padding: '6px 0'
            }}>Explore</button>
            <button onClick={() => setActiveTab('favorites')} style={{ 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'favorites' ? '#667eea' : '#6b7280', 
              cursor: 'pointer', 
              fontWeight: activeTab === 'favorites' ? '600' : '400', 
              fontSize: '14px',
              padding: '6px 0'
            }}>Favorites ({favorites.length})</button>
            <button onClick={() => setActiveTab('dashboard')} style={{ 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'dashboard' ? '#667eea' : '#6b7280', 
              cursor: 'pointer', 
              fontWeight: activeTab === 'dashboard' ? '600' : '400', 
              fontSize: '14px',
              padding: '6px 0'
            }}>Dashboard</button>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: '#6b7280',
              fontSize: '16px',
              position: 'relative'
            }}>
              🔔 {notifications.filter(n => !n.read).length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ef4444', borderRadius: '50%', padding: '2px 5px', fontSize: '10px', color: 'white' }}>{notifications.filter(n => !n.read).length}</span>}
            </button>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#f3f4f6', 
              padding: '6px 12px', 
              borderRadius: '20px' 
            }}>
              <span style={{ fontSize: '14px', color: '#374151' }}>👋 {currentUser.name.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Panel */}
      {showNotifications && (
        <div style={{ position: 'fixed', right: '20px', top: '70px', width: '320px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 200, maxHeight: '400px', overflow: 'auto', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>Notifications</h3>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>No notifications</p>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} style={{ padding: '12px', borderBottom: '1px solid #eee', background: notif.read ? 'white' : '#f0f0ff' }}>
                <p style={{ margin: 0, fontSize: '13px' }}>{notif.message}</p>
                <small style={{ color: '#999', fontSize: '10px' }}>{new Date(notif.timestamp).toLocaleTimeString()}</small>
              </div>
            ))
          )}
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
        {activeTab === 'explore' ? (
          <>
            {/* Add Listing Button */}
            <button onClick={() => setShowForm(!showForm)} style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              marginBottom: '24px', 
              cursor: 'pointer', 
              fontWeight: '500', 
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              + Add New Listing
            </button>
            
            {/* Add Listing Form */}
            {showForm && (
              <div style={{ 
                background: '#f9fafb', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb',
                marginBottom: '24px'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#1f2937' }}>List Your Space</h3>
                <form onSubmit={addListing}>
                  <input placeholder="Title *" value={newListing.title} onChange={e => setNewListing({...newListing, title: e.target.value})} required style={{ width: '100%', padding: '10px 12px', marginBottom: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <input placeholder="Price *" type="number" value={newListing.price} onChange={e => setNewListing({...newListing, price: e.target.value})} required style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                    <select value={newListing.category} onChange={e => setNewListing({...newListing, category: e.target.value})} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                      {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  
                  <input placeholder="Location *" value={newListing.location} onChange={e => setNewListing({...newListing, location: e.target.value})} required style={{ width: '100%', padding: '10px 12px', marginBottom: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <input type="number" placeholder="Bedrooms" value={newListing.bedrooms} onChange={e => setNewListing({...newListing, bedrooms: parseInt(e.target.value)})} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                    <input type="number" placeholder="Bathrooms" value={newListing.bathrooms} onChange={e => setNewListing({...newListing, bathrooms: parseInt(e.target.value)})} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  
                  <textarea placeholder="Description" value={newListing.description} onChange={e => setNewListing({...newListing, description: e.target.value})} style={{ width: '100%', padding: '10px 12px', marginBottom: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} rows={3} />
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontWeight: '500', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Amenities</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {amenitiesList.slice(0, 8).map(amenity => (
                        <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                          <input type="checkbox" checked={newListing.amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
                          {amenity}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>📸 Upload Photos</label>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {newListing.images.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                          <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>🎙️ Voice Note (30 sec max)</label>
                    {!voiceNoteUrl ? (
                      !isRecording ? (
                        <button type="button" onClick={startRecording} style={{ background: '#f97316', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>🎤 Start Recording</button>
                      ) : (
                        <button type="button" onClick={stopRecording} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>⏹️ Stop ({recordingDuration}s)</button>
                      )
                    ) : (
                      <div>
                        <audio controls src={voiceNoteUrl} style={{ width: '100%', marginBottom: '5px' }} />
                        <button type="button" onClick={deleteVoiceNote} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
                      </div>
                    )}
                  </div>
                  
                  <button type="submit" style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}>Publish Listing</button>
                </form>
              </div>
            )}

            {/* Search Bar */}
            <input 
              placeholder="🔍 Search by title or location..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb',
                background: 'white',
                fontSize: '14px', 
                marginBottom: '20px', 
                outline: 'none'
              }}
            />
            
            {/* GPS Section */}
            <div style={{ 
              background: '#f9fafb', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={getUserLocation} style={{ 
                  background: useGPS && userLocation ? '#10b981' : '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: '500',
                  fontSize: '13px'
                }}>📍 {useGPS && userLocation ? 'GPS Active' : 'Use My Location'}</button>
                {useGPS && userLocation && (
                  <>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>Radius: {searchRadius} km</label>
                      <input type="range" min="1" max="50" value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <button onClick={() => { setUseGPS(false); setUserLocation(null); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
                  </>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ 
                background: '#f9fafb', 
                padding: '12px', 
                borderRadius: '8px', 
                flex: 1, 
                minWidth: '180px',
                border: '1px solid #e5e7eb'
              }}>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Price: ${priceRange.min} - ${priceRange.max}</label>
                <input type="range" min="0" max="1000" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: parseInt(e.target.value)})} style={{ width: '100%' }} />
                <input type="range" min="0" max="1000" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
              
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                fontSize: '13px',
                cursor: 'pointer'
              }}>
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="views">Most Viewed</option>
                <option value="rating">Top Rated</option>
                {useGPS && <option value="distance">Nearest First</option>}
              </select>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.id)} 
                  style={{ 
                    padding: '6px 14px', 
                    borderRadius: '20px', 
                    border: '1px solid #e5e7eb', 
                    background: selectedCategory === cat.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                    color: selectedCategory === cat.id ? 'white' : '#374151',
                    cursor: 'pointer', 
                    fontWeight: '500',
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <h2 style={{ color: '#1f2937', marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>✨ Available Spaces ({sortedListings.length})</h2>
            
            {sortedListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No listings yet. Be the first to add one!</p>
                <button onClick={() => setShowForm(true)} style={{ marginTop: '16px', padding: '8px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>+ Add Your First Listing</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {sortedListings.map(l => (
                  <div 
                    key={l.id} 
                    style={{ 
                      background: 'white', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      boxShadow: hoveredListingId === l.id ? '0 10px 25px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: hoveredListingId === l.id ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                    onMouseEnter={() => setHoveredListingId(l.id)}
                    onMouseLeave={() => setHoveredListingId(null)}
                  >
                    <div style={{ position: 'relative' }}>
                      <img src={l.images?.[0] ?? placeholderImg} alt={l.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                      
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(l.id); }} style={{ background: favorites.includes(l.id) ? '#ef4444' : 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>
                          {favorites.includes(l.id) ? '❤️' : '🤍'}
                        </button>
                        <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '11px' }}>
                          ⭐ {l.averageRating?.toFixed(1) || 'New'} ({l.reviewCount})
                        </div>
                      </div>
                      
                      <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '11px' }}>
                        {categories.find(c => c.id === l.category)?.icon} {l.category}
                      </div>
                      
                      {useGPS && l.distance && (
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '11px' }}>
                          📍 {l.distance} km
                        </div>
                      )}
                    </div>
                    
                    <div style={{ padding: '16px' }} onClick={() => { incrementViews(l.id); setSelectedListing(l); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{l.title}</h3>
                        <p style={{ fontSize: '18px', color: '#667eea', fontWeight: 'bold', margin: 0 }}>${l.price}<span style={{ fontSize: '11px' }}>/mo</span></p>
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 8px 0' }}>📍 {l.location}</p>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '11px', color: '#9ca3af' }}>
                        <span>🛏️ {l.bedrooms} bed</span>
                        <span>🚽 {l.bathrooms} bath</span>
                        <span>👁️ {l.views} views</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {l.amenities?.slice(0, 3).map((a: string) => (
                          <span key={a} style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', color: '#4b5563' }}>{a}</span>
                        ))}
                        {l.amenities?.length > 3 && <span style={{ fontSize: '10px', color: '#9ca3af' }}>+{l.amenities.length - 3}</span>}
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>👤 {l.userName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'favorites' ? (
          <div>
            <h2 style={{ color: '#1f2937', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>❤️ Your Favorite Listings ({favoriteListings.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {favoriteListings.map(l => (
                <div key={l.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => { incrementViews(l.id); setSelectedListing(l); }}>
                  <img src={l.images?.[0] ?? placeholderImg} alt={l.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>{l.title}</h3>
                    <p style={{ color: '#667eea', fontWeight: 'bold', margin: '0 0 4px 0' }}>${l.price}/month</p>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 12px 0' }}>📍 {l.location}</p>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(l.id); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Remove from Favorites</button>
                  </div>
                </div>
              ))}
            </div>
            {favoriteListings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No favorites yet. Click the ❤️ on listings to save them!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 style={{ color: '#1f2937', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>📊 Your Dashboard</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '32px' }}>🏠</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{myListings.length}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Active Listings</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '32px' }}>👁️</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{totalViews}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total Views</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '32px' }}>⭐</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{reviews.filter(r => myListings.some(l => l.id === r.listingId)).length}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total Reviews</div>
              </div>
            </div>
            
            <h3 style={{ color: '#1f2937', marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>My Listings</h3>
            {myListings.map(l => (
              <div key={l.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #e5e7eb', borderLeft: `4px solid ${l.isVisible ? '#10b981' : '#ef4444'}` }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <img src={l.images?.[0] ?? placeholderImg} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{l.title}</h4>
                    <p style={{ color: '#667eea', fontWeight: 'bold', margin: '4px 0' }}>${l.price}/month</p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>📍 {l.location}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>👁️ {l.views} views • ⭐ {reviews.filter(r => r.listingId === l.id).length} reviews</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleVisibility(l.id, l.userId)} style={{ padding: '6px 12px', background: l.isVisible ? '#f97316' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>{l.isVisible ? 'Hide' : 'Show'}</button>
                    <button onClick={() => deleteListing(l.id, l.userId)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedListing && (
        <div onClick={() => setSelectedListing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', maxWidth: '500px', width: '100%', borderRadius: '16px', overflow: 'hidden', maxHeight: '85vh', overflowY: 'auto' }}>
            <img src={selectedListing.images?.[0] ?? placeholderImg} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '20px', margin: 0 }}>{selectedListing.title}</h2>
                <p style={{ fontSize: '22px', color: '#667eea', fontWeight: 'bold', margin: 0 }}>${selectedListing.price}<span style={{ fontSize: '12px' }}>/mo</span></p>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: '15px', fontSize: '12px' }}>📍 {selectedListing.location}</span>
                <span style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: '15px', fontSize: '12px' }}>🛏️ {selectedListing.bedrooms} beds</span>
                <span style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: '15px', fontSize: '12px' }}>🚽 {selectedListing.bathrooms} baths</span>
              </div>
              
              <p style={{ lineHeight: '1.5', marginBottom: '16px', fontSize: '14px', color: '#4b5563' }}>{selectedListing.description}</p>
              
              {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Amenities</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedListing.amenities.slice(0, 6).map((a: string) => (
                      <span key={a} style={{ background: '#e0e7ff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>✅ {a}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Reviews</h4>
                {reviews.filter(r => r.listingId === selectedListing.id).slice(0, 2).map(review => (
                  <div key={review.id} style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '12px' }}>{review.userName}</strong>
                      <span style={{ fontSize: '12px' }}>⭐ {review.rating}/5</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{review.comment}</p>
                  </div>
                ))}
                
                {currentUser.id !== selectedListing.userId && (
                  <div style={{ marginTop: '12px' }}>
                    <h5 style={{ fontSize: '13px', marginBottom: '8px' }}>Write a Review</h5>
                    <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})} style={{ padding: '8px', marginBottom: '8px', borderRadius: '8px', width: '100%', fontSize: '13px', border: '1px solid #e5e7eb' }}>
                      <option value={5}>⭐⭐⭐⭐⭐ - Excellent</option>
                      <option value={4}>⭐⭐⭐⭐ - Good</option>
                      <option value={3}>⭐⭐⭐ - Average</option>
                      <option value={2}>⭐⭐ - Poor</option>
                      <option value={1}>⭐ - Terrible</option>
                    </select>
                    <textarea placeholder="Write your review..." value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '8px', fontSize: '13px' }} rows={2} />
                    <button onClick={() => addReview(selectedListing.id)} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: '500', fontSize: '13px' }}>Submit Review</button>
                  </div>
                )}
              </div>
              
              <form onSubmit={(e) => sendMessage(e, selectedListing)}>
                <textarea placeholder={`Message ${selectedListing.userName}...`} value={newMessage} onChange={e => setNewMessage(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }} rows={2} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '13px' }}>Send Message</button>
                  <button type="button" onClick={() => setSelectedListing(null)} style={{ flex: 1, padding: '10px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Close</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
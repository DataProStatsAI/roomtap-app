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

  // MAIN APP - GRADIENT DESIGN
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Glassmorphism Header */}
      <header style={{ 
        background: 'rgba(255,255,255,0.1)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        color: 'white', 
        padding: '15px 20px', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ cursor: 'pointer', margin: 0, fontSize: '28px', fontWeight: 'bold' }} onClick={() => setActiveTab('explore')}>
            🏠 RoomTap
          </h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('explore')} style={{ 
              background: activeTab === 'explore' ? 'rgba(255,255,255,0.2)' : 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer', 
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: activeTab === 'explore' ? 'bold' : 'normal', 
              fontSize: '14px',
              transition: 'all 0.3s'
            }}>🔍 Explore</button>
            <button onClick={() => setActiveTab('favorites')} style={{ 
              background: activeTab === 'favorites' ? 'rgba(255,255,255,0.2)' : 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '20px', 
              fontWeight: activeTab === 'favorites' ? 'bold' : 'normal', 
              fontSize: '14px',
              transition: 'all 0.3s'
            }}>❤️ Favorites ({favorites.length})</button>
            <button onClick={() => setActiveTab('dashboard')} style={{ 
              background: activeTab === 'dashboard' ? 'rgba(255,255,255,0.2)' : 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '20px', 
              fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal', 
              fontSize: '14px',
              transition: 'all 0.3s'
            }}>📊 Dashboard</button>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: 'none', 
              padding: '8px 12px', 
              borderRadius: '20px', 
              cursor: 'pointer', 
              color: 'white', 
              fontSize: '14px', 
              position: 'relative' 
            }}>
              🔔 {notifications.filter(n => !n.read).length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{notifications.filter(n => !n.read).length}</span>}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.15)', padding: '5px 15px', borderRadius: '25px' }}>
              <span>👋 {currentUser.name.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Panel */}
      {showNotifications && (
        <div style={{ position: 'fixed', right: '20px', top: '80px', width: '350px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 200, maxHeight: '400px', overflow: 'auto' }}>
          <div style={{ padding: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Notifications</h3>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No notifications</p>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} style={{ padding: '12px', borderBottom: '1px solid #eee', background: notif.read ? 'white' : '#f0f0ff' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>{notif.message}</p>
                <small style={{ color: '#999', fontSize: '10px' }}>{new Date(notif.timestamp).toLocaleTimeString()}</small>
              </div>
            ))
          )}
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '20px auto', padding: '0 20px' }}>
        {activeTab === 'explore' ? (
          <>
            {/* Add Listing Button - Glass Effect */}
            <button onClick={() => setShowForm(!showForm)} style={{ 
              background: 'rgba(255,255,255,0.2)', 
              backdropFilter: 'blur(10px)',
              color: 'white', 
              border: '1px solid rgba(255,255,255,0.3)', 
              padding: '14px 28px', 
              borderRadius: '40px', 
              marginBottom: '20px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '16px',
              transition: 'all 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '20px' }}>+</span> Add New Listing
            </button>
            
            {/* Add Listing Form - Glass Card */}
            {showForm && (
              <div style={{ 
                background: 'rgba(255,255,255,0.95)', 
                padding: '24px', 
                borderRadius: '24px', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)', 
                marginBottom: '30px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ marginTop: 0, color: '#667eea' }}>List Your Space</h3>
                <form onSubmit={addListing}>
                  <input placeholder="Title *" value={newListing.title} onChange={e => setNewListing({...newListing, title: e.target.value})} required style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '12px' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input placeholder="Price *" type="number" value={newListing.price} onChange={e => setNewListing({...newListing, price: e.target.value})} required style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '12px' }} />
                    <select value={newListing.category} onChange={e => setNewListing({...newListing, category: e.target.value})} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '12px' }}>
                      {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  
                  <input placeholder="Location *" value={newListing.location} onChange={e => setNewListing({...newListing, location: e.target.value})} required style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '12px' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="number" placeholder="Bedrooms" value={newListing.bedrooms} onChange={e => setNewListing({...newListing, bedrooms: parseInt(e.target.value)})} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '12px' }} />
                    <input type="number" placeholder="Bathrooms" value={newListing.bathrooms} onChange={e => setNewListing({...newListing, bathrooms: parseInt(e.target.value)})} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '12px' }} />
                  </div>
                  
                  <textarea placeholder="Description" value={newListing.description} onChange={e => setNewListing({...newListing, description: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '12px' }} rows={3} />
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Amenities</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {amenitiesList.slice(0, 8).map(amenity => (
                        <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                          <input type="checkbox" checked={newListing.amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
                          {amenity}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📸 Upload Photos</label>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ marginBottom: '10px' }} />
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {newListing.images.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                          <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                          <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>🎙️ Voice Note (30 sec max)</label>
                    {!voiceNoteUrl ? (
                      !isRecording ? (
                        <button type="button" onClick={startRecording} style={{ background: '#f97316', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer' }}>🎤 Start Recording</button>
                      ) : (
                        <button type="button" onClick={stopRecording} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer' }}>⏹️ Stop ({recordingDuration}s)</button>
                      )
                    ) : (
                      <div>
                        <audio controls src={voiceNoteUrl} style={{ width: '100%', marginBottom: '5px' }} />
                        <button type="button" onClick={deleteVoiceNote} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                      </div>
                    )}
                  </div>
                  
                  <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Publish Listing</button>
                </form>
              </div>
            )}

            {/* Search Bar - Glass Effect */}
            <input 
              placeholder="🔍 Search by title or location..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '16px 24px', 
                borderRadius: '50px', 
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                fontSize: '16px', 
                marginBottom: '20px', 
                outline: 'none'
              }}
            />
            
            {/* GPS Section - Glass Card */}
            <div style={{ 
              background: 'rgba(255,255,255,0.15)', 
              backdropFilter: 'blur(10px)',
              padding: '20px', 
              borderRadius: '20px', 
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={getUserLocation} style={{ 
                  background: useGPS && userLocation ? '#10b981' : 'rgba(255,255,255,0.3)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px 24px', 
                  borderRadius: '30px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold' 
                }}>📍 {useGPS && userLocation ? 'GPS Active' : 'Use My Location'}</button>
                {useGPS && userLocation && (
                  <>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Radius: {searchRadius} km</label>
                      <input type="range" min="1" max="50" value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <button onClick={() => { setUseGPS(false); setUserLocation(null); }} style={{ background: 'rgba(239,68,68,0.8)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer' }}>Clear</button>
                  </>
                )}
              </div>
            </div>

            {/* Filters Row - Glass Effect */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.15)', 
                backdropFilter: 'blur(10px)',
                padding: '12px 18px', 
                borderRadius: '15px', 
                flex: 1, 
                minWidth: '200px' 
              }}>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Price: ${priceRange.min} - ${priceRange.max}</label>
                <input type="range" min="0" max="1000" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: parseInt(e.target.value)})} style={{ width: '100%' }} />
                <input type="range" min="0" max="1000" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
              
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ 
                padding: '12px 18px', 
                borderRadius: '15px', 
                border: 'none',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                cursor: 'pointer'
              }}>
                <option value="newest" style={{ color: '#333' }}>Newest First</option>
                <option value="price_low" style={{ color: '#333' }}>Price: Low to High</option>
                <option value="price_high" style={{ color: '#333' }}>Price: High to Low</option>
                <option value="views" style={{ color: '#333' }}>Most Viewed</option>
                <option value="rating" style={{ color: '#333' }}>Top Rated</option>
                {useGPS && <option value="distance" style={{ color: '#333' }}>Nearest First</option>}
              </select>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px', overflowX: 'auto' }}>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.id)} 
                  style={{ 
                    padding: '10px 20px', 
                    borderRadius: '30px', 
                    border: 'none', 
                    background: selectedCategory === cat.id ? 'white' : 'rgba(255,255,255,0.2)',
                    color: selectedCategory === cat.id ? '#667eea' : 'white',
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s'
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '28px', fontWeight: 'bold' }}>✨ Available Spaces ({sortedListings.length})</h2>
            
            {sortedListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '24px' }}>
                <p style={{ color: 'white', fontSize: '18px' }}>No listings yet. Be the first to add one!</p>
                <button onClick={() => setShowForm(true)} style={{ marginTop: '20px', padding: '12px 24px', background: 'white', color: '#667eea', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Your First Listing</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {sortedListings.map(l => (
                  <div 
                    key={l.id} 
                    style={{ 
                      background: 'rgba(255,255,255,0.95)', 
                      borderRadius: '20px', 
                      overflow: 'hidden', 
                      boxShadow: hoveredListingId === l.id ? '0 20px 40px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: hoveredListingId === l.id ? 'translateY(-8px)' : 'translateY(0)'
                    }}
                    onMouseEnter={() => setHoveredListingId(l.id)}
                    onMouseLeave={() => setHoveredListingId(null)}
                  >
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                      <img src={l.images?.[0] ?? placeholderImg} alt={l.title} style={{ width: '100%', height: '240px', objectFit: 'cover', transition: 'transform 0.5s ease', transform: hoveredListingId === l.id ? 'scale(1.05)' : 'scale(1)' }} />
                      
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(l.id); }} style={{ background: favorites.includes(l.id) ? '#ef4444' : 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px' }}>
                          {favorites.includes(l.id) ? '❤️' : '🤍'}
                        </button>
                        <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '20px', fontSize: '12px' }}>
                          ⭐ {l.averageRating?.toFixed(1) || 'New'} ({l.reviewCount})
                        </div>
                      </div>
                      
                      <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                        {categories.find(c => c.id === l.category)?.icon} {l.category}
                      </div>
                      
                      {useGPS && l.distance && (
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                          📍 {l.distance} km
                        </div>
                      )}
                    </div>
                    
                    <div style={{ padding: '20px' }} onClick={() => { incrementViews(l.id); setSelectedListing(l); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: hoveredListingId === l.id ? '#667eea' : '#333' }}>{l.title}</h3>
                        <p style={{ fontSize: '22px', color: '#667eea', fontWeight: 'bold', margin: 0 }}>${l.price}<span style={{ fontSize: '12px' }}>/mo</span></p>
                      </div>
                      <p style={{ color: '#666', fontSize: '14px', margin: '0 0 8px 0' }}>📍 {l.location}</p>
                      <div style={{ display: 'flex', gap: '15px', marginBottom: '8px', fontSize: '12px', color: '#999' }}>
                        <span>🛏️ {l.bedrooms} bed</span>
                        <span>🚽 {l.bathrooms} bath</span>
                        <span>👁️ {l.views} views</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                        {l.amenities?.slice(0, 3).map((a: string) => (
                          <span key={a} style={{ background: '#f0f0f0', padding: '4px 12px', borderRadius: '15px', fontSize: '11px' }}>{a}</span>
                        ))}
                        {l.amenities?.length > 3 && <span style={{ fontSize: '11px', color: '#999' }}>+{l.amenities.length - 3}</span>}
                      </div>
                      <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>👤 {l.userName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'favorites' ? (
          <div>
            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '28px', fontWeight: 'bold' }}>❤️ Your Favorite Listings ({favoriteListings.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
              {favoriteListings.map(l => (
                <div key={l.id} style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => { incrementViews(l.id); setSelectedListing(l); }}>
                  <img src={l.images?.[0] ?? placeholderImg} alt={l.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  <div style={{ padding: '20px' }}>
                    <h3>{l.title}</h3>
                    <p style={{ color: '#667eea', fontWeight: 'bold' }}>${l.price}/month</p>
                    <p>📍 {l.location}</p>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(l.id); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', marginTop: '10px' }}>Remove from Favorites</button>
                  </div>
                </div>
              ))}
            </div>
            {favoriteListings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '24px' }}>
                <p style={{ color: 'white', fontSize: '18px' }}>No favorites yet. Click the ❤️ on listings to save them!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '28px', fontWeight: 'bold' }}>📊 Your Dashboard</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '40px' }}>🏠</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{myListings.length}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)' }}>Active Listings</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '40px' }}>👁️</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{totalViews}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)' }}>Total Views</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '40px' }}>⭐</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{reviews.filter(r => myListings.some(l => l.id === r.listingId)).length}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)' }}>Total Reviews</div>
              </div>
            </div>
            
            <h3 style={{ color: 'white', marginBottom: '15px' }}>My Listings</h3>
            {myListings.map(l => (
              <div key={l.id} style={{ background: 'rgba(255,255,255,0.95)', padding: '20px', borderRadius: '16px', marginBottom: '15px', borderLeft: `5px solid ${l.isVisible ? '#10b981' : '#ef4444'}` }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <img src={l.images?.[0] ?? placeholderImg} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>{l.title}</h4>
                    <p style={{ color: '#667eea', fontWeight: 'bold' }}>${l.price}/month</p>
                    <p>📍 {l.location}</p>
                    <p style={{ fontSize: '12px', color: '#999' }}>👁️ {l.views} views • ⭐ {reviews.filter(r => r.listingId === l.id).length} reviews</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleVisibility(l.id, l.userId)} style={{ padding: '8px 16px', background: l.isVisible ? '#f97316' : '#10b981', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer' }}>{l.isVisible ? 'Hide' : 'Show'}</button>
                    <button onClick={() => deleteListing(l.id, l.userId)} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal - Glass Design */}
      {selectedListing && (
        <div onClick={() => setSelectedListing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(255,255,255,0.95)', maxWidth: '600px', width: '100%', borderRadius: '24px', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
            <img src={selectedListing.images?.[0] ?? placeholderImg} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <h2>{selectedListing.title}</h2>
                <p style={{ fontSize: '28px', color: '#667eea', fontWeight: 'bold' }}>${selectedListing.price}<span style={{ fontSize: '14px' }}>/mo</span></p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>📍 {selectedListing.location}</span>
                <span style={{ background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>🛏️ {selectedListing.bedrooms} beds</span>
                <span style={{ background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>🚽 {selectedListing.bathrooms} baths</span>
              </div>
              
              <p style={{ lineHeight: '1.6', marginBottom: '20px' }}>{selectedListing.description}</p>
              
              {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4>Amenities</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedListing.amenities.slice(0, 8).map((a: string) => (
                      <span key={a} style={{ background: '#e0e7ff', padding: '6px 14px', borderRadius: '25px', fontSize: '12px' }}>✅ {a}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: '20px' }}>
                <h4>Reviews</h4>
                {reviews.filter(r => r.listingId === selectedListing.id).slice(0, 3).map(review => (
                  <div key={review.id} style={{ background: '#f9f9f9', padding: '12px', borderRadius: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong>{review.userName}</strong>
                      <span>⭐ {review.rating}/5</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px' }}>{review.comment}</p>
                  </div>
                ))}
                
                {currentUser.id !== selectedListing.userId && (
                  <div style={{ marginTop: '15px' }}>
                    <h5>Write a Review</h5>
                    <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})} style={{ padding: '10px', marginBottom: '10px', borderRadius: '12px', width: '100%' }}>
                      <option value={5}>⭐⭐⭐⭐⭐ - Excellent</option>
                      <option value={4}>⭐⭐⭐⭐ - Good</option>
                      <option value={3}>⭐⭐⭐ - Average</option>
                      <option value={2}>⭐⭐ - Poor</option>
                      <option value={1}>⭐ - Terrible</option>
                    </select>
                    <textarea placeholder="Write your review..." value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '10px' }} rows={3} />
                    <button onClick={() => addReview(selectedListing.id)} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '12px', borderRadius: '25px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>Submit Review</button>
                  </div>
                )}
              </div>
              
              <form onSubmit={(e) => sendMessage(e, selectedListing)}>
                <textarea placeholder={`Message ${selectedListing.userName}...`} value={newMessage} onChange={e => setNewMessage(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '12px', marginBottom: '12px' }} rows={3} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' }}>Send Message</button>
                  <button type="button" onClick={() => setSelectedListing(null)} style={{ flex: 1, padding: '12px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer' }}>Close</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
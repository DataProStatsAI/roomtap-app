'use client';

import { supabase } from '../lib/supabaseClient'; // Fixed path
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
  fromUser: string;
  fromEmail: string;
  toUser: string;
  toEmail: string;
  message: string;
  timestamp: string;
  listingTitle: string;
  read: boolean;
}

interface Review {
  id: number;
  listingId: number;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
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
    if (!currentUser) {
      alert('Please login to save favorites');
      return;
    }
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

  const addReview = (listingId: number) => {
    if (!currentUser) {
      alert('Please login to post a review');
      return;
    }
    if (!newReview.comment.trim()) {
      alert('Please write a review');
      return;
    }
    const review = {
      id: Date.now(),
      listingId,
      userId: currentUser.id,
      userName: currentUser.name,
      rating: newReview.rating,
      comment: newReview.comment,
      timestamp: new Date().toISOString()
    };
    setReviews(prev => [...prev, review]);
    setNewReview({ rating: 5, comment: '' });
    addNotification('Review posted successfully!', 'success');
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: supabaseListings, error } = await supabase
          .from('listings')
          .select('*')
          .limit(20);
        
        if (!error && supabaseListings && supabaseListings.length > 0) {
          const mappedListings = supabaseListings.map((item: any) => ({
            id: typeof item.id === 'string' ? parseInt(item.id) || Date.now() : item.id,
            title: item.title,
            price: item.price,
            location: item.location,
            description: item.description || '',
            images: item.images || [],
            userId: item.user_id || '',
            userName: item.user_name || '',
            userEmail: item.user_email || '',
            isVisible: item.is_visible,
            createdAt: item.created_at,
            views: item.views || 0,
            latitude: item.latitude,
            longitude: item.longitude,
            category: item.category,
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            amenities: item.amenities || []
          }));
          setListings(mappedListings);
        } else {
          const savedListings = localStorage.getItem('roomtap_listings');
          if (savedListings) {
            setListings(JSON.parse(savedListings));
          } else {
            const sampleListings = [
              {
                id: 1,
                title: "Cozy Room near UZ",
                price: 120,
                location: "Avondale, Harare",
                description: "Beautiful room close to university, perfect for students.",
                images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500"],
                userId: "user1",
                userName: "John Doe",
                userEmail: "john@example.com",
                isVisible: true,
                createdAt: new Date().toISOString(),
                views: 45,
                latitude: -17.7989,
                longitude: 31.0335,
                category: 'room',
                bedrooms: 1,
                bathrooms: 1,
                amenities: ['WiFi', 'Utilities Included', 'Furnished']
              },
              {
                id: 2,
                title: "Modern Shared Apartment",
                price: 80,
                location: "Belvedere, Harare",
                description: "Spacious shared apartment with great amenities.",
                images: ["https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=500"],
                userId: "user2",
                userName: "Jane Smith",
                userEmail: "jane@example.com",
                isVisible: true,
                createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
                views: 32,
                latitude: -17.8150,
                longitude: 31.0230,
                category: 'apartment',
                bedrooms: 2,
                bathrooms: 2,
                amenities: ['WiFi', 'Parking', 'Pool', 'Gym']
              }
            ];
            setListings(sampleListings);
          }
        }
      } catch (error) {
        console.error('Error loading from Supabase:', error);
        const savedListings = localStorage.getItem('roomtap_listings');
        if (savedListings) {
          setListings(JSON.parse(savedListings));
        }
      }

      const savedMessages = localStorage.getItem('roomtap_messages');
      const savedUser = localStorage.getItem('roomtap_user');
      const savedFavorites = localStorage.getItem('roomtap_favorites');
      const savedReviews = localStorage.getItem('roomtap_reviews');
      
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
        setShowLogin(false);
      }
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedReviews) setReviews(JSON.parse(savedReviews));
    };

    loadData();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (listings.length) localStorage.setItem('roomtap_listings', JSON.stringify(listings));
  }, [listings]);
  
  useEffect(() => {
    localStorage.setItem('roomtap_messages', JSON.stringify(messages));
  }, [messages]);
  
  useEffect(() => {
    localStorage.setItem('roomtap_favorites', JSON.stringify(favorites));
  }, [favorites]);
  
  useEffect(() => {
    localStorage.setItem('roomtap_reviews', JSON.stringify(reviews));
  }, [reviews]);

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

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    
    const user = { id: 'user_' + Date.now(), name, email, isLoggedIn: true };
    setCurrentUser(user);
    localStorage.setItem('roomtap_user', JSON.stringify(user));
    setShowLogin(false);
    addNotification(`Welcome ${name}!`, 'success');
  };

  const addListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please login first');
      return;
    }
    if (newListing.images.length === 0) {
      alert('Please add at least one image');
      return;
    }
    
    const coords = getCoordinatesFromAddress(newListing.location);
    const listing = {
      id: Date.now(),
      title: newListing.title,
      price: Number(newListing.price),
      location: newListing.location,
      description: newListing.description || "No description provided",
      images: newListing.images,
      voiceNote: voiceNoteUrl,
      voiceNoteDuration: recordingDuration,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      isVisible: true,
      createdAt: new Date().toISOString(),
      views: 0,
      latitude: coords.lat,
      longitude: coords.lng,
      category: newListing.category,
      bedrooms: newListing.bedrooms,
      bathrooms: newListing.bathrooms,
      amenities: newListing.amenities
    };
    
    setListings([listing, ...listings]);
    
    try {
      await supabase.from('listings').insert([{
        title: listing.title,
        price: listing.price,
        location: listing.location,
        description: listing.description,
        images: listing.images,
        category: listing.category,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        amenities: listing.amenities,
        user_id: listing.userId,
        user_name: listing.userName,
        user_email: listing.userEmail,
        latitude: listing.latitude,
        longitude: listing.longitude
      }]);
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
    
    setNewListing({ 
      title: '', price: '', location: '', description: '', images: [], 
      category: 'room', bedrooms: 1, bathrooms: 1, amenities: [],
      latitude: null, longitude: null 
    });
    setVoiceNoteUrl('');
    setRecordingDuration(0);
    setShowForm(false);
    addNotification('Listing published successfully!', 'success');
  };

  const deleteListing = (id: number, userId: string) => {
    if (currentUser?.id !== userId) {
      alert('You can only delete your own listings!');
      return;
    }
    if (confirm('Delete this listing?')) {
      setListings(listings.filter(l => l.id !== id));
      addNotification('Listing deleted', 'info');
    }
  };

  const toggleVisibility = (id: number, userId: string) => {
    if (currentUser?.id !== userId) {
      alert('You can only manage your own listings!');
      return;
    }
    setListings(listings.map(l => 
      l.id === id ? { ...l, isVisible: !l.isVisible } : l
    ));
    const listing = listings.find(l => l.id === id);
    addNotification(`Listing ${listing?.isVisible ? 'hidden' : 'visible'}`, 'info');
  };

  const incrementViews = (id: number) => {
    setListings(listings.map(l => 
      l.id === id ? { ...l, views: l.views + 1 } : l
    ));
  };

  const sendMessage = (e: React.FormEvent, listing: Listing) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please login to send messages');
      return;
    }
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      listingId: listing.id,
      fromUser: currentUser.name,
      fromEmail: currentUser.email,
      toUser: listing.userName,
      toEmail: listing.userEmail,
      message: newMessage,
      timestamp: new Date().toISOString(),
      listingTitle: listing.title,
      read: false
    };
    
    setMessages([message, ...messages]);
    setNewMessage('');
    setSelectedListing(null);
    addNotification(`Message sent to ${listing.userName}!`, 'success');
  };

  // Fixed: Added null check for listing.latitude and listing.longitude
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

  const myListings = listings.filter(l => l.userId === currentUser?.id);
  const userMessages = messages.filter(m => m.toEmail === currentUser?.email && !m.read);
  const totalViews = myListings.reduce((sum, l) => sum + l.views, 0);
  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  const placeholderImg = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80";

  if (showLogin) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 10px 0' }}>🏠 RoomTap</h1>
          <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Welcome to RoomTap</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>Find your perfect room or list your space</p>
          <form onSubmit={handleLogin}>
            <input name="name" placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
            <input name="email" type="email" placeholder="Email Address" required style={{ width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Get Started →</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '15px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ cursor: 'pointer', margin: 0, fontSize: '24px' }} onClick={() => setActiveTab('explore')}>🏠 RoomTap</h2>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('explore')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: activeTab === 'explore' ? 'bold' : 'normal', fontSize: '14px' }}>🔍 Explore</button>
            <button onClick={() => setActiveTab('favorites')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: activeTab === 'favorites' ? 'bold' : 'normal', fontSize: '14px' }}>❤️ Favorites ({favorites.length})</button>
            <button onClick={() => setActiveTab('dashboard')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal', fontSize: '14px' }}>📊 Dashboard</button>
            <button onClick={() => setShowMessages(!showMessages)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '14px', position: 'relative' }}>
              💬 {userMessages.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{userMessages.length}</span>}
            </button>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '14px', position: 'relative' }}>
              🔔 {notifications.filter(n => !n.read).length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{notifications.filter(n => !n.read).length}</span>}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>👋 {currentUser?.name.split(' ')[0]}</span>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      {showNotifications && (
        <div style={{ position: 'fixed', right: '20px', top: '80px', width: '350px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 200, maxHeight: '400px', overflow: 'auto' }}>
          <div style={{ padding: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {showMessages && currentUser && (
        <div style={{ position: 'fixed', right: '20px', top: '80px', width: '350px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 200, maxHeight: '500px', overflow: 'auto' }}>
          <div style={{ padding: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Messages</h3>
            <button onClick={() => setShowMessages(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          {messages.filter(m => m.toEmail === currentUser.email || m.fromEmail === currentUser.email).length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No messages yet</p>
          ) : (
            messages.filter(m => m.toEmail === currentUser.email || m.fromEmail === currentUser.email).map((msg) => (
              <div key={msg.id} style={{ padding: '12px', borderBottom: '1px solid #eee', background: !msg.read && msg.toEmail === currentUser.email ? '#f0f0ff' : 'white' }}>
                <strong>{msg.fromUser === currentUser.name ? 'You → ' + msg.toUser : msg.fromUser}</strong>
                <small style={{ color: '#999', display: 'block' }}>about {msg.listingTitle}</small>
                <p style={{ margin: '8px 0 4px', fontSize: '13px' }}>{msg.message}</p>
                <small style={{ color: '#aaa', fontSize: '10px' }}>{new Date(msg.timestamp).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '20px auto', padding: '0 20px' }}>
        {activeTab === 'explore' ? (
          <>
            <button onClick={() => setShowForm(!showForm)} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', marginBottom: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>+ Add New Listing</button>
            
            {showForm && (
              <div style={{ background: 'white', padding: '24px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                <h3 style={{ marginTop: 0, color: '#667eea' }}>List Your Space</h3>
                <form onSubmit={addListing}>
                  <input placeholder="Title *" value={newListing.title} onChange={e => setNewListing({...newListing, title: e.target.value})} required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input placeholder="Price *" type="number" value={newListing.price} onChange={e => setNewListing({...newListing, price: e.target.value})} required style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                    <select value={newListing.category} onChange={e => setNewListing({...newListing, category: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                      {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  
                  <input placeholder="Location *" value={newListing.location} onChange={e => setNewListing({...newListing, location: e.target.value})} required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="number" placeholder="Bedrooms" value={newListing.bedrooms} onChange={e => setNewListing({...newListing, bedrooms: parseInt(e.target.value)})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                    <input type="number" placeholder="Bathrooms" value={newListing.bathrooms} onChange={e => setNewListing({...newListing, bathrooms: parseInt(e.target.value)})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                  </div>
                  
                  <textarea placeholder="Description" value={newListing.description} onChange={e => setNewListing({...newListing, description: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }} rows={3} />
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Amenities</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {amenitiesList.map(amenity => (
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
                          <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>🎙️ Voice Note (30 sec max)</label>
                    {!voiceNoteUrl ? (
                      !isRecording ? (
                        <button type="button" onClick={startRecording} style={{ background: '#f97316', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>🎤 Start Recording</button>
                      ) : (
                        <button type="button" onClick={stopRecording} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>⏹️ Stop ({recordingDuration}s)</button>
                      )
                    ) : (
                      <div>
                        <audio controls src={voiceNoteUrl} style={{ width: '100%', marginBottom: '5px' }} />
                        <button type="button" onClick={deleteVoiceNote} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                      </div>
                    )}
                  </div>
                  
                  <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Publish Listing</button>
                </form>
              </div>
            )}

            <input placeholder="🔍 Search by title or location..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '30px', border: '2px solid #e0e0e0', marginBottom: '20px', fontSize: '16px', outline: 'none' }} />
            
            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={getUserLocation} style={{ background: useGPS && userLocation ? '#10b981' : '#667eea', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>📍 {useGPS && userLocation ? 'GPS Active' : 'Use My Location'}</button>
                {useGPS && userLocation && (
                  <>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', color: '#666' }}>Radius: {searchRadius} km</label>
                      <input type="range" min="1" max="50" value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <button onClick={() => { setUseGPS(false); setUserLocation(null); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Clear</button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ background: 'white', padding: '10px 15px', borderRadius: '10px', flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>Price: ${priceRange.min} - ${priceRange.max}</label>
                <input type="range" min="0" max="1000" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: parseInt(e.target.value)})} style={{ width: '100%' }} />
                <input type="range" min="0" max="1000" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
              
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #ddd' }}>
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="views">Most Viewed</option>
                <option value="rating">Top Rated</option>
                {useGPS && <option value="distance">Nearest First</option>}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px', overflowX: 'auto' }}>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: selectedCategory === cat.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white', color: selectedCategory === cat.id ? 'white' : '#333', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <h2 style={{ color: '#333', marginBottom: '20px' }}>✨ Available Spaces ({sortedListings.length})</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
              {sortedListings.map(l => (
                <div 
                  key={l.id} 
                  style={{ 
                    background: 'white', 
                    borderRadius: '15px', 
                    overflow: 'hidden', 
                    boxShadow: hoveredListingId === l.id ? '0 20px 40px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
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
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(l.id); }} style={{ background: favorites.includes(l.id) ? '#ef4444' : 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px' }}>
                        {favorites.includes(l.id) ? '❤️' : '🤍'}
                      </button>
                      <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '20px', fontSize: '12px' }}>
                        ⭐ {l.averageRating?.toFixed(1) || 'New'} ({l.reviewCount})
                      </div>
                    </div>
                    
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '15px', fontSize: '12px' }}>
                      {categories.find(c => c.id === l.category)?.icon} {l.category}
                    </div>
                    
                    {useGPS && l.distance && (
                      <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '15px', fontSize: '12px' }}>
                        📍 {l.distance} km
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: '16px' }} onClick={() => { incrementViews(l.id); setSelectedListing(l); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: hoveredListingId === l.id ? '#667eea' : '#333' }}>{l.title}</h3>
                      <p style={{ fontSize: '20px', color: '#667eea', fontWeight: 'bold', margin: 0 }}>${l.price}<span style={{ fontSize: '12px' }}>/mo</span></p>
                    </div>
                    <p style={{ color: '#666', fontSize: '14px', margin: '0 0 8px 0' }}>📍 {l.location}</p>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '8px', fontSize: '12px', color: '#999' }}>
                      <span>🛏️ {l.bedrooms} bed</span>
                      <span>🚽 {l.bathrooms} bath</span>
                      <span>👁️ {l.views} views</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                      {l.amenities?.slice(0, 3).map((a: string) => (
                        <span key={a} style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px', fontSize: '10px' }}>{a}</span>
                      ))}
                      {l.amenities?.length > 3 && <span style={{ fontSize: '10px', color: '#999' }}>+{l.amenities.length - 3}</span>}
                    </div>
                    <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>👤 {l.userName}</p>
                  </div>
                </div>
              ))}
            </div>
            {sortedListings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
                <p>No listings found. Try adjusting your filters!</p>
              </div>
            )}
          </>
        ) : activeTab === 'favorites' ? (
          <div>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>❤️ Your Favorite Listings ({favoriteListings.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
              {favoriteListings.map(l => (
                <div key={l.id} style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => { incrementViews(l.id); setSelectedListing(l); }}>
                  <img src={l.images?.[0] ?? placeholderImg} alt={l.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  <div style={{ padding: '16px' }}>
                    <h3>{l.title}</h3>
                    <p style={{ color: '#667eea', fontWeight: 'bold' }}>${l.price}/month</p>
                    <p>📍 {l.location}</p>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(l.id); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' }}>Remove from Favorites</button>
                  </div>
                </div>
              ))}
            </div>
            {favoriteListings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
                <p>No favorites yet. Click the ❤️ on listings to save them!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>📊 Your Dashboard</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px' }}>🏠</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{myListings.length}</div>
                <div>Active Listings</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px' }}>👁️</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{totalViews}</div>
                <div>Total Views</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px' }}>💬</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{userMessages.length}</div>
                <div>Unread Messages</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px' }}>⭐</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{reviews.filter(r => myListings.some(l => l.id === r.listingId)).length}</div>
                <div>Total Reviews</div>
              </div>
            </div>
            
            <h3>My Listings</h3>
            {myListings.map(l => (
              <div key={l.id} style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '15px', borderLeft: `4px solid ${l.isVisible ? '#667eea' : '#ef4444'}` }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <img src={l.images?.[0] ?? placeholderImg} style={{ width: '100px', height: '100px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>{l.title}</h4>
                    <p style={{ color: '#667eea', fontWeight: 'bold' }}>${l.price}/month</p>
                    <p>📍 {l.location}</p>
                    <p style={{ fontSize: '12px', color: '#999' }}>👁️ {l.views} views • ⭐ {reviews.filter(r => r.listingId === l.id).length} reviews</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleVisibility(l.id, l.userId)} style={{ padding: '6px 12px', background: l.isVisible ? '#f97316' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{l.isVisible ? 'Hide' : 'Show'}</button>
                    <button onClick={() => deleteListing(l.id, l.userId)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedListing && (
        <div onClick={() => setSelectedListing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', maxWidth: '600px', width: '100%', borderRadius: '20px', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
            <img src={selectedListing.images?.[0] ?? placeholderImg} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <h2>{selectedListing.title}</h2>
                <p style={{ fontSize: '24px', color: '#667eea', fontWeight: 'bold' }}>${selectedListing.price}<span style={{ fontSize: '14px' }}>/mo</span></p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f0f0f0', padding: '5px 10px', borderRadius: '15px' }}>📍 {selectedListing.location}</span>
                <span style={{ background: '#f0f0f0', padding: '5px 10px', borderRadius: '15px' }}>🛏️ {selectedListing.bedrooms} beds</span>
                <span style={{ background: '#f0f0f0', padding: '5px 10px', borderRadius: '15px' }}>🚽 {selectedListing.bathrooms} baths</span>
                <span style={{ background: '#f0f0f0', padding: '5px 10px', borderRadius: '15px' }}>⭐ {reviews.filter(r => r.listingId === selectedListing.id).reduce((sum, r) => sum + r.rating, 0) / (reviews.filter(r => r.listingId === selectedListing.id).length || 1)} ({reviews.filter(r => r.listingId === selectedListing.id).length} reviews)</span>
              </div>
              
              <p style={{ lineHeight: '1.6', marginBottom: '20px' }}>{selectedListing.description}</p>
              
              {selectedListing.amenities && (
                <div style={{ marginBottom: '20px' }}>
                  <h4>Amenities</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedListing.amenities.map((a: string) => (
                      <span key={a} style={{ background: '#e0e7ff', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>✅ {a}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedListing.voiceNote && (
                <div style={{ background: '#f0f0ff', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                  <strong>🎙️ Voice Description ({selectedListing.voiceNoteDuration}s):</strong>
                  <audio controls src={selectedListing.voiceNote} style={{ width: '100%', marginTop: '10px' }} />
                </div>
              )}
              
              <div style={{ marginBottom: '20px' }}>
                <h4>Reviews</h4>
                {reviews.filter(r => r.listingId === selectedListing.id).map(review => (
                  <div key={review.id} style={{ background: '#f9f9f9', padding: '12px', borderRadius: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong>{review.userName}</strong>
                      <span>⭐ {review.rating}/5</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px' }}>{review.comment}</p>
                    <small style={{ color: '#999' }}>{new Date(review.timestamp).toLocaleDateString()}</small>
                  </div>
                ))}
                
                {currentUser && currentUser.id !== selectedListing.userId && (
                  <div style={{ marginTop: '15px' }}>
                    <h5>Write a Review</h5>
                    <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})} style={{ padding: '8px', marginBottom: '10px', borderRadius: '8px', width: '100%' }}>
                      <option value={5}>⭐⭐⭐⭐⭐ - Excellent</option>
                      <option value={4}>⭐⭐⭐⭐ - Good</option>
                      <option value={3}>⭐⭐⭐ - Average</option>
                      <option value={2}>⭐⭐ - Poor</option>
                      <option value={1}>⭐ - Terrible</option>
                    </select>
                    <textarea placeholder="Write your review..." value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px' }} rows={3} />
                    <button onClick={() => addReview(selectedListing.id)} style={{ background: '#667eea', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Submit Review</button>
                  </div>
                )}
              </div>
              
              <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                <p><strong>👤 Hosted by {selectedListing.userName}</strong></p>
                <p style={{ fontSize: '12px', color: '#666' }}>Listed on {new Date(selectedListing.createdAt).toLocaleDateString()}</p>
              </div>
              
              <form onSubmit={(e) => sendMessage(e, selectedListing)}>
                <textarea placeholder={`Message ${selectedListing.userName}...`} value={newMessage} onChange={e => setNewMessage(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', marginBottom: '12px' }} rows={3} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Send Message</button>
                  <button type="button" onClick={() => setSelectedListing(null)} style={{ flex: 1, padding: '12px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Close</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
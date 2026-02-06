import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { 
  Compass, 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Users,
  Building2,
  X,
  Globe,
  Menu
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { UNIVERSITY_DB } from './universities';
import { supabase } from './supabaseClient';
import AuthModal from './AuthModal';
import { API_BASE_URL } from './config';

const CURRENCY_CONFIG = {
  USD: { symbol: '$', rate: 1, label: 'USD', locale: 'en-US' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR', locale: 'de-DE' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP', locale: 'en-GB' },
  JPY: { symbol: '¥', rate: 148.5, label: 'JPY', locale: 'ja-JP' },
  CAD: { symbol: 'C$', rate: 1.35, label: 'CAD', locale: 'en-CA' },
  RON: { symbol: 'lei', rate: 4.58, label: 'RON', locale: 'ro-RO' }
};

const glassIcon = new L.DivIcon({
  className: 'custom-pin',
  html: `<div class="marker-shell"><div class="marker-core"></div></div>`,
  iconSize: [24, 24]
});

const activeGlassIcon = new L.DivIcon({
  className: 'custom-pin active',
  html: `<div class="marker-shell active"><div class="marker-core"></div></div>`,
  iconSize: [28, 28]
});


const extractSalaryNumbers = (salaryStr) => {
  if (!salaryStr || typeof salaryStr !== 'string') return [0];
  
  const cleanStr = salaryStr.toLowerCase();
  const numbers = cleanStr.match(/\d+/g)?.map(Number) || [];
  
  const multiplier = cleanStr.includes('k') && numbers[0] < 1000 ? 1000 : 1;
  
  return numbers.map(n => n * multiplier);
};

function MapController({ center, isSelected }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      const zoomLevel = isSelected ? 13 : 3;
      map.flyTo(center, zoomLevel, { duration: 2 });
    }
  }, [center, isSelected, map]);
  return null;
}
const SkeletonLoader = () => (
  <div className="skeleton-loader">
    {[1, 2, 3].map((i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton-header">
          <div className="skeleton-header-left">
            <div className="skeleton-title"></div>
            <div className="skeleton-subtitle"></div>
            <div className="skeleton-tags">
              <div className="skeleton-tag"></div>
              <div className="skeleton-tag"></div>
            </div>
          </div>
          <div className="skeleton-pill"></div>
        </div>

        <div className="skeleton-timeline">
          <div className="skeleton-path"></div>
          <div className="skeleton-path"></div>
          <div className="skeleton-path"></div>
        </div>

        <div className="skeleton-actions">
          <div className="skeleton-button"></div>
        </div>
      </div>
    ))}
  </div>
);

const App = () => {
  const [selectedUni, setSelectedUni] = useState(null);
  const [hoveredUni, setHoveredUni] = useState(null);
  const [activeUni, setActiveUni] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("Software Engineer");
  const [universitySearch, setUniversitySearch] = useState("");
  const [filteredUniversities, setFilteredUniversities] = useState(UNIVERSITY_DB);
  const [showFilters, setShowFilters] = useState(false);
  
  const [mapCenter, setMapCenter] = useState([30, 10]);
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [usageCount, setUsageCount] = useState(0);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(session) fetchUsage(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if(session) fetchUsage(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUsage = async (userId) => {
    const { data } = await supabase
      .from('user_usage')
      .select('query_count')
      .eq('id', userId)
      .single();
    if(data) setUsageCount(data.query_count);
  };
  useEffect(() => {
    if (universitySearch.trim() === "") {
      setFilteredUniversities(UNIVERSITY_DB);
    } else {
      const filtered = UNIVERSITY_DB.filter(uni =>
        uni.name.toLowerCase().includes(universitySearch.toLowerCase())
      );
      setFilteredUniversities(filtered);
    }
  }, [universitySearch]);

  useEffect(() => {
    if (activeUni) {
      setActiveUni(null);
    }
  }, [searchQuery]);

  const convertValue = (usdValue) => {
    const config = CURRENCY_CONFIG[displayCurrency];
    const converted = usdValue * config.rate;
    
    if (displayCurrency === 'RON') {
      return `${Math.round(converted).toLocaleString('ro-RO')} lei`;
    }

    const divisor = displayCurrency === 'JPY' ? 1000000 : 1000;
    const suffix = displayCurrency === 'JPY' ? 'M' : 'k';
    
    return `${config.symbol}${Math.round(converted / divisor)}${suffix}`;
  };

  
  const displaySalaryRange = (salaryStr) => {
    const numbers = extractSalaryNumbers(salaryStr);
    if (numbers.length === 0 || numbers[0] === 0) return "N/A";

    const formattedParts = numbers.map(val => convertValue(val));
    return formattedParts.join(' - ');
  };

 
  const calculateGlobalAverage = (alumni) => {
    if (!alumni || alumni.length === 0) return "N/A";

    const totalUsd = alumni.reduce((acc, alum) => {
      const range = extractSalaryNumbers(alum.salary);
      const midPoint = range.length === 2 
        ? (range[0] + range[1]) / 2 
        : range[0];
      return acc + midPoint;
    }, 0);

    const avgUsd = totalUsd / alumni.length;
    return convertValue(avgUsd);
  };

  const handleUniClick = (uni) => {
    setSelectedUni(uni);
    setMapCenter(uni.coords);
    setActiveUni(null);
  };

  const handleSearch = async () => {
    if (!selectedUni) return;

    if (!session) {
      setShowAuth(true);
      return;
    }
    setHoveredUni(null);

    setLoading(true);
    
    try {
      const { access_token } = session; 

      const response = await fetch(
        `${API_BASE_URL}/api/scrape?school=${encodeURIComponent(selectedUni.name)}&role=${encodeURIComponent(searchQuery)}&countryCode=${selectedUni.country || 'us'}`,
        {
          headers: {
            // Send token to backend
            'Authorization': `Bearer ${access_token}` 
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle Limit Reached Error
        if (response.status === 403) {
          alert("You have reached your 3 free queries! Upgrade coming soon.");
          return;
        }
        throw new Error(data.error || "Backend offline");
      }

      setActiveUni({ ...selectedUni, alumni: data.alumni }); // Note: adjust if your backend structure changes slightly
      setUsageCount(data.new_usage_count); // Update UI counter

    } catch (err) {
      console.error("Scraping failed:", err);
      setActiveUni({ ...selectedUni, alumni: [], error: true });
    } finally {
      setLoading(false);
    }
  };
  const handleClearSearch = () => setSearchQuery("");

  const handleClearUniversity = () => {
  setSelectedUni(null);
  setActiveUni(null);
  setLoading(false); // Reset loading state
  setMapCenter([30, 10]);
};
  const handleRoleSearchKeyDown = (e) => {
  if (e.key === 'Enter' && selectedUni) {
    handleSearch();
  }
};

const handleUniversitySearchKeyDown = (e) => {
  if (e.key === 'Enter' && filteredUniversities.length === 1) {
    handleUniClick(filteredUniversities[0]);
  }
};
  const roleSuggestions = [
    "Software Engineer", "Product Manager", "Data Scientist",
    "Investment Banker", "Management Consultant", "Venture Capitalist"
  ];

  return (
    <div className="app-viewport">
      <div className="mobile-top-bar">
        <div className="brand">
          <Compass className="logo-icon" size={24} />
          <span>PATHFINDER</span>
        </div>
        <button className="btn-secondary" onClick={() => setShowMobileMenu(true)}>
          <Menu size={20} />
        </button>
      </div>
      {!activeUni && !loading &&  (
        <div className="mobile-uni-search-container">
          <div className="mobile-search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Find a university..." 
              value={universitySearch}
              onChange={(e) => setUniversitySearch(e.target.value)}
            />
            {universitySearch && (
              <button className="clear-btn" onClick={() => setUniversitySearch('')}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Dropdown Results */}
          {universitySearch && (
            <div className="mobile-search-dropdown">
              {filteredUniversities.length > 0 ? (
                filteredUniversities.slice(0, 5).map(uni => (
                  <button
                    key={uni.id}
                    className="mobile-search-item"
                    onClick={() => {
                      handleUniClick(uni);
                      setUniversitySearch(""); // Clear text
                    }}
                  >
                    <MapPin size={14} />
                    <span>{uni.name}</span>
                  </button>
                ))
              ) : (
                <div className="mobile-search-empty">No results found</div>
              )}
            </div>
          )}
        </div>
      )}
      {showMobileMenu && (
        <div className="mobile-menu-overlay animate-fade-in">
          <div className="mobile-menu-content">
            <div className="mobile-menu-header">
              <div className="brand">
                <Compass className="logo-icon" size={24} />
                <span>PATHFINDER</span>
              </div>
              <button className="btn-secondary" onClick={() => setShowMobileMenu(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="mobile-summary">
              <h3>Navigate Your Future</h3>
              <p>
                Don't guess your career path - map it. 
                <br/><br/>
                Access real salary data and career trajectories from alumni at the world's top universities. See exactly where a degree can take you.
                <br/><br/>
                Select your dream role, pick a university, and discover the paths alumni took to get there. 
              </p>
              <div className="mobile-auth-section">
                {!session ? (
                  <button className="search-btn" onClick={() => { setShowMobileMenu(false); setShowAuth(true); }}>
                    Log In / Sign Up
                  </button>
                ) : (
                  <div className="mobile-user-status">
                    <div className="status-pill">{usageCount} / 3 Free Searches</div>
                    <button className="btn-secondary" style={{width: '100%'}} onClick={() => supabase.auth.signOut()}>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
<div className="desktop-auth-container" style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        {!session ? (
          <button className="btn-secondary" onClick={() => setShowAuth(true)}>
            Log In
          </button>
        ) : (
          <div className="glass-header" style={{ padding: '8px 16px', gap: '10px' }}>
            <span style={{ fontSize: '13px' }}>{usageCount} / 3 Free Searches</span>
            <button className="btn-secondary" style={{padding: '4px 8px'}} onClick={() => supabase.auth.signOut()}>
              Log Out
            </button>
          </div>
        )}
      </div>
      

{showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      

      <div className={`liquid-glass-ui ${(loading || activeUni) ? 'results-view-active' : ''}`}>
        <header className="glass-header">
          <div className="brand">
            <Compass className="logo-icon" size={24} />
            <span>PATHFINDER</span>
          </div>
          <div className="live-indicator">
            <span className="pulse-dot"></span> Live Data
          </div>
        </header>

        <div className="search-section">
          <label htmlFor="role-search">
            <Briefcase size={14} className="inline-icon" />
            What career path are you exploring?
          </label>
          <div className="search-bar">
            <Search size={18} className="icon" />
            <input 
              id="role-search"
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleRoleSearchKeyDown}
              placeholder="e.g. Venture Capitalist, Data Scientist" 
              autoComplete="off"
            />
            {searchQuery && (
              <button className="clear-btn" onClick={handleClearSearch}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="quick-suggestions">
            {roleSuggestions.map((role, idx) => (
              <button
                key={idx}
                className={`suggestion-chip ${searchQuery === role ? 'active' : ''}`}
                onClick={() => {
                  setSearchQuery(role);
                  setActiveUni(null);
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <button 
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Building2 size={16} />
            <span>Filter Universities ({filteredUniversities.length})</span>
            <ChevronRight 
              size={16} 
              className={`chevron ${showFilters ? 'rotated' : ''}`}
            />
          </button>

          {showFilters && (
            <div className="filter-content">
              <div className="search-bar small">
                <Search size={16} className="icon" />
                <input 
                  type="text" 
                  value={universitySearch}
                  onChange={(e) => setUniversitySearch(e.target.value)}
                  onKeyDown={handleUniversitySearchKeyDown}
                  placeholder="Search universities..." 
                  autoComplete="off"
                />
                {universitySearch && (
                  <button className="clear-btn" onClick={() => setUniversitySearch("")}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="university-list">
                {filteredUniversities.length > 0 ? (
                  filteredUniversities.map(uni => (
                    <button
                      key={uni.id}
                      className={`university-item ${activeUni?.id === uni.id ? 'active' : ''}`}
                      onClick={() => handleUniClick(uni)}
                    >
                      <MapPin size={14} />
                      <span>{uni.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="no-results"><p>No universities found</p></div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="panel-scroll-content">
          {loading ? (
         
          <SkeletonLoader />
          ) : activeUni ? (
            <div className="results-view animate-fade-in">
              <div className="uni-header">
                <div className="uni-title-row">
                  <div>
                    <h2>{activeUni.name}</h2>
                    <div className="stat-row">
                      <MapPin size={14} />
                      <span>Alumni Network Active</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="currency-switcher">
                      <Globe size={14} />
                      <select 
                        value={displayCurrency} 
                        onChange={(e) => setDisplayCurrency(e.target.value)}
                      >
                        {Object.keys(CURRENCY_CONFIG).map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>
                    <button className="close-btn" onClick={handleClearUniversity}>
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="quick-stats">
                  <div className="stat-card">
                    <Users size={16} />
                    <div>
                      <div className="stat-value">{activeUni.alumni.length}</div>
                      <div className="stat-label">Alumni Found</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <DollarSign size={16} />
                    <div>
                      <div className="stat-value">
                        {calculateGlobalAverage(activeUni.alumni)}
                      </div>
                      <div className="stat-label">Avg. Salary</div>
                    </div>
                  </div>
                </div>
              </div>

              {activeUni.error ? (
                <div className="error-state">
                  <Globe size={32} />
                  <h3>Connection Error</h3>
                  <p>Backend not reachable on <code>localhost:5000</code></p>
                  <button className="retry-btn" onClick={handleSearch}>Try Again</button>
                </div>
              ) : activeUni.alumni.length > 0 ? (
                activeUni.alumni.map((alum, i) => (
                  <div key={i} className="alumni-card">
                    <div className="card-top">
                      <div className="card-top-left">
                        <h4>{alum.name}</h4>
                        <p className="role-text">{alum.role}</p>
                        {alum.metadata && (
                          <div className="metadata-tags">
                            <span className="metadata-tag">
                              <TrendingUp size={11} />
                              {alum.metadata.yearsExperience} years exp
                            </span>
                            <span className="metadata-tag">
                              <Briefcase size={11} />
                              {alum.metadata.seniorityLevel}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {alum.salary && (
                        <div className="salary-pill">
                          {displaySalaryRange(alum.salary)}
                        </div>
                      )}
                    </div>

                    {alum.achievement && (
                      <div className="achievement-highlight" style={{ fontSize: '12px', color: '#555', marginBottom: '10px', padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                        <strong>Key Impact:</strong> {alum.achievement}
                      </div>
                    )}

                    <div className="path-timeline">
                      <div className="timeline-label">Career Journey</div>
                      {alum.path && alum.path.map((step, idx) => (
                        <div key={idx} className="path-node">
                          <ChevronRight size={12} className="node-icon" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>

                    <div className="card-actions">
                      <button 
                        className="btn-secondary"
                        onClick={() => window.open(alum.profileUrl, '_blank')}
                      >
                        <ExternalLink size={14} />
                        View Profile
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  <Briefcase size={32} />
                  <p>No alumni found for <strong>{searchQuery}</strong>.</p>
                </div>
              )}
            </div>
          ) : selectedUni ? (
            <div className="selected-state animate-fade-in">
              <div className="selected-uni-card">
                <div className="selected-uni-header">
                  <div>
                    <h2>{selectedUni.name}</h2>
                    <div className="stat-row">
                      <MapPin size={14} />
                      <span>Ready to search</span>
                    </div>
                  </div>
                  <button className="close-btn" onClick={handleClearUniversity}>
                    <X size={18} />
                  </button>
                </div>

                <div className="search-prompt">
                  <Briefcase size={24} />
                  <p>Ready to explore paths at <strong>{selectedUni.name}</strong> for <strong>{searchQuery}</strong> roles.</p>
                </div>

                <button className="search-btn" onClick={handleSearch}>
                  <Search size={18} />
                  Search Alumni Paths
                </button>
              </div>
            </div>
          ) : (
            <div className="welcome-state">
              <div className="welcome-icon">
                <Compass size={48} />
              </div>
              <h3>Discover Career Pathways</h3>
              <p>Search for a career, then select a university on the map.</p>
              
              <div className="welcome-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <strong>Choose a career</strong>
                    <span>Enter your target role above</span>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <strong>Select a university</strong>
                    <span>Click any pin on the map</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <MapContainer 
        center={mapCenter} 
        zoom={3} 
        zoomControl={false}
        className="main-map"
      >
        <MapController center={mapCenter} isSelected={!!selectedUni} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />
        
        {filteredUniversities.map(uni => (
          <Marker 
            key={uni.id} 
            position={uni.coords} 
            icon={selectedUni?.id === uni.id ? activeGlassIcon : glassIcon}
            eventHandlers={{ 
              click: () => handleUniClick(uni),
              mouseover: () => setHoveredUni(uni),
              mouseout: () => setHoveredUni(null)
            }}
          >
            {(hoveredUni?.id === uni.id || selectedUni?.id === uni.id) && (
              <Tooltip 
                direction="top" 
                offset={[0, -28]} 
                opacity={1} 
                permanent 
                className="glass-tooltip"
              >
                <div className="hover-preview-content">
                  <MapPin size={16} />
                  <div>
                    <h4>{uni.name}</h4>
                    <p>Click to select</p>
                  </div>
                </div>
              </Tooltip>
            )}
          </Marker>
        ))}
        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
};

export default App;
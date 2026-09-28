import { BusinessCategory, CountryHierarchy, DataPalSearchCampaign, TargetProfilePreset } from "./types";

export const TARGET_PROFILE_PRESETS: TargetProfilePreset[] = [
  {
    id: "normal",
    label: "Normal Extract (All Business Details)",
    desc: "Extract complete profile: verified phone, email, full address, ratings, website, and operating presence without filtering by digital gaps",
    badge: "Full Profile",
  },
  {
    id: "website",
    label: "Missing Website",
    desc: "Businesses operating with physical presence or local listings but no official dedicated website domain",
    badge: "High Conversion",
    suggestedCategories: ["Restaurants & Fine Dining", "Dental Clinics", "Automobile Service & Garage", "Retail Stores & Boutiques"],
  },
  {
    id: "gbp",
    label: "Missing Google Business Profile (GBP / Maps)",
    desc: "Unclaimed, poorly ranked, or unverified Google Maps pins ready for Local SEO optimization",
    badge: "Local SEO",
    suggestedCategories: ["Medical Clinics", "Lawyers & Advocates", "Salons & Hairdressers", "Real Estate Brokers"],
  },
  {
    id: "whatsapp",
    label: "Missing WhatsApp Business / Direct Chat",
    desc: "Businesses without automated WhatsApp Business API or direct messaging chat links",
    badge: "Chat Lead",
    suggestedCategories: ["Diagnostic Centers", "Clinics & Doctors", "Boutique Stores", "Property Brokers"],
  },
  {
    id: "online_ordering",
    label: "Missing Online Ordering & Appointments",
    desc: "Service businesses lacking automated digital reservation, appointment scheduling, or food ordering portals",
    badge: "SaaS Booking",
    suggestedCategories: ["Restaurants & Fine Dining", "Dental Clinics", "Spas & Salons", "Fitness & Gyms"],
  },
  {
    id: "social",
    label: "Missing Social Media Presence",
    desc: "Active businesses with zero connected or active Instagram, Facebook, or LinkedIn integration",
    badge: "Agency Pitch",
    suggestedCategories: ["Cafes & Coffee Shops", "Aesthetic Clinics", "Jewelry & Watches", "Fashion Boutiques"],
  },
  {
    id: "logo",
    label: "Missing Logo & Visual Branding",
    desc: "Unbranded local listings lacking custom creative identity, logo marks, or visual corporate branding",
    badge: "Creative Lead",
    suggestedCategories: ["Wholesalers & Distributors", "Builders & Contractors", "Hardware Stores", "Transport & Logistics"],
  },
  {
    id: "outdated_web",
    label: "Outdated / Non-Mobile Responsive Website",
    desc: "Legacy websites with poor mobile responsiveness, slow load speeds, or non-HTTPS insecure status",
    badge: "Web Redesign",
    suggestedCategories: ["Chartered Accountants", "Architects", "Manufacturing Units", "Hotels & Resorts"],
  },
  {
    id: "business_email",
    label: "Missing Professional Business Email",
    desc: "Businesses relying on generic @gmail.com or @yahoo.com addresses instead of a branded custom domain",
    badge: "Email / IT Pitch",
    suggestedCategories: ["Consulting Firms", "Builders & Contractors", "Brokers & Agents"],
  },
  {
    id: "low_reviews",
    label: "Low Review Volume & Reputation Gap (< 4.0 Stars)",
    desc: "High traffic businesses with fewer than 15 reviews or sub-4.0 star ratings needing review acceleration",
    badge: "Reputation Mgmt",
    suggestedCategories: ["Hotels & Resorts", "Supermarkets & Grocery", "Automobile Service & Garage"],
  },
  {
    id: "paid_ads",
    label: "Needs Paid Ads & Lead Funnels (Meta / Google Ads)",
    desc: "Businesses with zero active advertising campaigns ready for high-ROI customer acquisition funnels",
    badge: "Paid Ads",
    suggestedCategories: ["Real Estate Developers", "Cosmetic Clinics", "Education & Coaching Centers"],
  },
  {
    id: "seo",
    label: "Needs Local SEO & Map Pack 3-Pack Ranking",
    desc: "Businesses ranking on page 2+ for high-intent local search queries ready for citation & ranking boost",
    badge: "Rank Booster",
    suggestedCategories: ["Lawyers & Advocates", "Dental Clinics", "Plumbers & Electricians"],
  },
  {
    id: "ecommerce",
    label: "Missing E-Commerce / Online Payment Gateway",
    desc: "Physical retailers and wholesalers that only accept offline payments and lack digital catalog checkouts",
    badge: "E-Commerce",
    suggestedCategories: ["Retail Stores & Boutiques", "Wholesalers & Distributors", "Specialty Food Stores"],
  },
];

export const COUNTRY_HIERARCHIES: CountryHierarchy[] = [
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    phonePrefix: "+91",
    postalCodeLabel: "PIN Code",
    states: [
      {
        name: "Maharashtra",
        cities: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Navi Mumbai", "Aurangabad", "Solapur", "Kolhapur", "Kalyan-Dombivli", "Vasai-Virar"],
      },
      {
        name: "Delhi NCR",
        cities: ["New Delhi", "Gurgaon (Gurugram)", "Noida", "Greater Noida", "Faridabad", "Ghaziabad", "South Delhi", "Connaught Place", "Dwarka"],
      },
      {
        name: "Karnataka",
        cities: ["Bangalore (Bengaluru)", "Mysore", "Hubli-Dharwad", "Mangalore", "Belgaum", "Gulbarga", "Whitefield", "Indiranagar", "Koramangala", "HSR Layout"],
      },
      {
        name: "Tamil Nadu",
        cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Vellore", "Erode", "Tirunelveli"],
      },
      {
        name: "Telangana",
        cities: ["Hyderabad", "Secunderabad", "HITEC City", "Gachibowli", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
      },
      {
        name: "Gujarat",
        cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand"],
      },
      {
        name: "Uttar Pradesh",
        cities: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj (Allahabad)", "Meerut", "Bareilly", "Aligarh", "Gorakhpur", "Moradabad"],
      },
      {
        name: "West Bengal",
        cities: ["Kolkata", "Howrah", "Salt Lake", "New Town", "Durgapur", "Asansol", "Siliguri", "Bardhaman"],
      },
      {
        name: "Rajasthan",
        cities: ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Ajmer", "Bikaner", "Bhilwara", "Alwar"],
      },
      {
        name: "Punjab & Chandigarh",
        cities: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali", "Bathinda", "Hoshiarpur"],
      },
      {
        name: "Haryana",
        cities: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Sonipat", "Panchkula"],
      },
      {
        name: "Kerala",
        cities: ["Kochi (Cochin)", "Thiruvananthapuram", "Kozhikode (Calicut)", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad"],
      },
      {
        name: "Madhya Pradesh",
        cities: ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas"],
      },
      {
        name: "Andhra Pradesh",
        cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada"],
      },
      {
        name: "Bihar",
        cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif"],
      },
      {
        name: "Odisha",
        cities: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
      },
      {
        name: "Assam & North East",
        cities: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Shillong", "Imphal", "Agartala", "Aizawl"],
      },
      {
        name: "Jharkhand",
        cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh"],
      },
      {
        name: "Uttarakhand",
        cities: ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Roorkee", "Nainital"],
      },
      {
        name: "Goa",
        cities: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Calangute", "Candolim", "Ponda"],
      },
      {
        name: "Himachal Pradesh",
        cities: ["Shimla", "Dharamshala", "Manali", "Mandi", "Solan", "Kullu"],
      },
      {
        name: "Jammu & Kashmir",
        cities: ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur"],
      },
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    phonePrefix: "+1",
    postalCodeLabel: "ZIP Code",
    states: [
      {
        name: "California",
        cities: ["Los Angeles", "San Francisco", "San Jose", "San Diego", "Beverly Hills", "Irvine", "Sacramento", "Oakland", "Anaheim"],
      },
      {
        name: "New York",
        cities: ["New York City", "Manhattan", "Brooklyn", "Queens", "Buffalo", "Rochester", "Albany", "Syracuse"],
      },
      {
        name: "Texas",
        cities: ["Austin", "Houston", "Dallas", "San Antonio", "Fort Worth", "Plano", "Arlington", "El Paso"],
      },
      {
        name: "Florida",
        cities: ["Miami", "Orlando", "Tampa", "Fort Lauderdale", "Jacksonville", "St. Petersburg", "Boca Raton"],
      },
      {
        name: "Illinois",
        cities: ["Chicago", "Naperville", "Aurora", "Rockford", "Joliet", "Springfield"],
      },
      {
        name: "Washington",
        cities: ["Seattle", "Bellevue", "Redmond", "Tacoma", "Spokane", "Vancouver"],
      },
      {
        name: "Georgia",
        cities: ["Atlanta", "Savannah", "Augusta", "Athens", "Alpharetta", "Marietta"],
      },
      {
        name: "North Carolina",
        cities: ["Charlotte", "Raleigh", "Durham", "Greensboro", "Winston-Salem", "Cary"],
      },
      {
        name: "Massachusetts",
        cities: ["Boston", "Cambridge", "Worcester", "Springfield", "Lowell", "Newton"],
      },
      {
        name: "Pennsylvania",
        cities: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton"],
      },
      {
        name: "Ohio",
        cities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton"],
      },
      {
        name: "Colorado",
        cities: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Boulder"],
      },
      {
        name: "Arizona",
        cities: ["Phoenix", "Scottsdale", "Tucson", "Mesa", "Chandler", "Tempe"],
      },
      {
        name: "Nevada",
        cities: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks"],
      },
      {
        name: "New Jersey",
        cities: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Hoboken"],
      },
      {
        name: "Virginia",
        cities: ["Virginia Beach", "Norfolk", "Richmond", "Arlington", "Alexandria"],
      },
      {
        name: "Michigan",
        cities: ["Detroit", "Grand Rapids", "Warren", "Ann Arbor", "Lansing"],
      },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    phonePrefix: "+971",
    postalCodeLabel: "Makani / PO Box",
    states: [
      {
        name: "Dubai",
        cities: ["Downtown Dubai", "Dubai Marina", "Business Bay", "Deira", "JLT", "Al Barsha", "Palm Jumeirah", "Jumeirah", "DIFC", "Al Quoz", "Bur Dubai"],
      },
      {
        name: "Abu Dhabi",
        cities: ["Abu Dhabi City", "Al Reem Island", "Yas Island", "Al Ain", "Saadiyat Island", "Khalifa City", "Al Maryah Island"],
      },
      {
        name: "Sharjah",
        cities: ["Sharjah City", "Al Majaz", "Al Nahda", "Al Qasimia", "Al Taawun", "Khorfakkan"],
      },
      {
        name: "Ajman & Northern Emirates",
        cities: ["Ajman City", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    phonePrefix: "+44",
    postalCodeLabel: "Postcode",
    states: [
      {
        name: "Greater London",
        cities: ["Central London", "City of London", "Westminster", "Canary Wharf", "Shoreditch", "Camden", "Kensington", "Mayfair", "Croydon", "Greenwich"],
      },
      {
        name: "North West England",
        cities: ["Manchester", "Liverpool", "Salford", "Bolton", "Chester", "Preston"],
      },
      {
        name: "West Midlands",
        cities: ["Birmingham", "Coventry", "Wolverhampton", "Solihull", "Dudley"],
      },
      {
        name: "Yorkshire & The Humber",
        cities: ["Leeds", "Sheffield", "Bradford", "York", "Hull"],
      },
      {
        name: "Scotland",
        cities: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness"],
      },
      {
        name: "South East England",
        cities: ["Brighton", "Southampton", "Portsmouth", "Oxford", "Reading", "Milton Keynes"],
      },
      {
        name: "South West England",
        cities: ["Bristol", "Bath", "Plymouth", "Exeter", "Bournemouth"],
      },
      {
        name: "Wales & Northern Ireland",
        cities: ["Cardiff", "Swansea", "Newport", "Belfast", "Derry"],
      },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    phonePrefix: "+1",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Ontario",
        cities: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "Markham", "Vaughan", "Kitchener", "London"],
      },
      {
        name: "British Columbia",
        cities: ["Vancouver", "Surrey", "Burnaby", "Richmond", "Victoria", "Kelowna", "Coquitlam"],
      },
      {
        name: "Quebec",
        cities: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke"],
      },
      {
        name: "Alberta",
        cities: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert"],
      },
      {
        name: "Manitoba & Saskatchewan",
        cities: ["Winnipeg", "Brandon", "Saskatoon", "Regina"],
      },
      {
        name: "Nova Scotia & Atlantic",
        cities: ["Halifax", "St. John's", "Moncton", "Fredericton"],
      },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    phonePrefix: "+61",
    postalCodeLabel: "Postcode",
    states: [
      {
        name: "New South Wales",
        cities: ["Sydney", "Newcastle", "Central Coast", "Wollongong", "Parramatta", "North Sydney"],
      },
      {
        name: "Victoria",
        cities: ["Melbourne", "Geelong", "Ballarat", "Bendigo", "St Kilda", "Richmond"],
      },
      {
        name: "Queensland",
        cities: ["Brisbane", "Gold Coast", "Sunshine Coast", "Cairns", "Townsville"],
      },
      {
        name: "Western Australia",
        cities: ["Perth", "Fremantle", "Mandurah", "Bunbury"],
      },
      {
        name: "South Australia",
        cities: ["Adelaide", "Mount Gambier", "Whyalla", "Glenelg"],
      },
      {
        name: "Tasmania & ACT",
        cities: ["Canberra", "Hobart", "Launceston"],
      },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    phonePrefix: "+65",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Central Region",
        cities: ["Marina Bay", "Orchard Road", "Central Business District (CBD)", "Bugis", "Tanjong Pagar", "Raffles Place", "River Valley"],
      },
      {
        name: "East Region",
        cities: ["Tampines", "Bedok", "Changi", "Pasir Ris", "Paya Lebar"],
      },
      {
        name: "West Region",
        cities: ["Jurong East", "Clementi", "Boon Lay", "Bukit Batok", "Buona Vista"],
      },
      {
        name: "North & North-East",
        cities: ["Woodlands", "Yishun", "Ang Mo Kio", "Sengkang", "Punggol", "Serangoon"],
      },
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    phonePrefix: "+966",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Riyadh Province",
        cities: ["Riyadh", "Al Kharj", "Diriyah", "Al Majma'ah", "Ad Diriyah"],
      },
      {
        name: "Makkah Province",
        cities: ["Jeddah", "Mecca (Makkah)", "Taif", "Rabigh", "King Abdullah Economic City"],
      },
      {
        name: "Eastern Province",
        cities: ["Dammam", "Khobar", "Dhahran", "Jubail", "Al Ahsa", "Qatif"],
      },
      {
        name: "Madinah & Southern Provinces",
        cities: ["Medina (Madinah)", "Yanbu", "Abha", "Khamis Mushait", "Jizan", "Tabuk"],
      },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    phonePrefix: "+49",
    postalCodeLabel: "PLZ (Postleitzahl)",
    states: [
      {
        name: "Bavaria (Bayern)",
        cities: ["Munich (München)", "Nuremberg (Nürnberg)", "Augsburg", "Regensburg", "Ingolstadt"],
      },
      {
        name: "Berlin",
        cities: ["Berlin Mitte", "Charlottenburg", "Kreuzberg", "Pankow", "Friedrichshain"],
      },
      {
        name: "North Rhine-Westphalia (NRW)",
        cities: ["Cologne (Köln)", "Düsseldorf", "Dortmund", "Essen", "Bonn", "Münster"],
      },
      {
        name: "Hesse (Hessen)",
        cities: ["Frankfurt am Main", "Wiesbaden", "Kassel", "Darmstadt", "Offenbach"],
      },
      {
        name: "Baden-Württemberg",
        cities: ["Stuttgart", "Karlsruhe", "Mannheim", "Freiburg", "Heidelberg"],
      },
      {
        name: "Hamburg & Northern States",
        cities: ["Hamburg", "Bremen", "Hanover (Hannover)", "Kiel", "Rostock"],
      },
    ],
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    phonePrefix: "+33",
    postalCodeLabel: "Code Postal",
    states: [
      {
        name: "Île-de-France (Paris Region)",
        cities: ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Versailles", "Nanterre", "Créteil"],
      },
      {
        name: "Auvergne-Rhône-Alpes",
        cities: ["Lyon", "Grenoble", "Saint-Étienne", "Villeurbanne", "Annecy"],
      },
      {
        name: "Provence-Alpes-Côte d'Azur",
        cities: ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Cannes"],
      },
      {
        name: "Occitanie & Nouvelle-Aquitaine",
        cities: ["Toulouse", "Montpellier", "Bordeaux", "Limoges", "Perpignan"],
      },
      {
        name: "Hauts-de-France & Grand Est",
        cities: ["Lille", "Strasbourg", "Reims", "Metz", "Nancy"],
      },
    ],
  },
  {
    code: "QA",
    name: "Qatar",
    flag: "🇶🇦",
    phonePrefix: "+974",
    postalCodeLabel: "Zone Code",
    states: [
      {
        name: "Doha Municipality",
        cities: ["Doha", "West Bay", "The Pearl-Qatar", "Lusail", "Al Sadd", "Old Airport"],
      },
      {
        name: "Al Rayyan & Al Wakrah",
        cities: ["Al Rayyan", "Al Wakrah", "Al Khor", "Umm Salal", "Al Daayen"],
      },
    ],
  },
  {
    code: "KW",
    name: "Kuwait",
    flag: "🇰🇼",
    phonePrefix: "+965",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Capital Governorate",
        cities: ["Kuwait City", "Sharq", "Mirqab", "Salhiya", "Dasman", "Shuwaikh"],
      },
      {
        name: "Hawalli & Farwaniya",
        cities: ["Hawalli", "Salmiya", "Jabriya", "Farwaniya", "Khaitan"],
      },
      {
        name: "Ahmadi & Jahra",
        cities: ["Al Ahmadi", "Fahaheel", "Mangaf", "Al Jahra"],
      },
    ],
  },
  {
    code: "OM",
    name: "Oman",
    flag: "🇴🇲",
    phonePrefix: "+968",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Muscat Governorate",
        cities: ["Muscat", "Ruwi", "Muttrah", "Seeb", "Bawshar", "Al Khuwair"],
      },
      {
        name: "Dhofar & Batinah",
        cities: ["Salalah", "Sohar", "Nizwa", "Sur", "Rustaq", "Ibri"],
      },
    ],
  },
  {
    code: "BH",
    name: "Bahrain",
    flag: "🇧🇭",
    phonePrefix: "+973",
    postalCodeLabel: "Block / Area",
    states: [
      {
        name: "Capital Governorate",
        cities: ["Manama", "Seef", "Juffair", "Diplomatic Area", "Hoora"],
      },
      {
        name: "Muharraq & Northern",
        cities: ["Muharraq", "Riffa", "Hamad Town", "A'ali", "Isa Town"],
      },
    ],
  },
  {
    code: "MY",
    name: "Malaysia",
    flag: "🇲🇾",
    phonePrefix: "+60",
    postalCodeLabel: "Poskod",
    states: [
      {
        name: "Kuala Lumpur & Putrajaya",
        cities: ["Kuala Lumpur", "Bukit Bintang", "Bangsar", "Mont Kiara", "KLCC", "Cheras", "Putrajaya"],
      },
      {
        name: "Selangor",
        cities: ["Petaling Jaya", "Subang Jaya", "Shah Alam", "Klang", "Cyberjaya", "Puchong"],
      },
      {
        name: "Penang & Northern",
        cities: ["George Town", "Butterworth", "Bayan Lepas", "Ipoh", "Alor Setar"],
      },
      {
        name: "Johor & Southern",
        cities: ["Johor Bahru", "Iskandar Puteri", "Batu Pahat", "Muar", "Melaka"],
      },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    phonePrefix: "+27",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Gauteng",
        cities: ["Johannesburg", "Sandton", "Pretoria", "Midrand", "Centurion", "Soweto"],
      },
      {
        name: "Western Cape",
        cities: ["Cape Town", "Stellenbosch", "Somerset West", "George", "Paarl"],
      },
      {
        name: "KwaZulu-Natal",
        cities: ["Durban", "Umhlanga", "Pietermaritzburg", "Pinetown", "Ballito"],
      },
    ],
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    phonePrefix: "+81",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Kanto (Tokyo Area)",
        cities: ["Tokyo (Shinjuku)", "Shibuya", "Chiyoda", "Minato", "Yokohama", "Kawasaki", "Chiba", "Saitama"],
      },
      {
        name: "Kansai (Osaka Area)",
        cities: ["Osaka", "Kyoto", "Kobe", "Sakai", "Nara"],
      },
      {
        name: "Chubu & Kyushu",
        cities: ["Nagoya", "Fukuoka", "Sapporo", "Sendai", "Hiroshima"],
      },
    ],
  },
  {
    code: "KR",
    name: "South Korea",
    flag: "🇰🇷",
    phonePrefix: "+82",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Seoul Capital Area",
        cities: ["Seoul (Gangnam)", "Jongno", "Mapo", "Yeongdeungpo", "Incheon", "Suwon", "Seongnam (Bundang)", "Goyang"],
      },
      {
        name: "Yeongnam & Honam",
        cities: ["Busan", "Daegu", "Daejeon", "Gwangju", "Ulsan", "Changwon"],
      },
    ],
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    phonePrefix: "+31",
    postalCodeLabel: "Postcode",
    states: [
      {
        name: "North Holland & South Holland",
        cities: ["Amsterdam", "Rotterdam", "The Hague (Den Haag)", "Utrecht", "Haarlem", "Leiden"],
      },
      {
        name: "North Brabant & Other Provinces",
        cities: ["Eindhoven", "Tilburg", "Groningen", "Breda", "Nijmegen", "Arnhem"],
      },
    ],
  },
  {
    code: "IE",
    name: "Ireland",
    flag: "🇮🇪",
    phonePrefix: "+353",
    postalCodeLabel: "Eircode",
    states: [
      {
        name: "Leinster (Dublin Region)",
        cities: ["Dublin", "Dun Laoghaire", "Swords", "Tallaght", "Bray", "Drogheda"],
      },
      {
        name: "Munster, Connacht & Ulster",
        cities: ["Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Sligo"],
      },
    ],
  },
  {
    code: "NZ",
    name: "New Zealand",
    flag: "🇳🇿",
    phonePrefix: "+64",
    postalCodeLabel: "Postcode",
    states: [
      {
        name: "North Island",
        cities: ["Auckland", "Wellington", "Hamilton", "Tauranga", "Napier-Hastings"],
      },
      {
        name: "South Island",
        cities: ["Christchurch", "Dunedin", "Queenstown", "Nelson", "Invercargill"],
      },
    ],
  },
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
    phonePrefix: "+39",
    postalCodeLabel: "CAP",
    states: [
      {
        name: "Lombardy & Northern Italy",
        cities: ["Milan (Milano)", "Turin (Torino)", "Genoa (Genova)", "Brescia", "Monza", "Bergamo"],
      },
      {
        name: "Lazio & Central Italy",
        cities: ["Rome (Roma)", "Florence (Firenze)", "Bologna", "Venice (Venezia)", "Verona"],
      },
      {
        name: "Southern Italy & Islands",
        cities: ["Naples (Napoli)", "Palermo", "Bari", "Catania", "Cagliari"],
      },
    ],
  },
  {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
    phonePrefix: "+34",
    postalCodeLabel: "Código Postal",
    states: [
      {
        name: "Community of Madrid",
        cities: ["Madrid", "Móstoles", "Alcalá de Henares", "Fuenlabrada", "Leganés"],
      },
      {
        name: "Catalonia",
        cities: ["Barcelona", "L'Hospitalet de Llobregat", "Badalona", "Terrassa", "Sabadell"],
      },
      {
        name: "Andalusia & Valencia",
        cities: ["Seville (Sevilla)", "Málaga", "Valencia", "Alicante", "Zaragoza", "Bilbao"],
      },
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
    phonePrefix: "+55",
    postalCodeLabel: "CEP",
    states: [
      {
        name: "São Paulo",
        cities: ["São Paulo", "Campinas", "Guarulhos", "São Bernardo do Campo", "Santo André", "Santos"],
      },
      {
        name: "Rio de Janeiro & Minas Gerais",
        cities: ["Rio de Janeiro", "Belo Horizonte", "Niterói", "Uberlândia", "Contagem"],
      },
      {
        name: "South & Northeast",
        cities: ["Curitiba", "Porto Alegre", "Salvador", "Fortaleza", "Recife", "Brasília"],
      },
    ],
  },
  {
    code: "MX",
    name: "Mexico",
    flag: "🇲🇽",
    phonePrefix: "+52",
    postalCodeLabel: "Código Postal",
    states: [
      {
        name: "Mexico City & State of Mexico",
        cities: ["Mexico City (CDMX)", "Ecatepec", "Naucalpan", "Toluca", "Tlalnepantla"],
      },
      {
        name: "Jalisco & Nuevo León",
        cities: ["Guadalajara", "Monterrey", "Zapopan", "San Pedro Garza García", "Puebla", "Querétaro"],
      },
      {
        name: "Border & Tourism States",
        cities: ["Tijuana", "Cancún", "Mérida", "León", "Ciudad Juárez"],
      },
    ],
  },
  {
    code: "CH",
    name: "Switzerland",
    flag: "🇨🇭",
    phonePrefix: "+41",
    postalCodeLabel: "PLZ / NPA",
    states: [
      {
        name: "German Cantons",
        cities: ["Zurich", "Basel", "Bern", "Lucerne", "Winterthur", "St. Gallen"],
      },
      {
        name: "French & Italian Cantons",
        cities: ["Geneva", "Lausanne", "Lugano", "Biel/Bienne", "Fribourg"],
      },
    ],
  },
  {
    code: "SE",
    name: "Sweden",
    flag: "🇸🇪",
    phonePrefix: "+46",
    postalCodeLabel: "Postnummer",
    states: [
      {
        name: "Stockholm & Svealand",
        cities: ["Stockholm", "Uppsala", "Västerås", "Örebro", "Linköping"],
      },
      {
        name: "Götaland (West & South)",
        cities: ["Gothenburg (Göteborg)", "Malmö", "Helsingborg", "Jönköping", "Norrköping"],
      },
    ],
  },
  {
    code: "TH",
    name: "Thailand",
    flag: "🇹🇭",
    phonePrefix: "+66",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Bangkok Metropolitan",
        cities: ["Bangkok", "Nonthaburi", "Pak Kret", "Samut Prakan", "Pathum Thani"],
      },
      {
        name: "Central & Tourism Provinces",
        cities: ["Chiang Mai", "Phuket", "Pattaya (Chonburi)", "Hua Hin", "Hat Yai"],
      },
    ],
  },
  {
    code: "ID",
    name: "Indonesia",
    flag: "🇮🇩",
    phonePrefix: "+62",
    postalCodeLabel: "Kode Pos",
    states: [
      {
        name: "DKI Jakarta & Java",
        cities: ["Jakarta", "Surabaya", "Bandung", "Bekasi", "Tangerang", "Depok", "Semarang"],
      },
      {
        name: "Bali, Sumatra & Other Islands",
        cities: ["Denpasar (Bali)", "Medan", "Palembang", "Makassar", "Batam"],
      },
    ],
  },
  {
    code: "PH",
    name: "Philippines",
    flag: "🇵🇭",
    phonePrefix: "+63",
    postalCodeLabel: "ZIP Code",
    states: [
      {
        name: "Metro Manila (NCR)",
        cities: ["Manila", "Quezon City", "Makati", "Taguig (BGC)", "Pasig", "Mandaluyong"],
      },
      {
        name: "Luzon, Visayas & Mindanao",
        cities: ["Cebu City", "Davao City", "Baguio", "Angeles City", "Cagayan de Oro"],
      },
    ],
  },
  {
    code: "VN",
    name: "Vietnam",
    flag: "🇻🇳",
    phonePrefix: "+84",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Major Municipalities",
        cities: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong", "Can Tho", "Nha Trang"],
      },
    ],
  },
  {
    code: "EG",
    name: "Egypt",
    flag: "🇪🇬",
    phonePrefix: "+20",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Greater Cairo & Alexandria",
        cities: ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "New Cairo", "6th of October City"],
      },
    ],
  },
  {
    code: "TR",
    name: "Turkey",
    flag: "🇹🇷",
    phonePrefix: "+90",
    postalCodeLabel: "Posta Kodu",
    states: [
      {
        name: "Marmara & Central",
        cities: ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Gaziantep"],
      },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    phonePrefix: "+234",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Lagos & Federal Territory",
        cities: ["Lagos (Ikeja)", "Victoria Island", "Lekki", "Abuja (FCT)", "Port Harcourt", "Ibadan", "Kano"],
      },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    flag: "🇰🇪",
    phonePrefix: "+254",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Major Counties",
        cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika"],
      },
    ],
  },
  {
    code: "IL",
    name: "Israel",
    flag: "🇮🇱",
    phonePrefix: "+972",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Central & Northern Districts",
        cities: ["Tel Aviv-Yafo", "Jerusalem", "Haifa", "Rishon LeZion", "Petah Tikva", "Netanya", "Herzliya"],
      },
    ],
  },
  {
    code: "HK",
    name: "Hong Kong",
    flag: "🇭🇰",
    phonePrefix: "+852",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Hong Kong SAR",
        cities: ["Central", "Wan Chai", "Causeway Bay", "Tsim Sha Tsui", "Mong Kok", "Sha Tin", "Kwun Tong"],
      },
    ],
  },
  {
    code: "TW",
    name: "Taiwan",
    flag: "🇹🇼",
    phonePrefix: "+886",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Metropolitan Municipalities",
        cities: ["Taipei City", "New Taipei City", "Taichung", "Kaohsiung", "Taoyuan", "Tainan", "Hsinchu"],
      },
    ],
  },
  {
    code: "AR",
    name: "Argentina",
    flag: "🇦🇷",
    phonePrefix: "+54",
    postalCodeLabel: "Código Postal",
    states: [
      {
        name: "Buenos Aires & Provinces",
        cities: ["Buenos Aires (CABA)", "Córdoba", "Rosario", "Mendoza", "La Plata", "Mar del Plata"],
      },
    ],
  },
  {
    code: "CO",
    name: "Colombia",
    flag: "🇨🇴",
    phonePrefix: "+57",
    postalCodeLabel: "Código Postal",
    states: [
      {
        name: "Departments",
        cities: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga"],
      },
    ],
  },
  {
    code: "CL",
    name: "Chile",
    flag: "🇨🇱",
    phonePrefix: "+56",
    postalCodeLabel: "Código Postal",
    states: [
      {
        name: "Regions",
        cities: ["Santiago", "Valparaíso", "Concepción", "Viña del Mar", "Antofagasta", "Temuco"],
      },
    ],
  },
  {
    code: "PL",
    name: "Poland",
    flag: "🇵🇱",
    phonePrefix: "+48",
    postalCodeLabel: "Kod Pocztowy",
    states: [
      {
        name: "Voivodeships",
        cities: ["Warsaw (Warszawa)", "Kraków", "Wrocław", "Łódź", "Poznań", "Gdańsk"],
      },
    ],
  },
  {
    code: "AT",
    name: "Austria",
    flag: "🇦🇹",
    phonePrefix: "+43",
    postalCodeLabel: "PLZ",
    states: [
      {
        name: "States",
        cities: ["Vienna (Wien)", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt"],
      },
    ],
  },
  {
    code: "BE",
    name: "Belgium",
    flag: "🇧🇪",
    phonePrefix: "+32",
    postalCodeLabel: "Code Postal / Postcode",
    states: [
      {
        name: "Regions",
        cities: ["Brussels", "Antwerp (Antwerpen)", "Ghent (Gent)", "Charleroi", "Liège", "Bruges (Brugge)"],
      },
    ],
  },
  {
    code: "NO",
    name: "Norway",
    flag: "🇳🇴",
    phonePrefix: "+47",
    postalCodeLabel: "Postnummer",
    states: [
      {
        name: "Counties",
        cities: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Bærum", "Kristiansand"],
      },
    ],
  },
  {
    code: "DK",
    name: "Denmark",
    flag: "🇩🇰",
    phonePrefix: "+45",
    postalCodeLabel: "Postnummer",
    states: [
      {
        name: "Regions",
        cities: ["Copenhagen (København)", "Aarhus", "Odense", "Aalborg", "Esbjerg"],
      },
    ],
  },
  {
    code: "FI",
    name: "Finland",
    flag: "🇫🇮",
    phonePrefix: "+358",
    postalCodeLabel: "Postinumero",
    states: [
      {
        name: "Regions",
        cities: ["Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku"],
      },
    ],
  },
  {
    code: "PT",
    name: "Portugal",
    flag: "🇵🇹",
    phonePrefix: "+351",
    postalCodeLabel: "Código Postal",
    states: [
      {
        name: "Districts",
        cities: ["Lisbon (Lisboa)", "Porto", "Vila Nova de Gaia", "Amadora", "Braga", "Funchal", "Coimbra"],
      },
    ],
  },
  {
    code: "GR",
    name: "Greece",
    flag: "🇬🇷",
    phonePrefix: "+30",
    postalCodeLabel: "TK (Taxydromikos Kodikas)",
    states: [
      {
        name: "Regions",
        cities: ["Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa", "Volos"],
      },
    ],
  },
  {
    code: "BD",
    name: "Bangladesh",
    flag: "🇧🇩",
    phonePrefix: "+880",
    postalCodeLabel: "Postcode",
    states: [
      {
        name: "Divisions",
        cities: ["Dhaka", "Chittagong (Chattogram)", "Khulna", "Rajshahi", "Sylhet", "Barisal"],
      },
    ],
  },
  {
    code: "LK",
    name: "Sri Lanka",
    flag: "🇱🇰",
    phonePrefix: "+94",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Provinces",
        cities: ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo", "Batticaloa"],
      },
    ],
  },
  {
    code: "NP",
    name: "Nepal",
    flag: "🇳🇵",
    phonePrefix: "+977",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Provinces",
        cities: ["Kathmandu", "Pokhara", "Lalitpur", "Bharatpur", "Biratnagar", "Birgunj"],
      },
    ],
  },
  {
    code: "AF", name: "Afghanistan", flag: "🇦🇫", phonePrefix: "+93", postalCodeLabel: "Postal Code",
    states: [{ name: "All Provinces", cities: ["Kabul", "Herat", "Mazar-i-Sharif", "Kandahar"] }]
  },
  {
    code: "AL", name: "Albania", flag: "🇦🇱", phonePrefix: "+355", postalCodeLabel: "Postal Code",
    states: [{ name: "All Counties", cities: ["Tirana", "Durrës", "Vlorë", "Shkodër"] }]
  },
  {
    code: "DZ", name: "Algeria", flag: "🇩🇿", phonePrefix: "+213", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Algiers", "Oran", "Constantine", "Annaba"] }]
  },
  {
    code: "AD", name: "Andorra", flag: "🇦🇩", phonePrefix: "+376", postalCodeLabel: "Postal Code",
    states: [{ name: "Parishes", cities: ["Andorra la Vella", "Escaldes-Engordany", "Encamp"] }]
  },
  {
    code: "AO", name: "Angola", flag: "🇦🇴", phonePrefix: "+244", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Luanda", "Huambo", "Lobito", "Benguela"] }]
  },
  {
    code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬", phonePrefix: "+1-268", postalCodeLabel: "Postal Code",
    states: [{ name: "Parishes", cities: ["St. John's", "All Saints", "Liberta"] }]
  },
  {
    code: "AM", name: "Armenia", flag: "🇦🇲", phonePrefix: "+374", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Yerevan", "Gyumri", "Vanadzor"] }]
  },
  {
    code: "AZ", name: "Azerbaijan", flag: "🇦🇿", phonePrefix: "+994", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Baku", "Ganja", "Sumqayit"] }]
  },
  {
    code: "BS", name: "Bahamas", flag: "🇧🇸", phonePrefix: "+1-242", postalCodeLabel: "Postal Code",
    states: [{ name: "Districts", cities: ["Nassau", "Freeport", "West End"] }]
  },
  {
    code: "BB", name: "Barbados", flag: "🇧🇧", phonePrefix: "+1-246", postalCodeLabel: "Postal Code",
    states: [{ name: "Parishes", cities: ["Bridgetown", "Speightstown", "Oistins"] }]
  },
  {
    code: "BY", name: "Belarus", flag: "🇧🇾", phonePrefix: "+375", postalCodeLabel: "Postal Code",
    states: [{ name: "Vblasts", cities: ["Minsk", "Gomel", "Mogilev", "Vitebsk"] }]
  },
  {
    code: "BZ", name: "Belize", flag: "🇧🇿", phonePrefix: "+501", postalCodeLabel: "Postal Code",
    states: [{ name: "Districts", cities: ["Belize City", "San Ignacio", "Belmopan"] }]
  },
  {
    code: "BJ", name: "Benin", flag: "🇧🇯", phonePrefix: "+229", postalCodeLabel: "Postal Code",
    states: [{ name: "Departments", cities: ["Cotonou", "Porto-Novo", "Parakou"] }]
  },
  {
    code: "BT", name: "Bhutan", flag: "🇧🇹", phonePrefix: "+975", postalCodeLabel: "Postal Code",
    states: [{ name: "Dzongkhags", cities: ["Thimphu", "Phuntsholing", "Paro"] }]
  },
  {
    code: "BO", name: "Bolivia", flag: "🇧🇴", phonePrefix: "+591", postalCodeLabel: "Postal Code",
    states: [{ name: "Departments", cities: ["La Paz", "Santa Cruz de la Sierra", "Cochabamba"] }]
  },
  {
    code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦", phonePrefix: "+387", postalCodeLabel: "Postal Code",
    states: [{ name: "Entities", cities: ["Sarajevo", "Banja Luka", "Tuzla", "Mostar"] }]
  },
  {
    code: "BW", name: "Botswana", flag: "🇧🇼", phonePrefix: "+267", postalCodeLabel: "Postal Code",
    states: [{ name: "Districts", cities: ["Gaborone", "Francistown", "Molepolole"] }]
  },
  {
    code: "BN", name: "Brunei", flag: "🇧🇳", phonePrefix: "+673", postalCodeLabel: "Postal Code",
    states: [{ name: "Districts", cities: ["Bandar Seri Begawan", "Kuala Belait", "Seria"] }]
  },
  {
    code: "BG", name: "Bulgaria", flag: "🇧🇬", phonePrefix: "+359", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Sofia", "Plovdiv", "Varna", "Burgas"] }]
  },
  {
    code: "BF", name: "Burkina Faso", flag: "🇧🇫", phonePrefix: "+226", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou"] }]
  },
  {
    code: "BI", name: "Burundi", flag: "🇧🇮", phonePrefix: "+257", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Bujumbura", "Gitega", "Ngozi"] }]
  },
  {
    code: "KH", name: "Cambodia", flag: "🇰🇭", phonePrefix: "+855", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville"] }]
  },
  {
    code: "CM", name: "Cameroon", flag: "🇨🇲", phonePrefix: "+237", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Douala", "Yaoundé", "Bamenda", "Bafoussam"] }]
  },
  {
    code: "CR", name: "Costa Rica", flag: "🇨🇷", phonePrefix: "+506", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["San José", "Alajuela", "Heredia", "Cartago"] }]
  },
  {
    code: "HR", name: "Croatia", flag: "🇭🇷", phonePrefix: "+385", postalCodeLabel: "Postal Code",
    states: [{ name: "Counties", cities: ["Zagreb", "Split", "Rijeka", "Osijek", "Zadar"] }]
  },
  {
    code: "CY", name: "Cyprus", flag: "🇨🇾", phonePrefix: "+357", postalCodeLabel: "Postal Code",
    states: [{ name: "Districts", cities: ["Nicosia", "Limassol", "Larnaca", "Paphos"] }]
  },
  {
    code: "CZ", name: "Czech Republic", flag: "🇨🇿", phonePrefix: "+420", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Prague (Praha)", "Brno", "Ostrava", "Plzeň", "Liberec"] }]
  },
  {
    code: "DO", name: "Dominican Republic", flag: "🇩🇴", phonePrefix: "+1-809", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Santo Domingo", "Santiago de los Caballeros", "Punta Cana"] }]
  },
  {
    code: "EC", name: "Ecuador", flag: "🇪🇨", phonePrefix: "+593", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Quito", "Guayaquil", "Cuenca", "Santo Domingo"] }]
  },
  {
    code: "EE", name: "Estonia", flag: "🇪🇪", phonePrefix: "+372", postalCodeLabel: "Postal Code",
    states: [{ name: "Counties", cities: ["Tallinn", "Tartu", "Narva", "Pärnu"] }]
  },
  {
    code: "ET", name: "Ethiopia", flag: "🇪🇹", phonePrefix: "+251", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Addis Ababa", "Dire Dawa", "Mekelle", "Gondar"] }]
  },
  {
    code: "GE", name: "Georgia", flag: "🇬🇪", phonePrefix: "+995", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Tbilisi", "Batumi", "Kutaisi", "Rustavi"] }]
  },
  {
    code: "GH", name: "Ghana", flag: "🇬🇭", phonePrefix: "+233", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Accra", "Kumasi", "Tamale", "Takoradi"] }]
  },
  {
    code: "GT", name: "Guatemala", flag: "🇬🇹", phonePrefix: "+502", postalCodeLabel: "Postal Code",
    states: [{ name: "Departments", cities: ["Guatemala City", "Mixco", "Villa Nueva", "Quetzaltenango"] }]
  },
  {
    code: "HU", name: "Hungary", flag: "🇭🇺", phonePrefix: "+36", postalCodeLabel: "Postal Code",
    states: [{ name: "Counties", cities: ["Budapest", "Debrecen", "Szeged", "Miskolc", "Pécs"] }]
  },
  {
    code: "IS", name: "Iceland", flag: "🇮🇸", phonePrefix: "+354", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Reykjavík", "Kópavogur", "Hafnarfjörður", "Akureyri"] }]
  },
  {
    code: "IQ", name: "Iraq", flag: "🇮🇶", phonePrefix: "+964", postalCodeLabel: "Postal Code",
    states: [{ name: "Governorates", cities: ["Baghdad", "Basra", "Erbil", "Mosul", "Sulaymaniyah"] }]
  },
  {
    code: "JO", name: "Jordan", flag: "🇯🇴", phonePrefix: "+962", postalCodeLabel: "Postal Code",
    states: [{ name: "Governorates", cities: ["Amman", "Zarqa", "Irbid", "Aqaba"] }]
  },
  {
    code: "KZ", name: "Kazakhstan", flag: "🇰🇿", phonePrefix: "+7", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Almaty", "Astana", "Shymkent", "Karaganda", "Aktobe"] }]
  },
  {
    code: "LV", name: "Latvia", flag: "🇱🇻", phonePrefix: "+371", postalCodeLabel: "Postal Code",
    states: [{ name: "Municipalities", cities: ["Riga", "Daugavpils", "Liepāja", "Jelgava"] }]
  },
  {
    code: "LB", name: "Lebanon", flag: "🇱🇧", phonePrefix: "+961", postalCodeLabel: "Postal Code",
    states: [{ name: "Governorates", cities: ["Beirut", "Tripoli", "Sidon", "Jounieh", "Zahle"] }]
  },
  {
    code: "LT", name: "Lithuania", flag: "🇱🇹", phonePrefix: "+370", postalCodeLabel: "Postal Code",
    states: [{ name: "Counties", cities: ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai"] }]
  },
  {
    code: "LU", name: "Luxembourg", flag: "🇱🇺", phonePrefix: "+352", postalCodeLabel: "Postal Code",
    states: [{ name: "Cantons", cities: ["Luxembourg City", "Esch-sur-Alzette", "Differdange"] }]
  },
  {
    code: "MT", name: "Malta", flag: "🇲🇹", phonePrefix: "+356", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Valletta", "Birkirkara", "Mosta", "Sliema", "St. Julian's"] }]
  },
  {
    code: "MU", name: "Mauritius", flag: "🇲🇺", phonePrefix: "+230", postalCodeLabel: "Postal Code",
    states: [{ name: "Districts", cities: ["Port Louis", "Beau Bassin-Rose Hill", "Vacoas", "Curepipe"] }]
  },
  {
    code: "MC", name: "Monaco", flag: "🇲🇨", phonePrefix: "+377", postalCodeLabel: "Postal Code",
    states: [{ name: "Wards", cities: ["Monte Carlo", "La Condamine", "Fontvieille", "Monaco-Ville"] }]
  },
  {
    code: "MA", name: "Morocco", flag: "🇲🇦", phonePrefix: "+212", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Casablanca", "Rabat", "Marrakesh", "Fes", "Tangier", "Agadir"] }]
  },
  {
    code: "PA", name: "Panama", flag: "🇵🇦", phonePrefix: "+507", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Panama City", "San Miguelito", "Tocumen", "David", "Colón"] }]
  },
  {
    code: "PE", name: "Peru", flag: "🇵🇪", phonePrefix: "+51", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Cusco", "Piura"] }]
  },
  {
    code: "RO", name: "Romania", flag: "🇷🇴", phonePrefix: "+40", postalCodeLabel: "Postal Code",
    states: [{ name: "Counties", cities: ["Bucharest (București)", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", "Brașov"] }]
  },
  {
    code: "RS", name: "Serbia", flag: "🇷🇸", phonePrefix: "+381", postalCodeLabel: "Postal Code",
    states: [{ name: "Districts", cities: ["Belgrade (Beograd)", "Novi Sad", "Niš", "Kragujevac", "Subotica"] }]
  },
  {
    code: "SK", name: "Slovakia", flag: "🇸🇰", phonePrefix: "+421", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Bratislava", "Košice", "Prešov", "Žilina", "Banská Bystrica"] }]
  },
  {
    code: "SI", name: "Slovenia", flag: "🇸🇮", phonePrefix: "+386", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Ljubljana", "Maribor", "Kranj", "Celje", "Koper"] }]
  },
  {
    code: "TN", name: "Tunisia", flag: "🇹🇳", phonePrefix: "+216", postalCodeLabel: "Postal Code",
    states: [{ name: "Governorates", cities: ["Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte"] }]
  },
  {
    code: "UA", name: "Ukraine", flag: "🇺🇦", phonePrefix: "+380", postalCodeLabel: "Postal Code",
    states: [{ name: "Oblasts", cities: ["Kyiv", "Kharkiv", "Odesa", "Dnipro", "Lviv", "Zaporizhzhia"] }]
  },
  {
    code: "UY", name: "Uruguay", flag: "🇺🇾", phonePrefix: "+598", postalCodeLabel: "Postal Code",
    states: [{ name: "Departments", cities: ["Montevideo", "Salto", "Ciudad de la Costa", "Paysandú", "Punta del Este"] }]
  },
  {
    code: "UZ", name: "Uzbekistan", flag: "🇺🇿", phonePrefix: "+998", postalCodeLabel: "Postal Code",
    states: [{ name: "Regions", cities: ["Tashkent", "Samarkand", "Namangan", "Andijan", "Bukhara"] }]
  },
  {
    code: "VE", name: "Venezuela", flag: "🇻🇪", phonePrefix: "+58", postalCodeLabel: "Postal Code",
    states: [{ name: "States", cities: ["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay"] }]
  },
  {
    code: "ZW", name: "Zimbabwe", flag: "🇿🇼", phonePrefix: "+263", postalCodeLabel: "Postal Code",
    states: [{ name: "Provinces", cities: ["Harare", "Bulawayo", "Chitungwiza", "Mutare"] }]
  },
];

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: "healthcare",
    name: "Healthcare & Medical",
    icon: "Stethoscope",
    subcategories: [
      "Hospitals",
      "Medical Clinics",
      "Dental Clinics",
      "Pharmacies",
      "Diagnostic Centers",
      "Physical Therapy",
      "Eye Clinics & Optometrists",
      "Ayurvedic & Homeopathy Centers",
    ],
  },
  {
    id: "food_hospitality",
    name: "Food, Dining & Hospitality",
    icon: "Utensils",
    subcategories: [
      "Restaurants & Fine Dining",
      "Cafes & Coffee Shops",
      "Hotels & Boutique Resorts",
      "Bakeries & Patisseries",
      "Bars & Lounges",
      "Catering Services",
      "Cloud Kitchens & Food Hubs",
    ],
  },
  {
    id: "real_estate",
    name: "Real Estate & Construction",
    icon: "Building",
    subcategories: [
      "Real Estate Developers",
      "Builders & Contractors",
      "Architects",
      "Interior Designers",
      "Real Estate Brokerages",
      "Property Management Firms",
      "Commercial Real Estate",
    ],
  },
  {
    id: "technology",
    name: "Technology & IT",
    icon: "Laptop",
    subcategories: [
      "IT & Software Companies",
      "SaaS Startups",
      "Tech Consulting",
      "Web Design & Development",
      "Cybersecurity Firms",
      "Cloud Solutions",
      "AI & Automation Services",
      "Digital Marketing Agencies",
    ],
  },
  {
    id: "retail_ecommerce",
    name: "Retail & E-Commerce",
    icon: "ShoppingBag",
    subcategories: [
      "Retail Stores & Boutiques",
      "E-commerce Brands",
      "Supermarkets & Grocery",
      "Fashion & Apparel",
      "Electronics & Appliances",
      "Jewelry & Watches",
      "Wholesalers & Distributors",
    ],
  },
  {
    id: "professional_services",
    name: "Professional & Legal Services",
    icon: "Briefcase",
    subcategories: [
      "Law Firms & Advocates",
      "Chartered Accountants (CA/CS)",
      "Management Consulting",
      "Public Relations (PR) Agencies",
      "Financial & Investment Advisors",
      "Tax & GST Consultants",
    ],
  },
  {
    id: "fitness_beauty",
    name: "Fitness, Beauty & Wellness",
    icon: "Sparkles",
    subcategories: [
      "Gyms & Fitness Centers",
      "Yoga & Pilates Studios",
      "Luxury Salons & Hairdressers",
      "Spas & Wellness Resorts",
      "Aesthetic & Dermatology Clinics",
    ],
  },
  {
    id: "education",
    name: "Education & Academics",
    icon: "GraduationCap",
    subcategories: [
      "Universities & Colleges",
      "Private International Schools",
      "IIT-JEE & NEET Coaching Centers",
      "EdTech Academies",
      "Vocational & Skill Institutes",
    ],
  },
  {
    id: "logistics_automotive",
    name: "Logistics, Transport & Auto",
    icon: "Truck",
    subcategories: [
      "Manufacturing Units",
      "Logistics & Freight Forwarders",
      "Transport Fleet Companies",
      "Automobile Dealerships",
      "Auto Repair & Service Centers",
    ],
  },
];

export const DIRECTORY_SOURCES = [
  { id: "gmaps", name: "Google Maps & Places", icon: "MapPin", color: "#4285F4" },
  { id: "justdial", name: "JustDial India", icon: "PhoneCall", color: "#FF6600" },
  { id: "indiamart", name: "IndiaMART B2B", icon: "Building2", color: "#00AEEF" },
  { id: "tradeindia", name: "TradeIndia", icon: "Briefcase", color: "#2E7D32" },
  { id: "linkedin", name: "LinkedIn Company Search", icon: "Users", color: "#0A66C2" },
  { id: "yellowpages", name: "YellowPages Directory", icon: "BookOpen", color: "#F59E0B" },
];

export const SAMPLE_HISTORIC_CAMPAIGNS: DataPalSearchCampaign[] = [
  {
    id: "camp_mumbai_dental_2026",
    title: "Mumbai Dental Clinics Missing Websites",
    requirement: "Missing Website",
    location: "Mumbai, Maharashtra, India",
    countryCode: "IN",
    businessTypes: ["Dental Clinics", "Aesthetic & Dermatology Clinics"],
    totalExtracted: 28,
    phoneCount: 28,
    emailCount: 22,
    websiteCount: 0,
    opportunityCount: 28,
    createdAt: "2026-09-24T14:30:00Z",
    status: "completed",
    results: [
      {
        id: "lead_mb_1",
        name: "Dr. Kothari's Advanced Dental Care",
        category: "Dental Clinics",
        website: null,
        phone: "+91 98201 44321",
        email: "dr.kothari.dentist@gmail.com",
        address: "Shop 4, Silver Arch, Linking Road, Bandra West",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        postalCode: "400050",
        rating: 4.8,
        reviewsCount: 164,
        existingPresence: "Google Maps, JustDial",
        source: "Google Maps & Places",
        notes: "🔥 Urgent Opportunity: 160+ 5-star reviews on Maps but NO website. Needs patient booking portal & smile makeover gallery.",
        verified: true,
        opportunityLevel: "Critical",
        tags: ["No Website", "High Rating", "Bandra VIP Area"],
        extractedAt: "2026-09-24T14:30:10Z",
      },
      {
        id: "lead_mb_2",
        name: "SmileCraft Orthodontic Center",
        category: "Dental Clinics",
        website: null,
        phone: "+91 98192 88710",
        email: "smilecraft.ortho.mumbai@gmail.com",
        address: "2nd Floor, Crystal Plaza, New Link Road, Andheri West",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        postalCode: "400053",
        rating: 4.7,
        reviewsCount: 98,
        existingPresence: "Instagram, JustDial",
        source: "JustDial India",
        notes: "Only operates Instagram page with linktree to WhatsApp. High willingness to pay for dedicated brand website & SEO.",
        verified: true,
        opportunityLevel: "Critical",
        tags: ["No Website", "Instagram Only"],
        extractedAt: "2026-09-24T14:30:12Z",
      },
      {
        id: "lead_mb_3",
        name: "Apex Aesthetic & Dental Studio",
        category: "Aesthetic & Dermatology Clinics",
        website: null,
        phone: "+91 99304 11209",
        email: "contact.apexaesthetics@gmail.com",
        address: "Suite 102, Nariman Bhavan, Nariman Point",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        postalCode: "400021",
        rating: 4.9,
        reviewsCount: 210,
        existingPresence: "Google Maps, Practo",
        source: "Google Maps & Places",
        notes: "South Mumbai premium aesthetic practice. Relies on Practo commission fees. Pitch custom consultation scheduling SaaS.",
        verified: true,
        opportunityLevel: "High",
        tags: ["South Mumbai", "No Website", "Practo Dependent"],
        extractedAt: "2026-09-24T14:30:14Z",
      },
      {
        id: "lead_mb_4",
        name: "GlowAura Skin & Hair Clinic",
        category: "Aesthetic & Dermatology Clinics",
        website: null,
        phone: "+91 97690 33418",
        email: null,
        address: "Opp. R-City Mall, LBS Marg, Ghatkopar West",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        postalCode: "400086",
        rating: 4.6,
        reviewsCount: 75,
        existingPresence: "JustDial, Google Maps",
        source: "JustDial India",
        notes: "WhatsApp number verified. Needs professional email setup, logo redesign, and lead capture landing page.",
        verified: true,
        opportunityLevel: "High",
        tags: ["WhatsApp Verified", "No Website"],
        extractedAt: "2026-09-24T14:30:15Z",
      },
      {
        id: "lead_mb_5",
        name: "Metro Dental & Implant Clinic",
        category: "Dental Clinics",
        website: null,
        phone: "+91 98213 55678",
        email: "metrodentalclinic@rediffmail.com",
        address: "Near Dadar TT Circle, Dr. Babasaheb Ambedkar Road, Dadar East",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        postalCode: "400014",
        rating: 4.5,
        reviewsCount: 112,
        existingPresence: "Google Maps, YellowPages",
        source: "Google Maps & Places",
        notes: "Established 15-year clinic using obsolete Rediffmail address. Massive upgrade candidate for Google Workspace + Modern Web.",
        verified: true,
        opportunityLevel: "High",
        tags: ["Established 15+ Yrs", "Legacy Mail"],
        extractedAt: "2026-09-24T14:30:17Z",
      },
    ],
  },
  {
    id: "camp_bangalore_saas_2026",
    title: "Bangalore Tech Startups & Software Providers",
    requirement: "All Verified Businesses",
    location: "Bangalore (Bengaluru), Karnataka, India",
    countryCode: "IN",
    businessTypes: ["IT & Software Companies", "AI & Automation Services"],
    totalExtracted: 35,
    phoneCount: 35,
    emailCount: 35,
    websiteCount: 35,
    opportunityCount: 24,
    createdAt: "2026-09-23T11:15:00Z",
    status: "completed",
    results: [
      {
        id: "lead_blr_1",
        name: "CognitiveFlow AI Systems",
        category: "AI & Automation Services",
        website: "https://cognitiveflow.ai",
        phone: "+91 80 4123 9900",
        email: "partnerships@cognitiveflow.ai",
        address: "4th Floor, Salarpuria Hall, 100 Feet Road, Indiranagar",
        city: "Bangalore (Bengaluru)",
        state: "Karnataka",
        country: "India",
        postalCode: "560038",
        rating: 4.9,
        reviewsCount: 42,
        existingPresence: "LinkedIn, GitHub, Crunchbase",
        source: "LinkedIn Company Search",
        notes: "High growth 28-person team. Seeking enterprise channel partnerships and distribution playbooks in GCC & US.",
        verified: true,
        opportunityLevel: "High",
        tags: ["Series A Candidate", "AI Tech"],
        extractedAt: "2026-09-23T11:15:05Z",
      },
      {
        id: "lead_blr_2",
        name: "ScaleMatrix Cloud Technologies",
        category: "IT & Software Companies",
        website: "https://scalematrix.in",
        phone: "+91 80 6789 2210",
        email: "growth@scalematrix.in",
        address: "EcoWorld Technology Campus, Outer Ring Road, Bellandur",
        city: "Bangalore (Bengaluru)",
        state: "Karnataka",
        country: "India",
        postalCode: "560103",
        rating: 4.7,
        reviewsCount: 56,
        existingPresence: "Google Maps, LinkedIn",
        source: "Google Maps & Places",
        notes: "Cloud DevOps engineering consultancy. Seeking lead gen to reach D2C & FinTech founders across Mumbai & Delhi.",
        verified: true,
        opportunityLevel: "Medium",
        tags: ["B2B Tech", "Cloud Infra"],
        extractedAt: "2026-09-23T11:15:08Z",
      },
    ],
  },
  {
    id: "camp_delhi_interiors_2026",
    title: "Delhi NCR Architects & Luxury Interior Designers",
    requirement: "Missing Online Ordering & Booking",
    location: "Delhi NCR, India",
    countryCode: "IN",
    businessTypes: ["Architects", "Interior Designers"],
    totalExtracted: 22,
    phoneCount: 22,
    emailCount: 19,
    websiteCount: 18,
    opportunityCount: 22,
    createdAt: "2026-09-22T09:00:00Z",
    status: "completed",
    results: [
      {
        id: "lead_del_1",
        name: "Aethelgard Architecture & Interiors",
        category: "Interior Designers",
        website: "https://aethelgarddesign.in",
        phone: "+91 98110 99882",
        email: "studio@aethelgarddesign.in",
        address: "Design District, MG Road, Sultanpur",
        city: "New Delhi",
        state: "Delhi NCR",
        country: "India",
        postalCode: "110030",
        rating: 4.9,
        reviewsCount: 68,
        existingPresence: "Instagram, Architectural Digest India",
        source: "Google Maps & Places",
        notes: "High-ticket residential projects (₹50L - ₹3Cr). Website is static portfolio; has no interactive 3D estimate calculator or CRM intake.",
        verified: true,
        opportunityLevel: "Critical",
        tags: ["High Net Worth", "Needs CRM Intake"],
        extractedAt: "2026-09-22T09:00:10Z",
      },
    ],
  },
];

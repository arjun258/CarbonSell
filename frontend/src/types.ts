export type Region = { code: string; name: string; enabled: boolean };

export type Address = {
  id: number;
  kind: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  region: string;
  pincode: string;
  lat: number;
  lng: number;
  is_default: boolean;
};

export type Company = {
  id: number;
  name: string;
  type: string;
  category: string;
  rating: number;
  is_verified: boolean;
  gstin: string;
  phone: string;
  phone_revealed: boolean;
};

export type Me = {
  user: { id: number; email: string; role: string };
  company: Company;
  addresses: Address[];
  capture_methods: string[];
  capture_method_rows: { id: number; method: string }[];
};

export type Meta = {
  emitter_categories: string[];
  buyer_categories: string[];
  capture_methods: string[];
  species: { code: string; label: string }[];
  pickup_slots: string[];
  trucks: { name: string; cap_t: number; rate_km: number }[];
};

export type Contaminant = { species: string; ppm: number };

export type Listing = {
  id: number;
  seller: Company;
  address: Address;
  volume_t: number;
  purity_pct: number;
  form: string;
  price_per_t: number;
  available_from: string;
  source_type: string;
  lab_report: string;
  storage_full: boolean;
  status: string;
  contaminants: Contaminant[];
  unaccounted_ppm: number;
  bid_count?: number;
  thread_count?: number;
  evaluation?: Match | null;
  requirement?: Requirement;
};

export type Requirement = {
  id: number;
  company_id: number;
  address: Address;
  volume_t: number;
  min_purity_pct: number;
  budget_per_t: number;
  caps: { species: string; max_ppm: number }[];
  match_count?: number;
};

export type Haul = {
  truck: string;
  capacity_t: number;
  trips: number;
  distance_km: number;
  total_cost: number;
  cost_per_t: number;
};

export type Match = {
  listing_id: number;
  seller_id: number;
  seller_name: string;
  seller_category: string;
  seller_rating: number;
  verified: boolean;
  city: string;
  address_label: string;
  address_line: string;
  purity_pct: number;
  volume_t: number;
  form: string;
  source_type: string;
  storage_full: boolean;
  score: number;
  delivered_per_t: number;
  total_cost: number;
  covers_t: number;
  covers_requirement: boolean;
  breakdown: {
    listing_per_t: number;
    haul_per_t: number;
  };
  haul: Haul;
  distance_km: number;
  rate_source: string;
  contaminants: Record<string, number>;
  contaminant_detail: {
    species: string;
    actual_ppm: number;
    cap_ppm: number;
    over: boolean;
  }[];
  fits: Record<string, number>;
  contact_shared?: boolean;
  requirement_id?: number;
  use_case?: string;
};

export type Thread = {
  id: number;
  listing_id: number;
  listing_purity: number;
  listing_city: string;
  buyer_company_id: number;
  seller_company_id: number;
  contact_shared: boolean;
  counterpart: Company;
  viewer_is_seller: boolean;
  last_message: string;
  message_count: number;
};

export type Message = {
  id: number;
  body: string;
  mine: boolean;
  created_at: string;
};

export type Order = {
  id: number;
  status: string;
  created_at: string;
  volume_t: number;
  price_per_t: number;
  delivered_per_t: number;
  total_value: number;
  haul: Haul | null;
  listing: { id: number; purity_pct: number; city: string; form: string };
  counterpart: Company;
  viewer_is_seller: boolean;
  pickup: {
    scheduled_date: string;
    slot: string;
    vehicle_type: string;
    contact_name: string;
    contact_phone: string;
    address: Address;
  } | null;
};

export type Bid = {
  id: number;
  status: string;
  requirement_id: number;
  note: string;
  volume_t: number;
  price_per_t: number;
  created_at: string;
  listing: {
    id: number;
    purity_pct: number;
    city: string;
    ask_per_t: number;
    volume_t: number;
    form: string;
  };
  buyer: Company;
  seller: Company;
  use_case: string;
  delivery_city: string;
  distance_km: number | null;
  haul: Haul | null;
  delivered_per_t: number | null;
};

export type Kpi = { label: string; value: number; unit?: string };

export type Dashboard = {
  role: string;
  kpis: Kpi[];
  best_matches?: Match[];
  orders: Order[];
  bids: Bid[];
  threads: Thread[];
};

export type HaulSuggestion = {
  haul: Haul | null;
  delivered_per_t: number;
  slots: string[];
  vehicle_types: string[];
  pickup_addresses: Address[];
  default_address_id: number;
};

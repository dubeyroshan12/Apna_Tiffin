import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, ChefHat, ChevronDown, Clock3,
  Heart, Leaf, LogOut, MapPin, Menu, Minus, Phone, Plus, Search, ShieldCheck, ShoppingBag,
  Soup, Utensils, X,
} from "lucide-react";
import { api, formatMoney } from "./services/api";
import { useAuth } from "./context/AuthContext";

const placeholderImages = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82",
];
const statusLabels = {
  PENDING: "Awaiting kitchen", ACCEPTED: "Order accepted", REJECTED: "Not accepted",
  PREPARING: "Being prepared", READY: "Ready for delivery", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

function Brand({ light = false }) {
  return <Link to="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="Apna Tiffin home">
    <span className="brand-mark"><Soup size={20} strokeWidth={1.8} /></span>
    <span>apna<span className="brand-tiffin">tiffin</span></span>
  </Link>;
}

function Navbar() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const navigate = useNavigate();
  async function logout() {
    setLogoutError("");
    try {
      await signOut();
      navigate("/");
    } catch {
      setLogoutError("Unable to sign out. Please try again.");
    }
  }
  return <header className="nav-wrap"><nav className="nav container">
    <Brand />
    <button className="mobile-menu icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
      {mobileOpen ? <X /> : <Menu />}
    </button>
    <div className={`nav-links ${mobileOpen ? "nav-open" : ""}`}>
      <Link to="/kitchens">Explore kitchens</Link>
      {user ? <>
        <Link to={user.role === "PROVIDER" ? "/provider/dashboard" : "/customer/dashboard"}>My dashboard</Link>
        <Link to="/profile">Profile</Link>
        <button className="nav-signout" onClick={logout}><LogOut size={15} /> Sign out</button>
        {logoutError && <span className="nav-error" role="alert">{logoutError}</span>}
      </> : <>
        <Link to="/login" className="nav-login">Log in</Link>
        <Link to="/register" className="button button-small">Get started <ArrowRight size={15} /></Link>
      </>}
    </div>
  </nav></header>;
}

function Footer() {
  return <footer className="footer"><div className="container footer-inner">
    <div><Brand light /><p>Ghar jaisa khana, apno jaisa pyaar.</p><small>For order questions, contact your kitchen directly.</small></div>
    <div className="footer-links"><Link to="/kitchens">Explore kitchens</Link><Link to="/register">Become a kitchen partner</Link><Link to="/login">Your account</Link></div>
    <small>Made for your neighborhood · © {new Date().getFullYear()} Apna Tiffin</small>
  </div></footer>;
}

function Shell({ children }) {
  return <><Navbar /><main>{children}</main><Footer /></>;
}

function Loading({ label = "Loading..." }) {
  return <div className="state-block"><span className="spinner" /><p>{label}</p></div>;
}

function ErrorState({ message, retry }) {
  return <div className="state-block error-state"><p>{message}</p>{retry && <button className="button button-outline" onClick={retry}>Try again</button>}</div>;
}

function EmptyState({ title, detail, action }) {
  return <div className="empty-state"><span className="empty-icon"><Utensils /></span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function useRequest(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    loader().then((data) => active && setState({ data, loading: false, error: "" }))
      .catch((error) => active && setState({ data: null, loading: false, error: error.message }));
    return () => { active = false; };
  }, [...deps, refresh]);
  return { ...state, reload: () => setRefresh((value) => value + 1) };
}

function KitchenCard({ kitchen, index = 0, search = "" }) {
  const tiffins = kitchen.tiffins || [];
  const matchingTiffins = search
    ? tiffins.filter((meal) => meal.name.toLowerCase().includes(search.toLowerCase()))
    : [];
  const visibleTiffins = matchingTiffins.length ? matchingTiffins : tiffins;
  const prices = visibleTiffins.map((meal) => Number(meal.price));
  const lowest = prices.length ? Math.min(...prices) : null;
  const tiffinCount = matchingTiffins.length || kitchen.available_tiffin_count || tiffins.length;
  return <Link to={`/kitchens/${kitchen.id}`} className="kitchen-card">
    <div className={`kitchen-image image-${index % 3}`} style={{ backgroundImage: `url("${placeholderImages[index % 3]}")` }}>
      <span className="image-label"><Leaf size={13} /> {kitchen.food_preferences || "Homemade"}</span>
    </div>
    <div className="kitchen-info">
      <div className="card-title-row"><h3>{kitchen.name}</h3></div>
      <p className="location"><MapPin size={14} /> {kitchen.locality}</p>
      <p className="kitchen-description">{kitchen.description}</p>
      {visibleTiffins.length > 0 && <div className="kitchen-meal-preview">{visibleTiffins.slice(0, 2).map((meal) => <span key={meal.id}>{meal.name} <b>{formatMoney(meal.price)}</b></span>)}</div>}
      <div className="card-bottom"><span>{tiffinCount} {tiffinCount === 1 ? "tiffin" : "tiffins"}</span>
        <span className="price-from">{lowest === null ? "See menu" : `From ${formatMoney(lowest)}`} <ArrowUpRight size={15} /></span></div>
    </div>
  </Link>;
}

function Home() {
  const { data: kitchens, loading, error, reload } = useRequest(() => api("/kitchens/").then((items) => items.slice(0, 3)));
  return <Shell>
    <section className="hero"><div className="container hero-grid">
      <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" /> YOUR NEIGHBORHOOD, SERVED</span>
        <h1>Homemade meals,<br /><em>closer to you.</em></h1>
        <p>Find the kind of everyday food that feels like it came from home. Meet the neighborhood cooks making it fresh, just for you.</p>
        <div className="hero-actions"><Link to="/kitchens" className="button">Explore tiffins <ArrowRight size={17} /></Link>
          <Link to="/register?role=PROVIDER" className="text-button">Become a kitchen partner <ArrowUpRight size={17} /></Link></div>
        <div className="hero-note"><span className="avatar-stack" aria-hidden="true"><i /><i /><i /></span><span>Made fresh by kitchens around you</span></div>
      </div>
      <div className="hero-art"><img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1100&q=88" alt="A fresh homemade Indian meal" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        <div className="hero-stamp"><span>FRESH<br />FROM THE<br />NEIGHBOURHOOD</span><Leaf size={20} /></div>
        <div className="hero-caption"><span className="caption-icon"><Soup size={19} /></span><span><b>Cooked with care</b><small>Just like home, every day</small></span></div>
      </div>
    </div></section>
    <section className="trust-strip"><div className="container trust-inner">
      <span><Leaf size={17} /> Freshly prepared</span><span><Heart size={17} /> Made with care</span><span><MapPin size={17} /> Right around the corner</span>
    </div></section>
    <section className="section container featured">
      <div className="section-heading"><div><span className="eyebrow">GOOD FOOD, CLOSE BY</span><h2>Meet your local kitchens</h2><p>Small kitchens, big-hearted cooking. Find your new everyday favourite.</p></div>
        <Link className="text-button" to="/kitchens">See all kitchens <ArrowRight size={17} /></Link></div>
      {loading ? <Loading label="Finding kitchens near you..." /> : error ? <ErrorState message={error} retry={reload} /> :
        kitchens?.length ? <div className="kitchen-grid">{kitchens.map((kitchen, index) => <KitchenCard key={kitchen.id} kitchen={kitchen} index={index} />)}</div> :
          <EmptyState title="Your neighborhood is next" detail={<>No kitchens are listed yet. For fictional sample menus, run <code>python backend\manage.py seed_demo</code>; or become the first kitchen partner.</>} action={<Link className="button button-outline" to="/register?role=PROVIDER">Partner with us</Link>} />}
    </section>
    <section className="how-section"><div className="container how-inner"><div className="how-intro"><span className="eyebrow">SIMPLE AS THAT</span><h2>Good food.<br /><em>Zero fuss.</em></h2><p>From a craving to a comforting meal, a few easy steps is all it takes.</p><Link to="/kitchens" className="text-button">Find your tiffin <ArrowRight size={16} /></Link></div>
      <div className="steps"><article><span className="step-no">01</span><span className="step-icon"><Search /></span><div><h3>Find your kitchen</h3><p>Explore home cooks and everyday menus in your neighborhood.</p></div></article>
        <article><span className="step-no">02</span><span className="step-icon"><ShoppingBag /></span><div><h3>Pick what feels right</h3><p>Choose a freshly made tiffin and place your order in a moment.</p></div></article>
        <article><span className="step-no">03</span><span className="step-icon"><Soup /></span><div><h3>Enjoy a little home</h3><p>Your kitchen keeps you updated, from acceptance to ready.</p></div></article></div>
    </div></section>
    <section className="partner-cta container"><div><span className="eyebrow">FOR HOME COOKS & SMALL KITCHENS</span><h2>Your cooking has a place here.</h2><p>Share the food you love making with people nearby who will love eating it.</p></div><Link to="/register?role=PROVIDER" className="button button-cream">Become a kitchen partner <ArrowRight size={17} /></Link><ArrowDownRight className="partner-doodle" /></section>
  </Shell>;
}

function KitchensPage() {
  const [search, setSearch] = useState("");
  const [preference, setPreference] = useState("");
  const [category, setCategory] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [foodCategory, setFoodCategory] = useState("");
  const [mealPlan, setMealPlan] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [query, setQuery] = useState({});
  const { data, loading, error, reload } = useRequest(() => {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
    return api(`/kitchens/${params.size ? `?${params}` : ""}`);
  }, [query]);
  function submit(event) {
    event.preventDefault();
    setQuery({
      search: search.trim(),
      preference,
      category,
      cuisine,
      food_category: foodCategory,
      meal_plan: mealPlan,
      max_price: maxPrice,
      ordering,
    });
  }
  return <Shell><div className="page-wrap container">
    <div className="page-intro"><span className="eyebrow">YOUR NEIGHBORHOOD MENU</span><h1>Find food that feels like home.</h1><p>Discover the home kitchens cooking fresh meals around you.</p></div>
    <form className="search-panel" onSubmit={submit}>
      <label className="search-field"><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kitchen, locality, or tiffin..." aria-label="Search kitchens, localities, and tiffins" /></label>
      <label className="select-field"><span>Cuisine</span><select value={cuisine} onChange={(e) => setCuisine(e.target.value)}><option value="">Any cuisine</option><option value="NORTH_INDIAN">North Indian</option><option value="SOUTH_INDIAN">South Indian</option></select><ChevronDown size={15} /></label>
      <label className="select-field"><span>Food preference</span><select value={preference} onChange={(e) => setPreference(e.target.value)}><option value="">Any preference</option><option>Vegetarian</option><option>Non-vegetarian</option><option>Jain</option><option>Vegan</option></select><ChevronDown size={15} /></label>
      <label className="select-field"><span>Meal time</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Any meal</option><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="DINNER">Dinner</option><option value="BOTH">Lunch & dinner</option></select><ChevronDown size={15} /></label>
      <label className="select-field"><span>Meal type</span><select value={foodCategory} onChange={(e) => setFoodCategory(e.target.value)}><option value="">All meal types</option><option value="THALI">Thalis</option><option value="COMPLETE_MEAL">Complete meals</option><option value="ROTI">Roti</option><option value="PARATHA">Paratha</option><option value="RICE">Rice</option><option value="DAL">Dal</option><option value="SABZI">Sabzi</option><option value="SNACK">Snacks & light meals</option><option value="IDLI_DOSA">Idli & dosa</option></select><ChevronDown size={15} /></label>
      <label className="select-field"><span>Meal plan</span><select value={mealPlan} onChange={(e) => setMealPlan(e.target.value)}><option value="">Any plan</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select><ChevronDown size={15} /></label>
      <label className="price-field"><span>Max ₹</span><input type="number" min="0" step="50" placeholder="Any price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label="Maximum price" /></label>
      <label className="select-field"><span>Sort by</span><select value={ordering} onChange={(e) => setOrdering(e.target.value)}><option value="name">Kitchen name</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select><ChevronDown size={15} /></label>
      <button className="button search-submit" type="submit">Find meals</button>
    </form>
    <div className="results-head"><div><h2>Local favourites</h2><p>{data ? `${data.length} kitchens to explore` : "Fresh cooking, close by"}</p></div><span className="results-tag"><Leaf size={14} /> Made fresh daily</span></div>
    {loading ? <Loading label="Looking around your neighborhood..." /> : error ? <ErrorState message={error} retry={reload} /> :
      data?.length ? <div className="kitchen-grid">{data.map((kitchen, index) => <KitchenCard key={kitchen.id} kitchen={kitchen} index={index} search={query.search} />)}</div> :
        <EmptyState title="No matching kitchens yet" detail={<>Try changing your search or filters. If this is a fresh local database, load fictional sample menus with <code>python backend\manage.py seed_demo</code>.</>} />}
  </div></Shell>;
}

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Shell><Loading /></Shell>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to={user.role === "PROVIDER" ? "/provider/dashboard" : "/customer/dashboard"} replace />;
  return children;
}

function KitchenDetail() {
  const { id } = useParams();
  const { data: kitchen, loading, error, reload } = useRequest(() => api(`/kitchens/${id}/`), [id]);
  const { user } = useAuth();
  const navigate = useNavigate();
  if (loading) return <Shell><Loading /></Shell>;
  if (error) return <Shell><div className="container page-wrap"><ErrorState message={error} retry={reload} /></div></Shell>;
  return <Shell><div className="container page-wrap">
    <Link to="/kitchens" className="back-link">← All kitchens</Link>
    <section className="detail-hero"><div className="detail-photo" style={{ backgroundImage: `url("${placeholderImages[Number(id) % 3]}")` }}><span className="image-label"><Leaf size={13} /> {kitchen.food_preferences}</span></div>
      <div className="detail-copy"><span className="eyebrow">A NEIGHBORHOOD KITCHEN</span><h1>{kitchen.name}</h1><div className="location"><MapPin size={15} /> {kitchen.locality}</div><p>{kitchen.description}</p>            <div className="detail-meta"><span><ChefHat size={16} /> Prepared by {kitchen.provider_name}</span>{kitchen.operating_hours && <span><Clock3 size={16} /> {kitchen.operating_hours}</span>}{kitchen.contact_phone && <a href={`tel:${kitchen.contact_phone}`}><Phone size={16} /> Contact kitchen: {kitchen.contact_phone}</a>}</div></div></section>
    <div className="menu-heading"><div><span className="eyebrow">COOKED FRESH, ORDERED EASY</span><h2>Today's tiffins</h2></div><span className="menu-count">{kitchen.tiffins.length} on the menu</span></div>
    {kitchen.tiffins.length ? <div className="meal-grid">{kitchen.tiffins.map((meal, i) => <MealCard key={meal.id} meal={meal} index={i} onOrder={() => navigate("/orders/new", { state: { meal, kitchen } })} />)}</div> :
      <EmptyState title="The menu is being prepared" detail="This kitchen has not listed available tiffins yet. Please check back soon." />}
    {user?.role === "PROVIDER" && <p className="notice">You are viewing this menu as its kitchen provider.</p>}
  </div></Shell>;
}

function MealCard({ meal, index, onOrder, compact = false }) {
  const cuisines = { NORTH_INDIAN: "North Indian", SOUTH_INDIAN: "South Indian", OTHER: "Other" };
  const foodCategories = {
    THALI: "Thali", COMPLETE_MEAL: "Complete meal", ROTI: "Roti", PARATHA: "Paratha",
    RICE: "Rice", DAL: "Dal", SABZI: "Sabzi", SNACK: "Snack", IDLI_DOSA: "Idli & dosa", OTHER: "Other",
  };
  const mealPlans = { DAILY: "Daily plan", WEEKLY: "Weekly plan", MONTHLY: "Monthly plan" };
  return <article className={`meal-card ${compact ? "meal-compact" : ""}`}>
    <div className={`meal-image meal-image-${index % 3}`} style={meal.image_url ? { backgroundImage: `url("${meal.image_url}")` } : { backgroundImage: `url("${placeholderImages[index % 3]}")` }}>
      <span className="meal-category">{({ LUNCH: "Lunch", DINNER: "Dinner", BOTH: "Lunch & dinner", BREAKFAST: "Breakfast" })[meal.category] || meal.category}</span>
    </div><div className="meal-info"><div className="meal-title"><h3>{meal.name}</h3><span className="veg-mark" title={meal.food_preference}>{meal.food_preference.toLowerCase().includes("non") ? "N" : "V"}</span></div>
      <p>{meal.description}</p><div className="meal-tags"><span>{cuisines[meal.cuisine] || "Homestyle"}</span><span>{foodCategories[meal.food_category] || "Meal"}</span>{mealPlans[meal.meal_plan] && <span>{mealPlans[meal.meal_plan]}</span>}</div>
      <div className="meal-order"><strong>{formatMoney(meal.price)}</strong>{onOrder && <button className="button button-small" onClick={onOrder}>Add tiffin <Plus size={14} /></button>}</div>
    </div>
  </article>;
}

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const user = await signIn(form.email, form.password);
      navigate(location.state?.from?.pathname || (user.role === "PROVIDER" ? "/provider/dashboard" : "/customer/dashboard"), { replace: true });
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <AuthLayout title="Welcome back" subtitle="Your next comforting meal is just around the corner." prompt="New to Apna Tiffin?" promptLink="/register" promptText="Create an account">
    <form className="form-stack" onSubmit={submit}><FormField label="Email address"><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></FormField>
      <FormField label="Password"><span className="password-wrap"><input required type={show ? "text" : "password"} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Your password" /><button type="button" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></span></FormField>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="button form-submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"} <ArrowRight size={17} /></button>
      <p className="form-footnote"><ShieldCheck size={15} /> Your account is protected with secure sign-in.</p>
    </form>
  </AuthLayout>;
}

function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedRole = new URLSearchParams(location.search).get("role");
  const [form, setForm] = useState({ name: "", email: "", password: "", password_confirm: "", role: requestedRole === "PROVIDER" ? "PROVIDER" : "CUSTOMER" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const user = await signUp(form);
      navigate(user.role === "PROVIDER" ? "/provider/kitchen" : "/customer/dashboard", { replace: true });
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <AuthLayout title="A little closer to home" subtitle="Create an account to find a tiffin or share your cooking." prompt="Already have an account?" promptLink="/login" promptText="Sign in">
    <form className="form-stack" onSubmit={submit}>
      <FormField label="I am joining as"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="CUSTOMER">A customer</option><option value="PROVIDER">A kitchen partner</option></select></FormField>
      <FormField label="Your name"><input required maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" autoComplete="name" /></FormField>
      <FormField label="Email address"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></FormField>
      <FormField label="Password"><span className="password-wrap"><input required minLength="8" type={show ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" /><button type="button" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></span></FormField>
      <FormField label="Confirm password"><input required minLength="8" type="password" value={form.password_confirm} onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} placeholder="Enter your password again" autoComplete="new-password" /></FormField>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="button form-submit" disabled={busy}>{busy ? "Creating account..." : "Create account"} <ArrowRight size={17} /></button>
      <p className="form-footnote"><ShieldCheck size={15} /> Your details stay private and protected.</p>
    </form>
  </AuthLayout>;
}

function FormField({ label, children, hint }) {
  return <label className="form-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function AuthLayout({ title, subtitle, prompt, promptLink, promptText, children }) {
  return <Shell><section className="auth-page container"><div className="auth-aside"><span className="eyebrow">GHAR JAISA KHANA</span><h1>Good food<br />brings us<br /><em>together.</em></h1><p>Made with care, shared close to home.</p><div className="auth-aside-art" style={{ backgroundImage: `url("${placeholderImages[1]}")` }} /></div>
    <div className="auth-card"><div className="auth-card-head"><span className="auth-icon"><Soup /></span><h2>{title}</h2><p>{subtitle}</p></div>{children}<p className="auth-prompt">{prompt} <Link to={promptLink}>{promptText}</Link></p></div>
  </section></Shell>;
}

function OrderPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [meal, setMeal] = useState(location.state?.meal || null);
  const [kitchen, setKitchen] = useState(location.state?.kitchen || null);
  const [tiffins, setTiffins] = useState([]);
  const [tiffinsLoading, setTiffinsLoading] = useState(!location.state?.meal);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!meal) {
      setTiffinsLoading(true);
      api("/tiffins/")
        .then(setTiffins)
        .catch((failure) => setError(failure.message))
        .finally(() => setTiffinsLoading(false));
    }
  }, [meal]);
  useEffect(() => {
    if (user) {
      api("/auth/profile/")
        .then((profile) => setAddress(profile.default_address || ""))
        .catch(() => setProfileError("Saved address could not be loaded. You can still enter an address below."));
    }
  }, [user]);
  async function placeOrder(event) {
    event.preventDefault(); if (!meal || !address.trim()) return;
    setBusy(true); setError("");
    try {
      const order = await api("/orders/", { method: "POST", body: JSON.stringify({ tiffin_id: meal.id, quantity, delivery_address: address, instructions }) });
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const selectedKitchen = kitchen || meal?.kitchen_name || "";
  return <Shell><div className="container page-wrap narrow-page">
    <Link to={meal ? `/kitchens/${meal.kitchen}` : "/kitchens"} className="back-link">← Back to menu</Link>
    <div className="page-intro compact-intro"><span className="eyebrow">JUST ONE MORE STEP</span><h1>Your tiffin, your way.</h1><p>Confirm your meal and where you would like it delivered.</p></div>
    {!meal && <div className="meal-picker">{tiffins.map((item, index) => <button key={item.id} className="picker-item" onClick={() => { setMeal(item); setKitchen({ name: item.kitchen_name, id: item.kitchen }); }}><MealCard meal={item} index={index} /></button>)}{tiffinsLoading && <Loading label="Loading available tiffins..." />}{!tiffinsLoading && error && <ErrorState message={error} />}{!tiffinsLoading && !error && !tiffins.length && <EmptyState title="No tiffins are available right now" detail="Visit the kitchen list to explore menus, or check back later." action={<Link to="/kitchens" className="button">Explore kitchens</Link>} />}</div>}
    {profileError && <p className="form-notice" role="status">{profileError}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {meal && <div className="order-layout"><div className="order-form-card"><div className="order-meal-summary"><span className="summary-icon"><Soup /></span><div><small>{typeof selectedKitchen === "string" ? selectedKitchen : selectedKitchen.name}</small><h2>{meal.name}</h2><span>{meal.category.toLowerCase()} · {meal.food_preference}</span></div><strong>{formatMoney(meal.price)}</strong></div>
      <form className="form-stack" onSubmit={placeOrder}>
        <FormField label="Quantity"><div className="quantity-control"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><span>{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity(Math.min(50, quantity + 1))}><Plus size={15} /></button></div></FormField>
        <FormField label="Delivery address"><textarea required rows="3" maxLength="1000" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / hostel, street, locality, city" /></FormField>
        <FormField label="Instructions (optional)"><textarea rows="2" maxLength="1000" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Anything the kitchen should know?" /></FormField>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button form-submit" disabled={busy}>{busy ? "Placing your order..." : "Place order"} <ArrowRight size={17} /></button>
      </form></div>
      <aside className="bill-card"><span className="eyebrow">ORDER SUMMARY</span><div><span>{meal.name} × {quantity}</span><strong>{formatMoney(Number(meal.price) * quantity)}</strong></div><div><span>Delivery</span><strong className="muted">Kitchen arranged</strong></div><hr /><div className="bill-total"><span>Total</span><strong>{formatMoney(Number(meal.price) * quantity)}</strong></div><p><ShieldCheck size={15} /> No payment is collected online.</p></aside></div>}
  </div></Shell>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status?.toLowerCase()}`}>{statusLabels[status] || status}</span>;
}

function OrderRow({ order, provider = false, onUpdate }) {
  const item = order.items?.[0];
  return <article className="order-row"><div className="order-mark"><ShoppingBag size={19} /></div>
    <div className="order-main"><div className="order-title-row"><h3>{item?.tiffin_name || "Tiffin order"}</h3><StatusBadge status={order.status} /></div>
      <p>{provider ? `From ${order.customer_name}` : order.kitchen_name} · {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
      <div className="order-detail-line">{item?.quantity} × {formatMoney(item?.unit_price)} <b>·</b> {formatMoney(order.total_amount)}</div>
      {provider && <p className="order-address"><MapPin size={14} /> {order.delivery_address}</p>}
    </div><div className="order-actions"><Link to={`/orders/${order.id}`} className="icon-link" aria-label="View order"><ArrowRight size={18} /></Link>{provider && onUpdate && <ProviderOrderActions order={order} onUpdate={onUpdate} />}</div>
  </article>;
}

function CustomerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useRequest(() => api("/orders/"));
  return <Shell><div className="container page-wrap"><div className="dashboard-welcome"><div><span className="eyebrow">YOUR LITTLE CORNER</span><h1>Namaste, {user.name.split(" ")[0]}.</h1><p>Here's what's cooking for you.</p></div><Link to="/kitchens" className="button">Find a tiffin <ArrowRight size={16} /></Link></div>
    <div className="dashboard-section-head"><div><h2>Your orders</h2><p>Keep up with your meals, past and present.</p></div></div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.length ? <div className="order-list">{data.map((order) => <OrderRow key={order.id} order={order} />)}</div> :
      <EmptyState title="A good meal is waiting" detail="Your orders will show up here once you find a kitchen you love." action={<Link className="button" to="/kitchens">Explore kitchens</Link>} />}
  </div></Shell>;
}

function ProviderDashboard() {
  const { user } = useAuth();
  const { data: kitchen, loading: kitchenLoading, error: kitchenError, reload: reloadKitchen } = useRequest(() => api("/kitchens/mine/"));
  const { data: orders, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useRequest(() => api("/orders/"));
  const active = orders?.filter((order) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(order.status)) || [];
  return <Shell><div className="container page-wrap"><div className="dashboard-welcome"><div><span className="eyebrow">YOUR KITCHEN AT A GLANCE</span><h1>Good morning, {user.name.split(" ")[0]}.</h1><p>Every order begins with the care you put into cooking.</p></div><Link to="/provider/menu" className="button">Manage menu <ArrowRight size={16} /></Link></div>
    {kitchenLoading ? <Loading /> : kitchenError ? <ErrorState message={kitchenError} retry={reloadKitchen} /> : kitchen ? <>
      <div className="provider-stats"><article><span className="stat-icon"><ShoppingBag /></span><small>All orders</small><strong>{orders?.length ?? "—"}</strong></article><article><span className="stat-icon"><Clock3 /></span><small>In progress</small><strong>{active.length}</strong></article><article><span className="stat-icon"><Utensils /></span><small>Available tiffins</small><strong>{kitchen.available_tiffin_count ?? 0}</strong></article></div>
      <div className="provider-quick"><div><span className="eyebrow">YOUR KITCHEN</span><h2>{kitchen.name}</h2><p><MapPin size={15} /> {kitchen.locality}</p></div><div className="quick-links"><Link to="/provider/kitchen" className="button button-outline">Edit kitchen</Link><Link to="/provider/menu" className="button button-outline">Edit menu</Link></div></div>
      <div className="dashboard-section-head"><div><h2>Recent orders</h2><p>A little care goes a long way.</p></div><Link className="text-button" to="/provider/orders">Manage all <ArrowRight size={15} /></Link></div>
      {ordersLoading ? <Loading /> : ordersError ? <ErrorState message={ordersError} retry={reloadOrders} /> : orders?.length ? <div className="order-list">{orders.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} provider />)}</div> : <EmptyState title="Your first order is on its way" detail="Add some tiffins to your menu so nearby customers can discover you." action={<Link className="button" to="/provider/menu">Add a tiffin</Link>} />}
    </> : <div className="setup-prompt"><span className="setup-icon"><ChefHat /></span><h2>Let's set up your kitchen</h2><p>Add a few details to introduce your cooking to the neighborhood.</p><Link className="button" to="/provider/kitchen">Create kitchen profile <ArrowRight size={16} /></Link></div>}
  </div></Shell>;
}

function ProviderOrderActions({ order, onUpdate }) {
  const next = { PENDING: ["ACCEPTED", "REJECTED"], ACCEPTED: ["PREPARING"], PREPARING: ["READY"], READY: ["COMPLETED"] }[order.status] || [];
  return next.length ? <div className="provider-actions">{next.map((status) => <button key={status} className={status === "REJECTED" ? "action-reject" : ""} onClick={() => onUpdate(order.id, status)}>{status === "ACCEPTED" ? "Accept" : status === "REJECTED" ? "Decline" : status.toLowerCase()}</button>)}</div> : null;
}

function ProviderOrders() {
  const { data, loading, error, reload } = useRequest(() => api("/orders/"));
  const [actionError, setActionError] = useState("");
  async function update(id, status) {
    setActionError("");
    try { await api(`/orders/${id}/status/`, { method: "PATCH", body: JSON.stringify({ status }) }); reload(); }
    catch (failure) { setActionError(failure.message); }
  }
  return <Shell><div className="container page-wrap"><div className="page-intro"><span className="eyebrow">KITCHEN DESK</span><h1>Orders, made simple.</h1><p>See what your customers need and keep them in the loop.</p></div>
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.length ? <div className="order-list">{data.map((order) => <OrderRow key={order.id} order={order} provider onUpdate={update} />)}</div> : <EmptyState title="No orders to tend to" detail="When a customer places an order, you can accept it here." />}
  </div></Shell>;
}

function ProviderKitchen() {
  const { data, loading, error, reload } = useRequest(() => api("/kitchens/mine/"));
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!loading && !error) {
      setForm(data || { name: "", description: "", locality: "", address: "", contact_phone: "", food_preferences: "", operating_hours: "" });
    }
  }, [data, loading, error]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api("/kitchens/mine/", { method: data ? "PATCH" : "POST", body: JSON.stringify(form) }); setMessage("Your kitchen details have been saved."); reload(); }
    catch (failure) { setMessage(failure.message); } finally { setBusy(false); }
  }
  return <Shell><div className="container page-wrap narrow-page"><div className="page-intro"><span className="eyebrow">YOUR PLACE IN THE NEIGHBORHOOD</span><h1>{data ? "Your kitchen profile." : "Meet your kitchen."}</h1><p>Tell hungry neighbors what makes your home cooking special.</p></div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : !form ? <Loading /> : <form className="management-form" onSubmit={save}>
      <FormField label="Kitchen name"><input required maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maa's Kitchen" /></FormField>
      <FormField label="About your cooking"><textarea required rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short introduction to your meals..." /></FormField>
      <div className="form-columns"><FormField label="Locality"><input required value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} placeholder="Neighborhood / area" /></FormField><FormField label="Contact phone"><input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="Optional" /></FormField></div>
      <FormField label="Kitchen address"><textarea required rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" /></FormField>
      <div className="form-columns"><FormField label="Food preferences"><input required value={form.food_preferences} onChange={(e) => setForm({ ...form, food_preferences: e.target.value })} placeholder="Vegetarian, Jain..." /></FormField><FormField label="Operating hours"><input value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} placeholder="e.g. Mon–Sat, 11am–9pm" /></FormField></div>
      {data && <label className="checkbox-field"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Kitchen is visible to customers</label>}
      {message && <p className={message.includes("saved") ? "form-success" : "form-error"} role="status">{message}</p>}
      <div className="form-actions"><button className="button" disabled={busy}>{busy ? "Saving..." : "Save kitchen details"} <ArrowRight size={16} /></button><Link to="/provider/dashboard" className="text-button">Back to dashboard</Link></div>
    </form>}
  </div></Shell>;
}

function ProviderMenu() {
  const { data: kitchen, loading, error, reload } = useRequest(() => api("/kitchens/mine/"));
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const blankMeal = { name: "", description: "", category: "LUNCH", food_preference: "Vegetarian", cuisine: "NORTH_INDIAN", food_category: "COMPLETE_MEAL", meal_plan: "ONE_TIME", price: "", image_url: "", is_available: true };
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { id, ...form } = editing;
    try {
      await api(id ? `/tiffins/${id}/` : "/tiffins/", { method: id ? "PATCH" : "POST", body: JSON.stringify(form) });
      setEditing(null); setMessage("Menu updated."); reload();
    } catch (failure) { setMessage(failure.message); } finally { setBusy(false); }
  }
  async function deleteMeal(meal) {
    if (!window.confirm(`Remove "${meal.name}" from your menu?`)) return;
    try { await api(`/tiffins/${meal.id}/`, { method: "DELETE" }); reload(); }
    catch (failure) { setMessage(failure.message); }
  }
  async function toggle(meal) {
    try { await api(`/tiffins/${meal.id}/`, { method: "PATCH", body: JSON.stringify({ is_available: !meal.is_available }) }); reload(); }
    catch (failure) { setMessage(failure.message); }
  }
  return <Shell><div className="container page-wrap"><div className="dashboard-welcome"><div><span className="eyebrow">FRESH FROM YOUR KITCHEN</span><h1>Today's menu</h1><p>Good food is worth sharing. Keep your menu up to date.</p></div><button className="button" onClick={() => { setEditing(blankMeal); setMessage(""); }}>Add a tiffin <Plus size={16} /></button></div>
    {message && <p className={message === "Menu updated." ? "form-success" : "form-error"} role="status">{message}</p>}
    {editing && <form className="management-form inline-editor" onSubmit={save}><div className="editor-title"><h2>{editing.id ? "Edit tiffin" : "New tiffin"}</h2><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Close"><X /></button></div>
      <div className="form-columns"><FormField label="Tiffin name"><input required maxLength="120" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Everyday dal chawal" /></FormField><FormField label="Price (₹)"><input required type="number" min="0.01" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="140" /></FormField></div>
      <FormField label="Description"><textarea required rows="3" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="What is in this meal?" /></FormField>
      <div className="form-columns"><FormField label="Meal time"><select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="DINNER">Dinner</option><option value="BOTH">Lunch & dinner</option></select></FormField><FormField label="Food preference"><select value={editing.food_preference} onChange={(e) => setEditing({ ...editing, food_preference: e.target.value })}><option>Vegetarian</option><option>Non-vegetarian</option><option>Jain</option><option>Vegan</option></select></FormField></div>
      <div className="form-columns"><FormField label="Cuisine"><select value={editing.cuisine} onChange={(e) => setEditing({ ...editing, cuisine: e.target.value })}><option value="NORTH_INDIAN">North Indian</option><option value="SOUTH_INDIAN">South Indian</option><option value="OTHER">Other</option></select></FormField><FormField label="Dish type"><select value={editing.food_category} onChange={(e) => setEditing({ ...editing, food_category: e.target.value })}><option value="THALI">Thali</option><option value="COMPLETE_MEAL">Complete meal</option><option value="ROTI">Roti</option><option value="PARATHA">Paratha</option><option value="RICE">Rice</option><option value="DAL">Dal</option><option value="SABZI">Sabzi</option><option value="SNACK">Snack or light meal</option><option value="IDLI_DOSA">Idli or dosa</option><option value="OTHER">Other</option></select></FormField></div>
      <FormField label="Meal plan"><select value={editing.meal_plan} onChange={(e) => setEditing({ ...editing, meal_plan: e.target.value })}><option value="ONE_TIME">Single meal</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></FormField>
      <FormField label="Image URL (optional)"><input type="url" value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." /></FormField>
      <label className="checkbox-field"><input type="checkbox" checked={editing.is_available} onChange={(e) => setEditing({ ...editing, is_available: e.target.checked })} /> Available to order</label>
      <button className="button" disabled={busy}>{busy ? "Saving..." : "Save tiffin"} <ArrowRight size={16} /></button></form>}
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : !kitchen ? <div className="setup-prompt"><h2>Set up a kitchen first</h2><Link className="button" to="/provider/kitchen">Create kitchen profile</Link></div> : kitchen.tiffins?.length ? <div className="provider-menu-grid">{kitchen.tiffins.map((meal, index) => <div className="provider-menu-item" key={meal.id}><MealCard meal={meal} index={index} /><div className="menu-item-controls"><span className={meal.is_available ? "availability on" : "availability"}>{meal.is_available ? "Available" : "Paused"}</span><button onClick={() => toggle(meal)}>{meal.is_available ? "Pause" : "Activate"}</button><button onClick={() => setEditing(meal)}>Edit</button><button className="danger-text" onClick={() => deleteMeal(meal)}>Remove</button></div></div>)}</div> : <EmptyState title="Your menu starts here" detail="Add your first tiffin and let the neighborhood know what's cooking." action={<button className="button" onClick={() => setEditing(blankMeal)}>Add a tiffin <Plus size={16} /></button>} />}
  </div></Shell>;
}

function OrderDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useRequest(() => api(`/orders/${id}/`), [id]);
  const [message, setMessage] = useState("");
  async function cancel() {
    if (!window.confirm("Cancel this order?")) return;
    try { await api(`/orders/${id}/status/`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }); setMessage("Order cancelled."); reload(); }
    catch (failure) { setMessage(failure.message); }
  }
  return <Shell><div className="container page-wrap narrow-page"><Link to={user.role === "PROVIDER" ? "/provider/orders" : "/customer/dashboard"} className="back-link">← All orders</Link>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : <><div className="order-detail-head"><span className="eyebrow">ORDER AT A GLANCE</span><h1>Order #{String(data.id).padStart(5, "0")}</h1><StatusBadge status={data.status} /><p>Placed {new Date(data.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div>
      {message && <p className="form-success" role="status">{message}</p>}<div className="order-detail-card"><div className="order-detail-block"><small>FROM YOUR NEIGHBORHOOD</small><h2>{data.kitchen_name}</h2></div><hr />
        {data.items.map((item) => <div className="detail-line" key={item.id}><span>{item.quantity} × {item.tiffin_name}</span><strong>{formatMoney(item.line_total)}</strong></div>)}
        <hr /><div className="detail-line total-line"><span>Total</span><strong>{formatMoney(data.total_amount)}</strong></div><div className="order-detail-block address-block"><small>DELIVER TO</small><p>{data.delivery_address}</p>{data.instructions && <p className="muted">Note: {data.instructions}</p>}</div>
      </div>{user.role === "CUSTOMER" && data.status === "PENDING" && <button className="button button-outline cancel-button" onClick={cancel}>Cancel this order</button>}
      <p className="tracking-note"><Clock3 size={17} /> Your kitchen will keep this status updated as your meal comes together.</p></>}
  </div></Shell>;
}

function ProfilePage() {
  const { setUser } = useAuth();
  const { data, loading, error, reload } = useRequest(() => api("/auth/profile/"));
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setForm(data); }, [data]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const updated = await api("/auth/profile/", { method: "PATCH", body: JSON.stringify(form) });
      setForm(updated); setUser(updated); setMessage("Profile saved.");
    } catch (failure) { setMessage(failure.message); } finally { setBusy(false); }
  }
  return <Shell><div className="container page-wrap narrow-page"><div className="page-intro"><span className="eyebrow">A FEW DETAILS ABOUT YOU</span><h1>Your profile.</h1><p>Keep your account details up to date.</p></div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : !form ? <Loading /> : <form className="management-form" onSubmit={save}>
      <FormField label="Name"><input required maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
      <FormField label="Email"><input value={form.email} disabled /></FormField>
      {form.role === "CUSTOMER" && <><FormField label="Phone (optional)"><input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField><FormField label="Default delivery address"><textarea rows="3" value={form.default_address || ""} onChange={(e) => setForm({ ...form, default_address: e.target.value })} placeholder="Save an address for your next order" /></FormField></>}
      {message && <p className={message === "Profile saved." ? "form-success" : "form-error"} role="status">{message}</p>}
      <button className="button" disabled={busy}>{busy ? "Saving..." : "Save changes"} <ArrowRight size={16} /></button></form>}
  </div></Shell>;
}

function NotFound() {
  return <Shell><div className="not-found container"><span className="eyebrow">A LITTLE DETOUR</span><h1>This page isn't on the menu.</h1><p>Let's get you back to the good stuff.</p><Link to="/" className="button">Back to home <ArrowRight size={16} /></Link></div></Shell>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/kitchens" element={<KitchensPage />} />
    <Route path="/kitchens/:id" element={<KitchenDetail />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/orders/new" element={<Protected role="CUSTOMER"><OrderPage /></Protected>} />
    <Route path="/orders/:id" element={<Protected><OrderDetails /></Protected>} />
    <Route path="/customer/dashboard" element={<Protected role="CUSTOMER"><CustomerDashboard /></Protected>} />
    <Route path="/provider/dashboard" element={<Protected role="PROVIDER"><ProviderDashboard /></Protected>} />
    <Route path="/provider/kitchen" element={<Protected role="PROVIDER"><ProviderKitchen /></Protected>} />
    <Route path="/provider/menu" element={<Protected role="PROVIDER"><ProviderMenu /></Protected>} />
    <Route path="/provider/orders" element={<Protected role="PROVIDER"><ProviderOrders /></Protected>} />
    <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
    <Route path="*" element={<NotFound />} />
  </Routes>;
}

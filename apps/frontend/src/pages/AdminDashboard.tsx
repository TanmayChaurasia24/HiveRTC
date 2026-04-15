import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createAvatar,
  createElement,
  createMap,
  getAllAvatars,
  getAllElements,
} from "../lib/api";

type Element = { id: string; width: number; height: number; imageUrl: string; static: boolean };
type Avatar = { id: string; name: string; imageUrl: string };
type Tab = "elements" | "avatars" | "maps";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("elements");
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  // Elements state
  const [elements, setElements] = useState<Element[]>([]);
  const [allElements, setAllElements] = useState<Element[]>([]);
  const [elemForm, setElemForm] = useState({ imageUrl: "", width: 1, height: 1, static: false });

  // Avatars state
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avForm, setAvForm] = useState({ name: "", imageUrl: "" });

  // Map state
  const [mapForm, setMapForm] = useState({
    name: "",
    thumbnail: "",
    dimensions: "",
    selectedElements: [] as { elementId: string; x: number; y: number }[],
  });
  const [mapElemRow, setMapElemRow] = useState({ elementId: "", x: 0, y: 0 });

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "Admin") { navigate("/login"); return; }
    fetchInitData();
  }, []);

  async function fetchInitData() {
    try {
      const [avRes, elRes] = await Promise.all([getAllAvatars(), getAllElements()]);
      setAvatars(avRes.avatars);
      setAllElements(elRes.elements);
    } catch {}
  }

  function notify(msg: string, ok = true) {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 3500);
  }

  async function handleCreateElement(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await createElement({
        imageUrl: elemForm.imageUrl,
        width: Number(elemForm.width),
        height: Number(elemForm.height),
        static: elemForm.static,
      });
      const newElem: Element = { id: res.id, ...elemForm, width: Number(elemForm.width), height: Number(elemForm.height) };
      setElements((prev) => [...prev, newElem]);
      setAllElements((prev) => [...prev, newElem]);
      setElemForm({ imageUrl: "", width: 1, height: 1, static: false });
      notify(`✅ Element created! ID: ${res.id}`);
    } catch (err: any) {
      notify(err.message, false);
    }
  }

  async function handleCreateAvatar(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res: any = await createAvatar(avForm);
      setAvatars((prev) => [...prev, { id: res.avatarId, ...avForm }]);
      setAvForm({ name: "", imageUrl: "" });
      notify(`✅ Avatar created! ID: ${res.avatarId}`);
    } catch (err: any) {
      notify(err.message, false);
    }
  }

  function addElemToMap() {
    if (!mapElemRow.elementId) return;
    setMapForm((prev) => ({
      ...prev,
      selectedElements: [...prev.selectedElements, { ...mapElemRow }],
    }));
    setMapElemRow({ elementId: "", x: 0, y: 0 });
  }

  async function handleCreateMap(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await createMap({
        name: mapForm.name,
        thumbnail: mapForm.thumbnail,
        dimensions: mapForm.dimensions,
        defaultElements: mapForm.selectedElements,
      });
      setMapForm({ name: "", thumbnail: "", dimensions: "", selectedElements: [] });
      notify(`✅ Map created! ID: ${res.id}`);
    } catch (err: any) {
      notify(err.message, false);
    }
  }

  return (
    <div className="dashboard-bg">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🐝</span>
          <span>HiveRTC</span>
        </div>
        <p className="sidebar-role">Admin Panel</p>
        <nav className="sidebar-nav">
          <button className={`nav-item ${tab === "elements" ? "active" : ""}`} onClick={() => setTab("elements")}>
            🧱 Elements
          </button>
          <button className={`nav-item ${tab === "avatars" ? "active" : ""}`} onClick={() => setTab("avatars")}>
            🧑 Avatars
          </button>
          <button className={`nav-item ${tab === "maps" ? "active" : ""}`} onClick={() => setTab("maps")}>
            🗺️ Maps
          </button>
        </nav>
        <button className="logout-btn" onClick={() => { localStorage.clear(); navigate("/login"); }}>
          🚪 Logout
        </button>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <div className="dash-header">
          <h1 className="dash-title">
            {tab === "elements" ? "🧱 Manage Elements" : tab === "avatars" ? "🧑 Manage Avatars" : "🗺️ Create Map"}
          </h1>
        </div>

        {status && (
          <div className={`toast ${status.ok ? "toast-ok" : "toast-err"}`}>{status.msg}</div>
        )}

        {/* ELEMENTS TAB */}
        {tab === "elements" && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-title">Create Element</h2>
              <form onSubmit={handleCreateElement} className="grid-form">
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input className="form-input" placeholder="https://..." value={elemForm.imageUrl}
                    onChange={(e) => setElemForm({ ...elemForm, imageUrl: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Width (tiles)</label>
                  <input className="form-input" type="number" min={1} max={10} value={elemForm.width}
                    onChange={(e) => setElemForm({ ...elemForm, width: Number(e.target.value) })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (tiles)</label>
                  <input className="form-input" type="number" min={1} max={10} value={elemForm.height}
                    onChange={(e) => setElemForm({ ...elemForm, height: Number(e.target.value) })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Static (blocks movement)</label>
                  <div className="toggle-row">
                    <input type="checkbox" id="static-check" checked={elemForm.static}
                      onChange={(e) => setElemForm({ ...elemForm, static: e.target.checked })} />
                    <label htmlFor="static-check" className="toggle-label">
                      {elemForm.static ? "Yes – blocks movement" : "No – walkable"}
                    </label>
                  </div>
                </div>
                <button className="btn-primary full-width" type="submit">Create Element</button>
              </form>
            </div>

            {elements.length > 0 && (
              <div className="card">
                <h2 className="card-title">Created This Session</h2>
                <div className="elem-grid">
                  {elements.map((el) => (
                    <div key={el.id} className="elem-card">
                      <img src={el.imageUrl} alt="element" className="elem-img" onError={(e) => (e.currentTarget.style.display = "none")} />
                      <div className="elem-info">
                        <p className="elem-id">{el.id.slice(0, 12)}...</p>
                        <p className="elem-meta">{el.width}×{el.height} • {el.static ? "Static" : "Walkable"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AVATARS TAB */}
        {tab === "avatars" && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-title">Create Avatar</h2>
              <form onSubmit={handleCreateAvatar} className="grid-form">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" placeholder="e.g. Ninja, Robot..." value={avForm.name}
                    onChange={(e) => setAvForm({ ...avForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input className="form-input" placeholder="https://..." value={avForm.imageUrl}
                    onChange={(e) => setAvForm({ ...avForm, imageUrl: e.target.value })} required />
                </div>
                <button className="btn-primary full-width" type="submit">Create Avatar</button>
              </form>
            </div>

            <div className="card">
              <h2 className="card-title">All Avatars</h2>
              {avatars.length === 0
                ? <p className="empty-msg">No avatars yet. Create one above.</p>
                : <div className="avatar-grid">
                    {avatars.map((av) => (
                      <div key={av.id} className="avatar-card">
                        <div className="avatar-img-wrap">
                          <img src={av.imageUrl} alt={av.name} className="avatar-img"
                            onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          <span className="avatar-fallback">👤</span>
                        </div>
                        <p className="avatar-name">{av.name}</p>
                        <p className="avatar-id">{av.id.slice(0, 10)}...</p>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* MAPS TAB */}
        {tab === "maps" && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-title">Available Elements Gallery</h2>
              <p className="auth-subtitle" style={{textAlign: "left", marginTop:-10, marginBottom: 15}}>
                Click any element to instantly copy its ID for Map creation.
              </p>
              {allElements.length === 0 ? (
                <p className="empty-msg">No elements found.</p>
              ) : (
                <div className="elem-grid" style={{maxHeight: 300, overflowY: "auto", paddingRight: 10}}>
                  {allElements.map((el) => (
                    <div key={el.id} className="elem-card" style={{cursor: "pointer", transition: "border 0.2s"}}
                      onClick={() => {
                        navigator.clipboard.writeText(el.id);
                        notify(`📋 Copied ID: ${el.id}`);
                      }}
                      title="Click to copy ID"
                    >
                      <img src={el.imageUrl} alt="element" className="elem-img" onError={(e) => (e.currentTarget.style.display = "none")} />
                      <div className="elem-info">
                        <p className="elem-id" style={{color: "#a78bfa"}}>{el.id.slice(0, 10)}...</p>
                        <p className="elem-meta">{el.width}×{el.height} • {el.static ? "Static" : "Walkable"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">

              <h2 className="card-title">Create Map</h2>
              <form onSubmit={handleCreateMap} className="grid-form">
                <div className="form-group">
                  <label className="form-label">Map Name</label>
                  <input className="form-input" placeholder="e.g. Office Hub" value={mapForm.name}
                    onChange={(e) => setMapForm({ ...mapForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Thumbnail URL</label>
                  <input className="form-input" placeholder="https://..." value={mapForm.thumbnail}
                    onChange={(e) => setMapForm({ ...mapForm, thumbnail: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Dimensions (e.g. 100x100)</label>
                  <input className="form-input" placeholder="100x100" value={mapForm.dimensions}
                    onChange={(e) => setMapForm({ ...mapForm, dimensions: e.target.value })}
                    pattern="[0-9]{1,4}x[0-9]{1,4}" required />
                </div>

                {/* Add element row */}
                <div className="map-elem-section">
                  <h3 className="map-elem-title">Default Elements (optional)</h3>
                  <div className="map-elem-row">
                    <input className="form-input" placeholder="Element ID"
                      value={mapElemRow.elementId}
                      onChange={(e) => setMapElemRow({ ...mapElemRow, elementId: e.target.value })} />
                    <input className="form-input" type="number" placeholder="X" value={mapElemRow.x}
                      onChange={(e) => setMapElemRow({ ...mapElemRow, x: Number(e.target.value) })} />
                    <input className="form-input" type="number" placeholder="Y" value={mapElemRow.y}
                      onChange={(e) => setMapElemRow({ ...mapElemRow, y: Number(e.target.value) })} />
                    <button type="button" className="btn-secondary" onClick={addElemToMap}>+ Add</button>
                  </div>
                  {mapForm.selectedElements.length > 0 && (
                    <div className="elem-tag-list">
                      {mapForm.selectedElements.map((el, i) => (
                        <span key={i} className="elem-tag">
                          {el.elementId.slice(0, 8)}... @ ({el.x},{el.y})
                          <button type="button" onClick={() =>
                            setMapForm((prev) => ({ ...prev, selectedElements: prev.selectedElements.filter((_, idx) => idx !== i) }))
                          }>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button className="btn-primary full-width" type="submit">Create Map</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
